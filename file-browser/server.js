import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const uploadsDir = path.resolve(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage for media uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniquePrefix = Date.now() + '-' + Math.round(Math.random() * 1e4);
    cb(null, `${uniquePrefix}_${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2 GB file upload limit
});

const app = express();
const server = http.createServer(app);

app.use(express.json());

// Enable CORS so external callers (IIS on port 80 or network LAN clients) can upload & browse
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-OBS-Password');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Serve uploaded media publicly for browser previews & OBS playback
app.use('/uploads', express.static(uploadsDir));

// Serve the standalone web interface
app.use(express.static(__dirname));

/**
 * Health Check API
 */
app.get('/api/status', (req, res) => {
  const reqPass = req.headers['x-obs-password'] || req.query.password || '';
  const configuredPass = process.env.FILE_SERVER_PASSWORD || process.env.OBS_PASSWORD || '';
  const authValid = !configuredPass || reqPass === configuredPass;

  res.json({
    service: 'OBS Host File Browser',
    status: 'online',
    port: PORT,
    uploadsDir,
    authRequired: Boolean(configuredPass),
    authValid: authValid,
    time: new Date().toISOString(),
  });
});

/**
 * Direct File Upload API
 * Accepts multipart/form-data with field 'media'
 * Returns the exact absolute disk path required by OBS Studio
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
 * Delete Uploaded Media
 */
app.delete('/api/media/:filename', (req, res) => {
  const filename = req.params.filename;
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
 * Filesystem Browser API
 * Enables browsing files and folders on the host machine
 */
app.get('/api/fs/browse', (req, res) => {
  try {
    let requestedDir = req.query.dir ? String(req.query.dir) : '';
    if (!requestedDir || requestedDir === '__UPLOADS__') {
      requestedDir = uploadsDir;
    } else if (requestedDir === '__ROOT__' || requestedDir === '__PROJECT__') {
      requestedDir = __dirname;
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
        items.push({
          name: entry.name,
          path: fullPath,
          isDirectory: isDir,
          size: size,
          ext: path.extname(entry.name).toLowerCase(),
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
      parentDir: parentDir !== targetDir ? parentDir : null,
      uploadsDir: uploadsDir,
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
  console.log(`[File Server] Standalone File Browser running at http://0.0.0.0:${PORT}`);
});
