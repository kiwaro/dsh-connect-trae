/**
 * trae_draw_image：把 Trae 的文生图能力（客户端与 SOLO 共用的
 * /api/ide/v1/tool_text_to_image 端点）暴露成一个 DSH agent 工具。
 *
 * 与 dsh-connect-workbuddy 的 image-tool.ts 同一注册形态：手写 ToolDefinition、
 * 不 import 宿主类型（宿主 Tools.register 只校验 output.render 是函数、
 * output.schema 是受支持的 JSON Schema；parameters 原样投影给模型）。
 * 宿主类型不参与运行时导入，避免为工具注册额外加载宿主模块。
 *
 * 作用域（v1，有意为之）：
 *   - 只做文生图。改图（image_urls 传参考图）需要先把本地文件经
 *     get_resource_upload_url 预签名上传到 TOS，那是另一条流水线，未接。
 *   - 只做文生图同步端点。SSE 端点与 video 端点的常量在 image-gen-trae.ts
 *     留档（tool_text_to_image_stream / tool_text_to_video_stream），
 *     Trae 的视频结果还要轮询 query_material_result，等真机探针确认后再加。
 *
 * @module dsh-connect-trae/image-tool
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import type { TraeCredential } from './auth.ts'
import type { TraeIdentity } from './identity.ts'
import { buildTraeHeaders, traeEndpoint } from './protocol.ts'
import {
  DEFAULT_TRAE_IMAGE_SIZE,
  TRAE_IMAGE_MODEL,
  TRAE_RESOURCE_URL_PATH,
  TRAE_TOOL_TEXT_TO_IMAGE_PATH,
  TraeImageError,
  buildTraeImageBody,
  buildTraeResourceUrlBody,
  parseTraeImageResponse,
  signedTraeResourceUrl,
  type TraeImageRequestBody,
  type TraeImageRequestInput,
} from './image-gen-trae.ts'

/** 工具名。与其它 connect 插件的命名习惯一致。 */
export const TRAE_IMAGE_TOOL_NAME = 'trae_draw_image'

/** 单次生图上限。Trae 客户端里一张图 15-45 秒，留足余量。 */
const IMAGE_TOOL_TIMEOUT_MS = 180_000
/** 生图失败后等待 30 秒再允许重试，避免连续发起可能计费的请求。 */
const FAILURE_COOLDOWN_MS = 30_000

/** 宿主 ContentBlock 的最小结构（只需要文本块）。 */
export interface TraeToolContentBlock {
  readonly type: 'text'
  readonly text: string
}

/** 一次生图请求所需的全部账号侧能力（index.ts 按面板解析后传入）。 */
export interface TraeImageAccount {
  readonly credential: TraeCredential
  readonly identity: TraeIdentity
  /** 该账号应打到的网关基址（REGION_GATEWAYS[region].chat）。 */
  readonly baseUrl: string
}

export interface TraeImageGenerated {
  /** Trae 的图片对象 key（tos uri），不是可直接打开的 URL；留作记录与排障。 */
  readonly url: string
  readonly credit?: number
  /** 图片字节（已按 key 解析出签名地址并下载好）。 */
  readonly bytes: Uint8Array
  /** 下载应答的 content-type（实测 image/jpeg）。 */
  readonly mimeType: string
}

/** 图片保存目录，相对于会话工作目录。 */
export const TRAE_IMAGE_DIR = 'trae-images'

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** HTTP 层的状态码映射。语义与 workbuddy 侧一致。 */
function mapHttpToImageError(status: number, detail: string): TraeImageError {
  const tail = detail === '' ? '' : '：' + detail.slice(0, 200)
  if (status === 401 || status === 403) return new TraeImageError('trae image: 上游拒绝了凭据（HTTP ' + status + '）' + tail, 'AUTH')
  if (status === 429) return new TraeImageError('trae image: 上游限流（HTTP 429）' + tail, 'RATE_LIMIT')
  return new TraeImageError('trae image: 上游 HTTP ' + status + tail, 'UPSTREAM')
}

