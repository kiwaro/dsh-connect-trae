# deepseek-v4.1-flash 可调用性取证

## 证据适用范围

本文保存 issue #7 后续在 2026-09-15 对小写标识 `deepseek-v4.1-flash` 的探测结果。后来出现的 `DeepSeek-V4.1-Flash-1017` 是另一标识，需要独立核对。当前 `src/index.ts` 合并多组目录，并根据实际功能映射选择调用路径；模型是否可用需要核对当前目录和对应请求结果。

参数校验失败只能说明请求到达相应处理阶段，无法单独证明授权成功或计费为零。此前的“零消耗”表述已更正；此次审核没有重新发送这些请求，也没有新增计费证据。

> 问题：用户实测 Trae IDE 的模型菜单里有 `deepseek-v4.1-flash`，但插件列表里没有；
> 追问「能不能调用 DS 4.1 这个模型」。取证时间 2026-09-15（CN 账号）。

## 结论：当次 SOLO 目录未发现该模型，直接调用失败

本轮未在已测试的 SOLO 功能中发现 **`deepseek-v4.1-flash`**。下表记录 8 组功能探测。

候选来自 Trae 安装包 `modules/ai-agent/libai_agent.dylib` 中的枚举，包含 `UIBuilder`、`SoloBuilder`、`SoloCoder`、`SoloAgent`、`SoloAgentLite`、`SoloWorkLite`、`SoloAgentRemote`、`SoloWorkRemote` 和 `SoloDesignLite`。

枚举数量与实际探测分组不同，实际结果以表中条目为准。

| function | wire 条目 | 含 v4.1 |
|---|---|---|
| `solo_work_remote` | 41 | ✗ |
| `solo_work_lite` | 41 | ✗ |
| `solo_agent` | 52 | ✗ |
| `solo_agent_remote` | 39 | ✗ |
| `solo_coder` | 44 | ✗ |
| `solo_builder` | 6 | ✗ |
| `solo_design_lite` | 24 | ✗ |
| `solo_design` / `design_lite` | 0 | ✗ |

**直接调用验证**（SOLO 通道 `llm_utils_chat`，`config_name=deepseek-v4.1-flash`）：

| function | 结果 |
|---|---|
| `solo_work_remote` / `solo_work_lite` / `solo_agent` / `solo_agent_remote` / `solo_coder` | 全部 **HTTP 200 + `code:4001`（param is invalid）** |

**remote 目录**（`solo.trae.cn/api/remote/v1/models`）在 2 凭证 × 2 host 的 8 次探测中
一致给出同样的 14 个模型，其中没有 v4.1：

```
Doubao-Seed-Evolving, Doubao-Seed-2.1-Pro, Doubao-Seed-2.1-Turbo, Doubao-Seed-Code,
glm-5.3, glm-5.2, DeepSeek-V4-Flash-Official, DeepSeek-V4-Pro-Official,
kimi-k3, kimi-k2.7-code, kimi-k2.6, minimax-m3, qwen3.8-max, qwen-3.7-plus
```

## 它属于哪里

`deepseek-v4.1-flash` 出现在 **Trae IDE（TraeCode）自己的模型菜单**（本机 Trae CN 的 renderer 日志，`model_config_name: "deepseek-v4.1-flash"`）。

IDE 的对话链路是 **`create_agent_task`（agent task 协议）**，与 SOLO 轻量通道是两套调用面。

同一批「IDE 有、SOLO 没有」的模型还包括：`glm-5.3-flash`、`kimi-k2.8-preview`。

## 令牌类型不是变量（关键澄清）

实测两类登录令牌 × 两条通道：

| 令牌 | `create_agent_task`（IDE 通道） | `llm_utils_chat`（SOLO 通道） |
|---|---|---|
| Trae IDE CN | 返回 400，提示缺少字段；完整授权状态未确认 | 200 正常流式 |
| TRAE SOLO CN | **同样通过绑定层** | 200 正常流式 |

本轮两类令牌均获得 SOLO 流式响应，说明不能仅按 IDE 与 SOLO 登录来源筛除候选。IDE 通道的 400 响应仍不足以单独证明其完整授权状态；模型集合和可调用性还需结合通道、功能与实际请求判断。

## 接入 IDE 通道的现状与未知

第一轮协议取证停在参数绑定层，未取得模型输出；该轮没有独立的计费核对记录：

- 端点：`trae-api-cn.mchost.guru/api/agent/v3/create_agent_task`（国际：`coresg-normal.trae.ai` 同路径，日志实测 289 次）
- 已还原 8 个必填字段：`conversation_id` / `session_id` / `user_id` / `device_id` /
  `agent_type`(string) / `model_name` / `ide_version` / `user_input`(**`ideagent.UserInput` 结构体**)
- `ideagent.UserInput` 的内部必填结构尚未还原，传入 `{text:…}` 仍提示缺少字段。

从安装包挖到的额外线索：

- `[create_agent_task] request body: ` 表明 IDE 存在请求体日志入口；当时本机日志为压缩格式，尚未直接读取。
- `[Hub Bridge] get_models` —— **IDE 的模型列表经本地 Hub Bridge（IPC）从 IDE 前端获取**，不走 HTTP；
  这意味着「IDE 侧模型集合」的获取本身依赖本地进程间协议，不只是换一个 HTTP 端点。
- IDE 通道使用 `conversation`、`session`、`agent_type` 和 `user_input`，与 DSH「一次请求一轮对话 +
  本地执行 tool_calls」的模型不同，接入需要一层双向协议适配。

## 复现

```bash
node scripts/probe-code-fields.mjs glm-5.3 12   # 迭代字段还原（真实请求，费用未单独核验）
node scripts/probe-code-channel.mjs glm-5.3      # 单次最小请求（真实请求，费用未单独核验）
```

（本文的 function 体检与直接调用验证可用 `scripts/probe-toolcalls.mjs` 的同款脚本改造复跑。）
