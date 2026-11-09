# 第三方开源声明

本文记录与 Trae 协议研究直接相关的参考项目及已登记的许可证。分发复用代码时，应保留适用的署名和许可文本。平台与构建依赖的许可信息另见各依赖包；本文没有列举全部 npm 依赖。

## 与 Trae 接入相关的参考项目

本项目早期记录将以下项目用于架构模式和上游协议研究，并注明采用独立实现。各项目的版权属于其作者。后续维护如果复制或派生第三方文件，应按实际来源补充声明；仅有本表不能证明所有文件都已经完成来源核对。

| 参考项目 | 仓库 | 参考内容 | 许可证 |
| --- | --- | --- | --- |
| `dsh-trae-api` | <https://github.com/Wang-JQ77/dsh-trae-api> | 认证、会话与模型目录的参考及失败分析，见 `docs/ANALYSIS.md` 和 `docs/ANALYSIS_CONCLUSION.md` | MIT |
| `laojichao/trae-local-api` | <https://github.com/laojichao/trae-local-api> | `dsh-trae-api` 的直接上游；早期记录为协议调研线索，见 `docs/SOLO_ROUTE_DECISION.md` | 未声明；按保留所有权利处理 |

## 合规说明

- `dsh-trae-api` 使用 **MIT** 宽松许可，与项目自身的 MIT 许可证兼容；`laojichao/trae-local-api` 未声明许可证（保留所有权利），本项目仅将其作为协议调研线索，未复制、修改或分发其代码。
- MIT 许可要求保留上游版权声明。本项目**不重新打包或再分发**上述参考项目的源码，仅参考其架构思路与协议信息；`docs/` 中的分析文档亦为独立撰写。
- 若后续引入新的与 Trae 接入相关的依赖或复用其他项目的代码，必须在引入时同步更新本文件，并遵守对应许可证的署名与声明要求。

## wild-work 思路参考

参考 `rockswang/wild-work` 提交 `dffbc643781723752de03a2cf7fac3308c5b8b54`（2026-11-06）的 `internal/ledger/credit.go` 与 `internal/provider/usage.go`：积分包快照差分与缓存字段兼容。本次为独立实现，未复制或分发其源码。该参考项目采用 MIT License，版权主体为 Copyright (c) 2026 rockswang。源码地址：<https://github.com/rockswang/wild-work>。
