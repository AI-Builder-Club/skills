#!/usr/bin/env bash
#
# dev-local.sh — bring this project's local dev stack up in one command.
#
# TEMPLATE: replace every <PLACEHOLDER> with values discovered from the repo,
# delete the parts you don't need (e.g. the whole infra section if there are no
# DB/cache dependencies), and add a window per long-lived dev server.
#
# Usage:
#   scripts/dev-local.sh up            # start infra + all dev servers (idempotent)
#   scripts/dev-local.sh down          # stop the dev servers (leaves infra running)
#   scripts/dev-local.sh down --all    # also stop infra
#   scripts/dev-local.sh status        # window list + port check
#   scripts/dev-local.sh logs <name>   # tail a window
#   scripts/dev-local.sh restart <name>
#   scripts/dev-local.sh attach        # attach to the tmux session
#
set -euo pipefail

# --- config -----------------------------------------------------------------
SESSION="<PROJECT>-dev"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"   # repo root (script lives in scripts/)

# service-name -> port, for the port check. Fill from discovery.
#   e.g. WEB_PORT=3000 ; API_PORT=4000
# <PORTS HERE>

# Long-lived servers: "window_name|start command". One per service.
SERVERS=(
  # "web|pnpm --filter <web> run dev"
  # "api|pnpm --filter <api> run dev"
)

# Infra containers/ports to verify in `status` (name:port). Empty if none.
INFRA_PORTS=(
  # "postgres:5432"
  # "redis:6379"
)

# --- pretty print -----------------------------------------------------------
c_reset=$'\033[0m'; c_dim=$'\033[2m'; c_grn=$'\033[32m'; c_ylw=$'\033[33m'; c_red=$'\033[31m'; c_cyn=$'\033[36m'
say()  { printf "%s\n" "$*"; }
info() { printf "${c_cyn}▸ %s${c_reset}\n" "$*"; }
ok()   { printf "${c_grn}✓ %s${c_reset}\n" "$*"; }
warn() { printf "${c_ylw}! %s${c_reset}\n" "$*"; }
die()  { printf "${c_red}✗ %s${c_reset}\n" "$*" >&2; exit 1; }
port_up() { lsof -ti :"$1" -sTCP:LISTEN >/dev/null 2>&1; }

# --- preflight --------------------------------------------------------------
preflight() {
  command -v tmux >/dev/null 2>&1 || die "tmux not found. Install: brew install tmux"
  command -v <PKG_MANAGER> >/dev/null 2>&1 || die "<PKG_MANAGER> not found."
  # If infra needs Docker, uncomment:
  # command -v docker >/dev/null 2>&1 || die "docker not found."
  # docker info >/dev/null 2>&1 || die "Docker daemon not running. Start Docker Desktop."
  [ -d "$ROOT/node_modules" ] || die "Deps not installed. Run: <PKG_MANAGER> install"
}

# --- infra (delete this whole section if the repo has no infra deps) --------
ensure_infra() {
  # Example: start a Redis container if its port is free.
  # if ! port_up 6379; then
  #   docker start <PROJECT>-redis >/dev/null 2>&1 \
  #     || docker run -d --name <PROJECT>-redis -p 6379:6379 redis:7-alpine >/dev/null
  #   ok "Redis up on :6379"
  # fi
  # Example: local Supabase / docker-compose.
  # ( cd "$ROOT" && supabase start )           # or: docker compose up -d
  :
}

# --- tmux helpers -----------------------------------------------------------
start_window() {  # idempotent: skip if the window already exists
  local name="$1" cmd="$2"
  if tmux list-windows -t "$SESSION" -F '#{window_name}' 2>/dev/null | grep -qx "$name"; then
    warn "window '$name' already exists — leaving it alone"; return
  fi
  tmux new-window -t "$SESSION" -n "$name" -c "$ROOT"
  tmux send-keys -t "$SESSION:$name" "$cmd" C-m
}

port_check() {
  [ ${#INFRA_PORTS[@]} -eq 0 ] && return
  say "  Port status (${c_dim}· = still starting${c_reset}):"
  for e in "${INFRA_PORTS[@]}"; do
    local nm="${e%%:*}" pt="${e##*:}"
    if port_up "$pt"; then printf "    ${c_grn}●${c_reset} %-14s :%s\n" "$nm" "$pt"
    else                   printf "    ${c_dim}·${c_reset} %-14s :%s\n" "$nm" "$pt"; fi
  done
}

# --- commands ---------------------------------------------------------------
cmd_up() {
  preflight
  ensure_infra
  tmux has-session -t "$SESSION" 2>/dev/null || tmux new-session -d -s "$SESSION" -n _bootstrap -c "$ROOT"
  for s in "${SERVERS[@]}"; do start_window "${s%%|*}" "${s#*|}"; done
  tmux kill-window -t "$SESSION:_bootstrap" 2>/dev/null || true
  echo; ok "Stack starting in tmux session '$SESSION'."; echo
  port_check
  echo
  say "${c_dim}  Logs:   scripts/dev-local.sh logs <name>${c_reset}"
  say "${c_dim}  Attach: scripts/dev-local.sh attach   (Ctrl-b d to detach)${c_reset}"
  say "${c_dim}  Stop:   scripts/dev-local.sh down${c_reset}"
}

cmd_status() {
  if tmux has-session -t "$SESSION" 2>/dev/null; then
    info "tmux '$SESSION' windows:"
    tmux list-windows -t "$SESSION" -F '    #{window_index}: #{window_name}'
  else warn "session '$SESSION' not running"; fi
  echo; port_check
}

cmd_logs()    { tmux has-session -t "$SESSION" 2>/dev/null || die "session not running"; tmux capture-pane -p -S -400 -t "$SESSION:${1:?usage: logs <name>}"; }
cmd_restart() { tmux has-session -t "$SESSION" 2>/dev/null || die "session not running"
  local n="${1:?usage: restart <name>}"; tmux kill-window -t "$SESSION:$n" 2>/dev/null || true
  for s in "${SERVERS[@]}"; do [ "${s%%|*}" = "$n" ] && start_window "$n" "${s#*|}" && { ok "restarted $n"; return; }; done
  die "unknown window '$n'"; }
cmd_attach()  { tmux has-session -t "$SESSION" 2>/dev/null || die "not running — start with: dev-local.sh up"; tmux attach -t "$SESSION"; }
cmd_down() {
  tmux kill-session -t "$SESSION" 2>/dev/null && ok "dev servers stopped" || warn "no session '$SESSION'"
  if [ "${1:-}" = "--all" ]; then
    : # stop infra here, e.g. docker stop <PROJECT>-redis ; ( cd "$ROOT" && supabase stop )
    warn "infra teardown: fill in cmd_down --all for this repo"
  fi
}

case "${1:-up}" in
  up)      cmd_up ;;
  down)    cmd_down "${2:-}" ;;
  status)  cmd_status ;;
  logs)    cmd_logs "${2:-}" ;;
  restart) cmd_restart "${2:-}" ;;
  attach)  cmd_attach ;;
  -h|--help|help) awk 'NR==1{next} /^#/{sub(/^# ?/,"");print;next}{exit}' "${BASH_SOURCE[0]}" ;;
  *) die "unknown command '$1' (try: up|down|status|logs|restart|attach)" ;;
esac
