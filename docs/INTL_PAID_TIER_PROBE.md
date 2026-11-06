# 国际版接口探索：付费账号是否能看到/用到不同的模型与接口

> 探索时间：2026-09-30　账号：本机国际版（TRAE SOLO，`solo-sg`），**免费账号**
> 方法：使用插件自身的认证链路和请求构造器，执行目录查询与真实聊天探测。聊天可能消耗额度。
> 本轮只有免费账号样本，未取得付费账号的对照响应。下文关于订阅后可调用的判断属于推断。

---

## 1. 本轮结论

本轮免费账号能从目录接口取得 10 个模型，并通过聊天接口调用其中部分模型。两个模型返回 `code:1005 / extra:{"plan":4}`，据此推测存在套餐授权要求。由于缺少付费账号样本，无法证明不同套餐的模型目录完全一致，也无法确认订阅后这些模型必然可用。

本轮没有发现另一个付费专属端点，现有证据支持继续研究同一端点中的套餐授权字段。

---

## 2. 探测时使用的国际版端点

| 用途 | 端点 | 备注 |
|---|---|---|
| 模型目录（骨架） | `GET /api/remote/v1/models?functions=…` | 网关 `coresg-normal.trae.ai` |
| 模型 wire 映射 | `POST /api/ide/v1/get_detail_param` | 提供 `config_name` |
| 聊天 | `POST /api/agent/v3/llm_utils_chat` | 同一端点，靠 `function` 区分模式 |
| 订阅状态 | `POST /trae/api/v1/pay/ide_user_pay_status` | 网关 `growsg-normal.trae.ai` |

## 3. 实测：免费账号看到什么

`pay_status` 原始响应里的身份字段（本机）：

```
user_pay_identity      : 0
user_pay_identity_str  : "Free"            ← 档位名称
has_package            : false
pay_identity_priority_list : [0,5,4,1,2,3] ← 档位阶梯
enable_solo_lite       : true
enable_solo_web        : true
enable_solo_builder    : false             ← 付费档能力
enable_solo_coder      : false             ← 付费档能力
last_pro_entitlement_expire_time : 1781720691
detail.permission      : 1
```

免费账号刷新国际版目录返回 **10 个**模型；目录是否随套餐变化尚缺少对照样本：

```
gemini-3.1-pro  gemini-3-flash-solo  minimax-m3  minimax-m2.7  kimi-k3
kimi-k2.5       gpt-6-sol            gpt-6-luna  gpt-5.4       gpt-5.2
```

## 4. 同一账号调用不同模型的结果

对上面 10 个逐个发起真实请求（`function` 按各自所属模式给对）：

| 模型 | 免费账号结果 | 判读 |
|---|---|---|
| `gpt-5.4`、`gpt-5.2`、`kimi-k3` | ✅ 正常出字 | 免费可用 |
| `gpt-6-sol`、`gpt-6-luna` | ⛔ `code:1005`、`extra:{"plan":4}` | 推测存在套餐授权要求 |
| 其余 | ✅（用对 `function` 后可用） | 免费可用 |

**`1005` + `plan:4` 是本探索最重要的发现**：这是上游对「模型存在、但你的档位不够」的**专门错误码**，
与 `4001 param is invalid`（请求构造/function 不对）在语义上完全不同。插件目前**不知道这两个码**：

```
# 当时的检索记录；当前源码已登记这两个错误码
grep -rn "4011\|1005" src/ tests/   →  当时零命中
```

## 5. 错误码 `4011` 的早期观察

模型只能通过**它所属的那个 `function`** 调用，用错 function 的报错也分两种：

| function | 结果 |
|---|---|
| `solo_work_remote` | 对部分模型 `4001`（param is invalid） |
| `solo_agent` | `4011` |
| `solo_agent_remote` / `chat_v3` | ✅ 成功 |
| `solo_coder` | `4011` |

探索当时，`4011` 尚未在源码或测试中出现。当前已按 429 / soft_rate 处理，1005 按 402 / hard_credit 处理。它与 `4001` 的区别（是否代表「function 不存在」vs「参数非法」）
**未证实**，需要更多样本。

## 6. 对实现的影响

1. 本轮没有发现付费专属接口。先按现有端点和授权字段处理，取得新证据后再决定是否增加端点。
2. **免费账号目前的 7 个模型是「静态兜底目录」，不是上游限制。** 本机 `regions.ai.lastCatalog`
   为空（国际版从未刷新过），于是回落到 `FALLBACK_TRAE_MODELS_AI` 的 7 个。**实测刷新后立刻变成
   10 个**（多出 `kimi-k3`、`gpt-6-sol`、`gpt-6-luna`）。也就是说这 7 个是本地状态问题，与账号档位无关。
3. **`1005` 是「可用的失败」而非「坏掉的模型」。** 免费账号在卡片上会看到 `gpt-6-*`，选中后对话
   却只得到空回复（错误码被吞）。若要改进，应在合成 SSE 时把 `1005` 翻译成可读的
   套餐授权提示。错误被吞并导致空回复属于需要修正的错误处理问题；具体提示应与上游原文及已确认的错误分类一致。

## 7. 尚缺少的证据

- **付费账号的真实响应未采样。** 本机只有免费账号，`1005/plan:4` 的**确切含义是从错误码 +
  `user_pay_identity_str:"Free"` 推断的**，不是拿付费账号实测出来的。「付费后同一模型可用」属
  **高置信推断，非实测结论**——若要坐实，需要一台已订阅账号实测一次。
- **`plan` 数值与档位的对应**未证实（只见过 `plan:4`）。`pay_identity_priority_list` 里的
  `[0,5,4,1,2,3]` 疑似档位优先级，但未验证。
- **`change_pay_identity` / 升级入口**未探测：本次只做只读查询，未尝试任何会改变账号状态的端点。
- **CN 侧是否有同样机制**未探测（本次范围是国际版）。

## 8. 历史探测命令

```bash
# 1) 用插件自身的认证链路取实时 token（不打印明文）
node /tmp/probe-intl.mjs          # 产出 /tmp/.intl-token.json（mode 600）

# 2) 列出各 function 的模型分组
node /tmp/roster.mjs

# 3) 逐个模型验证可调用性与错误码
node /tmp/ai10.mjs
```

> 探索脚本使用 `lib/` 导出的认证与请求构造函数。目录及套餐查询读取状态；逐模型聊天探测会发起真实生成，可能计费。请求字段 `max_tokens:1` 不能单独保证上游实际消费量。上述 `/tmp` 脚本是当时临时文件，当前仓库未提供，不能直接把这些命令当作现成复现工具。
