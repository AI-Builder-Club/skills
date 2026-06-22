---
title: 知识库架构
type: decision
status: adopted
---

# 知识库架构

本仓库如何组织成一个长期运行、自主的 agent（及其背后人类）的运行底座。一切都是
git 中普通的 **markdown + frontmatter** —— 可 diff、可 review、agent 可写。这份文档是
该模型及被否决方案的持久记录，让它的形态在成长过程中保持有意为之。

---

## 模型（v1 —— 刻意保持最小化）

只有两个想法：

1. **Artifact** 是全局的，按**类别（kind）**分文件夹；`domain:` 是一个**字段（列表）**，不是文件夹。
   每个 artifact 恰好有一个家（按*它是什么*归类）。跨切面用 tag + 链接处理
   —— 绝不靠复制，也绝不靠嵌套进某个 domain。
2. **Domain** 即"循环" —— 一段有章程、节奏和指标的工作。一个 domain
   文件夹只持有它的 **README（章程）** + **机器（machinery）**（指标、采集器）。它**链接**
   artifact；它从不包含它们。

### 类别（先从这两个开始）

| kind | 是什么 | 文件夹 | 关键 frontmatter |
|---|---|---|---|
| `signal` | 证据：反馈 / 想法 / 观察（去重、按频次计数） | `signals/` | `category, frequency, sources[], domain[], status` |
| `doc` | 持久知识：一份分析、一个决策、一件学到的事 | `docs/` | `domain[], status?, links` |

这就足够运行几乎任何循环。每个文件夹的 `README` 是它的 schema —— 在添加该类别的
artifact 之前先读它。已承诺的工作一开始不需要自己的类别：一个循环的待办以内联
backlog 的形式活在它的 domain `README` 里。只有当你挣到它时（见下），才把它们升级
为 `task` 类别。

### 挣得一个新类别

默认用已有的类别。**只有**当同时满足这三点时才新增：它有自己的状态机**且**可查询的
frontmatter 字段**且**独特的正文形态。否则它就是一个带 tag 的 `doc` 或 `signal`，或者
domain README 里的一行 backlog。以下是各团队在量级达到时挣得的类别示例：

- `task` —— 已承诺的工作作为独立文件，一旦你的 backlog 超出 domain README（一个
  **实验** = 一个带 `metric` 的 task）：`status, domain[], metric?, refs`。
- `ticket` —— 一次客服对话（从 helpdesk 同步）：`user_email, url, status`。
- `content` —— 一篇带发布生命周期的外发草稿：`type, status, channel, posted_url, outcome`。
- 实体类别（`lead`、`keyword`、`campaign`）—— 当一个外联/广告/SEO 循环需要追踪某一种东西的多个实例时。

如果你说不出它独特的状态机，你就还没挣到这个类别。

### Domain（循环）

一个 domain 就是一个循环：一个有自己节奏/负责人的独立工作流。只有当这一点成立时
才启动新 domain —— 否则只给已有的打 `domain:` 标签。一个 domain 的
`README` 是它的实时状态：目标/章程、当前重点、一个链接 backlog、指向证据的链接、
可选指标，以及一个 `## Timeline`。它**指向** artifact；它从不持有它们。

### 正文约定 —— 两层

每个 artifact = 一段正常的**正文** + 一个可选追加的**`## Timeline`**（只追加、
带日期：`YYYY-MM-DD | 来源 —— 发生了什么`）。*"现在什么是真的"* = 正文；*"发生了什么"* =
Timeline。这给每个 artifact 自己的历史，吸收日常日志，并让一个 `signal`
累积证据（frequency = Timeline 条目数）。Git 持有机械的 diff 历史。

### 日志与数据

- **`LOG.md`**（根）—— 全局活动信息流：每次交付/摄入一行。细节活在每个
  artifact 的 `## Timeline` 里。在交付一批工作的 commit 之前追加一条。
- **没有单独的 `daily`/`journal` 类别。** 一个 domain 的运行日志是它 `README` 的
  `## Timeline`（每次运行一行简短带日期的记录）；丰富的逐项细节活在它链接的那些
  item 里。所以恰好有两个日志面：每个 artifact 的 `## Timeline` + 全局 `LOG.md`。
