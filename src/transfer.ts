/**
 * Trae 账号导入与导出。文件使用 JSON 数组，每项保存一条凭据记录。
 * 顶层字段格式与 WorkBuddy 的导出文件相近，但凭据仍须属于 Trae 且区域可识别；
 * 文件结构兼容不代表两个产品的登录凭据可以互换。
 *
 * 导入按账号标识去重，同一标识覆盖已有记录，缺少 access_token 的记录跳过。
 * 预览只返回账号信息和 hasToken，不返回 Token 明文。解析不访问文件系统，
 * 凭据保存由调用方的存储模块完成。
 *
 * expiresAt 与 refreshExpiresAt 使用毫秒。TraeCredential.expiresAtMs 已在
 * auth.ts 中换算为毫秒，此处直接保存；WorkBuddy 的内部秒值需要另做换算。
 * auth_raw 保留原始认证文档，供需要原文的导入工具使用。
 *
 * @module dsh-connect-trae/transfer
 */

import { traeAccountId, type TraeCredential } from './auth.ts'
import { regionOfHost, regionOfUserRegion, type TraeRegion, type TraeServiceRegion } from './region.ts'
import type { TraeEdition } from './paths.ts'

/** The shared transfer-file record shape (snake_case top-level fields). */
export interface TraeTransferRecord {
  access_token: string
  refresh_token?: string
  uid?: string
  nickname?: string
  email?: string
  domain?: string
  /** Epoch **milliseconds**, per the shared contract. */
  expiresAt?: number
  /** Epoch **milliseconds**, per the shared contract. */
  refreshExpiresAt?: number
  /** The original auth document, carried verbatim for the write-back path. */
  auth_raw?: unknown
}

/** One desensitized preview row. */
export interface TraeTransferPreviewEntry {
  index: number
  uid: string
  nickname: string
  email: string
  hasToken: boolean
}

/** The transfer file's desensitized preview. */
export interface TraeTransferPreview {
  accounts: TraeTransferPreviewEntry[]
  total: number
}

/**
 * Parse transfer-file text: a JSON array, every element an object.
 *
 * The error strings carry the position (1-based item number) because a file
 * from another tool can be big, and "第 N 项" is what lets the user find the
 * broken record in their editor.
 */
export function parseTransferFile(text: string): TraeTransferRecord[] {
  if (text.trim() === '') throw new Error('transfer file is empty')
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (error: unknown) {
    throw new Error('transfer file is not valid JSON: ' + (error instanceof Error ? error.message : String(error)))
  }
  if (!Array.isArray(parsed)) throw new Error('transfer file must be a JSON array of account records')
  for (const [index, item] of parsed.entries()) {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      throw new Error('transfer file item ' + (index + 1) + ' is not an account object')
    }
  }
  return parsed as TraeTransferRecord[]
}

/** One string field of a record, tolerating the sibling format's odd shapes. */
function displayString(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return ''
}

/** Whether a record carries a usable token (a non-empty string). */
function hasToken(record: TraeTransferRecord): boolean {
  const token: unknown = record['access_token']
  return typeof token === 'string' && token !== ''
}

/**
 * The transfer file's desensitized preview: display fields only.
 *
 * Fields come from EXTERNAL files, so a display field may hold an object or an
 * array (a sibling tool can store the desktop app's encrypted-wrapper nickname
 * verbatim); every preview field is normalized to a string or emptied rather
 * than letting a non-renderable value reach the card.
 */
export function previewTransferFile(text: string): TraeTransferPreview {
  const records = parseTransferFile(text)
  const accounts: TraeTransferPreviewEntry[] = records.map((record, index) => ({
    index,
    uid: displayString(record['uid']),
    nickname: displayString(record['nickname']),
    email: displayString(record['email']),
    hasToken: hasToken(record),
  }))
  return { accounts, total: records.length }
}

/**
 * Positive-match region claim for an IMPORTED record: the record's own
 * `userRegion` claim wins, the host suffix is the fallback, and anything
 * unrecognised (empty, misspelt, or other-region) yields `undefined` — never a
 * default.
 *
 * This is the security-critical difference from `regionOfCredential`, which
 * classifies anything unrecognised as `cn` as a last resort (via the edition
 * label). That fallback is right for upstream-sourced data, whose host/region
 * came out of the real Trae install, but wrong for an import whose values are
 * simply whatever the file's author wrote: a spoofed or misspelt `domain`
 * would otherwise be admitted into the CN vault and cross-bill the CN provider
 * stack with a credential that belongs to no real CN account. So this helper
 * reuses `regionOfUserRegion` / `regionOfHost` — both of which already return
 * `undefined` on unrecognised input — and deliberately does NOT consult the
 * edition fallback. A US claim (`userRegion: "US"` or a `*.traeapi.us` host)
 * therefore resolves to `us` and matches neither importable region, so that
 * record is skipped like any other foreign one (issue #66).
 */
