---
name: verifier-setup
description: >
  Set a repo up to prove engineering-task work actually works before it ships.
  Investigates the repo, ensures a one-command dev stack (`dev-local`) exists, asks
  whether verification runs locally or in a sandbox (crabbox), confirms/installs the
  driver (the `playwright-cli` skill for web by default). Outputs three artifacts: a
  committed `/verify` skill (per-task verification SOP — spawn a verifier sub-agent →
  drive the app → screenshot/video proof → open a PR with the proof embedded), the
  `/dev-local` skill + script, and the installed driver skill. Use when someone says
  "set up verification", "make this repo verifiable", "scaffold a verify skill",
  "set up the verifier".
user_invocable: true
---

# verifier-setup — scaffold this repo's `/verify` skill

Goal: leave the repo able to *prove an engineering task works before it ships* —
run once, and it wires up everything the per-task `/verify` loop needs.

You are **setting up** — not verifying anything yourself right now. The `/verify`
template lives at `assets/verify.template.md` (next to this skill). Parallels
`dev-local-setup` (which generates a script + its skill doc): a setup skill that
leaves behind reusable, repo-specific artifacts.

## What this produces (the outputs)
Running `verifier-setup` end-to-end leaves the repo with:
1. **A `/verify` skill** — `.claude/skills/verify/SKILL.md`, the repo-tailored
   per-task verification SOP (spawn a verifier sub-agent → drive the app →
   screenshot/video proof → open a PR with the proof embedded). Generated in Step 5.
2. **A `/dev-local` skill + its script** — `scripts/dev-local.sh` **and**
   `.claude/skills/dev-local/SKILL.md`, via `dev-local-setup` (Step 2) if not
   already present. The one-command stack `/verify` depends on.
3. **The driver skill installed** — the `playwright-cli` skill for web apps (Step 2);
   for non-web, the concrete exercise tool confirmed present.

## Step 0 — Inventory what already exists (check before you add ANYTHING)
Before creating anything, take stock — the repo may already have some of this,
under whatever name or layout its team chose. Look for the **capability**, not a
specific filename; the paths below are only examples. For each, decide **reuse
as-is / adapt-extend / create fresh** — never blindly overwrite working setup:

- **A way to start the app** — a one-command dev launcher, a `Makefile`/`Procfile`
  target, `docker-compose`, package scripts (e.g. `scripts/dev-local.sh`, but any
  form counts).
- **A prior verification SOP/skill** — from an earlier run of this skill or the
  team's own convention.
- **A driver for the app's interface** — a browser automation tool already available
  (e.g. the `playwright-cli` skill), or the relevant API/CLI client.
- **An existing test/e2e suite or checks** — however organized.
- **Sandbox/cloud-box config** — anything giving isolated per-agent stacks.
- **An evidence/artifact convention** — where proof lands and how a reviewable
  link gets published (a release, bucket, CI artifacts, etc.).

Every later step is conditional on this inventory: if a capability exists and works,
**reuse and adapt it** (fill gaps, don't regenerate); only create what's missing.

## Step 1 — Investigate the repo (don't guess)
Discover the real facts the generated skill will hardcode:

1. **How the app is exercised** — is it a **web app** (has a browser UI + a dev
   server on a port), an **API/service** (HTTP endpoints, no UI), a **CLI**, or a
   desktop/mobile app? This picks the driver.
2. **Stack launcher** — is there already a way to start the app (any form — see
   Step 0)? Note the up-command and the app URL/port. If none, Step 2 handles it.
3. **Auth** — is the primary flow login-gated? Is there a session/auth helper the
   verifier can mint a session with (see `e2e-setup`)? Record it, or "n/a".
4. **Regression checks** — the repo's fast codified checks (type-check, lint,
   unit, existing e2e commands) from `package.json`/`Makefile`/`turbo.json`/etc.
5. **Proof upload** — how a reviewable video URL is produced (a `pr-evidence`
   GitHub prerelease via `gh release upload` is the default; a bucket/CI artifact
   works too).

