---
name: pr
description: >
  证明你刚构建的功能真的可用 —— 一个全新的 verifier 子 agent
  驱动真实应用 —— 然后带着证据开 pull request。当某项变更
  准备好在任意仓库交付时使用 —— "开个 PR"、"交付这个"、"提个 PR"、"/pr"。
  功能未通过验证前绝不开 PR。
user_invocable: true
---

# /pr —— 先证明功能可用，再开 PR

你是**编排者 + 修复者**。验证按谁最擅长来分工：

- **主观问题 —— "我刚构建的功能是否做到了预期？"** → 委派给一个全新的
  **verifier 子 agent**，它驱动真实应用并做判断。独立性（它没写过这段代码）+ 上下文隔离
  （驱动应用输出很啰嗦）在这里有回报。大多数新功能没有规格 —— 这是
  **agentic 验证，不是"跑测试"。** 先做它。
- **客观的、固化的检查**（type-check、lint、单元、已有 e2e）→ **你**
  之后跑，作为回归扫描。通过/失败没法盖橡皮章，所以委派
  只换来一次往返 —— 而且你需要错误来修。

与 `dev-local-setup`（可复现栈）和 `e2e-setup`（套件）配对。

## 1. 前置条件
在一个分支上，不在默认分支上；变更已提交。

## 2. 把栈立起来 —— 一次
通过仓库的 dev 启动器启动它（见 `dev-local-setup`）。你拥有它；verifier
复用它。

## 3. 验证功能（委派）→ 修 → 再验证（循环）
如果存在 plan 文件就从它简报（把 verifier 指向它），否则内联传
需求。派生一个只读 verifier：

```
你是一个只读 verifier。不要改代码。通过驱动运行中的应用独立确认这个功能
可用（栈已起来）。它很可能没有自动化 spec —— 用 agentic 方式验证它。

FEATURE（用户现在应能做什么，以及可观察的成功状态）：
  <意图 / 验收标准>          （或：见 plan 文件 <path>）
HOW TO EXERCISE IT:
  <UI 路由 + 步骤 / API 调用 / CLI>
AUTH（如果功能在登录后）:
  先通过仓库的 session helper mint 一个会话，加载后再驱动。

驱动它（通过 playwright-cli 用浏览器，或 API/CLI）：走精确步骤，
截屏/录制成功状态，判断观察到的 vs 预期。只返回：

FEATURE: works | broken
  expected: <标准>
  observed: <实际发生了什么>
  evidence: <截屏/视频路径>
```

- **broken** → 修实现，然后派生一个**全新** verifier。你绝不
  自己宣布功能可用。
- 上限约 3 轮；仍 broken 则带结论上报人类。

## 4. 回归扫描 —— 你跑固化的检查；红了直接修
type-check · lint · 单元 · 已有 e2e。Triage 失败（真 bug vs 过时测试 ——
见 `e2e-setup`）；绝不为变绿而削弱断言。如果这里的修复改变了
功能行为，回到第 3 步重验。

## 5. 开 PR —— 以功能证据开头
为成功视频拿到一个**可 review 的链接**。GitHub 无法通过自动化内联播放视频，
所以把它传到一个有稳定 URL 的地方 —— 一个专门的 `pr-evidence`
GitHub prerelease（`gh release upload`）、一个 bucket，或 CI artifacts —— 然后链接它。

```markdown
## What changed
<1–3 行>

## Feature verified ✅  (verifier 驱动了应用)
- <验收标准> —— 观察到可用。  📹 证据: <url>

## Regression guardrails
- [x] type-check · lint · 单元 · e2e

## How to reproduce
<栈启动命令> && <演练步骤>
```

## 规则
- **功能就是结论** —— 套件全绿但功能未验证，不算完成。
- **"它真的可用吗" → 独立 verifier；客观检查 → 你。**
- 功能未通过验证前绝不开 PR。**要证据，不要声明。** 分支 → PR 才行。

> 隔离的是*上下文*，不是*环境*：如果你的栈是单实例 /
> 固定端口，不要并行跑多个 verifier。
