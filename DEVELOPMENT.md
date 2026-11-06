# dsh-connect-trae 开发说明

## 本地维护与实体副本安装

本工作区的拆分边界及自检结果见 [模块拆分记录](docs/MODULE-SPLIT-PLAN.md)。本机 desktop 使用发布白名单的实体副本，安装位置和生效状态见 [部署记录](docs/LOCAL-DEPLOYMENT.md)。

下文的软链风险适用于软链安装；本工作区重新构建不会更新实体安装副本。更新安装时，应先验证，再备份和替换副本，并检查 DSH 的加载状态。

构建前的进程检测在 Windows 上使用 CIM，在其他平台使用 `ps`。Windows 凭据诊断对每个候选使用独立临时副本，退出时清理；不要把真实凭据文件或诊断副本加入版本库。

## 软链安装时的构建风险

**软链安装时，先读这一节，再运行 `pnpm run build`。**

使用软链开发时，`~/.dsh/profiles/<profile>/node_modules/dsh-connect-trae` 指向源码仓库。
运行中的 DSH 会加载本仓库的 `lib/`。此时重建会改写正在加载的客户端文件，重新导入可能导致渲染进程崩溃。本机当前采用实体副本安装，构建后需要另行复制产物。

上游记录在 2026-10-24 的 14:40:08、14:41:01 和 14:42:16 发生过三次桌面渲染进程崩溃， （`EXC_BREAKPOINT` / `SIGTRAP`），应用白屏，最后要人工重启。

取证在 `~/Library/Logs/DiagnosticReports/DeepSeek Harness Helper (Renderer)-*.ips`。

| 场景 | 行为 |
| --- | --- |
| DSH 已退出 | 运行构建并验证产物 |
| DSH 正在运行，需要核验已发布版本 | 使用 `pnpm run verify:release`，脚本在临时工作目录中重建 |
| DSH 正在运行，且使用软链安装 | 先退出 DSH，再构建和重新启动 |
| DSH 正在运行，且使用实体副本安装 | 在工作区构建；部署前核对活跃请求，再更新副本并重启 |

`scripts/warn-live-host.mjs` 在 `pnpm run build` 前检查是否有 profile 软链到本仓库，以及是否存在运行中的 DSH 进程。两项同时成立时打印警告；检测失败或命中警告均不阻断构建，执行者仍需按上表处理。

## 项目目标

本项目旨在实现一个可正常工作的 DSH Trae 接入版本。

开发路线不是直接照搬现有 Trae 项目，而是：

1. 以已经验证可用的 `dsh-workbuddy-connect` 为成功参考，研究其 DSH 接入架构和完整通信链路。
2. 以 `dsh-trae-api` 作为 Trae 侧实现资料和失败样本，定位其不可用的具体原因。
3. 将 WorkBuddy 项目中可复用的设计思想迁移到本项目，并针对 Trae 的进程、协议、认证、会话及消息机制进行适配。
4. 在本项目中完成实现和端到端验证，目标是真正可用，而非仅保持代码结构相似。

## 参考项目

早期研究使用以下目录布局；本机当前 WorkBuddy 参考位于 `D:/work/dsh-connect-workbuddy`。查阅历史项目时先确认目录实际存在。

```text
DshProject/
├── dsh-connect-trae/       # 当前实现项目
├── dsh-workbuddy-connect/  # 已验证可用的成功参考
└── dsh-trae-api/           # Trae 侧参考及失败样本
```

参考仓库：

- WorkBuddy 成功参考：<https://github.com/corrinehu/dsh-workbuddy-connect>
- Trae API 参考：<https://github.com/Wang-JQ77/dsh-trae-api>
- 当前目标项目：<https://github.com/dingminhua/dsh-connect-trae>

## 开源合规要求

本项目参考了上述与 Trae 接入直接相关的开源项目，必须遵守各自的许可证规范：

