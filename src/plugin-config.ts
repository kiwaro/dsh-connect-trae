/** Configuration schema and panel readers; independent of plugin startup. */
import { TRAE_REFRESH_INTERVAL_MINUTES, TRAE_REFRESH_INTERVAL_DEFAULT_MINUTES, type TraeRefreshIntervalMinutes } from './status-paths.ts'
import z from '@deepseek-ai/schemastery'
import type { TraeModelInfo } from './catalog.ts'
import type { TraeActivityDiscount } from './promo.ts'
import type { TraePanel, TraeRegion } from './region.ts'
import { unwrapVolatile, type TraeCreditPosition, type TraePoolPreferences } from './status-paths.ts'

/**
 * Settings namespace, as a plain lowercase literal. DSH 0.1.2 removed the
 * `settingsNamespace` brand constructor from the npm package, and every
 * consumer of this constant takes it as a kebab string — so no branding is
 * needed. It is the FALLBACK namespace; the namespace the host actually serves
 * comes from {@link settingsNamespaceOf} (0.1.7 keys settings by the Loader
 * entry id, which a profile patch may mount as `dsh-connect-trae` or
 * `include:dsh-connect-trae`).
 */
export const TRAE_SETTINGS_NS = 'trae'

/**
 * The namespace the HOST actually serves this plugin under.
 *
 * On DSH 0.1.7 `SettingsForms.describe()` keys every namespace by the Loader
 * entry id, and the harness looks a provider's namespace up by EXACT match —
 * advertising `trae` while the host serves `include:dsh-connect-trae` made the
 * provider read as "not configured": its configure affordance and model
 * discovery both silently went dead.
 *
 * `ctx.fiber.entry` is added by the Loader, not by Cordis itself, so it is not
 * in Cordis's public types and is absent on hosts that mount a plugin without a
 * Loader entry (a test harness, or `ctx.plugin()` called directly). Hence the
 * probe plus the documented fallback, mirroring the first-party plugins:
 * `const settingsNs = ctx.fiber.entry?.options.id ?? NS`.
 */
export function settingsNamespaceOf(ctx: unknown): string {
  const id = (ctx as { fiber?: { entry?: { options?: { id?: unknown } } } })?.fiber?.entry?.options?.id
  return typeof id === 'string' && id !== '' ? id : TRAE_SETTINGS_NS
}

/** One region's saved model state: its own directory and the user's selection within it. */
export interface TraeRegionState {
  /**
   * Whether this region's provider is switched on. Opt-out: only an explicit
   * `false` disables it, so a config predating this switch keeps both providers
   * running. A disabled region is fully withdrawn from the harness — its
   * adapter route and its configurable-provider entry both hold zero routes, so
   * it disappears from DSH's model picker instead of lingering as an
   * unselectable row (see `syncRegionRegistration`).
   */
  enabled?: boolean
  /** The last-refreshed raw directory for this region; what the card displays. */
  lastCatalog?: TraeModelInfo[]
  /** The user's selection in this region, as model ids (= Trae name). */
  enabledModelIds?: string[]
  /** Models the user explicitly enabled for image input in this region. */
  imageModelIds?: string[]
  /**
   * Whether the model may call trae_draw_image for this panel. Opt-IN:
   * image generation spends real credits, so an absent value is never consent
   * (the same rule workbuddy's imageToolEnabled follows). Declared in the
   * schema below — a field missing from the schema is dropped on every save.
   */
  drawImageEnabled?: boolean
  /** Local DSH context budget per model in this region. */
  contextBudgets?: Record<string, number>
  /**
   * The user's own thinking-level choice per model, for this panel (model id ->
   * DSH level).
   *
   * OPT-IN by nature: a missing key means "use whatever this model's own
   * default is" (`reasoning.defaultEffort`, which Trae's directory publishes),
   * i.e. the behaviour the plugin had before this field existed. Choosing a
   * level here overrides that for good, and it is what the kernel materialises
   * into every request that names no level — see `src/default-effort.ts`.
   *
   * A key can go STALE: a directory refresh may withdraw a tier, and a level the
   * model no longer offers is then ignored rather than sent (sending it would be
   * rejected with `UNSUPPORTED_REASONING_EFFORT`).
   */
  thinkingEfforts?: Record<string, string>
  /**
   * Saved placement of this panel's credit readout.
   * `composer` uses conversation.input.right. Trae and WorkBuddy reserve distinct
   * temporary order values there; the later registrant moves to the left.
   * `stats` uses conversation.composer.dock below the input card.
   * Each panel retains its own placement setting.
   */
  creditPosition?: TraeCreditPosition
  /**
   * This region's account pool (issue #44), as the card saves it.
   *
   * Read through {@link regionStateOf} and written by the card's pool section.
   * `enabled` absent means OFF: an account pool decides where money is spent, so
   * it is opt-in and a config written before it existed must keep billing the
   * account the user picked.
   */
  pool?: TraePoolPreferences
}

