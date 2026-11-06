# issue #67 诊断：缓存命中率恒为 0%，不是插件丢了数字

> 2026-11-06 全文复核：原文关于「没有前缀缓存」「仅整请求复用」的结论已被2026-10-29的 #69 计费实验推翻。null与零只能证明这些字段的值；TTFT不足以证明内部复用机制或否定缓存折扣。保留原始实验供对照，以ISSUE69_DIAGNOSIS.md的后续证据为准。

> issue：<https://github.com/dingminhua/dsh-connect-trae/issues/67>
> （「无论简单或复杂提问，缓存命中均为百分之零」，10 个会话复现，tps 浮动 60–80）
> 诊断时间：2026-10-28　方法：读代码 + 上游实测（CN/AI 双区、4 个账号、7 个模型、4 种 function）+ DSH 会话日志
> 状态：字段转发检查未发现丢失；内部缓存机制的原判定已撤回。

---

## 0. 更正后的结论

本次样本的缓存读写计数为 0，`prompt_cache_pool_record` 为 null。转发代码保留了这些字段；null 的内部语义尚无足够证据，不能据此断言没有缓存池或没有缓存折扣。后续 #69 通过计费对照观察到了前缀缓存折扣。

延迟测量仅说明部分重复请求更快，无法确认服务端使用整请求复用，也不能排除前缀缓存。以下保留当时的原始响应和时间数据，实验没有在本轮重新执行。

## 1. 证据链（按数据流）

```text
DSH pi-ai adapter
      │  POST /v1/chat/completions（OpenAI 形状）
      ▼
src/shim.ts  回环 shim
      ▼
TraeSoloBridge                     src/solo-bridge.ts
      ▼
TraeSoloUpstreamClient             src/solo.ts
      │  POST https://trae-api-cn.mchost.guru/api/agent/v3/llm_utils_chat
      ▼
Trae SSE（200，即使拒绝也是 200）
      ├─ metadata      { prompt_cache_pool_record: null }   ← 字段值，不代表缓存机制结论
      ├─ timing_cost   { name: "llm_raw_chat_v2",
      │                  provider_model_name: "ep-20261020221437-cfj9b" }  ← 火山方舟端点
      ├─ output        { response, reasoning_content }
      ├─ token_usage   { prompt_tokens, cache_read_input_tokens: 0,
      │                  cache_creation_input_tokens: 0, ... }
      └─ done
```

### 1.1 插件侧：字段一直被正确转发

issue #10 的修复（`prompt_tokens_details.cached_tokens`）**已发版且仍在**：

- `src/sse.ts` 把 `cache_read_input_tokens` → `cacheReadTokens`；
- `src/solo-bridge.ts` 把它转成 OpenAI 的 `prompt_tokens_details: { cached_tokens }`；
- 已安装的 4.6.3 `lib/index.js` 里 `cached_tokens` 出现 2 次、`cache_read_input_tokens` 1 次。

pi-ai 1.1.0 的 `parseChunkUsage` 读 `prompt_tokens_details?.cached_tokens`，并把
`input = max(0, prompt - cacheRead - cacheWrite)`。也就是说：**只要上游给了非 0，界面就会显示**。

反证：同一个 DSH 版本里 `workbuddy` / `dsh-opencode-go` 的 `cacheReadTokens` 正常非 0 —— 显示链路
没坏。

### 1.2 上游侧：字段值为 null

`metadata.prompt_cache_pool_record` 在 **100% 的实测请求**里都是 `null`（CN/AI 双区、4 个账号、
`agent-task` / `raw-chat` / `model-detail` 三种头、以及各种字段注入）。尚未证明该字段与实际缓存或计费折扣的充分必要关系。

`timing_cost.name` 恒为 `llm_raw_chat_v2`，`provider_model_name` 是火山方舟端点 id（`ep-…`，CN 与 AI
各自不同）。这与 2026-09-22（issue #10 测量时）不是同一条服务路径。

### 1.3 复现 issue #10 的原始实验：现在是 0

`scripts/probe-cache-convention.mjs` 就是当初产出 5248 / 9216 的那份脚本，原样重新运行：

| 轮次 | prompt_tokens | cache_read（2026-09-22） | cache_read（2026-10-28） |
| --- | --- | --- | --- |
| t1 | 5258 | 0 | 0 |
| t2 | 9224 | **5248** | **0** |
| t3 | 9224 | **9216** | **0** |

同脚本在两个日期观察到不同响应，支持继续调查上游字段变化，但没有控制所有条件。

### 1.4 覆盖面：不是某个模型/区域/函数的特例

- 7 个模型 × 2 区 × 4 个 function（含 `DeepSeek-V4-Flash-Official`、`glm-5.3`、`kimi-k2.6`、
  `gpt-5.2@solo_agent_remote`），每个跑 2 轮 → 全部 `read=0 write=0`；
- 超长 prompt（92,038 tokens）CN ×3 + AI ×3 → 全 0；
- 13,511 tokens 带 tools、19,837 tokens 带 `reasoning_effort: high` → 全 0；
- 真实 agent 循环形状（稳定 system + 2 个 tool + tool_call/tool_result + 3 轮，18,936 tokens）→ 全 0；
- 手工构造 body 注入 `session_id` / `conversation_id` / `prompt_completion_id 0..3`（绕过
  `prepareSoloBody` 白名单，且 `metadata.session_id` 回显正确证明字段被采纳）→ `5235/5247/5260`
  全 `read=0`。

