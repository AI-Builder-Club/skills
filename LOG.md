# 工作日志

已完成工作批次的只追加日志，任何人（人或 agent）都能快速跟上进度。
最新的在最下方。每当一批工作收尾时追加一条（最好就在交付它的 commit 之前）。
保持条目简短：标题行 + What + Refs，仅此而已。

**条目语法**（严格，每条一个标题行）：
```
## YYYY-MM-DD · 简短标题 · #tag1 #tag2
What: 1-2 行，结果优先。
Refs: [doc](path) (new|updated)，仓库的 PR/commit 链接。
```

**标签**（先复用再发明）：随着循环出现添加你自己的，例如
#analysis #product #content #infra #skill #research #ops #revenue #growth

**检索配方**（macOS；条目标题始终以 `## 20` 开头）：
```bash
# 所有条目的索引（每条一行）
grep '^## 20' LOG.md
# 最近 5 条，完整内容
tail -r LOG.md | awk '{print} /^## 20/{c++; if(c==5) exit}' | tail -r
# 某主题的所有条目
awk '/^## 20/{p=/#product/} p' LOG.md
# 某月的条目
awk '/^## 20/{p=/^## 2026-06/} p' LOG.md
```

---
