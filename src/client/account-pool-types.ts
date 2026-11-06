import type { TraeSettingsKey } from './locales.ts'
export type T = (key: TraeSettingsKey, params?: Record<string, unknown> | undefined) => string

/** Facts the pool document does not carry, joined from the card's roster by id. */
export interface TraePoolRowDetail {
  /** edition · credential source, already worded by the card. */
  meta?: string
  /** Token-expiry countdown, already worded, and only when it matters. */
  warn?: string
  /** `soon` = renewal ends shortly, `lapsed` = it already did. */
  warnTone?: 'soon' | 'lapsed' | undefined
}

/** The daily check-in control for one row, pre-derived by the card. */
export interface TraePoolRowClaim {
  label: string
  disabled: boolean
  title?: string
  busy: boolean
  /**
   * Whether the click can still do anything. False once the account is paid or
   * this machine spent the day's claim: the row then shows the state alone,
   * without a greyed button repeating it.
   */
  claimable?: boolean
}

export interface LogEntry {
  id: number
  tone: 'ok' | 'info' | 'warn' | 'error'
  text: string
}
