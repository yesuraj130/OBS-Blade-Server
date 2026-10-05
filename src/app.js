/**
 * OBS Blade - Exact Replication of User App
 * Pure Native Web Client (HTML5 / Vanilla ES6 / CSS3)
 */

import { ObsClient } from './obs-client.js';
import { getMediaPresets, saveMediaPreset } from './presets.js';

// State
const state = {
  obs: new ObsClient(),
  url: '',
  password: '',
  studioMode: true,
  currentProgramScene: 'Verse Bottom',
  currentPreviewScene: 'Testimony',
  selectedCategoryScene: '__CURRENT__',
  scenes: [],
  sceneItems: [],
  isPreviewExpanded: false,
  selectedMediaSource: null,
  isStreaming: false,
  isRecording: false,
  hiddenSceneButtons: new Set(),
  hiddenSceneTabs: new Set(),
  wakeLockEnabled: false,
  clientStudioModeControls: true,
};

// DOM Elements
const el = {
  // App Bar
  btnTopClose: document.getElementById('btn-top-close'),
  navTopTitle: document.getElementById('nav-top-title'),
  btnTopMenu: document.getElementById('btn-top-menu'),

  // Top Scene Buttons Grid & Studio Controls
  scenesGridTop: document.getElementById('scenes-grid-top'),
  studioModeRowContainer: document.getElementById('studio-mode-row-container'),
  studioModeToggle: document.getElementById('studio-mode-toggle'),
  checkboxStudio: document.getElementById('checkbox-studio'),
  btnTriggerTransition: document.getElementById('btn-trigger-transition'),

  // Preview Collapsible
  previewToggleBar: document.getElementById('preview-toggle-bar'),
  previewChevron: document.getElementById('preview-chevron'),
  previewAccordionBody: document.getElementById('preview-accordion-body'),
  previewLiveImg: document.getElementById('preview-live-img'),
  previewEmptyText: document.getElementById('preview-empty-text'),
  btnPreviewRefresh: document.getElementById('btn-preview-refresh'),

  // Category / Scene Text Grid
  categoryTextGrid: document.getElementById('category-text-grid'),

  // Sources List
  sourcesListContainer: document.getElementById('sources-list-container'),

  // Three-dots Anchored Dropdown Menu
  dropdownMenuOverlay: document.getElementById('dropdown-menu-overlay'),
  dropdownMenuCard: document.getElementById('dropdown-menu-card'),
  btnMenuEditButtons: document.getElementById('btn-menu-edit-buttons'),
  btnMenuEditTabs: document.getElementById('btn-menu-edit-tabs'),
  btnMenuSettings: document.getElementById('btn-menu-settings'),
  btnMenuToggleStream: document.getElementById('btn-menu-toggle-stream'),
  textMenuStream: document.getElementById('text-menu-stream'),
  btnMenuToggleRecord: document.getElementById('btn-menu-toggle-record'),
  textMenuRecord: document.getElementById('text-menu-record'),

  // Edit Scene Buttons Modal
  modalEditScenes: document.getElementById('modal-edit-scenes'),
  btnBackEditScenes: document.getElementById('btn-back-edit-scenes'),
  btnCloseEditScenes: document.getElementById('btn-close-edit-scenes'),
  editScenesCheckboxList: document.getElementById('edit-scenes-checkbox-list'),

  // Edit Scene Tabs Modal
  modalEditTabs: document.getElementById('modal-edit-tabs'),
  btnBackEditTabs: document.getElementById('btn-back-edit-tabs'),
  btnCloseEditTabs: document.getElementById('btn-close-edit-tabs'),
  editTabsCheckboxList: document.getElementById('edit-tabs-checkbox-list'),

  // Settings Modal
  modalSettings: document.getElementById('modal-settings'),
  btnBackSettings: document.getElementById('btn-back-settings'),
  btnCloseSettings: document.getElementById('btn-close-settings'),
  toggleWakeLock: document.getElementById('toggle-wake-lock'),
  toggleClientStudio: document.getElementById('toggle-client-studio'),
  formSettingsConn: document.getElementById('form-settings-conn'),
  setIp: document.getElementById('set-ip'),
  setPort: document.getElementById('set-port'),
  setPass: document.getElementById('set-pass'),
  btnUseSim: document.getElementById('btn-use-sim'),

  // Media Modal
  modalMediaFile: document.getElementById('modal-media-file'),
  btnBackMediaModal: document.getElementById('btn-back-media-modal'),
  btnCloseMediaModal: document.getElementById('btn-close-media-modal'),
  mediaSourceTitle: document.getElementById('media-source-title'),
  mediaCurrentPathText: document.getElementById('media-current-path-text'),
  inputNewMediaPath: document.getElementById('input-new-media-path'),
  btnApplyPath: document.getElementById('btn-apply-path'),
  mediaPresetContainer: document.getElementById('media-preset-container'),
  mediaUploadedContainer: document.getElementById('media-uploaded-container'),
  mediaFileInput: document.getElementById('media-file-input'),
  mediaUploadDropzone: document.getElementById('media-upload-dropzone'),
  uploadStatus: document.getElementById('upload-status'),
  tabBtnUploaded: document.getElementById('tab-btn-uploaded'),
  tabBtnPresets: document.getElementById('tab-btn-presets'),
};

// Wake lock sentinel instance
let wakeLockSentinel = null;

