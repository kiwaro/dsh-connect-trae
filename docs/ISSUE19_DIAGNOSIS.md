# issue #19 诊断：国际版模型取不全 + 会员状态显示错误

> 2026-11-06 全文复核：记录2026-10-01的初次诊断。4011的旧判断已由 #33 / v3.4.1 推翻，当前分类为429限流；1005为402订阅限制。目录并集、会员显示与错误透传已陆续修复，文中源码位置和零命中统计属于修复前。

> issue：https://github.com/dingminhua/dsh-connect-trae/issues/19
> （ckcfcc：「国际版好像取不够模型呢？」——Pro 会员，随附卡片、订阅状态、调用失败三张截图）
> 诊断时间：2026-10-01　方法：逐项复现 + 上游目录查询与真实对话
> 结论：**用户报的是三个独立问题，不是同一个。** 其中一个（模型取不全）已定位到确切代码行。

---

## 0. 三个症状，三个不同的根因

| # | 用户描述 | 根因 | 严重度 |
|---|---|---|---|
| 1 | 「取不够模型」——IDE 里有 GPT-5.5/5.6/6-Astra，插件没有 | `solo-remote.ts` 只读 `solo_agent_remote` **一个组**，丢弃 `solo_agent` 组的 9 个模型 | **功能缺失** |
| 2 | 「刷不出来会员状态」——Pro 却显示「暂无有效套餐」 | 卡片只看 `has_package`，**完全没读** `user_pay_identity_str`（上游的档位字段） | **显示错误** |
| 3 | 「无法调用模型」——`Stream ended without finish_reason`（TRANSPORT） | 订阅检查 `1005` 被当作普通流中断，**错误信息在 HTTP 边界丢失** | **诊断信息丢失** |

三者互不相关：修好任何一个都不会影响另外两个。

---

## 1. 症状一：模型取不全（根因已定位到行）

### 证据：用户 IDE 显示的模型，正是插件丢弃的那一组

用户 Pro 账号的 Trae IDE 显示（截图 issue-b.png）：

```
Seed-2.1-Turbo, GPT-6-Astra, GPT-6-Sol, GPT-6-Luna,
GPT-5.6-Sol, GPT-5.6-Terra, GPT-5.6-Luna, GPT-5.5, GPT-5.4, GPT-5.2, GLM-5.2
```

本机（免费账号）实测上游两个组的模型集：

```
solo_agent        : 19 个
solo_agent_remote : 10 个   ← 插件只取这一组
```

「只在 `solo_agent`、插件因此看不到」的 9 个：

```
Dola-Seed-2.0-Code, deepseek-v4-flash-0731, glm-5.2, gpt-5.5,
gpt-5.6-luna, gpt-5.6-sol, gpt-5.6-terra, gpt-6-astra, kimi-k2.7-code
```

**用户 IDE 里多出来的模型，与这个差集完全吻合**（`gpt-6-astra`、`gpt-5.6-*`、`gpt-5.5`、`glm-5.2`）。

### 确切代码位置

`src/solo-remote.ts:62-66`：

```ts
const response = await this.fetchImpl(`${base}/models?functions=solo_agent_remote,solo_work_remote`, …)
const groups = json.data?.list ?? []
const preferred = groups.find(group => group.function === 'solo_agent_remote') ?? groups[0]
for (const raw of preferred?.models ?? []) { … }   // ← 只遍历 preferred，其他组整个丢掉
```

两个问题叠加：**查询里没带 `solo_agent`**，且即使带上也**只取 `preferred` 一个组**。

### 修复已验证可行

把 `solo_agent` 加进查询并取**所有组的并集**后，19 个模型全部可见，覆盖用户 IDE 里的 11 个中的 10 个
（唯一未覆盖的是 `Seed-2.1-Turbo`——其区域归属当时没有验证，不能据此断言国际版不应出现）。

> ⚠️ **但「可见」不等于「可用」**，见下一节——这正是修复需要配套处理的地方。

---

## 2. 症状一的配套问题：并集会把不可调用的模型也放进来

本插件有一条既有的防御设计（`catalog.ts` 的 wire join）：remote 目录行**必须**在
`get_detail_param`（wire map）里找到 `config_name`，否则丢弃——因为「广告一个每次调用都失败的模型」
比「不显示」更糟。

实测恢复的 9 个模型，在本机**免费账号**上的可调用性：

| 模型 | 结果 |
|---|---|
| `kimi-k2.7-code` | ✅ 经 `chat_v3` 可调用 |
| 其余 8 个 | ❌ 所有 function 均 4001 / 4011 |

所以**不能简单地把并集全丢给用户**。修复必须让并集仍然经过 wire join + function 归属校验，
这需要一并调整 wire 查询的 function 列表（当前只用 3 个）。

---

## 3. 症状二：Pro 会员显示「暂无有效套餐」

### 根因

