# 文档语言检查记录

## 1. 检查范围与方法

检查日期：2026-11-09。基线为本仓库 `main` 分支。

本次盘点 110 份 Markdown 与 HTML 文档，修订其中 82 份既有文档；本记录单独计数。范围包含根目录说明、开发与发布资料、历史更新记录、问题分析及 HTML 说明文件，排除依赖目录、Git 内部文件和构建产物。

全部文件均经过自动措辞扫描。命中项结合所在段落修订；下表明确区分全文通读修订、命中段落复核修订与扫描未命中。未命中文件不代表经过逐句人工审阅。较长的历史记录采用命中段落复核方式。

## 2. 修订边界与依据

- 将口语、比喻和指代不明的表达改为具体动作、对象、条件和结果。
- 保留原始报文、代码示例、协议字段、历史版本与测量数据；明确的用户原话按引文保留。
- 维护规则以 `AGENTS.md` 及本仓库权威隐私文档为依据。本轮规范措辞，未修改源码或新增行为说明；既有行为结论不因本轮文字修订而视为重新完成源码验证。
- 所有外部 URL 保持原值。代码围栏中的可执行内容保持不变；贡献指南与维护规则中的自然语言注释进行了规范化。
- 图片未修改。HTML 中仅修订说明、注释和展示文字；CSS 规则及脚本语法结构保持不变。

## 3. 验证结果

- `pnpm run check`：类型检查、全量测试与构建通过，测试 1513 项通过。
- `git diff --check`：通过。
- 全量文档 URL 与代码围栏对比：通过；维护规则与贡献指南的注释修改已单独核对。
- `pnpm run verify:privacy`：17 项通过，无跳过项，包含图片 OCR 检查。

## 4. 逐文件记录

