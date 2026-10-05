/**
 * Desktop Media File Presets Management
 * Stores preset file paths and labels in localStorage for quick switching
 */

const STORAGE_KEY_PRESETS = 'obs_media_presets';

export const DEFAULT_PRESETS = [
  { id: '1', name: 'Sponsor A (Active)', path: 'C:\\Streams\\Assets\\Sponsor_Active.png' },
  { id: '2', name: 'Sponsor B (Promo)', path: 'C:\\Streams\\Assets\\Sponsor_Promo2.png' },
  { id: '3', name: 'BRB Animation Loop', path: 'C:\\Streams\\Videos\\BRB_Animation.mp4' },
  { id: '4', name: 'Starting Countdown', path: 'C:\\Streams\\Videos\\Starting_5min.mp4' },
  { id: '5', name: 'End Credits Video', path: 'C:\\Streams\\Videos\\Outro_Credits.mp4' },
];

export function getMediaPresets() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PRESETS);
    if (!raw) return DEFAULT_PRESETS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_PRESETS;
  } catch (_) {
    return DEFAULT_PRESETS;
  }
}

export function saveMediaPreset(preset) {
  const list = getMediaPresets().filter((p) => p.id !== preset.id);
  list.unshift(preset);
  localStorage.setItem(STORAGE_KEY_PRESETS, JSON.stringify(list));
  return list;
}

export function deleteMediaPreset(presetId) {
  const list = getMediaPresets().filter((p) => p.id !== presetId);
  localStorage.setItem(STORAGE_KEY_PRESETS, JSON.stringify(list));
  return list;
}