- **Trae 相关参考项目清单**：见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)，包含与 Trae 接入直接相关的架构/协议参考项目的许可证说明。
- **引入新的 Trae 相关依赖时**：必须在 `THIRD_PARTY_NOTICES.md` 中登记其名称、用途与许可证，并随包携带上游 LICENSE（直接依赖随 npm 安装自带；若手工引入第三方源码，需将许可证文本一并纳入项目）。
- **复用参考项目代码时**：早期协议研究主要借鉴架构思路，关键模块的来源说明见源码注释。直接复制或派生上游文件时，保留其版权声明与许可证头，并在 `THIRD_PARTY_NOTICES.md` 中注明来源。
- **发布时**：`package.json` 的 `files` 白名单已包含 `THIRD_PARTY_NOTICES.md`，第三方声明随 npm 包一起分发。

## 研究重点

后续分析至少覆盖以下方面：

- DSH 插件或连接器的启动与注册方式
- 宿主进程发现、启动、重连和退出处理
- 请求与响应协议以及流式事件传递
- 会话创建、恢复、取消和状态同步
- 认证信息、配置与环境变量的处理
- 工具调用及其结果回传
- 错误处理、超时、日志和诊断能力
- WorkBuddy 与 Trae 在接口和运行机制上的差异
- `dsh-trae-api` 当前失败链路及根因

## 实施原则

- 先对比并绘制三个项目的关键调用链，再确定实现方案。
- 复用 WorkBuddy 项目的架构思路，而不是未经验证地逐文件复制。
- 所有移植点都必须结合 Trae 的真实行为进行适配。
- 每个关键结论应附有代码位置、运行日志或测试结果作为依据。
- 最终以端到端可运行和可重复验证作为完成标准。

## 多平台要求

**本项目支持 macOS、Windows 与 Linux 三个平台，其中 Windows 是明确的长期支持目标：任何改动都必须考虑 Windows 影响，不得只按 macOS 行为实现。**

修改时按下表判断平台影响：

| 区域 | 平台相关？ | 说明 |
| --- | --- | --- |
| 账号读取 / 解密 / 区域判定 / 签到 / 用量查询 | 否 | 与平台无关，三平台共用 |
| 路径解析 `src/paths.ts` | **是** | `%APPDATA%` vs `~/Library/Application Support` vs `$XDG_CONFIG_HOME`；目录拼写按平台多候选探测 |
| 设备指纹 `src/identity.ts` | **是** | `x-device-type` 的平台取值，以及 `x-os-version`、`product.json` 路径与安装目录名 |
| 文件锁与原子写 | 否（宿主已处理） | 宿主 `dsh-atomic-write` 原生处理 Windows 独占创建语义 |
| 外部命令依赖 | **是** | 如 `sqlite3`（Windows 默认无）；新增外部依赖必须先确认 Windows 可用，否则必须有兜底 |

改动时的强制检查项：

1. **新增路径解析必须带平台分支**，且 Windows 分支要用多候选拼写探测——目录名未在真机验证，猜错只多一次失败的 `readFile`，漏猜则用户直接看不到登录。
2. **不得用仅大小写不同的重复候选**：Windows 文件系统不区分大小写，`trae cn` 与 `Trae CN` 是同一个目录。
3. 新增外部程序或 POSIX 专有能力依赖时，先确认 Windows 行为，再提供失败时的替代处理，并在 README「Windows 说明」登记限制。例如新增 `sqlite3` 依赖前应核对 Windows 是否安装该程序。
4. **CI 必须在 `windows-latest` 上通过**（`.github/workflows/ci.yml` 已配置 `ubuntu-latest` + `windows-latest` 双平台矩阵）。新增测试若只覆盖 POSIX 语义，等于没有验证 Windows。
   - **Windows runner 明显更慢，首个用例承担冷启动**：`vitest.config.ts` 的 `testTimeout` 已相应设为 20s（实测首个用例可达 9.4s）。**出现超时先分清是冷启动还是回归**：只有每个文件的第一个用例慢、同文件其余用例在毫秒级 → 冷启动；原本很快的用例在**所有**平台都变慢 → 真实回归。**不得靠放宽断言来消除超时。**
   - **时间相关断言要留足余量**：Windows 上 `setTimeout` 与文件系统调用的抖动比 macOS 大，涉及真实时钟的测试不要贴着边界写。
