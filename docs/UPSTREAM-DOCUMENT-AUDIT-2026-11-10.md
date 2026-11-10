# 上游文档完整性对照记录

> 当前状态（2026-11-10）：Trae 已修复 14 份文档；后续严格隐私检查已完成 17 项，包含图片 OCR，无跳过。已确认的问题已按第 7 节处理。全部文档的逐句语义审阅仍未完成；全文差异计算和相关测试不能替代该项审阅。第 1 至第 6 节记载修复前的发现及检查点。

## 1. 对照对象与结论

检查日期：2026-11-10。仓库为 `dsh-connect-trae`，使用本地 `main` 工作区，包含检查开始时已有的未提交文档。

- 本地 HEAD：`0799901a8b7d84faad21a100eafbf1b18fb9a642`。
- 当日经代理 fetch 后的上游 main：`a80b77c2fca56c18c1ea59629a74372303a5c7d5`。
- 两者共同祖先：`60c9a455440b7629250f4ada1b3cf89c7b7988c0`。
- 历史语言改写提交：`edf7305`。比较该提交前后，可以将本地改写与后续上游更新分开。

本次对照覆盖 114 个文档路径：Markdown、HTML 及许可证等文本。统计为：正文相同 1 份；正文存在差异 101 份；本地独有 10 份；上游独有 2 份。路径取自本地与上游 Git 跟踪文件的并集，包含上游独有文件。

**修复前结论：文档完整性审查不通过。** 已确认具体技术名称被泛化、部分技术记录被压缩，以及部分事实或参数说明不准确。语言检查记录和代码测试结果不能证明技术文档与上游信息等价。

本轮完成所有路径的全文差异计算，并对下一节列出的段落进行人工对照。逐文件表是自动对照清单，不代表每个文件均已完成逐句语义审阅。图片没有进行像素复核。第 1 至第 6 节保留修复前检查快照；后续修复结果见第 7 节。

## 2. 已复核的具体问题

