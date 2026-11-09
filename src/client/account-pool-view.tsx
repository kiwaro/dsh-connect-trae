import type { ReactElement } from 'react'
import type { TraePoolTestRowView, TraeWebModel, TraeWebPoolAccount, TraeWebPoolExclusion, TraeWebPoolOutcome } from '../status-paths.ts'
import type { TraePoolRowDetail, TraePoolRowClaim, LogEntry, T } from './account-pool-types.ts'
import { outcomeLabel } from './pool-test.ts'

/** `MM/DD, HH:mm` — the absolute stamp a row shows under its age. */
function shortWhen(atMs: number): string {
  const at = new Date(atMs)
  const pad = (value: number): string => (value < 10 ? `0${value}` : String(value))
  return `${pad(at.getMonth() + 1)}/${pad(at.getDate())}, ${pad(at.getHours())}:${pad(at.getMinutes())}`
}

/** `MM/DD`, for a line that has room for a date but not a clock time. */
function shortDate(atMs: number): string {
  const at = new Date(atMs)
  const pad = (value: number): string => (value < 10 ? `0${value}` : String(value))
  return `${pad(at.getMonth() + 1)}/${pad(at.getDate())}`
}

/** A human label for every value of {@link TraeWebPoolExclusion}. */
function exclusionLabel(exclusion: TraeWebPoolExclusion, t: T): string {
  switch (exclusion) {
    case 'unusable': return t('row.poolExcludedUnusable')
    case 'rate-limited': return t('row.poolExcludedRateLimited')
    case 'model-busy': return t('row.poolExcludedModelBusy')
    case 'out-of-credit': return t('row.poolExcludedOutOfCredit')
    case 'credential-rejected': return t('row.poolExcludedCredentialRejected')
    case 'policy-rejected': return t('row.poolExcludedPolicyRejected')
    case 'plan-gated': return t('row.poolExcludedPlanGated')
    case 'not-found': return t('row.poolExcludedNotFound')
    case 'unavailable': return t('row.poolExcludedUnavailable')
    case 'failed': return t('row.poolExcludedFailed')
  }
}

function probeSourceLabel(source: 'test-batch' | 'live-request' | undefined, t: T): string {
  switch (source) {
    case 'test-batch': return t('row.poolProbeSourceTest')
    case 'live-request': return t('row.poolProbeSourceLive')
    case undefined: return t('row.poolProbeSourceUnknown')
  }
}

/* ------------------------------------------------------------------ *
 * Presentational helpers: rows, probe verdicts, and activity log.      *
 * ------------------------------------------------------------------ */

export function NoCandidateNotice({ noCandidate, t }: { noCandidate: TraeWebPoolExclusion | 'empty'; t: T }): ReactElement {
  if (noCandidate === 'empty') {
    return (
      <div className="dsm-trae-pool-warning dsm-trae-pool-warning-empty" role="status">
        <span className="dsm-trae-pool-warning-title">{t('row.poolNoCandidateEmpty')}</span>
        <span className="dsm-trae-pool-warning-hint">{t('row.poolNoCandidateEmptyHint')}</span>
      </div>
    )
  }
  return (
    <div className="dsm-trae-pool-warning dsm-trae-pool-warning-unusable" role="status">
      <span className="dsm-trae-pool-warning-title">{t('row.poolNoCandidateUnusable')}</span>
      <span className="dsm-trae-pool-warning-hint">
        {t('row.poolNoCandidateHint')} {exclusionLabel(noCandidate, t)}
      </span>
    </div>
  )
}

export function MemberRowHeader({ t, checkinSupported }: { t: T; checkinSupported: boolean }): ReactElement {
  return (
    <div className="dsm-trae-pool-row dsm-trae-pool-row-head" role="row">
      <span className="dsm-trae-pool-col-account">{t('row.poolColumnAccount')}</span>
      <span>{t('row.poolColumnCredits')}</span>
      <span>{t('row.poolColumnProbe')}</span>
      {checkinSupported ? <span>{t('row.poolColumnCheckin')}</span> : null}
      <span />
    </div>
  )
}

