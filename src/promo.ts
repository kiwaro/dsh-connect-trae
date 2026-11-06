/**
 * 解析 Trae 模型目录中的优惠规则，并在渲染时判断徽标。
 * 数据来自 Remote 模型行的 features 和 wire 模型行的 display_contact_config；
 * mergeTraeModelSources 优先采用 wire 数据，再回退到 Remote 数据。
 *
 * 优先使用 data.current 给出的优惠；current 为 none 时，才按模型声明的时区
 * 和 off_peak.time_windows 判断闲时优惠。current 是上游快照，可能随缓存滞后，
 * 因此徽标不能保证代表服务端此刻的最终计费。普通低价也不能单独作为促销依据。
 *
 * member 只用于比较会员价，不单独决定是否显示徽标。会员价与闲时价是同一活动
 * 的不同适用条件，不能叠乘；只有会员价低于当前徽标价格时，才额外展示会员价。
 * 2026-10-23 的国内账号实测中，两条分支均为 0.12 → 0.06。
 *
 * 徽标文字和颜色由插件提供，依据 TraePromoKind 选择。本模块未测得国际目录
 * 提供对应优惠数据；是否显示取决于目录实际内容，不按地区硬编码。
 */

/** Which kind of promotion a badge reports. Derived from upstream's `subKey`. */
export type TraePromoKind = 'limited' | 'subsidy' | 'offPeak'

/** One price pair, as upstream published it. Rates are credits per Mtoken. */
export interface TraePromoPrice {
  /** Undiscounted rate. */
  beforeRate?: number
  /** Discounted rate, when upstream stated one for this branch. */
  rate?: number
  /**
   * Pay ratio in percent, straight from `discount`: 100 = full price, 50 = 五折,
   * 25 = 二五折. NOT a 0–1 multiplier — read literally, the way it is written.
   */
  discountPercent?: number
}

/** One `off_peak` window: ISO weekdays 1(Monday)–7(Sunday), minutes 0–1440. */
export interface TraePromoWindow {
  weekdays: number[]
  /** Inclusive. */
  startMinute: number
  /** Exclusive; 1440 is upstream's way of writing "end of day". */
  endMinute: number
}

/** The whole `activity_discount` document, kept unflattened on purpose. */
export interface TraeActivityDiscount {
  /** Upstream's machine name for the campaign, e.g. `subsidy_member_discount`. */
  subKey?: string
  /** Upstream's own "right now" verdict. */
  current?: TraePromoPrice & { discountType?: string }
  /** Subscription price — hover material only, see the module note. */
  member?: TraePromoPrice
  /** Recurring cheap hours, judged locally against each model's own zone. */
  offPeak?: TraePromoPrice & { timeZone?: string; windows: TraePromoWindow[] }
  /** Subsidy branch, when upstream names it separately from `current`. */
  subsidy?: TraePromoPrice
}

/** A promotion that is live at the instant the card painted. */
export interface TraePromoBadge {
  kind: TraePromoKind
  /** Pay ratio in percent (50 = 五折). */
  discountPercent: number
  /** `100 - discountPercent`, for locales that phrase it as "X% off". */
  percentOff: number
  beforeRate?: number
  rate?: number
  /**
   * The subscription price, ONLY when it is cheaper than {@link rate}.
   *
   * `undefined` also covers the very common case where both paths land on the
   * same figure (see the module note): there is no second discount to quote.
   */
  memberDiscountPercent?: number
  /** The member price itself, `after_consumption_rate`, when it is cheaper. */
  memberRate?: number
  /**
   * The cheap window that produced the badge — wall clocks in {@link timeZone},
   * "HH:MM" (an end of "24:00" is upstream's end-of-day).
   */
  fromClock?: string
  untilClock?: string
  timeZone?: string
}

/** Zone used when upstream omits `off_peak.time_zone` (CN accounts). */
export const TRAE_PROMO_DEFAULT_TIME_ZONE = 'Asia/Shanghai'

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined
}

