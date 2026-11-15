import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const MAX_UPLOAD_MB = Math.max(1, Number(process.env.MAX_UPLOAD_MB) || 2048);
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
const ALLOW_SYSTEM_DELETE = process.env.ALLOW_SYSTEM_DELETE === 'true';

const uploadsDir = path.resolve(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const PREVIEWABLE_EXTS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico',
  '.mp4', '.mov', '.mkv', '.webm', '.m4v', '.avi',
  '.mp3', '.wav', '.aac', '.flac', '.ogg', '.m4a',
  '.txt', '.log', '.json', '.srt', '.vtt',
]);

function getConfiguredPassword() {
  return process.env.FILE_SERVER_PASSWORD || process.env.OBS_PASSWORD || '';
}

function extractRequestPassword(req) {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  if (typeof req.query?.password === 'string' && req.query.password.length > 0) {
    return req.query.password;
  }
  return '';
}

function isPasswordValid(provided, configured) {
  if (!configured) return true;
  if (!provided) return false;
  const a = crypto.createHash('sha256').update(String(provided)).digest();
  const b = crypto.createHash('sha256').update(String(configured)).digest();
  return crypto.timingSafeEqual(a, b);
}

function requireAuth(req, res, next) {
  const configured = getConfiguredPassword();
  if (!configured) return next();
  const provided = extractRequestPassword(req);
  if (!isPasswordValid(provided, configured)) {
    return res.status(401).json({ error: 'Unauthorized: invalid or missing file server password' });
  }
  next();
}