5. **平台相关结论必须区分「已验证」与「未验证」**：macOS 可本机验证，Windows / Linux 目录名等未在真机确认的项，一律在 README 与 `docs/WINDOWS_TOKEN_PROBE.md` 标注为**未验证项**，不得写成既成事实。
6. **文档同步**：新增平台差异时同步更新 README「平台支持」表与「Windows 说明」，以及 `docs/WINDOWS_TOKEN_PROBE.md` 的排查步骤。

依据与背景见 `docs/WINDOWS_TOKEN_PROBE.md`（真机回报清单）与 `CHANGELOG.md` 2.3.1「Windows 多候选目录探测」。

## 对外发布基准

对外 README、npm 包组织、发布文档和发布操作，以团队自己的项目 `dsh-subagent-default-model` 为主要基准：

- 本机参考目录：`../dsh-subagent-default-model`
- GitHub：<https://github.com/dingminhua/dsh-subagent-default-model>
- 根 README：用于 GitHub 项目主页，包含项目定位、亮点、工作原理、截图、安装、配置、开发、卸载、许可证和徽章。
- npm README：包目录内提供中文 `README.md` 与英文 `README.en.md`。
- 发布记录：维护包内 `CHANGELOG.md`。
- 发布流程：在仓库顶层维护 `RELEASING.md`，作为唯一权威发布说明。
- npm 元数据：完整维护 description、keywords、author、license、repository、homepage、bugs、engines、exports、files、DSH bundle/client 声明。
- 发布包白名单：通过 `files` 明确限定构建产物、产品截图、bundle patch、双语 README、CHANGELOG、第三方声明和 LICENSE。
- 发布前验证：测试、构建、`npm pack --dry-run`、版本与 CHANGELOG 核对。
- 发布后验证：核对 npm `version` 与 `dist-tags.latest`，并验证 DSH 从 npm 安装后的实际加载。
- GitHub 发布形态：使用版本提交和带说明的 annotated tag，tag 必须指向包含对应代码与版本号的提交。

`dsh-subagent-default-model` 只作为**对外展示和发布工程**的基准；`dsh-connect-trae` 的内部模块划分、协议适配、安全边界和测试结构根据 Trae 接入需求独立设计，以 `docs/IMPLEMENTATION_PLAN.md` 为准。

任何真实发布、Git push、tag 或 npm publish 都必须在用户明确确认后执行。

## 本地模型目录策略

当 Trae 模型发现接口因版本或私有认证封装不可用时，供应商使用版本化的本地静态模型目录。目录只收录本机 Trae 日志、界面选择器或 `MetadataHandler` 中实际观察到的模型；每项记录其来源，并注明观察时间与置信度。

模型能力按“模型ID + function/Agent模式”记录，因为同一模型在`solo_work_lite`与`solo_agent_lite`下可能具有不同上下文窗口、输出上限和功能。

思考强度只有在模型元数据明确给出`reasoning_effort_options/default_reasoning_effort`时才列出具体档位；UI仅显示selector时只记录`reasoningSupported: true`，不得虚构档位。

当前已确认的低成本测试模型为`DeepSeek-V4-Flash-Official`，显示名`DeepSeek-V4-Flash 正式版`，在`solo_work_lite`日志中确认输入窗口168000、非多模态、支持reasoning功能入口。

## 文档同步与验收

参照 WorkBuddy 的文档审查方法，先按文件列出资料，再区分当前操作说明、历史研究和发布记录。更新当前说明时核对源码入口与测试。历史版本与测量数据保留原值，协议标识和原始日志保持可追溯。逐文件状态见 [文档同步检查记录](docs/DOCUMENT-SYNC-AUDIT.md)。

中英文 README 的公共操作说明保持对应；Trae 的签到、企业通道和国际版套餐按自身实现说明。界面改动需要同步提示、截图说明与测试。类型检查和单元测试通过后构建，部署到实体安装目录及 desktop 依赖副本，核对哈希并重启 DSH。实际页面尚未验证时，记录为待验证。
