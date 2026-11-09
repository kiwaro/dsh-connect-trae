// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CreditHistory } from '../src/client/CreditHistory.tsx'
import { zh } from '../src/client/locales.ts'
afterEach(()=>{cleanup();vi.unstubAllGlobals()})
it('shows account-level evidence and refetches when switching accounts',async()=>{
 const urls:string[]=[]
 vi.stubGlobal('fetch',vi.fn(async(url:string)=>{
  urls.push(url)
  return new Response(JSON.stringify({source:'account-snapshot-diff',scope:'account',events:[{kind:'spend',amount:-1.5,at:1000}],dropped:0}))
 }))
 const component=render(<CreditHistory accountId="demo-first" t={key=>zh[key]} />)
 const details=screen.getByText('积分包流水').closest('details')!
 details.open=true;fireEvent(details,new Event('toggle'))
 await screen.findByText('-1.5000')
 expect(screen.getByText(/不能归入单条请求或会话/)).toBeTruthy()
 component.rerender(<CreditHistory accountId="demo-second" t={key=>zh[key]} />)
 await waitFor(()=>expect(urls.at(-1)).toContain('accountId=demo-second'))
})
