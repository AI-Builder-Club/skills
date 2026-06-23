#!/usr/bin/env bash
#
# cbx.sh — front-door wrapper around crabbox + Daytona.
#
# Daytona caps each `crabbox run` exec at 60s, but setup.sh takes minutes — so it
# must be backgrounded + polled. This hides that, sources your secrets for env.allow
# forwarding, and resolves the canonical cbx_ lease id (so down+up never targets the
# wrong box).
#
#   bash cbx.sh up   <name>            # warmup + setup.sh (bg+poll) → STACK READY
#   bash cbx.sh logs <name>            # tail the setup log
#   bash cbx.sh tunnel <name> &        # SSH tunnel: localhost → box (use a local browser)
#   bash cbx.sh pw   <name> -- <args>  # run playwright-cli IN the box
#   bash cbx.sh get  <name> <remote> <local>   # pull a file off the box (base64)
#   bash cbx.sh down <name>            # release the box (Daytona has NO auto-stop)
set -euo pipefail

# ── EDIT: project config ────────────────────────────────────────────────────
PROVIDER=daytona
APP_PORT=3000
TUNNEL_PORTS="3000:localhost:3000"   # space-separated -L specs, e.g. "3000:localhost:3000 54421:localhost:54421"
READY_MARKER="STACK READY"
# secrets in env.allow are forwarded from your SHELL. We source .env so they're set.
[ -f .env ] && { set -a; . ./.env; set +a; }
[ -f .env.local ] && { set -a; . ./.env.local; set +a; }
# ────────────────────────────────────────────────────────────────────────────

CMD="${1:-}"; NAME="${2:-demo}"
IDFILE=".cbx-${NAME}.id"
resolve_id() { [ -s "$IDFILE" ] && cat "$IDFILE" || { echo "✗ no box for '$NAME' (run: bash cbx.sh up $NAME)" >&2; exit 1; }; }
R()  { crabbox run --provider "$PROVIDER" --id "$1" "${@:2}"; }
RN() { crabbox run --provider "$PROVIDER" --id "$1" --no-sync "${@:2}"; }

case "$CMD" in
up)
  echo "▸ leasing box…"
  out="$(crabbox warmup --provider "$PROVIDER" --slug "$NAME" 2>&1)"; echo "$out"
  ID="$(echo "$out" | grep -oE 'lease=cbx_[0-9a-f]+' | head -1 | cut -d= -f2)"
  [ -n "$ID" ] || { echo "✗ could not parse lease id"; exit 1; }
  echo "$ID" > "$IDFILE"; echo "  (lease $ID)"

  echo "▸ waiting for the box to be ready…"          # provisioning can lag warmup
  for _ in $(seq 1 30); do RN "$ID" -- true >/dev/null 2>&1 && break; sleep 3; done

  echo "▸ starting setup.sh on the box (backgrounded)…"
  R "$ID" -- bash -lc 'unset NODE_OPTIONS; setsid bash setup.sh >/tmp/setup.log 2>&1 </dev/null & echo started' >/dev/null

  echo "▸ waiting for ${READY_MARKER} (first run pulls images — a few min)…"
  for _ in $(seq 1 60); do
    RN "$ID" -- bash -lc "grep -q '${READY_MARKER}' /tmp/setup.log" >/dev/null 2>&1 && { echo "✓ ${READY_MARKER} — app on the box at localhost:${APP_PORT}"; exit 0; }
    RN "$ID" -- bash -lc 'grep -qiE "\] dockerd failed|services failed|dev server not up" /tmp/setup.log' >/dev/null 2>&1 && { echo "✗ setup failed:"; RN "$ID" -- bash -lc 'tail -15 /tmp/setup.log'; exit 1; }
    sleep 10
  done
  echo "✗ timed out:"; RN "$ID" -- bash -lc 'tail -15 /tmp/setup.log'; exit 1
  ;;

logs)   RN "$(resolve_id)" -- bash -lc 'tail -40 /tmp/setup.log' ;;

tunnel)
  ID="$(resolve_id)"
  SSH="$(crabbox ssh --provider "$PROVIDER" --id "$ID" --show-secret 2>/dev/null | tail -1)"
  [ -n "$SSH" ] || { echo "✗ no ssh command for $ID"; exit 1; }
  L=""; for p in $TUNNEL_PORTS; do L="$L -L $p"; done
  echo "▸ tunneling$L  (Ctrl-C to stop) → open http://localhost:${APP_PORT}"
  eval "$SSH -N$L"
  ;;

pw)     ID="$(resolve_id)"; shift 2 || true; [ "${1:-}" = "--" ] && shift || true
        RN "$ID" -- playwright-cli "$@" ;;

get)    ID="$(resolve_id)"; REMOTE="${3:?usage: get <name> <remote> <local>}"; LOCAL="${4:?usage: get <name> <remote> <local>}"
        RN "$ID" -- bash -lc "base64 -w0 '$REMOTE'" 2>/dev/null | sed -n '/^[A-Za-z0-9+/=]\{16,\}$/p' | base64 -d > "$LOCAL"
        echo "✓ pulled $REMOTE → $LOCAL ($(wc -c < "$LOCAL") bytes)" ;;

down)   ID="$(resolve_id)"; crabbox stop --provider "$PROVIDER" "$ID" 2>&1 | tail -1; rm -f "$IDFILE" ".cbx-${NAME}.sandbox" ;;

*)      echo "usage: bash cbx.sh {up|logs|tunnel|pw|get|down} <name>"; exit 1 ;;
esac
