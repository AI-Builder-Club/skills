---
name: setup-codebase-harness
description: >
  Master skill — set up the full agent harness for any repo so an agent can work
  it reliably: legible (map-not-manual docs + custom lints), executable
  (one-command dev stack), verifiable (e2e gate + a verify-before-ship loop), plus
  commit hygiene and entropy control. Use when onboarding a new/unfamiliar codebase
  to agent-driven development — "set up the harness", "make this repo agent-ready",
  "harness this codebase".
user_invocable: true
---

# Set up the codebase harness

**Harness engineering:** the model is fixed — what you engineer is the *scaffolding*
around it (the environment, the docs, the feedback loops) so an agent can build and
verify software with minimal human attention. Humans steer; agents execute. Your
job is to make the repo **legible, executable, and verifiable.**

Work **incrementally and depth-first**: assess what exists, build the one missing
capability, use it to unlock the next. Don't boil the ocean — set up what the repo
actually needs. When the agent struggles, the fix is almost never "try harder" —
ask *"what capability is missing, and how do I make it legible and enforceable?"*
and add it.

This skill orchestrates the focused sub-skills: **`dev-local-setup`**,
**`e2e-setup`**, **`crabbox-setup`** (cloud/parallel), and **`pr`**.

## 0. Assess

Survey the repo: stack, package manager, services/ports, infra deps, existing
docs/tests/CI, and the *implicit* rules (buried in READMEs, PR comments, people's
heads). Note what's missing per pillar below.

## 1. Legible — the agent can reason about the repo

> What the agent can't see doesn't exist. Knowledge in chat threads / heads is
> invisible — push it into versioned, repo-local artifacts.

- **a) Map, not manual.** Shrink the root agent doc (`AGENTS.md` / `CLAUDE.md`) to a
  ~100-line **table of contents**: one-line overview, project tree, **golden rules**
  (the hard invariants), and a "where to look" table. Move the depth into a
  structured **`docs/` system-of-record** (architecture, frontend, testing, domain
  topics) with a `docs/index.md`. A monolithic instruction file rots and crowds out
  the task — keep the map small and stable, disclose detail progressively.
- **b) Custom lints with remediation.** Promote the prose golden rules into
  **mechanical checks** — human taste captured once, enforced everywhere, every run.
  One lint per invariant (layering / dependency direction, naming, no-`any`,
  forbidden imports, file-size, structured logging). **Write the error message to
  inject the fix** ("X isn't allowed here — do Y") so the remediation lands in agent
  context. Wire them into the repo's linter + CI.
- **c) (later) Keep docs honest.** A freshness / doc-gardening pass that flags docs
  that no longer match the code and opens fix-up PRs.

## 2. Executable — the agent can run & drive the app

- **`dev-local-setup`** → a one-command, reproducible local stack
  (`scripts/dev-local.sh up`) running every service + infra.
- Make the app **drivable**: browser via the `playwright-cli` skill; logs reachable.
- **`crabbox-setup`** → an **isolated cloud box per agent** — the parallel-safe
  counterpart to dev-local. Reach for it when loops run **concurrently**: one laptop
  can't host N full stacks (fixed ports, one Docker daemon, one DB), and per-worktree
  local doesn't fix it — the worktrees still share the host. crabbox gives each agent
  its own stack + an in-box browser, so parallel verification never collides.
- *Advanced:* a local, ephemeral observability stack (queryable logs/metrics) for
  perf/reliability prompts.

## 3. Verifiable — the agent can prove it works

- **`e2e-setup`** → a trustworthy e2e gate: real flows (not bypass), a reusable
  auth/session helper, layered client → server → product assertions, video/trace
  evidence, sandbox-only external services.
- **`pr`** → the verify-before-ship loop: a fresh **verifier sub-agent drives the
  real app** to confirm the just-built feature works; the main agent fixes until
  green, runs the codified regression sweep, and opens a PR with a reviewable proof
  link. Add the session helper so the verifier can reach login-gated features.

## 4. Others — keep it coherent over time

- **Commit hygiene**: conventional commits + format/lint on commit (e.g. husky
  lint-staged + commitlint). Keep merge gates **light** — at high agent throughput,
  corrections are cheap and waiting is expensive.
- **Garbage collection**: encode "golden principles", then run periodic cleanup
  passes that open small refactor PRs — pay tech debt down continuously, not in
  painful bursts. Human taste captured once, enforced on every line.
- **Agent-to-agent review** for correctness-critical changes (independent reviewers,
  not self-review).

## Order & what you leave behind

**1a (map) → 2 (dev-local) → 3 (e2e + /pr)**, then **1b (lints)** and **4** as the
repo matures. The artifacts — slim map + `docs/`, `scripts/dev-local.sh`, an `e2e/`
suite, the `/pr` skill, and custom lints — are each a reusable, legible capability
that compounds. Prefer "boring", composable, stable tech the agent can fully model.