interface MemberRowProps {
  account: TraeWebPoolAccount
  /**
   * Whether this table has a check-in column at all.
   *
   * A row must render exactly as many cells as `--dsm-trae-pool-cols` declares:
   * an extra cell does not shrink, it wraps the action buttons onto a second
   * grid line, which is how a five-column row looked on a four-column table.
   */
  showCheckin: boolean
  /**
   * The pool already knows the DEVICE spent today's claim (see
   * {@link AccountPoolProps.deviceClaimed}). A row that is not itself claimed
   * must say so instead of 「未签到」, which would read as "you can still claim
   * this one" right next to a disabled button.
   */
  deviceClaimed: boolean
  models: readonly TraeWebModel[]
  rows: Readonly<Record<string, TraePoolTestRowView>>
  checked: boolean
  /**
   * Whether the pool is on, which decides whether a `current` row may be tinted
   * as the pool's own pick.
   *
   * With the pool ON the Host answers `current` with the account its ROTATION
   * picked, and falls back to the saved selection when the pool holds no member
   * to pick. Presenting that fallback as the pool's answer claimed a removed
   * account while the notice above the table said "no pool members are selected
   * yet" — two lines contradicting each other on one screen. The tint therefore
   * only names a row that can actually be the rotation's answer.
   */
  poolEnabled: boolean
  /**
   * The pool's saved target model (`''` when it resolves one itself), so the
   * probe cell only reprints a model name when it differs from that choice.
   */
  poolModelId: string
  detail?: TraePoolRowDetail | undefined
  claim?: TraePoolRowClaim | undefined
  onClaim?: ((accountId: string) => void) | undefined
  onToggle: () => void
  onTest: () => void
  t: T
  disabled: boolean
  deleting: boolean
  onDelete: () => void
  canDelete: boolean
  formatNumber: (value: number) => string
  relativeAt: (at: number, now: number, t: T) => string
}