export function init() {
  loadSavedCredentials();
  loadSavedPreferences();
  loadHiddenScenePreferences();
  loadHiddenTabPreferences();
  applyClientStudioModeControls();
  setupEventListeners();
  setupObsEvents();

  if (state.wakeLockEnabled) {
    requestWakeLock();
  }

  if (state.url) {
    state.obs.connect(state.url, state.password);
  } else {
    connectToLocalSimulator();
  }
}

function loadSavedPreferences() {
  try {
    const rawWakeLock = localStorage.getItem('obs_blade_wakelock');
    state.wakeLockEnabled = rawWakeLock === 'true';

    const rawStudioControls = localStorage.getItem('obs_blade_client_studio_mode_controls');
    state.clientStudioModeControls = rawStudioControls === null ? true : rawStudioControls === 'true';
  } catch (e) {}
}

function applyClientStudioModeControls() {
  if (el.studioModeRowContainer) {
    el.studioModeRowContainer.style.display = state.clientStudioModeControls ? 'flex' : 'none';
  }
  if (el.toggleClientStudio) {
    el.toggleClientStudio.checked = state.clientStudioModeControls;
  }
  renderTopSceneButtons();
}

async function requestWakeLock() {
  if (!('wakeLock' in navigator)) {
    console.info('[WakeLock] Screen Wake Lock API is not supported in this browser.');
    return;
  }
  try {
    if (wakeLockSentinel) {
      await wakeLockSentinel.release();
    }
    wakeLockSentinel = await navigator.wakeLock.request('screen');
    wakeLockSentinel.addEventListener('release', () => {
      wakeLockSentinel = null;
    });
    console.log('[WakeLock] Screen Wake Lock active');
  } catch (err) {
    console.warn('[WakeLock] Could not acquire lock:', err);
  }
}

async function releaseWakeLock() {
  if (wakeLockSentinel) {
    try {
      await wakeLockSentinel.release();
    } catch (_) {}
    wakeLockSentinel = null;
    console.log('[WakeLock] Screen Wake Lock released');
  }
}

// Re-acquire wake lock if tab becomes visible again
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && state.wakeLockEnabled) {
    requestWakeLock();
  }
});

function loadSavedCredentials() {
  try {
    const host = localStorage.getItem('obs_blade_ip');
    const port = localStorage.getItem('obs_blade_port');
    const pass = localStorage.getItem('obs_blade_pw');

    if (host) {
      el.setIp.value = host;
      el.setPort.value = port || '4455';
      el.setPass.value = pass || '';
      state.password = pass || '';

      const isSecure = location.protocol === 'https:';
      const protocol = isSecure && host === location.hostname ? 'wss://' : 'ws://';
      state.url = `${protocol}${host}:${port || '4455'}`;
    }
  } catch (e) {
    console.warn(e);
  }
}

function saveCredentials(host, port, pass) {
  try {
    localStorage.setItem('obs_blade_ip', host);
    localStorage.setItem('obs_blade_port', port);
    localStorage.setItem('obs_blade_pw', pass);
  } catch (e) {}
}

function loadHiddenScenePreferences() {
  try {
    const raw = localStorage.getItem('obs_hidden_scene_buttons');
    if (raw) {
      const parsed = JSON.parse(raw);
      state.hiddenSceneButtons = new Set(parsed);
    }
  } catch (e) {}
}

function saveHiddenScenePreferences() {
  try {
    localStorage.setItem(
      'obs_hidden_scene_buttons',
      JSON.stringify(Array.from(state.hiddenSceneButtons))
    );
  } catch (e) {}
}

function loadHiddenTabPreferences() {
  try {
    const raw = localStorage.getItem('obs_hidden_scene_tabs');
    if (raw) {
      const parsed = JSON.parse(raw);
      state.hiddenSceneTabs = new Set(parsed);
    }
  } catch (e) {}
}

function saveHiddenTabPreferences() {
  try {
    localStorage.setItem(
      'obs_hidden_scene_tabs',
      JSON.stringify(Array.from(state.hiddenSceneTabs))
    );
  } catch (e) {}
}

function connectToLocalSimulator() {
  const isSecure = location.protocol === 'https:';
  const protocol = isSecure ? 'wss://' : 'ws://';
  state.url = `${protocol}${location.host}/obs-ws`;
  state.password = '';
  state.obs.connect(state.url, '');
}

