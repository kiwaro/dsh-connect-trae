# 文档全文审核与 LCL 自检记录

审核日期：2026-11-06。对照 WorkBuddy 基线 c58243e 的维护方法，逐篇读取本项目 102 份 Markdown，包含历史研究、发布说明和 CHANGELOG。

## 实际检查结果

本次执行普通 LCL 自检，没有启动正式三席审议。2026-11-06 22:10 的进化回归退出码为 0，should-reject=1182、should-pass=181；指纹 regressHash=59a12196d8d0bd9b，chars=147922。

两个项目共提取715个含文字的文件，包含Trae的102份和WorkBuddy的58份Markdown或HTML文档。提取与编码检查不代表全文审核。Trae文档已有逐篇通读记录；WorkBuddy历史CHANGELOG已分段通读至末尾并修订，历史实验未重新复现；英文注释等仍未全部逐项读完。逐文件状态记录在本机 `.lcl/work/tmp/docs-20261106/text-review/review-ledger.json`，区分扫描、部分通读与全文通读。

22:10语言扫描有675条规则命中，映射到886个位置，自检仍有提示，不能记为通过。提示需结合上下文处理，不能统一称为误报。后续文字修改后还需重扫。

## 22:40 复检与部署

两个项目重新通过类型检查与构建，WorkBuddy 六个声明入口存在。22:35:55 按打包清单部署到本地插件目录和 desktop profile，96 个文件哈希一致；备份目录为本机临时目录下的 `dsh-ui-copy-20261106-223555`。22:39:59 重启 DSH，22:40:49 两个国内区快速用量接口均返回 HTTP 200、signed-in。此后又修订 2001 错误提示并通过 solo-bridge 的 36 项测试；该项需再次构建部署。

22:40 完整性检查覆盖 715 文件，未发现编码和字典占位符问题。语言自检仍有 675 条提示，未记为通过。英文注释审核尚在继续，不能据此声称全部文字已审核。

## 已核对并修正的内容

修正 SemVer 比较、并发计数、费用说明、凭据格式与授权状态的混淆。撤回由缓存计数和延迟推断缓存内部机制的结论；撤回由参数绑定或配额响应推断鉴权成功、配置必须由客户端注册及第三方永久不可调用的结论。保留历史响应和测量数据。

当前界面说明为账号、模型、能力、诊断四分栏。工具栏使用共享临时排序表；账号和计费分别管理。用户指定的标题 `Trae - CN积分`、状态栏 `Trae - CN`、列名“积分”保留。

22:09两项目类型检查与构建通过，Trae相关8文件128项、WorkBuddy相关14文件323项测试通过。此前Trae完整测试为105文件1354项，属于早先一轮结果。额外发现发布核验脚本缺少标签时给出的选项建议错误，已修正提示。已发布版本核验因本地没有 v4.9.0 标签而无法开始，不能记为核验通过。

早先已部署并验证国内版接口；本段新增修订的最新部署记录另见下文及本地部署记录。部署过程见 [本地部署记录](LOCAL-DEPLOYMENT.md)。历史模型调用、签到与生图实验没有在此次文档审核中重新执行。

## 逐文档记录

下表 SHA256 为早先文档审核快照，后续修改以逐文件台账中的哈希为准。本文件自身不记录自指哈希。扫描原始日志、逐篇笔记和复检结果位于本机 `.lcl/work/tmp/docs-20261106`。

