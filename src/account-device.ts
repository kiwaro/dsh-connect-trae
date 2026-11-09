import type { TraeCredential } from './auth-types.ts'
import type { TraeIdentity } from './identity.ts'
import type { TraeEdition } from './paths.ts'

/** Private credential metadata only. Never project identifiers or key material to status JSON. */
export function parseDeviceIdentity(value: unknown, edition: TraeEdition): TraeIdentity | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const row = value as Record<string, unknown>
  if (row['edition'] !== edition) return undefined
  const text = (key: string): string | undefined => typeof row[key] === 'string' && row[key].trim() !== '' ? row[key] : undefined
  const deviceId = text('deviceId')
  const machineId = text('machineId')
  const platform = row['platform']
  if (deviceId === undefined || machineId === undefined || !['aix', 'android', 'darwin', 'freebsd', 'haiku', 'linux', 'openbsd', 'sunos', 'win32', 'cygwin', 'netbsd'].includes(String(platform))) return undefined
  const identity: TraeIdentity = { edition, deviceId, machineId, platform: platform as NodeJS.Platform }
  for (const key of ['appVersion', 'buildVersion', 'deviceBrand', 'deviceCpu', 'osVersion', 'deviceName', 'deviceModel'] as const) {
    const field = text(key)
    if (field !== undefined) identity[key] = field
  }
  const pair = row['deviceKeyPair']
  if (typeof pair === 'object' && pair !== null) {
    const keys = pair as Record<string, unknown>
    if (typeof keys['privateKeyPEM'] === 'string' && typeof keys['publicKeyPEM'] === 'string'
      && keys['privateKeyPEM'].trim() !== '' && keys['publicKeyPEM'].trim() !== '') {
      identity.deviceKeyPair = { privateKeyPEM: keys['privateKeyPEM'], publicKeyPEM: keys['publicKeyPEM'] }
    }
  }
  return identity
}

/** Resolve from the SAME credential snapshot as Authorization, including failover requests. */
export async function identityForCredential(
  credential: TraeCredential,
  fallback: (credential: TraeCredential) => Promise<TraeIdentity>,
): Promise<TraeIdentity> {
  return credential.deviceIdentity ?? fallback(credential)
}

export interface TraeDeviceWarning { state: 'shared' | 'unbound'; peers: string[] }

/** A shared identity is a risk indicator, not proof of the cause of any 4017. */
export function deviceWarningsOf(credentials: readonly TraeCredential[]): Map<TraeCredential, TraeDeviceWarning> {
  const warnings = new Map<TraeCredential, TraeDeviceWarning>()
  for (const credential of credentials) {
    const identity = credential.deviceIdentity
    if (identity === undefined) { warnings.set(credential, { state: 'unbound', peers: [] }); continue }
    const peers = credentials.filter(other => other !== credential
      && (credential.userId === '' || other.userId !== credential.userId)
      && other.deviceIdentity?.deviceId === identity.deviceId)
    if (peers.length > 0) warnings.set(credential, { state: 'shared', peers: peers.map(other => other.accountName ?? '账号') })
  }
  return warnings
}
