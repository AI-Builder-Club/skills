---
name: crabbox-setup
description: >
  Scaffold an isolated CLOUD dev box per agent (via crabbox + Daytona) for any
  codebase — the parallel-safe counterpart to dev-local-setup. Each agent gets its
  own full stack (own DB + dev server) and an in-box browser for e2e, so concurrent
  loops never collide on ports/state. Sets up the snapshot image, .crabbox.yaml, an
  idempotent setup.sh (also boots the stack locally), and a cbx.sh wrapper. Use when
  the user says "set up crabbox", "give each agent its own box", "add cloud testing",
  "make this repo testable in the cloud / on Daytona", "parallel-test this", or when
  setup-codebase-harness needs true per-agent isolation.
user_invocable: true
---

# crabbox-setup — an isolated cloud box per agent

`dev-local-setup` gives you **one** local stack. But the loop-engineer model runs
**many loops in parallel**, and you can't run N full stacks on one laptop — fixed
ports, one Docker daemon, one shared DB; worktrees don't fix that (they still share
the host). This skill is the cloud/parallel counterpart: a **fresh isolated box per
agent** (own DB + dev server), driven by an **in-box browser**, so concurrent code
loops verify their work without colliding — laptop at ~0% CPU.

Written for **Daytona** (snapshot-based, the proven path); notes for SSH-lease
providers (Hetzner/AWS) at the end. It **composes** with the rest of the harness:
- reuse `dev-local-setup`'s service/port discovery — don't re-discover.
- run the `e2e-setup` specs **on the box** as the verification.

You are SCAFFOLDING files into the target repo. Templates live in `assets/` (next to
this skill); copy them in and ADAPT (every one has `# EDIT:` markers).

---

## Step 0 — Discover (reuse dev-local, don't re-derive)
If `scripts/dev-local.sh` exists, read it: it already encodes the services, ports,
infra deps, and start commands. The box's `setup.sh` should mirror it so local and
cloud stay in sync. Otherwise discover the same facts (package manager, dev cmd +
**port**, backing services, secrets) — see `dev-local-setup` Step 1. Decide:
- **Needs containers** (Postgres/Supabase/Redis)? → keep the docker-in-docker block.
- **Browser e2e**? → keep the Chrome + playwright-cli + ffmpeg block.
- **Secrets** the app needs → these go through `env.allow` (Step 3), never sync.

## Step 1 — `devbox/Dockerfile`
Copy `assets/Dockerfile` → `devbox/Dockerfile`; adapt. It bakes the slow STATIC tools
(NOT app code — crabbox syncs that at run time, so the build context is just `devbox/`).
- **docker-in-docker** (only if containers): Docker is **pinned to 27.0.3 via the
  static tarball**. ⚠️ Don't use latest / `docker:dind` — docker 28+ defaults to the
  containerd overlayfs snapshotter, which Daytona's kernel rejects (`overlay mount …
  no such file or directory`). 27.x keeps the working overlay2 graphdriver.
- **Browser e2e**: install **Google Chrome** (the `chrome` channel playwright-cli uses
  — NOT chromium), `@playwright/cli`, and playwright's bundled **ffmpeg** (for video).

## Step 2 — Build the snapshot (user runs `daytona login` first)
```sh
daytona snapshot create <NAME> --dockerfile devbox/Dockerfile --context devbox \
  --cpu 4 --memory 8 --disk 10 --region us