/**
 * 取图阶段（解析签名地址 / 下载字节）的 HTTP 失败。
 *
 * 取图失败统一归为 IMAGE_UNAVAILABLE，并保留状态码、响应及对象 key。
 * 此时生成接口已返回图片对象，生成请求可能已经计费。下载地址的 403 不足以
 * 证明 Trae 登录凭据失效，不能套用生成接口的 AUTH 映射。
 * IMAGE_UNAVAILABLE 同样触发冷却，避免用户为下载失败再次生成图片。
 */
function mapRetrievalHttpError(status: number, detail: string, uri: string): TraeImageError {
  const tail = detail === '' ? '' : '：' + detail.slice(0, 200)
  return new TraeImageError(
    'trae image: 图片已生成，生成请求可能已计费，但取图接口回了 HTTP ' + status + tail
    + '\n图片对象 key：' + uri,
    'IMAGE_UNAVAILABLE',
  )
}

/**
 * 发一次真机文生图请求，并把图片字节一起取回来。所有可预期的失败都归一成
 * TraeImageError，让上层的冷却判据只看 code（见 createTraeDrawImageTool 的注释）。
 */
export class TraeImageClient {
  constructor(
    private readonly options: {
      readonly fetchImpl?: typeof fetch
      readonly timeoutMs?: number
      readonly logger?: { warn(message: string): void }
    } = {},
  ) {}

  async generate(
    account: TraeImageAccount,
    input: TraeImageRequestInput,
    signal?: AbortSignal,
  ): Promise<TraeImageGenerated> {
    // 发送请求前完成参数校验，INVALID_ARGS 在本地返回并保持冷却状态不变。
    const body: TraeImageRequestBody = buildTraeImageBody(input)
    const endpoint = traeEndpoint(account.baseUrl, TRAE_TOOL_TEXT_TO_IMAGE_PATH)
    const headers = buildTraeHeaders(account.credential, account.identity, { profile: 'model-detail' })
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    const timeoutMs = this.options.timeoutMs ?? IMAGE_TOOL_TIMEOUT_MS
    const requestSignal = signal ?? AbortSignal.timeout(timeoutMs)

    let response: Response
    try {
      response = await fetchImpl(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: requestSignal,
      })
    } catch (error: unknown) {
      // 连接失败或请求中止不能证明上游未收到请求。归为 NO_ROUTE 并进入冷却，
      // 避免上游已开始生成时重复发送。
      throw new TraeImageError('trae image: 生图请求发出失败：' + messageOf(error), 'NO_ROUTE')
    }

    let payload: string
    try {
      payload = await response.text()
    } catch (error: unknown) {
      throw new TraeImageError('trae image: 读取应答失败：' + messageOf(error), 'UPSTREAM')
    }
    if (!response.ok) throw mapHttpToImageError(response.status, payload)

    let json: unknown
    try {
      json = JSON.parse(payload)
    } catch {
      throw new TraeImageError(
        'trae image: 应答不是 JSON（HTTP 200）：' + payload.slice(0, 200),
        'UPSTREAM',
      )
    }
    // envelope 的 code/msg 在这里归一成 UPSTREAM/EMPTY_RESULT；
    // 真机探针若暴露新的未知字段形态，也会在这里以 EMPTY_RESULT 浮出原文线索。
    const outcome = parseTraeImageResponse(json)

    // 取图使用 2026-10-26 实测的接口，先把 tos key 换成
    // byteimg 签名地址（get_resource_url 的 {uri_list:[key]}），再直接 GET 那个
    // 地址拿字节（实测 image/jpeg、1,155,578 字节、头 ffd8ffe0）。
    // 注意**不是**同路径那条 ?prompt=&image_size= 的 GET——那才是又一次生成
    // （回新 uri、27 秒、零像素、多扣一张），已彻底停用。
    const signed = await this.resolveSignedUrl(account, outcome.url, requestSignal)
    const image = await this.download(signed, requestSignal, outcome.url)

