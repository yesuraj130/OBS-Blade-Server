#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export DEBIAN_FRONTEND=noninteractive

echo "========================================"
echo "OBS Studio 29 + Move Transition + VNC Environment Setup"
echo "========================================"

bash "$SCRIPT_DIR/scripts/setup-and-start-obs.sh"

echo
echo "========================================"
echo "Environment setup complete!"
echo "========================================"