export interface Config {
  authFile?: string
  edition?: 'auto' | 'cn' | 'sg' | 'solo' | 'solo-sg'
  /**
   * @deprecated Legacy single-slot account selector from before the dual
   * provider split. It is attributed to whichever region the account actually
   * belongs to (resolved once at startup from the local account scan); new
   * writes go to {@link Config.accounts}.
   */
  accountId?: string
  /**
   * Per-panel account selections, keyed cn, enterprise or ai. Each panel writes
   * its own slot; tokens remain outside settings.
   */
  accounts?: Partial<Record<TraePanel, string>>
  /**
   * Enable the composer credit readout. The current title and provider label
   * are defined by the client locale. Clicking opens the account/balance panel;
   * visibility also follows ComposerPointsGate.
   *
   * This field first gated the sidebar credit line (issue #26, contributed by
   * JiewiW); when that line was removed in 2.13.0 the composer readout replaced
   * it and rendered unconditionally; 2.13.3 restores the switch, because the
   * user went looking for it and a readout inside the SHARED composer row
   * deserves the same opt-in the sidebar line had. The field is REUSED so an
   * existing `true` keeps the readout on across the upgrade.
   *
   * OFF by default. The card writes this field; configuration can also change
   * outside the card. Declared volatile alongside accounts/regions so the
   * settings form can both read and write it.
   */
  showPointsInMainUi?: boolean
  /**
   * Show this plugin's own row in the DSH sidebar (`sidebar.panellist`), which
   * opens the usage card as a full `main` page.
   *
   * OFF by default, for exactly the reason the sibling
   * `dsh-connect-workbuddy` row is off by default (its PR #188 /
   * `Config.sidebarPanel`): the sidebar's global rows are the host's own pages,
   * the row claims a seat every installed bundle shares, and the Plugins page
   * already reaches this same card. A row nobody asked for re-arranges a
   * surface the plugin does not own.
   *
   * The card writes this field through panel-switch.ts. The status document
   * supplies sidebarPanelEnabled to initialize the browser registration.
   */
  sidebarPanel?: boolean
  /** 卡片与输入框共享的自动刷新间隔（分钟），默认 5。 */
  refreshIntervalMinutes?: TraeRefreshIntervalMinutes
  /**
   * Per-panel model state, keyed cn, enterprise or ai. The CN and international apps
   * expose different rosters, so each keeps its own directory and selection
   * and switching accounts never drops the other region's picks.
   */
  regions?: Partial<Record<TraePanel, TraeRegionState>>
  /**
   * @deprecated Legacy single-slot fields from before the region split. They
   * predate international support and are read as the CN region's state when
   * `regions.cn` is absent; new writes go to `regions`.
   */
  lastCatalog?: TraeModelInfo[]
  /** @deprecated See {@link Config.lastCatalog}. */
  enabledModelIds?: string[]
  /** @deprecated See {@link Config.lastCatalog}. */
  contextBudgets?: Record<string, number>
  /** @deprecated See {@link Config.lastCatalog}. */
  imageModelIds?: string[]
  /** @deprecated Legacy generated runtime catalog; kept for backwards compatibility. */
  models?: TraeModelInfo[]
}