    const result: { url: string, credit?: number, bytes: Uint8Array, mimeType: string } = {
      url: outcome.url,
      bytes: image.bytes,
      mimeType: image.mimeType,
    }
    if (outcome.credit !== undefined) result.credit = outcome.credit
    return result
  }

  /**
   * 把 tos key 解析成一个可直接 GET 的签名地址（byteimg CDN，带 x-expires）。
   * 这一步只是向服务端要地址，不会重新画图。
   */
  async resolveSignedUrl(
    account: TraeImageAccount,
    uri: string,
    signal?: AbortSignal,
  ): Promise<string> {
    // 在发送解析请求前校验 uri，此处的 INVALID_ARGS 不表示生成请求已经成功。
    const body = buildTraeResourceUrlBody(uri)
    const endpoint = traeEndpoint(account.baseUrl, TRAE_RESOURCE_URL_PATH)
    const headers = buildTraeHeaders(account.credential, account.identity, { profile: 'model-detail' })
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    const requestSignal = signal ?? AbortSignal.timeout(IMAGE_TOOL_TIMEOUT_MS)

    let response: Response
    try {
      response = await fetchImpl(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: requestSignal,
      })
    } catch (error: unknown) {
      throw new TraeImageError(
        'trae image: 图片已生成，生成请求可能已计费，但解析下载地址的请求发不出去：' + messageOf(error),
        'IMAGE_UNAVAILABLE',
      )
    }

    let payload: string
    try {
      payload = await response.text()
    } catch (error: unknown) {
      throw new TraeImageError(
        'trae image: 图片已生成，生成请求可能已计费，但读取解析应答失败：' + messageOf(error),
        'IMAGE_UNAVAILABLE',
      )
    }
    if (!response.ok) throw mapRetrievalHttpError(response.status, payload, uri)

    let json: unknown
    try {
      json = JSON.parse(payload)
    } catch {
      throw new TraeImageError(
        'trae image: 图片已生成，生成请求可能已计费，但解析应答不是 JSON（HTTP 200）：' + payload.slice(0, 200),
        'IMAGE_UNAVAILABLE',
      )
    }
    if (json === null || typeof json !== 'object') {
      throw new TraeImageError(
        'trae image: 图片已生成，生成请求可能已计费，但解析应答里没有 url_map：' + payload.slice(0, 200),
        'IMAGE_UNAVAILABLE',
      )
    }
    return signedTraeResourceUrl(json, uri)
  }

  /** 使用 URL 中的签名下载图片，不向 CDN 转发 Trae 登录请求头。 */
  async download(
    signed: string,
    signal?: AbortSignal,
    uri?: string,
  ): Promise<{ bytes: Uint8Array, mimeType: string }> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    const requestSignal = signal ?? AbortSignal.timeout(IMAGE_TOOL_TIMEOUT_MS)

    let response: Response
    try {
      response = await fetchImpl(signed, {
        method: 'GET',
        headers: { Accept: 'image/*' },
        signal: requestSignal,
      })
    } catch (error: unknown) {
      throw new TraeImageError(
        'trae image: 图片已生成，生成请求可能已计费，但下载字节失败：' + messageOf(error),
        'IMAGE_UNAVAILABLE',
      )
    }
    if (!response.ok) {
      const key = uri === undefined || uri === '' ? '' : '\n图片对象 key：' + uri
      throw new TraeImageError(
        'trae image: 图片已生成，生成请求可能已计费，但下载地址回了 HTTP ' + response.status + '。' + key,
        'IMAGE_UNAVAILABLE',
      )
    }

    let buffer: ArrayBuffer
    try {
      buffer = await response.arrayBuffer()
    } catch (error: unknown) {
      throw new TraeImageError(
        'trae image: 图片已生成，生成请求可能已计费，但读取图片字节失败：' + messageOf(error),
        'IMAGE_UNAVAILABLE',
      )
    }
    if (buffer.byteLength === 0) {
      throw new TraeImageError(
        'trae image: 图片已生成，生成请求可能已计费，但下载回来是 0 字节。',
        'IMAGE_UNAVAILABLE',
      )
    }
    const contentType = response.headers.get('content-type') ?? ''
    const mimeType = contentType.split(';')[0]?.trim() ?? ''
    // content-type 是 CDN 自己说的，不足为凭：签名地址过期/被改写时，CDN 会拿
    // 200 回一页 HTML（错误页），照着写就会落一个打不开的 .jpg。以魔数为准，
    // 无法识别图片格式时报告 IMAGE_UNAVAILABLE，避免保存无效图片。
    const sniffed = imageMimeTypeOf(new Uint8Array(buffer))
    if (sniffed === undefined) {
      throw new TraeImageError(
        'trae image: 图片已生成，生成请求可能已计费，但下载回来的不是图片（content-type '
        + (mimeType === '' ? '缺失' : mimeType) + '，前 4 字节 '
        + hexPrefix(new Uint8Array(buffer)) + '）。'
        + (uri === undefined || uri === '' ? '' : '\n图片对象 key：' + uri),
        'IMAGE_UNAVAILABLE',
      )
    }
    return { bytes: new Uint8Array(buffer), mimeType: sniffed }
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {}
}