- **`domains/<x>/metrics/*.jsonl`** —— 数值时间序列，由**确定性采集器**
  （代码/skill，*不是* LLM）写入。Agent 读取并解读。记分卡由这些生成。

### 规则（DRY + MECE）

1. **一个概念 = 一个家**（按类别）。其他人通过 `[[slug]]` 链接。
2. **`domain:` 是字段（列表），不是文件夹。** 跨切面 = 多 tag + 多链接。
3. **采集器写数据；agent 写知识。** 别花钱让 LLM 去取数字。
4. **Frontmatter = 任何你会去查询的东西。** 其他都用散文。

---

## 暂缓 —— 仅当需求真实时才添加（不要预先搭建）

| 之后再加 | 触发添加的条件 |
|---|---|
| `trigger:` 字段（cron / webhook / event） | 第一次非手动自动化（例如服务宕机的 webhook） |
| 递归 `thread` + `parent:` 关系 | 一个 domain 需要子线程（例如战略 → 任务） |
| 实体类别（`lead`、`keyword`、`campaign`） | 外联 / 广告 / 社交循环交付时 |
| 派生索引（sqlite / 向量） | 检索量超出 ripgrep 的承受（约 10⁴⁺ artifact） |
| 对账 / 合并守护进程 | 自主运行产生的量级造成重复 / 矛盾 |
| 自主性 / 护栏 / 预算形式化 | agent 在无人 review 下行动时 |

这个底座可以不重建地扩展到以上所有（markdown 始终是事实来源；
你在其上叠加一层缓存/守护进程）。

---

## 考虑过的方案，以及为何不用

1. **按 domain 分文件夹**（一个循环的所有东西放在它自己的文件夹下）。❌ 跨切面 artifact
   没有单一的家 —— 一份横跨两个循环的分析，或一个被三个循环用到的关键词，无法放进
   一个文件夹。会迫使复制。
2. **只按类别分文件夹，没有 domain。** ❌ 丢失了工作主线 + 节奏的凝聚力；
   "X 循环在哪？"没有家。
3. **半嵌套**（部分类别全局，部分在 domain 下）。❌ 这种不对称*本身就是* bug。
4. **纯数据库**（Notion 式）。❌ 暂时不用 —— 我们希望数据活在*这个*仓库里
   （紧邻代码、可 diff、可 review）。向前兼容：数据库可以之后派生。
5. **重分类法（预先 8 个类别）。** ❌ 过早；每一个你说不清理由的类别都会带来
   摩擦。从 3 个开始，再挣更多。
6. **高量级 artifact 用 jsonl/表格。** ❌ 一种形态（markdown）更简单；SQL
   之后再派生。jsonl 只用于真正的数值时间序列（指标）。

## 之所以选择

它是若干已经解决了此事的系统的汇合：**Monday / Asana / Notion**（item +
属性 + 关系 + *视图*；嵌套是数据，不是文件夹）；**以 markdown 为事实来源**的
知识库（两层页面；确定性采集器；夜间对账）；**知识工作的经典** —— Matuschak
（原子化、面向概念、密集链接的笔记），PARA（projects vs areas；stock vs flow），
Teresa Torres（outcome → opportunity → solution → experiment）。

DRY、MECE、agent 可写、人可 review，且无需重建即可演进到规模化。

---

## 地图（东西放在哪）

| 我想… | 去 |
|---|---|
| 记录我们学到的一个事实 / 洞见 | `docs/` |
| 捕获一条反馈 / 一个想法（带频次） | `signals/` |
| 追踪一项已承诺的工作 | domain `README` 里的一行 backlog（挣到后用 `tasks/`） |
| 读一份深度分析 | `docs/` |
| 看我们为什么选了某个方案 | `docs/`（一个 decision） |
| 看一个循环的目标 / 节奏 / 状态 | `domains/<x>/README.md` |
| 看指标随时间变化 | `domains/<x>/metrics/*.jsonl` + 记分卡 |
| 启动一个新循环 | 运行 `new-loop` skill |
