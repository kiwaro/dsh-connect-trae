import type { TraeCredentialSource, TraeEdition } from './paths.ts'
import type { TraeRegion, TraeServiceRegion } from './region.ts'
import type { RunningProbe } from './trae-process.ts'

export interface TraeCredential {
  /** Device registered with this credential; persisted only in the private auth copy. */
  deviceIdentity?: import('./identity.ts').TraeIdentity
  accessToken: string
  refreshToken?: string
  userId: string
  accountName?: string
  /**
   * Trae tenant this account belongs to (`account.tenant_id`, e.g. `272193024`
   * for a `tob_online` enterprise), absent for a personal account.
   *
   * This is what decides whether the ENTERPRISE pool can serve the account at
   * all. The tenant gateway accepts any CN token for its DIRECTORY read — a
   * personal account gets the full 49-model roster back — so "the roster
   * loaded" proves nothing about billing rights. Its chat endpoint is what
   * refuses: a personal account answers `4019` (risk control), a tenant account
   * streams normally. Because the two are indistinguishable from the roster,
   * the account list itself has to carry the flag.
   */
  tenantId?: string
  host: string
  /**
   * Region claim from the decrypted storage document (`userRegion.region`,
   * 'CN' | 'SG', possibly lowercase). Drives the routing bucket together with
   * `host`; see `regionOfCredential`.
   */
  userRegion?: string
  expiresAtMs: number
  refreshExpiresAtMs?: number
  edition: TraeEdition
  source: 'desktop' | 'dsh' | 'cli'
}

export interface TraeRefreshOutcome {
  accessToken: string
  refreshToken?: string
  expiresAtMs: number
  refreshExpiresAtMs?: number
  host?: string
}

export interface TraeCredentialStoreOptions {
  storagePath?: string
  edition?: TraeEdition | 'auto'
  accountId?: string
  ownPath?: string
  /**
   * Region this store serves. When set, only credentials whose own claim maps
   * to this region are discovered, selected, or refreshed — the two regions'
   * stores run side by side without seeing each other's accounts.
   */
  region?: TraeRegion
  /**
   * Only consider credentials that belong to a Trae tenant.
   *
   * The enterprise panel's store runs with this on: a personal account cannot
   * bill that pool, and because the tenant gateway still serves it a directory,
   * binding it here would fail only at the first chat (`4019`). With the flag
   * set, an explicit binding to a personal account falls through to the preferred
   * TENANT account instead of being silently honoured.
   */
  requireTenant?: boolean
  /**
   * Withhold TENANT (enterprise) accounts from this store's account list.
   *
   * Set on the consumer panels: an enterprise login belongs to the enterprise
   * panel, and offering it here would let a tenant account be bound to the
   * personal pool without the user ever seeing which pool they picked. A
   * machine that has ONLY a tenant login still resolves it — an empty list must
   * not turn a working install into "signed out" — so the filter is applied to
   * the OFFERED list, never to the resolved credential.
   */
  hideTenantAccounts?: boolean
  /** Legacy single-copy path read as a migration source; injectable for tests. */
  legacyOwnPath?: string
  refresh: (credential: TraeCredential) => Promise<TraeRefreshOutcome>
  refreshMarginMs?: number
  /**
   * Which Trae desktop apps are running right now. Injectable so the deletion
   * tests never depend on the machine they run on; defaults to the real probe.
   */
  runningApps?: RunningProbe
}

export interface TraeAccountChoice {
  deviceBound?: boolean
  /** Display-only diagnosis; never contains device identifiers or signing keys. */
  deviceWarning?: import('./account-device.ts').TraeDeviceWarning
  id: string
  accountName: string
  edition: TraeEdition
  /**
   * Whether this account may bill the CN ENTERPRISE pool.
   *
   * Derived from the credential's own tenant claim, because nothing else can
   * tell: the tenant gateway answers a directory read for ANY CN token, so a
   * personal account looks perfectly serviceable right up to its first chat,
   * which it answers with `4019`. The enterprise panel filters its account list
   * and its default binding on this flag.
   */
  enterprise: boolean
  /** Routing bucket of this account (`cn` | `ai`), derived from its credential. */
  region: TraeRegion
  source: 'desktop' | 'dsh' | 'cli'
  tokenExpiresAtMs: number
  /**
   * When this account's refresh token lapses, when the credential carries one.
   * The store attempts access-token renewal when due; renewal can fail before
   * this expiry. See
   * the mirror field on `TraeWebAccount` in status-paths.ts for why the card
   * needs it.
   */
  refreshExpiresAtMs?: number
  selected: boolean
}

/**
 * A credential on this machine that names a region this build cannot serve yet
 * (issue #66: the US cluster).
 *
 * Reported so the card can explain a signed-out panel that a user knows is
 * signed in. It is never selectable and never billed: `readAll()` skips these,
 * so they cannot reach a gateway at all.
 */
export interface TraeUnsupportedCredential {
  region: Exclude<TraeServiceRegion, TraeRegion>
  /** Display identity of the credential — never token material. */
  accountName: string
}

/**
 * Why one candidate path did not yield an account. These are safe to surface:
 * they carry paths and error text, never token material.
 */
export interface TraeCandidateFailure {
  path: string
  edition: TraeEdition
  source: TraeCredentialSource
  reason: 'missing' | 'unreadable' | 'invalid'
  message?: string
}

/**
 * A plugin-owned copy that was found UNREADABLE and therefore moved aside.
 *
 * Since 4.4.6 a copy this build cannot parse is never merged over: it is
 * renamed to `<file>.corrupt-<stamp>` (bytes intact, recoverable) and the merge
 * restarts from a clean file. That trade — a quarantined copy instead of a
 * silently emptied one — is only fair if the USER can see it happened, because
 * the accounts the copy carried are, from that moment on, only in the
 * quarantine file.
 *
 * This notice is what makes that visible: the card's diagnostics panel shows
 * it, and so does the signed-out screen — which is exactly the state a user
 * lands in after the loss (issue #56).
 */
export interface TraeQuarantineNotice {
  /** The live path the copy had before it was moved aside. */
  file: string
  /** The quarantine copy's full path; its name carries the moment it was taken. */
  quarantinedAs: string
  /** Size of the quarantined copy in bytes (`0` when it could not be read). */
  bytes: number
  /**
   * How many accounts the quarantined copy held, when it could still be read
   * as JSON. A copy quarantined for being TORN cannot be counted, and this is
   * then absent rather than guessed.
   */
  accounts?: number
}
