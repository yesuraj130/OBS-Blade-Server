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

function copyRecursiveSync(src, dest) {
  const st = fs.statSync(src);
  if (st.isDirectory()) {
    if (isPathInside(dest, src) || path.resolve(src) === path.resolve(dest)) {
      throw new Error('Cannot copy a folder into itself');
    }
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursiveSync(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

function moveEntrySync(src, dest) {
  try {
    fs.renameSync(src, dest);
  } catch (err) {
    if (err.code === 'EXDEV') {
      copyRecursiveSync(src, dest);
      fs.rmSync(src, { recursive: true, force: true });
    } else {
      throw err;
    }
  }
}

// Multer disk storage streams uploads directly to target dir (or ./uploads default)
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const rawDir = req.query?.dir ? String(req.query.dir).trim() : '';
    if (rawDir && rawDir !== '__UPLOADS__' && rawDir !== '__DRIVES__') {
      try {
        const resolved = path.resolve(rawDir);
        if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
          return cb(null, resolved);
        }
      } catch (_) {}
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const keepOriginal = req.query?.keepName === 'true';
    const safeName = path.basename(file.originalname || 'upload.bin').replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
    if (keepOriginal) {
      return cb(null, safeName);
    }
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
 * Dedicated Login Verification API
 */
app.post('/api/auth/login', (req, res) => {
  const configuredPass = getConfiguredPassword();
  const provided = typeof req.body?.password === 'string' ? req.body.password : extractRequestPassword(req);
  if (!isPasswordValid(provided, configuredPass)) {
    return res.status(401).json({ success: false, error: 'Invalid password' });
  }
  res.json({
    success: true,
    authRequired: Boolean(configuredPass),
    authValid: true,
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
        const st = fs.statSync(fullPath);
        const isDir = st.isDirectory();
        if (!isDir && !st.isFile()) continue;
        let itemCount = null;
        if (isDir) {
          try {
            itemCount = fs.readdirSync(fullPath).filter((n) => !n.startsWith('.')).length;
          } catch (_) {
            itemCount = null;
          }
        }
        items.push({
          name: entry.name,
          path: fullPath,
          isDirectory: isDir,
          size: isDir ? 0 : st.size,
          itemCount,
          mtime: st.mtime ? st.mtime.toISOString() : null,
          ext: isDir ? '' : path.extname(entry.name).toLowerCase(),
          deletable: ALLOW_SYSTEM_DELETE || isPathInside(fullPath, uploadsDir),
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

/**
 * Direct File Download API
 */
app.get('/api/fs/download', requireAuth, (req, res) => {
  const rawPath = req.query.path ? String(req.query.path) : '';
  if (!rawPath) return res.status(400).json({ error: 'Missing file path' });
  const resolvedPath = path.resolve(rawPath);
  try {
    if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isFile()) {
      return res.status(404).json({ error: 'File not found' });
    }
    res.download(resolvedPath, path.basename(resolvedPath));
  } catch (err) {
    res.status(500).json({ error: 'Failed to download file', details: err.message });
  }
});

/**
 * Create New Folder
 */
app.post('/api/fs/mkdir', requireAuth, (req, res) => {
  const parentDir = req.body?.dir ? String(req.body.dir).trim() : '';
  const name = req.body?.name ? String(req.body.name).trim() : '';
  if (!name || /[<>:"/\\|?*\x00-\x1F]/.test(name) || name === '.' || name === '..') {
    return res.status(400).json({ error: 'Invalid folder name' });
  }
  const baseDir = !parentDir || parentDir === '__UPLOADS__' ? uploadsDir : path.resolve(parentDir);
  const targetPath = path.join(baseDir, name);
  try {
    if (fs.existsSync(targetPath)) {
      return res.status(409).json({ error: 'A file or folder with that name already exists' });
    }
    fs.mkdirSync(targetPath, { recursive: true });
    res.json({ success: true, path: targetPath, name });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create folder', details: err.message });
  }
});

/**
 * Create New Text File
 */
app.post('/api/fs/mkfile', requireAuth, (req, res) => {
  const parentDir = req.body?.dir ? String(req.body.dir).trim() : '';
  const name = req.body?.name ? String(req.body.name).trim() : '';
  const content = typeof req.body?.content === 'string' ? req.body.content : '';
  if (!name || /[<>:"/\\|?*\x00-\x1F]/.test(name) || name === '.' || name === '..') {
    return res.status(400).json({ error: 'Invalid file name' });
  }
  const baseDir = !parentDir || parentDir === '__UPLOADS__' ? uploadsDir : path.resolve(parentDir);
  const targetPath = path.join(baseDir, name);
  try {
    if (fs.existsSync(targetPath)) {
      return res.status(409).json({ error: 'A file or folder with that name already exists' });
    }
    fs.writeFileSync(targetPath, content, 'utf8');
    res.json({ success: true, path: targetPath, name });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create file', details: err.message });
  }
});

/**
 * Rename File or Folder
 */
app.post('/api/fs/rename', requireAuth, (req, res) => {
  const rawPath = req.body?.path ? String(req.body.path).trim() : '';
  const newName = req.body?.newName ? String(req.body.newName).trim() : '';
  if (!rawPath || !newName || /[<>:"/\\|?*\x00-\x1F]/.test(newName) || newName === '.' || newName === '..') {
    return res.status(400).json({ error: 'Invalid file path or new name' });
  }
  const sourcePath = path.resolve(rawPath);
  const destPath = path.join(path.dirname(sourcePath), newName);
  try {
    if (!fs.existsSync(sourcePath)) {
      return res.status(404).json({ error: 'Source item not found' });
    }
    if (sourcePath !== destPath && fs.existsSync(destPath)) {
      return res.status(409).json({ error: 'Target name already exists in this folder' });
    }
    fs.renameSync(sourcePath, destPath);
    res.json({ success: true, oldPath: sourcePath, path: destPath, name: newName });
  } catch (err) {
    res.status(500).json({ error: 'Failed to rename item', details: err.message });
  }
});

/**
 * Copy File(s) or Folder(s)
 */
app.post('/api/fs/copy', requireAuth, (req, res) => {
  const sources = Array.isArray(req.body?.sources)
    ? req.body.sources
    : req.body?.sourcePath ? [req.body.sourcePath] : [];
  const rawDestDir = req.body?.destDir ? String(req.body.destDir).trim() : '';
  if (!sources.length || !rawDestDir) {
    return res.status(400).json({ error: 'Missing source items or destination directory' });
  }
  const destDir = rawDestDir === '__UPLOADS__' ? uploadsDir : path.resolve(rawDestDir);
  try {
    if (!fs.existsSync(destDir) || !fs.statSync(destDir).isDirectory()) {
      return res.status(404).json({ error: 'Destination directory does not exist' });
    }
    const copied = [];
    for (const rawSrc of sources) {
      const srcPath = path.resolve(String(rawSrc));
      if (!fs.existsSync(srcPath)) continue;
      const baseName = path.basename(srcPath);
      let targetPath = path.join(destDir, baseName);
      if (path.resolve(srcPath) === path.resolve(targetPath)) {
        const ext = path.extname(baseName);
        const stem = baseName.slice(0, baseName.length - ext.length);
        targetPath = path.join(destDir, `${stem}_copy_${Date.now().toString().slice(-4)}${ext}`);
      }
      copyRecursiveSync(srcPath, targetPath);
      copied.push(targetPath);
    }
    res.json({ success: true, copied });
  } catch (err) {
    res.status(500).json({ error: 'Failed to copy items', details: err.message });
  }
});

/**
 * Move File(s) or Folder(s)
 */
app.post('/api/fs/move', requireAuth, (req, res) => {
  const sources = Array.isArray(req.body?.sources)
    ? req.body.sources
    : req.body?.sourcePath ? [req.body.sourcePath] : [];
  const rawDestDir = req.body?.destDir ? String(req.body.destDir).trim() : '';
  if (!sources.length || !rawDestDir) {
    return res.status(400).json({ error: 'Missing source items or destination directory' });
  }
  const destDir = rawDestDir === '__UPLOADS__' ? uploadsDir : path.resolve(rawDestDir);
  try {
    if (!fs.existsSync(destDir) || !fs.statSync(destDir).isDirectory()) {
      return res.status(404).json({ error: 'Destination directory does not exist' });
    }
    const moved = [];
    for (const rawSrc of sources) {
      const srcPath = path.resolve(String(rawSrc));
      if (!fs.existsSync(srcPath)) continue;
      const targetPath = path.join(destDir, path.basename(srcPath));
      if (path.resolve(srcPath) === path.resolve(targetPath)) continue;
      moveEntrySync(srcPath, targetPath);
      moved.push(targetPath);
    }
    res.json({ success: true, moved });
  } catch (err) {
    res.status(500).json({ error: 'Failed to move items', details: err.message });
  }
});

/**
 * Delete Multiple Files or Folders
 */
app.post('/api/fs/delete', requireAuth, (req, res) => {
  if (req.headers['x-delete-unlocked'] !== 'true') {
    return res.status(403).json({ error: 'Delete lock is enabled. Unlock delete mode first.' });
  }
  const paths = Array.isArray(req.body?.paths)
    ? req.body.paths
    : req.body?.path ? [req.body.path] : [];
  if (!paths.length) {
    return res.status(400).json({ error: 'No paths provided to delete' });
  }
  try {
    const deleted = [];
    for (const raw of paths) {
      const targetPath = path.resolve(String(raw));
      if (!ALLOW_SYSTEM_DELETE && !isPathInside(targetPath, uploadsDir)) {
        return res.status(403).json({
          error: 'Delete is restricted to the uploads folder (set ALLOW_SYSTEM_DELETE=true to override).',
        });
      }
      if (fs.existsSync(targetPath)) {
        fs.rmSync(targetPath, { recursive: true, force: true });
        deleted.push(targetPath);
      }
    }
    res.json({ success: true, deleted });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete items', details: err.message });
  }
});

/**
 * Read & Save Text File Content (In-Browser Text Editor)
 */
app.get('/api/fs/content', requireAuth, (req, res) => {
  const rawPath = req.query.path ? String(req.query.path) : '';
  if (!rawPath) return res.status(400).json({ error: 'Missing file path' });
  const resolvedPath = path.resolve(rawPath);
  try {
    if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isFile()) {
      return res.status(404).json({ error: 'File not found' });
    }
    const st = fs.statSync(resolvedPath);
    if (st.size > 5 * 1024 * 1024) {
      return res.status(413).json({ error: 'File is too large for the text editor (> 5 MB)' });
    }
    const content = fs.readFileSync(resolvedPath, 'utf8');
    res.json({ path: resolvedPath, name: path.basename(resolvedPath), size: st.size, content });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read file content', details: err.message });
  }
});

app.put('/api/fs/content', requireAuth, (req, res) => {
  const rawPath = req.body?.path ? String(req.body.path) : '';
  const content = typeof req.body?.content === 'string' ? req.body.content : '';
  if (!rawPath) return res.status(400).json({ error: 'Missing file path' });
  const resolvedPath = path.resolve(rawPath);
  try {
    if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isFile()) {
      return res.status(404).json({ error: 'File not found' });
    }
    fs.writeFileSync(resolvedPath, content, 'utf8');
    const st = fs.statSync(resolvedPath);
    res.json({ success: true, path: resolvedPath, size: st.size });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save file content', details: err.message });
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
