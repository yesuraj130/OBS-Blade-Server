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
  selectedCategoryScene: 'Projector Back',
  scenes: [],
  sceneItems: [],
  isPreviewExpanded: false,
  selectedMediaSource: null,
  isStreaming: false,
  isRecording: false,
  hiddenSceneButtons: new Set(),
  hiddenSceneTabs: new Set(),
};

// DOM Elements
const el = {
  // App Bar
  btnTopClose: document.getElementById('btn-top-close'),
  navTopTitle: document.getElementById('nav-top-title'),
  btnTopMenu: document.getElementById('btn-top-menu'),

  // Top Scene Buttons Grid
  scenesGridTop: document.getElementById('scenes-grid-top'),
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
  btnCloseEditScenes: document.getElementById('btn-close-edit-scenes'),
  editScenesCheckboxList: document.getElementById('edit-scenes-checkbox-list'),

  // Edit Scene Tabs Modal
  modalEditTabs: document.getElementById('modal-edit-tabs'),
  btnCloseEditTabs: document.getElementById('btn-close-edit-tabs'),
  editTabsCheckboxList: document.getElementById('edit-tabs-checkbox-list'),

  // Settings Modal
  modalSettings: document.getElementById('modal-settings'),
  btnCloseSettings: document.getElementById('btn-close-settings'),
  formSettingsConn: document.getElementById('form-settings-conn'),
  setIp: document.getElementById('set-ip'),
  setPort: document.getElementById('set-port'),
  setPass: document.getElementById('set-pass'),
  btnUseSim: document.getElementById('btn-use-sim'),

  // Media Modal
  modalMediaFile: document.getElementById('modal-media-file'),
  btnCloseMediaModal: document.getElementById('btn-close-media-modal'),
  mediaSourceTitle: document.getElementById('media-source-title'),
  mediaCurrentPathText: document.getElementById('media-current-path-text'),
  inputNewMediaPath: document.getElementById('input-new-media-path'),
  btnApplyPath: document.getElementById('btn-apply-path'),
  mediaPresetContainer: document.getElementById('media-preset-container'),
};

export function init() {
  loadSavedCredentials();
  loadHiddenScenePreferences();
  loadHiddenTabPreferences();
  setupEventListeners();
  setupObsEvents();

  if (state.url) {
    state.obs.connect(state.url, state.password);
  } else {
    connectToLocalSimulator();
  }
}

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
    state.selectedCategoryScene = state.currentProgramScene;

    syncStudioModeCheckbox();
    renderTopSceneButtons();
    renderCategoryGrid();
    loadSourcesForScene(state.selectedCategoryScene);
  });

  state.obs.on('programSceneChanged', (sceneName) => {
    state.currentProgramScene = sceneName;
    renderTopSceneButtons();
    renderCategoryGrid();
  });

  state.obs.on('previewSceneChanged', (sceneName) => {
    state.currentPreviewScene = sceneName;
    renderTopSceneButtons();
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
  el.btnCloseEditScenes.addEventListener('click', (e) => {
    e.preventDefault();
    closeEditScenesModal();
  });

  // Edit Scene Tabs Modal
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
  el.btnCloseSettings.addEventListener('click', (e) => {
    e.preventDefault();
    closeSettingsModal();
  });
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
  el.btnCloseMediaModal.addEventListener('click', (e) => {
    e.preventDefault();
    closeMediaModal();
  });
  el.btnApplyPath.addEventListener('click', async (e) => {
    e.preventDefault();
    const newPath = el.inputNewMediaPath.value.trim();
    if (newPath && state.selectedMediaSource) {
      await updateMediaFilePath(state.selectedMediaSource, newPath);
      closeMediaModal();
    }
  });
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
    const isPreview = state.studioMode && scene.sceneName === state.currentPreviewScene && !isProgram;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `scene-block-btn ${isProgram ? 'active-program' : ''} ${isPreview ? 'active-preview' : ''}`;
    btn.textContent = scene.sceneName;

    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        if (state.studioMode) {
          await state.obs.setCurrentPreviewScene(scene.sceneName);
          state.currentPreviewScene = scene.sceneName;
        } else {
          await state.obs.setCurrentProgramScene(scene.sceneName);
          state.currentProgramScene = scene.sceneName;
        }
        state.selectedCategoryScene = scene.sceneName;
        renderTopSceneButtons();
        renderCategoryGrid();
        loadSourcesForScene(scene.sceneName);
      } catch (err) {
        console.error(err);
      }
    });

    el.scenesGridTop.appendChild(btn);
  });
}

// 4. Render Category / Scene Text Grid (with visibility filter)
function renderCategoryGrid() {
  el.categoryTextGrid.innerHTML = '';

  const visibleTabs = state.scenes.filter(
    (s) => !state.hiddenSceneTabs.has(s.sceneName)
  );

  visibleTabs.forEach((scene) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    const isSelected = scene.sceneName === state.selectedCategoryScene;
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
}

// 5. Load and Render Sources in Pure Black List
async function loadSourcesForScene(sceneName) {
  if (!sceneName) return;

  try {
    const res = await state.obs.getSceneItemList(sceneName);
    state.sceneItems = res.sceneItems || [];
    renderSourcesList(sceneName, state.sceneItems);
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

    row.innerHTML = `
      <div class="source-left-col">
        <svg class="source-icon-outline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
        <span class="source-name-blade">${escapeHtml(item.sourceName)}</span>
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
  const target = state.studioMode ? state.currentPreviewScene : state.currentProgramScene;
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

  renderPresetsList(sourceName);
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
