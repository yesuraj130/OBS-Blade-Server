# Standalone OBS Host File Browser

A standalone, lightweight media upload and file browsing microservice designed for OBS Studio.

This folder is **completely detached from OBS Studio**. It runs independently on any Windows, macOS, or Linux machine on your network.

---

## What This Service Does

1. **Media Uploads (`POST /api/upload`)**: Saves video, audio, and image files to `./uploads` and returns the exact absolute disk path needed by OBS Studio sources.
2. **Filesystem Browsing (`GET /api/fs/browse`)**: Allows remote web clients to browse folders on the host machine.
3. **Media Library (`GET /api/media`)**: Lists and previews all uploaded files.
4. **Standalone Web Manager**: Provides an independent drag-and-drop web UI at `http://<this-machine-ip>:3000`.

---

## How to Deploy & Run

### 1. Copy This Folder
Copy the entire `file-browser` folder to the target machine where media will be stored or where OBS is running.

### 2. Install Dependencies
Open a command prompt or terminal in this folder:
```bash
npm install
```

### 3. Start the Server
```bash
npm start
```
*(Runs by default on port `3000`. You can change the port with `PORT=3000`)*

---

## Connecting from OBS Blade Dashboard (IIS)

In your OBS Blade Web Dashboard (running on IIS or another device):
* Open **Settings** (••• > Settings).
* Set **File Browser Server URL** to:
  ```
  http://<this-machine-ip>:3000
  ```
* Media uploads and file browsing will immediately connect to this server!
