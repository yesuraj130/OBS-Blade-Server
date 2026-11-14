#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_OBS_CFG="$(cd "$SCRIPT_DIR/.." && pwd)/obs-studio-config"

DISPLAY_NUM="${DISPLAY_NUM:-1}"
VNC_PORT=$((5900 + DISPLAY_NUM))
NOVNC_PORT="${NOVNC_PORT:-6080}"
VNC_PASSWORD="${VNC_PASSWORD:-vncpassword}"
RESTART_ALL="${1:-}"

SUDO=""
if command -v sudo >/dev/null 2>&1 && [ "$(id -u)" -ne 0 ]; then
  SUDO="sudo"
fi

echo "[Setup] Checking required desktop, VNC, OBS Studio 29, SSH & build tools..."
MISSING_PKGS=0
for bin in obs Xtigervnc vncpasswd websockify openbox xterm ssh dbus-launch pulseaudio wmctrl autocutsel xrandr gcc curl; do
  if ! command -v "$bin" >/dev/null 2>&1; then
    MISSING_PKGS=1
    break
  fi
done
if [ ! -f /usr/share/novnc/core/rfb.js ] || [ ! -f /usr/include/obs/obs.h ]; then
  MISSING_PKGS=1
fi

if [ "$MISSING_PKGS" -eq 1 ]; then
  echo "[Setup] Installing Debian Bookworm packages (OBS Studio 29, TigerVNC, noVNC, Websockify, Openbox, OpenSSH, libobs-dev)..."
  export DEBIAN_FRONTEND=noninteractive
  $SUDO apt-get update -qq
  $SUDO apt-get install -y --no-install-recommends \
    -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold" \
    obs-studio libobs-dev \
    tigervnc-standalone-server tigervnc-tools \
    novnc websockify \
    openbox xterm wmctrl autocutsel x11-xserver-utils \
    openssh-client dbus-x11 pulseaudio \
    gcc libc6-dev curl ca-certificates tar gzip
else
  echo "[Setup] Core packages already installed."
fi

# Patch noVNC for seamless clipboard sync
bash "$SCRIPT_DIR/patch-novnc.sh" || true

# Detect installed OBS version and install matching Move Transition plugin
OBS_RAW_VER="$(obs --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -n1 || echo "29.0.2")"
OBS_MAJOR="${OBS_RAW_VER%%.*}"
echo "[Move Transition] Detected OBS Studio version: ${OBS_RAW_VER} (major: ${OBS_MAJOR})"

MOVE_PLUGIN_SYS="/usr/lib/x86_64-linux-gnu/obs-plugins/move-transition.so"
MOVE_PLUGIN_USER="/root/.config/obs-studio/plugins/move-transition/bin/64bit/move-transition.so"

if [ ! -f "$MOVE_PLUGIN_SYS" ] && [ ! -f "$MOVE_PLUGIN_USER" ]; then
  if [ "${OBS_MAJOR:-29}" -ge 31 ] 2>/dev/null; then
    echo "[Move Transition] Installing Move Transition 3.2.1 (.deb) for OBS ${OBS_RAW_VER}..."
    curl -fsSL -o /tmp/move-transition.deb "https://github.com/exeldro/obs-move-transition/releases/download/3.2.1/move-transition-3.2.1-x86_64-linux-gnu.deb"
    $SUDO dpkg -i /tmp/move-transition.deb || true
    rm -f /tmp/move-transition.deb
  else
    MOVE_VER="2.9.8"
    echo "[Move Transition] Building & installing Move Transition ${MOVE_VER} matched for OBS ${OBS_RAW_VER}..."
    WORK_DIR="/tmp/build-move-transition"
    rm -rf "$WORK_DIR"
    mkdir -p "$WORK_DIR"
    curl -fsSL "https://github.com/exeldro/obs-move-transition/archive/refs/tags/${MOVE_VER}.tar.gz" -o "$WORK_DIR/src.tar.gz"
    tar -xzf "$WORK_DIR/src.tar.gz" -C "$WORK_DIR"
    SRC_DIR="$WORK_DIR/obs-move-transition-${MOVE_VER}"

    # Generate version.h
    cat > "$SRC_DIR/version.h" <<EOF
