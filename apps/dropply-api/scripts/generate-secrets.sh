#!/usr/bin/env bash
#
# Generate TOTP_SECRETS and JWT_SECRET for dropply-api.
# Usage: ./scripts/generate-secrets.sh [name]
#   name  - label for the TOTP secret (default: "default")
#
# Output includes:
#   - Environment variables ready to paste
#   - QR code for scanning with authenticator apps (if qrencode is installed)

set -euo pipefail

NAME="${1:-default}"

# --- Generate JWT_SECRET (32 bytes, base64) ---
JWT_SECRET=$(openssl rand -base64 32)

# --- Generate TOTP secret (20 bytes, base32, no padding) ---
# RFC 4648 base32 alphabet: A-Z 2-7
TOTP_RAW=$(openssl rand 20)
TOTP_SECRET=$(echo -n "$TOTP_RAW" | basenc --base32 | tr -d '=')

# --- Output ---
echo "============================================"
echo "  Dropply API Secrets"
echo "============================================"
echo ""
echo "# Paste these into .env or wrangler.jsonc:"
echo ""
echo "REQUIRE_TOTP=true"
echo "JWT_SECRET=${JWT_SECRET}"
echo "TOTP_SECRETS=${NAME}:${TOTP_SECRET}"
echo ""
echo "--------------------------------------------"
echo "  TOTP Setup (Authenticator App)"
echo "--------------------------------------------"
echo ""
echo "Secret (manual entry): ${TOTP_SECRET}"
echo "Account name:          ${NAME}"
echo "Type:                  Time-based (TOTP)"
echo "Algorithm:             SHA1"
echo "Digits:                6"
echo "Period:                30s"

# Generate otpauth URI
OTPAUTH_URI="otpauth://totp/Dropply:${NAME}?secret=${TOTP_SECRET}&issuer=Dropply&algorithm=SHA1&digits=6&period=30"

echo ""
echo "otpauth URI:"
echo "${OTPAUTH_URI}"

# Try to show QR code in terminal
if command -v qrencode &>/dev/null; then
  echo ""
  echo "Scan this QR code with your authenticator app:"
  echo ""
  qrencode -t ANSIUTF8 "${OTPAUTH_URI}"
else
  echo ""
  echo "Tip: Install qrencode to display a scannable QR code:"
  echo "  brew install qrencode    # macOS"
  echo "  apt install qrencode     # Debian/Ubuntu"
fi
