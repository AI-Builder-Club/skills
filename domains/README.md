# domains/ —— 循环

每个子文件夹是一个 **循环**：一段有章程、有节奏、（可选）有指标的工作。一个 domain
文件夹只持有它的 **`README.md`**（循环的实时状态）和可选的**机器**
（`metrics/*.jsonl`、采集器）。它**链接** `signals/` 和 `docs/` 里的 artifact；
它从不包含它们。循环的待办以内联形式活在 README 的 `## Backlog` 里
（只有当它超出 README 时才升级为 `task` 类别 —— 见 `ARCHITECTURE.md`）。

不要手动创建 domain —— 运行 **`new-loop`** skill。它会从下面的模板脚手架生成
README、试运行该循环、并记录这次运行。

本 README 是它的 schema。模型见 `ARCHITECTURE.md`。

## Domain README 模板

```markdown
---
kind: domain
domain: <loop-name>
status: active | paused | archived
goal: <一句话 —— 这个循环要推动的结果>
cadence: <manual | daily | weekly | cron expr —— 多久运行一次>
---

# <loop-name> —— <简短标语>

<2-4 行：这个循环做什么、消费什么（哪些 signal/数据）、产出什么。>

## Current focus
<这个循环现在正在做的最重要的一件事。保持新鲜。>

## Backlog
- [ ] <工作项 —— 内联；如有相关就链接 [[signal-slug]] / [[doc-slug]]>
- [ ] <下一件事>

## Evidence & analysis
[[doc-slug]] · [[doc-slug]]

## Metrics
`metrics/` —— <哪些数字、以及写它们的采集器（一开始 TBD 也行）>。

## Timeline
YYYY-MM-DD | <运行/来源> —— <这次运行发生了什么>
```

一个 domain 的 `## Timeline` 是它的运行日志：每次运行一行简短带日期的记录。
丰富的逐次运行细节活在它链接的 artifact 里，不在这里。