#pragma once
#define PROJECT_VERSION "${MOVE_VER}"
#define PROJECT_VERSION_MAJOR 2
#define PROJECT_VERSION_MINOR 9
#define PROJECT_VERSION_PATCH 8
EOF

    # Ensure obs-frontend-api.h is present (Debian libobs-dev sometimes omits UI/obs-frontend-api.h)
    INC_EXTRA=""
    if [ ! -f /usr/include/obs/obs-frontend-api.h ]; then
      echo "[Move Transition] Fetching obs-frontend-api.h for OBS ${OBS_RAW_VER}..."
      mkdir -p "$WORK_DIR/extra_inc"
      curl -fsSL "https://raw.githubusercontent.com/obsproject/obs-studio/29.0.2/UI/obs-frontend-api/obs-frontend-api.h" -o "$WORK_DIR/extra_inc/obs-frontend-api.h"
      INC_EXTRA="-I$WORK_DIR/extra_inc"
    fi

    # Locate libobs and libobs-frontend-api shared libraries
    LIBOBS_FLAG="-lobs"
    FRONTEND_LIB="$(find /usr/lib /usr/lib/x86_64-linux-gnu -maxdepth 2 -name 'libobs-frontend-api.so*' 2>/dev/null | head -n1 || true)"
    if [ -z "$FRONTEND_LIB" ]; then
      echo "[Move Transition] Warning: libobs-frontend-api.so not found via standard paths."
    fi

    echo "[Move Transition] Compiling move-transition.so..."
    gcc -shared -fPIC -O2 \
      -I/usr/include/obs $INC_EXTRA -I"$SRC_DIR" \
      "$SRC_DIR/move-transition.c" \
      "$SRC_DIR/move-transition-override-filter.c" \
      "$SRC_DIR/move-filter.c" \
      "$SRC_DIR/move-source-filter.c" \
      "$SRC_DIR/move-value-filter.c" \
      "$SRC_DIR/move-action-filter.c" \
      "$SRC_DIR/audio-move.c" \
      "$SRC_DIR/easing.c" \
      $LIBOBS_FLAG ${FRONTEND_LIB:+"$FRONTEND_LIB"} -lm \
      -o "$WORK_DIR/move-transition.so"

    $SUDO mkdir -p /usr/lib/x86_64-linux-gnu/obs-plugins /usr/share/obs/obs-plugins/move-transition
    $SUDO cp -f "$WORK_DIR/move-transition.so" "$MOVE_PLUGIN_SYS"
    $SUDO chmod 755 "$MOVE_PLUGIN_SYS"
    if [ -d "$SRC_DIR/data/locale" ]; then
      $SUDO cp -rf "$SRC_DIR/data/locale" /usr/share/obs/obs-plugins/move-transition/
    fi
    rm -rf /root/.config/obs-studio/plugins/move-transition

    rm -rf "$WORK_DIR"
    echo "[Move Transition] Move Transition ${MOVE_VER} installed successfully."
  fi
else
  echo "[Move Transition] Move Transition plugin already installed."
fi

# Configure initial OBS settings, scenes, and assets
mkdir -p /root/.config/obs-studio/basic/scenes \
         /root/.config/obs-studio/basic/profiles/Untitled \
         /root/.config/obs-studio/plugin_config/obs-websocket \
         /root/.config/obs-studio/assets