function setupObsEvents() {
  state.obs.on('status', ({ status }) => {
    if (status === 'connected') {
      el.navTopTitle.textContent = 'OBS Dashboard';
    } else if (status === 'connecting') {
      el.navTopTitle.textContent = 'Connecting...';
    } else {
      el.navTopTitle.textContent = 'OBS Dashboard (Offline)';
    }
  });

  state.obs.on('synced', (data) => {
    state.studioMode = data.studioMode;
    state.scenes = data.scenes;
    state.currentProgramScene = data.currentProgramScene;
    state.currentPreviewScene = data.currentPreviewScene || data.currentProgramScene;
    if (!state.selectedCategoryScene) {
      state.selectedCategoryScene = '__CURRENT__';
    }

    syncStudioModeCheckbox();
    renderTopSceneButtons();
    renderCategoryGrid();
    loadSourcesForScene(state.selectedCategoryScene);
  });

  state.obs.on('programSceneChanged', (sceneName) => {
    state.currentProgramScene = sceneName;
    renderTopSceneButtons();
    renderCategoryGrid();
    if (state.selectedCategoryScene === '__CURRENT__') {
      loadSourcesForScene('__CURRENT__');
    }
  });

  state.obs.on('previewSceneChanged', (sceneName) => {
    state.currentPreviewScene = sceneName;
    renderTopSceneButtons();
    renderCategoryGrid();
    if (state.selectedCategoryScene === '__CURRENT__') {
      loadSourcesForScene('__CURRENT__');
    }
  });

  state.obs.on('studioModeChanged', (enabled) => {
    state.studioMode = enabled;
    syncStudioModeCheckbox();
    renderTopSceneButtons();
  });

  state.obs.on('sceneItemsChanged', () => {
    loadSourcesForScene(state.selectedCategoryScene);
  });

  state.obs.on('streamStateChanged', ({ outputActive }) => {
    state.isStreaming = outputActive;
    el.textMenuStream.textContent = outputActive ? 'Stop Streaming' : 'Start Streaming';
  });

  state.obs.on('recordStateChanged', ({ outputActive }) => {
    state.isRecording = outputActive;
    el.textMenuRecord.textContent = outputActive ? 'Stop Recording' : 'Start Recording';
  });
}

function setupEventListeners() {
  // Top Close Button: Disconnect & Open Connection Settings
  el.btnTopClose.addEventListener('click', (e) => {
    e.preventDefault();
    state.obs.disconnect();
    openSettingsModal();
  });

  // Top Menu Dots Button: Toggle Anchored Dropdown Popup
  el.btnTopMenu.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleDropdownMenu();
  });

  // Click outside to close dropdown
  el.dropdownMenuOverlay.addEventListener('click', (e) => {
    if (e.target === el.dropdownMenuOverlay) {
      e.preventDefault();
      closeDropdownMenu();
    }
  });

  // Three-dots dropdown menu action handlers
  el.btnMenuSettings.addEventListener('click', (e) => {
    e.preventDefault();
    closeDropdownMenu();
    openSettingsModal();
  });
  el.btnMenuEditButtons.addEventListener('click', (e) => {
    e.preventDefault();
    closeDropdownMenu();
    openEditScenesModal();
  });
  el.btnMenuEditTabs.addEventListener('click', (e) => {
    e.preventDefault();
    closeDropdownMenu();
    openEditTabsModal();
  });
  el.btnMenuToggleStream.addEventListener('click', async (e) => {
    e.preventDefault();
    closeDropdownMenu();
    try {
      await state.obs.toggleStream();
    } catch (err) {
      alert(`Stream error: ${err.message}`);
    }
  });
  el.btnMenuToggleRecord.addEventListener('click', async (e) => {
    e.preventDefault();
    closeDropdownMenu();
    try {
      await state.obs.toggleRecord();
    } catch (err) {
      alert(`Record error: ${err.message}`);
    }
  });

  // Edit Scene Buttons Modal
  if (el.btnBackEditScenes) {
    el.btnBackEditScenes.addEventListener('click', (e) => {
      e.preventDefault();
      closeEditScenesModal();
    });
  }
  el.btnCloseEditScenes.addEventListener('click', (e) => {
    e.preventDefault();
    closeEditScenesModal();
  });

  // Edit Scene Tabs Modal
  if (el.btnBackEditTabs) {
    el.btnBackEditTabs.addEventListener('click', (e) => {
      e.preventDefault();
      closeEditTabsModal();
    });
  }
  el.btnCloseEditTabs.addEventListener('click', (e) => {
    e.preventDefault();
    closeEditTabsModal();
  });

  // Studio Mode Checkbox Toggle
  el.studioModeToggle.addEventListener('click', async (e) => {
    e.preventDefault();
    const next = !state.studioMode;
    try {
      await state.obs.setStudioModeEnabled(next);
      state.studioMode = next;
      syncStudioModeCheckbox();
      renderTopSceneButtons();
    } catch (err) {
      console.error(err);
    }
  });

  // Transition Button (Oval)
  el.btnTriggerTransition.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      await state.obs.triggerStudioModeTransition();
      if (state.isPreviewExpanded) {
        setTimeout(fetchPreviewSnapshot, 300);
      }
      if (state.selectedCategoryScene === '__CURRENT__') {
        setTimeout(() => loadSourcesForScene('__CURRENT__'), 150);
      }
    } catch (err) {
      console.error(err);
    }
  });

  // Preview Collapsible Header Toggle
  el.previewToggleBar.addEventListener('click', (e) => {
    e.preventDefault();
    state.isPreviewExpanded = !state.isPreviewExpanded;
    el.previewChevron.classList.toggle('expanded', state.isPreviewExpanded);
    el.previewAccordionBody.classList.toggle('open', state.isPreviewExpanded);

    if (state.isPreviewExpanded) {
      fetchPreviewSnapshot();
    }
  });

  // Refresh Preview button
  el.btnPreviewRefresh.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    fetchPreviewSnapshot();
  });

  // Settings Modal Handlers
  if (el.btnBackSettings) {
    el.btnBackSettings.addEventListener('click', (e) => {
      e.preventDefault();
      closeSettingsModal();
    });
  }
  el.btnCloseSettings.addEventListener('click', (e) => {
    e.preventDefault();
    closeSettingsModal();
  });

  if (el.toggleWakeLock) {
    el.toggleWakeLock.addEventListener('change', async (e) => {
      state.wakeLockEnabled = e.target.checked;
      try {
        localStorage.setItem('obs_blade_wakelock', String(state.wakeLockEnabled));
      } catch (_) {}

      if (state.wakeLockEnabled) {
        await requestWakeLock();
      } else {
        await releaseWakeLock();
      }
    });
  }

  if (el.toggleClientStudio) {
    el.toggleClientStudio.addEventListener('change', (e) => {
      state.clientStudioModeControls = e.target.checked;
      try {
        localStorage.setItem(
          'obs_blade_client_studio_mode_controls',
          String(state.clientStudioModeControls)
        );
      } catch (_) {}

      applyClientStudioModeControls();
    });
  }
  el.formSettingsConn.addEventListener('submit', (e) => {
    e.preventDefault();
    const host = el.setIp.value.trim() || '127.0.0.1';
    const port = el.setPort.value.trim() || '4455';
    const pass = el.setPass.value;

    saveCredentials(host, port, pass);
    const protocol = location.protocol === 'https:' && host === location.hostname ? 'wss://' : 'ws://';
    state.url = `${protocol}${host}:${port}`;
    state.password = pass;

    state.obs.connect(state.url, state.password);
    closeSettingsModal();
  });

  el.btnUseSim.addEventListener('click', (e) => {
    e.preventDefault();
    connectToLocalSimulator();
    closeSettingsModal();
  });

  // Media Modal Handlers
  if (el.btnBackMediaModal) {
    el.btnBackMediaModal.addEventListener('click', (e) => {
      e.preventDefault();
      closeMediaModal();
    });
  }
  el.btnCloseMediaModal.addEventListener('click', (e) => {
    e.preventDefault();
    closeMediaModal();
  });

  // Backdrop click to dismiss centered dialogs
  [el.modalEditScenes, el.modalEditTabs, el.modalSettings, el.modalMediaFile].forEach((overlay) => {
    if (!overlay) return;
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('open');
      }
    });
  });
  el.btnApplyPath.addEventListener('click', async (e) => {
    e.preventDefault();
    const newPath = el.inputNewMediaPath.value.trim();
    if (newPath && state.selectedMediaSource) {
      await updateMediaFilePath(state.selectedMediaSource, newPath);
      closeMediaModal();
    }
  });

  // Direct File Upload & Tab Switchers
  if (el.mediaUploadDropzone && el.mediaFileInput) {
    el.mediaUploadDropzone.addEventListener('click', () => {
      el.mediaFileInput.click();
    });

    el.mediaFileInput.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (file && state.selectedMediaSource) {
        await handleMediaUpload(file, state.selectedMediaSource);
      }
    });

    el.mediaUploadDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      el.mediaUploadDropzone.classList.add('dragover');
    });

    el.mediaUploadDropzone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      el.mediaUploadDropzone.classList.remove('dragover');
    });

    el.mediaUploadDropzone.addEventListener('drop', async (e) => {
      e.preventDefault();
      el.mediaUploadDropzone.classList.remove('dragover');
      const file = e.dataTransfer?.files?.[0];
      if (file && state.selectedMediaSource) {
        await handleMediaUpload(file, state.selectedMediaSource);
      }
    });
  }

  if (el.tabBtnUploaded && el.tabBtnPresets) {
    el.tabBtnUploaded.addEventListener('click', () => {
      el.tabBtnUploaded.classList.add('active');
      el.tabBtnPresets.classList.remove('active');
      el.mediaUploadedContainer.style.display = 'flex';
      el.mediaPresetContainer.style.display = 'none';
    });

    el.tabBtnPresets.addEventListener('click', () => {
      el.tabBtnPresets.classList.add('active');
      el.tabBtnUploaded.classList.remove('active');
      el.mediaPresetContainer.style.display = 'flex';
      el.mediaUploadedContainer.style.display = 'none';
    });
  }
}