export function knownRegionOfCredential(credential: {
  host?: string
  userRegion?: string
}): TraeServiceRegion | undefined {
  return regionOfUserRegion(credential.userRegion) ?? regionOfHost(credential.host)
}

/**
 * Project one credential into the shared transfer record shape.
 *
 * `expiresAt` / `refreshExpiresAt` are emitted in epoch MILLISECONDS — the
 * transfer contract's unit. Unlike workbuddy — whose vault stored seconds and
 * had to convert here — trae's `expiresAtMs` is already milliseconds, so the
 * value is carried through verbatim (documented above; do not rescale).
 * `auth_raw` carries the original auth document so a tool that writes desktop
 * auth files can consume it verbatim.
 */
export function traeTransferRecordOf(
  credential: TraeCredential,
  authRawDocument: unknown,
): TraeTransferRecord {
  const record: TraeTransferRecord = {
    access_token: credential.accessToken,
    ...credential.refreshToken !== undefined && credential.refreshToken !== ''
      ? { refresh_token: credential.refreshToken }
      : {},
    ...credential.userId !== '' ? { uid: credential.userId } : {},
    ...credential.accountName !== undefined ? { nickname: credential.accountName } : {},
    ...credential.host !== '' ? { domain: credential.host } : {},
    ...(credential.expiresAtMs > 0 ? { expiresAt: credential.expiresAtMs } : {}),
    ...credential.refreshExpiresAtMs === undefined ? {} : { refreshExpiresAt: credential.refreshExpiresAtMs },
    auth_raw: authRawDocument,
  }
  return record
}

/** The `userId` claim from a record: the flat `uid`, else recovered from `auth_raw`. */
function userIdOfRaw(record: TraeTransferRecord): string {
  const flat = displayString(record['uid'])
  if (flat !== '') return flat
  const root = rawRoot(record['auth_raw'])
  if (root === undefined) return ''
  return displayString(root['userId']) ?? ''
}

/** The `accountName` claim: the flat `nickname`, else recovered from `auth_raw`. */
function accountNameOfRaw(record: TraeTransferRecord): string | undefined {
  const flat = displayString(record['nickname'])
  if (flat !== '') return flat
  const root = rawRoot(record['auth_raw'])
  if (root === undefined) return undefined
  const account = typeof root['account'] === 'object' && root['account'] !== null
    ? root['account'] as Record<string, unknown>
    : undefined
  const fromAccount = displayString(account?.['username'])
  if (fromAccount !== '') return fromAccount
  return displayString(root['username'])
}

/** The raw `userRegion` claim string from `auth_raw` (object `{region}` or bare value). */
function userRegionOfRaw(raw: unknown): string | undefined {
  const root = rawRoot(raw)
  if (root === undefined) return undefined
  const value = root['userRegion']
  const claim = typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)['region']
    : value
  return typeof claim === 'string' && claim.trim() !== '' ? claim.trim() : undefined
}

/**
 * A record's `auth_raw` root, tolerating both the nested `{auth, account}` block
 * this plugin exports and a raw desktop storage document: `account` may be a
 * sub-object (the block shape) or absent (flat document shape).
 */
function rawRoot(raw: unknown): Record<string, unknown> | undefined {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return undefined
  const root = raw as Record<string, unknown>
  return root
}

/**
 * Edition derived from an imported record's `domain` host, positively.
 *
 * The shared transfer format has no edition field (only `domain`), so a
 * re-import must re-derive the routing label from the host. Only the two base
 * editions are ever assigned — a flat `domain` + `uid` cannot distinguish the
 * SOLO variants — so this is inherently lossy for SOLO accounts; that is
 * acceptable because the region gate (see `mergeTransferRecords`) never
 * consults edition, and the account id's edition component only affects whether
 * a re-imported account converges on the same stored id (which it does as long
 * as the host is positively classified).
 */
function editionOfDomain(host: string): TraeEdition | undefined {
  const region = regionOfHost(host)
  if (region === 'ai') return 'sg'
  if (region === 'cn') return 'cn'
  return undefined
}

/**
 * Project one transfer record into a credential, or undefined when the record
 * carries no token (the importer's skip rule).
 *
 * `userId` empty is tolerated at THIS layer because a token-only record still
 * describes a usable credential; the Host's region gate decides whether it is
 * representable, and the store's account id (`edition \0 userId || accountName`)
 * decides whether it is addressable. An unopenable `auth_raw` is ignored — the
 * flat fields are the contract, `auth_raw` is extra fidelity for the write-back
 * path.
 *
 * `edition` is restored positively from the domain host (see `editionOfDomain`),
 * defaulting to `cn` ONLY as a neutral placeholder when the host is not
 * classifiable — this is safe because the region gate never consults edition,
 * and such a record is always `skipped` there before edition could matter.
 */