/**
 * 从字节魔数判断图片类型（JPEG / PNG / GIF / WebP / BMP）。
 *
 * 为什么不信 content-type：签名地址过期或被劫持时，CDN 常拿 200 回一页 HTML。
 * 直接保存会得到扩展名为 .jpg 的无效文件，而生成请求可能已经计费。
 * 认不出就返回 undefined，由调用方如实报 IMAGE_UNAVAILABLE。
 */
function imageMimeTypeOf(bytes: Uint8Array): string | undefined {
  const at = (index: number): number => bytes[index] ?? -1
  if (at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return 'image/jpeg'
  if (at(0) === 0x89 && at(1) === 0x50 && at(2) === 0x4e && at(3) === 0x47) return 'image/png'
  if (at(0) === 0x47 && at(1) === 0x49 && at(2) === 0x46) return 'image/gif'
  // RIFF....WEBP
  if (at(0) === 0x52 && at(1) === 0x49 && at(2) === 0x46 && at(3) === 0x46
    && at(8) === 0x57 && at(9) === 0x45 && at(10) === 0x42 && at(11) === 0x50) return 'image/webp'
  if (at(0) === 0x42 && at(1) === 0x4d) return 'image/bmp'
  return undefined
}

/** 前若干字节的十六进制，只用于排障文案。 */
function hexPrefix(bytes: Uint8Array): string {
  return [...bytes.slice(0, 4)].map(value => value.toString(16).padStart(2, '0')).join('')
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

/**
 * 以下错误可能发生在请求已到达上游之后，统一进入冷却以降低重复计费风险。
 * 该分类不表示每次错误都已经扣费。INVALID_ARGS 与 NOT_LOGGED_IN 在发出
 * 生成请求前返回，不触发冷却。
 */
const BILLABLE_FAILURE_CODES: ReadonlySet<string> = new Set([
  'AUTH',
  'RATE_LIMIT',
  'NO_ROUTE',
  'UPSTREAM',
  'EMPTY_RESULT',
  // 图片对象已生成但下载或保存失败，再次生成可能重复计费。
  'IMAGE_UNAVAILABLE',
])

function isBillableFailure(error: unknown): boolean {
  if (error instanceof TraeImageError) return BILLABLE_FAILURE_CODES.has(error.code)
  // 非类型化异常只会来自 client.generate 的 POST 之后阶段（校验/凭据都是类型化的）。
  return true
}

/** 工具运行所需的外部能力，全部由 index.ts 注入，便于单测替换。 */
export interface TraeImageToolDeps {
  /** 解析可用账号（登录态 + 身份 + 网关）；没有可用区时返回 undefined，不要抛。 */
  readonly resolveAccount: () => Promise<TraeImageAccount | undefined>
  /** 真正发一次文生图请求。 */
  readonly generate: (
    account: TraeImageAccount,
    request: TraeImageRequestInput,
    signal?: AbortSignal,
  ) => Promise<TraeImageGenerated>
  readonly logger: { warn(message: string): void }
  /**
   * 从 DSH 的 workingDirectory 服务读取会话当前目录。
   * header.cwd 只记录会话创建时的目录，不能反映后续目录切换；
   * DSH 未提供此服务时，由执行上下文的候选字段和 process.cwd() 回退。
   */
  readonly directoryOf?: (exec: TraeToolExec) => string | undefined | Promise<string | undefined>
}

/**
 * 工具执行上下文。优先使用 directoryOf 取得的当前目录；无法取得时，依次检查
 * session.workingDirectory、session.header.cwd、session.cwd、exec.cwd。
 * 这些兼容字段均不可用时，调用方回退到 process.cwd()。
 */
export interface TraeToolExec {
  readonly signal?: AbortSignal
  /** 兼容执行上下文提供的目录；实际可用性由 DSH 决定。 */
  readonly cwd?: string
  readonly agent?: {
    readonly session?: {
      readonly cwd?: string
      readonly workingDirectory?: string | null
      readonly header?: { readonly cwd?: string }
    }
  }
}

/**
 * 宿主 ToolDefinition 的结构子集（同 workbuddy 的 ImageToolDefinition；
 * 刻意不 import 宿主类型，只描述宿主会读哪些字段）。
 */
export interface TraeToolDefinition {
  readonly name: string
  readonly description: string
  readonly parameters: Record<string, unknown>
  readonly output: {
    readonly schema: Record<string, unknown>
    render(args: unknown, value: unknown): TraeToolContentBlock[]
  }
  readonly timeoutMs: number
  execute(args: unknown, exec: TraeToolExec): Promise<Record<string, unknown>>
}

/** 造出工具定义。每次 apply() 只造一个实例，冷却状态挂在闭包里。 */
export function createTraeDrawImageTool(deps: TraeImageToolDeps): TraeToolDefinition {
  let cooldownUntil = 0

  return {
    name: TRAE_IMAGE_TOOL_NAME,
    description:
      '使用当前登录的 Trae 账号生成图片，模型为 ' + TRAE_IMAGE_MODEL + '。'
      + '仅在用户明确要求生成图片时调用。生成会消耗账号积分；当次 CN 个人版实验中，1920x1920 图片每张约 8.8 积分'
      + '，实际费用以 Trae 额度面板为准，接口不返回扣费明细。'
      + '在插件设置中开启该面板的“允许模型自主生图”后，本工具才会注册；'
      + '关闭时不会注册本工具。请根据工具列表判断是否可用。'
      + '生成成功后，工具下载图片并保存到会话工作目录的 trae-images/ 下，'
      + '结果里给相对路径 path，渲染层已根据该路径显示图片，无需再次输出 Markdown 图片。'
      + '下载通过 get_resource_url 获取已有图片的签名地址，不会再次生成图片。'
      + '每次重新调用都会生成新图片，并可能再次计费。下载失败时不要为获取原图重复生成。'
      + '失败码 IMAGE_UNAVAILABLE 表示图片已生成，但下载或保存失败，生成请求可能已计费，请勿为取图重复生成。'
      + '生成请求失败后会等待 30 秒，期间重试不会发送到上游。参数错误或未登录不触发冷却。'
      + '尺寸：默认 ' + DEFAULT_TRAE_IMAGE_SIZE + '，也可给 宽x高（总像素需在 3686400~16777216 之间，'
      + '如 2048x2048）或预设 2k/3k/4k；过小（如 1024x1024）会被上游直接拒绝。'
      + '本工具暂不支持修改已有图片或生成视频。',
    parameters: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: '画面描述（中文或英文都可以）。写清楚主体、风格、构图、光线。',
        },
        size: {
          type: 'string',
          description: '图片尺寸：默认 ' + DEFAULT_TRAE_IMAGE_SIZE + '；也可给 宽x高（总像素 3686400~16777216，'
            + '如 2048x2048）或预设 2k/3k/4k。过小（如 1024x1024）会被上游拒绝。',
        },
      },
      required: ['prompt'],
      additionalProperties: false,
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Trae 图片对象 key（tos uri），留作记录与排障，不是可直接打开的 URL。' },
          path: { type: 'string', description: '图片文件相对会话工作目录的路径（如 trae-images/trae-20261026-041500-ab12cd.jpg）；渲染层已据此显示图片。' },
          model: { type: 'string', description: '实际使用的生图模型 id。' },
          prompt: { type: 'string', description: '实际提交的画面描述。' },
          size: { type: 'string', description: '实际提交的尺寸。' },
          hint: { type: 'string', description: '给模型的后续提示（图片位置、扣费口径）。' },
          credit: { type: 'number', description: '上游若回传扣费数字，这里给出积分数。' },
        },
        required: ['url', 'path', 'model', 'prompt', 'size', 'hint'],
        additionalProperties: false,
      },
      render(_args: unknown, value: unknown): TraeToolContentBlock[] {
        const record = asRecord(value)
        const url = asNonEmptyString(record['url']) ?? ''
        const path = asNonEmptyString(record['path']) ?? ''
        const model = asNonEmptyString(record['model']) ?? 'unknown'
        const size = asNonEmptyString(record['size']) ?? ''
        const credit = typeof record['credit'] === 'number' ? record['credit'] : undefined
        const hint = asNonEmptyString(record['hint']) ?? ''
        // 只有真落盘了才画 ![](...)：path 是相对会话工作目录的文件路径，DSH 的聊天
        // 按 session cwd 解析它、再过 api/file 鉴权路由取字节，所以能显示。
        // url 是 tos 对象 key，拼进 markdown 只会得到碎图标——那种情况只给行内代码。
        const lines = path === ''
          ? ['图片已生成，但字节没取回来（只有对象 key）：`' + url + '`']
          : ['![Trae 文生图](' + path + ')']
        lines.push(
          '',
          '文生图 · 模型：' + model + (size === '' ? '' : ' · 尺寸：' + size)
          + (credit === undefined ? '' : ' · 消耗 ' + credit + ' 积分'),
        )
        if (hint !== '') lines.push('', hint)
        return [{ type: 'text', text: lines.join('\n') }]
      },
    },
    timeoutMs: IMAGE_TOOL_TIMEOUT_MS,
    async execute(args: unknown, exec): Promise<Record<string, unknown>> {
      const record = asRecord(args)
      const prompt = asNonEmptyString(record['prompt'])
      if (prompt === undefined) {
        throw new TraeImageError(TRAE_IMAGE_TOOL_NAME + ': 参数 prompt 必填，且必须是非空字符串。', 'INVALID_ARGS')
      }
      const size = asNonEmptyString(record['size']) ?? DEFAULT_TRAE_IMAGE_SIZE

      const now = Date.now()
      if (now < cooldownUntil) {
        const seconds = Math.ceil((cooldownUntil - now) / 1000)
        throw new TraeImageError(
          'trae image: 上一次生图刚失败过，请 ' + seconds + ' 秒后再试，以减少重复计费风险。',
          'COOLDOWN',
        )
      }

      const account = await deps.resolveAccount()
      if (account === undefined) {
        throw new TraeImageError(
          'trae image: 没有可用的 Trae 账号。请确认相关区域已登录，并已开启'
          + '「允许模型自主生图」（drawImageEnabled）。',
          'NOT_LOGGED_IN',
        )
      }

      const signal = exec.signal === undefined
        ? AbortSignal.timeout(IMAGE_TOOL_TIMEOUT_MS)
        : AbortSignal.any([exec.signal, AbortSignal.timeout(IMAGE_TOOL_TIMEOUT_MS)])

      try {
        const outcome = await deps.generate(account, { prompt, size }, signal)
        const cwd = (await deps.directoryOf?.(exec)) ?? sessionCwdOf(exec) ?? process.cwd()
        const saved = await saveTraeImage(cwd, outcome)
        const value: Record<string, unknown> = {
          url: outcome.url,
          path: saved.relativePath,
          model: TRAE_IMAGE_MODEL,
          prompt,
          size,
          hint:
            '图片由 Trae 的 ' + TRAE_IMAGE_MODEL + ' 生成，实际费用以 Trae 额度面板为准。'
            + '图片已保存到会话目录下的 ' + saved.relativePath + '，绝对路径为 ' + saved.absolutePath + '。'
            + '工具已显示图片，无需重复输出 Markdown 图片。'
            + '重新调用会生成新图片，并可能再次计费；请勿为下载原图重复生成。',
        }
        if (outcome.credit !== undefined) value.credit = outcome.credit
        return value
      } catch (error: unknown) {
        if (isBillableFailure(error)) cooldownUntil = Date.now() + FAILURE_COOLDOWN_MS
        throw error
      }
    },
  }
}

