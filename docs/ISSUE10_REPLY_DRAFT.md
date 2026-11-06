# issue #10 回复草稿（发布 2.0.5 之后再贴）

> 2026-11-06 全文复核：历史回复草稿，安装版本和上游行为以当时为限。缓存归零的后续证据见 ISSUE69_DIAGNOSIS.md；文中的发布及回复步骤不是本轮操作。

> 用途：回复 https://github.com/dingminhua/dsh-connect-trae/issues/10
> （1309893790：「我测试了一下一直0缓存」「不知道接口原因还是 trae 上有缓存」）
>
> **先发布 2.0.5 到 npm，确认 `npm view dsh-connect-trae version` 显示 2.0.5
> 之后再贴。** 可直接复制横线以内的内容。

---

感谢反馈，你这个问题**问得很准**——「是接口原因」这个方向对了，而且**Trae 确实有缓存**，
只是**插件把缓存字段丢了**。已修复，v2.0.5 发布。

## 结论

**不是 Trae 不缓存，是插件没把缓存数据搬出来。**

| 环节 | 情况 |
| --- | --- |
| Trae 上游 | ✅ 真的在报缓存（实测命中 9216 tokens） |
| 插件解码层 | ❌ **把 `cache_read_input_tokens` 字段直接丢了** |
| DSH 显示 | ❌ 从未收到非零值，所以稳定显示 0 |

## 证据：Trae 上游确实在报缓存

我用插件自己的请求路径，连续发送三轮请求：第一轮只发 PREFIX，第二轮加 SUFFIX，第三轮与第二轮完全相同：

```
第 1 次（PREFIX）  : prompt_tokens=5258  cache_read=0
第 2 次（PREFIX + SUFFIX）: prompt_tokens=9224  cache_read=5248
第 3 次（与第 2 次相同）: prompt_tokens=9224  cache_read=9216   ← 命中
```

上游返回的原文（第 3 次，真实捕获）：

```json
{"prompt_tokens":9224,"completion_tokens":173,"total_tokens":9397,
 "cache_creation_input_tokens":0,"cache_read_input_tokens":9216,...}
```

所以**上游一直有数据**，字段名是 `cache_read_input_tokens`。

## 根因：插件在解码时就把字段丢了

插件把 Trae 的事件翻译成 OpenAI 格式时，只搬了 4 个计数器：

```
prompt_tokens / completion_tokens / total_tokens / reasoning_tokens
```

`cache_read_input_tokens` 和 `cache_creation_input_tokens` **不在搬运清单里**，直接忽略。
更麻烦的是 DSH 只认**另一种拼写**（`prompt_tokens_details.cached_tokens`），
因此必须将原生字段映射为 DSH 识别的字段名。此前缺少该映射，界面显示为 0。

## 修复内容（v2.0.5）

1. **解码层**：保留 Trae 的缓存字段，纳入类型定义（`prompt_tokens_details` 缺失时行为不变）。
2. **转发层**：映射为 DSH 认识的 `prompt_tokens_details.cached_tokens` / `cache_write_tokens`。
3. **算术正确性**：先确认了 Trae 的 `prompt_tokens` **包含**缓存量（OpenAI 口径），
   因此映射后不会重复扣减——验证账目守恒：`8 + 9216 + 0 = 9224`，与 `prompt_tokens` 完全相等。
4. 顺带修掉 Raw Chat 通道的**同一类缺口**（将来启用时会踩同一个坑）。

## 升级方式

```bash
dsh plugin --profile desktop add dsh-connect-trae@2.0.5
```

## 有一点请留意（避免误判「还是 0」）

修复只保证**上游报了缓存、插件就如实上报**，但**是否命中缓存取决于上游和你的使用方式**：

- 首次请求可能未命中，但服务端缓存可跨会话复用，不能保证首轮为零；是否命中以当次上游记录为准。
- **前缀要逐字节一致**才能复用：正常多轮对话（历史往后追加新消息）满足这个条件；
  中途改系统提示词、切换模型、大幅编辑历史，都会让前缀失效。
- 本机实测 Trae 目前**只报读、不报写**（`cache_creation_input_tokens` 恒为 0）。

建议升级后**连续问两轮以上**再看统计。

再次感谢反馈，这个问题要不是你提，缓存统计会一直是坏的 🙏
