/** Pure projection of upstream credits and check-in answers for the client. */
import type { TraeWebCredits, TraeWebCreditExpiry, TraeWebExpiringCredits, TraeWebCheckin } from './status-paths.ts'

/**
 * Whether a pack's expiry is one the card can actually use.
 *
 * One predicate, shared by the per-pack projection and the bucket summary, so
 * the two can never disagree about which packs count as dated. `0` and the
 * non-finite values are excluded: a `0` here would read as 1970 and sort ahead
 * of every real date, and `NaN`/`Infinity` are not dates at all.
 */
function usableExpiry(endTimeMs: number | undefined): endTimeMs is number {
  return typeof endTimeMs === 'number' && Number.isFinite(endTimeMs) && endTimeMs > 0
}

/**
 * Map the credit snapshot to the card's compact credit document.
 *
 * Exported so the "is another account usable?" probe (issue #25) derives its
 * two buckets through the SAME endpoint classification the bound account uses
 * — a second implementation of the Work/general split would be free to disagree
 * with the number shown next to it.
 */
export function toCredits(snapshot: { summary: { totalAmount: number; consumedAmount: number }; packs: { displayDesc: string; availableEndpoint?: number; consumedCredits?: number; creditsLimit?: number; endTimeMs?: number }[] }, nowMs: number = Date.now()): TraeWebCredits {
  const { totalAmount, consumedAmount } = snapshot.summary
  const credit = (value: number): number => Math.round(value * 10_000) / 10_000
  const accounts = snapshot.packs.map(pack => ({
    displayDesc: pack.displayDesc,
    remain: credit(Math.max(0, (pack.creditsLimit ?? 0) - (pack.consumedCredits ?? 0))),
    size: pack.creditsLimit ?? 0,
    // Carried through because the pack's own expiry is what answers "which pack
    // lapses first" — the one question the remaining balance alone cannot. The
    // upstream already reports it per pack (`end_time`), so this is projection,
    // not a new read. Omitted rather than zeroed when there is no usable time:
    // a `0` here would read as 1970 and sort ahead of every real date.
    ...(usableExpiry(pack.endTimeMs) ? { expiresAtMs: pack.endTimeMs } : {}),
    // Which bucket this pack lives in, verbatim from upstream. The pool ranking
    // needs it to tell spendable credit from credit that only the Work surface
    // can reach; see {@link TraeWebCreditAccount.endpoint}.
    ...(pack.availableEndpoint === undefined ? {} : { endpoint: pack.availableEndpoint }),
  }))
  // `usage.credits_amount` is consumed credit, not remaining balance. Derive
  // each bucket's balance from its quota, matching total - consumed upstream.
  const remaining = (endpoint: number): number => snapshot.packs
    .filter(pack => pack.availableEndpoint === endpoint)
    .reduce((sum, pack) => credit(sum + Math.max(0, (pack.creditsLimit ?? 0) - (pack.consumedCredits ?? 0))), 0)
  return {
    total: totalAmount,
    consumed: consumedAmount,
    available: totalAmount - consumedAmount,
    workAvailable: remaining(1),
    generalAvailable: remaining(0),
    accounts,
    ...summarisePackExpiry(accounts, nowMs),
  }
}

/** Empty bucket, used whenever no pack qualifies. */
const NO_EXPIRING_CREDIT: TraeWebExpiringCredits = { total: 0, packs: 0 }

/**
 * Sum the credit lapsing inside `horizonMs` of `nowMs`.
 *
 * Only positive balances count: a lapsed pack with nothing left is not a loss,
 * and including it would make every long-lived account look permanently at
 * risk. Only *future* expiries count too — see {@link expiredPacks}.
 */
function expiringWithin(
  packs: readonly { remain: number; expiresAtMs?: number }[],
  nowMs: number,
  horizonMs: number,
): TraeWebExpiringCredits {
  return sumExpiring(packs, expiresAt => expiresAt > nowMs && expiresAt - nowMs <= horizonMs)
}

/**
 * Sum the credit whose pack has already lapsed but still carries a balance.
 *
 * Kept apart from {@link expiringWithin} because a lapsed pack satisfies every
 * forward-looking horizon at once (`expiresAt - now` is negative, hence "within
 * 24 hours"), which would make a long-dead pack look permanently imminent.
 */
function expiredPacks(
  packs: readonly { remain: number; expiresAtMs?: number }[],
  nowMs: number,
): TraeWebExpiringCredits {
  return sumExpiring(packs, expiresAt => expiresAt <= nowMs)
}

/** Shared accumulator over packs whose expiry passes `matches`. */
function sumExpiring(
  packs: readonly { remain: number; expiresAtMs?: number }[],
  matches: (expiresAtMs: number) => boolean,
): TraeWebExpiringCredits {
  let total = 0
  let count = 0
  let earliestExpiresAtMs: number | undefined
  for (const pack of packs) {
    const expiresAt = pack.expiresAtMs
    if (!usableExpiry(expiresAt) || pack.remain <= 0) continue
    if (!matches(expiresAt)) continue
    total += pack.remain
    count += 1
    if (earliestExpiresAtMs === undefined || expiresAt < earliestExpiresAtMs) earliestExpiresAtMs = expiresAt
  }
  if (count === 0) return NO_EXPIRING_CREDIT
  return {
    total,
    packs: count,
    ...(earliestExpiresAtMs === undefined ? {} : { earliestExpiresAtMs }),
  }
}

/**
 * Bucket the card's credit by how soon it lapses.
 *
 * Returns no `expiry` at all when not one pack carried a usable end time, so a
 * caller can tell "nothing is expiring" apart from "we were never told when
 * anything expires" — the second must not render as reassurance. Uses the same
 * {@link usableExpiry} predicate as the per-pack projection, so a summary is
 * never produced from a set of dates the card itself would not carry.
 */
function summarisePackExpiry(
  accounts: readonly { remain: number; expiresAtMs?: number }[],
  nowMs: number,
): { expiry?: TraeWebCreditExpiry } {
  if (!accounts.some(pack => usableExpiry(pack.expiresAtMs))) return {}
  const HOUR = 3_600_000
  const DAY = 24 * HOUR
  return {
    expiry: {
      within24h: expiringWithin(accounts, nowMs, DAY),
      within3d: expiringWithin(accounts, nowMs, 3 * DAY),
      within7d: expiringWithin(accounts, nowMs, 7 * DAY),
      // Expiry in the past is worth surfacing too: the balance is still listed
      // as credit, so a reader watching only the total would over-count it.
      expired: expiredPacks(accounts, nowMs),
    },
  }
}

/** Map the check-in answer to the card's compact document. */
export function toCheckin(status: {
  checkedIn: boolean
  credits: number
  enabled: boolean
  didCheckedIn: boolean
  extraCredits?: number
}): TraeWebCheckin {
  return {
    checkedIn: status.checkedIn,
    didCheckedIn: status.didCheckedIn,
    credits: status.credits,
    enabled: status.enabled,
    ...status.extraCredits === undefined ? {} : { extraCredits: status.extraCredits },
  }
}
