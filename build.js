import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.resolve(__dirname, 'dist');

// Clean and recreate dist
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

// Copy entire self-contained src directory into dist
fs.cpSync(path.resolve(__dirname, 'src'), distDir, { recursive: true });

// Also copy standalone file-browser into dist
const fileBrowserSrc = path.resolve(__dirname, 'file-browser');
if (fs.existsSync(fileBrowserSrc)) {
  fs.cpSync(fileBrowserSrc, path.join(distDir, 'file-browser'), { recursive: true });
}

console.log('[Build] Successfully generated static production bundle in /dist');

