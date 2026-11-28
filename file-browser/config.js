/**
 * OBS Host File Browser - Default Configuration
 *
 * Edit these values directly without modifying server.js.
 * Environment variables (PORT, FILE_SERVER_PASSWORD, DELETE_PASSWORD,
 * MAX_UPLOAD_MB) take priority over these values if explicitly set.
 * This file is loaded server-side only and is never served over HTTP.
 */
export default {
  port: 3000,
  password: '',
  deletePassword: '', // Password required when unlocking Delete Mode (even if empty, user must submit empty password)
  maxUploadMb: 2048,
  defaultDir: '', // Folder to open on startup (empty = System Drives / Root, or '__DRIVES__', '__PROJECT__', or a folder path)
  defaultBookmarks: [
    // { name: 'OBS Media', path: 'C:\\OBS\\Media' },
  ],
};