function syncStudioModeCheckbox() {
  el.checkboxStudio.classList.toggle('checked', state.studioMode);
  el.btnTriggerTransition.classList.toggle('show', state.studioMode);
}

// 2. Render Top Scene Buttons Grid (4 Columns, with visibility filter)
function renderTopSceneButtons() {
  el.scenesGridTop.innerHTML = '';

  const visibleScenes = state.scenes.filter(
    (s) => !state.hiddenSceneButtons.has(s.sceneName)
  );

  visibleScenes.forEach((scene) => {
    const isProgram = scene.sceneName === state.currentProgramScene;
    const isPreview =
      state.clientStudioModeControls &&
      state.studioMode &&
      scene.sceneName === state.currentPreviewScene &&
      !isProgram;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `scene-block-btn ${isProgram ? 'active-program' : ''} ${isPreview ? 'active-preview' : ''}`;
    btn.textContent = scene.sceneName;

    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        if (state.clientStudioModeControls && state.studioMode) {
          await state.obs.setCurrentPreviewScene(scene.sceneName);
          state.currentPreviewScene = scene.sceneName;
        } else {
          // Direct Program output switch (no preview monitoring on client)
          await state.obs.setCurrentProgramScene(scene.sceneName);
          state.currentProgramScene = scene.sceneName;
        }
        // Do not force-track current scene in individual scene tabs
        renderTopSceneButtons();
        renderCategoryGrid();

        if (state.selectedCategoryScene === '__CURRENT__') {
          loadSourcesForScene('__CURRENT__');
        }
      } catch (err) {
        console.error(err);
      }
    });

    el.scenesGridTop.appendChild(btn);
  });
}

