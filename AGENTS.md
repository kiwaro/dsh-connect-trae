# 项目维护规则

本文适用于本仓库的维护者与 AI 助手。隐私要求以 [`SECURITY.md`](SECURITY.md) 为准，发布流程见 [`RELEASING.md`](RELEASING.md)。

## 1. 隐私保护

修改前必须阅读 `SECURITY.md`。所有可能离开本机的内容均按公开材料处理，包括源码、注释、测试夹具、本地脚本、文档及图片。

本项目的公开渠道包括 GitHub 仓库（含 `raw.githubusercontent.com`）、npm 包（`files` 白名单）和第三方市场。第三方市场可能直接引用 GitHub 图片，仓库中的图片变更可能同步影响市场展示。

### 1.1 示例信息与占位符

| 类别 | 处理要求 |
| --- | --- |
| 账号名 / 昵称 | 使用 `tools/demo-accounts.ts` 的 `DEMO_NICKNAME` 或 `demo-*` |
| 账号 id / 用户 id | 使用 `DEMO_NUMERIC_ID`，保留长度特征，不保留真实值 |
| 余额 / 用量 | 使用 `DEMO_CREDITS` 中的合成值 |
| 凭据（token / cookie / `Authorization`） | 禁止出现真实值及其片段 |
| 设备标识 | 仅说明位数、是否纯数字等格式特征，参见 `src/redact.ts` |
| 本机路径 | 将 `C:\Users\<real>`、`/Users/<real>` 中的用户部分替换为 `<user>` |
| 个人邮箱 | 禁止出现真实值；已公开的 npm scope `@dmh2002/` 不属于个人邮箱 |

### 1.2 图片脱敏

- 马赛克、模糊与半透明遮罩不符合脱敏要求，可能保留字符宽度、亮暗分布及字形特征。v4.10.0 的产品图曾使用约 15 个 18px 方块覆盖约 270px 宽的姓名区域，且遗漏了另外两个账号名。
- 可使用合成数据生成图片，或使用完整的不透明色块覆盖敏感区域。用户明确要求实际截图时，必须使用实际截图并进行不透明覆盖，不得以合成图片替代。
- 使用合成数据的出图脚本应统一引用 `tools/demo-accounts.ts`，不得分别维护重复常量。
- 新增或替换 `docs/assets/` 下的图片后，必须打开成品并人工检查可读信息。

### 1.3 公开身份信息

必须保留维护者版权署名与公开 npm scope `@dmh2002/`。核对位置包括 `LICENSE`、`package.json` 的 `copyright`、双语 README 和 `RELEASING.md` 的核对命令。

署名原文以 `LICENSE` 为准，不在本文件重复列出，避免触发 `tests/privacy.spec.ts` 的真实信息检查。隐私清理不得删除许可证要求保留的署名。

### 1.4 隐私验证

提交前分别执行以下检查：

```sh
pnpm test
pnpm run verify:privacy
```

`pnpm test` 包含全仓库文本隐私检查；`verify:privacy` 检查发布物文本、PNG 字节流和 OCR 识别结果。两项检查覆盖范围不同，均须通过。

OCR 结果必须为 `OK`。`SKIP` 表示 OCR 后端未执行；在 `DSH_STRICT_PRIVACY=1` 或 `npm publish` 流程中，此状态会导致检查失败。

CI 在 Ubuntu 与 Windows 上执行 `.github/workflows/ci.yml` 的 `Privacy gate`。自动检查不能替代成品图片复核：OCR 可能遗漏全角字符、异常字距、低对比度和裁切文字；基于值哈希的文本检查可能无法识别编码后的身份信息，例如 Base64 内容。

## 2. 开发与验证

- 本地开发、上游对比、收益整合与部署统一以 `main` 为基线。PR 分支仅用于向上游提交建议，不作为日常开发或部署来源。
- `pnpm run check`（typecheck、test、build）必须通过。CI 同时覆盖 Ubuntu 与 Windows，须关注路径分隔符和文件系统行为差异；本地通过不能替代 CI 结果。
- 修复缺陷前，先增加能够复现问题的失败测试。确认测试在原实现上失败，再修复实现并确认测试通过。
- 使用 `link:` 挂载源码目录时，源码修改后必须执行 `pnpm run build`，确保 DSH 加载更新后的 `lib/` 产物。

## 3. 文档与注释

- CHANGELOG 应记录修改结论与依据，包括相关实测数据和未采用方案，不能仅列举差异。
- 注释应说明设计取舍、已验证的限制及未采用方案的原因。
- `tests/privacy.spec.ts` 与 `scripts/verify-privacy.mjs` 仅保存受保护值的 SHA-256；注释示例必须使用合成值。
- 隐私检查文件本身也在扫描范围内，仅排除哈希字面量。不得增加文件级豁免，也不得在注释中重新引用真实值。

## 4. 发布要求

完整流程见 [`RELEASING.md`](RELEASING.md)。

1. `npm login` 与 `npm publish` 由维护者执行，AI 不代为执行。AI 可在用户授权范围内完成检查、版本更新、CHANGELOG、提交、标签和推送。2FA 授权窗口不适合通过转述完成。
2. 发布前必须进行独立审查，确认差异中不含隐私信息，并核对 `npm pack --dry-run` 清单不包含 `tests/`、`scripts/`。
