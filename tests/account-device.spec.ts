import { describe, it, expect, vi } from 'vitest'
import { deviceWarningsOf, parseDeviceIdentity, identityForCredential } from '../src/account-device.ts'
import { TraeSoloUpstreamClient } from '../src/solo.ts'
import { TraeUsageClient } from '../src/usage.ts'
import { traeTransferRecordOf, credentialOfTransferRecord } from '../src/transfer.ts'
import { TraeCredentialStore } from '../src/auth.ts'
import type { TraeCredential } from '../src/auth.ts'
import type { TraeIdentity } from '../src/identity.ts'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { TRAE_AUTH_STORAGE_KEY } from '../src/decrypt.ts'
import { checkinAllAccounts } from '../src/account-pool-run.ts'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const identity: TraeIdentity = { edition: 'solo', machineId: 'machine-a', deviceId: 'device-a', platform: 'win32' }
const account = (userId: string): TraeCredential => ({ userId, accountName: `demo-${userId}`, accessToken: `at-${userId}`, refreshToken: `rt-${userId}`, host: 'https://api.trae.cn', expiresAtMs: Date.now() + 3600_000, source: 'dsh', edition: 'solo' })

describe('account-bound device identity', () => {
  it('validates and whitelists stored identity without inventing a replacement', () => {
    expect(parseDeviceIdentity({ ...identity, token: 'at-secret' }, 'solo')).toEqual(identity)
    expect(parseDeviceIdentity({ ...identity, edition: 'sg' }, 'solo')).toBeUndefined()
    expect(parseDeviceIdentity({ ...identity, deviceId: '' }, 'solo')).toBeUndefined()
  })
  it('uses the bound identity without reading the currently selected installation', async () => {
    const fallback = vi.fn(async () => { throw new Error('wrong installation') })
    expect(await identityForCredential({ ...account('a'), deviceIdentity: identity }, fallback)).toEqual(identity)
    expect(fallback).not.toHaveBeenCalled()
  })
  it('preserves legacy resolution and passes the actual request account to it', async () => {
    const credential = account('a')
    const fallback = vi.fn(async () => identity)
    await identityForCredential(credential, fallback)
    expect(fallback).toHaveBeenCalledWith(credential)
  })
  it('reports shared and missing bindings using display names only', () => {
    const a = { ...account('a'), deviceIdentity: identity }
    const b = { ...account('b'), deviceIdentity: { ...identity, machineId: 'machine-b' } }
    const c = account('c')
    const warnings = deviceWarningsOf([a, b, c])
    expect(warnings.get(a)).toEqual({ state: 'shared', peers: ['demo-b'] })
    expect(warnings.get(c)).toEqual({ state: 'unbound', peers: [] })
    expect(JSON.stringify([...warnings.values()])).not.toContain('device-a')
    expect(deviceWarningsOf([a]).get(a)).toBeUndefined()
  })
  it('keeps the account identity across private-store restart and token refresh', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'trae-binding-'))
    try {
      const options = { ownPath: join(directory, 'own.json'), legacyOwnPath: join(directory, 'legacy.json'), storagePath: join(directory, 'missing.json'), edition: 'solo' as const, refresh: vi.fn(async () => ({ accessToken: 'at-renewed', expiresAtMs: Date.now() + 3600_000 })) }
      const store = new TraeCredentialStore(options)
      const [id] = await store.importAccounts([{ ...account('a'), expiresAtMs: 1, deviceIdentity: identity }])
      const reloaded = new TraeCredentialStore(options)
      const refreshed = await reloaded.resolveCredentialOf(id!)
      expect(refreshed?.accessToken).toBe('at-renewed')
      expect(refreshed?.deviceIdentity).toEqual(identity)
    } finally { await rm(directory, { recursive: true, force: true }) }
  })
  it('captures the local login and its device together, retaining earlier accounts after an IDE switch', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'trae-binding-'))
    try {
      const storagePath = join(directory, 'storage.json')
      const options = { ownPath: join(directory, 'own.json'), legacyOwnPath: join(directory, 'legacy.json'), storagePath, edition: 'solo' as const, refresh: vi.fn(async () => { throw new Error('unexpected refresh') }) }
      const login = async (userId: string, device: string, expiresAt: number) => writeFile(storagePath, JSON.stringify({
        [TRAE_AUTH_STORAGE_KEY]: JSON.stringify({ token: `at-${userId}-${device}`, refreshToken: 'rt-fixture', userId, account: { username: `demo-${userId}` }, host: 'https://api.trae.cn', expiredAt: expiresAt }),
        'telemetry.machineId': `machine-${device}`, 'telemetry.devDeviceId': device,
      }))
      const store = new TraeCredentialStore(options)
      await login('a', 'fixture-device-a', Date.now() + 3600_000)
      const a = (await store.accounts())[0]!
      expect(a.deviceWarning).toBeUndefined()
      await login('b', 'fixture-device-b', Date.now() + 3600_000)
      const choices = await store.accounts()
      expect(choices).toHaveLength(2)
      expect(JSON.stringify(choices)).not.toContain('fixture-device')
      expect((await store.credentialOf(a.id))?.deviceIdentity?.deviceId).toBe('fixture-device-a')
      // A fresh authorization for the same account replaces both token and
      // device. It must survive switching the IDE back to another account.
      await login('a', 'fixture-device-new', Date.now() + 7200_000)
      await store.accounts()
      await login('b', 'fixture-device-b', Date.now() + 3600_000)
      expect((await new TraeCredentialStore(options).credentialOf(a.id))?.deviceIdentity?.deviceId).toBe('fixture-device-new')
    } finally { await rm(directory, { recursive: true, force: true }) }
  })
  it('sends a failover account token with its own device headers', async () => {
    const fallback = vi.fn(async () => ({ ...identity, deviceId: 'wrong-device' }))
    const fetchImpl = vi.fn(async (_url: unknown, init?: RequestInit) => {
      const headers = new Headers(init?.headers)
      expect(headers.get('x-device-id')).toBe('device-a')
      expect(headers.get('Authorization')).toContain('at-a')
      return new Response('event: done\ndata: {}\n\n', { headers: { 'content-type': 'text/event-stream' } })
    })
    const client = new TraeSoloUpstreamClient({ credential: async () => ({ ...account('a'), deviceIdentity: identity }), identity: fallback, fetchImpl })
    await client.chatStream(JSON.stringify({ model: 'fixture-model', messages: [{ role: 'user', content: 'hello' }] }))
    expect(fetchImpl).toHaveBeenCalledOnce()
    expect(fallback).not.toHaveBeenCalled()
  })
  it('round trips bound identity through account transfer', () => {
    const credential = { ...account('a'), deviceIdentity: identity }
    const record = traeTransferRecordOf(credential, {})
    expect(credentialOfTransferRecord(record)?.deviceIdentity).toEqual(identity)
  })
  it('keeps another registered device eligible after a device-level check-in refusal', async () => {
    const credentials = new Map([
      ['a', { ...account('a'), deviceIdentity: identity }],
      ['b', { ...account('b'), deviceIdentity: { ...identity, deviceId: 'device-b' } }],
      ['c', { ...account('c'), deviceIdentity: identity }],
    ])
    const claim = vi.fn(async (credential: TraeCredential) => credential.userId === 'a'
      ? { claimed: false, code: 9095, message: 'device used' }
      : { claimed: true, code: 0, message: '' })
    const rows = await checkinAllAccounts(['a', 'b', 'c'].map(id => ({ accountId: id, accountName: `demo-${id}` })), {
      credentialFor: async id => credentials.get(id),
      checkinStatusOf: async () => ({ checkedIn: false, didCheckedIn: false, credits: 1, enabled: true }),
      claimCheckinOf: claim,
      chatFor: () => async () => ({ ok: false, kind: 'client', status: 400, message: 'not called' }),
      wait: async () => {},
    })
    expect(rows.map(row => row.status)).toEqual(['device-already', 'claimed', 'device-already'])
    expect(claim.mock.calls.map(([credential]) => credential.userId)).toEqual(['a', 'b'])
  })
  it('pins check-in authorization and device to a single credential read', async () => {
    const read = vi.fn(async () => read.mock.calls.length === 1 ? { ...account('a'), deviceIdentity: identity } : { ...account('b'), deviceIdentity: { ...identity, deviceId: 'device-b' } })
    const fetchImpl = vi.fn(async (_url: unknown, init?: RequestInit) => {
      const headers = new Headers(init?.headers)
      expect(headers.get('x-device-id')).toBe('device-a')
      expect(headers.get('Authorization')).toContain('at-a')
      return new Response(JSON.stringify({ code: 0, checked_in: true }))
    })
    await new TraeUsageClient({ credential: read, fetchImpl }).checkinStatus()
    expect(read).toHaveBeenCalledOnce()
  })
})
