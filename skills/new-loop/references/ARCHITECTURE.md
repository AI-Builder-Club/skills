---
title: Knowledge-base architecture
type: decision
status: adopted
---

# Knowledge-base architecture

How this repo is organized as the operating substrate for a long-lived, autonomous agent
(and its humans). Everything is plain **markdown + frontmatter in git** — diffable, reviewable,
agent-writable. This doc is the durable record of the model and the options rejected, so the
shape stays intentional as it grows.

---

## The model (v1 — deliberately minimal)

Two ideas only:

1. **Artifacts** are global, foldered by **kind**; `domain:` is a **field (a list)**, not a folder.
   Each artifact has exactly one home (by *what it is*). Cross-cutting is handled by tags + links
   — never by duplicating or by nesting inside a domain.
2. **Domains** are "loops" — a thread of work with a charter, cadence, and metrics. A domain
   folder holds only its **README (charter)** + **machinery** (metrics, collectors). It **links**
   artifacts; it never contains them.

### Kinds (start with just these two)

| kind | what it is | folder | key frontmatter |
|---|---|---|---|
| `signal` | evidence: feedback / idea / observation (deduped, frequency-counted) | `signals/` | `category, frequency, sources[], domain[], status` |
| `doc` | durable knowledge: an analysis, a decision, a thing you learned | `docs/` | `domain[], status?, links` |

That's enough to run almost any loop. Each folder's `README` is its schema — read it before
adding artifacts of that kind. Committed work doesn't need its own kind to start: a loop's
to-dos live inline as a backlog in its domain `README`. Promote them to a `task` kind only
once you've earned it (below).

### Earning a new kind

Default to an existing kind. Add a new one **only** when it has all three of: its own status
machine **and** queryable frontmatter fields **and** a distinct body shape. Otherwise it's a
`doc` or a `signal` with a tag, or a backlog line in a domain README. Examples of kinds teams
have earned once volume justified them:

- `task` — committed work as its own files, once your backlogs outgrow the domain README (an
  **experiment** = a task with a `metric`): `status, domain[], metric?, refs`.
- `ticket` — a support conversation (synced from a helpdesk): `user_email, url, status`.
- `content` — an outbound draft with a publish lifecycle: `type, status, channel, posted_url, outcome`.
- entity kinds (`lead`, `keyword`, `campaign`) — when an outreach/ads/SEO loop needs to track many of one thing.

If you can't name the distinct status machine, you haven't earned the kind yet.

### Domains (loops)

A domain is one loop: a separable workstream with its own cadence/owner. Spin up a new domain
only when that's true — otherwise just add a `domain:` tag to an existing one. A domain's
`README` is its live state: goal/charter, current focus, a backlog of links, links to evidence,
optional metrics, and a `## Timeline`. It **points at** artifacts; it never holds them.

### Body convention — two layers

Each artifact = a normal **main body** + an optional appended **`## Timeline`** (append-only,
dated: `YYYY-MM-DD | source — what happened`). *"What's true now"* = body; *"what happened"* =
Timeline. This gives every artifact its own history, absorbs daily logs, and lets a `signal`
accumulate evidence (frequency = Timeline entries). Git holds the mechanical diff history.

### Logs & data

- **`LOG.md`** (root) — global activity feed: one line per ship/ingest. Detail lives in each
  artifact's `## Timeline`. Append one entry right before the commit that ships a bulk of work.
- **No separate `daily`/`journal` kind.** A domain's run-log is its `README`'s `## Timeline`
  (one terse dated line per run); rich per-item detail lives in the items it links. So there are
  exactly two log surfaces: per-artifact `## Timeline` + the global `LOG.md`.
- **`domains/<x>/metrics/*.jsonl`** — numeric time-series, written by **deterministic collectors**
  (code/skills, *not* the LLM). Agents read & interpret. Scorecards are generated from these.

### Rules (DRY + MECE)

1. **One concept = one home** (by kind). Everyone else links via `[[slug]]`.
2. **`domain:` is a field (list), not a folder.** Cross-cutting = multi-tag + multi-link.
3. **Collectors write data; agents write knowledge.** Don't pay an LLM to fetch numbers.
4. **Frontmatter = anything you'd query.** Prose for everything else.

---

## Deferred — add only when the need is real (do NOT pre-build)

| Later | Trigger to add it |
|---|---|
| `trigger:` field (cron / webhook / event) | first non-manual automation (e.g. a server-down webhook) |
| recursive `thread` + `parent:` relation | a domain needs sub-threads (e.g. strategy → tasks) |
| entity kinds (`lead`, `keyword`, `campaign`) | the outreach / ads / social loops ship |
| derived index (sqlite / vector) | retrieval volume outgrows ripgrep (~10⁴⁺ artifacts) |
| reconcile / consolidation daemon | autonomous volume creates dupes / contradictions |
| autonomy / guardrails / budget formalization | agents act without human review |

The substrate extends to all of these without a rebuild (markdown stays the system of record;
you layer a cache/daemon on top).

---

## Options considered, and why not

1. **Folder-by-domain** (everything for a loop under its own folder). ❌ Cross-cutting artifacts
   have no single home — an analysis spanning two loops, or a keyword used by three, can't live
   in one folder. Forces duplication.
2. **Folder-by-kind only, no domains.** ❌ Loses the thread-of-work + cadence cohesion;
   "where's the X loop?" has no home.
3. **Half-nested** (some kinds global, some under domains). ❌ The asymmetry *is* the bug.
4. **Pure database** (Notion-style). ❌ for now — we want the data to live in *this* repo
   (code-adjacent, diffable, reviewable). Forward-compatible: a DB can be derived later.
5. **Heavy taxonomy (8 kinds upfront).** ❌ Premature; every kind you can't justify causes
   friction. Start with 3, earn more.
6. **jsonl/tabular for high-volume artifacts.** ❌ One shape (markdown) is simpler; derive SQL
   later. jsonl only for genuine numeric time-series (metrics).

## Chosen because

It's the convergence of systems that already solved this: **Monday / Asana / Notion** (items +
properties + relations + *views*; nesting is data, not folders); **markdown-as-system-of-record**
knowledge bases (the two-layer page; deterministic collectors; nightly reconcile); the
**knowledge-work canon** — Matuschak (atomic, concept-oriented, densely-linked notes), PARA
(projects vs areas; stock vs flow), Teresa Torres (outcome → opportunity → solution → experiment).

DRY, MECE, agent-writable, human-reviewable, and graduates to scale without a rebuild.

---

## Map (where things live)

| I want to… | Go to |
|---|---|
| record a fact / insight we learned | `docs/` |
| capture feedback / an idea (with frequency) | `signals/` |
| track a piece of committed work | a backlog line in the domain `README` (or `tasks/` once earned) |
| read a deep analysis | `docs/` |
| see why we chose something | `docs/` (a decision) |
| see a loop's goal / cadence / state | `domains/<x>/README.md` |
| see metrics over time | `domains/<x>/metrics/*.jsonl` + scorecard |
| spin up a new loop | run the `new-loop` skill |
