/** Account-level snapshot differences, never per-response billing.
 * Inspired by wild-work's pack snapshot ledger; independently implemented.
 * Unknown removal/adjustment stays unclassified rather than inventing spend.
 */
import { createHash } from 'node:crypto'
import { mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { withFileLock, writeFileAtomic } from '@deepseek-ai/dsh-atomic-write'
import type { TraeUsagePack, TraeUsageSnapshot } from './usage.ts'
const round = (n: number): number => Math.round(n * 1e6) / 1e6
const hash = (value: string): string => createHash('sha256').update(value).digest('hex')
export const creditAccountKey = (userId: string, tenantId = ''): string => JSON.stringify(['cn', userId, tenantId])
interface PackState { limit: number; used: number; remain: number; expires: number; missing?: boolean }
export interface CreditEvent { kind: 'baseline' | 'earn' | 'spend' | 'expire' | 'adjustment'; amount: number; pack?: string; at: number }
interface CreditState { at: number; balance: number; packs: Record<string, PackState>; events: CreditEvent[]; dropped: number }
interface Journal { version: 1; accounts: Record<string, CreditState> }

export function diffCreditPacks(previous: Record<string, PackState> | undefined, packs: readonly TraeUsagePack[], at: number): { packs: Record<string, PackState>; events: CreditEvent[]; balance: number } {
  const current: Record<string, PackState> = {}
  for (const pack of packs) {
    // Only the verified general-credit pool can fund these chat requests.
    if (pack.currency === 0 && pack.creditsLimit === undefined) continue // Free subscription has no credit balance.
    if (pack.availableEndpoint === undefined) throw new Error('EINCOMPLETE')
    if (pack.availableEndpoint !== 0) continue
    const { creditsLimit: limit, consumedCredits: used } = pack
    if (!Number.isFinite(limit) || !Number.isFinite(used) || limit! < 0 || used! < 0 || used! > limit!) throw new Error('EINCOMPLETE')
    if (!Number.isFinite(pack.endTimeMs) || pack.endTimeMs < 0) throw new Error('EINCOMPLETE')
    const key = hash(JSON.stringify([pack.entitlementId || pack.displayDesc, pack.endTimeMs, pack.currency, pack.availableEndpoint]))
    const row = current[key] ??= { limit: 0, used: 0, remain: 0, expires: pack.endTimeMs }
    row.limit = round(row.limit + limit!); row.used = round(row.used + used!)
    row.remain = row.expires > 0 && row.expires <= at ? 0 : round(row.limit - row.used)
  }
  const balance = round(Object.values(current).reduce((sum,p)=>sum+p.remain,0))
  const events: CreditEvent[] = []
  const emit = (kind: CreditEvent['kind'], amount: number, pack?: string): void => {
    if (round(amount) !== 0) events.push({ kind, amount: round(amount), at, ...pack === undefined ? {} : { pack } })
  }
  if (previous === undefined) {
    emit('baseline',balance)
    return { packs: current, events, balance }
  }
  for (const [key,cur] of Object.entries(current)) {
    const old = previous[key]
    if (old === undefined) { emit('earn',cur.remain,key); continue }
    if (old.missing) { emit('adjustment',cur.remain,key); continue }
    if (cur.expires > 0 && cur.expires <= at) { emit('expire',-old.remain,key); continue }
    // Only monotone cumulative counters can independently establish grant and
    // spend changes. Counter resets and pool reductions are adjustments.
    const granted = round(cur.limit-old.limit), spent = round(cur.used-old.used)
    if (granted >= 0 && spent >= 0) { emit('earn',granted,key); emit('spend',-spent,key) }
    else emit('adjustment',cur.remain-old.remain,key)
  }
  for (const [key,old] of Object.entries(previous)) {
    if (current[key] !== undefined) continue
    emit(old.expires > 0 && old.expires <= at ? 'expire' : 'adjustment',-old.remain,key)
    // Tombstone lets a temporarily absent pack return without becoming a grant.
    current[key] = { ...old, remain: 0, missing: true }
  }
  return { packs: current, events, balance }
}

async function load(file: string): Promise<Journal> {
  try {
    const state = JSON.parse(await readFile(file,'utf8')) as Journal
    if (state.version !== 1 || !state.accounts || typeof state.accounts !== 'object' || Array.isArray(state.accounts)) throw new Error('EFORMAT')
    return state
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { version: 1, accounts: {} }
    throw error // A damaged baseline must not silently become a new grant.
  }
}
export async function recordCreditSnapshot(directory: string, account: string, snapshot: TraeUsageSnapshot, at: number): Promise<void> {
  if (!snapshot.isCreditsBilling || snapshot.isDollarUsageBilling || !Number.isFinite(at)) return
  await mkdir(directory,{ recursive: true, mode: 0o700 })
  const file = join(directory,'credit-journal.json')
  await withFileLock(file,async()=>{
    const journal = await load(file), key = hash(account), previous = journal.accounts[key]
    if (previous && at <= previous.at) return
    const next = diffCreditPacks(previous?.packs,snapshot.packs,at)
    const events = [...previous?.events ?? [],...next.events]
    const removed = Math.max(0,events.length-2000)
    journal.accounts[key] = { ...next, at, events: events.slice(-2000), dropped: (previous?.dropped ?? 0)+removed }
    await writeFileAtomic(file,JSON.stringify(journal)+'\n',{ mode: 0o600, dirMode: 0o700 })
  })
}
export async function readCreditHistory(directory: string, account: string): Promise<{ source: 'account-snapshot-diff'; scope: 'account'; balance: number | null; at: number | null; events: CreditEvent[]; dropped: number }> {
  const state = (await load(join(directory,'credit-journal.json'))).accounts[hash(account)]
  return { source: 'account-snapshot-diff', scope: 'account', balance: state?.balance ?? null, at: state?.at ?? null, events: state?.events ?? [], dropped: state?.dropped ?? 0 }
}
