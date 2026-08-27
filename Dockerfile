# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.14.0

# Copy package manifests first for better layer caching
COPY package.json pnpm-lock.yaml* ./

# Install all dependencies (ignore lifecycle scripts — no prepare/husky needed in the image)
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy source and build
COPY . .
RUN pnpm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.14.0

# Copy package manifests
COPY package.json pnpm-lock.yaml* ./

# Install only production dependencies (ignore lifecycle scripts)
RUN pnpm install --prod --frozen-lockfile --ignore-scripts

# Copy built application and runtime assets from builder
COPY --from=builder /app/build ./build
# Scopes / docs referenced at runtime
COPY --from=builder /app/docs ./docs
# Icon assets served by the HTTP transport at /icons
COPY --from=builder /app/public ./public

# Default HTTP port (only relevant when overriding CMD to run the HTTP transport
# for a cloud deploy; Railway and similar platforms inject PORT and httpTransport
# binds 0.0.0.0 automatically when MCP_HOST is unset)
EXPOSE 3000

# Default to the STDIO transport: this image is run as `docker run -i ... ebay-mcp`
# and spoken to over stdin/stdout by a local MCP client (Claude Desktop). For a
# cloud HTTP deploy, override with: CMD ["node", "build/serverHttp.js"].
CMD ["node", "build/index.js"]
