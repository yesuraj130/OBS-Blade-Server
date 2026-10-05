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
import { ObsWebSocketSimulator } from './.obs-websocket-simulator/simulator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
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

  // Serve uploaded media files publicly for browser preview
  app.use('/uploads', express.static(uploadsDir));

  // Initialize and attach OBS WebSocket Simulator / Bridge on /obs-ws
  const simulator = new ObsWebSocketSimulator();
  simulator.attachToServer(server, '/obs-ws');

  // --- API Endpoints ---

  /**
   * Status and Server Diagnostics
   */
  app.get('/api/status', (_req, res) => {
    res.json({
      status: 'online',
      nodeVersion: process.version,
      port: PORT,
      uploadsDir: uploadsDir,
      simulatorAttached: true,
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
      let requestedDir = req.query.dir ? String(req.query.dir) : '';
      if (!requestedDir || requestedDir === '__UPLOADS__') {
        requestedDir = uploadsDir;
      } else if (requestedDir === '__PROJECT__') {
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
        projectDir: __dirname,
        entries: items,
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to browse directory', details: err.message });
    }
  });

  // --- Frontend Serving (Pure Express Static Serving - Zero Bundlers) ---
  const staticRoot = isProduction && fs.existsSync(path.resolve(__dirname, 'dist'))
    ? path.resolve(__dirname, 'dist')
    : __dirname;

  app.use(express.static(staticRoot));
  app.get('*', (_req, res) => {
    res.sendFile(path.resolve(staticRoot, 'index.html'));
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] OBS Blade Backend running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server Error] Failed to start server:', err);
  process.exit(1);
});
