# Knowledge-base bootstrap (read only when the substrate is missing)

`new-loop`'s Step 1 reads this **only when** the knowledge base isn't set up yet
(no `ARCHITECTURE.md` + `LOG.md` at the repo root, or `CLAUDE.md` doesn't reference
the structure). It's a **one-time, idempotent** setup: create only what's missing,
never clobber an existing file. Once done, future `new-loop` runs skip straight to
creating the loop.

The model these files instantiate is in `ARCHITECTURE.md` (sibling of this file).
Read it once if you haven't.

---

## Procedure

Run from the **knowledge-base repo root** (where loops read/write — usually the repo
that holds `CLAUDE.md`, not an app code repo).

1. **`ARCHITECTURE.md`** — if absent at root, copy it verbatim from this skill's
   `references/ARCHITECTURE.md`.
2. **`LOG.md`** — if absent at root, copy it verbatim from `references/LOG.md`.
3. **`signals/`, `docs/`, `domains/`** — for each folder that's missing, create it and
   write its `README.md` from the verbatim blocks below (these READMEs *are* the schema).
4. **`CLAUDE.md`** —
   - If it exists but has no "Knowledge base" section → **append** the
     *CLAUDE.md — Knowledge-base section* block below (don't touch the rest).
   - If it doesn't exist → offer to scaffold one from `references/CLAUDE.template.md`
     (the user fills its `{{PLACEHOLDER}}`s).
5. Do **not** pre-create `tasks/` or any other kind — those are earned later (see
   `ARCHITECTURE.md` → "Earning a new kind").

Then return to `new-loop` Step 2 (scaffold the loop).

---

## `signals/README.md` (copy verbatim)

````markdown
# signals/ — evidence

One file per **signal**: a piece of feedback, an idea, or an observation worth remembering.
Signals are **deduped and frequency-counted** — when the same thing shows up again, you don't
make a new file, you add a Timeline entry to the existing one and bump `frequency`.

This README is the schema. See `ARCHITECTURE.md` for the model.

## Frontmatter

```yaml
---
kind: signal
category: feedback | idea | friction | observation   # what sort of signal
frequency: 1                # how many times seen; increment on recurrence
sources: []                 # where it came from (links, ticket ids, urls)
domain: []                  # which loop(s) this feeds — a list of domain names
status: open | triaged | actioned | closed
---
```

## Body

A short statement of the signal (what, and why it matters), then an optional append-only
`## Timeline` accumulating each sighting:

```
## Timeline
2026-06-14 | support ticket #123 — user hit the same wall again
```

`frequency` = number of Timeline entries. Link related artifacts with `[[slug]]`.

## Naming

`<short-kebab-slug>.md`, or a stable id like `FB-<n>.md` if you prefer running numbers.
````

---

## `docs/README.md` (copy verbatim)

````markdown
# docs/ — durable knowledge

One file per **doc**: something you learned, analyzed, or decided that you want to be findable
later. If a signal is raw evidence, a doc is the worked-through version: an analysis, a writeup,
a decision and its rationale, a how-it-works note.

This README is the schema. See `ARCHITECTURE.md` for the model.

## Frontmatter

```yaml
---
kind: doc
domain: []                  # which loop(s) this belongs to
status: draft | adopted | superseded   # optional; use when a doc can be acted on or replaced
links: []                   # related artifacts, [[slug]] or paths
---
```

Optionally add a `type:` field (e.g. `analysis`, `decision`, `learning`) if you find yourself
wanting to filter docs by shape — but don't force it. Most docs are just knowledge.

## Body

Main text = *what's true now*. Append an optional `## Timeline` for *what happened*
(revisions, supersessions, when a decision was revisited). Link liberally with `[[slug]]`.

## Naming

`<short-kebab-slug>.md` or `<TOPIC>-<YYYY-MM>.md` — whatever reads well and sorts sensibly.
````

---

## `domains/README.md` (copy verbatim)

````markdown
# domains/ — loops

Each subfolder is one **loop**: a thread of work with a charter, a cadence, and (optionally)
metrics. A domain folder holds only its **`README.md`** (the loop's live state) and optional
**machinery** (`metrics/*.jsonl`, collectors). It **links** to artifacts in `signals/` and
`docs/`; it never contains them. The loop's to-dos live inline in the README's `## Backlog`
(promote to a `task` kind only once that outgrows the README — see `ARCHITECTURE.md`).

Don't create domains by hand — run the **`new-loop`** skill. It scaffolds the README from the
template below, test-runs the loop, and records the run.

This README is the schema. See `ARCHITECTURE.md` for the model.

## Domain README template

```markdown
---
kind: domain
domain: <loop-name>
status: active | paused | archived
goal: <one line — the outcome this loop drives>
cadence: <manual | daily | weekly | cron expr — how often it runs>
---

# <loop-name> — <short tagline>

<2-4 lines: what this loop does, what it consumes (which signals/data), what it produces.>

## Current focus
<The single most important thing this loop is working on right now. Keep it fresh.>

## Backlog
- [ ] <work item — inline; link [[signal-slug]] / [[doc-slug]] if one exists>
- [ ] <next thing>

## Evidence & analysis
[[doc-slug]] · [[doc-slug]]

## Metrics
`metrics/` — <which numbers, and the collector that writes them (TBD is fine to start)>.

## Timeline
YYYY-MM-DD | <run/source> — <what happened this run>
```

A domain's `## Timeline` is its run-log: one terse dated line per run. Rich per-run detail
lives in the artifacts it links, not here.
````

---

## CLAUDE.md — Knowledge-base section (append if missing)

Insert this block into the repo's `CLAUDE.md` (it's generic — it tells the agent how to
file what it learns). Only edit the "Kinds/Domains (now)" lines to match what exists.

````markdown
## Knowledge base (full model: `ARCHITECTURE.md`)
**Artifacts** are global, foldered by **kind** — `signals/` (feedback, ideas, observations) and
`docs/` (durable knowledge: analyses, decisions, learnings). Committed work starts as a backlog
line in the owning domain's `README`; promote to a `task` kind only once that outgrows the
README. `domain:` is a frontmatter field (a list), never a folder. **Domains**
(`domains/*/`) are agent loops whose `README` holds the loop's **state** — goal/context, current
focus, a `## Timeline`, and **links** to its artifacts (it points to them, never contains them).
Body = main text + optional append-only `## Timeline`. Each folder's `README` is its schema.

**Reuse before creating** (earn the structure, don't pre-build):
- **Kind** — start with just `signal` + `doc`. Add a new kind only if it has its own status
  machine **and** queryable fields **and** body shape. Otherwise it's a `doc` or a `signal`.
- **Domain** — default to a `domain:` tag on an existing one; spin up a new domain only when
  it's a separable workstream with its own cadence/owner (use the `new-loop` skill).

- **`LOG.md`** — global feed; **append ONE line right before the commit/PR that ships major
  work** (`## YYYY-MM-DD · title · #tags` + `What:`/`Refs:`). Detail → each artifact's `## Timeline`.

Kinds (now): signal + doc.
Domains (now): {{LIST_YOUR_LOOPS — or "none yet; run new-loop to create the first"}}.
````
