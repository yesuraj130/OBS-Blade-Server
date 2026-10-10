# OBS Blade Web — Production Remote & Media Control

A professional, mobile-first web control surface for **OBS Studio 28+** featuring live scene switching, Studio Mode transitions, real-time video preview, PTZ camera joystick controls, source properties editing, and an independent media file management microservice.

---

## 🏛️ System Architecture

The system is built on a **fully decoupled 3-plane architecture**. The live broadcast control surface never depends on the media server:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               OPERATOR DEVICE (iPad / Tablet / PC)                     │
│                                                                                        │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │                          OBS Blade Web UI (Browser)                            │   │
│   └───────────────┬───────────────────────────────┬────────────────────────────────┘   │
└───────────────────┼───────────────────────────────┼────────────────────────────────────┘
                    │                               │
        1. Pure Static Assets               2. Direct Live Control           3. On-Demand Media I/O
        (HTML / JS / CSS)                   (WebSocket v5)                   (HTTP REST API)
                    │                               │                               │
                    ▼                               ▼                               ▼
       ┌────────────────────────┐      ┌────────────────────────┐      ┌────────────────────────┐
       │   IIS Web Server       │      │   OBS Studio           │      │   File Browser Service │
       │   (Port 80 / HTTP)     │      │   (Port 4455 / WS)     │      │   (Port 3000 / HTTP)   │
       │                        │      │                        │      │                        │
       │ • Serves `/src/` files │      │ • Video & Audio Engine │      │ • Disk File Uploads    │
       │ • 100% Static          │      │ • Scene Switching      │      │ • Filesystem Browsing  │
       │ • No Node.js required  │      │ • PTZ Camera Control   │      │ • Detached from OBS    │
       └────────────────────────┘      └────────────────────────┘      └────────────────────────┘
```

### Key Architectural Principles:

1. **Mission-Critical Fault Isolation**:
   * The live broadcast plane (IIS + OBS Studio) has **zero startup coupling** with the file server.
   * If the file browser server crashes, is powered off, or network cables are unplugged, **all live OBS controls (scene switching, audio faders, stream/record toggles) continue working 100% seamlessly**.
   * Only when an operator clicks *"Browse Host Files"* or attempts a file upload will the UI display an on-demand notice:  
     > *⚠️ Not possible now since file browser server not connected.*
2. **Direct, Low-Latency WebSocket**:
   * The browser connects directly to OBS Studio via native WebSocket v5 on port `4455`.
   * No intermediate proxies or packet sniffing. Zero added latency.
3. **Any-Backend API Compatibility**:
   * The OBS Blade front-end communicates with the file service using a minimal standard REST contract (`POST /api/upload`, `GET /api/fs/browse`).
   * The default Node.js file service can be replaced by any custom web service (C# / ASP.NET, Go, Python, or NAS storage appliance).

---

## 📁 Repository Directory Structure

```text
/
├── src/                     # 100% Self-Contained Web Dashboard (Deploy to IIS)
│   ├── index.html           # Main web application entry point
│   ├── app.js               # OBS Dashboard application logic
│   ├── obs-client.js        # Native OBS WebSocket v5 protocol client
│   ├── obs-properties-builder.js # Dynamic source properties builder
│   └── style.css            # Dark-mode broadcast controller styles
│
├── file-browser/            # 100% Self-Contained File Browser Microservice
│   ├── server.js            # Node.js Express server (uploads & disk browsing)
│   ├── package.json         # Standalone dependencies (express, multer)
│   ├── index.html           # Standalone Drag-and-Drop file manager UI
│   └── README.md            # File service deployment guide
│
├── build.js                 # Production bundle builder
├── package.json             # Root workspace configuration
└── server.js                # Development server (serves src/ & dev simulator)
```

---

## 🚀 Step-by-Step Deployment Guide

You can deploy the entire setup on **a single Windows PC** or distributed across **multiple network machines**.

---

### Step 1: Deploy the Web Dashboard to IIS

The web application is pure static HTML/JavaScript. It requires **no Node.js, no ASP, and no PHP** on your IIS server.

1. Open your IIS machine (e.g. `C:\inetpub\wwwroot\`).
2. Copy all files from the **`/src/`** folder directly into your IIS website folder:
   ```text
   C:\inetpub\wwwroot\
     ├── index.html
     ├── app.js
     ├── obs-client.js
     ├── obs-properties-builder.js
     └── style.css
   ```
3. In **IIS Manager**:
   * Verify that `index.html` is listed under **Default Document**.
   * Ensure your IIS site is running on port `80` (or your chosen port).
4. Verify by opening `http://<iis-ip>/` in a web browser. The OBS Blade dashboard will load immediately.