export function credentialOfTransferRecord(record: TraeTransferRecord): Omit<TraeCredential, 'source'> | undefined {
  const accessToken = record['access_token']
  if (typeof accessToken !== 'string' || accessToken === '') return undefined
  const refreshToken = typeof record['refresh_token'] === 'string' ? record['refresh_token'] : ''
  // The transfer format's expiry is epoch ms and trae's runtime field is ms too
  // (unlike workbuddy's vault, which stored seconds) — so 0/absent maps straight
  // to the "unknown" zero. No rescale.
  const expiresAtMs = typeof record['expiresAt'] === 'number' && Number.isFinite(record['expiresAt']) && record['expiresAt'] > 0
    ? record['expiresAt']
    : 0
  const refreshExpiresAtMs = typeof record['refreshExpiresAt'] === 'number' && Number.isFinite(record['refreshExpiresAt']) && record['refreshExpiresAt'] > 0
    ? record['refreshExpiresAt']
    : undefined
  const userId = userIdOfRaw(record)
  const accountName = accountNameOfRaw(record)
  const host = typeof record['domain'] === 'string' ? record['domain'] : ''
  const edition = editionOfDomain(host) ?? 'cn'
  const userRegion = userRegionOfRaw(record['auth_raw'])
  return {
    accessToken,
    ...refreshToken === '' ? {} : { refreshToken },
    userId,
    ...accountName === undefined ? {} : { accountName },
    host,
    ...userRegion === undefined ? {} : { userRegion },
    expiresAtMs,
    ...refreshExpiresAtMs === undefined ? {} : { refreshExpiresAtMs },
    edition,
  }
}

/** The judge parameter of {@link mergeTransferRecords}: a positive-match region function. */
type RegionJudge = (credential: Pick<TraeCredential, 'edition' | 'host' | 'userRegion'>) => TraeServiceRegion | undefined

/** Default gate so the merge is secure even when the caller omits the judge. */
const defaultRegionJudge: RegionJudge = knownRegionOfCredential as RegionJudge

/**
 * Pure merge: fold selected records into a CHANGES map keyed by account id.
 *
 * Mirrors the sibling merger's contract: a record with the same account id
 * OVERWRITES the stored entry (the imported tokens replace what is stored —
 * re-importing a re-login must refresh it; the write layer stores the record
 * atomically, so "overwrite" needs no knowledge of the incumbent), and a
 * record without a token is skipped. The region gate lives HERE rather than in
 * the route so it is testable without a Host.
 *
 * The region gate is a POSITIVE match: a record is kept only when its OWN
 * region claim is positively known to equal the target region. `regionOfCredential`
 * classifies anything unrecognised as `cn`, which is fine for upstream-sourced
 * data but WRONG for an imported file whose host/region are author-controlled —
 * a spoofed or misspelt value would otherwise be admitted into the CN vault.
 * Here the injected `knownRegionOfCredential` (defaulting to the exported
 * positive-match helper, which never consults the edition fallback) returns
 * `undefined` for an empty, unrecognised, or other-region claim, and such a
 * record counts as `skipped` rather than being silently imported cross-region.
 *
 * The caller writes one store file per map entry, so a selection that is
 * already stored rewrites those files with identical content — idempotent,
 * and the steady state of importing the same file twice.
 */
export function mergeTransferRecords(
  records: readonly TraeTransferRecord[],
  indexes: readonly number[],
  region: TraeRegion,
  knownRegionOfCredential: RegionJudge = defaultRegionJudge,
): { changes: Map<string, Omit<TraeCredential, 'source'>>, imported: number, skipped: number } {
  const changes = new Map<string, Omit<TraeCredential, 'source'>>()
  let imported = 0
  let skipped = 0
  for (const index of indexes) {
    const record = records[index]
    if (record === undefined) {
      skipped += 1
      continue
    }
    const credential = credentialOfTransferRecord(record)
    if (credential === undefined) {
      skipped += 1
      continue
    }
    // Region gate: the credential's OWN claim decides, and the decision must be
    // a POSITIVE match. `undefined` (unrecognised / empty / other region) never
    // equals the target region, so the record is skipped and reported as such.
    if (knownRegionOfCredential(credential) !== region) {
      skipped += 1
      continue
    }
    const id = traeAccountId(credential)
    changes.set(id, credential)
    imported += 1
  }
  return { changes, imported, skipped }
}
