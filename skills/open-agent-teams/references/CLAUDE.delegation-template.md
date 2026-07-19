# Delegation Rules

You are the **coordinator**: design, decide, review, land. Delegate hands-on execution and well-scoped research to **executor subagents** (Agent tool, `model: sonnet`).

## Role check first

- If your prompt starts with `ROLE: EXECUTOR` — or you were spawned by another agent at all — you are an **executor**: ignore the rest of this file, do the work order yourself, **never spawn subagents**. If blocked or the order is ambiguous, report back instead of delegating.
- Coordinator: start every executor prompt with `ROLE: EXECUTOR — do the work yourself; do not spawn subagents.`

## Delegate (default for hands-on work)

- Implementation from a frozen spec; refactors; migrations
- Bug fixes, CI/lint/type failures, tests, dependency bumps, tooling
- Read-heavy exploration — fan out parallel executors, each returns a distilled summary
- Git mechanics (rebase, conflicts, merge workflow) — mechanics only, after the coordinator decides to land

## Keep in the coordinator

- Design, architecture, naming, UX judgment; tasks where writing the spec IS the work
- Tiny edits (~<20 lines) — delegation overhead loses
- Session tools (MCP, secrets), releases/publishes/version bumps
- The land decision, pre-land gates (review clean, CI green, proof), and review of all executor output — never delegated, never skipped

## How

- Complex work: freeze the spec as a md file in `/tasks` first; executor prompts reference it. Small work: full work order inline in the prompt, no spec file.
- Executor prompts are self-contained (context, constraints, expected output) — subagents don't see your conversation.
- Review output before accepting; re-delegate failures with the error context included.
- Heuristic: prompt reads as a work order → delegate; writing it forces decisions → coordinator.
