# issue #67 回复草稿（更正）

2026-10-28 样本的缓存计数均为 0，metadata 中的 `prompt_cache_pool_record` 为 null。已检查插件字段映射，未发现丢失。

此前据此断言“没有前缀缓存池”，并把较短 TTFT 解释为“整请求复用”，证据不足，现撤回。后续 #69 的计费对照观察到前缀缓存折扣，说明零计数和 null 不能用于否定缓存收益。

4.6.4 增加了 metadata 与 timing_cost 诊断转发，并确保诊断帧不会使后续业务拒绝退化为截断的 200 响应。这些日志记录字段值，不证明服务端内部机制。

原始测量见 [诊断记录](ISSUE67_DIAGNOSIS.md)，后续计费证据见 [#69](ISSUE69_DIAGNOSIS.md)。本轮只复核资料，没有重新发送计费请求。


## 1. 保留的历史计数

同一 `scripts/probe-cache-convention.mjs` 的原始记录如下。该表用于核对字段转发与上游计数变化，不足以隔离全部服务端变量。

| 轮次 | prompt_tokens | 2026-09-22 cacheRead | 2026-10-28 cacheRead |
| --- | ---: | ---: | ---: |
| 1 | 5258 | 0 | 0 |
| 2 | 9224 | 5248 | 0 |
| 3 | 9224 | 9216 | 0 |

2026-10-25 的 `trae-global` 会话还记录过 `cacheReadTokens` 序列 `2048 → 41600 → 45824 → 46720`。这些测量说明不同日期出现过不同计数，不能单凭 2026-10-28 的零值否定缓存收益。

## 2. TTFT 对照及已撤回的推断

当时用 `timing_cost.first_sse_event_time` 记录首个 SSE 事件时间：

| 条件 | 历史记录 |
| --- | --- |
| 同一请求重发 | 3097 ms → 1207 ms |
| 相同 25k 前缀、不同后缀 | 2772 ms |
| 相同 system、不同 user | 2910 → 1096 ms（重发），新 user 为 1806 / 3124 ms |

这些时间存在差异，但单次对照未隔离排队、负载、路由和其他变量。原稿据此判断“只有整请求复用、没有 token 级前缀缓存”，该推断已撤回；#69 的计费证据应与此表共同阅读。

## 3. 诊断帧与 peek 规则

4.6.4 增加 `metadata` / `timing_cost` 解码及诊断输出，历史日志形状为：

```text
dsh-connect-trae: upstream request diagnostics
  { model: 'deepseek-v4.1-flash', promptCachePoolRecord: null, pipeline: 'llm_raw_chat_v2' }
```

字段明确为 `null` 与字段缺失是不同的响应形态，两者均不能单独证明服务端没有计费折扣。`cached_tokens` 和 `cache_read_input_tokens` 的映射仍需按当前解析器核对。

peek 阶段必须将诊断事件排除在“已收到业务响应”之外。否则先收到 `metadata`、再收到 `1005` 等业务拒绝时，插件可能提前提交 HTTP 200，后续只能形成截断流。对应回归应覆盖“诊断帧在前、业务错误在后”的顺序，而不仅检查诊断日志是否出现。
