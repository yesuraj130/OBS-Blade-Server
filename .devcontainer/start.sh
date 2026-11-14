#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "========================================"
echo "Starting OBS Studio, VNC & Blade Server"
echo "========================================"

# 1. Ensure desktop, VNC & OBS are running
bash "$SCRIPT_DIR/scripts/setup-and-start-obs.sh"

# 2. Ensure Node dev server is running on port 3000
if ! pgrep -f "node.*server\.js" >/dev/null 2>&1; then
  echo "Starting Node dev server on port 3000..."
  cd "$ROOT_DIR"
  node server.js >/tmp/server.log 2>&1 &
  sleep 1
fi

echo "========================================"
echo "Services ready! OBS Blade running on port 3000"
echo "========================================"
