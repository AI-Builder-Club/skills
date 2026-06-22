#!/usr/bin/env bash
#
# dev-local.sh —— 一条命令把本项目的本地开发栈拉起来。
#
# 模板：用从仓库发现的值替换每个 <PLACEHOLDER>，
# 删除你不需要的部分（例如没有 DB/缓存依赖时删掉整个 infra 段），
# 并为每个长期运行的 dev 服务器加一个窗口。
#
# 用法:
#   scripts/dev-local.sh up            # 启动 infra + 所有 dev 服务器（幂等）
#   scripts/dev-local.sh down          # 停止 dev 服务器（保留 infra 运行）
#   scripts/dev-local.sh down --all    # 同时停止 infra
#   scripts/dev-local.sh status        # 窗口列表 + 端口检查
#   scripts/dev-local.sh logs <name>   # tail 某个窗口
#   scripts/dev-local.sh restart <name>
#   scripts/dev-local.sh attach        # 接入 tmux 会话
#
set -euo pipefail

# --- 配置 -----------------------------------------------------------------
SESSION="<PROJECT>-dev"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"   # 仓库根（脚本在 scripts/ 下）

# 服务名 -> 端口，用于端口检查。按发现结果填入。
#   例如 WEB_PORT=3000 ; API_PORT=4000
# <PORTS HERE>

# 长期运行的服务器："窗口名|启动命令"。每个服务一个。
SERVERS=(
  # "web|pnpm --filter <web> run dev"
  # "api|pnpm --filter <api> run dev"
)

# 要在 `status` 中验证的 infra 容器/端口（名:端口）。无则留空。
INFRA_PORTS=(
  # "postgres:5432"
  # "redis:6379"
)

# --- 美化输出 -------------------------------------------------------------
c_reset=$'\033[0m'; c_dim=$'\033[2m'; c_grn=$'\033[32m'; c_ylw=$'\033[33m'; c_red=$'\033[31m'; c_cyn=$'\033[36m'
say()  { printf "%s\n" "$*"; }
info() { printf "${c_cyn}▸ %s${c_reset}\n" "$*"; }
ok()   { printf "${c_grn}✓ %s${c_reset}\n" "$*"; }
warn() { printf "${c_ylw}! %s${c_reset}\n" "$*"; }
die()  { printf "${c_red}✗ %s${c_reset}\n" "$*" >&2; exit 1; }
port_up() { lsof -ti :"$1" -sTCP:LISTEN >/dev/null 2>&1; }

# --- preflight --------------------------------------------------------------
preflight() {
  command -v tmux >/dev/null 2>&1 || die "未找到 tmux。安装: brew install tmux"
  command -v <PKG_MANAGER> >/dev/null 2>&1 || die "未找到 <PKG_MANAGER>。"
  # 如果 infra 需要 Docker，取消注释:
  # command -v docker >/dev/null 2>&1 || die "未找到 docker。"
  # docker info >/dev/null 2>&1 || die "Docker 守护进程未运行。启动 Docker Desktop。"
  [ -d "$ROOT/node_modules" ] || die "依赖未安装。运行: <PKG_MANAGER> install"
}

# --- infra（若仓库无 infra 依赖，整段删除） --------
ensure_infra() {
  # 示例：端口空闲时启动一个 Redis 容器。
  # if ! port_up 6379; then
  #   docker start <PROJECT>-redis >/dev/null 2>&1 \
  #     || docker run -d --name <PROJECT>-redis -p 6379:6379 redis:7-alpine >/dev/null
  #   ok "Redis 已在 :6379 启动"
  # fi
  # 示例：本地 Supabase / docker-compose。
  # ( cd "$ROOT" && supabase start )           # 或: docker compose up -d
  :
}

# --- tmux 辅助 -----------------------------------------------------------
start_window() {  # 幂等：窗口已存在则跳过
  local name="$1" cmd="$2"
  if tmux list-windows -t "$SESSION" -F '#{window_name}' 2>/dev/null | grep -qx "$name"; then
    warn "窗口 '$name' 已存在 —— 不动它"; return
  fi
  tmux new-window -t "$SESSION" -n "$name" -c "$ROOT"
  tmux send-keys -t "$SESSION:$name" "$cmd" C-m
}

port_check() {
  [ ${#INFRA_PORTS[@]} -eq 0 ] && return
  say "  端口状态（${c_dim}· = 仍在启动${c_reset}）:"
  for e in "${INFRA_PORTS[@]}"; do
    local nm="${e%%:*}" pt="${e##*:}"
    if port_up "$pt"; then printf "    ${c_grn}●${c_reset} %-14s :%s\n" "$nm" "$pt"
    else                   printf "    ${c_dim}·${c_reset} %-14s :%s\n" "$nm" "$pt"; fi
  done
}

# --- 命令 ---------------------------------------------------------------
cmd_up() {
  preflight
  ensure_infra
  tmux has-session -t "$SESSION" 2>/dev/null || tmux new-session -d -s "$SESSION" -n _bootstrap -c "$ROOT"
  for s in "${SERVERS[@]}"; do start_window "${s%%|*}" "${s#*|}"; done
  tmux kill-window -t "$SESSION:_bootstrap" 2>/dev/null || true
  echo; ok "栈正在 tmux 会话 '$SESSION' 中启动。"; echo
  port_check
  echo
  say "${c_dim}  日志:   scripts/dev-local.sh logs <name>${c_reset}"
  say "${c_dim}  接入:   scripts/dev-local.sh attach   （Ctrl-b d 脱离）${c_reset}"
  say "${c_dim}  停止:   scripts/dev-local.sh down${c_reset}"
}

cmd_status() {
  if tmux has-session -t "$SESSION" 2>/dev/null; then
    info "tmux '$SESSION' 窗口:"
    tmux list-windows -t "$SESSION" -F '    #{window_index}: #{window_name}'
  else warn "会话 '$SESSION' 未运行"; fi
  echo; port_check
}

cmd_logs()    { tmux has-session -t "$SESSION" 2>/dev/null || die "会话未运行"; tmux capture-pane -p -S -400 -t "$SESSION:${1:?用法: logs <name>}"; }
cmd_restart() { tmux has-session -t "$SESSION" 2>/dev/null || die "会话未运行"
  local n="${1:?用法: restart <name>}"; tmux kill-window -t "$SESSION:$n" 2>/dev/null || true
  for s in "${SERVERS[@]}"; do [ "${s%%|*}" = "$n" ] && start_window "$n" "${s#*|}" && { ok "已重启 $n"; return; }; done
  die "未知窗口 '$n'"; }
cmd_attach()  { tmux has-session -t "$SESSION" 2>/dev/null || die "未运行 —— 用: dev-local.sh up 启动"; tmux attach -t "$SESSION"; }
cmd_down() {
  tmux kill-session -t "$SESSION" 2>/dev/null && ok "dev 服务器已停止" || warn "无会话 '$SESSION'"
  if [ "${1:-}" = "--all" ]; then
    : # 在这里停 infra，例如 docker stop <PROJECT>-redis ; ( cd "$ROOT" && supabase stop )
    warn "infra 拆除: 为本仓库填好 cmd_down --all"
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
  *) die "未知命令 '$1'（可选: up|down|status|logs|restart|attach）" ;;
esac
