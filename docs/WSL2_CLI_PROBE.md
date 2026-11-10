# WSL2 / Linux 环境排查备忘：Trae CLI 登录探测

> 对应 issue #5（WSL2 中通过 `traecli` 登录后插件显示「未登录」）。
> 本文说明如何从路径列表和文件存在状态定位 CLI 登录问题。

## 背景：为什么 CLI 登录此前完全不工作

插件原本只认**桌面包**的位置：

```
~/.config/<Trae 目录名>/User/globalStorage/storage.json
```

这份文件里 key 为 `iCubeAuthInfo://icube.cloudide` 的值是 **AES 加密**的，
插件用 `src/decrypt.ts` 解密后取出 token。

但 `traecli` 是另一个产品，它写入独立的用户目录，文件内容是未加密的 JWT：

```
~/.trae-cn/trae-jwt-token      # CN 版 CLI，实测（macOS）
```

两者路径、文件名、格式全都不同。只装 CLI（或只用 CLI 登录）的机器上
**根本不存在 `storage.json`**，所以插件恒显「未登录」。

WSL2 环境须特别检查此项：WSL2 里通常只装 `traecli`，不会装 Linux 桌面版 IDE。

## 现已支持的探测位置

插件按区域和配置的版本筛选下列候选。文件存在后还需通过格式解析与凭据有效性检查，才能识别登录状态。路径生成见 `src/paths.ts`，候选筛选与解析见 `src/auth.ts`。

| 来源 | 路径 |
| --- | --- |
| CLI | `~/.trae-cn/trae-jwt-token`（CN） |
| CLI | `~/.trae/trae-jwt-token`，路径标记为国际版候选；当前认证层拒绝未验证的国际 CLI 契约 |
| 桌面版 | `$XDG_CONFIG_HOME` 或 `~/.config` 下 `trae-cn/`、`Trae CN/` 的 `User/globalStorage/storage.json` |
| 桌面版 | 其余 edition（产品变体）的同构路径；`cn` / `solo` 与 `sg` / `solo-sg` 分别由对应区域供应商筛选 |

> **Linux 桌面版目录名 `trae-cn` / `Trae CN` 都未经真机验证**，
> 因此采用多个候选路径探测。未列出的安装目录仍可能遗漏，可用 `authFile` 指定实际文件。

## 如果升级后仍然显示「未登录」

插件卡片现在会显示一个可折叠的 **「已检查的路径」** 列表，
逐条列出探测过的路径，失败类型包括“文件不存在”“无法读取”和“格式无法识别”。

请把列表里**除你自己家目录用户名外**的内容截图或贴回来，
并额外执行下面这一条命令确认实际布局：

```bash
ls -d ~/.trae* ~/.config/*[Tt]rae* 2>/dev/null
```

这条命令只列目录名，不会读取令牌内容。分享输出前遮盖用户名和其他个人目录名。

如果有输出，再补一条（确认文件在不在）：

```bash
ls -la ~/.trae-cn/trae-jwt-token ~/.trae/trae-jwt-token 2>/dev/null
```

### ⚠️ 不要贴出这些内容

- `cat ~/.trae-cn/trae-jwt-token` 的**输出**（那就是 token 本身）
- `storage.json` 里 `iCubeAuthInfo://icube.cloudide` 的 **value**

可以提供文件是否存在和失败类型；目录路径中含用户名时，先遮盖个人信息。

## 临时解决办法

如果实际路径与上表都不同，可以用插件配置项直接指定：

```yaml
authFile: /home/<你的用户名>/.trae-cn/trae-jwt-token
edition: cn
```

`authFile` 现在会**同时**按桌面版文档和 CLI token 两种格式解析，
所以指向 `storage.json` 或 `trae-jwt-token` 都可以，不必事先判断。

## 相关文档

- `docs/WINDOWS_TOKEN_PROBE.md`：Windows 真机排查，包含加密头与目录名验证。
