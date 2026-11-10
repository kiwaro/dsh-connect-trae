# 发布流程

本文规定 `dsh-connect-trae` 的公开发布步骤。当前工作区来自 `kiwaro/dsh-connect-trae`，本地版本以 `package.json.version` 为准；执行本地部署不会发布 npm 包或 GitHub 版本。历史发布经过见 [发布经验](docs/RELEASE_EXPERIENCE.md)，该文记录当时的环境与操作结果。

本地部署按 [本地部署记录](docs/LOCAL-DEPLOYMENT.md) 执行。公开发布和推送需要用户明确授权。执行前先核对目标仓库与包名，再确认目标版本及操作账号。

## 1. 确认发布环境和修改内容

在项目目录执行：

```powershell
git remote -v
npm whoami
pnpm run check
Get-Content LICENSE
```

核对当前账号拥有目标包的发布权限，远程仓库与用户授权一致。保留 `LICENSE` 中的版权声明。测试、类型检查和构建全部通过后继续；软链安装需要先按 [开发说明](DEVELOPMENT.md) 处理运行中的 DSH，避免构建改写其正在加载的文件。

## 2. 更新版本号

修改 `package.json` 的 `version`。下文使用 `X.Y.Z` 表示经确认的目标版本；执行命令时替换成实际版本号。已经公开发布的版本使用新版本号修正。

## 3. 整理变更记录

在 `CHANGELOG.md` 顶部增加目标版本章节，填写实际发布日期及用户能够核对的变更。若存在 `docs/PENDING_CHANGELOG.md`，检查其条目并合入相应版本；文件不存在只能说明没有该暂存文件，仍需核对提交和工作区改动。

README、界面文案、版本号和发布说明应描述同一份实现。测试数量取自本次实际输出，历史测试数量保留在各自版本中。

## 4. 提交并创建版本标签

先检查暂存差异，确保本次实现、版本号、日期和说明完整进入版本提交。以下为已获推送授权后使用的示例；分支与远程名称以第 1 步核对结果为准。

```powershell
git diff --cached
git commit -m "chore: 版本升级至 X.Y.Z"
git tag -a vX.Y.Z -m "vX.Y.Z: 本次变更说明"
git rev-list -n 1 vX.Y.Z
git push origin main
git push origin vX.Y.Z
```

已推送或对应包已发布的标签保留原指向。发现版本内容错误时，创建修正提交和新版本；遇到同名标签先核对其来源与指向，不执行自动删除或强制移动。

## 5. 检查打包内容并发布

```powershell
npm pack --dry-run
npm publish
```

打包检查以 `package.json` 的 `files` 和命令输出为准。当前白名单包含 `lib/`、`icons/`、两份界面截图、模块拆分与本地部署记录、Windows 诊断脚本、截图清单、插件配置、双语 README、变更记录、第三方声明和许可证。npm 还会自动携带 `package.json` 等规定文件。

检查包内没有凭据、诊断临时副本或开发目录。README 引用的文档若不在包内，应使用对应仓库的文件链接；当前白名单中的两份维护记录可以使用相对链接。更改白名单后重新核对实际打包结果。

### 5.1 隐私门禁与 OCR

`pnpm exec vitest run tests/privacy.spec.ts` 检查仓库文本，`pnpm run verify:privacy` 还检查发布物和图片。OCR 必须报告 `OK`；`SKIP` 只表示后端未执行。发布前可用 `DSH_STRICT_PRIVACY=1` 强制缺失后端时失败，不能将跳过当作通过。

需要本地语言包时，设置 `DSH_TESSDATA` 指向包含 `eng.traineddata.gz` 的目录；`scripts/verify-privacy.mjs` 根据该目录调用 `tesseract.js`。检查前先核对依赖和路径，不应为通过 OCR 而改变已有截图或关闭检查。

## 6. 完成身份验证

根据当前 npm 命令提示完成身份验证。需要用户在浏览器或交互终端确认时，保留此次发布命令和日志，待验证完成后继续。账号能够执行 `npm whoami` 只证明已识别身份，发布权限仍由实际发布请求确认。

出现 `EOTP`、`E401` 或 `E404` 时，结合该次请求日志检查身份验证、包名、权限和 registry 地址。历史版本曾在上传完成后报告凭据错误，因此不能单凭退出信息决定是否重发。

## 7. 验证目标版本

```powershell
npm view dsh-connect-trae@X.Y.Z version
npm view dsh-connect-trae dist-tags.latest
```

目标版本查询成功表示 registry 已公开该版本；再核对其内容是否属于本次发布。若按正式版发布，`latest` 应指向目标版本；若用户授权预发布，核对授权的标签。

版本暂时查不到时，检查该次发布日志是否已受理，再等待并复查。只看到旧的 `latest` 无法判断目标版本是否上传；同名版本已经存在时，先核对内容，避免重复发布。保留原发布日志，后续查询命令会产生新的日志。

## 8. 核对已发布包与版本源码

```powershell
pnpm run verify:release
pnpm run verify:release -- X.Y.Z
```

`scripts/verify-release.mjs` 检查标签与工作区、registry 状态、包内文件及从标签源码重建的产物。重建使用临时工作目录，不改写当前工作区的 `lib/`。具体检查项以脚本当次输出为准；标签不存在或 registry 尚无目标版本时，退出码 2 表示核验缺少前置条件。

当前工作区包含未发布的本地维护改动，核验上游同版本包时可能发现预期差异。应记录具体差异，不能为了通过核验而覆盖用户改动。核验脚本本身不在发布白名单内，需从源码仓库执行。

## 9. 创建 GitHub 发布说明

在经授权的仓库中选择第 4 步的既有版本标签，使用 `CHANGELOG.md` 对应章节撰写发布说明。核对版本号、测试结果、模型名单与比较链接；正式版和预发布状态按本次授权设置，附件按实际分发需要提供。

创建后核对页面指向的标签、源码版本与 npm 版本。随后在 DSH 中验证该发布包的安装与加载，记录实际结果。发布之后新增文档或修正提交不移动已有公开标签；下一版本包含哪些文件，由其版本提交及发布包确定。
