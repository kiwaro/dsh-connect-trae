/**
 * 根据已保存的开关、面板启用状态及显示位置，决定是否渲染 Trae 读数。
 *
 * 优先使用 modelSelection 的 next，再使用 lastUsed。选中的供应商属于本插件时
 * 读取对应面板；选中其他供应商或尚未选择时不显示 Trae 读数。积分总开关关闭时不渲染。
 * 两个显示位置均注册组件，由面板保存的 creditPosition 决定实际渲染位置。
 * 工具栏排序避让由 composer-order.ts 处理。
 */
import { useEffect, useState } from 'react'
import { ComposerPoints, TRAE_COMPOSER_PROVIDERS } from './ComposerPoints.tsx'
import { regionCreditPositionOf, regionEnabledOf, unwrapVolatileDeep } from '../status-paths.ts'
import type { TraeCreditPosition } from '../status-paths.ts'
import type { TraeSettingsKey } from './locales.ts'
import type { TraeUsageCardInjected } from './TraeUsageCard.tsx'

/** The slice of the `modelSelection` projection this decision needs. */
export interface ModelSelectionProjectionLike {
  lastUsed?: { provider?: unknown } | null
  next?: { provider?: unknown } | null
}

/**
 * The provider route the session is currently pointed at.
 *
 * `next` wins over `lastUsed`: a switch that has landed but not yet been sent
 * is still the selection the composer displays.
 */
export function selectedProviderOf(projection: ModelSelectionProjectionLike | undefined): string | undefined {
  const candidate = projection?.next ?? projection?.lastUsed
  const provider = candidate?.provider
  return typeof provider === 'string' && provider !== '' ? provider : undefined
}

/**
 * The settings tree this plugin writes, unwrapped to a plain object.
 *
 * `unwrapVolatileDeep` first: on DSH 0.1.7 the scope's value is a live
 * cosmokit reference, and reading a field off it without unwrapping yields a
 * proxy whose `===` comparison against a string is false — which would make the
 * seat test below reject EVERY seat and silently hide the readout.
 */
function scopeValueOf(scope: TraeUsageCardInjected['settingsScope']): unknown {
  return scope === undefined ? undefined : unwrapVolatileDeep(scope.getSnapshot().value)
}

/**
 * Read the composer-readout switch out of a committed settings snapshot.
 *
 * Absent means OFF, matching the host default (`false`): a scope that has not
 * populated yet, or a host too old to serve the field, must not put a row in
 * the composer toolbar that the user never asked for.
 */
export function composerPointsEnabledOf(scope: TraeUsageCardInjected['settingsScope']): boolean {
  const value = scopeValueOf(scope) as { showPointsInMainUi?: unknown } | undefined
  return value?.showPointsInMainUi === true
}

export interface ComposerPointsGateProps {
  t: (key: TraeSettingsKey, params?: Record<string, unknown>) => string
  /**
   * WHICH seat this registration occupies (learned from workbuddy #62).
   *
   * The component is registered once per seat and renders only in the seat the
   * setting names, so switching seats is a settings write rather than a slot
   * re-registration. Absent means `composer` — the only seat before the setting
   * existed, which keeps every existing caller and test on the old behaviour.
   */
  position?: TraeCreditPosition
  /** Settings scope from the configForms mirror; the card writes the same field. */
  settingsScope?: TraeUsageCardInjected['settingsScope']
  /**
   * Route to this plugin's settings page, for the panel header's control.
   * Absent in tests and on a caller that did not wire it — the panel then draws
   * no settings button at all (see `ComposerPointsProps.onOpenSettings`).
   */
  onOpenSettings?: () => boolean
  /**
   * Standard slot hook: reads one Host-computed projection for this session.
   * Injected by the slot, so it is absent when this gate is rendered directly
   * from a test.
   */
  useProjection?: (key: 'modelSelection') => unknown
}

export function ComposerPointsGate(props: ComposerPointsGateProps) {
  const { t, position, settingsScope, useProjection } = props
  // Re-render when the settings change, so ticking the card's checkbox — or
  // moving the seat — appears without a remount. `settingsScope` is a stable
  // injected reference, so the subscription is set up once per scope.
  const [, setRevision] = useState(0)
  const enabled = composerPointsEnabledOf(settingsScope)
  useEffect(
    () => settingsScope?.subscribe(() => { setRevision(value => value + 1) }),
    [settingsScope],
  )
  // The projection hook is optional so the gate can be rendered in a test
  // without a Host; the fallback is handled by the result, not the call count.
  const projection = useProjection === undefined
    ? undefined
    : useProjection('modelSelection') as ModelSelectionProjectionLike | undefined

  // The switch is off (or the scope has not landed): render NOTHING, so the
  // shared composer row is untouched and no fetch loop starts.
  if (!enabled) return null

  const selected = selectedProviderOf(projection)
  const provider = selected
  const region = provider === undefined ? undefined : TRAE_COMPOSER_PROVIDERS[provider]
  // Only the selected channel owns this readout. A fallback Trae panel would
  // leave two credit entries visible when the user selects WorkBuddy.
  if (region === undefined) return null

  // A region the user switched OFF must render nothing, even though the model
  // projection still names its provider: switching a provider off withdraws its
  // adapter route and its configurable-provider entry from the harness, so its
  // credits are no longer readable and the readout would sit there failing.
  // regionEnabledOf uses the same opt-out rule as the card: only an explicit
  // false disables. Separate snapshots can still differ while updates propagate.
  if (!regionEnabledOf(scopeValueOf(settingsScope), region)) return null

  // `region` is non-undefined here, and it is derived from `provider`, so the
  // provider is present too; the assertion states that rather than widening the
  // component's prop to accept an absent provider it never sees.
  //
  // The SEAT test comes last, and it needs `region`: the setting is per region,
  // so which seat this registration should use is only knowable once ownership
  // is settled. Ordering it after ownership and the switches also means a region
  // whose readout is hidden or switched off renders nothing in EITHER seat,
  // rather than the inactive seat briefly drawing a frame before the switch
  // rejects it.
  if (regionCreditPositionOf(scopeValueOf(settingsScope), region) !== (position ?? 'composer')) return null

  return (
    <ComposerPoints
      t={t}
      provider={provider as string}
      region={region}
      {...settingsScope === undefined ? {} : { settingsScope }}
      {...props.onOpenSettings === undefined ? {} : { onOpenSettings: props.onOpenSettings }}
    />
  )
}