| 级别 | 文件及本地定位 | 对照结果 |
| --- | --- | --- |
| 严重：名称被替换且语义变窄 | [docs/IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)；本地第 72 行，上游第 33 行 | doctor 被改为“诊断命令”，edition 被改为“版本”；edition 在本项目表示产品变体，并不等于版本号。bearer 被改为“随机凭据”，abort signal 被改为“取消上游请求”，Cordis/LLM provider 注册测试被改为泛称。中文可解释这些概念，但原始技术名称应同时保留。 |
| 较高：平台枚举丢失 | [DEVELOPMENT.md](../DEVELOPMENT.md)；本地第 100 行，上游第 87 行 | x-device-type 的 mac / windows / linux 三个具体值变为“平台取值”。这句话保留了用途，但删去了协议实际值，开发者无法仅凭该表核对请求。软链改为实体副本的说明属于本地部署差异，应保留。 |
| 较高：请求构造函数丢失 | [docs/INTL_PAID_TIER_PROBE.md](INTL_PAID_TIER_PROBE.md)；本地第 115 行，上游第 118 行 | TraeCredentialStore、buildTraeCnHeaders、prepareSoloBody 被改成“认证与请求构造函数”。关于免费账号样本不能证明付费行为的更正应保留，同时恢复实际使用的函数名称与可核对的探测条件。 |
| 较高：认证名称随结论被删除 | [docs/CODEC_CHANNEL_FEASIBILITY.md](CODEC_CHANNEL_FEASIBILITY.md)；本地第 15 行，上游第 13 行 | 撤回“参数绑定响应证明鉴权成功”的判断有合理依据，但同时删除了实验使用的 Cloud-IDE-JWT 和 identity 请求头条件。应保留实验输入，并单独说明该响应无法证明鉴权完成；不能将证据和推断一起删去。 |
| 较高：回复记录被过度压缩 | [docs/ISSUE67_REPLY_DRAFT.md](ISSUE67_REPLY_DRAFT.md)；本地第 5 行，上游第 54 行 | 原回复由 92 行压缩为 9 行，删除 TTFT 对照表、cacheReadTokens 历史序列、诊断日志形状和 peek 排除规则。原推断已被 #69 更正，应保留更正，但仍应保留原测量与算法观察，并明确其不能证明服务端内部机制。 |
| 较高：发布故障证据被压缩 | [docs/RELEASE_EXPERIENCE.md](RELEASE_EXPERIENCE.md)；本地第 149 行，上游第 315 行 | 4.6.2 的 E404、PUT 404 与完整 web-auth 轨迹被简化。移除抽取 .npmrc 令牌的可执行探针可保护凭据，但可以保留不含凭据的 HTTP 状态、错误原文与诊断步骤；个案结论和一般判断需要分开。 |
| 较高：维护流程信息丢失 | [RELEASING.md](../RELEASING.md)；本地第 7 行，上游第 71 行 | 发布过程从 235 行改为 88 行，删除了部分 registry 查询、错误分类及隐私检查的运行细节；与最新版上游还有新增内容差异。现文还写本地使用 4.9.0，而 package.json 为 4.10.1，说明概述含有已经过期的本地快照。 |
| 较高：同段规则相互矛盾 | [docs/MODEL_MANAGEMENT_DESIGN.md](MODEL_MANAGEMENT_DESIGN.md)；本地第 73 行，上游第 58 行 | 同段既说旧的剔除策略已被保留未知行的策略取代，又接着写不能暴露调用失败的模型；后文再次写 join 规则本身不变。这里需要按历史日期拆开规则，并保留 wireConfigName、config_name 与 function 的原名。 |
| 较高：字段名称改动需依据 | [docs/ISSUE46_REPLY_DRAFT.md](ISSUE46_REPLY_DRAFT.md)；本地第 116 行，上游第 117 行 | 本地将“#42 记录的 wireConfigName 丢失”改成 maxTokens。两者是不同字段，不能按语言修订处理；应核对对应问题和修复提交后决定是否成立。修复复核已确认本地 maxTokens 更正正确：#42 的诊断记录明确指出 mergeTraeModelSources 漏传 wireModel.maxTokens，80 条 configs 均有该值，修复后显示 30/32。此处保留本地更正，不恢复上游错误类比。 |
| 一般：泛化后可读但不完整 | [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md)；本地第 3 行，上游第 3 行 | 原文明确列举 @deepseek-ai/*、react、typescript、tsdown、vitest；现文只有平台与构建依赖的概述。可保留中文概述，同时列出原有具体名称。另发现“直接上游”被改为“直接入游”，属于文字错误。 |

## 3. 历史改写造成的结构压缩

下表仅比较语言改写提交自身的父版本与提交版本；数字来自原文的逻辑行数，包含空行。它用于定位审查重点，不直接等同于技术信息损失量。当前文件还可能含后续功能更新与未提交修订。

| 文件 | 改写前行数 | 改写后行数 | 当前行数 |
| --- | ---: | ---: | ---: |
| `RELEASING.md` | 235 | 88 | 88 |
| `docs/ISSUE67_REPLY_DRAFT.md` | 92 | 9 | 9 |
| `docs/RELEASE_EXPERIENCE.md` | 340 | 155 | 155 |

## 4. 全部文档的逐文件对照

“未同形出现的标识”只统计上游行内代码在本地全文中缺少相同形式的数量，集合按文件去重。Markdown 格式变化、隐私脱敏、功能差异、历史更正及上游新增内容均可能产生该数字，因此它只用于定位，不能直接判为误删。代码块数量同样只是结构指标。SHA256 按统一 LF 换行后的 UTF-8 正文计算，列出前 12 位，便于复核本次工作区快照。

| 文件 | 对照状态 | 本地/上游行数 | 本地/上游代码块 | 未同形出现的标识 | 本地正文 SHA256 |
| --- | --- | ---: | ---: | ---: | --- |
| `AGENTS.md` | 正文存在差异 | 72/95 | 1/1 | 1 | `f4f8774f48dc` |
| `CHANGELOG.md` | 正文存在差异 | 4647/5286 | 6/11 | 207 | `2db14b339e8e` |
| `DEVELOPMENT.md` | 正文存在差异 | 151/137 | 1/1 | 9 | `9094d6435f26` |
| `LICENSE` | 正文相同 | 21/21 | 0/0 | 0 | `8664487c9d35` |
| `README.en.md` | 正文存在差异 | 431/400 | 6/6 | 17 | `fed740d267d2` |
| `README.md` | 正文存在差异 | 568/480 | 6/6 | 29 | `e3f2b98e702c` |
| `RELEASING.md` | 正文存在差异 | 88/296 | 5/7 | 82 | `9b29c49bb2a7` |
| `SECURITY.md` | 正文存在差异 | 75/77 | 0/0 | 0 | `c548c2d6f08e` |
| `THIRD_PARTY_NOTICES.md` | 正文存在差异 | 22/18 | 0/0 | 5 | `aab9eb9ef15d` |
| `docs/ACCOUNT-DEVICE-BINDING.md` | 本地独有 | 36/0 | 0/0 | 0 | `d967c37ffb81` |
| `docs/ANALYSIS.md` | 正文存在差异 | 340/332 | 2/2 | 0 | `1a56c5f18be8` |
| `docs/ANALYSIS_CONCLUSION.md` | 正文存在差异 | 91/85 | 0/0 | 0 | `81d2ead4ec26` |
| `docs/ARCHITECTURE_DECISION.md` | 正文存在差异 | 70/68 | 0/0 | 1 | `3c4f96a5c012` |
| `docs/CN_MODEL_DIRECTORY_EVIDENCE.md` | 正文存在差异 | 88/83 | 0/0 | 1 | `4cf97c3813fa` |
| `docs/CODEC_CHANNEL_FEASIBILITY.md` | 正文存在差异 | 200/208 | 5/5 | 2 | `97a2410b0133` |
| `docs/CREDIT-HISTORY.md` | 本地独有 | 52/0 | 0/0 | 0 | `e50c91ac1545` |
| `docs/DOCUMENT-LANGUAGE-REVIEW-2026-11-09.md` | 本地独有 | 276/0 | 0/0 | 0 | `d66ba6f76209` |
| `docs/DOCUMENT-SYNC-AUDIT.md` | 本地独有 | 140/0 | 0/0 | 0 | `777826fcc3ae` |
| `docs/DS41_CALLABILITY.md` | 正文存在差异 | 89/83 | 2/2 | 0 | `8dc926caf5b4` |
| `docs/DSH_0.2.0_RC1_IMPACT_CHECK.md` | 正文存在差异 | 218/222 | 4/4 | 1 | `536a3d697df9` |
| `docs/DSH_0.2.1_RC1_SYNC.md` | 正文存在差异 | 513/510 | 13/13 | 0 | `8817a73608b2` |
| `docs/DSH_0.2.2_RC1_SYNC.md` | 正文存在差异 | 154/152 | 2/2 | 5 | `cc5b1ddc1761` |
| `docs/HANDOFF.md` | 正文存在差异 | 247/239 | 10/10 | 0 | `2782a495de1d` |
| `docs/IMPLEMENTATION_PLAN.md` | 正文存在差异 | 169/163 | 2/2 | 0 | `7246afccdf3f` |
| `docs/INTL_PAID_TIER_PROBE.md` | 正文存在差异 | 115/120 | 4/4 | 9 | `4a2e2c68df66` |
| `docs/INTL_SG_EVIDENCE.md` | 正文存在差异 | 251/241 | 0/0 | 0 | `9fe12ae07e7b` |
| `docs/INTL_SUPPORT_PLAN.md` | 正文存在差异 | 212/209 | 1/1 | 0 | `53ba424803b3` |
| `docs/ISSUE10_DIAGNOSIS.md` | 正文存在差异 | 177/175 | 9/9 | 0 | `73b93ab42ba8` |
| `docs/ISSUE10_REPLY_DRAFT.md` | 正文存在差异 | 82/81 | 4/4 | 1 | `d416cc94b95a` |
| `docs/ISSUE11_DIAGNOSIS.md` | 正文存在差异 | 163/166 | 1/1 | 0 | `e47fa5cc8613` |
| `docs/ISSUE11_REPLY_DRAFT.md` | 正文存在差异 | 50/50 | 0/0 | 0 | `eaab067be6f5` |
| `docs/ISSUE13_REPLY_DRAFT.md` | 正文存在差异 | 102/102 | 1/1 | 0 | `cdd46cc06b9d` |
| `docs/ISSUE19_DIAGNOSIS.md` | 正文存在差异 | 194/193 | 10/10 | 2 | `af8ee67461ec` |
| `docs/ISSUE27_DIAGNOSIS.md` | 正文存在差异 | 260/248 | 7/7 | 0 | `8b3aa3e33d13` |
| `docs/ISSUE27_REPLY_DRAFT.md` | 正文存在差异 | 122/126 | 3/3 | 0 | `65a977873563` |
| `docs/ISSUE33_DIAGNOSIS.md` | 正文存在差异 | 198/198 | 5/5 | 0 | `bda6ebfb9b05` |
| `docs/ISSUE33_REPLY_DRAFT.md` | 正文存在差异 | 101/101 | 2/2 | 0 | `853cb503b8e6` |
| `docs/ISSUE34_REPLY_DRAFT.md` | 正文存在差异 | 122/123 | 4/4 | 0 | `2cff0247c94e` |
| `docs/ISSUE42_DIAGNOSIS.md` | 正文存在差异 | 82/80 | 2/2 | 0 | `0af1589e5072` |
| `docs/ISSUE42_REPLY_DRAFT.md` | 正文存在差异 | 73/70 | 0/0 | 0 | `b89d29a4a821` |
| `docs/ISSUE46_DIAGNOSIS.md` | 正文存在差异 | 377/377 | 6/6 | 0 | `57b8bf6ca2fe` |
| `docs/ISSUE46_REPLY_DRAFT.md` | 正文存在差异 | 120/118 | 1/1 | 1 | `b3101bc68645` |
| `docs/ISSUE52_DIAGNOSIS.md` | 正文存在差异 | 568/569 | 10/10 | 0 | `5026b75553cd` |
| `docs/ISSUE5_REPLY_DRAFT.md` | 正文存在差异 | 63/61 | 2/2 | 0 | `8b898d87a964` |
| `docs/ISSUE66_DIAGNOSIS.md` | 正文存在差异 | 151/152 | 1/1 | 0 | `858e915619a1` |
| `docs/ISSUE67_DIAGNOSIS.md` | 正文存在差异 | 164/178 | 2/2 | 5 | `ec1cd8b891a1` |
| `docs/ISSUE67_REPLY_DRAFT.md` | 正文存在差异 | 9/92 | 0/1 | 18 | `ccbd8fb64c7c` |
| `docs/ISSUE69_DIAGNOSIS.md` | 正文存在差异 | 155/153 | 4/4 | 0 | `8c06e6bef47e` |
| `docs/ISSUE7_REPLY_DRAFT.md` | 正文存在差异 | 62/60 | 1/1 | 0 | `224741405e25` |
| `docs/ISSUE8_DIAGNOSIS.md` | 正文存在差异 | 123/121 | 4/4 | 0 | `a7a151f64d51` |
| `docs/LOCAL-DEPLOYMENT.md` | 本地独有 | 55/0 | 0/0 | 0 | `0bcb550d26dd` |
| `docs/MODEL_MANAGEMENT_DESIGN.md` | 正文存在差异 | 155/145 | 5/5 | 0 | `10e18b2e3e7e` |
| `docs/MODULE-SPLIT-PLAN.md` | 本地独有 | 55/0 | 0/0 | 0 | `d18efdd9a1bd` |
| `docs/PROMO_BADGE.md` | 正文存在差异 | 202/206 | 4/4 | 0 | `36f82a2bde2c` |
| `docs/PROMO_CLIENT_RENDER.md` | 正文存在差异 | 184/184 | 4/4 | 0 | `d7fef96da826` |
| `docs/PROTOCOL_EVIDENCE.md` | 正文存在差异 | 228/214 | 0/0 | 0 | `53b499acdc22` |
| `docs/PR_ENTERPRISE_PROVIDER.md` | 正文存在差异 | 194/194 | 7/7 | 0 | `f229995b1608` |
| `docs/PUBLIC_RELEASE_GUIDE.md` | 正文存在差异 | 139/134 | 2/2 | 2 | `c2e621a61c4b` |
| `docs/RAW_CHAT_PROGRESS.md` | 正文存在差异 | 51/47 | 0/0 | 0 | `eb1ec8ff8f85` |
| `docs/RC2_IMPACT_CHECK.md` | 正文存在差异 | 113/111 | 2/2 | 0 | `2eba5ca95e20` |
| `docs/RELEASE_EXPERIENCE.md` | 正文存在差异 | 155/340 | 5/16 | 86 | `94cf387816c5` |
| `docs/RELEASE_NOTES_v2.10.0.md` | 正文存在差异 | 48/44 | 0/0 | 0 | `2131d655961f` |
| `docs/RELEASE_NOTES_v2.10.1.md` | 正文存在差异 | 32/30 | 0/0 | 0 | `e7f64b0a63d4` |
| `docs/RELEASE_NOTES_v2.10.2.md` | 正文存在差异 | 18/16 | 0/0 | 0 | `05558a53e2d3` |
| `docs/RELEASE_NOTES_v2.10.3.md` | 正文存在差异 | 28/26 | 1/1 | 0 | `45503670fc87` |
| `docs/RELEASE_NOTES_v2.11.0.md` | 正文存在差异 | 32/30 | 0/0 | 0 | `4e91011ac38c` |
| `docs/RELEASE_NOTES_v2.11.1.md` | 正文存在差异 | 16/14 | 0/0 | 0 | `17733798de80` |
| `docs/RELEASE_NOTES_v2.12.0.md` | 正文存在差异 | 34/30 | 0/0 | 0 | `f734fddc6838` |
| `docs/RELEASE_NOTES_v2.13.0.md` | 正文存在差异 | 23/21 | 0/0 | 0 | `44f369a62dea` |
| `docs/RELEASE_NOTES_v2.13.1.md` | 正文存在差异 | 44/40 | 0/0 | 0 | `6626c9bde618` |
| `docs/RELEASE_NOTES_v2.13.2.md` | 正文存在差异 | 56/54 | 2/2 | 0 | `5168421e2b5d` |
| `docs/RELEASE_NOTES_v2.13.3.md` | 正文存在差异 | 41/39 | 0/0 | 0 | `cf48433c4d14` |
| `docs/RELEASE_NOTES_v2.13.4.md` | 正文存在差异 | 19/17 | 0/0 | 0 | `f2c63e41602a` |
| `docs/RELEASE_NOTES_v2.13.5.md` | 正文存在差异 | 40/38 | 0/0 | 0 | `f845a1d7ca22` |
| `docs/RELEASE_NOTES_v2.13.6.md` | 正文存在差异 | 25/23 | 0/0 | 0 | `f91d336d89d1` |
| `docs/RELEASE_NOTES_v2.14.0.md` | 正文存在差异 | 35/31 | 0/0 | 0 | `7d3756bb3f97` |
| `docs/RELEASE_NOTES_v2.4.0.md` | 正文存在差异 | 43/41 | 1/1 | 1 | `b65997744203` |
| `docs/RELEASE_NOTES_v2.5.0.md` | 正文存在差异 | 33/29 | 1/1 | 0 | `40d8a0d5f4c7` |
| `docs/RELEASE_NOTES_v2.5.1.md` | 正文存在差异 | 29/27 | 1/1 | 0 | `dd57e19a8806` |
| `docs/RELEASE_NOTES_v2.6.0.md` | 正文存在差异 | 38/36 | 2/2 | 0 | `de99cd61e2f7` |
| `docs/RELEASE_NOTES_v2.7.0.md` | 正文存在差异 | 42/40 | 1/1 | 0 | `e8157c9d0e3d` |
| `docs/RELEASE_NOTES_v2.7.1.md` | 正文存在差异 | 30/28 | 0/0 | 0 | `b84a54c07545` |
| `docs/RELEASE_NOTES_v2.7.2.md` | 正文存在差异 | 23/21 | 0/0 | 0 | `313cec1ae1df` |
| `docs/RELEASE_NOTES_v2.8.0.md` | 正文存在差异 | 30/28 | 0/0 | 0 | `0c5090e4dd50` |
| `docs/RELEASE_NOTES_v2.9.0.md` | 正文存在差异 | 34/32 | 0/0 | 0 | `9ab846c5a2ae` |
| `docs/RELEASE_NOTES_v2.9.1.md` | 正文存在差异 | 35/33 | 0/0 | 0 | `1354a1cacf49` |
| `docs/RELEASE_NOTES_v2.9.2.md` | 正文存在差异 | 10/8 | 0/0 | 0 | `1465df480037` |
| `docs/RELEASE_NOTES_v2.9.3.md` | 正文存在差异 | 22/20 | 0/0 | 0 | `348ccc9c1ba3` |
| `docs/RELEASE_NOTES_v2.9.4.md` | 正文存在差异 | 17/15 | 0/0 | 0 | `15e5bef29207` |
| `docs/RELEASE_NOTES_v3.0.0.md` | 正文存在差异 | 49/47 | 0/0 | 0 | `4367aa18105e` |
| `docs/RELEASE_NOTES_v3.3.0.md` | 正文存在差异 | 60/58 | 0/0 | 0 | `6ce0e1e1bfe2` |
| `docs/RELEASE_NOTES_v3.4.1.md` | 正文存在差异 | 52/54 | 0/0 | 0 | `9eadab764f8f` |
| `docs/RELEASE_NOTES_v3.4.2.md` | 正文存在差异 | 109/112 | 1/1 | 0 | `7c49592916d3` |
| `docs/RELEASE_NOTES_v3.4.3.md` | 正文存在差异 | 88/89 | 1/1 | 0 | `d09057cf6b45` |
| `docs/RELEASE_NOTES_v3.5.0.md` | 正文存在差异 | 100/99 | 1/1 | 0 | `820624c7ee2b` |
| `docs/RELEASE_NOTES_v3.5.1.md` | 正文存在差异 | 72/70 | 1/1 | 0 | `75e55fdc2c5a` |
| `docs/RELEASE_NOTES_v3.6.0.md` | 正文存在差异 | 73/72 | 0/0 | 0 | `4c468493f6aa` |
| `docs/RELEASE_NOTES_v3.6.1.md` | 正文存在差异 | 60/59 | 1/1 | 0 | `b87322af848d` |
| `docs/RELEASE_NOTES_v3.7.0.md` | 正文存在差异 | 105/103 | 0/0 | 0 | `962e08a7b2a3` |
| `docs/RELEASE_NOTES_v3.8.0.md` | 正文存在差异 | 105/103 | 0/0 | 0 | `eb1c6f8b6266` |
| `docs/RELEASE_NOTES_v4.17.0.md` | 上游独有 | 0/44 | 0/0 | 9 | `不存在` |
| `docs/RELEASE_NOTES_v4.18.0.md` | 上游独有 | 0/91 | 0/1 | 32 | `不存在` |
| `docs/RELEASE_NOTES_v4.7.0.md` | 正文存在差异 | 31/29 | 0/0 | 0 | `1dfcdc927b0b` |
| `docs/SOLO_ROUTE_DECISION.md` | 正文存在差异 | 91/89 | 3/3 | 0 | `6288a588e4d8` |
| `docs/TRAECLI_FEASIBILITY.md` | 正文存在差异 | 227/226 | 12/12 | 0 | `acda325b6b75` |
| `docs/TRAE_ECOSYSTEM_RESEARCH.md` | 正文存在差异 | 164/167 | 5/5 | 0 | `e5d2f5920244` |
| `docs/UPSTREAM-BENEFITS-20261107.md` | 本地独有 | 32/0 | 0/0 | 0 | `608edc67dbf6` |
| `docs/UPSTREAM-COMPARISON-20261107.md` | 本地独有 | 35/0 | 0/0 | 0 | `353d0a53526b` |
| `docs/UPSTREAM-INTEGRATION-2026-11-08.md` | 本地独有 | 59/0 | 0/0 | 0 | `058a1bba9ca7` |
| `docs/UPSTREAM-INTEGRATION-2026-11-09.md` | 本地独有 | 25/0 | 0/0 | 0 | `38d5a441ac5c` |
| `docs/USAGE_API_RESEARCH.md` | 正文存在差异 | 228/223 | 3/3 | 1 | `2588085ff24a` |
| `docs/WINDOWS_TOKEN_PROBE.md` | 正文存在差异 | 236/237 | 9/9 | 1 | `ccb4d168533a` |
| `docs/WINDOWS_VERIFY_GUIDE.md` | 正文存在差异 | 204/204 | 5/5 | 1 | `7050aa36d81f` |
| `docs/WSL2_CLI_PROBE.md` | 正文存在差异 | 83/83 | 5/5 | 5 | `8086d9b19a20` |

## 5. 差异的处理规则

1. 英文产品名、包名、API、类型、函数、字段、HTTP header、协议值与命令参数保持原形。需要中文解释时，在原名附近补充解释，保留参数条件和错误分支。
2. 历史研究保留日期、环境版本、原始响应结构、测量值及可复现步骤。后来被证伪的推断应追加更正，不能删除原实验后使读者无法追溯。真实账号、机器路径与会话标识按权威隐私规则替换。
3. 当前设计以本地源码为依据，另列与上游的差异。账号顺序、末位备用、签到后余额恢复、实体部署、积分差分和计费口径等本地修改需要保留。
4. 上游独有文件先通过 Git 历史确认新增时间和适用实现。未合入本地的版本说明或接口设计属于待同步资料，不能全部记为本地语言修订误删。
5. 现有文档语言检查报告仅证明其记载的检查过程。修复前尚未恢复技术内容；后续已按第 7 节恢复确认缺失的信息，全部文档的逐句审阅仍须继续。

## 6. 修复前检查点与验证范围

本轮新增本对照记录，并在既有语言检查报告顶部增加完整性复核说明。原有工作区内容继续保留。功能代码、构建产物与运行中的插件均未因本轮对照发生修改。

- `git diff --check`：通过。
- `pnpm exec vitest run tests/privacy.spec.ts`：1 个文件、7 项测试通过，覆盖仓库文本隐私检查。
- `pnpm run verify:privacy`：14 项通过，1 项跳过。当时缺少 `tesseract.js`，图片 OCR 未运行；该检查点不构成完整发布隐私验证通过。第 7 节记录后续补齐依赖后的 17 项检查全部通过。本轮没有修改图片或执行发布。
- 对照记录与语言检查报告均未位于 `package.json` 的发布白名单，本轮无需替换安装目录中的运行文件。
- 该检查点尚未执行原文恢复。后续修复见第 7 节；本记录不构成全部文档逐句审阅通过的声明。

## 7. 修复执行结果

本次修复在本地 `main` 工作区执行。正文修复 14 份。以下清单只统计相对修复开始时备份发生变化的文档，不将原有源码和测试改动计入本轮。第 4 节的行数与摘要保留修复前快照，不能用作当前文件校验值。

修复保留 doctor、edition、bearer、abort signal、Cordis/LLM provider、Cloud-IDE-JWT 和具体协议枚举；恢复请求构造函数、缓存测量、TTFT 表及发布错误轨迹。模型管理文档区分早期剔除策略和后续保留未知模型行的策略。#46 涉及的 maxTokens 更正已依据 #42 核实，保留本地内容。

| 修复文件 | 处理方式 |
| --- | --- |
| `AGENTS.md` | 复核相关段落，恢复技术标识或修正事实与维护流程 |
| `DEVELOPMENT.md` | 复核相关段落，恢复技术标识或修正事实与维护流程 |
| `RELEASING.md` | 复核相关段落，恢复技术标识或修正事实与维护流程 |
| `THIRD_PARTY_NOTICES.md` | 复核相关段落，恢复技术标识或修正事实与维护流程 |
| `docs/CN_MODEL_DIRECTORY_EVIDENCE.md` | 复核相关段落，恢复技术标识或修正事实与维护流程 |
| `docs/CODEC_CHANNEL_FEASIBILITY.md` | 复核相关段落，恢复技术标识或修正事实与维护流程 |
| `docs/IMPLEMENTATION_PLAN.md` | 复核相关段落，恢复技术标识或修正事实与维护流程 |
| `docs/INTL_PAID_TIER_PROBE.md` | 复核相关段落，恢复技术标识或修正事实与维护流程 |
| `docs/ISSUE19_DIAGNOSIS.md` | 复核相关段落，恢复技术标识或修正事实与维护流程 |
| `docs/ISSUE67_REPLY_DRAFT.md` | 复核相关段落，恢复技术标识或修正事实与维护流程 |
| `docs/MODEL_MANAGEMENT_DESIGN.md` | 复核相关段落，恢复技术标识或修正事实与维护流程 |
| `docs/PUBLIC_RELEASE_GUIDE.md` | 复核相关段落，恢复技术标识或修正事实与维护流程 |
| `docs/RELEASE_EXPERIENCE.md` | 复核相关段落，恢复技术标识或修正事实与维护流程 |
| `docs/WSL2_CLI_PROBE.md` | 复核相关段落，恢复技术标识或修正事实与维护流程 |

### 7.1 验证与交付条件

`pnpm exec vitest run tests/privacy.spec.ts tests/verify-release.spec.ts`：2 个文件、15 项测试通过。严格隐私检查使用仓库外的 tesseract.js 与 DSH_TESSDATA，17 项全部执行，无跳过。

新增相对文件链接未发现目标缺失，修改未引入未闭合的 Markdown 代码围栏；`git diff --check` 通过。源码和测试的差异与修复开始前的备份逐块一致。本轮没有修改历史截图，未进行图片像素复核。

随包文档同步到两个本地实体安装副本后逐文件核对 SHA256，具体清单由安装同步记录保存于仓库外。纯文档变更无需重载插件。

全部路径已完成全文差异计算；本轮逐段复核和修复范围如上表所示，不将自动差异计算等同于全部文档逐句人工验收。上游新增且本地尚未实现的版本说明，以及有效的本地功能差异，不作为语言修订误删恢复。

### 7.2 技术保真规则的执行遗漏

LCL CORE A5 已要求英文专有名词、命令、路径和版本保持原形。本次问题属于既有规则执行遗漏，无需新增等价通用规则。两仓 AGENTS.md 已补充技术保真及删除信息的逐项核对要求，防止仅凭措辞检查或代码测试声明技术内容完整。