function getCurrentTargetScene() {
  if (state.clientStudioModeControls && state.studioMode) {
    return state.currentPreviewScene || state.currentProgramScene;
  }
  return state.currentProgramScene;
}

// 4. Render Category / Scene Text Tabs (with dynamic "Current" tab as the last tab and organic flow)
function renderCategoryGrid() {
  el.categoryTextGrid.innerHTML = '';

  // 1. Individual Pinned Scene Tabs (do not change when active scene changes)
  const visibleTabs = state.scenes.filter(
    (s) => !state.hiddenSceneTabs.has(s.sceneName)
  );

  visibleTabs.forEach((scene) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    const isSelected = state.selectedCategoryScene === scene.sceneName;
    btn.className = `category-text-btn ${isSelected ? 'selected' : ''}`;
    btn.textContent = scene.sceneName;

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      state.selectedCategoryScene = scene.sceneName;
      renderCategoryGrid();
      loadSourcesForScene(scene.sceneName);
    });

    el.categoryTextGrid.appendChild(btn);
  });

  // 2. Dynamic "Current" Scene Tab as Last Tab (shows active Program / Preview output sources)
  const currentTarget = getCurrentTargetScene();
  const isCurrentActive = state.selectedCategoryScene === '__CURRENT__';

  const btnCurrent = document.createElement('button');
  btnCurrent.type = 'button';
  btnCurrent.className = `category-text-btn ${isCurrentActive ? 'selected' : ''}`;
  btnCurrent.innerHTML = currentTarget
    ? `Current <span class="tab-scene-hint">(${escapeHtml(currentTarget)})</span>`
    : `Current`;
  btnCurrent.title = `Current Program/Preview Output: ${currentTarget || 'None'}`;

  btnCurrent.addEventListener('click', (e) => {
    e.preventDefault();
    state.selectedCategoryScene = '__CURRENT__';
    renderCategoryGrid();
    loadSourcesForScene('__CURRENT__');
  });

  el.categoryTextGrid.appendChild(btnCurrent);
}

// 5. Load and Render Sources in Pure Black List
// In-memory cache for source thumbnails: sourceName -> { dataUrl, isError, timestamp }
const thumbnailCache = new Map();

/**
 * Determine high-level source category for type-specific fallback icons
 */
function getSourceTypeCategory(item) {
  const kind = (item?.inputKind || '').toLowerCase();
  const name = (item?.sourceName || '').toLowerCase();

  if (
    kind.includes('image') ||
    /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(name) ||
    name.includes('slide') ||
    name.includes('banner') ||
    name.includes('logo') ||
    name.includes('graphic')
  ) {
    return 'image';
  }

  if (
    kind.includes('ffmpeg') ||
    kind.includes('vlc') ||
    kind.includes('media') ||
    /\.(mp4|mkv|mov|webm|avi|flv)$/i.test(name) ||
    name.includes('video') ||
    name.includes('countdown') ||
    name.includes('clip')
  ) {
    return 'video';
  }

  if (
    kind.includes('dshow') ||
    kind.includes('v4l2') ||
    kind.includes('av_capture') ||
    name.includes('cam') ||
    name.includes('camera') ||
    name.includes('webcam')
  ) {
    return 'camera';
  }

  if (
    kind.includes('audio') ||
    kind.includes('wasapi') ||
    kind.includes('pulse') ||
    kind.includes('alsa') ||
    kind.includes('coreaudio') ||
    name.includes('mic') ||
    name.includes('audio') ||
    name.includes('bgm') ||
    name.includes('sound') ||
    name.includes('music')
  ) {
    return 'audio';
  }

  if (
    kind.includes('browser') ||
    name.includes('browser') ||
    name.includes('web') ||
    name.includes('url')
  ) {
    return 'browser';
  }

  if (
    kind.includes('text') ||
    name.includes('text') ||
    name.includes('lyrics') ||
    name.includes('title') ||
    name.includes('lowerthird') ||
    name.includes('credits')
  ) {
    return 'text';
  }

  if (
    kind.includes('monitor') ||
    kind.includes('window') ||
    kind.includes('game') ||
    name.includes('screen') ||
    name.includes('display') ||
    name.includes('desktop')
  ) {
    return 'screen';
  }

  return 'generic';
}

/**
 * Clean SVG outline icons for each source category
 */
function getTypeIconSvg(category) {
  switch (category) {
    case 'image':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>`;

    case 'video':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="23 7 16 12 23 17 23 7"/>
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
      </svg>`;

    case 'camera':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
        <circle cx="12" cy="13" r="4"/>
      </svg>`;

    case 'audio':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="23"/>
        <line x1="8" y1="23" x2="16" y2="23"/>
      </svg>`;

    case 'browser':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="2" y1="12" x2="22" y2="12"/>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      </svg>`;

    case 'text':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="4 7 4 4 20 4 20 7"/>
        <line x1="9" y1="20" x2="15" y2="20"/>
        <line x1="12" y1="4" x2="12" y2="20"/>
      </svg>`;

    case 'screen':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
        <line x1="8" y1="21" x2="16" y2="21"/>
        <line x1="12" y1="17" x2="12" y2="21"/>
      </svg>`;

    case 'generic':
    default:
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="12 2 2 7 12 12 22 7 12 2"/>
        <polyline points="2 17 12 22 22 17"/>
        <polyline points="2 12 12 17 22 12"/>
      </svg>`;
  }
}

