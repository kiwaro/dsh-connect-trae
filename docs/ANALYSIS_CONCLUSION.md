# 分析阶段结论与开发交接

## 1. 适用阶段

本文记录早期协议分析结束时的状态。下文的 503、HTTP 400 和开发待办均属于该阶段。后续采用的调用路线见 [SOLO 路线决策](SOLO_ROUTE_DECISION.md)；当前 `src/index.ts` 创建 `TraeSoloUpstreamClient` 并通过 `TraeSoloBridge` 接入对话。

排查当前版本时使用 README 和实际源码，历史探测数据保留原值。

## 结论

本阶段已形成三个项目的架构比较与失败分析。Trae 本机认证、设备身份和流式协议的证据记录在本文引用的研究资料中；实施路线与发布要求分别由对应计划说明。本文所列历史探测尚未在此次文档审核中重新执行。

这不等于产品已经可用。当前项目已完成安全骨架和离线协议模型，但真实Trae模型调用仍故意返回503，因为Raw Chat v2必填顶层字段尚未恢复。

## WorkBuddy成功因素

- 真正注册DSH LLM adapter和provider目录，而非只启动代理端口。
- PiAiAdapter -> 安全loopback shim -> upstream分层。
- DSH负责会话、工具、权限和compaction。
- 桌面凭据只读，DSH副本原子写、锁和0600权限。
- 单飞刷新、静态目录兜底、动态刷新、错误分类、完整disposer。
- Host/Origin/Content-Type/per-process secret防御本地滥用。
- 60个单元/集成测试和live E2E脚本提供证据。

## dsh-trae-api主要失败根因

1. 没有注册DSH adapter/provider；启动9220端口不等于接入DSH。
2. 使用固定端口，启动失败时仍可能报告成功；认证失败后继续监听，退出时也未完整释放资源。
3. 明文`.env`保存token、日志打印token前缀、无原子写和权限保护。
4. 每请求随机machine/device ID并硬编码Windows。
5. 把三个语义不同端点用同一个body盲试。
6. 把标题接口`llm_utils_chat`当主聊天首选。
7. 工具调用主要靠提示词/XML模拟；OpenAI/Responses没有完整结构化输出。
8. 宽泛cleanContent可能删除DSH系统约束。
9. 模型目录硬编码，缺少上游发现和上下文证据。
10. 无测试、typecheck、build和可靠live E2E。
11. 使用固定的公开 API 密钥并允许宽松的跨域访问；上游请求缺少取消处理与超时限制。
12. macOS/Linux认证路径不正确。

## 当前实现成果

- TypeScript/tsdown/Vitest/pnpm工程。
- DSH `trae` provider、PiAiAdapter、settings和静态目录。
- 安全随机端口shim与请求取消。
- macOS/Windows/Linux四edition路径。
- tc/明文内容检测、AES-CBC解密、SHA-512完整性校验。
- 只读桌面凭据、DSH安全副本、单飞刷新和expiry策略。
- 官方身份映射：`telemetry.machineId`与`icube-dc:<id>`。
- 通用SSE解析和unknown保留。
- Agent endpoint、Raw Chat endpoint、请求/响应离线模型。
- 默认dry-run、单端点、脱敏的Raw Chat探测器。

## 真实探测结果

用户批准后只执行了一次v2短请求：

- Endpoint：`/api/ide/v2/llm_raw_chat`
- 提示长度：22字符
- 最大输出：8 tokens
- 无工具、无回退
- 结果：HTTP 400、空响应体

结论：OpenAI式核心字段方向有二进制证据，但仍缺Trae必填extra/config字段。在获得新证据前不应继续枚举式试错。

## 下一开发入口

优先级从高到低：

1. 恢复`LLMRawExtraInfo`和v2顶层必填字段，可从新版本bundle、调试符号、官方客户端更新或经授权的Trae debug日志获得。
2. 将真实Raw Chat event结构制作成完全脱敏fixture。
3. 实现`TraeRawChatUpstreamClient`，仅支持一个已验证endpoint，无自动回退。
4. 接入现有shim，完成adapter -> shim -> upstream离线回放。
5. 再经用户批准执行一次短live probe。
6. 成功后运行DSH真实Provider E2E，并开始README/CHANGELOG/RELEASING准备。

## 禁止提前执行

- 不把当前HTTP 400草案接入正式upstream。
- 不尝试v1或Agent Task自动回退。
- 不重复发送字段组合猜测请求。
- 不宣传项目已经可用或完整支持工具调用。
- 不发布npm稳定版本。

## 文档索引

- `DEVELOPMENT.md`：目标、参考仓库和发布基准。
- `docs/ANALYSIS.md`：详细比较和逐轮证据。
- `docs/PROTOCOL_EVIDENCE.md`：协议证据矩阵和联网门槛。
- `docs/ARCHITECTURE_DECISION.md`：Raw Chat优先决策。
- `docs/IMPLEMENTATION_PLAN.md`：分阶段实施状态。
- `docs/PUBLIC_RELEASE_GUIDE.md`：对外README和发布工程基准。