| 文档 | 行数 | 全文核对记录 | 扫描状态 | SHA256 |
| --- | ---: | --- | --- | --- |
| `CHANGELOG.md` | 4527 | 全文分段审核4459行历史记录，修费用唯一性、首次缓存保证、SemVer方向、并发计数与#42字段；标明#67已撤回推断及后续1017证据。 | 仍有提示，未报通过 | `e6359cba6eb7604e0880d6a42c1ae3a718ba9b218861310f789d24b45717fcbc` |
| `DEVELOPMENT.md` | 151 | 全文核对安装类型与构建提醒，修正软链假设、历史机器目录和本机参考路径。依据 scripts/warn-live-host.mjs、package.json。 | 两项均无提示，通读记录见本行 | `270d3f5b90d64ad0daa2c69eedbb39472aec30330c942483670d7f88d3d095ea` |
| `README.en.md` | 410 | 全文对照中文与实现，修四分栏、账号池换号例外、位置自动左移、生图入口、格式兼容限制、依赖时态和SemVer比较。 | 仍有提示，未报通过 | `ba97d9c7497efa7ed6e6c7d3b5c50630f520fb043ca396d1b2c2e2db849e0441` |
| `README.md` | 569 | 全文核对四分栏、能力页入口、工具栏共享排序与独立计费、导入格式限制、费用、缓存促销时效、SemVer比较、当前依赖及历史截图。 | 仍有提示，未报通过 | `541ac3c2a438e1f7c367eecb372fe7e324cb7857f5b2e59bb22e0a5459bf209e` |
| `RELEASING.md` | 88 | 全文重写九步流程，修正强制移动公开标签、过期白名单和把日志缺行等同失败的结论。依据 package.json、scripts/verify-release.mjs。 | 两项均无提示，通读记录见本行 | `9377aec8a44ff64295ee2510465514b5485827b5a407c42b2bd5472a6aa2b218` |
| `THIRD_PARTY_NOTICES.md` | 18 | 全文核对，保留许可证登记，调整独立实现的绝对断言；新增复制代码时按实际来源登记。 | 两项均无提示，通读记录见本行 | `d14c811a26f83b52d2bdc64dd395515460ad12218fbcb154a4c498d8b598f59d` |
| `docs/ANALYSIS.md` | 340 | 全文通读研究日志，修正时态与后续路线，拆分设备身份推导，保留60项测试及146KB等历史值。 | 两项均无提示，通读记录见本行 | `117659a73bc204cd7166b7d436b0d18473e2a0a712529464ef2ba49e7d9a2976` |
| `docs/ANALYSIS_CONCLUSION.md` | 91 | 全文通读早期503占位结论，补充已由SOLO路线接替的依据，改写失败原因列表。 | 两项均无提示，通读记录见本行 | `0f00617194f54dc2ce65de7ef9697fdf2f8f606e08d7710b23baffd70bac925e` |
| `docs/ARCHITECTURE_DECISION.md` | 70 | 全文通读，明确早期Raw Chat优先决策已被SOLO路线取代。依据 src/index.ts。 | 两项均无提示，通读记录见本行 | `bbbaf205664a3e3249890f0a4a8fa53191beea3dfc41adf20f34bc6b8d8ffb5f` |
| `docs/CN_MODEL_DIRECTORY_EVIDENCE.md` | 88 | 全文通读并修正四个功能失败被扩大为任何功能失败的结论；当前 solo_work_remote 可调用记录见 src/solo.ts。 | 仍有提示，未报通过 | `7e50462e43161a6d18e28b069c343e49598857b5516893ca8df4cd49cad14975` |
| `docs/CODEC_CHANNEL_FEASIBILITY.md` | 200 | 全文核对绑定字段计数与agent阻断，纠正400绑定错误证明鉴权、全部模型不可得和完整协议已解开的过推。 | 仍有提示，未报通过 | `247ebbe9b2728e30f9f5f3ab5650f63eed64d1a430bc62f96d84e3394e4702f3` |
| `docs/DOCUMENT-SYNC-AUDIT.md` | — | 全文读取并重写审核范围与逐篇证据表，扫描不替代正文审核或正式三席审议。 | 仍有提示，未报通过 | `自身不记录` |
| `docs/DS41_CALLABILITY.md` | 89 | 全文通读，区分模型标识，修正400参数错误等同鉴权成功及零费用的推断，核对功能枚举与实际表格数量。 | 仍有提示，未报通过 | `c495dff4f421be00006afe6e7fa1543e9dc950a6b9b8d06a8cdc53afef3b0334` |
| `docs/DSH_0.2.0_RC1_IMPACT_CHECK.md` | 218 | 全文核对peer拒绝链，修正SemVer比较方向并限定宿主与历史机器证据。 | 仍有提示，未报通过 | `8d2bf1d911e27d22eba4be5df1aea7d5a784e6385c1e2e4dd0d503ddcdb1afd1` |
| `docs/DSH_0.2.1_RC1_SYNC.md` | 513 | 全文核对rc.1至rc.5升级记录，限定WorkBuddy旧版比较与精确依赖阶段，修正提交数量表述。 | 仍有提示，未报通过 | `6fa4d01e90a3ee4ff4e29b378a92dcc09b46cdb5ae551a696938ab7d6adbd522` |
| `docs/DSH_0.2.2_RC1_SYNC.md` | 154 | 全文核对新profile字段、badge补绘与验证范围，区分可运行证据和零缺陷断言。 | 仍有提示，未报通过 | `70995af5b1234c61714c339ab7e3b2f99c3c8bf3e7f1ef8d20b8224b5c2e0f47` |
| `docs/HANDOFF.md` | 247 | 全文通读混合交接，标明原生工具通道与早期轮询限制来自不同阶段，保留18/54历史计数。 | 仍有提示，未报通过 | `2efa29fe2066f2755e26dede14bb7f85ce7278aff85b7ccf64e67a5d73a0251c` |
| `docs/IMPLEMENTATION_PLAN.md` | 169 | 全文通读第一阶段计划，标明2026-08-28的测试数和未实现项，补充当前实现入口。 | 仍有提示，未报通过 | `0f65794676684f083591f655ef5a78a3de26903c10681b7c17854b0deac1e2e1` |
| `docs/INTL_PAID_TIER_PROBE.md` | 115 | 全文通读，修正仅有免费样本却断言付费行为、真实对话被称为只读、临时脚本被当现成工具的问题。 | 仍有提示，未报通过 | `bca6df995ea97b8b4ead91cd83164af971b6a918a10e1dd7c3f296cb2831958f` |
| `docs/INTL_SG_EVIDENCE.md` | 251 | 全文核对SG证据与刷新契约，删除重复标题、修正A+定义与只读范围、聊天function及US边界。 | 仍有提示，未报通过 | `a429def7889f10c6058bb55e8f93ac676d8a76f0461c05e7573518a87293eb8e` |
| `docs/INTL_SUPPORT_PLAN.md` | 212 | 全文通读，说明区域初期方案已发展为三个并行面板；国际CLI仍拒绝，保留刷新契约修订。 | 仍有提示，未报通过 | `46c46d0ae7ff83fa9f0549e2afc990ac607f25e3b08d7a4821215c70e981c09e` |
| `docs/ISSUE10_DIAGNOSIS.md` | 177 | 全文核对三轮缓存实验，修正第二轮与第三轮计数、首轮必冷的错误保证；保留原始 usage。 | 仍有提示，未报通过 | `07496b7bfb7912810ee5abf5984f7e379a6907bef4ece8996871f7895d75ecba` |
| `docs/ISSUE10_REPLY_DRAFT.md` | 82 | 全文核对回复与诊断原始表，修正三轮请求形态、缓存首轮保证和安装命令。 | 仍有提示，未报通过 | `b886e75a282d9b727f1ef3966c0cfe6ff4e5cf82abdf961d9dbcb0f94f314e92` |
| `docs/ISSUE11_DIAGNOSIS.md` | 163 | 全文通读；核对先记录测试缺口再补测的阶段顺序；现有测试不能沿用当时缺失断言。 | 仍有提示，未报通过 | `bce43a4931493a88abcf9419b294ec00aff5585a7cc2208f719833abc81ee6ba` |
| `docs/ISSUE11_REPLY_DRAFT.md` | 52 | 全文通读；核对2.0.6区域开关，后续已为三个独立面板。 | 仍有提示，未报通过 | `bacbbb064bf89cc1d4770ee63d8cf7c50bbb7cd4547b09a7a781381127ef5cef` |
| `docs/ISSUE13_REPLY_DRAFT.md` | 102 | 全文通读；核对0.1.5至0.1.7兼容说明，当前客户端使用能力检测，旧测试数保留。 | 仍有提示，未报通过 | `f7d0d1a128ad7d6d480a0e62b41f9adfd7314496cfce64591e63429a8ff5e676` |
| `docs/ISSUE19_DIAGNOSIS.md` | 194 | 全文核对免费样本、错误码与后续修复，纠正4011归属误判、只读声明和未验证的Seed区域断言。 | 仍有提示，未报通过 | `e0bc1a018c8a3e35d3e1c66d2b5a0238018f26f3951da6e1e2c2e8456b2c7ef1` |
| `docs/ISSUE27_DIAGNOSIS.md` | 260 | 全文通读；核对0.86代际边界、双向适配与vite假阳性；保留被后段推翻的早期方案并前置提示。 | 仍有提示，未报通过 | `debec02668265ae044ad922f3f55c6da81ce55fd285c53c2cc4c7676e1ed48ff` |
| `docs/ISSUE27_REPLY_DRAFT.md` | 122 | 全文通读；核对报告实际对应#34，升级宿主并不保证更换所解析的pi-ai副本。 | 仍有提示，未报通过 | `dfd5fdf52c5a70fb40b4b34676137b25df77187dd7f677ca8b58da15f9d20a6a` |
| `docs/ISSUE33_DIAGNOSIS.md` | 198 | 全文核对限流取证，限定矩阵推论、并发计数和未测恢复时间；真实对话不称只读。 | 仍有提示，未报通过 | `4065d8808e3834656a1df073e9d756f4d405a51ea444744b667ffa252cba567b` |
| `docs/ISSUE33_REPLY_DRAFT.md` | 101 | 全文通读；核对4011限流文案，恢复时间及重试影响未经测量。 | 仍有提示，未报通过 | `a221fde344f2a5ce2da94ba7a3e132932e72ff3a187ee7b260868f6a391cc3ac` |
| `docs/ISSUE34_REPLY_DRAFT.md` | 122 | 全文通读；核对双向上下文与运行时副本；WorkBuddy缺口仅指当时读取版本。 | 仍有提示，未报通过 | `7c5f1b551dc4ffe498e4c0e3e04bb899f012882bc6e642e5f9b68b4ffe59ee39` |
| `docs/ISSUE42_DIAGNOSIS.md` | 82 | 全文核对最大输出合并，修正三行与两行缺值矛盾及只读首项的适用范围。 | 仍有提示，未报通过 | `6c56a625d569c45b7007e345ff11961bd1f765b5111b98c692c972e7eda754aa` |
| `docs/ISSUE42_REPLY_DRAFT.md` | 73 | 全文通读；核对最大输出合并与80配置样本，只读首项安全不能推广。 | 仍有提示，未报通过 | `b6c2f8bc51e64ac95538696926677047035149d122c67e5aa6fca138e97debfa` |
| `docs/ISSUE46_DIAGNOSIS.md` | 378 | 全文核对日期配置、显示名去重与4.4.1后续实测，纠正1017未经采样却断言独立ID及保证出现；最大输出缺口不混同wireConfigName。 | 仍有提示，未报通过 | `b7a34d723303c7f1342c67a4831d66664e558d159bbe267ad4c522ccc90a1b54` |
| `docs/ISSUE46_REPLY_DRAFT.md` | 120 | 全文核对日期配置、显示名去重与4.4.1后续实测，纠正1017未经采样却断言独立ID及保证出现；最大输出缺口不混同wireConfigName。 | 仍有提示，未报通过 | `6602e3ad316326f7b657043a4fc38019cfb83dc2eeda4c8d802ffaace4396d63` |
| `docs/ISSUE52_DIAGNOSIS.md` | 568 | 全文核对P0/P1/P2实施阶段、隐藏行计数与视图行为，纠正11行中有13行及乘法推导。 | 仍有提示，未报通过 | `3c4f6a9de2cc8870715e75ef467519148b6cadff56710f7f84d8aaa956355e84` |
| `docs/ISSUE5_REPLY_DRAFT.md` | 63 | 全文通读；核对CLI身份修复与目录隐私，更新安装语法。 | 仍有提示，未报通过 | `bcb16fd66748756f17d2e70c61297c3863dcb8bcd91e57191ab29266574182e2` |
| `docs/ISSUE66_DIAGNOSIS.md` | 151 | 全文核对US解析与HTTP透传，保留25例历史验证，修正尚未发版的时态及请求证据可保证接入的表述。 | 仍有提示，未报通过 | `b383650bf8bc9c993b83a84d616202013029b60a9eb94c20523d2c12ebc90674` |
| `docs/ISSUE67_DIAGNOSIS.md` | 164 | 全文核对缓存诊断与#69账单反证，撤销null等同无缓存、TTFT证明内部复用及不用再排查的过强结论。 | 仍有提示，未报通过 | `bb7c54613a40bca337ebeb3de3b2aa0b3a7022aa7bb4d010b6dab50b440d1cb1` |
| `docs/ISSUE67_REPLY_DRAFT.md` | 9 | 全文核对缓存诊断与#69账单反证，撤销null等同无缓存、TTFT证明内部复用及不用再排查的过强结论。 | 两项均无提示，通读记录见本行 | `8cee0840efe977b7a8903619fb623f95cc8268f10a7941fcd230541e7770cda6` |
| `docs/ISSUE69_DIAGNOSIS.md` | 155 | 全文核对计费反证、比值精度与样本边界，修正新会话必贵、唯一可信读数和对所有账号保证折扣。 | 仍有提示，未报通过 | `5cc32b642cb0878b7a81273cf48140d60aa300a07396d206cb90fbb3b6f7f7d3` |
| `docs/ISSUE7_REPLY_DRAFT.md` | 62 | 全文通读；核对2.0.2模型限制，后续function覆盖扩展，旧不可用断言不再适用。 | 仍有提示，未报通过 | `7827c8f03cac9ee790145f3bd5c84beb80b87b805c7ffd5c2613cca9d214a539` |
| `docs/ISSUE8_DIAGNOSIS.md` | 123 | 全文通读；核对fallback上下文缺口，临时复现脚本仅为当次环境。 | 仍有提示，未报通过 | `317db885646934e6cdb5e987cc24204a906787167e3ba5bb3bc8e676cbe82713` |
| `docs/LOCAL-DEPLOYMENT.md` | 55 | 全文通读安装来源及历史验证，旧 PID 与截图结论属于当次事件，更新记录另列。 | 仍有提示，未报通过 | `8217895103f200e5f1cad55ec9e2047f3e2ad9325dc1c9ba74185caece3bfe4f` |
| `docs/MODEL_MANAGEMENT_DESIGN.md` | 155 | 全文核对模型设计与后续实现，修正wire仅映射、join缺失必删的旧约束。 | 仍有提示，未报通过 | `2bfc4a451ed06a8468545dde0227d1f601aa3d76ca843ccd5d16ef426ddffff2` |
| `docs/MODULE-SPLIT-PLAN.md` | 55 | 全文通读拆分职责和原测试计数，保留该次基线，明确主组件仍保留的职责。 | 两项均无提示，通读记录见本行 | `8c1553319f9acc04ecd73c19f4fe6042a82d6c3952f7214ac6b809a608d19a6f` |
| `docs/PROMO_BADGE.md` | 202 | 全文核对优惠规则、current滞后与限时说明，修正恒无国际徽标和不会漏活动的绝对保证。 | 仍有提示，未报通过 | `b6d03c796774d6df3a3ab05c2149ca39ac4dc7a9295441324a598a40e65b8a42` |
| `docs/PROMO_CLIENT_RENDER.md` | 184 | 全文核对SDK类型与不可见配置的证据层级，标明由截图反推的tag键与Jexl判定。 | 仍有提示，未报通过 | `30eae81f5c68116b1f870c92de175863732825e82be26748056b23fa899deea0` |
| `docs/PROTOCOL_EVIDENCE.md` | 228 | 全文通读协议证据，保留原始响应与版本适用条件，本轮未重新执行计费实验。 | 仍有提示，未报通过 | `ffab16c03922d4c59797795f1941151e7434e4121d965fe1c48329ae3e89b28f` |
| `docs/PR_ENTERPRISE_PROVIDER.md` | 195 | 全文核对企业独立面板与兼容段，修正一个区域开关同时控制两个provider的自相矛盾。 | 仍有提示，未报通过 | `311949deba69338fee57e7ebd558f92337e687043e0edb8f2c52e08d40635999` |
| `docs/PUBLIC_RELEASE_GUIDE.md` | 139 | 全文通读发布基准，修正已存在发布流程与实际白名单的关系，市场条件注明为历史调研。 | 两项均无提示，通读记录见本行 | `670a272a0e3dbf0f463143cde0ce5230e659eef75fa849bf70114153b303f6f5` |
| `docs/RAW_CHAT_PROGRESS.md` | 51 | 全文通读，区分研究阻断与当前生产通道；保留历史400响应。依据 src/index.ts、src/raw-upstream.ts。 | 两项均无提示，通读记录见本行 | `d8f55a143a9cd27b74e5e1418dccb9f87597ea2a310f2633725cc04579f518a7` |
| `docs/RC2_IMPACT_CHECK.md` | 113 | 全文核对0.1.7旧符号比对与WSL锁边界，明确历史机器与当前依赖范围不同。 | 仍有提示，未报通过 | `0a024998be2878bca8f3b32de518d654c731f20432476b14bc9c5fe1bfd401a4` |
| `docs/RELEASE_EXPERIENCE.md` | 155 | 全文通读后重写，保留发布事件、原哈希和时间；修正标签移动、沙箱必然归因和日志缺行推断，移除抽取凭据的可执行探针。 | 两项均无提示，通读记录见本行 | `5c1820e63ec0bfc2e1bae5edea8698064d50a45dfce593780f6da448f4b9b46f` |
| `docs/RELEASE_NOTES_v2.10.0.md` | 48 | 全文通读发布记录；核对2.9系列合并发布与侧栏行，默认值已在2.10.1反转。 | 仍有提示，未报通过 | `85c4c897be85738029a75acb29d807a20862c8da1b98f8e8971d4eda249d3377` |
| `docs/RELEASE_NOTES_v2.10.1.md` | 32 | 全文通读发布记录；核对默认关闭和删除行内开关；不把历史侧栏当当前入口。 | 仍有提示，未报通过 | `31e632c1430e9ad8433c488707d684d68383a4a3f4b20ac8edcbf58946e2d8da` |
| `docs/RELEASE_NOTES_v2.10.2.md` | 18 | 全文通读发布记录；核对历史产品区域标签与积分口径。 | 仍有提示，未报通过 | `ae8d2ec10ee46d02da44b08984e81c3f6a9548e6cf7b4509a89efe47ee6d0ced` |
| `docs/RELEASE_NOTES_v2.10.3.md` | 28 | 全文通读发布记录；核对横向flex冲突及整行宽度修正，保留布局测试限制。 | 仍有提示，未报通过 | `acd8337983ace9a7781014d3c8427a3db1ff7b27bc660826094f69ab4d8fe9f7` |
| `docs/RELEASE_NOTES_v2.11.0.md` | 32 | 全文通读发布记录；核对按供应商显示和输入左槽；当前显示策略与槽位已变化。 | 仍有提示，未报通过 | `4fa01bfaef6911791cfde4fe512000a76cd2b68d0c7a9b7e0a57254a6ed9b15f` |
| `docs/RELEASE_NOTES_v2.11.1.md` | 16 | 全文通读发布记录；核对圆点及真实文案断言，当前标题由用户重新指定。 | 仍有提示，未报通过 | `621aac789f2a615915a0fd03c81478fd23934bbbf52a9950e3b3a42075625e13` |
| `docs/RELEASE_NOTES_v2.12.0.md` | 34 | 全文通读发布记录；核对锚定浮层与注入方案；后续本地hook及打包修复见2.13.2。 | 仍有提示，未报通过 | `22556998bb5f5b812ee21894f4cdb8653dee7ef032fd833811470e9abe7e8c34` |
| `docs/RELEASE_NOTES_v2.13.0.md` | 23 | 全文通读发布记录；核对侧栏积分行移除与废弃字段；字段后来在2.13.3重新使用。 | 仍有提示，未报通过 | `6ed4e64aa8dee009831aef42d6340c18c561fe0971334bd1d654190ee7e5a91f` |
| `docs/RELEASE_NOTES_v2.13.1.md` | 44 | 全文通读发布记录；全文发现错误根因已经被2.13.2明确推翻，须在文首提示。 | 仍有提示，未报通过 | `41cbc0617d09e8ed5b5103cca89d97e649a2157574eba619faeb4725217d6cbd` |
| `docs/RELEASE_NOTES_v2.13.2.md` | 56 | 全文通读发布记录；核对react-dom内联、process.env与模块注册；保留产物字节对比。 | 仍有提示，未报通过 | `483fa65298c91db73018d6140baf765b19fa3adb3d6131b453c88f0ce7050c80` |
| `docs/RELEASE_NOTES_v2.13.3.md` | 41 | 全文通读发布记录；核对显示积分开关恢复；按供应商限制后续已变化。 | 仍有提示，未报通过 | `6271031a9a6ebec767d9f36f7a67d1cbc2d9a1a0878d22bc1e2b67a87f289935` |
| `docs/RELEASE_NOTES_v2.13.4.md` | 19 | 全文通读发布记录；核对国内版限制，国际套餐读数后来由3.3.0扩展。 | 仍有提示，未报通过 | `a8af9070add50414a19974478ef0eb9cafb7bc28c847f98e4543777618bc4089` |
| `docs/RELEASE_NOTES_v2.13.5.md` | 40 | 全文通读发布记录；核对CSS独立注入与浮层定位，保留结构验证记录。 | 仍有提示，未报通过 | `91e47431f0eaa3fb16064cf050d4c4a9b1f641c8ecbda37091b016ed52622e85` |
| `docs/RELEASE_NOTES_v2.13.6.md` | 25 | 全文通读发布记录；核对12px与label-tertiary调整，保留原测量。 | 仍有提示，未报通过 | `349694ee4c4413857b613c46a718c9ac1ecbc58c2813e5204a04c9058f9d126b` |
| `docs/RELEASE_NOTES_v2.14.0.md` | 35 | 全文通读发布记录；核对账号表与切换；476到480净增4与文中8项描述存在差异。 | 两项均无提示，通读记录见本行 | `b21a5f157e4f01b7a7913b0f5b6779586745f1e2cfd68bab017aaa573fab02ad` |
| `docs/RELEASE_NOTES_v2.4.0.md` | 43 | 全文通读发布记录；检查预发布范围与识图并集；发现版本大小比较符写反及新增测试数与净增数不一致。 | 仍有提示，未报通过 | `9c2f0acdad60289372da0b8d7a6e74a2af667175a5d92e4c9139123524b8e3c5` |
| `docs/RELEASE_NOTES_v2.5.0.md` | 33 | 全文通读发布记录；核对目录合并、套餐与流内错误；4011解释后来被3.4.1修正。 | 仍有提示，未报通过 | `f82d01544ee69147994d12c5c4ee9b6d4c4b496218c3f606196907e8d931454e` |
| `docs/RELEASE_NOTES_v2.5.1.md` | 29 | 全文通读发布记录；核对chat_v3补全与17模型记录；免费样本不能证明付费模型无服务。 | 仍有提示，未报通过 | `d038e926053145e9308fabb0f5d52367b1db25d7c545a4e89766a77a5d68a855` |
| `docs/RELEASE_NOTES_v2.6.0.md` | 38 | 全文通读发布记录；核对完整显示目录及展示名误用修正；模型数量属于当时账号。 | 两项均无提示，通读记录见本行 | `7b9ce81899e339a8ed60c6960902763a5411f141c67c31051d4521e828160ce8` |
| `docs/RELEASE_NOTES_v2.7.0.md` | 42 | 全文核对并更正费用说明：模型测试与正常对话可能计费，签到会改变账号状态。保留当次版本记录。 | 仍有提示，未报通过 | `189fb21506fb9b8c0cb9d2417c30542a35c84a63563b56065f1656b54435bd23` |
| `docs/RELEASE_NOTES_v2.7.1.md` | 30 | 全文通读发布记录；核对Max优先规则；平手按dev比较的后续修正在2.7.2。 | 仍有提示，未报通过 | `c7166d776a3e4933711b2131233546697fe7b71f4013c671ed5181acb9b58cc6` |
| `docs/RELEASE_NOTES_v2.7.2.md` | 23 | 全文通读发布记录；核对四级择强与8次指纹；保留30模型及历史测量。 | 仍有提示，未报通过 | `023f7bec78e0c847f15cf0d6938d9b202b449ebefbeedecc20c05e1782aace9d` |
| `docs/RELEASE_NOTES_v2.8.0.md` | 30 | 全文通读发布记录；核对账号刷新与手动切换；当前另有用户主动开启的账号池。 | 仍有提示，未报通过 | `b8d2bcb250ba91b657803f35b26741985d39abdace056b296f6e2ad761d52083` |
| `docs/RELEASE_NOTES_v2.9.0.md` | 34 | 全文通读发布记录；核对初期侧栏开关、5分钟刷新及贡献者测试记录。 | 仍有提示，未报通过 | `c629f43cd98bd73d15cf8e26ae1c72699447a4eeaddc5f588823850d1836944d` |
| `docs/RELEASE_NOTES_v2.9.1.md` | 35 | 全文通读发布记录；核对默认开启与恢复入口；后续2.9.4删除残留按钮。 | 仍有提示，未报通过 | `7818f9a2e93e37206e1b5077b79be80b1295771ed948ef1db1366fb9406a9a9b` |
| `docs/RELEASE_NOTES_v2.9.2.md` | 10 | 全文通读发布记录；核对历史Trae通用积分标签；当前显示文案已改变。 | 两项均无提示，通读记录见本行 | `0a911fb2c0c66279d6abbaafdf7da728671234be5f1ed485785447ca2281c966` |
| `docs/RELEASE_NOTES_v2.9.3.md` | 22 | 全文通读发布记录；核对缺失复选框CSS与多处设置写入；永不冲突为过度保证。 | 两项均无提示，通读记录见本行 | `80da2438c8eae880678b39731982f3ccfaf5a0eda69f89c53267ea9eb2c140fd` |
| `docs/RELEASE_NOTES_v2.9.4.md` | 17 | 全文通读发布记录；核对关闭后零DOM与停轮询；保留历史测试。 | 仍有提示，未报通过 | `aadb5bbbda240eebf354e28c81698e79b95e5f519af6097c4180567f766a775b` |
| `docs/RELEASE_NOTES_v3.0.0.md` | 49 | 全文通读发布记录；核对凭据合并和绑定账号取数；历史双列表已增加操作列。 | 仍有提示，未报通过 | `764c6828f80ca1f11922d119c93555ae72e1c993028d7cfd681e3ec6367b29fb` |
| `docs/RELEASE_NOTES_v3.3.0.md` | 60 | 全文通读发布记录；核对国际套餐、设置重做和秒毫秒修正；批量签到后续已增加。 | 仍有提示，未报通过 | `293a542aa2d61859eeaf88663f70641a74e58c912d8911975f1689b4b105d21d` |
| `docs/RELEASE_NOTES_v3.4.1.md` | 52 | 全文通读发布记录；核对4011改为限流、4008额度、4023模型错误。依据 src/solo-bridge.ts、src/model-probe.ts。 | 仍有提示，未报通过 | `107b5b0bbe59ed403ffee3f0241495e0501746b81d28632795e3abfe5825376c` |
| `docs/RELEASE_NOTES_v3.4.2.md` | 109 | 全文通读发布记录；核对pi-ai代际0.86与上下文双向转换；保留549到594计数。 | 仍有提示，未报通过 | `f8e2106f714d8e87ab9bf743ea520ae5cade75804bd19ad7a9fec861bb6470a7` |
| `docs/RELEASE_NOTES_v3.4.3.md` | 88 | 全文通读发布记录；核对保存遮罩与主题令牌；费用说明须明确聊天和模型测试可能计费。 | 仍有提示，未报通过 | `033983801f0bb432bf9e1fb00ad2a11fe4637adbfe669c0169558d81d848cd1e` |
| `docs/RELEASE_NOTES_v3.5.0.md` | 100 | 全文通读发布记录；核对显示位置与区域关闭判断；当前输入槽位已迁移，修正费用概括。 | 仍有提示，未报通过 | `6b426ce394e59c63012f7d72bd29c7f4d188b6de491d51ee984b015496efc2c0` |
| `docs/RELEASE_NOTES_v3.5.1.md` | 72 | 全文通读发布记录；核对展示名覆盖与调用名大小写；保留HTTP200流内4001证据。 | 仍有提示，未报通过 | `af41b6396fab68b60fd52f4100904b441bb6e818e7d8e9317d0fbe27b2f204eb` |
| `docs/RELEASE_NOTES_v3.6.0.md` | 73 | 全文通读发布记录；核对导入导出、多账号写入与2001错误；区分格式兼容与凭据可用。 | 仍有提示，未报通过 | `485ed9bc41dea82db9a547304976966763fac24fd942fb988ca46f411286b53c` |
| `docs/RELEASE_NOTES_v3.6.1.md` | 60 | 全文通读发布记录；核对刷新令牌30天提醒；有效期内也可能因撤销或网络失败而无法续期。 | 仍有提示，未报通过 | `cb8c6ac7caf2a3aa634ce608bd5fdfa65d0d4b88d9aafac65c33e97235235fe1` |
| `docs/RELEASE_NOTES_v3.7.0.md` | 105 | 全文通读发布记录；核对上下文适配与1.1.0类型；当前开发依赖版本已继续升级。 | 仍有提示，未报通过 | `531fa63bd34a71560aa765196ba878efaca542c01c9df46fbb6fc8b71468b229` |
| `docs/RELEASE_NOTES_v3.8.0.md` | 105 | 全文通读发布记录；核对企业独立计费与session_id，保留当时真实账号记录。 | 仍有提示，未报通过 | `2c33cfdf924e4b59b16d50ebcf4073282b231e3b5b474c064db9724c19cd547a` |
| `docs/RELEASE_NOTES_v4.7.0.md` | 31 | 全文通读发布记录；核对可选侧栏页与动态注册；当前已增加能力分栏。 | 仍有提示，未报通过 | `adb7f804cbcfd06e09569670122171ff3bd722514811a504fbdec4ba384cd543` |
| `docs/SOLO_ROUTE_DECISION.md` | 91 | 全文通读，说明当前原生通道仍有效，单功能示例已扩展为目录功能映射。依据 src/solo.ts、src/index.ts。 | 两项均无提示，通读记录见本行 | `05ff9ae2d39ebb93e5344808423d4e0d7a5f450b8e63a6cf8113f5009f8a2258` |
| `docs/TRAECLI_FEASIBILITY.md` | 227 | 全文核对CLI版本、认证与agent归属，限定不可行结论；纠正14模型与TraeCode已接入的矛盾。 | 仍有提示，未报通过 | `7eccccef48630f6475a09c3c9fd8afd8ccf051f30753b834a25df6f22858a6f3` |
| `docs/TRAE_ECOSYSTEM_RESEARCH.md` | 164 | 全文核对生态调研范围与CLI路径推断，修正没有任何项目、四host404证明本地端点等过推。 | 仍有提示，未报通过 | `7622e4b2eabbbc98a1985954cbb846210501b1835fb977518469fb11d3534ae3` |
| `docs/USAGE_API_RESEARCH.md` | 228 | 全文核对签到账号与设备语义、历史修复和输出隐私，修正旧双字段已领取判据。 | 仍有提示，未报通过 | `d89409e453c5eea29d366fe4f7ae62fa7075b285de8b0cad70ffb185d4d6fbe1` |
| `docs/WINDOWS_TOKEN_PROBE.md` | 236 | 全文核对Windows指南与当前双区域实现，修正国际桌面被忽略、输出无条件安全及明文Base64异常。 | 仍有提示，未报通过 | `5c2724b3b60652138606f08c745f933a4ad8bac5965329520c95f002c54ca993` |
| `docs/WINDOWS_VERIFY_GUIDE.md` | 204 | 全文核对验证脚本边界与脱敏，修正从不读取凭据的错误声明、DSH_HOME定位及必须人工执行的说法。 | 仍有提示，未报通过 | `abc7e7c030f3774b16e133ecac8ce5acbf981e747ef516255d8fa0585e82ebf1` |
| `docs/WSL2_CLI_PROBE.md` | 83 | 全文通读，修正路径命中等同登录、国际CLI回退和路径输出可无条件分享的说法。依据 src/paths.ts、src/auth.ts。 | 两项均无提示，通读记录见本行 | `c6cf4d344cae19030e6a4cfaff28c5a397dd2e15b4c03c84717b0005154b804d` |

## 23:38 设置页部署补充

两个项目重新构建后于 23:37:55 部署，96 个部署文件与构建来源哈希一致。备份目录为本机临时目录下的 `dsh-ui-copy-20261106-233755`。重启后两个国内区快速用量接口均返回 HTTP 200、signed-in；用户已确认 DSH 设置栏同时显示两个插件。WorkBuddy 此前漏注册独立设置页，本轮已补齐。该验证不代表尚未完成的全部文字审核已经通过。