---

### Step 2: Configure OBS Studio (Port 4455)

1. Launch **OBS Studio** on your broadcast computer.
2. In the top menu, go to: **Tools** > **WebSocket Server Settings**.
3. Check the box: **Enable WebSocket server**.
4. Set **Server Port** to `4455` (default).
5. *(Optional)* If **Enable Authentication** is checked, note your password.
6. Click **Apply** and **OK**.

> **LAN Access Tip**: Ensure Windows Firewall on the OBS computer allows incoming connections on port `4455` for your Local Network.

---

### Step 3: Deploy the File Browser Microservice (Port 3000)

*(Optional: Only needed if operators need to upload media or browse host files from their mobile browser).*

1. Copy the **`/file-browser/`** folder to the computer where media files will be stored (usually the OBS computer).
2. Start the service using any method:
   * **Double-click `StartServer.bat`** (Windows command prompt launcher with auto npm install check).
   * **Double-click `StartServer.vbs`** (silent background Windows launcher; no black window).
   * Or run `npm install && npm start` in terminal.
3. The file service is now running on port `3000`.
4. *(Optional Windows Auto-Start)*: Use **NSSM (Non-Sucking Service Manager)** or Windows Task Scheduler to run `StartServer.bat` automatically on Windows boot.

---

### Step 4: Connecting the Operator Device (iPad / Tablet / Laptop)

1. Connect your tablet or laptop to the studio Wi-Fi / Local Network.
2. Open your browser and navigate to:
   ```text
   http://<iis-server-ip>/
   ```
3. In the **OBS Connection Dialog**:
   * **OBS IP Address**: The local IP of your OBS Studio PC (e.g. `192.168.1.50`).
   * **WebSocket Port**: `4455`.
   * **Server Password**: Your OBS WebSocket password (if enabled).
   * **File Browser Server URL**: e.g. `http://192.168.1.50:3000` (optional).
   * **Same password as OBS**: Checked by default (or uncheck to provide a custom file server password).
   * Click **Connect**.
4. The dashboard will immediately connect to OBS, and automatically verifies the file service in the background! (Non-blocking: live broadcast controls remain 100% active even if the file service is offline).

Your studio remote is now 100% operational!

---

## 🛡️ Resilience & Fault Behavior

| Event | System Behavior |
| :--- | :--- |
| **File Server is Offline / Unreachable** | **Zero impact on live streaming.** Operators can switch scenes, adjust volume, control PTZ, and start/stop streams. Only file browsing shows an on-demand *"File browser server not connected"* notice. |
| **IIS Web Server is Restarted** | Once the dashboard page is loaded in a tablet's browser memory, the tablet stays connected to OBS Studio even if IIS temporarily restarts. |
| **OBS Studio Restarts Mid-Broadcast** | The web dashboard detects the drop, shows a subtle reconnecting badge, and automatically re-syncs all scenes the instant OBS is restarted. |

---

## 🔌 API Contract for Custom File Services

If you wish to replace `file-browser/server.js` with your own backend (e.g. C# / ASP.NET or Python), simply implement these two endpoints:

### 1. `POST /api/upload`
* **Content-Type**: `multipart/form-data` (field: `media`)
* **Response**:
  ```json
  {
    "success": true,
    "path": "C:\\OBS\\uploads\\intro.mp4",
    "filename": "intro.mp4"
  }
  ```

### 2. `GET /api/fs/browse?dir=<path>`
* **Response**:
  ```json
  {
    "currentDir": "C:\\OBS\\media",
    "parentDir": "C:\\OBS",
    "entries": [
      { "name": "clip.mp4", "path": "C:\\OBS\\media\\clip.mp4", "isDirectory": false, "ext": ".mp4" },
      { "name": "Graphics", "path": "C:\\OBS\\media\\Graphics", "isDirectory": true }
    ]
  }
  ```