| 文件 | 检查状态 | 依据与结果 |
| --- | --- | --- |
| [AGENTS.md](../AGENTS.md) | 全文通读修订 | 按维护规则与隐私要求规范措辞，差异检查通过 |
| [CHANGELOG.md](../CHANGELOG.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [DEVELOPMENT.md](../DEVELOPMENT.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [README.en.md](../README.en.md) | 自动扫描未发现需修改项 | 保留原文；不计入全文人工通读 |
| [README.md](../README.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [RELEASING.md](../RELEASING.md) | 自动扫描未发现需修改项 | 保留原文；不计入全文人工通读 |
| [SECURITY.md](../SECURITY.md) | 全文通读修订 | 按维护规则与隐私要求规范措辞，差异检查通过 |
| [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/ACCOUNT-DEVICE-BINDING.md](ACCOUNT-DEVICE-BINDING.md) | 自动扫描未发现需修改项 | 保留原文；不计入全文人工通读 |
| [docs/ANALYSIS.md](ANALYSIS.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/ANALYSIS_CONCLUSION.md](ANALYSIS_CONCLUSION.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/ARCHITECTURE_DECISION.md](ARCHITECTURE_DECISION.md) | 自动扫描未发现需修改项 | 保留原文；不计入全文人工通读 |
| [docs/CN_MODEL_DIRECTORY_EVIDENCE.md](CN_MODEL_DIRECTORY_EVIDENCE.md) | 自动扫描未发现需修改项 | 保留原文；不计入全文人工通读 |
| [docs/CODEC_CHANNEL_FEASIBILITY.md](CODEC_CHANNEL_FEASIBILITY.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/CREDIT-HISTORY.md](CREDIT-HISTORY.md) | 自动扫描未发现需修改项 | 保留原文；不计入全文人工通读 |
| [docs/DOCUMENT-SYNC-AUDIT.md](DOCUMENT-SYNC-AUDIT.md) | 自动扫描未发现需修改项 | 保留原文；不计入全文人工通读 |
| [docs/DS41_CALLABILITY.md](DS41_CALLABILITY.md) | 自动扫描未发现需修改项 | 保留原文；不计入全文人工通读 |
| [docs/DSH_0.2.0_RC1_IMPACT_CHECK.md](DSH_0.2.0_RC1_IMPACT_CHECK.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/DSH_0.2.1_RC1_SYNC.md](DSH_0.2.1_RC1_SYNC.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/DSH_0.2.2_RC1_SYNC.md](DSH_0.2.2_RC1_SYNC.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/HANDOFF.md](HANDOFF.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/INTL_PAID_TIER_PROBE.md](INTL_PAID_TIER_PROBE.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/INTL_SG_EVIDENCE.md](INTL_SG_EVIDENCE.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/INTL_SUPPORT_PLAN.md](INTL_SUPPORT_PLAN.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/ISSUE10_DIAGNOSIS.md](ISSUE10_DIAGNOSIS.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/ISSUE10_REPLY_DRAFT.md](ISSUE10_REPLY_DRAFT.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/ISSUE11_DIAGNOSIS.md](ISSUE11_DIAGNOSIS.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/ISSUE11_REPLY_DRAFT.md](ISSUE11_REPLY_DRAFT.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/ISSUE13_REPLY_DRAFT.md](ISSUE13_REPLY_DRAFT.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/ISSUE19_DIAGNOSIS.md](ISSUE19_DIAGNOSIS.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/ISSUE27_DIAGNOSIS.md](ISSUE27_DIAGNOSIS.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/ISSUE27_REPLY_DRAFT.md](ISSUE27_REPLY_DRAFT.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/ISSUE33_DIAGNOSIS.md](ISSUE33_DIAGNOSIS.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/ISSUE33_REPLY_DRAFT.md](ISSUE33_REPLY_DRAFT.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/ISSUE34_REPLY_DRAFT.md](ISSUE34_REPLY_DRAFT.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/ISSUE42_DIAGNOSIS.md](ISSUE42_DIAGNOSIS.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/ISSUE42_REPLY_DRAFT.md](ISSUE42_REPLY_DRAFT.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/ISSUE46_DIAGNOSIS.md](ISSUE46_DIAGNOSIS.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/ISSUE46_REPLY_DRAFT.md](ISSUE46_REPLY_DRAFT.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/ISSUE52_DIAGNOSIS.md](ISSUE52_DIAGNOSIS.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/ISSUE5_REPLY_DRAFT.md](ISSUE5_REPLY_DRAFT.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/ISSUE66_DIAGNOSIS.md](ISSUE66_DIAGNOSIS.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/ISSUE67_DIAGNOSIS.md](ISSUE67_DIAGNOSIS.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/ISSUE67_REPLY_DRAFT.md](ISSUE67_REPLY_DRAFT.md) | 自动扫描未发现需修改项 | 保留原文；不计入全文人工通读 |
| [docs/ISSUE69_DIAGNOSIS.md](ISSUE69_DIAGNOSIS.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/ISSUE7_REPLY_DRAFT.md](ISSUE7_REPLY_DRAFT.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/ISSUE8_DIAGNOSIS.md](ISSUE8_DIAGNOSIS.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/LOCAL-DEPLOYMENT.md](LOCAL-DEPLOYMENT.md) | 自动扫描未发现需修改项 | 保留原文；不计入全文人工通读 |
| [docs/MODEL_MANAGEMENT_DESIGN.md](MODEL_MANAGEMENT_DESIGN.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/MODULE-SPLIT-PLAN.md](MODULE-SPLIT-PLAN.md) | 自动扫描未发现需修改项 | 保留原文；不计入全文人工通读 |
| [docs/PROMO_BADGE.md](PROMO_BADGE.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/PROMO_CLIENT_RENDER.md](PROMO_CLIENT_RENDER.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/PROTOCOL_EVIDENCE.md](PROTOCOL_EVIDENCE.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/PR_ENTERPRISE_PROVIDER.md](PR_ENTERPRISE_PROVIDER.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/PUBLIC_RELEASE_GUIDE.md](PUBLIC_RELEASE_GUIDE.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/RAW_CHAT_PROGRESS.md](RAW_CHAT_PROGRESS.md) | 自动扫描未发现需修改项 | 保留原文；不计入全文人工通读 |
| [docs/RC2_IMPACT_CHECK.md](RC2_IMPACT_CHECK.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/RELEASE_EXPERIENCE.md](RELEASE_EXPERIENCE.md) | 自动扫描未发现需修改项 | 保留原文；不计入全文人工通读 |
| [docs/RELEASE_NOTES_v2.10.0.md](RELEASE_NOTES_v2.10.0.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/RELEASE_NOTES_v2.10.1.md](RELEASE_NOTES_v2.10.1.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/RELEASE_NOTES_v2.10.2.md](RELEASE_NOTES_v2.10.2.md) | 自动扫描未发现需修改项 | 保留原文；不计入全文人工通读 |
| [docs/RELEASE_NOTES_v2.10.3.md](RELEASE_NOTES_v2.10.3.md) | 自动扫描未发现需修改项 | 保留原文；不计入全文人工通读 |
| [docs/RELEASE_NOTES_v2.11.0.md](RELEASE_NOTES_v2.11.0.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/RELEASE_NOTES_v2.11.1.md](RELEASE_NOTES_v2.11.1.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/RELEASE_NOTES_v2.12.0.md](RELEASE_NOTES_v2.12.0.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/RELEASE_NOTES_v2.13.0.md](RELEASE_NOTES_v2.13.0.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/RELEASE_NOTES_v2.13.1.md](RELEASE_NOTES_v2.13.1.md) | 自动扫描未发现需修改项 | 保留原文；不计入全文人工通读 |
| [docs/RELEASE_NOTES_v2.13.2.md](RELEASE_NOTES_v2.13.2.md) | 自动扫描未发现需修改项 | 保留原文；不计入全文人工通读 |
| [docs/RELEASE_NOTES_v2.13.3.md](RELEASE_NOTES_v2.13.3.md) | 自动扫描未发现需修改项 | 保留原文；不计入全文人工通读 |
| [docs/RELEASE_NOTES_v2.13.4.md](RELEASE_NOTES_v2.13.4.md) | 自动扫描未发现需修改项 | 保留原文；不计入全文人工通读 |
| [docs/RELEASE_NOTES_v2.13.5.md](RELEASE_NOTES_v2.13.5.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/RELEASE_NOTES_v2.13.6.md](RELEASE_NOTES_v2.13.6.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/RELEASE_NOTES_v2.14.0.md](RELEASE_NOTES_v2.14.0.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/RELEASE_NOTES_v2.4.0.md](RELEASE_NOTES_v2.4.0.md) | 自动扫描未发现需修改项 | 保留原文；不计入全文人工通读 |
| [docs/RELEASE_NOTES_v2.5.0.md](RELEASE_NOTES_v2.5.0.md) | 自动扫描未发现需修改项 | 保留原文；不计入全文人工通读 |
| [docs/RELEASE_NOTES_v2.5.1.md](RELEASE_NOTES_v2.5.1.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/RELEASE_NOTES_v2.6.0.md](RELEASE_NOTES_v2.6.0.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/RELEASE_NOTES_v2.7.0.md](RELEASE_NOTES_v2.7.0.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/RELEASE_NOTES_v2.7.1.md](RELEASE_NOTES_v2.7.1.md) | 自动扫描未发现需修改项 | 保留原文；不计入全文人工通读 |
| [docs/RELEASE_NOTES_v2.7.2.md](RELEASE_NOTES_v2.7.2.md) | 自动扫描未发现需修改项 | 保留原文；不计入全文人工通读 |
| [docs/RELEASE_NOTES_v2.8.0.md](RELEASE_NOTES_v2.8.0.md) | 自动扫描未发现需修改项 | 保留原文；不计入全文人工通读 |
| [docs/RELEASE_NOTES_v2.9.0.md](RELEASE_NOTES_v2.9.0.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/RELEASE_NOTES_v2.9.1.md](RELEASE_NOTES_v2.9.1.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/RELEASE_NOTES_v2.9.2.md](RELEASE_NOTES_v2.9.2.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/RELEASE_NOTES_v2.9.3.md](RELEASE_NOTES_v2.9.3.md) | 自动扫描未发现需修改项 | 保留原文；不计入全文人工通读 |
| [docs/RELEASE_NOTES_v2.9.4.md](RELEASE_NOTES_v2.9.4.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/RELEASE_NOTES_v3.0.0.md](RELEASE_NOTES_v3.0.0.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/RELEASE_NOTES_v3.3.0.md](RELEASE_NOTES_v3.3.0.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/RELEASE_NOTES_v3.4.1.md](RELEASE_NOTES_v3.4.1.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/RELEASE_NOTES_v3.4.2.md](RELEASE_NOTES_v3.4.2.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/RELEASE_NOTES_v3.4.3.md](RELEASE_NOTES_v3.4.3.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/RELEASE_NOTES_v3.5.0.md](RELEASE_NOTES_v3.5.0.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/RELEASE_NOTES_v3.5.1.md](RELEASE_NOTES_v3.5.1.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/RELEASE_NOTES_v3.6.0.md](RELEASE_NOTES_v3.6.0.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/RELEASE_NOTES_v3.6.1.md](RELEASE_NOTES_v3.6.1.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/RELEASE_NOTES_v3.7.0.md](RELEASE_NOTES_v3.7.0.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/RELEASE_NOTES_v3.8.0.md](RELEASE_NOTES_v3.8.0.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/RELEASE_NOTES_v4.7.0.md](RELEASE_NOTES_v4.7.0.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/SOLO_ROUTE_DECISION.md](SOLO_ROUTE_DECISION.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/TRAECLI_FEASIBILITY.md](TRAECLI_FEASIBILITY.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/TRAE_ECOSYSTEM_RESEARCH.md](TRAE_ECOSYSTEM_RESEARCH.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/UPSTREAM-BENEFITS-20261107.md](UPSTREAM-BENEFITS-20261107.md) | 自动扫描未发现需修改项 | 保留原文；不计入全文人工通读 |
| [docs/UPSTREAM-COMPARISON-20261107.md](UPSTREAM-COMPARISON-20261107.md) | 自动扫描未发现需修改项 | 保留原文；不计入全文人工通读 |
| [docs/UPSTREAM-INTEGRATION-2026-11-08.md](UPSTREAM-INTEGRATION-2026-11-08.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/UPSTREAM-INTEGRATION-2026-11-09.md](UPSTREAM-INTEGRATION-2026-11-09.md) | 自动扫描未发现需修改项 | 保留原文；不计入全文人工通读 |
| [docs/USAGE_API_RESEARCH.md](USAGE_API_RESEARCH.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/WINDOWS_TOKEN_PROBE.md](WINDOWS_TOKEN_PROBE.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/WINDOWS_VERIFY_GUIDE.md](WINDOWS_VERIFY_GUIDE.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
| [docs/WSL2_CLI_PROBE.md](WSL2_CLI_PROBE.md) | 自动扫描＋命中段落复核修订 | 保留原有技术结论，修订命中表达 |
