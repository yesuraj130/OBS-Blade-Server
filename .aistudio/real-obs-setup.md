# Deterministic Real OBS Studio & WebSocket v5 Setup Guide

This document describes how Real OBS Studio (v29+) is installed, provisioned, and connected in this environment so any future chat, run, or container restart can deterministically reproduce the identical state.

---

## 1. System Requirements & APT Packages

Real OBS runs headlessly inside the Debian 12 container with software OpenGL rendering:

```bash
apt-get update -qq
apt-get install -y --no-install-recommends \
  obs-studio \
  obs-move-transition \
  xvfb \
  libgl1-mesa-dri \
  mesa-utils \
  alsa-utils
```

Packages:
- `obs-studio`: The official OBS Studio build (v29.0.2 in Debian Bookworm), including the native `obs-websocket` v5 plugin.
- `obs-move-transition`: The official Move Transition plugin by Exeldro (`move_transition`, `move_source_filter`, `move_value_filter`).
- `xvfb`: X Virtual Framebuffer (enables running graphical applications headless without a physical monitor).
- `libgl1-mesa-dri`: Software Mesa / llvmpipe OpenGL driver for graphics pipeline initialization.
- `alsa-utils`: Dummy ALSA audio devices.

---

## 2. Seed Configuration Directory Structure

The OBS configuration is seeded into `$HOME/.config/obs-studio/`:

```
$HOME/.config/obs-studio/
├── global.ini                                 # General settings & default profile selection
├── basic/
│   ├── profiles/
│   │   └── Default/
│   │       └── basic.ini                      # Video (1280x720 30fps) & simple encoder setup
│   └── scenes/
│       └── Default.json                       # Default scene collection with initial sources
└── plugin_config/
    └── obs-websocket/
        └── config.json                        # WebSocket server port 4455, authentication config
```

Canonical template copies are stored in git under `.aistudio/obs-config/`:
- `.aistudio/obs-config/global.ini`
- `.aistudio/obs-config/basic/profiles/Default/basic.ini`
- `.aistudio/obs-config/basic/scenes/Default.json`
- `.aistudio/obs-config/plugin_config/obs-websocket/config.json`

---

## 3. Starting the Headless Real OBS Daemon

Use the automated launcher script:
```bash
bash .aistudio/scripts/setup-and-start-obs.sh
```

What the script does:
1. Verifies/seeds `~/.config/obs-studio/` from `.aistudio/obs-config/`.
2. Starts `Xvfb :99 -screen 0 1280x720x24 -ac -nolisten tcp &` if not already running.
3. Sets environment variables:
   ```bash
   export DISPLAY=:99
   export LIBGL_ALWAYS_SOFTWARE=1
   export MESA_LOADER_DRIVER_OVERRIDE=llvmpipe
   ```
4. Launches OBS Studio:
   ```bash
   obs --minimize-to-tray --disable-updater --disable-shutdown-check > /tmp/obs.log 2>&1 &
   ```
5. Polling checks `127.0.0.1:4455` until the WebSocket v5 server is accepting incoming connections.

---

## 4. WebSocket Bridge (Express / Node.js)

Because Google Cloud Run exposes only port 3000 to the browser over HTTPS, and browsers block `ws://` connections from `https://` origins due to Mixed-Content security policies, the Node server provides a transparent bidirectional WebSocket proxy on port 3000:

- **Path**: `/obs-real-ws`
- **Internal Target**: `ws://127.0.0.1:4455`
- **Browser Connection URL**: `wss://<hostname>/obs-real-ws`

The Node.js server also provides an automated health & auto-starter API:
- `GET /api/real-obs/status` - Checks if the real OBS process is alive and port 4455 is listening.
- `POST /api/real-obs/start` - Calls `.aistudio/scripts/setup-and-start-obs.sh` to launch real OBS on demand.

---

## 5. Web App Integration

In the frontend UI:
- Open the 3-dot menu -> **Connection**.
- Click **"Connect to Real OBS (Cloud)"** (or enter `${location.host}/obs-real-ws`).
- The app connects to the real OBS Studio v29 process with full WebSocket v5 compliance (OpCodes 0, 1, 2, 5, 6, 7).
- All scene operations, filters, transitions, and transforms are executed directly on the live OBS engine.
