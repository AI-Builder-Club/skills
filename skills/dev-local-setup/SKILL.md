---
name: dev-local-setup
description: >
  Scaffold a one-command `dev-local` launcher for ANY codebase. Investigates the
  repo to find its services, ports, and infra dependencies, then generates a
  single `scripts/dev-local.sh` (up/down/status/logs/restart) that runs every
  dev server in one tmux session, plus a short skill doc describing it. Use when
  someone says "set up dev-local", "make a one-command dev launcher", "I want
  one script to start this repo", "scaffold dev-local for this project".
user_invocable: true
---

# Set up a `dev-local` launcher for this codebase

Goal: produce **one script** (`scripts/dev-local.sh`) that a person or agent runs
to bring the whole local stack up — every long-lived dev server in its own tmux
window, plus any infra (DB, cache, queues) the app needs — and a short skill doc
so it's discoverable later.

Do NOT start any dev servers yourself. You are *generating* the launcher, not
running it. Build it, syntax-check it, then hand it to the user to run.

> This is the **local, single-stack** launcher. For **concurrent agents** that each
> need their own isolated stack (one laptop can't run N), see `crabbox-setup` — the
> cloud counterpart. It reuses this script's service/port discovery, so set this up first.

## Step 1 — Investigate the repo (don't guess)

Discover the real facts before writing anything:

1. **Package manager & layout** — look for `pnpm-workspace.yaml` / `turbo.json` /
   `nx.json` / `lerna.json` (monorepo) or a single `package.json`, `Cargo.toml`,
   `go.mod`, `pyproject.toml`, `Makefile`, `Procfile`, `docker-compose.yml`.
2. **Services to run** — each app/package with a `dev`/`start`/`serve` script, or
   each `Procfile` line, or each `docker-compose` service. Note the exact command
   to start each (e.g. `pnpm --filter <name> run dev`, `npm run dev`, `cargo run`,
   `uvicorn app:app --reload`).
3. **Ports** — grep configs and `.env` for the port each service binds
   (`PORT`, `listen(`, `server.port`, framework config like `rsbuild.config`,
   `vite.config`, `next.config`). Record which talks to which.
4. **Infra dependencies** — does a backend need Postgres / Supabase / MySQL /
   Redis / Mongo / Kafka? Check `.env`(`.local`), ORM config, `docker-compose`,
   and connection-string defaults. Decide how to provide each locally
   (`supabase start`, a Docker container, an existing `docker-compose`).
5. **First-run setup** — migrations, seed, codegen, `install`. Note the commands
   but keep them OUT of the default `up` path (offer a separate subcommand).
6. **Env files** — confirm a committed `.env.example`/`.env`; never invent or
   print secrets. The script must not inject credentials.

Write down a small table: service → command → port → depends-on. That table is
the spec for the script.

## Step 2 — Generate `scripts/dev-local.sh`

Adapt the skeleton in `assets/dev-local.template.sh` (same directory as this
skill). Fill in the discovered services, ports, and infra. Keep these
invariants:

- **One tmux session**, one window per long-lived server. Idempotent: re-running
  `up` leaves existing windows alone instead of duplicating them.
- **Preflight** that fails fast with install hints when a required tool is
  missing (tmux, the package manager, Docker if infra needs it).
- **Infra brought up before servers**, reused if already running.
- Subcommands: `up`, `down` (and `down --all` to stop infra), `status` (window
  list + port check), `logs <name>`, `restart <name>`, `attach`, plus any
  project-specific one-shots (`migrate`, `seed`).
- Resolve repo root from the script's own location so it works from any cwd.
- No secrets in the script. Print URLs and a port check at the end of `up`.

If the repo has **no infra needs**, drop the Docker/DB parts entirely — keep it
to preflight + tmux windows. Match the script's complexity to the repo; simpler
is better.

Then: `chmod +x scripts/dev-local.sh` and `bash -n scripts/dev-local.sh` to
syntax-check. Verify the read-only `status` path runs cleanly. Do not run `up`.

## Step 3 — Write a short skill doc

Create `.claude/skills/dev-local/SKILL.md` (or the repo's skills location) with:
frontmatter (`name: dev-local`, a `description` listing trigger phrases), a
service/port table, prerequisites, the subcommand list, and brief
troubleshooting (port-in-use, a window exited, infra not running). Keep it to one
screen — it documents the script, it doesn't re-explain it.

## Step 4 — Hand off

Tell the user the exact commands: `scripts/dev-local.sh up`, plus any first-run
step (`… migrate`). List the URLs. Note any prerequisite they must install or
start (e.g. Docker Desktop) before the first `up`.

## Principles

- **Discover, don't assume.** Ports and start commands come from the repo, never
  from convention alone.
- **Idempotent & safe to re-run.** No duplicate servers, no clobbered infra.
- **Right-sized.** A 3-service monorepo with Postgres+Redis needs the full
  skeleton; a single Vite app needs ~30 lines. Don't over-build.
- **Never run servers or print secrets.** Generate, syntax-check, hand off.
