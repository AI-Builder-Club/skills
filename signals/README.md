# signals/ —— 证据

每个 **signal** 一个文件：一条反馈、一个想法、或一条值得记住的观察。
Signal **去重并按频次计数** —— 当同样的东西再次出现，你不是新建一个文件，
而是给已有的那个加一条 Timeline 并把 `frequency` 加一。

本 README 是它的 schema。模型见 `ARCHITECTURE.md`。

## Frontmatter

```yaml
---
kind: signal
category: feedback | idea | friction | observation   # 信号类型
frequency: 1                # 被看到多少次；复发时递增
sources: []                 # 来源（链接、ticket id、url）
domain: []                  # 喂给哪些循环 —— 一个 domain 名字列表
status: open | triaged | actioned | closed
---
```

## 正文

一段对 signal 的简短陈述（是什么、为何重要），然后是可选的只追加
`## Timeline`，累积每一次目击：

```
## Timeline
2026-06-14 | 客服 ticket #123 —— 用户又撞到同一堵墙
```

`frequency` = Timeline 条目数。用 `[[slug]]` 链接相关 artifact。

## 命名

`<short-kebab-slug>.md`，或一个稳定 id 如 `FB-<n>.md`（如果你喜欢用流水号）。