/**
 * One panel's saved state. A config written before the region split has only
 * the flat fields: those were always captured from the CN endpoint (the
 * plugin had no international support), so they are read as the CN state and
 * only when no explicit CN slot exists. The ai region never inherits them —
 * that inheritance is exactly the bug where a stale CN directory would be
 * intersected with the international catalog and silently drop the user's
 * picks (the same failure workbuddy fixed with its region split).
 *
 * Keyed by PANEL (`cn` | `enterprise` | `ai`), because each panel carries its
 * own switch, account binding and model selection. `enterprise` has no legacy
 * equivalent: it starts from an EMPTY state (its own directory, its own model
 * picks) and never inherits CN's, so switching it on cannot silently activate
 * a model list the user never chose for the tenant pool.
 */
export function regionStateOf(config: Config, panel: TraePanel): TraeRegionState {
  // Unwrap first: on DSH 0.1.7 a volatile-marked field arrives as a `{get(): T}`
  // live reference, so `config.regions?.[region]` would read `undefined` and
  // every region would silently fall back to its defaults ("settings written
  // but not read back").
  const regions = unwrapVolatile(config.regions)
  const stored = unwrapVolatile(regions?.[panel])
  if (stored !== undefined) return stored
  if (panel !== 'cn') return {}
  return {
    ...config.lastCatalog === undefined ? {} : { lastCatalog: config.lastCatalog },
    ...config.enabledModelIds === undefined ? {} : { enabledModelIds: config.enabledModelIds },
    ...config.imageModelIds === undefined ? {} : { imageModelIds: config.imageModelIds },
    ...config.contextBudgets === undefined ? {} : { contextBudgets: config.contextBudgets },
  }
}

/**
 * Whether one panel's provider is switched on (issue #11). Opt-out semantics:
 * only an explicit `false` disables it, so every config written before this
 * switch existed — including the pre-region-split flat fields, which never
 * carry `enabled` — keeps both providers running exactly as before. The card
 * reads the same rule through `regionEnabledOf`, so the two halves can never
 * disagree about a region's state.
 *
 * The ENTERPRISE panel is the one deliberate exception: it defaults OFF. A
 * consumer-only account (`tenant 7o2d894p7dr0o4`) cannot use that pool at all,
 * so opting every existing user into a second CN provider would put a route in
 * their model picker that fails on first use. It is switched on from its card
 * tab, by someone whose account actually belongs to a tenant.
 */
export function regionEnabled(config: Config, panel: TraePanel): boolean {
  const stored = regionStateOf(config, panel).enabled
  if (stored !== undefined) return stored !== false
  return panel !== 'enterprise'
}

/**
 * WHERE one region's credit readout sits (learned from workbuddy #62).
 *
 * A local reader rather than a bare schema default, so a config written before
 * the setting existed reads as `composer` — the seat that was the only one, so
 * an upgrade moves nothing on screen — and so a hand-edited value the schema
 * does not know falls back to a seat that renders rather than to nowhere.
 *
 * Shared with the browser half by construction: the card renders the Host's
 * answer for this field, so the control cannot disagree with the readout.
 */
export function creditPosition(config: Config, region: TraeRegion): TraeCreditPosition {
  return regionStateOf(config, region).creditPosition === 'stats' ? 'stats' : 'composer'
}

/**
 * The user's thinking-level choices for one panel (model id -> DSH level).
 *
 * Read through `regionStateOf` so the region split, the legacy CN fallback and
 * the volatile unwrap all apply exactly once, in one place. Values are filtered
 * to non-empty strings: an empty string is not a level, and passing one on would
 * make the model report a default the kernel cannot name.
 *
 * A saved level is NOT validated against the model's current tier list here —
 * that belongs where the tiers are known (`default-effort.ts`
 * `defaultEffortFor`), which is also where a withdrawn tier is dropped instead
 * of being sent.
 */
export function thinkingEffortsOf(config: Config, region: TraePanel): Record<string, string> {
  const raw = regionStateOf(config, region).thinkingEfforts
  if (raw === undefined || raw === null || typeof raw !== 'object') return {}
  const out: Record<string, string> = {}
  for (const [id, level] of Object.entries(raw)) {
    if (typeof level === 'string' && level !== '') out[id] = level
  }
  return out
}

