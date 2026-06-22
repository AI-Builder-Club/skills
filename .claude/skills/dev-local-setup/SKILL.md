---
name: dev-local-setup
description: >
  为任意代码库脚手架生成一条命令的 `dev-local` 启动器。调研
  仓库找出它的服务、端口和基础设施依赖，然后生成单个
  `scripts/dev-local.sh`（up/down/status/logs/restart），在一个 tmux 会话里跑起每个
  dev 服务器，外加一份简短的 skill 文档描述它。当有人说"设置
  dev-local"、"做一个一条命令的 dev 启动器"、"我想要一个脚本启动这个仓库"、
  "为本项目脚手架生成 dev-local"时使用。
user_invocable: true
---

# 为本代码库装配 `dev-local` 启动器

目标：产出**一个脚本**（`scripts/dev-local.sh`），人或 agent 运行它就能把整个
本地栈拉起来 —— 每个长期运行的 dev 服务器在自己的 tmux 窗口里，外加应用
需要的任何基础设施（DB、缓存、队列）—— 以及一份简短的 skill 文档，方便日后发现。

不要自己启动任何 dev 服务器。你是在*生成*启动器，不是
运行它。构建它、做语法检查，然后交给用户运行。

## 第 1 步 —— 调研仓库（不要猜）

在写任何东西之前先发现真实事实：

1. **包管理器与布局** —— 找 `pnpm-workspace.yaml` / `turbo.json` /
   `nx.json` / `lerna.json`（monorepo）或单个 `package.json`、`Cargo.toml`、
   `go.mod`、`pyproject.toml`、`Makefile`、`Procfile`、`docker-compose.yml`。
2. **要运行的服务** —— 每个带 `dev`/`start`/`serve` 脚本的 app/package，或
   每个 `Procfile` 行，或每个 `docker-compose` 服务。记下启动每个的精确命令
   （例如 `pnpm --filter <name> run dev`、`npm run dev`、`cargo run`、
   `uvicorn app:app --reload`）。
3. **端口** —— grep 配置和 `.env` 找每个服务绑定的端口
   （`PORT`、`listen(`、`server.port`、框架配置如 `rsbuild.config`、
   `vite.config`、`next.config`）。记录谁连谁。
4. **基础设施依赖** —— 后端是否需要 Postgres / Supabase / MySQL /
   Redis / Mongo / Kafka？查 `.env`（`.local`）、ORM 配置、`docker-compose`、
   以及连接字符串默认值。决定本地如何提供每一个
   （`supabase start`、一个 Docker 容器、一个已有的 `docker-compose`）。
5. **首次运行设置** —— migration、seed、codegen、`install`。记下命令
   但让它们留在默认 `up` 路径之外（提供一个单独子命令）。
6. **Env 文件** —— 确认有已提交的 `.env.example`/`.env`；绝不发明或
   打印密钥。脚本绝不能注入凭据。

写下一张小表：服务 → 命令 → 端口 → 依赖。这张表就是
脚本的规格。

## 第 2 步 —— 生成 `scripts/dev-local.sh`

改编 `assets/dev-local.template.sh`（与本 skill 同目录）里的骨架。填入发现的
服务、端口和基础设施。保持这些不变量：

- **一个 tmux 会话**，每个长期运行的服务器一个窗口。幂等：重跑
  `up` 时不动已有窗口，而不是重复创建。
- **Preflight**，缺工具时带安装提示快速失败
  （tmux、包管理器、基础设施需要时的 Docker）。
- **基础设施先于服务器拉起**，已在跑则复用。
- 子命令：`up`、`down`（以及 `down --all` 停基础设施）、`status`（窗口
  列表 + 端口检查）、`logs <name>`、`restart <name>`、`attach`，外加任何
  项目特定的一次性命令（`migrate`、`seed`）。
- 从脚本自身位置解析仓库根，这样从任意 cwd 都能工作。
- 脚本里不放密钥。`up` 结束时打印 URL 和端口检查。

如果仓库**没有基础设施需求**，整个删掉 Docker/DB 部分 —— 只保留
preflight + tmux 窗口。让脚本的复杂度匹配仓库；越简单越好。

然后：`chmod +x scripts/dev-local.sh` 并 `bash -n scripts/dev-local.sh` 做
语法检查。验证只读的 `status` 路径能干净运行。不要跑 `up`。

## 第 3 步 —— 写一份简短 skill 文档

创建 `.claude/skills/dev-local/SKILL.md`（或仓库的 skills 位置），包含：
frontmatter（`name: dev-local`、列出触发短语的 `description`）、
服务/端口表、前置条件、子命令列表，以及简短的
故障排查（端口占用、某窗口退出、基础设施未运行）。控制在一屏内 —— 它记录脚本，不重新解释脚本。

## 第 4 步 —— 交接

告诉用户确切的命令：`scripts/dev-local.sh up`，外加任何首次运行
步骤（`… migrate`）。列出 URL。记下首次 `up` 前他们必须安装或
启动的任何前置（例如 Docker Desktop）。

## 原则

- **发现，不要假设。** 端口和启动命令来自仓库，绝不
  仅凭约定。
- **幂等且可安全重跑。** 不重复服务器，不破坏基础设施。
- **尺寸合适。** 一个带 Postgres+Redis 的 3 服务 monorepo 需要完整
  骨架；单个 Vite 应用约 30 行。不要过度搭建。
- **绝不运行服务器或打印密钥。** 生成、语法检查、交接。
