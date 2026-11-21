# Standalone OBS Host File Browser

A standalone, lightweight media upload and file browsing microservice designed for OBS Studio.

This folder is **completely detached from OBS Studio**. It runs independently on any Windows, macOS, or Linux machine on your network.

---

## What This Service Does

1. **Media Uploads (`POST /api/upload`)**: Streams video, audio, and image files directly to `./uploads` (low RAM usage) and returns the exact absolute disk path needed by OBS Studio sources.
2. **Filesystem & All-Drives Browsing (`GET /api/fs/browse`)**: Allows remote web clients to browse folders and all mounted Windows drives (`C:\`, `D:\`, etc.) on the host machine.
3. **Low-Memory Media Preview (`GET /api/fs/preview`)**: Streams images, audio, and video via HTTP Range requests (`206 Partial Content`) without buffering files into memory.
4. **Locked Delete Protection (`DELETE /api/fs/file`, `DELETE /api/media/:filename`)**: Disabled until explicitly unlocked in the UI, and restricted to `./uploads` by default unless `ALLOW_SYSTEM_DELETE=true`.
5. **Standalone Web Manager**: Provides an independent drag-and-drop web UI at `http://<this-machine-ip>:3000`.

---

## Configuration (`config.js` & Environment Variables)

Edit `config.js` directly to configure defaults without touching `server.js` (`config.js` is loaded server-side only and is never served over HTTP). Environment variables override `config.js` if explicitly set.

| `config.js` Key | Environment Variable | Default | Purpose |
| :--- | :--- | :--- | :--- |
| `port` | `PORT` | `3000` | HTTP port to listen on |
| `password` | `FILE_SERVER_PASSWORD` (or `OBS_PASSWORD`) | *(empty)* | Enforces password authentication across all upload, browse, preview, and delete endpoints |
| `maxUploadMb` | `MAX_UPLOAD_MB` | `2048` | Maximum single upload file size in MB (default 2 GB) |
| `allowSystemDelete` | `ALLOW_SYSTEM_DELETE` | `false` | Set `true` to allow deleting files outside `./uploads` when unlocked |
| `defaultDir` | — | *(empty)* | Folder opened automatically on startup (empty = Project Folder, or `__UPLOADS__`, `__DRIVES__`, or a folder path) |
| `defaultBookmarks` | — | `[]` | Default bookmarks (`[{ name, path }]`) shown until customized in the browser (can be restored via **Reset to Default**) |

---

## How to Deploy & Run

### 1. Copy This Folder
Copy the entire `file-browser` folder to the target machine where media will be stored or where OBS is running.

### 2. Start the Server
You have three easy ways to start the server:

* **Double-click `StartServer.bat`**: Installs production dependencies on first run, opens a terminal window, and starts the service.
* **Double-click `StartServer.vbs`**: Silently verifies Node.js, installs dependencies on first run if missing, starts the service in the background with `server.log` rotation, and confirms startup.
* **Or run via command line**:
  ```bash
  npm install --omit=dev
  npm start
  ```

---

## Connecting from OBS Blade Dashboard (IIS)

In your OBS Blade Web Dashboard (running on IIS or another device):
* In the **OBS Connection dialog**, enter your OBS IP/Port/Password.
* Enter the **File Browser Server URL** (e.g. `http://<this-machine-ip>:3000`).
* Keep **"Same password as OBS"** checked (or specify a custom password).
* When you connect, the dashboard automatically verifies the file service in the background.