/**
 * Whether the OPTIONAL sidebar row is switched on (`Config.sidebarPanel`).
 *
 * `=== true` on purpose, exactly like the sibling workbuddy reader: the row
 * claims a GLOBAL sidebar seat every installed bundle shares, so an absent,
 * unreadable or hand-edited value must read as "the user did not ask for this",
 * never as consent. Only an explicit boolean `true` turns the row on.
 *
 * Read through `unwrapVolatile` because the field is volatile on 0.1.7: the
 * live `{get(): T}` reference would otherwise be a truthy non-boolean and every
 * config would look switched on.
 */
export function sidebarPanelEnabled(config: Config): boolean {
  return unwrapVolatile(config.sidebarPanel) === true
}

/**
 * Mark a schema's field as volatile.
 *
 * `volatile()` exists from schemastery 3.18.3; since 2.3.0 the peer range
 * requires `>=3.18.4`, so it is always present on a supported host. The probe
 * is kept as a safety net for a consumer that resolves an older schemastery
 * anyway (where the helper must degrade to identity — hand-writing
 * `meta.volatile = true` would bypass schemastery's own `validateVolatileSchema`
 * checks) and to keep both arms deterministically testable.
 *
 * Without the marker, 0.1.7's settings write gate REJECTS every write with
 * `Plugin entry "trae" has no volatile fields` while the scope's `set()` still
 * resolves — so the card would look like it saved and silently revert.
 */
export function asVolatile<S>(schema: S): S {
  if (typeof (schema as { volatile?: () => S }).volatile === 'function') {
    return (schema as { volatile: () => S }).volatile()
  }
  return schema
}

const modelConfig = z.object({
  id: z.string().required(),
  name: z.string().required(),
  contextWindow: z.number().step(1).min(1),
  maxTokens: z.number().step(1).min(1),
  input: z.array(z.union(['text', 'image'])),
  // Declared so the multiplier survives future hosts whose settings schema
  // might strip unknown fields; it feeds the DSH-facing display name.
  creditMultiplier: z.number(),
  // The directory function this model must be called through (Trae's roster is
  // split across SOLO-mode functions; glm-5.3 answers only solo_work_remote).
  // Persisted so a saved directory keeps working after a restart.
  wireFunction: z.string(),
  // The gateway's own `config_name` when it differs from the display id.
  //
  // Declared for the same reason as `wireFunction`, and it was the missing half
  // of that invariant: the DSH settings channel rebuilds the document through
  // THIS schema, so a field absent here is dropped on every save. The gateways
  // are case-sensitive (`deepseek-v4.1-flash` is the Remote directory id while
  // `DeepSeek-V4.1-Flash` is the `config_name`), so losing this mapping turned
  // every save into "this model answers 4001 until the next discovery". Absent
  // on rows saved before this field existed; the bridge then falls back to the
  // discovered row's own id.
  wireConfigName: z.string(),
  // Trae's own image capability flag. Persisted for the same reason as
  // `wireFunction`: the runtime catalog is re-derived from `lastCatalog` on
  // every save and every restart, so a flag dropped here would switch "auto
  // image input" back off the moment the user saved anything, and again after a
  // restart (issue #16). Absent on rows saved before this field existed, which
  // reads as "not capable" rather than "assume capable".
  multimodal: z.boolean(),
  // Upstream's promotion rule for this row (src/promo.ts).
  //
  // Declared with `z.any()` on purpose: it is an upstream document whose shape
  // is upstream's to change, and re-deriving it through a nested schema would
  // silently drop whichever branch a future promotion adds. It rides in
  // `lastCatalog` for the same reason every other field does — the settings
  // channel rebuilds this document on every save, so a field absent here
  // disappears the moment the user ticks a checkbox, and the badge would then
  // wait for the next live refresh to come back.
  activityDiscount: z.any<TraeActivityDiscount>(),
})

/**
 * One panel's saved state. Panels are keyed `cn | enterprise | ai` — see
 * {@link TraePanel}; `enterprise` is a second CN provider with its own switch,
 * account binding and model selection.
 */
