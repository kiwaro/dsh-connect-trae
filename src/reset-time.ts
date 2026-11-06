/**
 * 从上游错误信息中读取带有明确 UTC 偏移的额度恢复时间。
 *
 * 解析规则参考 dsh-connect-workbuddy/src/probe.ts。已有 Trae 记录中的
 * 4011 错误只要求稍后重试，4008 错误只说明额度不足；两者均未提供恢复时间，
 * 见 docs/ISSUE33_DIAGNOSIS.md，因此这些样本应返回 undefined。
 *
 * 以后若响应明确提供时间，按响应中的时区解析。响应未提供时间时，调用方
 * 可以使用本地冷却策略，但不能把本地等待时间显示为上游承诺的恢复时间。
 * 积分包的 endTimeMs 表示余额到期，不能作为额度恢复时间。
 *
 * @module dsh-connect-trae/reset-time
 */

/**
 * The timestamp shape both spellings share: `YYYY-MM-DD HH:MM:SS` followed by an
 * EXPLICIT UTC offset.
 *
 * The offset is required, not optional. `2026-09-30 02:30:30` with no zone is a
 * moment the plugin would have to guess at, and `Date.parse` guesses LOCAL time —
 * right on a UTC+8 machine by accident, silently wrong everywhere else. A message
 * that names a time without a zone therefore yields no time, which is the honest
 * answer.
 */
const RESET_STAMP = '(\\d{4})-(\\d{2})-(\\d{2})\\s+(\\d{2}):(\\d{2}):(\\d{2})\\s*UTC\\s*([+-])(\\d{1,2})(?::?(\\d{2}))?'

/** Chinese spelling: the marker sits AFTER the timestamp (将在 … 重置). */
const UPSTREAM_RESET_PATTERN_ZH = new RegExp(`将在?\\s*${RESET_STAMP}[\\s\\S]*?重置`, 'u')

/**
 * English spelling: the marker sits BEFORE the timestamp (`reset at` /
 * `refresh on`). It needs its own pattern because the two languages put the
 * keyword on different sides of the time, so loosening the surrounding prose
 * alone cannot cover both.
 */
const UPSTREAM_RESET_PATTERN_EN
  = new RegExp(`(?:reset|resets|refresh|refreshes|renew|renews)\\s+(?:at|on)\\s+${RESET_STAMP}`, 'iu')

/**
 * Parse the reset time out of an upstream failure message.
 *
 * Returns epoch ms, or undefined when the message names no parsable time — the
 * caller must then say "the upstream gave no time", never invent one.
 *
 * THE OFFSET IS HONOURED, NOT ASSUMED. `2026-09-30 02:30:30 UTC+8` is 18:30:30 UTC
 * the previous day, so the components are assembled with `Date.UTC` and the stated
 * offset subtracted — correct on every host regardless of its own zone.
 *
 * A whole-second resolution is what the upstream prints; sub-second precision would
 * be fiction in the other direction.
 */
export function parseUpstreamResetAt(message: string): number | undefined {
  const match = UPSTREAM_RESET_PATTERN_ZH.exec(message)
    ?? UPSTREAM_RESET_PATTERN_EN.exec(message)
  if (match === null) return undefined
  const [, year, month, day, hour, minute, second, sign, offsetHours, offsetMinutes] = match
  const offsetTotalMinutes
    = (sign === '-' ? -1 : 1) * (Number(offsetHours) * 60 + Number(offsetMinutes ?? '0'))
  const utcMs = Date.UTC(
    Number(year), Number(month) - 1, Number(day),
    Number(hour), Number(minute), Number(second),
  )
  // `Date.UTC` normalizes overflow (month 13, day 32) instead of failing, so a
  // nonsense timestamp would silently become a real-but-wrong moment. Reject it.
  const parsed = new Date(utcMs)
  if (parsed.getUTCFullYear() !== Number(year)
    || parsed.getUTCMonth() !== Number(month) - 1
    || parsed.getUTCDate() !== Number(day)
    || parsed.getUTCHours() !== Number(hour)
    || parsed.getUTCMinutes() !== Number(minute)
    || parsed.getUTCSeconds() !== Number(second)) {
    return undefined
  }
  if (Math.abs(offsetTotalMinutes) > 14 * 60) return undefined
  return utcMs - offsetTotalMinutes * 60_000
}