export function MemberRow({ account, models, rows, checked, onToggle, onTest, t, disabled, deleting, onDelete, canDelete, formatNumber, relativeAt, detail, claim, onClaim, showCheckin, deviceClaimed, poolEnabled, poolModelId }: MemberRowProps): ReactElement {
  /**
   * Whether this row is the one billing the next request — and, with the pool on,
   * whether that claim is the pool's own.
   *
   * `account.current` alone is not enough: with an empty (or fully excluded) pool
   * the Host deliberately falls back to the saved selection, so a removed account
   * stays `current` and the pill would keep announcing it as the pool's pick.
   * A row can only be the rotation's answer while it is a member.
   */
  const isCurrent = account.current === true && (poolEnabled !== true || account.member === true)
  // `reachable:false` means this machine holds neither a copy nor a sign-in.
  // Anything that needs a credential (test, check-in) is a guaranteed failure.
  const hasCopy = account.reachable
  // NON-NEGOTIABLE #7: show General as the number (what chat spends); never
  // rank/display `available` (the wider sum) as "credits".
  const credit = account.generalAvailable
  const excluded = account.excludedBy
  const checkin = account.checkedInToday
  const device = account.deviceCheckedIn
  const testRow = rows[account.accountId]
  /**
   * Whether the probe column already explains WHY this row is excluded.
   *
   * The exclusion tag and the probe cell are derived from the same verdict, so a
   * row that shows both says 「登录凭据被拒」 twice, six centimetres apart. Keep
   * the tag only for the case the cell cannot cover: no probe to show at all
   * (e.g. a stored member whose last test predates this session).
   */
  const probeOnScreen = testRow !== undefined || account.probe !== undefined

  return (
    <div className={`dsm-trae-pool-row${isCurrent ? ' dsm-trae-pool-row-current' : ''}`} role="row" data-account-id={account.accountId}>
      {/* Account: draft checkbox + status dot + current badge + in-pool tag + exclusion. */}
      <div className="dsm-trae-pool-account">
        <label className="dsm-trae-pool-check">
          <input
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={onToggle}
            aria-label={t('row.poolSelectAria', { accountName: account.accountName })}
          />
        </label>
        <span className="dsm-trae-pool-account-name">
          {/* A row with no local copy must not get the healthy green dot: the
              dot is the first thing scanned, and green next to 「本机无副本」
              is a contradiction the label cannot undo. */}
          <span className={`dsm-trae-pool-dot dsm-trae-pool-dot-${account.reachable === false ? 'ghost' : excluded ? 'excluded' : 'ok'}`} aria-hidden="true" />
          {/* A row whose name never got measured (a member saved before the
              plugin recorded names) must NOT render as an empty cell: the id is
              the only handle the user has on it, and a blank row reads as a
              broken copy rather than as a stale member to delete. */}
          <b>{account.accountName !== '' ? account.accountName : account.accountId}</b>
          {/* edition · credential source, and the countdown that ends automatic
              renewal. Both used to live in the roster table this section
              replaces, so leaving them out would have been a silent loss of the
              only warning that a token is about to die. */}
          {detail?.meta === undefined ? null : <span className="dsm-trae-pool-meta">{detail.meta}</span>}
          {detail?.warn === undefined
            ? null
            : <span className={`dsm-trae-pool-warn-tag dsm-trae-pool-warn-tag-${detail.warnTone ?? 'soon'}`} role="status">{detail.warn}</span>}
        </span>
        <span className="dsm-trae-pool-account-tags">
          {/* 「派单中」 is NOT here any more. It used to share this line with
              「未入池」, and the pair is self-contradictory by construction: an
              account can be billing right now (the Host fell back to the saved
              selection) while not being a rotation member. The same line also
              sits under a count of 「已选 0 / 1」, which made a correct state read
              as a bug. Who bills is now answered ONCE, in the header, with a
              one-line note under the mode bar for the case the two disagree; the
              row keeps the membership in words, and `isCurrent` still tints it
              so the billing row stays findable at a glance. */}
          {/* Membership is stated in WORDS on every row, and it follows the
              DRAFT (the checkbox), never the saved list: an unchecked row that
              still says 「已在池中」 is the one contradiction a user cannot
              resolve. It is also what makes an unselected row look different
              from a selected one at a glance — a tick alone is 13 pixels of
              difference in a five-column table. */}
          <span className={checked ? 'dsm-trae-pool-member' : 'dsm-trae-pool-not-member'}>
            {checked ? t('row.poolMember') : t('row.poolNotMember')}
          </span>
          {account.reachable === false
            ? <span className="dsm-trae-pool-tag dsm-trae-pool-tag-ghost" role="status">{t('row.poolNoCopyTag')}</span>
            : null}
          {excluded && !probeOnScreen
            ? <span className="dsm-trae-pool-tag dsm-trae-pool-tag-excluded">{exclusionLabel(excluded, t)}</span>
            : null}
          {/* A lapsed access token explains the empty credit cell: the balance
              is not zero, it is unreadable until the user signs in again. */}
          {account.tokenExpired === true && excluded !== 'credential-rejected'
            ? <span className="dsm-trae-pool-warn-tag dsm-trae-pool-warn-tag-lapsed">{t('row.poolTokenExpired')}</span>
            : null}
        </span>
        {/* Absolute time of the last probe. The model cell says how long ago;
            this says when, which is what people compare across rows. */}
        {account.probe?.atMs === undefined
          ? null
          : <span className="dsm-trae-pool-account-note">{t('row.poolProbeAt', { when: shortWhen(account.probe.atMs) })}</span>}
        {account.deviceWarning === undefined ? null : <span className="dsm-trae-pool-account-note" role="status">
          {account.deviceWarning.state === 'shared'
            ? t('row.deviceShared', { accounts: account.deviceWarning.peers.join('、') })
            : t('row.deviceUnbound')}
        </span>}
      </div>

      {/* Credit: the General bucket. Work is only a hint (never shown as the number). */}
      {/* The column header already says 「通用积分」, so repeating 「通用」 under
          every number was the same word twice in one cell. The tooltip keeps the
          explanation one hover away. */}
      <div className="dsm-trae-pool-credit" title={t('row.poolWorkHint')}>
        <span className="dsm-trae-pool-credit-num">{credit === undefined ? t('row.poolCreditNone') : formatNumber(credit)}</span>
        {credit === undefined || account.nearestExpiryMs === undefined
          ? null
          : <span className="dsm-trae-pool-credit-meta">{t('row.poolCreditExpiry', { when: shortDate(account.nearestExpiryMs) })}</span>}
      </div>

      {/* Probe result. */}
      <div className="dsm-trae-pool-probe">
        {testRow !== undefined
          ? <ProbeResult outcome={testRow.outcome} modelId={testRow.modelId} atMs={undefined} source={undefined} t={t} relativeAt={relativeAt} now={Date.now()} detail={testRow.detail} poolModelId={poolModelId} />
          : account.probe !== undefined
            ? <ProbeResult outcome={account.probe.outcome} modelId={account.probe.modelId} atMs={account.probe.atMs} source={account.probe.source} t={t} relativeAt={relativeAt} now={Date.now()} detail={account.probe.message} poolModelId={poolModelId} />
            : <span className="dsm-trae-pool-probe-none">{t('row.poolNeverTested')}</span>}
      </div>

      {/* Check-in column (only when the panel supports it). */}
      {showCheckin ? <div className="dsm-trae-pool-checkin">
        <span className={`dsm-trae-pool-checkin-state dsm-trae-pool-checkin-${checkin === undefined ? 'unknown' : checkin ? 'ok' : device === true || (account.deviceBound !== true && deviceClaimed) ? 'device' : 'no'}`}>
          {checkin === undefined
            ? t('row.poolCheckinUnknown')
            : checkin ? t('row.poolCheckedIn')
              : device === true || (account.deviceBound !== true && deviceClaimed) ? t('row.poolDeviceUsed') : t('row.poolNotCheckedIn')}
        </span>
        {/* Only an ACTION belongs here. Once this account is claimed — or this
            machine already spent the day's check-in — a greyed "already
            claimed" button is a dead control repeating the line above it. */}
        {claim === undefined || onClaim === undefined || claim.claimable === false
          ? null
          : <button
              type="button"
              className="dsm-btn dsm-btn-outline dsm-trae-pool-claim"
              disabled={claim.disabled || disabled}
              title={claim.title}
              onClick={() => { onClaim(account.accountId) }}
            >
              {claim.label}
            </button>}
      </div> : null}

      {/* Row actions: Test / Delete. */}
      {/* Delete is the ONE destructive action on a row: it erases this plugin's
          OWN credential copy (Trae's desktop login is left alone). There is no
          separate 「移除」 any more — a second, softer removal that only edited the
          membership draft was a fork in the road the user could not read, and it
          was the one they kept reporting as broken. */}
      <div className="dsm-trae-pool-row-actions">
        {/* A row with no local copy has nothing to test: the Host answers
            「no stored credential for this account」, which the card renders as
            「登录凭据被拒」 — a rejection that never happened. Disable the button
            and say why instead of offering an action that can only fail. */}
        <button
          type="button"
          className="dsm-btn dsm-btn-outline"
          disabled={disabled || hasCopy === false}
          title={hasCopy === false ? t('row.poolNoCopyTestHint') : undefined}
          onClick={onTest}
        >{t('row.poolRowTest')}</button>
        {/* A Host that cannot delete (legacy, no deleteAccountOf) must not render
            a button whose only outcome is a 503; `canDelete` mirrors that. */}
        {canDelete
          ? <button
              type="button"
              className="dsm-btn dsm-btn-outline-danger dsm-trae-pool-delete"
              disabled={disabled || deleting}
              aria-label={t('row.poolRowDeleteAria', { accountName: account.accountName })}
              onClick={onDelete}
            >
              {deleting ? t('row.poolRowDeleting') : t('row.poolRowDelete')}
            </button>
          : null}
      </div>
    </div>
  )
}