/**
 * Load source thumbnail dynamically via OBS WebSocket GetSourceScreenshot
 * Falls back to generic category icon if unavailable or error
 */
async function loadSourceThumbnail(sourceName, category, imgEl, fallbackEl) {
  // Audio sources don't produce visual frames; immediately show fallback icon
  if (category === 'audio') {
    imgEl.style.display = 'none';
    fallbackEl.style.display = 'flex';
    return;
  }

  const now = Date.now();
  const cached = thumbnailCache.get(sourceName);
  if (cached && now - cached.timestamp < 30000) {
    if (cached.dataUrl) {
      imgEl.src = cached.dataUrl;
      imgEl.style.display = 'block';
      fallbackEl.style.display = 'none';
      return;
    } else if (cached.isError) {
      imgEl.style.display = 'none';
      fallbackEl.style.display = 'flex';
      return;
    }
  }

  try {
    const res = await state.obs.getSourceScreenshot(sourceName, 'jpg', 96);
    if (res && res.imageData) {
      thumbnailCache.set(sourceName, { dataUrl: res.imageData, timestamp: now });
      imgEl.src = res.imageData;
      imgEl.onload = () => {
        imgEl.style.display = 'block';
        fallbackEl.style.display = 'none';
      };
      imgEl.onerror = () => {
        imgEl.style.display = 'none';
        fallbackEl.style.display = 'flex';
      };
    } else {
      thumbnailCache.set(sourceName, { isError: true, timestamp: now });
      imgEl.style.display = 'none';
      fallbackEl.style.display = 'flex';
    }
  } catch (err) {
    // If OBS reports error (source offline, audio-only, or inactive), gracefully fall back
    thumbnailCache.set(sourceName, { isError: true, timestamp: now });
    imgEl.style.display = 'none';
    fallbackEl.style.display = 'flex';
  }
}

async function loadSourcesForScene(sceneName) {
  const target =
    sceneName === '__CURRENT__' || !sceneName
      ? getCurrentTargetScene()
      : sceneName;

  if (!target) return;

  try {
    const res = await state.obs.getSceneItemList(target);
    state.sceneItems = res.sceneItems || [];
    renderSourcesList(target, state.sceneItems);
  } catch (err) {
    console.warn(err);
  }
}

