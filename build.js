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

// Copy index.html and src directory
fs.copyFileSync(path.resolve(__dirname, 'index.html'), path.join(distDir, 'index.html'));
fs.cpSync(path.resolve(__dirname, 'src'), path.join(distDir, 'src'), { recursive: true });

console.log('[Build] Successfully generated static production bundle in /dist');
