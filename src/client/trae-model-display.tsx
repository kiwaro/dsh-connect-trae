import type { ReactNode } from 'react'
import type { TraeModelProbeVerdict, TraeWebModel } from '../status-paths.ts'
import { selectTraePromoBadge, type TraePromoKind } from '../promo.ts'
import type { TraeSettingsKey } from './locales.ts'
import type { TraeUsageCardInjected } from './trae-card-types.ts'
import { formatNumber } from './display.ts'

export function formatCapacity(value: number | undefined, unknown: string): string {
  if (value === undefined) return unknown
  if (value >= 1_000_000 && value % 1_000_000 === 0) return `${value / 1_000_000}M`
  if (value >= 1_000 && value % 1_000 === 0) return `${value / 1_000}K`
  return formatNumber(value)
}

/**
 * Human name for one wire channel (issue #52, P0).
 *
 * The group header answers 「why is this list so long」 — because it is the union
 * of several Trae modes — so it must name the mode, not print `solo_work_remote`.
 * An unknown function falls through to its raw name on purpose: a channel this
 * build does not know about is a fact worth showing rather than hiding behind
 * 「其他」, and it is exactly what a bug report should quote.
 */
export function modelChannelLabel(
  channel: string | undefined,
  t: (key: TraeSettingsKey, params?: Record<string, unknown>) => string,
): string {
  if (channel === undefined) return t('row.modelsChannelDefault')
  const known: Record<string, TraeSettingsKey> = {
    solo_work_remote: 'row.modelsChannelWorkRemote',
    solo_work_lite: 'row.modelsChannelWorkLite',
    solo_agent_remote: 'row.modelsChannelAgentRemote',
    chat_v3: 'row.modelsChannelChatV3',
    solo_coder: 'row.modelsChannelCoder',
  }
  const key = known[channel]
  return key === undefined ? channel : t(key)
}

/**
 * The verdict badge for one model, or null when it has not been tested.
 *
 * `unknown` renders as inconclusive, never as a failure: a throttle or a dropped
 * connection says nothing about the model, and painting it the same red as a
 * real refusal is what makes users delete working models.
 */
const PROBE_LABELS: Record<TraeModelProbeVerdict, TraeSettingsKey> = {
  available: 'row.probeAvailable',
  gated: 'row.probeGated',
  unsupported: 'row.probeUnsupported',
  rate_limited: 'row.probeRateLimited',
  auth: 'row.probeAuth',
  unknown: 'row.probeUnknown',
}

export function probeBadge(
  probe: { verdict: TraeModelProbeVerdict; detail: string } | undefined,
  t: (key: TraeSettingsKey) => string,
): ReactNode {
  if (probe === undefined) return null
  return (
    <span className={`dsm-trae-model-probe dsm-trae-model-probe-${probe.verdict}`} title={probe.detail}>
      {t(PROBE_LABELS[probe.verdict])}
    </span>
  )
}

/**
 * How each promotion kind is phrased.
 *
 * The wording is PLUGIN copy, not upstream's: Trae publishes a rule — a pay
 * ratio plus optional cheap-hours windows — and never a label (contrast
 * WorkBuddy's `badge.label`, see docs/PROMO_BADGE.md §3). Two things
 * follow, and both are deliberate:
 *
 *  - only `limited_discount` says 限时 / "limited"; upstream gives no end time
 *    for the other kinds, so claiming one would be inventing urgency;
 *  - the number shown is upstream's own pay ratio (`discount: 50` ⇒ 五折 /
 *    "50% off"), never a re-derived price.
 */
const PROMO_LABELS: Record<TraePromoKind, TraeSettingsKey> = {
  limited: 'row.promoLimited',
  subsidy: 'row.promoSubsidy',
  offPeak: 'row.promoOffPeak',
}

/** Pay ratio as the "折" figure a Chinese price tag uses: 50 → "5", 25 → "2.5". */
function promoZhe(discountPercent: number): string {
  const zhe = Math.round(discountPercent * 10) / 100
  return Number.isInteger(zhe) ? String(zhe) : zhe.toFixed(1)
}

/**
 * The model row's promotion capsule, or nothing.
 *
 * Judged HERE, at paint time, not when the directory was parsed: the rule's
 * windows are wall clocks in an upstream-named zone (00:00–09:00 on weekdays,
 * …), so a verdict frozen into a saved catalog would still be shouting about
 * last night's discount tomorrow afternoon. The card re-renders on its poll, so
 * the capsule appears and disappears with the window.
 *
 * One capsule at most, and it sits BESIDE the name rather than inside it: the
 * name is ellipsis-truncated, so a badge placed inside would be clipped away
 * exactly on the long model names.
 */
export function promoBadge(
  model: TraeWebModel,
  t: TraeUsageCardInjected['t'],
  now: Date,
): ReactNode {
  const badge = selectTraePromoBadge(model.activityDiscount, now)
  if (badge === undefined) return null
  const zhe = promoZhe(badge.discountPercent)
  // Upstream's own figures go into the hover only; the capsule stays short so a
  // 24-model list does not turn into a wall of numbers.
  const hints: string[] = []
  if (badge.beforeRate !== undefined && badge.rate !== undefined) {
    hints.push(t('row.promoHintRate', { before: String(badge.beforeRate), rate: String(badge.rate) }))
  }
  if (badge.fromClock !== undefined && badge.untilClock !== undefined && badge.timeZone !== undefined) {
    hints.push(t('row.promoHintWindow', { from: badge.fromClock, until: badge.untilClock, zone: badge.timeZone }))
  }
  if (badge.memberDiscountPercent !== undefined && badge.memberRate !== undefined) {
    // 会员倍率低于当前倍率时才显示，说明适用条件，避免误认为当前账号已享受。
    hints.push(t('row.promoHintMember', {
      rate: String(badge.memberRate),
      zhe: promoZhe(badge.memberDiscountPercent),
      percent: String(100 - badge.memberDiscountPercent),
    }))
  }
  return (
    <span
      className={`dsm-trae-model-promo dsm-trae-model-promo-${badge.kind}`}
      title={hints.length === 0 ? t(PROMO_LABELS[badge.kind], { zhe, percent: String(badge.percentOff) }) : hints.join(' · ')}
    >
      {t(PROMO_LABELS[badge.kind], { zhe, percent: String(badge.percentOff) })}
    </span>
  )
}
