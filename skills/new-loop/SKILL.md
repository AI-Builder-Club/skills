---
name: new-loop
description: Spin up a new loop (domain) in a file-based knowledge base — bootstrap the substrate if it's missing, gather the loop's charter, scaffold domains/<loop>/README.md, then do ONE real test run and record it in the loop's Timeline and LOG.md. Use when the user says "set up a new loop", "create a domain", "start a new beat/workstream", or names a recurring job they want the agent to own.
user_invocable: true
---

# new-loop — spin up a new loop

A **loop** (a `domain`) is a recurring thread of work the agent owns: a charter, a cadence, and
the artifacts it produces. This skill creates one, proves it works with a single real run, and
leaves behind a `domains/<loop>/README.md` that is the loop's live state.

## When to use
The user wants to stand up a new workstream/beat/job (e.g. "a weekly SEO loop", "a support
triage loop", "a competitor-watch loop"). Don't use this for a one-off task — that's a backlog
line in an existing domain, or a `doc`/`signal`.

## Inputs to gather (ask only what's missing)
Infer from the request; ask a short clarifying round only for what you can't:

1. **name** — kebab-case, the loop's home folder (`domains/<name>/`). Keep it short.
2. **goal** — one line: the outcome this loop drives.
3. **cadence** — `manual` / `daily` / `weekly` / a cron expr. Default `manual`.
4. **what it does** — what it consumes (signals? data? an inbox? a URL?) and produces (signals?
   docs? a report? code changes via `pr`/`ship-change`?).
5. **tools/data** — sources or credentials it needs (point at a setup skill or `.env`; never
   inline secrets).

If the request is already specific, infer all five and just confirm in your summary.

## Procedure

### 1. Bootstrap the substrate (one-time; skip if already set up)
Check the knowledge-base repo root for:
- `ARCHITECTURE.md` and `LOG.md`, and
- a `CLAUDE.md` that has a "Knowledge base" section.

**All present →** the substrate exists; skip to Step 2.
**Anything missing →** read `references/KNOWLEDGE_SETUP.md` and follow it — it copies in
`ARCHITECTURE.md` + `LOG.md`, creates `signals/ docs/ domains/` with their README schemas, and
injects the knowledge-base section into `CLAUDE.md` (or scaffolds one from
`references/CLAUDE.template.md`). It's idempotent: it only creates what's missing.

(Read `references/ARCHITECTURE.md` once if you haven't — it's the model this skill instantiates.)

### 2. Scaffold the loop README
Create `domains/<name>/README.md` from the **domain template** (in `domains/README.md`, also
quoted in `references/KNOWLEDGE_SETUP.md`), filled with the gathered inputs. Required sections:
frontmatter (`kind: domain`, `domain`, `status: active`, `goal`, `cadence`), a 2–4 line
description, `## Current focus`, `## Backlog` (to-dos inline — they stay in the README until they
earn a `task` kind), and an empty `## Timeline`. Add `## Evidence & analysis` / `## Metrics`
placeholders if relevant.

Collision check: if `domains/<name>/` already exists, stop and ask whether to update it instead
of overwriting.

### 3. Do ONE real test run
The point of the skill: prove the loop actually runs, not just that the folder exists.

**Actually run the loop once, at small scale** — do whatever it's meant to do (triage a few real
tickets, pull one real SERP, fetch the inbox, draft one comment, run one analysis query, scope
one code change…). Use real tools/data where you can; if a credential is missing, do the
furthest-reachable dry run and note the gap.

**Producing an artifact is optional** — a legit run may surface nothing worth filing. Only create
a `signal`/`doc` if the run genuinely produced one.

Two **required** outputs regardless:
- Append one dated line to the loop README's `## Timeline`:
  `YYYY-MM-DD | test run — <what you did and found / "nothing actionable yet">`.
- Append one entry to `LOG.md` (its grammar):
  ```
  ## YYYY-MM-DD · <loop-name> loop created + first run · #ops
  What: <one line — what the loop is and what the first run did/found>.
  Refs: domains/<name>/README.md (new)[, any artifact created].
  ```

### 4. Report back
Summarize: the loop's charter (the five inputs), what the test run did/found, any artifacts
created (or "none — nothing actionable this run"), missing tools/credentials to wire up, and how
to run it again (cadence + entry point). Keep it tight.

## Notes
- **Don't gold-plate the scaffold.** A loop README is live state, not a spec — start lean; let it
  accrete via its Timeline.
- **One loop = one separable workstream.** If what the user described is really part of an
  existing loop, add it there (a backlog line + a `domain:` tag) instead of a near-duplicate.
- For loops that **ship code**, the loop's run drives the `pr` skill / `ship-change`
  (`skills/pr/ship-change.js`) — and gets each agent its own isolated stack via `crabbox-setup`.
  Point the README's Backlog at them.
