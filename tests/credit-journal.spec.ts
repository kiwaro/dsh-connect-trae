import { describe, expect, it } from 'vitest'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { diffCreditPacks, recordCreditSnapshot, readCreditHistory } from '../src/credit-journal.ts'
import type { TraeUsagePack, TraeUsageSnapshot } from '../src/usage.ts'
const pack = (limit: number, used: number, extra: Partial<TraeUsagePack> = {}): TraeUsagePack => ({ displayDesc: 'demo-pack', entitlementId: 'demo-pack-id', endTimeMs: 10000, currency: 1, availableEndpoint: 0, creditsLimit: limit, consumedCredits: used, ...extra })
const snap = (packs: TraeUsagePack[]): TraeUsageSnapshot => ({ isCreditsBilling: true, isDollarUsageBilling: false, isPayFreshman: false, inTrial: false, trialEndTimeMs: 0, summary: { totalAmount: 100, consumedAmount: 0, consumptionRatio: 0 }, packs })
describe('account credit snapshot journal', () => {
 it('separates baseline, simultaneous grants and spend, expiry and unconfirmed disappearance', () => {
  const first = diffCreditPacks(undefined, [pack(100,10)], 100)
  expect(first.events.map(e=>[e.kind,e.amount])).toEqual([['baseline',90]])
  const same = diffCreditPacks(first.packs,[pack(120,30)],200)
  expect(same.events.map(e=>[e.kind,e.amount])).toEqual([['earn',20],['spend',-20]])
  expect(same.balance).toBe(90)
  const missing=diffCreditPacks(same.packs,[],300)
  expect(missing.events.map(e=>e.kind)).toEqual(['adjustment'])
  expect(diffCreditPacks(missing.packs,[pack(120,30)],400).events.map(e=>e.kind)).toEqual(['adjustment'])
  const expired=diffCreditPacks(same.packs,[],10001)
  expect(expired.events.map(e=>[e.kind,e.amount])).toEqual([['expire',-90]])
  expect(diffCreditPacks(same.packs,[pack(120,30)],10001).events.map(e=>[e.kind,e.amount])).toEqual([['expire',-90]])
 })
 it('aggregates duplicate pack identities, isolates endpoints and rejects incomplete counters',()=>{
  const first=diffCreditPacks(undefined,[pack(100,10),pack(20,5),pack(90,1,{availableEndpoint:1})],100)
  expect(first.balance).toBe(105)
  const next=diffCreditPacks(first.packs,[pack(120,15)],200)
  expect(next.balance).toBe(105);expect(next.events).toEqual([])
  expect(()=>diffCreditPacks(first.packs,[(({consumedCredits: _used, ...rest})=>rest)(pack(100,10))],300)).toThrow()
  expect(()=>diffCreditPacks(first.packs,[pack(100,10,{creditsLimit:NaN})],300)).toThrow()
 })
 it('persists idempotently across restart, ignores stale reads, and isolates accounts without response IDs',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'trae-credit-test-'))
  await recordCreditSnapshot(dir,'demo-a',snap([pack(100,10)]),100)
  await recordCreditSnapshot(dir,'demo-a',snap([pack(100,20)]),200)
  await recordCreditSnapshot(dir,'demo-a',snap([pack(100,20)]),200)
  await recordCreditSnapshot(dir,'demo-a',snap([pack(100,5)]),150)
  await recordCreditSnapshot(dir,'demo-b',snap([pack(80,0)]),300)
  const history=await readCreditHistory(dir,'demo-a')
  expect(history.balance).toBe(80);expect(history.events.map(e=>e.kind)).toEqual(['baseline','spend'])
  expect((await readCreditHistory(dir,'demo-b')).balance).toBe(80)
  const raw=await readFile(join(dir,'credit-journal.json'),'utf8')
  expect(raw).not.toContain('demo-a');expect(raw).not.toContain('demo-pack-id');expect(raw).not.toContain('responseId')
 })
})
