# syntax=docker/dockerfile:1

# ---- Base: Node 22 (engines require >=20) with pnpm via corepack ----
FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable

# ---- Builder: full install (incl. dev deps) + compile ----
# --ignore-scripts skips the `prepare` lifecycle (which would re-run build + husky).
# We build explicitly below. This avoids the previous sed hack that corrupted
# package.json (deleting the trailing "prepare" key left an invalid trailing comma).
FROM base AS builder
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY . .
RUN pnpm run build

# ---- Prod deps: production-only node_modules for the runtime image ----
FROM base AS prod-deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile --ignore-scripts

# ---- Runner: minimal runtime image ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/build ./build
# docs/ holds the OAuth scope JSON files read at runtime.
COPY --from=builder /app/docs ./docs
# public/icons are advertised in serverInfo (MCP client tray icons).
COPY --from=builder /app/public/icons ./public/icons
COPY package.json ./

# HTTP transport (src/serverHttp.ts) listens here; the default STDIO entry does not.
EXPOSE 3000

# Default: STDIO transport (Claude Desktop / MCP clients spawn this over docker run -i).
CMD ["node", "build/index.js"]
