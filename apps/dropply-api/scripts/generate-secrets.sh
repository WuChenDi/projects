#!/usr/bin/env bash
#
# Generate JWT_SECRET and SHARE_PASSWORD for dropply-api.
# Usage: ./scripts/generate-secrets.sh
#
# Paste the output into `.dev.vars` (local) or set via `wrangler secret put`
# (prod). SHARE_PASSWORD is optional — leave it unset to keep sharing open.

set -euo pipefail

# --- JWT_SECRET (32 bytes, base64) — HS256 signing key for chest/upload JWTs ---
JWT_SECRET=$(openssl rand -base64 32)

# --- SHARE_PASSWORD (16 bytes, base64url) — optional share-creation gate ---
SHARE_PASSWORD=$(openssl rand -base64 16 | tr '+/' '-_' | tr -d '=')

echo "============================================"
echo "  Dropply API Secrets"
echo "============================================"
echo ""
echo "# Paste into .dev.vars (local) or set with:"
echo "#   wrangler secret put JWT_SECRET"
echo "#   wrangler secret put SHARE_PASSWORD   # optional"
echo ""
echo "JWT_SECRET=${JWT_SECRET}"
echo "SHARE_PASSWORD=${SHARE_PASSWORD}"
