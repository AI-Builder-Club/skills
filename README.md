# loop-engineer-template

一个用于构建**循环工程师（loop engineer）**的启动模板：这类 agent 能自行被触发、领取工作、交付成果、验证结果，并记录所学到的东西，从而让成果在无需你逐步提示的情况下不断复利累积。它是我团队在生产环境中实际运行的这套机制的产品化版本，也是我在 [AI Builder Club](https://www.aibuilderclub.com/lp/loop-engineer?utm_source=github&utm_campaign=loop-engineer-template) 上所教授的内容。

## 什么是循环工程师？

转变在于：你不再逐任务地去提示一个编码 agent，而是开始**设计循环**。

一个循环（loop）就是一个 agent，它会在某个触发条件（定时任务、webhook、一次事故、另一个 agent）下醒来，做一些调研和工作，并把发现与所做的事写进一个共享的、基于文件的记忆里。下一次运行时，它会读取这份记忆并继续推进。真正的力量在于**复利**：许多循环（客服、SEO、产品、广告）读写*同一个*文件夹，因此客服循环记录下的一个摩擦点，可能会被产品循环接手；广告循环发现的一个关键词，可以喂给 SEO 循环。一个共享的大脑，多个循环。

构建一个循环归结为四个要素：

1. **触发器：** 定时任务、webhook、一次事故，或另一个 agent，在合适的时机唤醒循环。
2. **文件与日志结构：** 循环读写的共享记忆（本模板）。
3. **工具与连接器：** 让 agent 能做真正的工作（你的 skills/MCP）。
4. **代码库 harness：** 让 agent 能自主运行、测试并验证自己的工作。

本仓库开箱即用地提供了 #2 和 #4，并附上添加其余部分的脚手架。

想要完整了解这个概念，以及我团队如何设计可复利的循环？看这个视频：

[![The loop engineer: how to design compounding agent loops](assets/video-thumbnail.png)](https://youtu.be/W6x-hb44C0c)

## 包含哪些内容

```
loop-engineer-template/
├── ARCHITECTURE.md          知识库模型（读一次即可）
├── CLAUDE.md                你自己上下文的模板：填入 {{PLACEHOLDER}}
├── LOG.md                   全局工作日志（每一批工作一行）
├── signals/  docs/  domains/  启动用的 artifact + 循环文件夹，每个 README 本身就是它的 schema
└── .claude/
    ├── skills/
    │   ├── new-loop/                 启动一个新循环（domain）：脚手架、试运行、写它的契约
    │   ├── setup-codebase-harness/   代码库 harness：让任意仓库对 agent 可用
    │   ├── dev-local-setup/            └ 一条命令的开发栈
    │   ├── e2e-setup/                  └ 一个真正的 e2e 测试门禁
    │   └── pr/                         └ 先验证再交付（由一个全新子 agent 证明它可用，再开 PR）
    └── workflows/
        └── ship-change.js           端到端交付一个范围明确的代码变更（worktree → 实现 → review → 验证 → PR）
```

- **知识库**（`ARCHITECTURE.md`、`signals/ docs/ domains/`、`LOG.md`）是共享记忆：artifact 按类别归档，domain 即循环，每个文件都带一个只追加的 `## Timeline`。
- **代码库 harness**（`.claude/skills/` 下的 skills）让一个代码仓库变得*可读、可执行、可验证*，从而循环能在无需你盯场的情况下交付代码。

## 快速开始

1. **复制这个文件夹**到你想让 agent 的知识库存放的位置。
2. **填写 `CLAUDE.md`：** 替换每一个 `{{PLACEHOLDER}}`。这是 agent 每次会话都会读取的上下文，所以是最重要的一步。
3. **阅读 `ARCHITECTURE.md`**，让你和 agent 共享同一套模型。它很短。
4. **启动你的第一个循环。** 在 Claude Code 中：运行 `/new-loop`，然后告诉它循环的名字、目标，以及它该做什么。它会脚手架生成 `domains/<loop>/README.md`，做一次真实试运行，并记录下来。
5. **为你的循环交付代码的目标仓库装配 harness。** 在那个代码仓库里运行 `/setup-codebase-harness`，让 agent 能运行、测试并验证自己的工作。
6. **让它跑起来。** 每次会话，agent 读取 `CLAUDE.md` + 相关 domain 的 README，做工作，写 artifact，并追加到 `LOG.md`。对于代码变更，它驱动 `ship-change.js` 并通过 `/pr` 交付。

## 前置要求

- [Claude Code](https://claude.com/claude-code)（这些 skills + workflow 假定你使用它）。
- `git`。这是唯一硬性依赖。
- `ship-change.js` 和这些 harness skills 要求它们交付代码的仓库是一个 git 仓库，并且有可用的构建/测试设置。如果有 Codex 可用，它们会用 Codex 做 review；没有也能优雅降级。

## 深入

本模板给你的是结构。如果你想学习如何真正为自有业务构建 agent 并运行可复利的循环，那就是我在 **[AI Builder Club](https://www.aibuilderclub.com/lp/loop-engineer?utm_source=github&utm_campaign=loop-engineer-template)** 里深入讲解的内容：每周的直播 builder 研讨会、关于生产级 AI agent 的课程、超越基础的 AI 编码，以及构建你的第一批 LLM 应用，外加一群用同样方式在构建的社区。

[![Join AI Builder Club](assets/ai-builder-club.png)](https://www.aibuilderclub.com/lp/loop-engineer?utm_source=github&utm_campaign=loop-engineer-template)

**→ [加入 AI Builder Club](https://www.aibuilderclub.com/lp/loop-engineer?utm_source=github&utm_campaign=loop-engineer-template)**

由 [Jason Zhou](https://x.com/jasonzhou1993)（AI Jason）构建。
