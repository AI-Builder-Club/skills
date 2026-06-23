---
name: e2e-setup
description: >
  Set up an end-to-end test suite in any repo, following practices that make e2e a
  reliable per-PR gate: real flows over bypass, layered assertions, a reusable
  auth/session helper, video+trace evidence, and a compounding suite. Use when a
  repo has no e2e (or weak e2e) and you want system-level tests — "set up e2e",
  "add end-to-end tests", "scaffold a test gate".
user_invocable: true
---

# Set up an e2e test suite

E2e tests verify the whole running system *through the app* (browser/API), not one
module. They are the per-PR gate. Pairs with `dev-local-setup` (a reproducible
local stack) and `pr` (the verify→ship loop).

## Where it lives
- **Unit/integration tests** stay inside each app/package — they own one module.
- **System e2e** is a dedicated top-level package (e.g. `e2e/`) — it spans all
  apps, so it belongs to none. Add it to the workspace if a monorepo.

## The recipe
1. Stand the app up reproducibly — see `dev-local-setup`. The e2e suite **never
   boots the app itself**; it runs against the already-running stack. That stack can
   be **local** (`dev-local-setup`) **or an isolated cloud box** (`crabbox-setup`) —
   same specs, run against either. For **parallel agents** use the cloud box (one
   laptop can't host concurrent stacks).
2. Pick the framework that fits (Playwright for browser; your HTTP client for API).
   Turn on **video + trace** — the recording is the proof, and it's gitignored output.
3. **Explore the flow live first** (don't guess selectors), then crystallize it into
   a committed spec.
4. Keep the gate **small**: a handful of critical journeys, deterministic. Each new
   feature PR adds its spec — the suite compounds.

## Practices that make e2e trustworthy
- **Real flow, not bypass.** Drive the genuine path. For email codes / OTP, read the
  real code from a local mail server (Mailpit / Inbucket / MailHog) — never hardcode
  a fixed test code. That's what makes it a test, not a rehearsal.
- **Verify auth ITSELF once; bypass it everywhere else.** A dedicated signup/login
  spec proves auth works. Every *other* spec shouldn't re-pay the login tax — build
  a **session helper** that mints an authed state once (real flow → saved storage
  state, or a service-role/token mint) and load it.
- **Layered assertions: client → server → product.** Don't stop at "the UI changed."
  Confirm the server agrees (token validates / row/state is right) AND the
  user-visible outcome (e.g. plan upgraded *and* credits granted).
- **Stable selectors.** Prefer role/label/text; add a small `data-testid` in the
  component when there's no good handle — never a brittle CSS path.
- **Fresh data per run.** Unique emails/ids so reruns don't collide; mind rate
  limits (auth email, etc.).
- **Commit specs + helpers, never `test-results/`** (generated output).

## When a test fails: triage before "fixing"
A red e2e is information. Classify first:
- **Real bug** — the product broke. Fix the code; the test did its job.
- **Stale test** — the flow intentionally changed (renamed route, new step). Update
  the test to match the new contract.
- **Flaky / env** — stack down, timing, rate limit, stale data. Fix robustness/env.

**Never weaken or delete an assertion just to go green.** Loosening is only correct
when the *intended contract* changed — confirmed from the diff, not assumed.

## External services (payments, email, 3rd-party)
Use the vendor's **test/sandbox mode**, never live keys — and **guard hard**: the
test should refuse to run if it detects a live key/credential. If a webhook
completes the flow, forward it locally (e.g. the vendor's CLI listener) so the e2e
exercises the real fulfilment path, not a faked event.
