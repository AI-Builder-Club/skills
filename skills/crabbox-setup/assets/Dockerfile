# crabbox + Daytona snapshot image — bakes the SLOW, STATIC tools the box needs.
# Your APP CODE is NOT copied here; crabbox rsyncs your working tree at run time,
# so the build context is just devbox/.
#
# Build (from repo root, after `daytona login`):
#   daytona snapshot create <NAME> --dockerfile devbox/Dockerfile --context devbox \
#     --cpu 4 --memory 8 --disk 10 --region us
# Then point .crabbox.yaml at it: daytona.snapshot: <NAME>

# EDIT: base image for your runtime (python:3.12-bookworm, golang:1.22-bookworm, …)
FROM node:22-bookworm

# Base tools. (iptables only needed if you run docker-in-docker below.)
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl gnupg git jq lsof procps sudo iptables \
 && rm -rf /var/lib/apt/lists/*

# ─── docker-in-docker (KEEP only if the box runs containers: Postgres/Supabase/Redis/…) ───
# Docker PINNED to 27.0.3 via the static tarball. DO NOT use latest / docker:dind:
# docker 28+ defaults to the containerd overlayfs snapshotter, which Daytona's
# kernel rejects ("overlay mount … no such file or directory"). 27.x keeps the
# classic overlay2 graphdriver, which works. Tarball bundles dockerd+containerd+runc.
ARG DOCKER_VERSION=27.0.3
RUN curl -fsSL "https://download.docker.com/linux/static/stable/x86_64/docker-${DOCKER_VERSION}.tgz" -o /tmp/docker.tgz \
 && tar -xzf /tmp/docker.tgz -C /usr/local/bin --strip-components=1 \
 && rm /tmp/docker.tgz \
 && dockerd --version && docker --version
# let the (non-root) sandbox user start dockerd without a password
RUN echo 'ALL ALL=(root) NOPASSWD: /usr/local/bin/dockerd, /usr/bin/dockerd, /usr/sbin/dockerd' > /etc/sudoers.d/dockerd \
 && chmod 0440 /etc/sudoers.d/dockerd
# ─── end docker-in-docker ───

# EDIT: package manager — pin to your lockfile (drop if not node)
RUN corepack enable && corepack prepare pnpm@10.14.0 --activate

# EDIT/DROP: service CLI your stack needs, e.g. the Supabase CLI:
# ARG SUPABASE_CLI_VERSION=v2.105.0
# RUN curl -fsSL "https://github.com/supabase/cli/releases/download/${SUPABASE_CLI_VERSION}/supabase_linux_amd64.tar.gz" \
#       | tar xz -C /usr/local/bin && supabase --version

# ─── browser e2e (KEEP only if you drive the UI / take screenshots+video) ───
# Google Chrome = the 'chrome' channel playwright-cli uses by default (NOT chromium).
# PIN both: a snapshot must be reproducible — @latest means a rebuild months from now
# bakes a different (possibly-incompatible) CLI than the one you validated against.
ARG PLAYWRIGHT_VERSION=1.49.1
ARG PLAYWRIGHT_CLI_VERSION=0.1.14
RUN npx --yes playwright@${PLAYWRIGHT_VERSION} install --with-deps chrome \
 && npm install -g @playwright/cli@${PLAYWRIGHT_CLI_VERSION} \
 && playwright-cli --version
# playwright's bundled ffmpeg — required for `playwright-cli video-start`.
RUN node "$(npm root -g)/@playwright/cli/node_modules/playwright-core/cli.js" install ffmpeg
# ─── end browser e2e ───

# OPTIONAL (advanced): pre-baked service images to skip the runtime `docker pull`.
# Build the tarball locally (docker pull --platform linux/amd64 … ; docker save | gzip
# > devbox/svc-images.tar.gz) then uncomment — and `docker load` it in setup.sh.
#   COPY svc-images.tar.gz /opt/svc-images.tar.gz
