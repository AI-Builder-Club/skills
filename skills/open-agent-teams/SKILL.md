---
name: open-agent-teams
description: Delegate tasks to ANY CLI agent (claude, codex, aider, ...) running in a detached tmux session, with a race-safe done-signal protocol and multi-turn iteration. Use when delegating work to a non-Claude CLI agent, when the user says "tmux delegate", "run agent in tmux", "delegate to codex/aider", or when executor work should run in an observable background terminal instead of the Agent tool.
---

# open-agent-teams

Run any CLI agent as an executor inside a detached tmux session. Communication is: prompt in via CLI arg / `send-keys`, completion out via a **file sentinel** the agent touches, summary out via a **result file** the agent writes. File sentinels are used instead of `tmux wait-for` because a `wait-for -S` with no waiter is silently lost; files never race and allow timeouts.

All commands via the helper (make sure it runs from the skill dir):

```
SKILL_DIR/scripts/tdel
```

## Initial setup (once per repo)

If the repo's `CLAUDE.md` (or `AGENT.md`) has no delegation rules yet, add the contents of `references/CLAUDE.delegation-template.md` to it — it defines the coordinator/executor roles and the `ROLE: EXECUTOR` prompt marker used below.

## Workflow

1. **Start** an agent on a task:
   ```
   tdel start <session> "<agent-cmd>" "<prompt>"
   # e.g. tdel start hello "claude --dangerously-skip-permissions" "make a hello world page"
   ```
   This appends the done-protocol to the prompt automatically (write summary to result file, then `touch` the done file).

2. **Wait** for completion — ALWAYS via a background Bash task so you get woken up instead of blocking or polling:
   ```
   tdel wait <session> [timeout-sec]     # run with run_in_background: true
   ```
   Exit 0 = done (prints the agent's summary). Exit 124 = timeout (prints last pane lines for diagnosis). Non-zero also if the session died.

3. **Review** the output (`tdel result <session>`, plus inspect the actual files the agent changed). If iteration is needed:
   ```
   tdel send <session> "<feedback / next instruction>"
   tdel wait <session>                   # again, run_in_background
   ```
   Each `send` is a new turn with its own done/result files — no signal cross-talk between turns.

4. **Debug** a stuck or slow agent: `tdel peek <session> [lines]` shows the live pane. `tdel status` lists all sessions.

5. **Stop** when finished: `tdel stop <session>` (kills the session and removes state under `/tmp/agent-delegate/<session>`).

## Harness reference

How to launch each CLI agent autonomously (prompt is passed as the last positional arg by `tdel start`):

| Harness | agent-cmd for `tdel start` | Busy-pane signature | Exit | Interrupt |
|---|---|---|---|---|
| claude | `claude --dangerously-skip-permissions` (`--model`, `--effort low..max`) | `esc to interrupt` | `/exit` | Escape |
| codex | `codex --dangerously-bypass-approvals-and-sandbox` (`--model`, `-c 'model_reasoning_effort="low..xhigh"'`) | `esc to interrupt` | `/quit` | Escape |
| grok | `grok --always-approve` (`--model`, `--reasoning-effort low\|medium\|high`) | `Ctrl+c:cancel` | Ctrl+Q twice within 1s (NOT /exit, NOT Ctrl+C) | Ctrl+C (Escape does NOT interrupt) |
| pi | `pi` (`--model`, `--thinking low..max`; no permission system — always autonomous) | `Working...` | `/quit` | Escape |
| opencode | `opencode --prompt`-style launch (`--model provider/model`) | `esc interrupt` (no "to") | `/exit` | double Escape (flaky mid-shell-command) |

Busy signatures matter on timeout: `peek` and grep for the signature — present = still working (extend the wait), absent = idle (it likely finished without touching the done file, or is stuck at a prompt).

**Trust dialogs (first run per repo/worktree):** claude (trust/bypass-permissions confirm), codex ("Do you trust..."), and pi can each show a dialog that blocks the prompt from processing. After `start`, `peek` within ~20s; if a dialog is showing, accept it with `tdel key <session> Enter` and verify via another `peek` that the task started. grok skips its picker when launched inside a git repo root.

**Slash/skill popup hazard:** prompts beginning with `/` or `$` (skill invocations: `/<skill>` on claude/grok, `$<skill>` on codex) open an autocomplete popup — a fast Enter selects the popup instead of submitting, and grok needs a genuine second Enter. `tdel send` handles this automatically (longer settle + double Enter for `/`- or `$`-prefixed prompts).

**Resume after exit:** codex `codex resume <session-id>`, grok `grok --resume <session-id>` (ids printed on quit), opencode relaunch with `--continue`.

## Rules

- Prompts must be **self-contained** (context, constraints, expected output) — the executor can't see your conversation. Prefix with the repo's executor marker (`ROLE: EXECUTOR ...`) when the agent is Claude Code in a repo using the delegation rules (see Initial setup above).
- Prompts are flattened to one line before sending (newlines would submit a TUI input box early) — write them accordingly; put large specs in a file and reference the path.
- On timeout, `peek` first — agents sometimes finish but forget to touch the done file. If the work is visibly done, treat pane output + changed files as the result and `stop` or `send` a reminder.
- Don't trust `capture-pane` as the deliverable — it's a rendered TUI snapshot. The result file and the actual changed files are the source of truth.
- One task per session; parallel tasks = parallel sessions with distinct names.
