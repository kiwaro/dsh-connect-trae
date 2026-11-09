import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import { MemberRow } from '../src/client/account-pool-view.tsx'
import { zh } from '../src/client/locales.ts'
import type { TraeWebPoolAccount } from '../src/status-paths.ts'
import { TRAE_CARD_CSS } from '../src/client/styles.ts'

function row(account: TraeWebPoolAccount, deviceClaimed = false): string {
  return renderToStaticMarkup(<MemberRow account={account} checked models={[]} rows={{}} disabled={false}
    deleting={false} canDelete={false} showCheckin deviceClaimed={deviceClaimed} poolEnabled poolModelId=""
    onDelete={() => {}} onToggle={() => {}} onTest={() => {}} formatNumber={String} relativeAt={() => ''}
    t={(key, params) => Object.entries(params ?? {}).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), zh[key])} />)
}

describe('device diagnosis in account rows', () => {
  const account: TraeWebPoolAccount = { accountId: 'fixture-a', accountName: 'demo-a', current: false, member: true }
  it('renders a shared-device warning with peer names and no extra grid cell', () => {
    const html = row({ ...account, deviceWarning: { state: 'shared', peers: ['demo-b'] } })
    expect(html).toContain('与 demo-b 共用设备身份')
    expect(html).toContain('不保证解除风控')
    expect(html).not.toContain('grid-column')
  })
  it('does not mark a bound account as device-limited because another device was refused', () => {
    const html = row({ ...account, deviceBound: true, checkedInToday: false, deviceCheckedIn: false }, true)
    expect(html).not.toContain('dsm-trae-pool-checkin-device')
  })
  it('lets test time and device warning occupy separate account grid rows', () => {
    const html = row({ ...account, probe: { outcome: 'ok', atMs: 1_700_000_000_000, source: 'test-batch' }, deviceWarning: { state: 'unbound', peers: [] } })
    expect(html.match(/class="dsm-trae-pool-account-note"/g)).toHaveLength(2)
    const noteRule = TRAE_CARD_CSS.match(/\.dsm-trae-pool-account-note\{([^}]+)\}/)?.[1]
    expect(noteRule).toContain('grid-column:2')
    expect(noteRule).toContain('grid-row:auto')
  })
})