if [ -d "$REPO_OBS_CFG" ]; then
  echo "[OBS Config] Syncing 640x360 profile, multi-scene setup, WebSocket v5, and animated GIF assets..."
  # Always ensure assets are available
  if [ -d "$REPO_OBS_CFG/assets" ]; then
    cp -rf "$REPO_OBS_CFG/assets"/* /root/.config/obs-studio/assets/ 2>/dev/null || true
  fi

  # If fresh setup, copy all default configs
  if [ ! -f /root/.config/obs-studio/global.ini ]; then
    cp -rf "$REPO_OBS_CFG"/* /root/.config/obs-studio/ 2>/dev/null || true
  fi

  # Always enforce WebSocket config (port 4455, no auth)
  if [ -f "$REPO_OBS_CFG/plugin_config/obs-websocket/config.json" ]; then
    cp -f "$REPO_OBS_CFG/plugin_config/obs-websocket/config.json" /root/.config/obs-studio/plugin_config/obs-websocket/config.json 2>/dev/null || true
  fi

  # Ensure default profile is 640x360
  if [ -f "$REPO_OBS_CFG/basic/profiles/Untitled/basic.ini" ]; then
    if [ ! -f /root/.config/obs-studio/basic/profiles/Untitled/basic.ini ] || grep -q "BaseCX=1280" /root/.config/obs-studio/basic/profiles/Untitled/basic.ini 2>/dev/null; then
      cp -f "$REPO_OBS_CFG/basic/profiles/Untitled/basic.ini" /root/.config/obs-studio/basic/profiles/Untitled/basic.ini 2>/dev/null || true
    fi
  fi

  # Ensure multi-scene starter is present
  if [ -f "$REPO_OBS_CFG/basic/scenes/Untitled.json" ]; then
    if [ ! -f /root/.config/obs-studio/basic/scenes/Untitled.json ] || ! grep -q "Live Stream" /root/.config/obs-studio/basic/scenes/Untitled.json 2>/dev/null; then
      cp -f "$REPO_OBS_CFG/basic/scenes/Untitled.json" /root/.config/obs-studio/basic/scenes/Untitled.json 2>/dev/null || true
    fi
  fi
fi

# Configure VNC password & lightweight Openbox xstartup
mkdir -p /root/.vnc /root/.config/tigervnc /root/.config/openbox
chmod 700 /root/.vnc

cat > /root/.vnc/xstartup <<'EOF'
#!/bin/sh
unset SESSION_MANAGER
unset DBUS_SESSION_BUS_ADDRESS
xsetroot -solid "#0b1120" >/dev/null 2>&1 || true
autocutsel -fork >/dev/null 2>&1 || true
autocutsel -selection PRIMARY -fork >/dev/null 2>&1 || true
exec dbus-launch --exit-with-session openbox-session
EOF
chmod +x /root/.vnc/xstartup

echo "$VNC_PASSWORD" | vncpasswd -f > /root/.vnc/passwd 2>/dev/null || true
chmod 600 /root/.vnc/passwd 2>/dev/null || true
cp -f /root/.vnc/passwd /root/.config/tigervnc/passwd 2>/dev/null || true
chmod 600 /root/.config/tigervnc/passwd 2>/dev/null || true

# Openbox right-click menu shortcut for OBS Studio and Terminal
cat > /root/.config/openbox/menu.xml <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<openbox_menu xmlns="http://openbox.org/3.4/menu">
  <menu id="root-menu" label="OBS Desktop">
    <item label="Launch OBS Studio">
      <action name="Execute"><command>env LIBGL_ALWAYS_SOFTWARE=1 QT_X11_NO_MITSHM=1 obs --disable-shutdown-check</command></action>
    </item>
    <item label="Terminal">
      <action name="Execute"><command>xterm</command></action>
    </item>
    <separator />
    <item label="Reconfigure Openbox">
      <action name="Reconfigure" />
    </item>
  </menu>
</openbox_menu>
EOF

# Start / Restart services
if [ "$RESTART_ALL" = "--restart-all" ]; then
  echo "[Desktop] Stopping existing desktop, VNC, websockify & OBS processes..."
  pkill -9 -x obs 2>/dev/null || true
  pkill -9 -x websockify 2>/dev/null || true
  pkill -9 -x openbox 2>/dev/null || true
  pkill -9 -x Xtigervnc 2>/dev/null || true
  rm -rf "/tmp/.X${DISPLAY_NUM}-lock" "/tmp/.X11-unix/X${DISPLAY_NUM}" /root/.config/obs-studio/.sentinel 2>/dev/null || true
  sleep 0.5
fi

# Start TigerVNC if not running
if ! pgrep -x Xtigervnc >/dev/null 2>&1; then
  echo "[VNC] Starting Xtigervnc on :${DISPLAY_NUM} (port ${VNC_PORT})..."
  rm -rf "/tmp/.X${DISPLAY_NUM}-lock" "/tmp/.X11-unix/X${DISPLAY_NUM}" 2>/dev/null || true
  setsid Xtigervnc ":${DISPLAY_NUM}" \
    -desktop "OBS Studio Desktop" \
    -geometry 1280x800 \
    -depth 24 \
    -rfbport "${VNC_PORT}" \
    -rfbauth /root/.vnc/passwd \
    -SecurityTypes VncAuth \
    -AlwaysShared=1 \
    -AcceptSetDesktopSize=1 \
    -localhost=0 \
    >/tmp/vnc.log 2>&1 < /dev/null &
  sleep 1
fi

# Ensure Openbox + clipboard sync are running on :1
if ! pgrep -x openbox >/dev/null 2>&1; then
  echo "[Desktop] Starting Openbox window manager & clipboard sync on :${DISPLAY_NUM}..."
  DISPLAY=":${DISPLAY_NUM}" setsid /root/.vnc/xstartup >/tmp/openbox.log 2>&1 < /dev/null &
  sleep 0.8
fi

# Add custom portrait xrandr modes on VNC-0
DISPLAY=":${DISPLAY_NUM}" xrandr --newmode "720x1280_60.00" 74.50 720 760 832 944 1280 1283 1293 1316 -hsync +vsync 2>/dev/null || true
DISPLAY=":${DISPLAY_NUM}" xrandr --addmode VNC-0 "720x1280_60.00" 2>/dev/null || true
DISPLAY=":${DISPLAY_NUM}" xrandr --newmode "1080x1920_60.00" 173.00 1080 1152 1264 1448 1920 1923 1933 1968 -hsync +vsync 2>/dev/null || true
DISPLAY=":${DISPLAY_NUM}" xrandr --addmode VNC-0 "1080x1920_60.00" 2>/dev/null || true

# Start PulseAudio dummy audio sink if not running
if ! pgrep -x pulseaudio >/dev/null 2>&1; then
  pulseaudio --start --exit-idle-time=-1 >/dev/null 2>&1 || true
  pactl load-module module-null-sink sink_name=obs_virtual_out >/dev/null 2>&1 || true
fi

# Start websockify / noVNC on 6080 -> 127.0.0.1:5901
if ! pgrep -f "websockify.*${NOVNC_PORT}" >/dev/null 2>&1; then
  echo "[noVNC] Starting websockify on port ${NOVNC_PORT} -> 127.0.0.1:${VNC_PORT}..."
  setsid websockify --web=/usr/share/novnc/ "${NOVNC_PORT}" "127.0.0.1:${VNC_PORT}" >/tmp/websockify.log 2>&1 < /dev/null &
  sleep 0.8
fi

# Start OBS Studio 29 on :1 with software OpenGL
if ! pgrep -x obs >/dev/null 2>&1; then
  echo "[OBS] Launching OBS Studio ${OBS_RAW_VER} (WebSocket v5 :4455 + Move Transition)..."
  rm -rf /root/.config/obs-studio/.sentinel 2>/dev/null || true
  DISPLAY=":${DISPLAY_NUM}" LIBGL_ALWAYS_SOFTWARE=1 QT_X11_NO_MITSHM=1 \
    setsid obs --disable-shutdown-check >/tmp/obs.log 2>&1 < /dev/null &
  sleep 2
  DISPLAY=":${DISPLAY_NUM}" wmctrl -r "OBS" -b add,maximized_vert,maximized_horz 2>/dev/null || true
else
  echo "[OBS] OBS Studio already running."
fi

echo "[Setup] All OBS & VNC services initialized."