function isPathInside(targetPath, baseDir) {
  const resolvedTarget = path.resolve(targetPath);
  const resolvedBase = path.resolve(baseDir);
  const rel = path.relative(resolvedBase, resolvedTarget);
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

function getWindowsDrives() {
  const drives = [];
  for (let code = 65; code <= 90; code++) {
    const driveRoot = `${String.fromCharCode(code)}:\\`;
    try {
      const st = fs.statSync(driveRoot);
      if (st.isDirectory()) {
        drives.push({
          name: driveRoot,
          path: driveRoot,
          isDirectory: true,
          isDrive: true,
          size: 0,
          ext: '',
        });
      }
    } catch (_) {}
  }
  return drives;
}

// Multer disk storage streams uploads directly to disk (low memory footprint)
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const safeName = (file.originalname || 'upload.bin').replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniquePrefix = `${Date.now()}-${Math.round(Math.random() * 1e4)}`;
    cb(null, `${uniquePrefix}_${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_BYTES },
});

const app = express();
app.disable('x-powered-by');

const server = http.createServer(app);
// Disable request timeout so large (>100 MB) Wi-Fi uploads do not drop at Node's 5m default
server.requestTimeout = 0;
server.headersTimeout = 60000;
server.keepAliveTimeout = 65000;

app.use(express.json({ limit: '1mb' }));

// CORS for LAN / IIS cross-origin dashboard calls
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Delete-Unlocked'
  );
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Serve standalone UI static files (HTML/JS/CSS)
app.use(express.static(__dirname, { index: 'index.html' }));

// Protect uploaded media static route when password is enabled
app.use('/uploads', requireAuth, express.static(uploadsDir));

/**
 * Health & Auth Check API
 */
app.get('/api/status', (req, res) => {
  const configuredPass = getConfiguredPassword();
  const reqPass = extractRequestPassword(req);
  const authValid = isPasswordValid(reqPass, configuredPass);

  res.json({
    service: 'OBS Host File Browser',
    status: 'online',
    platform: process.platform,
    port: PORT,
    uploadsDir,
    maxUploadBytes: MAX_UPLOAD_BYTES,
    maxUploadMb: MAX_UPLOAD_MB,
    allowSystemDelete: ALLOW_SYSTEM_DELETE,
    authRequired: Boolean(configuredPass),
    authValid,
    time: new Date().toISOString(),
  });
});

/**
 * Direct File Upload API
 * Streams multipart/form-data ('media') directly to ./uploads
 */
app.post('/api/upload', requireAuth, (req, res) => {
  let aborted = false;
  const cleanupPartial = () => {
    if (req.file?.path) {
      fs.unlink(req.file.path, () => {});
    }
  };

  req.on('aborted', () => {
    aborted = true;
    cleanupPartial();
  });

  res.on('close', () => {
    if (!res.writableFinished) {
      aborted = true;
      cleanupPartial();
    }
  });

  upload.single('media')(req, res, (err) => {
    if (aborted) return;

    if (err) {
      cleanupPartial();
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({
            error: `File exceeds server limit of ${MAX_UPLOAD_MB} MB`,
            code: err.code,
          });
        }
        return res.status(400).json({ error: err.message, code: err.code });
      }
      if (err.code === 'ENOSPC') {
        return res.status(507).json({ error: 'Insufficient disk space on OBS host' });
      }
      return res.status(500).json({ error: 'Upload failed', details: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No media file provided' });
    }

    const absolutePath = path.resolve(req.file.path);
    const publicUrl = `/uploads/${encodeURIComponent(req.file.filename)}`;

    console.log(`[Upload] Saved (${req.file.size} bytes): ${absolutePath}`);

    res.json({
      success: true,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      path: absolutePath,
      url: publicUrl,
    });
  });
});

/**
 * Media Library API (files inside ./uploads)
 */
app.get('/api/media', requireAuth, (_req, res) => {
  try {
    const entries = fs.readdirSync(uploadsDir, { withFileTypes: true });
    const mediaList = [];

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const filePath = path.join(uploadsDir, entry.name);
      try {
        const stats = fs.statSync(filePath);
        if (!stats.isFile()) continue;
        mediaList.push({
          filename: entry.name,
          path: filePath,
          url: `/uploads/${encodeURIComponent(entry.name)}`,
          size: stats.size,
          updatedAt: stats.mtime,
        });
      } catch (_) {}
    }

    mediaList.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    res.json({ files: mediaList });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read media library', details: err.message });
  }
});

/**
 * Delete Uploaded Media (requires unlock header)
 */
app.delete('/api/media/:filename', requireAuth, (req, res) => {
  if (req.headers['x-delete-unlocked'] !== 'true') {
    return res.status(403).json({ error: 'Delete lock is enabled. Unlock delete mode first.' });
  }

  const safeFilename = path.basename(req.params.filename || '');
  if (!safeFilename || safeFilename === '.' || safeFilename === '..') {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  const targetPath = path.join(uploadsDir, safeFilename);
  if (!isPathInside(targetPath, uploadsDir) || !fs.existsSync(targetPath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  try {
    const st = fs.statSync(targetPath);
    if (!st.isFile()) {
      return res.status(400).json({ error: 'Target is not a file' });
    }
    fs.unlinkSync(targetPath);
    console.log(`[Delete] Removed upload: ${targetPath}`);
    res.json({ success: true, message: 'File deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete file', details: err.message });
  }
});

/**
 * Delete File from Filesystem Browser (requires unlock header; scoped to uploadsDir unless ALLOW_SYSTEM_DELETE=true)
 */
app.delete('/api/fs/file', requireAuth, (req, res) => {
  if (req.headers['x-delete-unlocked'] !== 'true') {
    return res.status(403).json({ error: 'Delete lock is enabled. Unlock delete mode first.' });
  }

  const rawPath = req.query.path ? String(req.query.path) : '';
  if (!rawPath) {
    return res.status(400).json({ error: 'Missing file path' });
  }

  const targetPath = path.resolve(rawPath);
  if (!ALLOW_SYSTEM_DELETE && !isPathInside(targetPath, uploadsDir)) {
    return res.status(403).json({
      error: 'Delete is restricted to the uploads folder (set ALLOW_SYSTEM_DELETE=true to override).',
    });
  }

  try {
    if (!fs.existsSync(targetPath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    const st = fs.statSync(targetPath);
    if (!st.isFile()) {
      return res.status(400).json({ error: 'Only files can be deleted, not directories' });
    }
    fs.unlinkSync(targetPath);
    console.log(`[Delete] Removed file: ${targetPath}`);
    res.json({ success: true, path: targetPath });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete file', details: err.message });
  }
});

/**
 * Low-Memory Streaming Media Preview API
 * Uses res.sendFile() with Accept-Ranges (206 Partial Content) so large videos stream with minimal RAM.
 */
app.get('/api/fs/preview', requireAuth, (req, res) => {
  const rawPath = req.query.path ? String(req.query.path) : '';
  if (!rawPath) {
    return res.status(400).json({ error: 'Missing file path' });
  }

  const resolvedPath = path.resolve(rawPath);
  const ext = path.extname(resolvedPath).toLowerCase();
  if (!PREVIEWABLE_EXTS.has(ext)) {
    return res.status(415).json({ error: 'Preview is not supported for this file type' });
  }

  try {
    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    const st = fs.statSync(resolvedPath);
    if (!st.isFile()) {
      return res.status(400).json({ error: 'Target is not a file' });
    }

    res.sendFile(resolvedPath, {
      dotfiles: 'allow',
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to preview file', details: err.message });
  }
});

/**
 * Filesystem Browser API (with Windows All-Drives support)
 */
app.get('/api/fs/browse', requireAuth, (req, res) => {
  try {
    let requestedDir = req.query.dir ? String(req.query.dir).trim() : '';
    const isWindows = process.platform === 'win32';

    if (requestedDir === '__DRIVES__' || (isWindows && requestedDir === '/')) {
      if (isWindows) {
        return res.json({
          currentDir: '__DRIVES__',
          parentDir: null,
          uploadsDir,
          platform: process.platform,
          entries: getWindowsDrives(),
        });
      }
      requestedDir = '/';
    }

    if (!requestedDir || requestedDir === '__UPLOADS__') {
      requestedDir = uploadsDir;
    } else if (requestedDir === '__ROOT__' || requestedDir === '__PROJECT__') {
      requestedDir = __dirname;
    } else if (isWindows && /^[a-zA-Z]:$/.test(requestedDir)) {
      requestedDir = `${requestedDir}\\`;
    }

    let targetDir = uploadsDir;
    if (fs.existsSync(requestedDir)) {
      try {
        if (fs.statSync(requestedDir).isDirectory()) {
          targetDir = path.resolve(requestedDir);
        }
      } catch (_) {}
    }

    const entries = fs.readdirSync(targetDir, { withFileTypes: true });
    const items = [];

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      try {
        const fullPath = path.join(targetDir, entry.name);
        let isDir = entry.isDirectory();
        if (!isDir && entry.isSymbolicLink()) {
          isDir = fs.statSync(fullPath).isDirectory();
        }
        let size = 0;
        if (!isDir) {
          const st = fs.statSync(fullPath);
          if (!st.isFile()) continue;
          size = st.size;
        }
        items.push({
          name: entry.name,
          path: fullPath,
          isDirectory: isDir,
          size,
          ext: isDir ? '' : path.extname(entry.name).toLowerCase(),
          deletable: !isDir && (ALLOW_SYSTEM_DELETE || isPathInside(fullPath, uploadsDir)),
        });
      } catch (_) {}
    }

    items.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });

    const computedParent = path.dirname(targetDir);
    let parentDir = computedParent !== targetDir ? computedParent : null;
    if (isWindows && parentDir === null) {
      parentDir = '__DRIVES__';
    }

    res.json({
      currentDir: targetDir,
      parentDir,
      uploadsDir,
      platform: process.platform,
      entries: items,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to browse directory', details: err.message });
  }
});

// Fallback to standalone web UI
app.get('*', (_req, res) => {
  res.sendFile(path.resolve(__dirname, 'index.html'));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[File Server] Standalone File Browser running on http://0.0.0.0:${PORT}`);
  console.log(`[File Server] Uploads: ${uploadsDir} (Max: ${MAX_UPLOAD_MB} MB, Auth: ${Boolean(getConfiguredPassword())})`);
});

function shutdown(signal) {
  console.log(`[File Server] Received ${signal}, shutting down...`);
  server.close(() => {
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 3000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (err) => {
  console.error('[File Server] Unhandled rejection:', err);
});
process.on('uncaughtException', (err) => {
  console.error('[File Server] Uncaught exception:', err);
});
