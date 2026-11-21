/**
 * OBS Host File Browser - Default Configuration
 *
 * Edit these values directly without modifying server.js.
 * Environment variables (PORT, FILE_SERVER_PASSWORD, MAX_UPLOAD_MB,
 * ALLOW_SYSTEM_DELETE) take priority over these values if explicitly set.
 * This file is loaded server-side only and is never served over HTTP.
 */
export default {
  port: 3000,
  password: '',
  maxUploadMb: 2048,
  allowSystemDelete: false,
  defaultDir: '', // Folder to open on startup (empty = Project Folder, or '__UPLOADS__', '__DRIVES__', or a folder path)
  defaultBookmarks: [
    // { name: 'OBS Media', path: 'C:\\OBS\\Media' },
  ],
};