function renderSourcesList(sceneName, items) {
  el.sourcesListContainer.innerHTML = '';

  if (!items || items.length === 0) {
    el.sourcesListContainer.innerHTML = `
      <div style="padding: 24px; text-align: center; color: var(--obs-text-gray); font-size: 13px;">
        No sources in "${escapeHtml(sceneName)}"
      </div>
    `;
    return;
  }

  items.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'source-item-row-blade';

    const category = getSourceTypeCategory(item);
    const categoryLabel = category.toUpperCase();

    row.innerHTML = `
      <div class="source-left-col">
        <!-- Thumbnail / Type Icon Box -->
        <div class="source-thumb-box" title="${escapeHtml(item.sourceName)} (${categoryLabel})">
          <div class="source-type-icon-fallback type-${category}">
            ${getTypeIconSvg(category)}
          </div>
          <img class="source-thumb-img" alt="" style="display: none;" />
        </div>
        <div class="source-name-col">
          <span class="source-name-blade">${escapeHtml(item.sourceName)}</span>
          <span class="source-type-subtext">${categoryLabel}</span>
        </div>
      </div>
      <div class="source-right-actions">
        <!-- Eye Icon Button -->
        <button type="button" class="btn-blade-eye ${item.sceneItemEnabled ? 'visible' : 'hidden'}" title="Toggle Visibility">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            ${
              item.sceneItemEnabled
                ? `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3" fill="currentColor"/>`
                : `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`
            }
          </svg>
        </button>

        <!-- Three Interlocking Circles (Venn / Filters / Media Settings) -->
        <button type="button" class="btn-blade-filters" title="Source Settings / Change File">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="8" r="5"/>
            <circle cx="8" cy="15" r="5"/>
            <circle cx="16" cy="15" r="5"/>
          </svg>
        </button>
      </div>
    `;

    // Load actual thumbnail or display fallback icon
    const thumbImg = row.querySelector('.source-thumb-img');
    const fallbackBox = row.querySelector('.source-type-icon-fallback');
    loadSourceThumbnail(item.sourceName, category, thumbImg, fallbackBox);

    // Eye button toggle
    const btnEye = row.querySelector('.btn-blade-eye');
    btnEye.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        const next = !item.sceneItemEnabled;
        await state.obs.setSceneItemEnabled(sceneName, item.sceneItemId, next);
        item.sceneItemEnabled = next;
        renderSourcesList(sceneName, items);
      } catch (err) {
        console.error(err);
      }
    });

    // Interlocking circles / settings button
    const btnFilters = row.querySelector('.btn-blade-filters');
    btnFilters.addEventListener('click', (e) => {
      e.preventDefault();
      openMediaModal(item.sourceName);
    });

    el.sourcesListContainer.appendChild(row);
  });
}

// Edit Scene Button Visibility Modal
function openEditScenesModal() {
  el.editScenesCheckboxList.innerHTML = '';

  state.scenes.forEach((scene) => {
    const isVisible = !state.hiddenSceneButtons.has(scene.sceneName);

    const row = document.createElement('div');
    row.className = 'scene-checkbox-row';
    row.innerHTML = `
      <span style="font-size: 14px; font-weight: 500; color: #fff;">${escapeHtml(scene.sceneName)}</span>
      <div class="checkbox-custom ${isVisible ? 'checked' : ''}" style="width: 20px; height: 20px;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
    `;

    row.addEventListener('click', (e) => {
      e.preventDefault();
      if (state.hiddenSceneButtons.has(scene.sceneName)) {
        state.hiddenSceneButtons.delete(scene.sceneName);
      } else {
        state.hiddenSceneButtons.add(scene.sceneName);
      }
      saveHiddenScenePreferences();
      renderTopSceneButtons();
      openEditScenesModal();
    });

    el.editScenesCheckboxList.appendChild(row);
  });

  el.modalEditScenes.classList.add('open');
}

function closeEditScenesModal() {
  el.modalEditScenes.classList.remove('open');
}

// Edit Scene Tab Visibility Modal (Lower Grid)
function openEditTabsModal() {
  el.editTabsCheckboxList.innerHTML = '';

  state.scenes.forEach((scene) => {
    const isVisible = !state.hiddenSceneTabs.has(scene.sceneName);

    const row = document.createElement('div');
    row.className = 'scene-checkbox-row';
    row.innerHTML = `
      <span style="font-size: 14px; font-weight: 500; color: #fff;">${escapeHtml(scene.sceneName)}</span>
      <div class="checkbox-custom ${isVisible ? 'checked' : ''}" style="width: 20px; height: 20px;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
    `;

    row.addEventListener('click', (e) => {
      e.preventDefault();
      if (state.hiddenSceneTabs.has(scene.sceneName)) {
        state.hiddenSceneTabs.delete(scene.sceneName);
      } else {
        state.hiddenSceneTabs.add(scene.sceneName);
      }
      saveHiddenTabPreferences();
      renderCategoryGrid();
      openEditTabsModal();
    });

    el.editTabsCheckboxList.appendChild(row);
  });

  el.modalEditTabs.classList.add('open');
}

function closeEditTabsModal() {
  el.modalEditTabs.classList.remove('open');
}

// Preview Snapshot
async function fetchPreviewSnapshot() {
  const target =
    state.clientStudioModeControls && state.studioMode
      ? state.currentPreviewScene
      : state.currentProgramScene;
  if (!target) return;

  try {
    const res = await state.obs.getSourceScreenshot(target, 'jpg', 640);
    if (res.imageData) {
      el.previewLiveImg.src = res.imageData;
      el.previewLiveImg.style.display = 'block';
      el.previewEmptyText.style.display = 'none';
    }
  } catch (err) {
    console.warn(err);
  }
}

// Media Modal Logic
async function openMediaModal(sourceName) {
  state.selectedMediaSource = sourceName;
  el.mediaSourceTitle.textContent = `Settings: "${sourceName}"`;
  el.mediaCurrentPathText.textContent = 'Loading path...';
  el.inputNewMediaPath.value = '';

  if (el.uploadStatus) {
    el.uploadStatus.style.display = 'none';
    el.uploadStatus.textContent = '';
  }

  // Load presets & uploaded media
  renderPresetsList(sourceName);
  loadUploadedMedia(sourceName);

  el.modalMediaFile.classList.add('open');

  try {
    const res = await state.obs.getInputSettings(sourceName);
    const settings = res.inputSettings || {};
    const path = settings.file || settings.local_file || 'No local file configured';
    el.mediaCurrentPathText.textContent = path;
    el.inputNewMediaPath.value = path;
  } catch (err) {
    el.mediaCurrentPathText.textContent = 'Could not read source settings';
  }
}

function closeMediaModal() {
  el.modalMediaFile.classList.remove('open');
  if (el.mediaFileInput) {
    el.mediaFileInput.value = '';
  }
}

async function handleMediaUpload(file, sourceName) {
  if (!file) return;

  if (el.uploadStatus) {
    el.uploadStatus.style.display = 'block';
    el.uploadStatus.textContent = `Uploading ${file.name}...`;
    el.uploadStatus.style.color = '#60a5fa';
  }

  const formData = new FormData();
  formData.append('media', file);

  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed (${response.status})`);
    }

    const data = await response.json();
    console.log('[Upload] Success:', data);

    if (el.uploadStatus) {
      el.uploadStatus.textContent = `✓ Uploaded! Applying to "${sourceName}"...`;
      el.uploadStatus.style.color = '#4ade80';
    }

    // Immediately update OBS source file path with absolute host path
    await updateMediaFilePath(sourceName, data.path);
    el.mediaCurrentPathText.textContent = data.path;
    el.inputNewMediaPath.value = data.path;

    // Refresh media library list
    await loadUploadedMedia(sourceName);

    setTimeout(() => {
      closeMediaModal();
    }, 1000);
  } catch (err) {
    console.error('[Upload Error]', err);
    if (el.uploadStatus) {
      el.uploadStatus.textContent = `Upload failed: ${err.message}`;
      el.uploadStatus.style.color = '#f87171';
    }
  }
}

