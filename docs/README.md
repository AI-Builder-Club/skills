# docs/ —— 持久知识

每个 **doc** 一个文件：你学到的、分析的或决定且希望日后可被找到的东西。如果说
signal 是原始证据，doc 就是加工后的版本：一份分析、一篇 writeup、一个决策及其
理由、一篇 how-it-works 笔记。

本 README 是它的 schema。模型见 `ARCHITECTURE.md`。

## Frontmatter

```yaml
---
kind: doc
domain: []                  # 属于哪些循环
status: draft | adopted | superseded   # 可选；当一个 doc 可被 acted on 或被替换时使用
links: []                   # 相关 artifact，[[slug]] 或路径
---
```

可选加一个 `type:` 字段（例如 `analysis`、`decision`、`learning`），如果你发现自己
想按形态过滤 doc —— 但别强求。大多数 doc 只是知识。

## 正文

正文 = *现在什么是真的*。追加一个可选的 `## Timeline` 记录*发生了什么*
（修订、被取代、一个决策被重新审视时）。用 `[[slug]]` 大量链接。

## 命名

`<short-kebab-slug>.md` 或 `<TOPIC>-<YYYY-MM>.md` —— 读起来顺、排起来合理即可。
