---
name: pr
description: >
  Prove the feature you just built actually works — a fresh verifier sub-agent
  drives the real app — then open a pull request with the proof. Use when a change
  is ready to ship in any repo — "open a PR", "ship this", "raise a PR", "/pr".
  Never opens a PR until the feature is verified.
user_invocable: true
---

# /pr — prove the feature works, then open the PR

You are the **orchestrator + fixer**. Verification splits by who's best at it:

- **The subjective question — "does the feature I just built do what was
  intended?"** → delegate to a fresh **verifier sub-agent** that drives the real
  app and judges it. Independence (it didn't write the code) + context-isolation
  (app-driving is verbose) pay off here. Most new features have no spec — this is
  **agentic verification, not "run the test."** Do it first.
- **Objective, codified checks** (type-check, lint, unit, existing e2e) → **you**
  run them, after, as a regression sweep. Pass/fail can't be rubber-stamped, so
  delegating buys nothing but a round-trip — and you need the error to fix it.

Pairs with `dev-local-setup` (reproducible stack) and `e2e-setup` (the suite).

## 1. Preconditions
On a branch, not the default branch; changes committed.

## 2. Bring up the stack — once
Start it via your repo's dev launcher (see `dev-local-setup`). You own it; the
verifier reuses it.

## 3. Verify the FEATURE (delegate) → fix → re-verify (loop)
Brief from the plan file if one exists (point the verifier at it), else pass the
requirements inline. Spawn a read-only verifier:

```
You are a read-only verifier. Do NOT edit code. Independently confirm THIS feature
works by driving the running app (the stack is already up). It likely has no
automated spec — verify it agentically.

FEATURE (what a user should now be able to do, and the observable success state):
  <intent / acceptance criteria>          (or: see plan file <path>)
HOW TO EXERCISE IT:
  <UI route + steps / API call / CLI>
AUTH (if the feature is behind login):
  mint a session first via the repo's session helper and load it before driving.

Drive it (browser via playwright-cli, or the API/CLI): walk the exact steps,
screenshot/record the success state, judge observed vs expected. Return ONLY:

FEATURE: works | broken
  expected: <criteria>
  observed: <what actually happened>
  evidence: <screenshot/video paths>
```

- **broken** → fix the implementation, then spawn a **fresh** verifier. You never
  declare the feature works yourself.
- Cap at ~3 rounds; if still broken, escalate to the human with the verdict.

## 4. Regression sweep — you run the codified checks; fix red directly
type-check · lint · unit · existing e2e. Triage failures (real-bug vs stale-test —
see `e2e-setup`); never weaken an assertion to go green. If a fix here changes
feature behavior, re-verify (step 3).

## 5. Open the PR — lead with the feature proof
Get a **reviewable link** for the success video. GitHub can't play video inline via
automation, so upload it somewhere with a stable URL — a dedicated `pr-evidence`
GitHub prerelease (`gh release upload`), a bucket, or CI artifacts — and link it.

```markdown
## What changed
<1–3 lines>

## Feature verified ✅  (verifier drove the app)
- <acceptance criteria> — observed working.  📹 Proof: <url>

## Regression guardrails
- [x] type-check · lint · unit · e2e

## How to reproduce
<stack-up command> && <exercise steps>
```

## Rules
- **The feature is the verdict** — a green suite with an unverified feature isn't done.
- **"Does it actually work" → an independent verifier; objective checks → you.**
- Never open a PR until the feature is verified. **Proof, not claims.** Branch → PR only.

> Isolates *context*, not *environment*: if your stack is single-instance /
> fixed-port, don't run multiple verifiers in parallel.
