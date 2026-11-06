# glm-5.3 的 CN 模型目录与调用通道取证

## 后续修正

本文记录 2026-09-15 初轮探测。该轮只验证下文列出的功能，不能据此推断所有 SOLO 功能均不可调用 `glm-5.3`。

后续在 `solo_work_remote` 上取得正常流式结果，当前 `src/solo.ts` 与 `src/catalog.ts` 因此按模型目录保存并回放其所属功能。

下文初轮返回值保留，排查当前版本时应核对模型的实际功能映射。

> 对应 issue #7「模型列表需要更新：traecode 有 glm 5.3 但这边只有 5.2」。
> 取证时间为 2026-09-15，使用本机 Trae CN 桌面版账号。记录包括目录读取与下表所列的受控对话请求。

## 初轮结论

**用户没有看错，插件也没有漏读——这是上游「目录」与「调用通道」的不一致。**

`glm-5.3` 在 Trae 的模型目录里是一个**完整的预设模型**（与 glm-5.2 同等标志），
但本轮通过 SOLO 端点 `/api/agent/v3/llm_utils_chat` 的指定功能**无法调用它**：
本轮对下表中的四个 `function` 均收到 `4001 param is invalid`。

因此插件把它从可勾选目录中剔除是**有意的防御**：否则用户选中后在 Trae 侧每次对话
都会失败。该剔除行为属于当时实现，后续功能映射已调整。

## 证据

### 1. 目录侧：只读请求返回 HTTP 200

CN 目录接口 `solo.trae.cn/api/remote/v1/models` 的两个分组都将 glm-5.3 列为预设模型：

| 字段 | glm-5.3 | glm-5.2 | 结论 |
|---|---|---|---|
| `is_preset` | true | true | 同 |
| `config_source` | 1 | 1 | 同 |
| `max_mode` | true | true | 同 |
| `context_window_tokens` | `{dev:200000, max:1000000}` | 同 | 同 |
| `features.consumption_rate` | `{enable:true, rate:0.78}` + 会员折扣 50% → 0.39 | 同结构 | 同 |
| `features.reasoning` | `{enable:true}` | 同 | 同 |
| `is_new` | **true**（新上线） | false | 差异 |

### 2. 调用侧：已测试的四个功能均拒绝请求

使用插件的 `prepareSoloBody` 与 `buildTraeCnHeaders` 构造请求，消息要求模型只回复 `OK`：

| 模型 | function | 结果 |
|---|---|---|
| glm-5.2（对照） | `solo_work_lite` | **HTTP 200 + SSE `delta("OK")`** → 请求构造正确 |
| glm-5.3 | `solo_work_lite` | HTTP 200，SSE `event:error {code:4001, message:"the param is invalid"}` |
| glm-5.3 | `solo_agent` | 同上 4001 |
| glm-5.3 | `solo_agent_lite` | 同上 4001 |
| glm-5.3 | `inline_chat` | 同上 4001 |

对照实验证明**不是探测方法的问题**：同一份 body/headers/时间窗，glm-5.2 正常出字。

### 3. config 集合里确实没有 glm-5.3（只读）

`get_detail_param` 各 function 均无 glm-5.3 的 `config_name`：

| function | 条目数 | glm 系列 |
|---|---|---|
| `solo_work_lite` | 41 | glm-5.2 / glm-5-turbo / glm-5 |
| `solo_agent` | 52 | glm-5.2 / glm-5.1 / glm-5 / glm-4.7 … |
| `solo_agent_lite` | 35 | glm-5.2 / glm-5.1 / glm-5 |

定向查询对照：`config_names:['glm-5.2']` → 返回 4 条（方法有效）；
`config_names:['glm-5.3']` → **0 条**。

## 为什么 Trae IDE 里能用而插件不能

Trae IDE 的对话走 **`create_agent_task`（agent task 协议）**，与插件使用的 SOLO 轻量端点 `llm_utils_chat` 是两套不同的调用协议：前者需要完整的任务请求体 及另一套 SSE 事件集。

1.0 阶段记录的完整请求体约 146KB，后者使用简化的 OpenAI 风格 envelope。glm-5.3 只在前者的 config 集合里。

相关早期判断见 `CHANGELOG.md` 1.1.0。该判断后来因发现可调用的功能而修正，不能用初轮结果解释当前目录中的全部模型。

## 可选的后续方向

1. **（低风险）在卡片上显式标注**：把"目录已提供、当前通道不可用"的模型列为
   可见但不可勾选的行（带说明），替代当前的静默剔除。
2. **（高成本）实现 agent-task 通道**：可覆盖 glm-5.3 这类模型，但需要完整协议
   取证与实现，且与现有 SOLO 通道并存会增加维护面。
3. 维持现状，在 issue 中说明原因。

## 复现方式

- 只读探测：`scripts/probe-intl.mjs` 的 CN 变体（本文件证据 1、3 的命令片段见
  commit 记录）
- 受控对话：`scripts/probe-cn-glm53.mjs`（每次运行发两次最小请求，消耗少量额度）