const regionStateConfig = z.object({
  // Enterprise defaults OFF: a consumer-only account cannot use that pool, so
  // opting every existing user into it would put a failing route in their model
  // picker. Everything else keeps opt-out semantics (`false` withdraws it).
  enabled: z.boolean().description('Whether this panel\'s provider is offered to DSH (false withdraws it entirely)'),
  lastCatalog: z.array(modelConfig).default([]),
  enabledModelIds: z.array(z.string()).default([]),
  imageModelIds: z.array(z.string()).default([]),
  // Opt-IN gate for the trae_draw_image tool. Declared here because an
  // undeclared field is dropped on every save of the settings form.
  drawImageEnabled: z.boolean().default(false).description('Allow the model to generate images with trae_draw_image on this panel (consumes credits; default off)'),
  contextBudgets: z.dict(z.number().step(1).min(1)).default({}),
  // The user's thinking-level choice per model (model id -> DSH level).
  //
  // Declared for TYPE enforcement, not retention: this schemastery keeps keys it
  // does not recognise (measured), so an undeclared map would survive a save
  // untouched. What the declaration buys is a refusal — a level that is not a
  // string is rejected at write time instead of being filtered out silently by
  // `thinkingEffortsOf`, which would leave the picker showing a choice nobody
  // made. The retention risk the neighbouring fields describe is real but comes
  // from readers that rebuild the slot field-by-field, not from this schema.
  //
  // Defaults to `{}` (no overrides) rather than a materialised tier list: the
  // absence of a key is the statement "this model uses its own default", and
  // writing a tier here would freeze today's upstream default into the config.
  thinkingEfforts: z.dict(z.string()).default({}).description('每个模型的思考强度（模型 id → 档位）。留空 = 跟随该模型自己的默认档。'),
  // WHERE this region's credit readout sits (learned from workbuddy #62).
  // Defaults to `composer` because that is the seat that already existed, so an
  // upgrade moves nothing on screen; `stats` is what a user reaches for when
  // another plugin occupies the composer row. Declared in the schema so the DSH
  // settings form can read it, and read back through `regionCreditPositionOf`
  // rather than from a schema default alone — a profile written before this
  // field existed must still read as `composer`.
  creditPosition: z.union([z.const('composer'), z.const('stats')]).default('composer').description('积分显示位置：composer 为模型选择所在行，位置被占用时后加载的读数自动向左排列；stats 为输入框下方，与轮次、步数和 token 统计同一行。默认 composer。'),
  // Account pool (issue #44): which accounts this panel may bill, which model a
  // test probes, and whether the pool routes at all. Declared HERE because the
  // settings channel rebuilds the document through this schema, and a field
  // absent here is dropped on every save — the failure that once reset
  // `wireConfigName` and turned every save into a 4001.
  //
  // DEFAULTS ARE DECLARED, not merely documented, so this slot reads the same
  // everywhere it is read: the settings form's initial values, `regionStateOf()`
  // output, and the draft the card compares against. Without them schemastery
  // materialises `pool` as `{ memberAccountIds: [] }` and DROPS `enabled` /
  // `targetModelId`, which would surface on the settings form as an
  // uninitialised control instead of the OFF/auto the code actually means.
  //
  // 测试输入大小由 probeInputTokens 保存。0 使用最小请求，较大值填充测试输入；
  // 短输入测试通过不能证明较长的真实请求也会被上游接受。
  pool: z.object({
    autoCheckin: z.boolean().default(false).description('每日自动签到：保存后为国内个人账号池成员领取奖励，遵循本机每日领取限制。'),
    enabled: z.boolean().default(false).description('账号池：开启后按排序规则选择可用账号，符合换号条件时重试其他成员；关闭后使用绑定账号。'),
    targetModelId: z.string().default('').description('账号池测速使用的模型 id（留空 = 自动选择免费模型）'),
    memberAccountIds: z.array(z.string()).default([]).description('加入本面板账号池的账号 id（显式勾选，默认为空）'),
    // 0 = the historical one-word probe. A larger value pads the probe request so
    // a size-based refusal shows up in the test instead of in the user's real turn.
    probeInputTokens: z.number().default(0).description('账号池测试请求填充的 token 量（0 = 最小请求，不填充）'),
  }).default({}),
})

