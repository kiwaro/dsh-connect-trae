/** Pure credential normalization and stable account identity. */
import { createHash } from 'node:crypto'
import type { TraeEdition } from './paths.ts'
import type { TraeCredential } from './auth-types.ts'

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined
}

function timeToMs(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value > 1e12 ? value : value * 1000
  if (typeof value !== 'string' || value.trim() === '') return undefined
  const numeric = Number(value)
  if (Number.isFinite(numeric) && numeric > 0) return numeric > 1e12 ? numeric : numeric * 1000
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

/** Extract the `userRegion.region` string from either on-disk shape. */
function userRegionOf(value: unknown): string | undefined {
  const raw = typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)['region']
    : value
  return typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : undefined
}

export function normalizeTraeCredential(raw: unknown, edition: TraeEdition, source: TraeCredential['source']): TraeCredential | undefined {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return undefined
  const value = raw as Record<string, unknown>
  const accessToken = optionalString(value['token']) ?? optionalString(value['accessToken'])
  if (accessToken === undefined) return undefined
  const expiresAtMs = timeToMs(value['expiredAt'] ?? value['expiresAt']) ?? 0
  const refreshExpiresAtMs = timeToMs(value['refreshExpiredAt'] ?? value['refreshExpiresAt'])
  const refreshToken = optionalString(value['refreshToken'])
  const userRegion = userRegionOf(value['userRegion'])
  const account = typeof value['account'] === 'object' && value['account'] !== null && !Array.isArray(value['account'])
    ? value['account'] as Record<string, unknown>
    : undefined
  const accountName = optionalString(account?.['username'])
  // `tenant_id` is a number or a string depending on the client that wrote it.
  const tenantId = optionalString(account?.['tenant_id']) ?? (typeof account?.['tenant_id'] === 'number' ? String(account['tenant_id']) : undefined)
  return {
    accessToken,
    ...refreshToken === undefined ? {} : { refreshToken },
    userId: optionalString(value['userId']) ?? '',
    ...accountName === undefined ? {} : { accountName },
    ...tenantId === undefined ? {} : { tenantId },
    host: optionalString(value['host']) ?? '',
    ...userRegion === undefined ? {} : { userRegion },
    expiresAtMs,
    ...refreshExpiresAtMs === undefined ? {} : { refreshExpiresAtMs },
    edition,
    source,
  }
}

/**
 * Whether this account belongs to a Trae tenant, i.e. may bill the enterprise
 * pool.
 *
 * Evidence (2026-10-17, live): the tenant's own account carries
 * `account.tenant_id` / `tenant_name` and `scope: 'saas'`; the personal SOLO
 * account carries neither and reports `scope: 'marscode'`. Only the tenant one
 * streams on the enterprise gateway — the other answers `4019` risk control.
 */
export function isEnterpriseAccount(credential: Pick<TraeCredential, 'tenantId'> | undefined): boolean {
  return credential?.tenantId !== undefined && credential.tenantId.trim() !== ''
}

export function traeAccountId(credential: Pick<TraeCredential, 'edition' | 'userId' | 'accountName'>): string {
  const stable = `${credential.edition}\0${credential.userId || credential.accountName || 'unknown'}`
  return createHash('sha256').update(stable).digest('hex').slice(0, 24)
}

/**
 * The exact shape of an account id — sha256 hex sliced to 24 characters, which is
 * what {@link traeAccountId} emits and therefore the only string a request may
 * legitimately name.
 *
 * This regex is a traversal guard as much as a validator: an id becomes part of a
 * path (`$DSH_HOME/.trae-pool.<panel>.json` uses it as a key, and a credential
 * lookup receives it), so `../../etc/passwd` has to fail here rather than fail
 * somewhere closer to the filesystem. Exported so an HTTP route can answer a bad
 * id with 400 instead of letting an exception surface as a 500.
 */
export const TRAE_ACCOUNT_ID_RE = /^[0-9a-f]{24}$/

/** Whether a request-supplied value is a well-formed Trae account id. */
export function isTraeAccountId(value: unknown): value is string {
  return typeof value === 'string' && TRAE_ACCOUNT_ID_RE.test(value)
}
