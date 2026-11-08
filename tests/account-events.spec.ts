import { describe, expect, it } from 'vitest'
import { safeAccountMessage, TraeAccountEvents } from '../src/account-events.ts'

describe('local account diagnostics', () => {
  it.each([
    'access_token=private-fixture',
    'refreshToken=private-fixture',
    'Authorization: Bearer private-fixture',
    'Bearer private-fixture',
    'cookie: sid=private-fixture; other=private-fixture',
    '{"access_token":"private-fixture"}',
  ])('redacts credential formats in %s', value => {
    expect(safeAccountMessage(value)).not.toContain('private-fixture')
    expect(safeAccountMessage(value)).toContain('[redacted]')
  })

  it('bounds history and isolates panel activity without exposing mutable state', () => {
    const events = new TraeAccountEvents()
    for (let i = 0; i < 35; i++) events.add('cn', { tone: 'error', text: `refusal ${i}` })
    events.add('ai', { tone: 'ok', text: 'switched' })
    expect(events.read('cn')).toHaveLength(30)
    expect(events.read('cn')[0]?.text).toBe('refusal 5')
    expect(events.read('enterprise')).toEqual([])
    expect(events.read('ai')).toHaveLength(1)
    events.read('cn')[0]!.text = 'mutated'
    expect(events.read('cn')[0]?.text).toBe('refusal 5')
  })
})
