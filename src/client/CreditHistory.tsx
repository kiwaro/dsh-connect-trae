import { useEffect, useState } from 'react'
import { TRAE_CREDIT_HISTORY_PATH } from '../status-paths.ts'
import type { TraeUsageCardInjected } from './trae-card-types.ts'
import type { readCreditHistory } from '../credit-journal.ts'
type History = Awaited<ReturnType<typeof readCreditHistory>>
/** Read only account evidence. Never add these figures to a conversation's cost. */
export function CreditHistory({ accountId, t }: { accountId: string; t: TraeUsageCardInjected['t'] }) {
  const [open,setOpen] = useState(false)
  const [history,setHistory] = useState<History>()
  const [error,setError] = useState(false)
  const [refresh,setRefresh] = useState(0)
  useEffect(()=>{
    if (!open) return
    const controller = new AbortController()
    setHistory(undefined); setError(false)
    void fetch(TRAE_CREDIT_HISTORY_PATH+'?region=cn&accountId='+encodeURIComponent(accountId),{ credentials: 'same-origin', cache: 'no-store', signal: controller.signal })
      .then(async response=>{
        if (!response.ok) throw new Error('history unavailable')
        const value = await response.json() as History
        if (value.source !== 'account-snapshot-diff' || !Array.isArray(value.events)) throw new Error('invalid history')
        if (!controller.signal.aborted) setHistory(value)
      }).catch(()=>{ if (!controller.signal.aborted) setError(true) })
    return ()=>controller.abort()
  },[accountId,open,refresh])
  const labels = { baseline:'row.creditBaseline',earn:'row.creditEarn',spend:'row.creditSpend',expire:'row.creditExpire',adjustment:'row.creditAdjustment' } as const
  return <details className="dsm-trae-credit-history" onToggle={event=>setOpen(event.currentTarget.open)}>
    <summary>{t('row.creditHistory')}</summary>
    {open ? <>
      <p>{t('row.creditHistoryHint')}</p>
      <button type="button" onClick={()=>setRefresh(n=>n+1)}>{t('row.creditHistoryReload')}</button>
      {error ? <p role="alert">{t('row.creditHistoryError')}</p> : history === undefined ? <p role="status">{t('row.creditHistoryLoading')}</p> : <>
        {history.events.length === 0 ? <p>{t('row.creditHistoryEmpty')}</p> : <table>
          <thead><tr><th>{t('row.creditHistoryTime')}</th><th>{t('row.creditHistoryKind')}</th><th>{t('row.creditHistoryAmount')}</th></tr></thead>
          <tbody>{history.events.slice(-20).reverse().map((event,index)=><tr key={index}>
            <td>{new Date(event.at).toLocaleString()}</td><td>{t(labels[event.kind])}</td><td>{event.amount > 0 ? '+' : ''}{event.amount.toFixed(4)}</td>
          </tr>)}</tbody>
        </table>}
        {history.dropped > 0 ? <p>{t('row.creditHistoryRetained')}</p> : null}
      </>}
    </> : null}
  </details>
}