function finite(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function percent(value: unknown): number | undefined {
  const parsed = finite(value)
  return parsed !== undefined && parsed > 0 && parsed < 100 ? parsed : undefined
}

function ratePair(raw: unknown): TraePromoPrice {
  const entry = record(raw)
  if (entry === undefined) return {}
  const beforeRate = finite(entry['before_consumption_rate'])
  // `current` spells the discounted rate `consumption_rate`, the other branches
  // `after_consumption_rate`. Same quantity, two names — read both.
  const rate = finite(entry['consumption_rate']) ?? finite(entry['after_consumption_rate'])
  const discountPercent = percent(entry['discount'])
  return {
    ...beforeRate === undefined || beforeRate <= 0 ? {} : { beforeRate },
    ...rate === undefined || rate <= 0 ? {} : { rate },
    ...discountPercent === undefined ? {} : { discountPercent },
  }
}

function windows(raw: unknown): TraePromoWindow[] {
  const list = Array.isArray(raw) ? raw : []
  const parsed: TraePromoWindow[] = []
  for (const item of list) {
    const entry = record(item)
    if (entry === undefined) continue
    const weekdays = Array.isArray(entry['weekdays'])
      ? entry['weekdays'].filter((day): day is number => Number.isInteger(day) && (day as number) >= 1 && (day as number) <= 7)
      : []
    const startMinute = finite(entry['start_minute'])
    const endMinute = finite(entry['end_minute'])
    if (weekdays.length === 0 || startMinute === undefined || endMinute === undefined) continue
    if (startMinute < 0 || startMinute > 1439 || endMinute < 1 || endMinute > 1440) continue
    if (startMinute >= endMinute) continue
    parsed.push({ weekdays, startMinute, endMinute })
  }
  return parsed
}

/**
 * Parse one `activity_discount` document.
 *
 * `value` may be the already-parsed object (both call sites hand us the parent
 * object) or the raw JSON string; anything without `enable: true` reads as "no
 * promotion" rather than as a rule we might later misjudge.
 */
export function parseTraeActivityDiscount(value: unknown): TraeActivityDiscount | undefined {
  let source = value
  if (typeof source === 'string') {
    if (source === '') return undefined
    try { source = JSON.parse(source) as unknown } catch { return undefined }
  }
  const raw = record(source)
  if (raw === undefined || raw['enable'] !== true) return undefined
  const data = record(raw['data'])
  if (data === undefined) return undefined
  const subKey = typeof raw['subKey'] === 'string' && raw['subKey'] !== '' ? raw['subKey'] : undefined
  const currentRaw = record(data['current'])
  const currentType = typeof currentRaw?.['discount_type'] === 'string' ? currentRaw['discount_type'] as string : undefined
  const current = currentRaw === undefined ? undefined : { ...ratePair(currentRaw), ...currentType === undefined ? {} : { discountType: currentType } }
  const memberRaw = data['member']
  const member = record(memberRaw) === undefined ? undefined : ratePair(memberRaw)
  const subsidyRaw = data['subsidy']
  const subsidy = record(subsidyRaw) === undefined ? undefined : ratePair(subsidyRaw)
  const offPeakRaw = record(data['off_peak'])
  const offPeak = offPeakRaw === undefined
    ? undefined
    : {
        ...ratePair(offPeakRaw),
        ...typeof offPeakRaw['time_zone'] === 'string' && offPeakRaw['time_zone'] !== '' ? { timeZone: offPeakRaw['time_zone'] as string } : {},
        windows: windows(offPeakRaw['time_windows']),
      }
  const parsed: TraeActivityDiscount = {
    ...subKey === undefined ? {} : { subKey },
    ...current === undefined ? {} : { current },
    ...member === undefined ? {} : { member },
    ...offPeak === undefined ? {} : { offPeak },
    ...subsidy === undefined ? {} : { subsidy },
  }
  // A document that carries no price pair at all is upstream noise, not a
  // promotion: keep only what can actually become a badge or a hover line.
  return parsed.current === undefined && parsed.member === undefined && parsed.offPeak === undefined && parsed.subsidy === undefined
    ? undefined
    : parsed
}

const WEEKDAY_INDEX: Readonly<Record<string, number>> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
}

