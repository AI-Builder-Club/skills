---
name: new-loop
description: 在本知识库中启动一个新循环（domain）—— 收集它的章程、脚手架生成 domains/<loop>/README.md、确保 signals/ + docs/ 底座存在，然后对该循环做一次真实试运行，并记录到循环 README 的 Timeline 和 LOG.md。当用户说"设置一个新循环"、"创建一个 domain"、"开始一个新的 beat/workstream"，或点名一个他们希望 agent 接管的周期性工作时使用。
---

# new-loop —— 启动一个新循环

一个**循环**（一个 `domain`）是 agent 拥有的一段周期性工作主线：一个章程、一个节奏、
以及它产出的 artifact。这个 skill 创建一个循环、用一次真实运行证明它可用、并留下一个
`domains/<loop>/README.md` 作为该循环的实时状态。

如果你还没读过 `ARCHITECTURE.md`，先读 —— 它是这个 skill 实例化的模型。

## 何时使用
用户想立起一个新的工作流/beat/任务（例如"一个每周 SEO 循环"、"一个客服 triage
循环"、"一个竞品观察循环"）。不要把它用于一次性的任务 —— 那只是某个已有 domain 里的
一行 backlog，或一个 `doc`/`signal`。

## 要收集的输入（只问缺失的）
从用户的请求里提取这些；只对你无法推断的做一轮简短澄清：

1. **name** —— kebab-case，循环的家文件夹（`domains/<name>/`）。保持简短。
2. **goal** —— 一句话：这个循环要推动的结果。
3. **cadence** —— `manual` / `daily` / `weekly` / 一个 cron 表达式。默认 `manual`。
4. **它做什么** —— 循环消费什么（signal？数据？某个收件箱？某个 URL？）以及产出什么
   （signal？doc？报告？通过 `ship-change` 的代码变更？）。
5. **工具/数据** —— 它需要的任何来源或凭据（记下来；指向一个 setup skill 或
   `.env`，而不是把密钥写进来）。

如果请求已经足够具体，就推断全部五项并在摘要里确认即可 —— 不要盘问。

## 流程

### 1. 确保底座存在
从仓库根目录，确认以下存在（缺失则创建文件夹并从本 kit 复制 schema `README`
—— 已有的不要重建）：
- `signals/README.md`、`docs/README.md` —— 两个启动类别。
- `domains/README.md` —— domain schema。
- `LOG.md` —— 全局信息流（带它的标题/语法）。

**不要**预先创建 `tasks/` 文件夹或任何其他类别。按 `ARCHITECTURE.md` 后续再挣。

### 2. 脚手架生成循环 README
用 `domains/README.md` 里的模板创建 `domains/<name>/README.md`，填入收集到的输入。
必填章节：frontmatter（`kind: domain`、`domain`、`status: active`、
`goal`、`cadence`）、2-4 行描述、`## Current focus`、`## Backlog`（循环的待办
内联 —— 它们留在 README 里直到挣到 `task` 类别）、以及一个空的 `## Timeline`。
相关时加 `## Evidence & analysis` 和 `## Metrics` 占位。

检查冲突：如果 `domains/<name>/` 已存在，停下并询问是更新它而不是覆盖。

### 3. 做一次真实试运行
这是这个 skill 的意义所在：证明循环真的能跑，而不只是文件夹存在。

**真正小规模地运行一次循环** —— 做这个循环本该做的事（triage 几条真实 ticket、
抓一个真实 SERP、拉收件箱、草拟一条评论、跑一个分析查询、scope 一个代码变更……）。
尽量用循环真实的工具/数据；如果缺凭据，就做能到达的最远的一次 dry run 并记下差距。

**产出 artifact 是可选的。** 一次合法的运行可能什么值得归档的东西都没有 —— 那是
真实结果，不是失败。只有当运行真的产出了 signal/doc 时才创建它。

无论发生什么，运行有两个**必填**输出：
- 向循环 README 的 `## Timeline` 追加一行带日期的记录：
  `YYYY-MM-DD | 试运行 —— <你做了什么以及发现了什么 / "暂无可行动项">`。
- 用其语法向 `LOG.md` 追加一条：
  ```
  ## YYYY-MM-DD · <loop-name> 循环创建 + 首次运行 · #ops
  What: <一行 —— 循环是什么以及首次运行做了/发现了什么>。
  Refs: domains/<name>/README.md (new)[, 创建的任何 artifact]。
  ```

### 4. 汇报
向用户摘要：循环的章程（那五项输入）、试运行做了和发现了什么、创建的任何
artifact（或"无 —— 本次运行无可行动项"）、任何需要接上的缺失工具/凭据、以及如何
再次运行它（节奏 + 入口）。保持精炼。

## 备注
- **不要给脚手架镀金。** 循环 README 是实时状态，不是规格 —— 精简起步，让它通过
  Timeline 自然积累。
- **一个循环 = 一个独立工作流。** 如果用户描述的其实属于某个已有循环的一部分，就说
  出来并加到那里（一行 backlog + 一个 `domain:` 标签），而不是创建一个近乎重复的
  domain。
- 对于交付代码的循环，循环的"运行"可以驱动 `ship-change` workflow
  （`.claude/workflows/ship-change.js`）—— 把 README 的 Backlog 指向它。