## Step 2 — Ensure the prerequisites exist (reuse-or-provide, per the Step 0 inventory)
For each, act on what Step 0 found — reuse if present, adapt if partial, create only
if missing. Each check is idempotent; a no-op on what's already there:

- **Dev stack.** If any working way to start the app already exists (a launcher
  script, Make/Procfile target, compose, package scripts), **reuse it** — read it for
  the up-command/port/services and move on (extend only if a needed service is
  missing). If there's none, scaffold one via **`dev-local-setup`** (don't hand-roll a
  launcher here). The generated `/verify` just needs a reliable one-command up.
- **Driver skill.**
  - **Web** → install/confirm the **`playwright-cli` skill** (it documents + wraps
    the browser driver). Ensure its binary is callable too (`npx --yes @playwright/cli
    --version`; install it + the `chrome` channel if missing). This closes the usual
    local gap where the browser driver was assumed but never installed.
  - **Non-web** → confirm the concrete exercise tool exists (an HTTP client for an
    API, the built binary for a CLI). No browser skill needed.
- **Evidence dir.** Ensure `evidence/` is gitignored (proof output lands there).

## Step 3 — Ask the user: local or sandbox?
Present the choice (default and recommend **local** — it's simpler to stand up):

- **Local** — one dev stack on the machine (`scripts/dev-local.sh up`). Best for a
  single task at a time. Recommend this unless they need parallelism.
- **Sandbox (crabbox)** — an isolated cloud box per agent, for **concurrent** loops
  or a fixed-port/single-instance stack. If chosen and not yet set up, scaffold via
  **`crabbox-setup`**; the generated skill drives the app in-box via `cbx.sh pw`.

Record the pick as the generated skill's default `RUN_MODE` (the other stays a
documented fallback).

## Step 4 — Confirm the driver
State the detected driver and confirm with the user (default **`playwright-cli`**
for web apps). For non-web, name the concrete tool (e.g. `curl`/an HTTP script,
the built CLI). This becomes `DRIVER` in the generated skill.

## Step 5 — Generate `.claude/skills/verify/SKILL.md`
If a prior verification skill/SOP already exists (Step 0), **update it in place** —
refresh the repo-specifics/placeholders, preserve any hand-edits the team added;
don't clobber. Otherwise copy `assets/verify.template.md` → the repo's skills dir
(`.claude/skills/verify/` or the repo's convention) and fill every `{{...}}`
placeholder from Steps 1–4:
`STACK_UP`, `APP_URL`, `RUN_MODE`(+`RUN_MODE_NOTE`), `DRIVER`(+`DRIVER_INSTRUCTION`),
`AUTH_HELPER`(+`AUTH_INSTRUCTION`), `EXERCISE`, `REGRESSION_CMDS`, `EVIDENCE_UPLOAD`,
`DATE`. Delete branches that don't apply (e.g. drop the browser/video language for
a non-web repo). Keep it to one screen — it's an SOP the agent follows, not an essay.

## Step 6 — Hand off
Commit the generated skill (+ any `.gitignore`/dev-local changes). Tell the user:
- how to run it — "`/verify` before opening a PR (or when asked to verify), on a
  branch with changes committed";
- the run mode chosen and how to switch;
- any prerequisite they must install/start once (e.g. Docker for infra, `gh` auth
  for evidence upload).

## Principles
- **Check before you create; adapt, never clobber.** Every artifact — dev-local,
  the driver skill, e2e, evidence gitignore, the verify skill itself — is inventoried
  first (Step 0) and **reused/extended** when it already exists. Only create what's
  genuinely missing; preserve working setup and team hand-edits.
- **Discover, don't assume.** Stack command, port, auth, and checks come from the
  repo — the generated skill hardcodes real facts, not conventions.
- **Provision before you generate.** The driver, launcher, and `evidence/` exist
  before the `/verify` skill ships, so it never fails on a missing tool.
- **Right-sized.** A web monorepo gets the full browser+video SOP; a CLI tool gets
  a stdout-assertion SOP. Match the template to the repo; cut what doesn't apply.
- **The output is a skill, not a run.** verifier-setup scaffolds; `/verify` runs.
