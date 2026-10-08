#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OBS_CONFIG_DIR="$HOME/.config/obs-studio"
TEMPLATE_DIR="$REPO_ROOT/.aistudio/obs-config"

echo "=== [Real OBS Setup & Launcher] ==="

# 0. Ensure Move Transition plugin and Xvfb are installed
if [ ! -f "/usr/lib/x86_64-linux-gnu/obs-plugins/move-transition.so" ] || [ ! -f "/usr/bin/Xvfb" ]; then
  echo "[Real OBS] Installing obs-move-transition and xvfb..."
  DEBIAN_FRONTEND=noninteractive apt-get update -qq && \
  DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends obs-move-transition xvfb || true
fi

# 0b. Ensure sample media assets exist
mkdir -p "/.aistudio/assets" "/uploads"
if [ ! -f "/.aistudio/assets/camera_backdrop.png" ]; then
  echo "[Real OBS] Generating sample media assets..."
  python3 "$REPO_ROOT/.aistudio/scripts/generate_obs_media.py" || true
  ffmpeg -y -f lavfi -i "testsrc=duration=4:size=1280x720:rate=30" -c:v libx264 -pix_fmt yuv420p -tune stillimage -preset ultrafast /.aistudio/assets/motion_backdrop.mp4 || true
  ffmpeg -y -f lavfi -i "smptebars=duration=4:size=1280x720:rate=30" -c:v libx264 -pix_fmt yuv420p -preset ultrafast /.aistudio/assets/speaker_cam_feed.mp4 || true
fi
cp -f /.aistudio/assets/* /uploads/ 2>/dev/null || true

# 1. Ensure directories exist
mkdir -p "$OBS_CONFIG_DIR/basic/profiles/Default"
mkdir -p "$OBS_CONFIG_DIR/basic/scenes"
mkdir -p "$OBS_CONFIG_DIR/plugin_config/obs-websocket"

# 2. Seed configuration files
if [ -d "$TEMPLATE_DIR" ]; then
  echo "[Real OBS] Seeding configuration from .aistudio/obs-config..."
  cp -f "$TEMPLATE_DIR/global.ini" "$OBS_CONFIG_DIR/global.ini"
  cp -f "$TEMPLATE_DIR/basic/profiles/Default/basic.ini" "$OBS_CONFIG_DIR/basic/profiles/Default/basic.ini"
  cp -f "$TEMPLATE_DIR/basic/scenes/Default.json" "$OBS_CONFIG_DIR/basic/scenes/Default.json"
  cp -f "$TEMPLATE_DIR/plugin_config/obs-websocket/config.json" "$OBS_CONFIG_DIR/plugin_config/obs-websocket/config.json"
fi

# 3. Ensure Virtual Display (Xvfb) is running on :99
if ! pgrep -x "Xvfb" > /dev/null; then
  echo "[Real OBS] Starting Xvfb on display :99..."
  Xvfb :99 -screen 0 1280x720x24 -ac -nolisten tcp > /tmp/xvfb.log 2>&1 &
  sleep 1
fi

export DISPLAY=:99
export LIBGL_ALWAYS_SOFTWARE=1
export MESA_LOADER_DRIVER_OVERRIDE=llvmpipe

# 4. Check if OBS WebSocket port 4455 is already responding
if (exec 3<>/dev/tcp/127.0.0.1/4455) 2>/dev/null; then
  exec 3<&-
  exec 3>&-
  echo "[Real OBS] OBS WebSocket v5 is already running and listening on 127.0.0.1:4455"
  exit 0
fi

# 5. Check if OBS is running but port not open yet; if stuck or dead, kill and restart
if pgrep -x "obs" > /dev/null; then
  echo "[Real OBS] OBS process found without open port 4455. Terminating stale process..."
  pkill -9 -f obs 2>/dev/null || true
  sleep 1
fi

echo "[Real OBS] Launching OBS Studio..."
obs --minimize-to-tray --disable-updater --disable-shutdown-check --websocket_debug --websocket_port 4455 > /tmp/obs.log 2>&1 &

# 6. Wait for OBS WebSocket port 4455
echo "[Real OBS] Waiting for OBS WebSocket server on 127.0.0.1:4455..."
MAX_WAIT=20
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
  if (exec 3<>/dev/tcp/127.0.0.1/4455) 2>/dev/null; then
    exec 3<&-
    exec 3>&-
    echo "[Real OBS] SUCCESS: OBS WebSocket v5 is online and listening on 127.0.0.1:4455"
    exit 0
  fi
  sleep 1
  WAITED=$((WAITED + 1))
done

echo "[Real OBS] WARNING: Port 4455 not open after ${MAX_WAIT}s. Checking /tmp/obs.log:"
tail -n 25 /tmp/obs.log || true
exit 1