卡片判据是 `payStatus.hasPackage`（`TraeUsageCard.tsx:730`），而它的来源只有上游的 `has_package`：

```ts
hasPackage: flag('has_package'),
```

但上游同时返回了**真正的档位字段**：

```json
"user_pay_identity": 0,
"user_pay_identity_str": "Free",
"pay_identity_priority_list": [0, 5, 4, 1, 2, 3]
```

**`user_pay_identity` / `pay_identity_priority_list` 在插件源码中零引用**：

```
grep -rn "user_pay_identity\|pay_identity" src/   →   零命中
```

对 Pro 账号，`has_package` 很可能仍为 `false`（该字段语义更接近「是否持有某个**套餐包**」，
而非「是否付费会员」），于是卡片把 Pro 显示成「暂无有效套餐」。

> ⚠️ **未证实**：本机只有免费账号，**无法采样 Pro 账号的 `has_package` 实际取值**。
> 「Pro 的 has_package 仍为 false」是从「用户截图显示无套餐 + 用户自称 Pro」反推的，
> 需要一台 Pro 账号实测确认。**但无论 `has_package` 取值如何，插件不读档位字段都是缺陷**——
> 它把唯一的权威档位信息丢掉了。

---

## 4. 症状三：调用失败的报错不可读

### 完整因果链（已逐步实测）

1. 对订阅兼容性检查模型，上游返回 **HTTP 200** + SSE：
   ```
   id:1
   event:error
   data:{"code":1005,"message":"","extra":"{\"plan\":4}"}
   
   id:2
   event:done
   data:{"finish_reason":"stop"}
   ```
2. 插件 bridge **正确识别**了它（`solo-bridge.ts:73`），设置 `upstreamError`
3. 但随后 `event:done` 到达时，代码选择 `controller.error(upstreamError)`
   （`solo-bridge.ts:125`）——**中途打断响应流**
4. HTTP 头早已以 200 发出，pi-ai 侧只能看到「流被截断」，于是报：
   ```
   Stream ended without finish_reason        ← 用户看到的
   ```
   真正的 `code 1005 / plan 4` **在边界处丢失**

实测复现（把上游真实字节传给插件自己的 bridge）：流被中断，**未发出任何 `finish_reason`**，
与用户截图完全一致。

### 附带发现：`1005` 与 `4011` 都是插件不认识的新错误码

```
grep -rn "1005\|4011" src/ tests/   →   零命中
```

| 码 | 含义（本轮实测推断） | 证据 |
|---|---|---|
| `4001` | param is invalid（旧已知） | 既有文档 |
| `1005` | **订阅检查**，带 `extra:{"plan":N}` | 仅订阅模型返回；免费账号可见 |
| `4011` | **旧误判：该 function 不提供此模型；后由 #33 更正为限流** | `gpt-5.4` 在 `solo_work_remote`/`agent_remote` 正常、在 `solo_agent` 返回 4011 |

当时的对照实验没有排除按通道限流，因此不能支持原来的 `4011` 归属判断；
`1005` 的「付费后可用」仍是**推断**，未用 Pro 账号实测。

---

## 5. 建议的修复顺序

| 优先级 | 改动 | 理由 |
|---|---|---|
| **P0** | 明确告知 `1005` | 用户现在看到的是误导性的 TRANSPORT 错误，会去查网络问题。至少让错误信息带上「该模型需要订阅」 |
| **P1** | 读 `user_pay_identity_str` 显示档位 | 纯显示层，风险低；直接修好用户明确抱怨的「刷不出来会员状态」 |
| **P2** | remote 目录取所有组并集 + 扩展 wire function 列表 | 功能最实质，但牵连 wire join 与可调用性校验，需要配套测试（否则会引入「看得见点不动」的模型） |

### 需要用户（issue 作者）配合的地方

P0/P2 的正确性都依赖 **Pro 账号的真实响应**，而本机只有免费账号。若作者愿意提供以下**脱敏**信息，
可以把「推断」变「实测」：

1. Pro 账号下 `POST /trae/api/v1/pay/ide_user_pay_status` 的
   `user_pay_identity_str` / `has_package` / `enable_solo_*` 取值；
2. 对 `gpt-5.6-sol` 这类模型发一次请求的 SSE 首行（含 `code` 与 `extra`）。

---

## 6. 未证实 / 边界

- **Pro 账号的响应未采样**：症状二的关键前提（`has_package` 对 Pro 仍为 false）与症状一的
  「恢复的模型对 Pro 可用」都是**推断**，非实测。
- **`1005` 的 `plan` 数值语义未验证**（只见过 `plan:4`；`pay_identity_priority_list`
  疑似档位优先级，未证实）。
- **`Seed-2.1-Turbo` 归属未查**（推测为 CN 区域模型，未验证）。
- 本次包含 `models`、`get_detail_param`、`pay/status` 只读查询及真实对话。对话可能扣减积分；`max_tokens:1` 不能保证上游执行该限制。