const accountSelectionConfig = z.object({
  cn: z.string().description('Selected domestic (CN) account id (never a token)'),
  ai: z.string().description('Selected international account id (never a token)'),
  // The enterprise panel draws on the SAME cn credentials but keeps its own
  // binding: pointing the consumer tab at a personal account must not move the
  // tenant tab. Absent means "this region's default", exactly like the others.
  enterprise: z.string().description('Selected account id for the CN enterprise pool (never a token)'),
})

export const Config: z<Config> = z.object({
  authFile: asVolatile(z.string().description('Optional Trae storage.json path override')),
  edition: asVolatile(z.union(['auto', 'cn', 'sg', 'solo', 'solo-sg']).default('auto').description('Trae edition hint')),
  accountId: z.string().description('Deprecated: pre-split account selector, attributed to its own region'),
  // The cast is required because `asVolatile` returns `z<T>` with `T` inferred
  // from the wrapped schema, which is narrower than the optional
  // `Partial<Record<TraeRegion, string>>` the Config interface declares. The
  // schema is unchanged either way — this only restores the assignment.
  // GATES the composer-row credit readout, restored as a real switch in 2.13.3
  // after the user looked for it in settings. History: it first gated the
  // sidebar credit line (issue #26), was retired when that line was removed in
  // 2.13.0 (the composer readout replaced it and rendered unconditionally), and
  // is back because a readout inside the SHARED composer row deserves the same
  // opt-in the sidebar line had. The same field is REUSED on purpose: a user
  // who already enabled the old switch keeps the readout after the upgrade
  // instead of finding it silently off.
  // OFF by default, matching the stated preference for the sidebar line: a row
  // inside the shared composer toolbar is something to ask for, not to impose.
  showPointsInMainUi: asVolatile(z.boolean().default(false).description('在所选位置显示「Trae - CN」积分读数，点击可查看账号与积分明细。选择其他供应商模型时仍显示。')),
  // The opt-in sidebar row (see `Config.sidebarPanel`). Volatile for the same
  // reason as the block above: the card's checkbox writes it, and a full plugin
  // reload — which disposes both provider stacks and drops in-flight requests —
  // would be a wildly disproportionate price for adding one nav row.
  //
  // OFF by default: the row claims a GLOBAL sidebar seat every installed bundle
  // shares, and the Plugins page already reaches this card.
  sidebarPanel: asVolatile(
    z.boolean()
      .default(false)
      .description('在 DSH 侧边栏显示「Trae」面板：点开是这张卡片的整页版。默认关闭。开启后增加一个侧边栏入口；也可从「插件」页打开相同内容。点一下即生效，不用保存。'),
  ) as unknown as z<boolean>,
  refreshIntervalMinutes: asVolatile(
    z.union(TRAE_REFRESH_INTERVAL_MINUTES)
      .default(TRAE_REFRESH_INTERVAL_DEFAULT_MINUTES)
      .description('自动刷新间隔（分钟）：卡片与输入框读数共用。可选 1 / 5 / 10 / 30 / 60，默认 5。每次刷新会读取用量（两次只读的上游请求），间隔越短请求越频繁。'),
  ) as unknown as z<TraeRefreshIntervalMinutes>,
  accounts: asVolatile(accountSelectionConfig.description('Per-panel account selections, keyed cn | enterprise | ai')) as z<Partial<Record<TraePanel, string>>>,
  regions: asVolatile(z.dict(regionStateConfig).default({}).description('Per-panel model directory and selection, keyed cn | enterprise | ai')),
  lastCatalog: z.array(modelConfig).description('Deprecated: pre-region-split CN model directory') as z<TraeModelInfo[]>,
  enabledModelIds: z.array(z.string()).default([]).description('Deprecated: pre-region-split CN selection'),
  contextBudgets: z.dict(z.number().step(1).min(1)).default({}).description('Deprecated: pre-region-split CN context budgets'),
  imageModelIds: z.array(z.string()).default([]).description('Deprecated: pre-region-split CN image opt-in'),
  models: z.array(modelConfig).description('Legacy generated Trae model list') as z<TraeModelInfo[]>,
})
