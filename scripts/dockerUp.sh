#!/usr/bin/env bash
# Recreate the local ebay-mcp container with credentials resolved from 1Password.
#
# Usage: scripts/dockerUp.sh            (after `docker build -t ebay-mcp:latest .`)
# Env:   OP_ACCOUNT       1Password account (default marlermedia.1password.com)
#        EBAY_MCP_PHOTOS  host folder mounted read-only at /photos (default ~/Nextcloud/eBay)
#        EBAY_MCP_BIND    host address the port is published on (default 0.0.0.0, the whole LAN;
#                         127.0.0.1 keeps it local). Clients send "Authorization: Bearer <MCP_AUTH_TOKEN>".
set -euo pipefail
cd "$(dirname "$0")/.."

photos_dir="${EBAY_MCP_PHOTOS:-$HOME/Nextcloud/eBay}"
bind_address="${EBAY_MCP_BIND:-0.0.0.0}"

# op run resolves the references before docker starts, so a locked or failed 1Password
# lookup leaves the existing container untouched.
op run --account "${OP_ACCOUNT:-marlermedia.1password.com}" --env-file scripts/opSecrets.env -- \
  sh -c '
    docker rm -f ebay-mcp >/dev/null 2>&1 || true
    docker run -d --name ebay-mcp --restart unless-stopped -p "$2:3000:3000" \
      -e MCP_AUTH_TOKEN -e EBAY_CLIENT_ID -e EBAY_CLIENT_SECRET -e EBAY_REDIRECT_URI \
      -e EBAY_USER_REFRESH_TOKEN -e EBAY_ENVIRONMENT -e EBAY_MCP_UI \
      -e MCP_HOST=0.0.0.0 -e OAUTH_ENABLED=false -e EBAY_MCP_MEDIA_ROOT=/photos \
      -v "$1:/photos:ro" \
      ebay-mcp:latest node build/serverHttp.js
  ' sh "$photos_dir" "$bind_address"
