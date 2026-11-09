# 隐私与凭据安全（Privacy & Credential Safety）

> **本文档是关于「哪些信息禁止进入本仓库与发布物」的权威说明。**
> 发布流程见 [`RELEASING.md`](RELEASING.md) 第 1.5 节；那里的门禁与本文档是同一份规则的
> 两个落点，改一处要同步另一处。

## 1. 公开内容的处理原则

**所有可能离开本机的内容均按公开材料处理。**

本仓库通过以下三个渠道公开内容，内部文档同样适用隐私要求：

| 公开渠道 | 内容范围 |
| --- | --- |
| GitHub 仓库（含 `raw.githubusercontent.com`） | 全部源码、`docs/`、`tools/`、测试夹具、图片 |
| npm 包（`package.json` 的 `files` 白名单） | `lib/`、`icons/`、三张产品图、双语 README、CHANGELOG、`scripts/verify-windows.mjs` |
| 第三方市场（dshfind 等） | 直接引用 GitHub 上的图片 URL，**改图即自动生效** |

测试夹具与本地脚本同样需要脱敏。夹具数据可能被渲染到截图中，并随 README 与 npm 包公开。

## 2. 必须脱敏的信息

| 类别 | 例子 | 处置 |
| --- | --- | --- |
| 账号名 / 昵称 | Trae 的 `一个昵称`、`用户<n>` | 用 `tools/demo-accounts.ts` 的 `DEMO_*`，或 `demo-*` |
| 账号 id / 用户 id | 9 位数字 id、`userId`、`tenantId` | 同上，保持长度特征但不保留真实值 |
| 凭据 | 访问令牌、刷新令牌、`Authorization` 头、cookie | **任何情况都不出现**，包括任何真实值片段 |
| 设备标识 | `x-device-id`、`telemetry.machineId`、`telemetry.devDeviceId` | 仅说明**格式特征**（位数、是否纯数字），见 `src/redact.ts` |
| 本机身份 | `C:\Users\<real name>`、`/Users/<real name>`、本机用户名 | `maskUserPath()` 换成 `<user>` |
| 真实余额 / 用量 | 具体积分数、积分包数与总额 | 合成值 |
| 真实邮箱 | 个人邮箱 | 不出现（`@dmh2002/` 这种**已公开的 npm scope** 除外） |
| 时间 | 令牌到期时刻、刷新时刻、签到时刻 | 相对时间或合成值 |

`一个昵称` 有一处**例外且必须保留**：LICENSE 的版权行与 `package.json` 的 `copyright`
字段。它是许可证要求，不是泄露。账号数据仍需脱敏，许可证要求的版权署名必须保留。

## 3. 图片脱敏要求

v4.10.0 的产品图曾用马赛克覆盖账号名，存在以下问题：

1. **仍保留可识别特征。** 马赛克是对原始像素做块平均，块数远少于字符数时，长度、数字/字母构成
   与部分笔画仍可分辨（该图片中约 15 个 18px 方块覆盖一个约 270px 宽的账号名）。
2. **容易遗漏其他敏感区域。** 检查者容易因已打码而跳过其他区域。该历史图片中另外两个账号名仍为明文，
   因此处理后必须复核整张图。

可采用以下两种方式脱敏：**用演示数据重新生成图片**，或**整块不透明色块**覆盖。用户要求实际截图时，必须使用实际截图并覆盖敏感区域，不得以合成图片替代。

## 4. 自动化检查

| 位置 | 作用 | 执行方式 |
| --- | --- | --- |
| `tests/privacy.spec.ts` | 单测：扫描**整个仓库**的文本文件（夹具 `accountName` 字面量必须是 `DEMO_*` 或合成形状、不含真实账号标识、不含个人 home 路径），并确认版权署名仍在 | `pnpm test`（**不在** `verify:privacy` 里） |
| `scripts/verify-privacy.mjs` | 发布前：PNG 字节流与渲染文本、随包文本、版权署名仍在、版本与 CHANGELOG 一致 | `pnpm run verify:privacy` |
| `prepublishOnly` | 在 `npm publish` 前执行发布隐私检查；检查失败或缺少 OCR 后端时中止发布 | 自动，无需手动执行 |
| `src/redact.ts` | 运行期脱敏助手（`maskUserPath` / `describeNameShape` / `describeIdShape`），供 `scripts/verify-windows.mjs` 的公开回报使用 | 由该脚本调用 |

> 两道检查**分别执行**：`verify:privacy` 仅检查发布物，`pnpm test` 覆盖源码与文档。发布前两个均须通过。

`scripts/verify-windows.mjs` 的输出是**已脱敏**的：路径中的用户部分替换为 `<user>`，账号名与
设备号仅显示格式特征。该输出可用于提交 issue。新增本机状态诊断脚本时，必须复用 `src/redact.ts` 中的脱敏函数。

## 5. 本机用户数据存储

插件不会将凭据写入 DSH 设置。刷新得到的 token 按区域写入
`$DSH_HOME/.trae-auth.cn.json` / `.trae-auth.ai.json`，以 `mode 0o600`（Windows 忽略
POSIX 权限位，属已知无害差异）写入；导出的账号 JSON 包含**有效 Token**，README 中已明确
提示「请当作密码保管」。这些文件位于仓库之外，不包含在发布包中。

## 6. 新增截图或示例的检查清单

- [ ] 示例数据统一引用 `tools/demo-accounts.ts` 的常量
- [ ] 示例余额、时间和设备标识使用合成值
- [ ] 演示名长度与真实数据同量级（否则版式测量失真）
- [ ] 敏感区域已使用完整不透明色块覆盖，未使用马赛克或模糊处理
- [ ] `pnpm run verify:privacy` 全部通过，且 OCR 那一行是 `OK` 而不是 `SKIP`
