# loop-engineer

A Claude Code **plugin** for building **loop engineers**: agents that get triggered on their own,
pick up work, ship it, verify it, and log what they learned, so the work compounds without you
prompting every step. It's the productized version of the setup my team runs in production, and
what I teach at [AI Builder Club](https://www.aibuilderclub.com/lp/loop-engineer?utm_source=github&utm_campaign=loop-engineer-template).

## What's a loop engineer?

The shift: you stop prompting a coding agent task-by-task, and start **designing loops**.

A loop is an agent that wakes up on a trigger (a cron, a webhook, an incident, another agent),
does some investigation and work, and writes what it found and did into a shared, file-based
memory. Next run it reads that memory and keeps going. The real power is **compounding**: many
loops (support, SEO, product, ads) read and write the *same* folders, so a friction the support
loop logs can get picked up by the product loop, and a keyword the ads loop finds can feed the
SEO loop. One shared brain, many loops.

Building one comes down to four ingredients:

1. **Triggers:** cron, webhook, an incident, or another agent wakes the loop at the right time.
2. **A file + logging structure:** the shared memory loops read and write.
3. **Tools & connectors:** so the agent can do real work (your skills/MCPs).
4. **A codebase harness:** so the agent can run, test, and verify its own work autonomously.

This plugin gives you **#2 and #4** — `/new-loop` scaffolds the knowledge base on demand, and the
harness skills make any code repo agent-ready, including **an isolated cloud box per agent** so
many loops can ship code *in parallel*.

Want the full walkthrough of the concept and how my team designs compounding loops? Watch the video:

[![The loop engineer: how to design compounding agent loops](assets/video-thumbnail.png)](https://youtu.be/W6x-hb44C0c)

## What's included

```
loop-engineer/                     a Claude Code plugin (skills, no runtime files at root)
├── .claude-plugin/plugin.json     plugin manifest (lists the skills below)
└── skills/
    ├── new-loop/                  spin up a loop (domain): bootstrap the KB if missing, scaffold,
    │   └── references/              test-run, log it. KB model + setup live in references/:
    │                                ARCHITECTURE.md · LOG.md · KNOWLEDGE_SETUP.md · CLAUDE.template.md
    ├── setup-codebase-harness/    master: make any repo agent-ready (orchestrates the four below)
    ├── dev-local-setup/             └ one-command local dev stack
    ├── e2e-setup/                   └ a real e2e test gate
    ├── crabbox-setup/               └ an isolated CLOUD box per agent (parallel-safe; crabbox/Daytona)
    └── pr/                          └ verify-before-ship (a fresh sub-agent proves it, then opens the PR)
```

- **The knowledge base** is the shared memory: artifacts filed by *kind* (`signals/`, `docs/`),
  *domains* as loops, every file with an append-only `## Timeline`. It isn't shipped at the repo
  root — **`/new-loop` materializes it into your repo** the first time you run it (copying in
  `ARCHITECTURE.md` + `LOG.md`, creating the folders, and adding a knowledge-base section to your
  `CLAUDE.md`). Idempotent: run it again and it just adds the new loop.
- **The codebase harness** (the other skills) makes a code repo *legible, executable, and
  verifiable* so loops can ship code without you babysitting them.

## Quickstart

1. **Install the plugin.** Add this repo via the Claude Code plugin system
   (`/plugin marketplace add AI-Builder-Club/loop-engineer-template`, then
   `/plugin install loop-engineer`), or clone it and point your plugin config at it.
2. **Bootstrap your knowledge base + first loop.** In the repo where your agent's memory should
   live, run `/new-loop` and tell it the loop's name, goal, and what it does. On first run it sets
   up the knowledge base (and your `CLAUDE.md`); then it scaffolds `domains/<loop>/README.md`, does
   one real test run, and logs it.
3. **Fill in your `CLAUDE.md`.** `/new-loop` adds the knowledge-base section (or scaffolds a full
   `CLAUDE.md` from `references/CLAUDE.template.md` if you have none) — replace any `{{PLACEHOLDER}}`s.
   This is the context the agent reads every session, so it's the highest-leverage step.
4. **Harness the repo your loop ships into.** Run `/setup-codebase-harness` in that code repo so the
   agent can run, test, and verify its own work. For **parallel** loops shipping code at once, add
   `/crabbox-setup` (each agent gets its own isolated cloud stack).
5. **Let it run.** Each session the agent reads `CLAUDE.md` + the relevant domain README, does work,
   writes artifacts, and appends to `LOG.md`. For code changes it drives `ship-change` and ships
   via `/pr`.

## Requirements

- [Claude Code](https://claude.com/claude-code) (the skills assume it).
- `git`. That's the only hard dependency for the knowledge base + harness.
- The harness skills want the code repo they ship into to be a git repo with a working build/test
  setup. They use Codex for review if available, and degrade gracefully if not.
- `crabbox-setup` (optional, for parallel cloud boxes) needs the `crabbox` CLI + a provider
  (Daytona: `daytona` CLI / `DAYTONA_API_KEY`).

## Go deeper

This plugin gets you the structure. If you want to learn how to actually build agents and run
compounding loops for your own business, that's what I go deep on inside
**[AI Builder Club](https://www.aibuilderclub.com/lp/loop-engineer?utm_source=github&utm_campaign=loop-engineer-template)**:
weekly live builder workshops, courses on production AI agents, AI coding beyond the basics, and
building your first LLM apps, plus a community of people building the same way.

[![Join AI Builder Club](assets/ai-builder-club.png)](https://www.aibuilderclub.com/lp/loop-engineer?utm_source=github&utm_campaign=loop-engineer-template)

**→ [Join AI Builder Club](https://www.aibuilderclub.com/lp/loop-engineer?utm_source=github&utm_campaign=loop-engineer-template)**

Built by [Jason Zhou](https://x.com/jasonzhou1993) (AI Jason).