/** Wall clock in one named zone: ISO weekday (1–7) plus minutes since midnight. */
export function zonedClock(now: Date, timeZone: string): { isoWeekday: number; minutes: number } | undefined {
  let parts: Intl.DateTimeFormatPart[]
  try {
    parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now)
  } catch {
    // An unknown IANA zone (an upstream typo, an old ICU) is not a crash: the
    // caller falls back to the account zone, then to "no badge".
    return undefined
  }
  let isoWeekday: number | undefined
  let hour: number | undefined
  let minute: number | undefined
  for (const part of parts) {
    if (part.type === 'weekday') isoWeekday = WEEKDAY_INDEX[part.value]
    else if (part.type === 'hour') hour = Number.parseInt(part.value, 10)
    else if (part.type === 'minute') minute = Number.parseInt(part.value, 10)
  }
  if (isoWeekday === undefined || hour === undefined || minute === undefined) return undefined
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return undefined
  // Some engines answer midnight as "24" under a 2-digit pattern; hour 24 of
  // "today" is hour 0 of the same wall-clock day, which is what we compare.
  return { isoWeekday, minutes: (hour % 24) * 60 + minute }
}

function clockOf(minutes: number): string {
  const hour = Math.floor(minutes / 60)
  const minute = minutes % 60
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function runningWindow(
  discount: TraeActivityDiscount,
  now: Date,
  defaultTimeZone: string,
): (TraePromoWindow & { timeZone: string }) | undefined {
  const offPeak = discount.offPeak
  if (offPeak === undefined || offPeak.windows.length === 0) return undefined
  const declaredZone = offPeak.timeZone ?? defaultTimeZone
  let usedZone = declaredZone
  // The model's own zone decides first; an unusable one (a typo, an old ICU)
  // degrades to the account zone instead of silently judging in local time.
  let clock = zonedClock(now, declaredZone)
  if (clock === undefined && declaredZone !== defaultTimeZone) {
    usedZone = defaultTimeZone
    clock = zonedClock(now, defaultTimeZone)
  }
  if (clock === undefined) return undefined
  const match = offPeak.windows.find(window =>
    window.weekdays.includes(clock.isoWeekday)
    && clock.minutes >= window.startMinute
    && clock.minutes < window.endMinute)
  // Report the zone the window was ACTUALLY judged in, not the declared one: a
  // capsule whose hover says "（Mars/Olympus）" while the hours were read in
  // Asia/Shanghai would name a clock nobody used.
  return match === undefined ? undefined : { ...match, timeZone: usedZone }
}

/** `subKey` is upstream's machine name; it is the only honest source for "限时". */
function kindOf(discount: TraeActivityDiscount): TraePromoKind {
  const key = discount.subKey ?? ''
  if (key.includes('off_peak')) return 'offPeak'
  if (key.includes('subsidy')) return 'subsidy'
  if (key.includes('limited')) return 'limited'
  const type = discount.current?.discountType ?? ''
  if (type.includes('off')) return 'offPeak'
  if (type.includes('limited')) return 'limited'
  return 'subsidy'
}

/** Pay ratio as upstream would phrase it; falls back to the rates it published. */
function discountOf(price: TraePromoPrice): number | undefined {
  if (price.discountPercent !== undefined) return price.discountPercent
  if (price.beforeRate === undefined || price.rate === undefined) return undefined
  if (price.beforeRate <= 0 || price.rate >= price.beforeRate) return undefined
  return Math.round((price.rate / price.beforeRate) * 100)
}

/**
 * The member price, but only when it beats the rate the badge is already showing.
 *
 * Two rates on the same base are two ways to reach one price: `member` quoting
 * 0.06 beside a live 0.06 is not "another 5 折". Comparing the post-discount
 * numbers is the only honest test — a branch with no rate cannot be shown to be
 * cheaper, so it is not quoted at all.
 */
function cheaperMemberOf(
  price: TraePromoPrice,
  discount: TraeActivityDiscount,
): { rate: number, discountPercent: number } | undefined {
  const member = discount.member
  if (member === undefined || member.rate === undefined) return undefined
  if (price.rate === undefined || member.rate >= price.rate) return undefined
  const discountPercent = discountOf(member)
  if (discountPercent === undefined) return undefined
  return { rate: member.rate, discountPercent }
}

function badgeOf(
  kind: TraePromoKind,
  price: TraePromoPrice,
  discount: TraeActivityDiscount,
  window?: TraePromoWindow & { timeZone: string },
): TraePromoBadge | undefined {
  const discountPercent = discountOf(price)
  if (discountPercent === undefined) return undefined
  const member = cheaperMemberOf(price, discount)
  return {
    kind,
    discountPercent,
    percentOff: 100 - discountPercent,
    ...price.beforeRate === undefined ? {} : { beforeRate: price.beforeRate },
    ...price.rate === undefined ? {} : { rate: price.rate },
    ...member === undefined ? {} : { memberDiscountPercent: member.discountPercent, memberRate: member.rate },
    ...window === undefined ? {} : {
      fromClock: clockOf(window.startMinute),
      untilClock: clockOf(window.endMinute),
      timeZone: window.timeZone,
    },
  }
}

/**
 * Decide the one badge (if any) a model shows right now.
 *
 * `now` is injected so the verdict is testable and so the card, which re-renders
 * on its own poll, always judges against the current clock. `defaultTimeZone` is
 * the account's zone, used only when upstream omits `off_peak.time_zone`.
 */
export function selectTraePromoBadge(
  discount: TraeActivityDiscount | undefined,
  now: Date,
  defaultTimeZone: string = TRAE_PROMO_DEFAULT_TIME_ZONE,
): TraePromoBadge | undefined {
  if (discount === undefined) return undefined
  const current = discount.current
  if (current !== undefined) {
    const type = current.discountType ?? 'none'
    const live = type !== 'none'
      && (current.beforeRate === undefined || current.rate === undefined || current.rate < current.beforeRate)
    if (live) {
      // The kind is the CAMPAIGN's identity (`subKey`), the numbers are what
      // upstream says the user pays right now (`current`): a campaign may be an
      // off-peak one whose window is open, and then both agree — while a
      // subsidy running outside its window must report the live price, not the
      // window's.
      const kind = kindOf(discount)
      // An "off-peak" capsule has to be able to say WHEN. Upstream's live
      // verdict carries no window, so a badge sourced from it would otherwise
      // read 闲时 5 折 with no hours behind it (the shape the picker showed on
      // 2026-10-23). Attach the window only when the local clock agrees one is
      // running: that is a statement we can defend, and it stays silent when a
      // cached/lagging verdict and the clock disagree.
      const window = kind === 'offPeak' ? runningWindow(discount, now, defaultTimeZone) : undefined
      const badge = badgeOf(kind, current, discount, window)
      // A live verdict still needs a number to show; without one, fall through
      // rather than paint an empty capsule.
      if (badge !== undefined) return badge
    }
  }
  const window = runningWindow(discount, now, defaultTimeZone)
  if (window !== undefined && discount.offPeak !== undefined) {
    const currentType = discount.current?.discountType ?? 'none'
    // `current: none` plus a running window is the ordinary off-peak case; a
    // non-none verdict that produced no number is upstream noise, still not a
    // reason to hide a window the model itself declared.
    if (currentType === 'none' || discountOf(discount.offPeak) !== undefined) {
      return badgeOf('offPeak', discount.offPeak, discount, window)
    }
  }
  return undefined
}