/** 从 exec 里读会话工作目录（宿主没给就返回 undefined）。 */
function sessionCwdOf(exec: TraeToolExec): string | undefined {
  const session = exec.agent?.session
  return (
    nonEmptyPath(session?.workingDirectory)
    ?? nonEmptyPath(session?.header?.cwd)
    ?? nonEmptyPath(session?.cwd)
    ?? nonEmptyPath(exec.cwd)
  )
}

/** 只在真拿到非空字符串时返回它（空串/空白/null 一律当「不知道」）。 */
function nonEmptyPath(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  return value.trim() === '' ? undefined : value
}

/** mime → 文件后缀（上游目前只回 image/jpeg）。 */
function imageExtensionFor(mimeType: string): string {
  const type = mimeType.toLowerCase()
  if (type.includes('png')) return 'png'
  if (type.includes('webp')) return 'webp'
  if (type.includes('gif')) return 'gif'
  return 'jpg'
}

/** 文件名使用本地时间戳和随机后缀，降低同一秒内多张图片重名的概率。 */
function imageFileName(mimeType: string, now: number): string {
  const date = new Date(now)
  const pad = (value: number): string => String(value).padStart(2, '0')
  const stamp = String(date.getFullYear()) + pad(date.getMonth() + 1) + pad(date.getDate())
    + '-' + pad(date.getHours()) + pad(date.getMinutes()) + pad(date.getSeconds())
  const rand = Math.random().toString(16).slice(2, 8)
  return 'trae-' + stamp + '-' + rand + '.' + imageExtensionFor(mimeType)
}