interface MemberGhostRowProps {
  ghost: { accountId: string; accountName: string }
  /** Same rule as {@link MemberRowProps.showCheckin}: cell count must match the columns. */
  showCheckin: boolean
  checked: boolean
  onToggle: () => void
  t: T
  disabled: boolean
  deleting: boolean
  onDelete: () => void
  canDelete: boolean
}

export function MemberGhostRow({ ghost, checked, onToggle, t, disabled, deleting, onDelete, canDelete, showCheckin }: MemberGhostRowProps): ReactElement {
  return (
    <div className="dsm-trae-pool-row dsm-trae-pool-row-ghost" role="row" data-account-id={ghost.accountId}>
      <div className="dsm-trae-pool-account">
        <label className="dsm-trae-pool-check">
          <input
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={onToggle}
            aria-label={t('row.poolSelectAria', { accountName: ghost.accountName })}
          />
        </label>
        <span className="dsm-trae-pool-account-name">
          <span className="dsm-trae-pool-dot dsm-trae-pool-dot-ghost" aria-hidden="true" />
          {ghost.accountName}
        </span>
        <span className="dsm-trae-pool-account-tags">
          <span className={checked ? 'dsm-trae-pool-member' : 'dsm-trae-pool-not-member'}>
            {checked ? t('row.poolMember') : t('row.poolNotMember')}
          </span>
          <span className="dsm-trae-pool-tag dsm-trae-pool-tag-ghost">{t('row.poolExcludedUnusable')}</span>
        </span>
      </div>
      {/* A ghost has no live credit / probe — deleting it (or the stale
          membership that keeps it here) is the point. */}
      <div className="dsm-trae-pool-credit"><span className="dsm-trae-pool-credit-num">{t('row.poolCreditNone')}</span></div>
      <div className="dsm-trae-pool-probe"><span className="dsm-trae-pool-probe-none">{t('row.poolNeverTested')}</span></div>
      {showCheckin
        ? <div className="dsm-trae-pool-checkin"><span className="dsm-trae-pool-checkin-state dsm-trae-pool-checkin-unknown">{t('row.poolCheckinUnknown')}</span></div>
        : null}
      <div className="dsm-trae-pool-row-actions">
        {canDelete
          ? <button
              type="button"
              className="dsm-btn dsm-btn-outline-danger dsm-trae-pool-delete"
              disabled={disabled || deleting}
              aria-label={t('row.poolGhostDeleteAria', { accountName: ghost.accountName })}
              onClick={onDelete}
            >
              {deleting ? t('row.poolRowDeleting') : t('row.poolRowDelete')}
            </button>
          : null}
      </div>
    </div>
  )
}