async function loadUploadedMedia(sourceName) {
  if (!el.mediaUploadedContainer) return;
  el.mediaUploadedContainer.innerHTML = '<div style="font-size: 12px; color: #6b7280;">Loading uploaded files...</div>';

  try {
    const res = await fetch('/api/media');
    if (!res.ok) throw new Error('Failed to load media list');
    const data = await res.json();
    const files = data.files || [];

    el.mediaUploadedContainer.innerHTML = '';

    if (files.length === 0) {
      el.mediaUploadedContainer.innerHTML =
        '<div style="font-size: 12px; color: #6b7280; padding: 12px; text-align: center;">No files uploaded yet. Drag or choose a file above to upload directly!</div>';
      return;
    }

    files.forEach((file) => {
      const card = document.createElement('div');
      card.className = 'uploaded-media-card';

      const isImage = /\.(png|jpe?g|gif|webp|svg)$/i.test(file.filename);
      const isVideo = /\.(mp4|webm|mov|mkv)$/i.test(file.filename);
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);

      card.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; overflow: hidden; flex: 1;">
          ${
            isImage
              ? `<img src="${file.url}" class="uploaded-media-thumb" alt="${escapeHtml(file.filename)}" />`
              : `<div class="uploaded-media-thumb" style="display: flex; align-items: center; justify-content: center; font-size: 10px; color: #93c5fd; font-weight: 700;">${isVideo ? 'VIDEO' : 'FILE'}</div>`
          }
          <div style="overflow: hidden; flex: 1;">
            <div style="font-size: 13px; font-weight: 600; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${escapeHtml(file.filename.replace(/^\d+-\d+_/, ''))}
            </div>
            <div style="font-size: 11px; color: #94a3b8; font-family: monospace;">${sizeMb} MB</div>
          </div>
        </div>
        <div style="display: flex; gap: 6px;">
          <button type="button" class="btn-select-media" style="background: var(--obs-blue); color: #fff; border: none; border-radius: 4px; padding: 6px 10px; font-size: 11px; font-weight: 700; cursor: pointer;">
            Select
          </button>
          <button type="button" class="btn-delete-media" style="background: #201318; color: #f87171; border: 1px solid #3f1a24; border-radius: 4px; padding: 6px 8px; font-size: 11px; cursor: pointer;" title="Delete file">
            ✕
          </button>
        </div>
      `;

      // Select button
      card.querySelector('.btn-select-media').addEventListener('click', async (e) => {
        e.preventDefault();
        await updateMediaFilePath(sourceName, file.path);
        closeMediaModal();
      });

      // Delete button
      card.querySelector('.btn-delete-media').addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (confirm(`Delete ${file.filename}?`)) {
          await fetch(`/api/media/${file.filename}`, { method: 'DELETE' });
          loadUploadedMedia(sourceName);
        }
      });

      el.mediaUploadedContainer.appendChild(card);
    });
  } catch (err) {
    el.mediaUploadedContainer.innerHTML = `<div style="font-size: 12px; color: #f87171;">Could not load media: ${err.message}</div>`;
  }
}

function renderPresetsList(sourceName) {
  el.mediaPresetContainer.innerHTML = '';
  const presets = getMediaPresets();

  presets.forEach((p) => {
    const item = document.createElement('div');
    item.style.cssText =
      'background: #090c14; padding: 10px 12px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; border: 1px solid #1a2233;';
    item.innerHTML = `
      <div>
        <div style="font-size: 13px; font-weight: 600; color: #fff;">${escapeHtml(p.name)}</div>
        <div style="font-size: 11px; color: #6b7280; font-family: monospace;">${escapeHtml(p.path)}</div>
      </div>
      <button type="button" style="background: var(--obs-blue); color: #fff; border: none; border-radius: 4px; padding: 4px 8px; font-size: 11px; font-weight: 600;">Select</button>
    `;

    item.addEventListener('click', async (e) => {
      e.preventDefault();
      await updateMediaFilePath(sourceName, p.path);
      closeMediaModal();
    });

    el.mediaPresetContainer.appendChild(item);
  });
}

async function updateMediaFilePath(sourceName, path) {
  try {
    const res = await state.obs.getInputSettings(sourceName);
    const kind = res.inputKind;
    const settings = {};
    if (kind === 'image_source') {
      settings.file = path;
    } else {
      settings.local_file = path;
    }

    await state.obs.setInputSettings(sourceName, settings);

    // Invalidate thumbnail cache and refresh sources list so new thumbnail appears immediately
    thumbnailCache.delete(sourceName);
    loadSourcesForScene(state.selectedCategoryScene);

    saveMediaPreset({
      id: String(Date.now()),
      name: path.split(/[\\/]/).pop() || path,
      path: path,
    });

    if (state.isPreviewExpanded) {
      setTimeout(fetchPreviewSnapshot, 300);
    }
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
}

// Three-Dots Anchored Dropdown Menu
function toggleDropdownMenu() {
  el.dropdownMenuOverlay.classList.toggle('open');
}

function closeDropdownMenu() {
  el.dropdownMenuOverlay.classList.remove('open');
}

// Settings Modal
function openSettingsModal() {
  if (el.toggleWakeLock) {
    el.toggleWakeLock.checked = state.wakeLockEnabled;
  }
  if (el.toggleClientStudio) {
    el.toggleClientStudio.checked = state.clientStudioModeControls;
  }
  el.modalSettings.classList.add('open');
}

function closeSettingsModal() {
  el.modalSettings.classList.remove('open');
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
