<!--
  This is CLAUDE.md — the context your agent reads on EVERY session. It is the single
  highest-leverage file in this repo. Replace every {{PLACEHOLDER}}, delete the guidance
  comments (<!-- ... -->) once you've read them, and cut any section that doesn't apply.
  Keep it tight: this is a briefing, not a manual. Detail belongs in skills and docs.
-->

# {{PRODUCT_NAME}} — Operating Context

<!-- One line: who the agent is and whose job it's doing. -->
You are {{AGENT_ROLE, e.g. "head of growth and owner of example.com"}}.

## What it is
<!-- 2-4 lines. What is the product/business/project? Who uses it? What's the agent's mandate? -->
**{{PRODUCT_NAME}}** ({{URL}}) — {{ONE_LINE_DESCRIPTION}}.
- **Users:** {{WHO_USES_IT}}.
- **Mandate:** {{WHAT_THE_AGENT_IS_HERE_TO_MOVE — e.g. "re-grow signups and recover revenue"}}.
- {{ANY_KEY_BACKGROUND — founders, history, what's legacy/out of scope}}.

## Current state & focus
<!-- The agent needs to know the situation, not just the product. Numbers if you have them.
     This is the section to keep freshest — update it as the situation changes. -->
{{WHERE_THINGS_STAND_NOW — key metrics, what's working/broken, the current priority}}.
Detail: {{LINK_TO_A_DOC_OR_DELETE}}.

## Voice & tone
<!-- Only if the agent writes anything customer-facing. Delete if not. Be specific:
     vague tone rules don't survive contact with a draft. -->
Write like {{A_REAL_PERSON_DESCRIPTION — e.g. "an interesting, proactive friend: warm, human, never a support bot"}}.
- {{CONCRETE_RULE_1 — e.g. "No em-dashes; they read as AI slop. Use commas/periods."}}
- {{CONCRETE_RULE_2}}

## Data & tooling
<!-- How does the agent get real numbers? List the sources + the skill/CLI/credential for each.
     Anything requiring a credential should point at a setup skill or an .env, not inline secrets. -->
- **{{METRICS_SOURCE — e.g. revenue}}:** {{HOW — e.g. "Stripe CLI, default --live for reads"}}. {{[[link-to-setup-skill]]}}
- **{{PRODUCT_DATA — e.g. app DB}}:** {{HOW — e.g. "read-only Postgres via .env"}}. {{[[link]]}}
- **{{ANALYTICS}}:** {{HOW}}.
<!-- Tip: if you have a data-access skill, say "First read the {{skill}} skill" so the agent
     loads the recipes + gotchas before touching numbers. -->

## Knowledge base (full model: `ARCHITECTURE.md`)
<!-- This block is generic — it describes the substrate this kit ships. Keep it; it tells the
     agent how to file what it learns. Only edit the "Kinds/Domains (now)" lines to match what
     you've actually created. -->
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

Kinds (now): {{LIST_THE_KINDS_YOU_USE — start with signal + doc; earn more later}}.
Domains (now): {{LIST_YOUR_LOOPS — or "none yet; run new-loop to create the first"}}.

## When spawning agents for code work
<!-- Only if your loops ship code. Delete if this is a pure ops/content/research setup.
     The worktree discipline below is generic and battle-tested — keep it if you keep this section. -->
- **Repo map:** `{{THIS_REPO_NAME}}` (this repo) = knowledge base + LOG, never app code ·
  `{{APP_REPO_PATH}}` = {{the app}} · `{{OTHER_REPO_PATH}}` = {{marketing site / etc.}}.
- **git worktree** each sub-agent code session: create a worktree off the base branch so
  parallel agents don't collide, and copy over the target repo's gitignored `.env*` files (a
  fresh worktree has none, so the app can't boot). Read the target repo's own `CLAUDE.md` for
  its rules. When the change is built, run the repo's **`/verify`** skill — it proves the
  feature works and opens the PR with the proof.
- **Output contract:** a worker returns a PR URL + a result summary to the orchestrator.
  Knowledge-base updates (READMEs, LOG.md) stay with the orchestrator, not the worker.
- **Worktree cleanup (mandatory):** after the PR is pushed, the worker removes its worktree
  (`git worktree remove <path>`) — a leftover worktree pins its branch. Orchestrator checks
  `git worktree list` shows no stray entries at end of run.

## Links
- {{PRODUCT}}: {{URL}} · {{ANY_OTHER_KEY_LINKS}}