interface ProbeResultProps {
  outcome: TraeWebPoolOutcome
  modelId?: string | undefined
  atMs?: number | undefined
  source?: 'test-batch' | 'live-request' | undefined
  detail?: string | undefined
  /**
   * The pool's SAVED target model (`pool.targetModelId`), or `''` when the pool
   * resolves one itself.
   *
   * The model used to be reprinted under every row unconditionally, which made
   * the same name appear three times on one screen: on the 「目标测速模型」
   * control, in the column header, and again here. The header no longer claims
   * to name a model (it says 「状态」), and this line now speaks only when it has
   * something the other two do not: the probe ran against a DIFFERENT model than
   * the pool is set to — the case that looks like a bug and is not.
   */
  poolModelId: string
  t: T
  relativeAt: (at: number, now: number, t: T) => string
  now: number
}

function ProbeResult({ outcome, modelId, atMs, source, detail, poolModelId, t, relativeAt, now }: ProbeResultProps): ReactElement {
  const tone = outcome === 'ok' ? 'ok' : 'warn'
  // Compared against the SAVED resolution, not the draft: a model the user is
  // merely considering must not make every row suddenly reprint its id.
  const modelDiffers = modelId !== undefined && modelId !== poolModelId
  const sourceLabel = source === undefined ? '' : probeSourceLabel(source, t)
  return (
    <div className="dsm-trae-pool-probe-cell">
      <span className={`dsm-trae-pool-probe-outcome dsm-trae-pool-probe-${tone}`}>
        <span className="dsm-trae-pool-dot dsm-trae-pool-dot-ok" aria-hidden="true" />
        {outcomeLabel(outcome, t)}
      </span>
      {atMs === undefined
        ? null
        : <span className="dsm-trae-pool-probe-meta">{t('row.poolProbeMeasured', { when: relativeAt(atMs, now, t) })}</span>}
      {modelDiffers
        ? <span className="dsm-trae-pool-probe-meta">
            {t('row.poolProbeModel', { model: modelId })}
            {sourceLabel === '' ? '' : ` · ${sourceLabel}`}
          </span>
        : sourceLabel === ''
          ? null
          : <span className="dsm-trae-pool-probe-meta">{sourceLabel}</span>}
      {detail !== undefined && detail !== '' ? <span className="dsm-trae-pool-probe-detail">{detail}</span> : null}
    </div>
  )
}

interface ActivityLogProps {
  log: LogEntry[]
  t: T
  now: number
  relativeAt: (at: number, now: number, t: T) => string
  onClear: () => void
}

export function ActivityLog({ log, t, now, relativeAt, onClear }: ActivityLogProps): ReactElement {
  return (
    <div className="dsm-trae-pool-log">
      <div className="dsm-trae-pool-log-head">
        <h4 className="dsm-trae-pool-subtitle">{t('row.poolLogTitle')}</h4>
        {log.length > 0 ? <button type="button" className="dsm-btn dsm-btn-outline" onClick={onClear}>{t('row.poolLogClear')}</button> : null}
      </div>
      {log.length === 0
        ? <p className="dsm-trae-pool-log-empty">{t('row.poolLogEmpty')}</p>
        : <ol className="dsm-trae-pool-log-list">
            {log.map(entry => (
              <li key={entry.id} className={`dsm-trae-pool-log-item dsm-trae-pool-log-${entry.tone}`}>
                <span className="dsm-trae-pool-log-text">{entry.text}</span>
              </li>
            ))}
          </ol>}
    </div>
  )
}