### 1.5 延迟实验：不能单凭 TTFT 判断缓存机制

用 `timing_cost.first_sse_event_time` 测首字节：

| 实验 | 结果 | 含义 |
| --- | --- | --- |
| 同一条请求重发 | 冷 3097 ms → 热 1207 ms | 有加速 |
| 三个**不同**前缀 A/B/C 交错 A,B,C,A,B,C | 首轮 3133/3121/2719；次轮 1037/997/683 | 按内容键控，非端点预热 |
| 预热 A 之后来一个全新前缀 D | D 仍 3125 ms（冷），再发 961 ms | 不是端点级预热 |
| **同一 25k 前缀 + 不同后缀** | **2772 ms（仍是冷的）**，自身重发 1299 ms | **共享前缀不带来加速** |
| 同一 system + 不同 user | 2910（冷）→ 1096（重发）→ 新 user 1806 / 3124 | 换 user 就重新变冷 |
| 增长中的 agent 对话 T1–T5（20035→20095） | 2897 → 1102 → 1234 → 1341 → 1009 | 每轮都是「新请求」 |

这些数据表明部分重复请求的 TTFT 较短。样本不能区分排队、模型调度和缓存机制；“整请求复用且前缀缓存关闭”的原结论已撤回。

### 1.6 上游变了的旁证：2026-10-25 真的命中过

`session-4255a972-d3df-42da-9a63-54ee984c4972`（provider `trae-global`，2026-10-25T18:43Z）的 4 行 assistant 记录，`cacheReadTokens` 依次 2048 → 41600 → 45824 → 46720，`inputTokens` 39640/4247/921/14570。

同一插件、同一账号体系，两天后归零。

IDE 侧构建版本在 10-25 与 10-27 的日志里都是 `2.3.93438`。版本号相同不能排除账号、配置、实验分组或服务端变化；现有日志不足以确定原因。

---

## 2. 排查过的插件相关假设

| 假设 | 验证 | 结论 |
| --- | --- | --- |
| #10 的转发又坏了 | `lib/index.js` 含 `cached_tokens`；单测覆盖 | 当次样本未支持该假设 |
| `prepareSoloBody` 白名单丢字段 | 手工构造原始 body 绕过白名单，结果不变 | 当次样本未支持该假设 |
| 缺 `session_id` 导致不缓存 | 手工注入并确认 `metadata.session_id` 回显 | 当次样本未支持该假设 |
| `enable_user_prompt_cache` 开关没开 | 顶层 / `extra_info` / `ab_versions` / `client_config_ab_versions` 四处注入 | 当次注入未改变管线 |
| header profile 不对 | `agent-task` / `raw-chat` / `model-detail` 全试 | 当次样本未支持该假设 |
| `app_version` 为空导致降级 | body 与 header 两种方式注入 IDE 版本号 | 当次注入后 `app_version` 仍为 `""` |
| 需要 v2 raw chat 路径 | `/api/ide/v2/llm_raw_chat` → `4001`；v1 → `4023` | 当次样本中仅 SOLO 路线可调用 |
| DSH 显示层吞了 | 同版本 `workbuddy` 正常非 0 | 当次样本未支持该假设 |

**顺带发现**：`src/sse.ts` 原本把 `metadata` / `timing_cost` 都归到 `unknown` 直接丢弃。未发现其改变答案文本或 usage 映射，
但让用户无法区分「上游字段为 null」和「插件丢了数」——这正是本 issue 的观感来源。本版改为解码为
`diagnostic` 并上报。

---

## 3. 本版改动

1. `src/sse.ts`：新增 `TraeStreamEvent` 的 `diagnostic` 变体，解码 `metadata`（`prompt_cache_pool_record`）
   与 `timing_cost`（`name` 管线名、`provider_model_name`）。**区分 `null` 与「字段不存在」**。
2. `src/solo-bridge.ts`：
   - `bridgeTraeSource` / `bridgeTraeSoloStreamOrFail` / `TraeSoloBridge` 接受可选 `log`，把上述事实
     上报（`promptCachePoolRecord` / `pipeline` / `providerModelName`）；
   - `openTraeSource` 的 peek 判定**显式排除 `diagnostic`** —— 否则 `metadata` 会被当成「已应答」，
     紧随其后的拒绝（如 1005）就会退化成截断的 200 流（issue #19 的老毛病复发）。
3. `src/index.ts`：4 个 `new TraeSoloBridge(...)` 处把 `ctx.logger.warn` 接进去。
4. 回归测试：`tests/sse.spec.ts` 解码断言；`tests/solo-bridge.spec.ts` 上报断言 + 「metadata 之后
   的拒绝仍变成 402」断言。

诊断事件不进入答案文本、不影响 usage 映射，因此保留答案文本和 usage 映射；新增诊断日志属于可观察行为变化。

---

## 4. 给用户的建议

- 0% 是这些样本的上报读数，不应仅凭0%读数断定插件丢字段；
- 缓存计费收益应参考 #69 的后续对照，TTFT 不足以确定收益来源；
- 只有上游实际返回非零缓存计数，`cached_tokens`才会显示非零 —— 插件侧已有映射逻辑；
- 日志里出现 `upstream request diagnostics` 即可确认当时的真实情况。

---

## 5. 复现命令

```bash
# issue #10 的原始脚本（对照 2026-09-22 的 5248 / 9216）
node scripts/probe-cache-convention.mjs

# 单测
pnpm vitest run tests/sse.spec.ts tests/solo-bridge.spec.ts
```