```
Pick `<NAME>` (e.g. `myapp-test`) → use it in `.crabbox.yaml`. You can't build snapshots
unless the daytona CLI is logged in your shell — ask the user to run it.

## Step 3 — `.crabbox.yaml`
Copy `assets/crabbox.yaml`. Set `daytona.snapshot`, `sync.exclude` (deps/build dirs +
`**/.env*`), and `env.allow` (the exact secret var names). Secrets travel via `env.allow`
(forwarded over encrypted SSH, never through the broker, never written to git) — that's
*why* they don't go through `sync` (which respects gitignore anyway).

## Step 4 — `setup.sh` (boots the stack on the box AND locally)
Copy `assets/setup.sh`; adapt the EDIT block (install/dev/migrate cmds, port, services)
to **match `scripts/dev-local.sh`**. It's idempotent (check-before-act), so it's a no-op
on what's already up — run `bash setup.sh` locally too. End it with `STACK READY` (the
marker `cbx.sh` waits for).

## Step 5 — `cbx.sh` + browser config
Copy `assets/cbx.sh`; set the config block (`PROVIDER`, `APP_PORT`, `TUNNEL_PORTS`,
`READY_MARKER`). It wraps the raw crabbox CLI so the gotchas are handled:
```sh
bash cbx.sh up   <name>            # warmup + run setup.sh (bg+poll) → STACK READY
bash cbx.sh tunnel <name> &        # SSH tunnel: localhost → box (see it in YOUR browser)
bash cbx.sh pw   <name> -- <args>  # run playwright-cli IN the box (drive the app)
bash cbx.sh get  <name> <remote> <local>   # pull a file (screenshot/video) off the box
bash cbx.sh down <name>            # release the box (Daytona has NO auto-stop)
```
If browser e2e: copy `assets/cli.config.json` → `.playwright/cli.config.json` (chrome
channel + `--no-sandbox`; keep it tracked).

## Step 6 — gitignore + commit (required for fast sync)
Add: `evidence`, `.crabbox`, `.cbx-*.id`, `.cbx-*.sandbox`, `.playwright-cli`. Then
**commit** — crabbox only skips re-uploading when the tree matches a `HEAD`.

## Step 7 — Verify (run the e2e suite on the box)
```sh
bash cbx.sh up demo                          # → ✓ STACK READY
# run the repo's e2e specs against the box's stack (from e2e-setup):
bash cbx.sh pw demo -- open http://localhost:<APP_PORT>   # smoke, or:
#   sync an e2e runner and: crabbox run --id $(cat .cbx-demo.id) -- <your e2e cmd>
bash cbx.sh get demo /tmp/<artifact> evidence/<artifact>  # pull proof
bash cbx.sh down demo
```
Parallel check: `bash cbx.sh up demo2` in another shell — separate box, zero collisions.
This is exactly what the `pr` skill's verifier needs when the stack is single-instance.

---

## Gotchas — each cost a debugging round
- **Daytona caps every `crabbox run` exec at 60s** → long setup must be backgrounded + polled (`cbx.sh up` does it). Never `crabbox run -- bash setup.sh` directly.
- **Poll with `--no-sync`** — a plain run re-syncs the tree and corrupts a running setup.
- **Commit** so sync skips when unchanged.
- **docker-in-docker → pin docker 27.0.3** (28+ breaks overlay on Daytona).
- **Browser: Chrome (channel), not chromium**, + `.playwright/cli.config.json --no-sandbox` (root in box), + bundled **ffmpeg** for video.
- **Daytona is delegated/minimal**: only `warmup`/`run`/`ssh`/`stop`. No `cp`, `--artifact-glob`, `ports`, preview URLs, `--browser`/`vnc`. → pull files with `cbx.sh get`; reach the app via SSH tunnel or in-box playwright-cli, not preview URLs.
- **Secrets via `env.allow`, never sync.**
- **Always `cbx.sh down`** — Daytona doesn't auto-stop; forgotten boxes keep billing (`crabbox list --provider daytona` finds stragglers).

## Optional (advanced) — pre-bake service images
If the slowest phase is the inner `docker pull` on every fresh box, bake the images:
`docker pull --platform linux/amd64` locally → `docker save | gzip > devbox/svc-images.tar.gz`
→ `COPY` it in the Dockerfile → `docker load` in `setup.sh` before starting services.
**Marginal** for a single demo (the load + a bigger snapshot offset the win); worth it only for
frequent parallel cold starts. Daytona can't snapshot a warm box (unimplemented), and
pulling-during-build needs docker-in-build (unsupported) — so the tarball+load is the only
reliable bake. Pre-warming a box before a run is usually simpler.

## Other providers (brief)
SSH-lease providers (Hetzner/AWS/Azure/GCP) have **no 60s cap** (setup runs synchronously) and
crabbox's native `--browser`, `crabbox screenshot`, `vnc`, `--artifact-glob`, `cp` all work — so
you can drop the in-box-playwright/`get` workarounds. But the box boots a stock OS (no snapshot),
so tools install at runtime or via a prebaked image. Keep `setup.sh`/`cbx.sh` mostly the same.