/**
 * 把图片字节写成 <cwd>/trae-images/<name>，返回绝对路径与相对路径。
 * 相对路径给 render 用：DSH 的聊天按 session cwd 解析 markdown 图片地址，
 * 再过 api/file 鉴权路由取字节，所以相对路径就能显示。
 */
async function saveTraeImage(
  cwd: string,
  outcome: TraeImageGenerated,
): Promise<{ absolutePath: string, relativePath: string }> {
  const name = imageFileName(outcome.mimeType, Date.now())
  const directory = join(cwd, TRAE_IMAGE_DIR)
  try {
    await mkdir(directory, { recursive: true })
    const absolutePath = join(directory, name)
    await writeFile(absolutePath, outcome.bytes)
    return { absolutePath, relativePath: TRAE_IMAGE_DIR + '/' + name }
  } catch (error: unknown) {
    throw new TraeImageError(
      'trae image: 图片已生成，生成请求可能已计费，但写入本地文件失败（目录 ' + directory + '）：'
      + messageOf(error) + '\n图片对象 key：' + outcome.url,
      'IMAGE_UNAVAILABLE',
    )
  }
}

/** 宿主 tools 服务里本工具用到的那一个方法。 */
export interface ToolsServiceLike {
  register(definition: unknown): () => void
}

/**
 * 把工具注册进宿主。返回 disposer；调用方负责在插件卸载时调用它。
 * 注册失败时记录警告，插件的账号与模型功能仍可继续加载。
 */
export function registerTraeDrawImageTool(
  tools: ToolsServiceLike,
  deps: TraeImageToolDeps,
): (() => void) | undefined {
  try {
    return tools.register(createTraeDrawImageTool(deps))
  } catch (error: unknown) {
    deps.logger.warn('dsh-connect-trae: 注册 ' + TRAE_IMAGE_TOOL_NAME + ' 失败: ' + messageOf(error))
    return undefined
  }
}
