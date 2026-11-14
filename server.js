/**
 * OBS Blade Server (Node.js Express + WebSocket Server)
 * Full-stack backend providing:
 * 1. Direct Media File Uploads (multer) into local storage
 * 2. Media Library APIs (list, delete)
 * 3. OBS WebSocket v5 Bridge & Built-in Simulator
 * 4. Vite middleware for frontend development and static hosting for production
 */

import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { WebSocketServer, WebSocket } from 'ws';
import { execFile } from 'child_process';
import net from 'net';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Ensure uploads directory exists
const uploadsDir = path.resolve(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    // Sanitize filename and prepend timestamp
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniquePrefix = Date.now() + '-' + Math.round(Math.random() * 1e4);
    cb(null, `${uniquePrefix}_${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB limit
  },
});

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  app.use(express.json());

  // Enable CORS for external callers (e.g. IIS on port 80 or network LAN clients)
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-OBS-Password, X-Delete-Unlocked');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Serve uploaded media files publicly for browser preview
  app.use('/uploads', express.static(uploadsDir));

  // File Browser directory path (mounted cleanly in frontend routes below)
  const fileBrowserDir = path.resolve(__dirname, 'file-browser');

  // Initialize and attach OBS WebSocket Simulator only if simulator folder exists (for dev)
  const simulatorModulePath = path.resolve(__dirname, '.obs-websocket-simulator/simulator.js');
  if (fs.existsSync(simulatorModulePath)) {
    try {
      const { ObsWebSocketSimulator } = await import('./.obs-websocket-simulator/simulator.js');
      const simulator = new ObsWebSocketSimulator();
      simulator.attachToServer(server, '/obs-ws');
      console.log('[Dev] Attached OBS WebSocket Simulator on /obs-ws');
    } catch (simErr) {
      console.warn('[Dev] Simulator module not loaded:', simErr.message);
    }
  }

  // Helper to check if internal port 4455 is accepting connections
  function checkPort4455() {
    return new Promise((resolve) => {
      const sock = new net.Socket();
      sock.setTimeout(800);
      sock.on('connect', () => {
        sock.destroy();
        resolve(true);
      });
      sock.on('error', () => resolve(false));
      sock.on('timeout', () => {
        sock.destroy();
        resolve(false);
      });
      sock.connect(4455, '127.0.0.1');
    });
  }

  // Real OBS WebSocket v5 transparent proxy on /obs-real-ws
  const realObsWss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    try {
      const { pathname } = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
      if (pathname === '/obs-real-ws') {
        realObsWss.handleUpgrade(request, socket, head, (clientWs) => {
          realObsWss.emit('connection', clientWs, request);
        });
      }
    } catch (_) {}
  });

  realObsWss.on('connection', (clientWs) => {
    console.log('[Real OBS Proxy] Incoming client connected, bridging to 127.0.0.1:4455...');
    const obsWs = new WebSocket('ws://127.0.0.1:4455');

    obsWs.on('open', () => {
      console.log('[Real OBS Proxy] Established bridge to local OBS Studio 4455');
    });

    obsWs.on('message', (data, isBinary) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(data, { binary: isBinary });
      }
    });

    clientWs.on('message', (data, isBinary) => {
      if (obsWs.readyState === WebSocket.OPEN) {
        obsWs.send(data, { binary: isBinary });
      }
    });

    obsWs.on('close', (code, reason) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        if (typeof code === 'number' && code >= 1000 && code !== 1005 && code !== 1006) {
          clientWs.close(code, reason);
        } else {
          clientWs.close();
        }
      }
    });

    clientWs.on('close', (code, reason) => {
      if (obsWs.readyState === WebSocket.OPEN) {
        if (typeof code === 'number' && code >= 1000 && code !== 1005 && code !== 1006) {
          obsWs.close(code, reason);
        } else {
          obsWs.close();
        }
      }
    });

    obsWs.on('error', (err) => {
      console.error('[Real OBS Proxy] Failed to connect to local OBS:', err.message);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.close(1011, `Local OBS connection error: ${err.message}`);
      }
    });

    clientWs.on('error', (err) => {
      console.error('[Real OBS Proxy] Client error:', err.message);
    });
  });

  // Automatically ensure Real OBS is launched in background if script exists
  const launcherScript = path.resolve(__dirname, '.aistudio/scripts/setup-and-start-obs.sh');
  function triggerRealObsLaunch() {
    if (fs.existsSync(launcherScript)) {
      console.log('[Real OBS] Launching / verifying Real OBS daemon...');
      execFile('bash', [launcherScript], (err, stdout, stderr) => {
        if (err) {
          console.warn('[Real OBS] Launch notice:', err.message);
        } else {
          console.log('[Real OBS] Launcher output:', stdout.trim());
        }
      });
    }
  }

  // Trigger launch on server start
  setTimeout(triggerRealObsLaunch, 500);

  // --- API Endpoints ---

  /**
   * Real OBS Status & Control APIs
   */
  app.get('/api/real-obs/status', async (_req, res) => {
    const isOnline = await checkPort4455();
    res.json({
      online: isOnline,
      port: 4455,
      endpoint: '/obs-real-ws',
      fullUrl: `${_req.protocol === 'https' ? 'wss' : 'ws'}://${_req.get('host')}/obs-real-ws`,
      time: new Date().toISOString(),
    });
  });

  app.post('/api/real-obs/start', (_req, res) => {
    if (!fs.existsSync(launcherScript)) {
      return res.status(404).json({ error: 'Launcher script not found' });
    }
    execFile('bash', [launcherScript], (err, stdout, stderr) => {
      if (err) {
        return res.status(500).json({ error: err.message, details: stderr });
      }
      res.json({ success: true, output: stdout });
    });
  });

  /**
   * Status and Server Diagnostics
   */
  app.get('/api/status', (req, res) => {
    const reqPass = req.headers['x-obs-password'] || req.query.password || '';
    const configuredPass = process.env.FILE_SERVER_PASSWORD || process.env.OBS_PASSWORD || '';
    const authValid = !configuredPass || reqPass === configuredPass;

    res.json({
      service: 'OBS Host File Browser',
      status: 'online',
      nodeVersion: process.version,
      port: PORT,
      uploadsDir: uploadsDir,
      maxUploadMb: 100,
      simulatorAttached: true,
      authRequired: Boolean(configuredPass),
      authValid: authValid,
      time: new Date().toISOString(),
    });
  });

  /**
   * Direct File Upload API
   * Accepts multipart/form-data with field 'media'
   * Returns the exact local disk path required by OBS Studio
   */
  app.post('/api/upload', upload.single('media'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No media file provided' });
    }

    const absolutePath = path.resolve(req.file.path);
    const publicUrl = `/uploads/${req.file.filename}`;

    console.log(`[Upload] File saved to ${absolutePath}`);

    res.json({
      success: true,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      path: absolutePath, // Absolute disk path for OBS SetInputSettings
      url: publicUrl,
    });
  });

  /**
   * Media Library API
   * Lists all uploaded assets with paths, previews, and sizes
   */
  app.get('/api/media', (_req, res) => {
    try {
      const files = fs.readdirSync(uploadsDir);
      const mediaList = files
        .filter((file) => !file.startsWith('.'))
        .map((file) => {
          const filePath = path.join(uploadsDir, file);
          const stats = fs.statSync(filePath);
          return {
            filename: file,
            path: filePath,
            url: `/uploads/${file}`,
            size: stats.size,
            updatedAt: stats.mtime,
          };
        })
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      res.json({ files: mediaList });
    } catch (err) {
      res.status(500).json({ error: 'Failed to read media library', details: err.message });
    }
  });

  /**
   * Delete uploaded media
   */
  app.delete('/api/media/:filename', (req, res) => {
    const filename = req.params.filename;
    // Prevent path traversal
    const safeFilename = path.basename(filename);
    const targetPath = path.join(uploadsDir, safeFilename);

    if (!fs.existsSync(targetPath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    try {
      fs.unlinkSync(targetPath);
      res.json({ success: true, message: 'File deleted' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete file', details: err.message });
    }
  });

  /**
   * OBS Host Filesystem Browser API
   * Enables browsing files and folders on the OBS host machine
   */
  app.get('/api/fs/browse', (req, res) => {
    try {
      let requestedDir = req.query.dir ? String(req.query.dir).trim() : '';
      const isWindows = process.platform === 'win32';

      if (requestedDir === '__DRIVES__') {
        if (isWindows) {
          const drives = [];
          for (let code = 65; code <= 90; code++) {
            const driveRoot = `${String.fromCharCode(code)}:\\`;
            try {
              if (fs.statSync(driveRoot).isDirectory()) {
                drives.push({ name: driveRoot, path: driveRoot, isDirectory: true, isDrive: true, size: 0, ext: '' });
              }
            } catch (_) {}
          }
          return res.json({
            currentDir: '__DRIVES__',
            parentDir: null,
            uploadsDir: uploadsDir,
            projectDir: __dirname,
            entries: drives,
          });
        }
        requestedDir = '/';
      }

      if (!requestedDir || requestedDir === '__UPLOADS__') {
        requestedDir = uploadsDir;
      } else if (requestedDir === '__PROJECT__') {
        requestedDir = __dirname;
      } else if (isWindows && /^[a-zA-Z]:$/.test(requestedDir)) {
        requestedDir = `${requestedDir}\\`;
      }

      const targetDir = fs.existsSync(requestedDir) && fs.statSync(requestedDir).isDirectory()
        ? path.resolve(requestedDir)
        : uploadsDir;

      const entries = fs.readdirSync(targetDir, { withFileTypes: true });
      const items = [];

      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;
        try {
          const fullPath = path.join(targetDir, entry.name);
          const isDir = entry.isDirectory();
          let size = 0;
          if (!isDir) {
            const st = fs.statSync(fullPath);
            size = st.size;
          }
          const isInsideUploads = (() => {
            const rel = path.relative(path.resolve(uploadsDir), path.resolve(fullPath));
            return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
          })();
          items.push({
            name: entry.name,
            path: fullPath,
            isDirectory: isDir,
            size: size,
            ext: isDir ? '' : path.extname(entry.name).toLowerCase(),
            deletable: !isDir && isInsideUploads,
          });
        } catch (_) {}
      }

      items.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
      });

      const parentDir = path.dirname(targetDir);

      res.json({
        currentDir: targetDir,
        parentDir: parentDir !== targetDir ? parentDir : (isWindows ? '__DRIVES__' : null),
        uploadsDir: uploadsDir,
        projectDir: __dirname,
        entries: items,
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to browse directory', details: err.message });
    }
  });

  // Streaming Media Preview API for File Browser tab in AI Studio preview
  const PREVIEWABLE_EXTS = new Set([
    '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico',
    '.mp4', '.mov', '.mkv', '.webm', '.m4v', '.avi',
    '.mp3', '.wav', '.aac', '.flac', '.ogg', '.m4a',
    '.txt', '.log', '.json', '.srt', '.vtt',
  ]);

  app.get('/api/fs/preview', (req, res) => {
    const rawPath = req.query.path ? String(req.query.path) : '';
    if (!rawPath) return res.status(400).json({ error: 'Missing file path' });
    const resolvedPath = path.resolve(rawPath);
    if (!PREVIEWABLE_EXTS.has(path.extname(resolvedPath).toLowerCase())) {
      return res.status(415).json({ error: 'Preview is not supported for this file type' });
    }
    try {
      if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isFile()) {
        return res.status(404).json({ error: 'File not found' });
      }
      res.sendFile(resolvedPath, {
        dotfiles: 'allow',
        headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to preview file', details: err.message });
    }
  });

  // Locked Delete API for File Browser tab in AI Studio preview (uploadsDir only)
  app.delete('/api/fs/file', (req, res) => {
    if (req.headers['x-delete-unlocked'] !== 'true') {
      return res.status(403).json({ error: 'Delete lock is enabled. Unlock delete mode first.' });
    }
    const rawPath = req.query.path ? String(req.query.path) : '';
    if (!rawPath) return res.status(400).json({ error: 'Missing file path' });
    const targetPath = path.resolve(rawPath);
    const rel = path.relative(path.resolve(uploadsDir), targetPath);
    if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) {
      return res.status(403).json({ error: 'Delete is restricted to the uploads folder.' });
    }
    try {
      if (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isFile()) {
        return res.status(404).json({ error: 'File not found' });
      }
      fs.unlinkSync(targetPath);
      res.json({ success: true, path: targetPath });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete file', details: err.message });
    }
  });

  // --- Frontend Serving (AI Studio Zero-Reload Dual-Tab Preview — No Nested Iframes) ---
  const staticRoot = isProduction && fs.existsSync(path.resolve(__dirname, 'dist'))
    ? path.resolve(__dirname, 'dist')
    : path.resolve(__dirname, 'src');

  function buildDualTabObsHtml(obsRawHtml) {
    const fbHtmlPath = path.resolve(fileBrowserDir, 'index.html');
    let fbStyle = '';
    let fbBody = '<div style="padding:24px;color:#94a3b8;">File browser UI not found.</div>';
    let fbScript = '';

    if (fs.existsSync(fbHtmlPath)) {
      const fbRaw = fs.readFileSync(fbHtmlPath, 'utf8');
      const styleMatch = fbRaw.match(/<style>([\s\S]*?)<\/style>/i);
      const bodyMatch = fbRaw.match(/<body>([\s\S]*?)<script>/i);
      const scriptMatch = fbRaw.match(/<script>([\s\S]*?)<\/script>/i);
      if (styleMatch) {
        fbStyle = styleMatch[1]
          .replace(/:root\s*\{/g, ':host {')
          .replace(/(^|\s)body\s*\{/gm, '$1.fb-root {');
      }
      if (bodyMatch) {
        fbBody = bodyMatch[1];
      }
      if (scriptMatch) {
        fbScript = scriptMatch[1].replace(/<\/script>/gi, '<\\/script>');
      }
    }

    const previewInjection = `
<style>
  body .top-nav-bar { top: 38px !important; }
  body .blade-dialog-overlay { top: 38px !important; }
  #aistudio-preview-tabbar {
    position: sticky; top: 0; height: 38px; min-height: 38px; flex-shrink: 0;
    background: #0f1624; border-bottom: 1px solid #1e293b;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 12px; gap: 8px; z-index: 50001;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  #aistudio-preview-tabbar .ai-tab-group { display: flex; align-items: center; gap: 6px; }
  #aistudio-preview-tabbar .ai-tab-btn {
    border: 1px solid transparent; background: transparent; color: #94a3b8;
    padding: 5px 12px; border-radius: 6px; font-size: 12.5px; font-weight: 600;
    cursor: pointer; display: inline-flex; align-items: center; gap: 6px;
  }
  #aistudio-preview-tabbar .ai-tab-btn:hover { color: #e2e8f0; background: rgba(255,255,255,0.05); }
  #aistudio-preview-tabbar .ai-tab-btn.active { background: #1e293b; color: #ffffff; border-color: #3b82f6; }
  #aistudio-preview-tabbar .ai-open-link {
    font-size: 12px; color: #93c5fd; text-decoration: none; padding: 4px 10px;
    border-radius: 6px; border: 1px solid #1e293b; background: #131c2e; white-space: nowrap;
  }
  #aistudio-preview-tabbar .ai-open-link:hover { background: #1d2a42; color: #fff; }
  #aistudio-fb-panel {
    display: none; position: fixed; top: 38px; left: 0; right: 0; bottom: 0;
    z-index: 50000; overflow: auto; background: #12141a;
  }
  #aistudio-fb-panel.active { display: block; }
</style>
<div id="aistudio-preview-tabbar">
  <div class="ai-tab-group">
    <button type="button" id="aistudio-tab-obs" class="ai-tab-btn active">🎛️ OBS Blade</button>
    <button type="button" id="aistudio-tab-files" class="ai-tab-btn">📁 File Browser</button>
  </div>
  <a id="aistudio-open-tab" class="ai-open-link" href="/obs/" target="_blank" rel="noopener">Open Tab ↗</a>
</div>
<div id="aistudio-fb-panel"></div>
<script>
(function () {
  var btnObs = document.getElementById('aistudio-tab-obs');
  var btnFiles = document.getElementById('aistudio-tab-files');
  var fbPanel = document.getElementById('aistudio-fb-panel');
  var openLink = document.getElementById('aistudio-open-tab');
  var fbInitialized = false;

  var fbStyleText = ${JSON.stringify(fbStyle)};
  var fbBodyHtml = ${JSON.stringify(fbBody)};
  var fbScriptCode = ${JSON.stringify(fbScript)};

  function initFileBrowserTab() {
    if (fbInitialized || !fbPanel) return;
    fbInitialized = true;
    var shadow = fbPanel.attachShadow({ mode: 'open' });
    shadow.innerHTML = '<style>:host{display:block;min-height:100%;}' + fbStyleText + '</style><div class="fb-root">' + fbBodyHtml + '</div>';
    var fbDoc = {
      getElementById: function (id) { return shadow.getElementById(id); },
      createElement: function (tag) { return document.createElement(tag); },
      createDocumentFragment: function () { return document.createDocumentFragment(); },
      execCommand: function (cmd) { return document.execCommand(cmd); },
      body: document.body
    };
    try {
      var runner = new Function('document', fbScriptCode);
      runner(fbDoc);
    } catch (err) {
      shadow.innerHTML = '<div style="padding:24px;color:#f87171;font-family:sans-serif;">Failed to initialize File Browser tab: ' + err.message + '</div>';
    }
  }

  function switchPreviewTab(tab) {
    var isObs = tab === 'obs';
    btnObs.classList.toggle('active', isObs);
    btnFiles.classList.toggle('active', !isObs);
    fbPanel.classList.toggle('active', !isObs);
    if (openLink) openLink.href = isObs ? '/obs/' : '/file-browser/';
    if (!isObs) initFileBrowserTab();
  }

  if (btnObs) btnObs.addEventListener('click', function () { switchPreviewTab('obs'); });
  if (btnFiles) btnFiles.addEventListener('click', function () { switchPreviewTab('files'); });
})();
</script>`;

    return obsRawHtml.replace(/<body([^>]*)>/i, `<body$1>${previewInjection}`);
  }

  const obsIndexPath = path.resolve(staticRoot, 'index.html');
  const fbIndexPath = path.resolve(fileBrowserDir, 'index.html');

  function sendObsWithTabSwitcher(res) {
    try {
      const rawHtml = fs.readFileSync(obsIndexPath, 'utf8');
      res.setHeader('Cache-Control', 'no-store');
      res.type('html').send(buildDualTabObsHtml(rawHtml));
    } catch (err) {
      res.status(500).send(`Failed to load UI: ${err.message}`);
    }
  }

  // Root / serves OBS Blade + zero-reload Shadow DOM File Browser tab switcher
  app.get('/', (_req, res) => {
    sendObsWithTabSwitcher(res);
  });

  // Direct standalone routes (/obs/ and /file-browser/) for "Open Tab ↗"
  app.get('/obs', (_req, res) => res.redirect(302, '/obs/'));
  app.use('/obs', express.static(staticRoot));
  app.get('/obs/*', (_req, res) => {
    res.sendFile(obsIndexPath);
  });

  if (fs.existsSync(fileBrowserDir)) {
    app.get(['/file-browser', '/files'], (req, res) => res.redirect(302, `${req.path}/`));
    app.use('/file-browser', express.static(fileBrowserDir));
    app.use('/files', express.static(fileBrowserDir));
    app.get('/file-browser/*', (_req, res) => {
      res.sendFile(fbIndexPath);
    });
  }

  app.use(express.static(staticRoot));
  app.get('*', (_req, res) => {
    sendObsWithTabSwitcher(res);
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] OBS Blade Backend running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server Error] Failed to start server:', err);
  process.exit(1);
});
