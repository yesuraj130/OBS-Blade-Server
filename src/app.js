/**
 * OBS Blade - Exact Replication of User App
 * Pure Native Web Client (HTML5 / Vanilla ES6 / CSS3)
 */

import { ObsClient } from './obs-client.js';
import { buildPropertiesView } from './obs-properties-builder.js';

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
  advancedOptionsEnabled: false,
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
  btnMenuConnection: document.getElementById('btn-menu-connection'),
  btnMenuSettings: document.getElementById('btn-menu-settings'),
  btnMenuToggleStream: document.getElementById('btn-menu-toggle-stream'),
  textMenuStream: document.getElementById('text-menu-stream'),
  btnMenuToggleRecord: document.getElementById('btn-menu-toggle-record'),
  textMenuRecord: document.getElementById('text-menu-record'),

  // Dedicated OBS WebSocket Connection Modal
  modalConnection: document.getElementById('modal-connection'),
  btnBackConnection: document.getElementById('btn-back-connection'),
  btnCloseConnection: document.getElementById('btn-close-connection'),
  formSettingsConn: document.getElementById('form-settings-conn'),
  setIp: document.getElementById('set-ip'),
  setPort: document.getElementById('set-port'),
  setPass: document.getElementById('set-pass'),
  btnUseSim: document.getElementById('btn-use-sim'),

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

  // Edit Source / Source Settings Modal (Native Dynamic OBS Properties)
  modalMediaFile: document.getElementById('modal-media-file'),
  btnBackMediaModal: document.getElementById('btn-back-media-modal'),
  btnCloseMediaModal: document.getElementById('btn-close-media-modal'),
  mediaSourceTitle: document.getElementById('media-source-title'),
  sourceTypePill: document.getElementById('source-type-pill'),
  sourcePropertiesForm: document.getElementById('source-properties-form'),
  propertiesStatusBanner: document.getElementById('properties-status-banner'),
  btnPropertiesDefaults: document.getElementById('btn-properties-defaults'),
  btnPropertiesApply: document.getElementById('btn-properties-apply'),
  propLocalFileInput: document.getElementById('prop-local-file-input'),

  // Dedicated Edit Media Modal (Known Image & Video Sources)
  modalEditMedia: document.getElementById('modal-edit-media'),
  btnBackEditMedia: document.getElementById('btn-back-edit-media'),
  btnCloseEditMedia: document.getElementById('btn-close-edit-media'),
  editMediaTitle: document.getElementById('edit-media-title'),
  editMediaTypeBadge: document.getElementById('edit-media-type-badge'),
  editMediaStatusBanner: document.getElementById('edit-media-status-banner'),
  editMediaCurrentPath: document.getElementById('edit-media-current-path'),
  inputEditMediaPath: document.getElementById('input-edit-media-path'),
  btnMediaBrowseHost: document.getElementById('btn-media-browse-host'),
  btnMediaBrowseLocal: document.getElementById('btn-media-browse-local'),
  btnApplyEditMedia: document.getElementById('btn-apply-edit-media'),

  // OBS Host Filesystem Browser Modal
  modalHostFileBrowser: document.getElementById('modal-host-file-browser'),
  btnBackHostBrowser: document.getElementById('btn-back-host-browser'),
  btnCloseHostBrowser: document.getElementById('btn-close-host-browser'),
  btnHostNavUp: document.getElementById('btn-host-nav-up'),
  hostBrowserBreadcrumb: document.getElementById('host-browser-breadcrumb'),
  hostBrowserEntries: document.getElementById('host-browser-entries'),
  hostBrowserFooter: document.getElementById('host-browser-footer'),
  btnSelectCurrentFolder: document.getElementById('btn-select-current-folder'),

  // Context Menu
  contextMenuPopover: document.getElementById('context-menu-popover'),
  contextMenuHeader: document.getElementById('context-menu-header'),
  contextMenuItems: document.getElementById('context-menu-items'),

  // Filters Modal
  modalFilters: document.getElementById('modal-filters'),
  btnBackFiltersModal: document.getElementById('btn-back-filters-modal'),
  btnCloseFiltersModal: document.getElementById('btn-close-filters-modal'),
  filtersModalTitle: document.getElementById('filters-modal-title'),
  filtersTargetSubtitle: document.getElementById('filters-target-subtitle'),
  filtersTargetName: document.getElementById('filters-target-name'),
  filtersListContainer: document.getElementById('filters-list-container'),
  btnToggleAddFilter: document.getElementById('btn-toggle-add-filter'),
  formAddFilter: document.getElementById('form-add-filter'),
  selectFilterKind: document.getElementById('select-filter-kind'),
  inputFilterName: document.getElementById('input-filter-name'),
  btnCancelAddFilter: document.getElementById('btn-cancel-add-filter'),

  // Rename Modal
  modalRenameItem: document.getElementById('modal-rename-item'),
  renameModalTitle: document.getElementById('rename-modal-title'),
  renameItemLabel: document.getElementById('rename-item-label'),
  inputRenameItem: document.getElementById('input-rename-item'),
  btnCancelRename: document.getElementById('btn-cancel-rename'),
  formRenameItem: document.getElementById('form-rename-item'),

  // Create Scene Modal
  modalCreateScene: document.getElementById('modal-create-scene'),
  inputCreateSceneName: document.getElementById('input-create-scene-name'),
  btnCancelCreateScene: document.getElementById('btn-cancel-create-scene'),
  formCreateScene: document.getElementById('form-create-scene'),

  // Confirm Delete Modal
  modalConfirmDelete: document.getElementById('modal-confirm-delete'),
  confirmDeleteTitle: document.getElementById('confirm-delete-title'),
  confirmDeleteDesc: document.getElementById('confirm-delete-desc'),
  btnCancelConfirmDelete: document.getElementById('btn-cancel-confirm-delete'),
  btnExecuteConfirmDelete: document.getElementById('btn-execute-confirm-delete'),

  // Advanced Options Controls
  toggleAdvancedOptions: document.getElementById('toggle-advanced-options'),
  sourcesHeaderBar: document.getElementById('sources-header-bar'),
  btnAddSource: document.getElementById('btn-add-source'),

  // Create Source Modal
  modalCreateSource: document.getElementById('modal-create-source'),
  selectSourceKind: document.getElementById('select-source-kind'),
  inputCreateSourceName: document.getElementById('input-create-source-name'),
  btnCancelCreateSource: document.getElementById('btn-cancel-create-source'),
  formCreateSource: document.getElementById('form-create-source'),
};

// Wake lock sentinel instance
let wakeLockSentinel = null;

export function init() {
  loadSavedCredentials();
  loadSavedPreferences();
  loadHiddenScenePreferences();
  loadHiddenTabPreferences();
  applyClientStudioModeControls();
  applyAdvancedOptionsVisibility();
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

    const rawAdvanced = localStorage.getItem('obs_blade_advanced_options');
    state.advancedOptionsEnabled = rawAdvanced === 'true'; // Default disabled
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

  state.obs.on('scenesUpdated', (scenes) => {
    state.scenes = scenes;
    renderTopSceneButtons();
    renderCategoryGrid();
    if (state.selectedCategoryScene === '__CURRENT__') {
      loadSourcesForScene('__CURRENT__');
    }
  });

  state.obs.on('filterChanged', (data) => {
    if (activeFiltersTarget && activeFiltersTarget.name === data.sourceName) {
      loadFiltersForTarget(activeFiltersTarget);
    }
  });

  state.obs.on('inputNameChanged', () => {
    loadSourcesForScene(state.selectedCategoryScene);
  });
}

function setupEventListeners() {
  // Top Close Button: Disconnect & Open Connection modal
  el.btnTopClose.addEventListener('click', (e) => {
    e.preventDefault();
    state.obs.disconnect();
    openConnectionModal();
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
  if (el.btnMenuConnection) {
    el.btnMenuConnection.addEventListener('click', (e) => {
      e.preventDefault();
      closeDropdownMenu();
      openConnectionModal();
    });
  }
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

  if (el.toggleAdvancedOptions) {
    el.toggleAdvancedOptions.addEventListener('change', (e) => {
      state.advancedOptionsEnabled = e.target.checked;
      try {
        localStorage.setItem(
          'obs_blade_advanced_options',
          String(state.advancedOptionsEnabled)
        );
      } catch (_) {}

      applyAdvancedOptionsVisibility();
    });
  }
  // OBS Connection Modal Handlers
  if (el.btnBackConnection) {
    el.btnBackConnection.addEventListener('click', (e) => {
      e.preventDefault();
      closeConnectionModal();
    });
  }
  if (el.btnCloseConnection) {
    el.btnCloseConnection.addEventListener('click', (e) => {
      e.preventDefault();
      closeConnectionModal();
    });
  }

  if (el.formSettingsConn) {
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
      closeConnectionModal();
    });
  }

  if (el.btnUseSim) {
    el.btnUseSim.addEventListener('click', (e) => {
      e.preventDefault();
      connectToLocalSimulator();
      closeConnectionModal();
    });
  }

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

  // Add Source Action & Modal Handlers
  if (el.btnAddSource) {
    el.btnAddSource.addEventListener('click', (e) => {
      e.preventDefault();
      openCreateSourceModal();
    });
  }

  if (el.btnCancelCreateSource) {
    el.btnCancelCreateSource.addEventListener('click', (e) => {
      e.preventDefault();
      closeCreateSourceModal();
    });
  }

  if (el.formCreateSource) {
    el.formCreateSource.addEventListener('submit', async (e) => {
      e.preventDefault();
      const targetScene = getCurrentTargetScene();
      const name = el.inputCreateSourceName.value.trim();
      const kind = el.selectSourceKind.value;
      if (!name || !targetScene) return;

      try {
        await state.obs.createInput(targetScene, name, kind);
        closeCreateSourceModal();
        loadSourcesForScene(state.selectedCategoryScene);
      } catch (err) {
        console.error(err);
      }
    });
  }

  // Backdrop click to dismiss centered dialogs
  [
    el.modalEditScenes,
    el.modalEditTabs,
    el.modalSettings,
    el.modalConnection,
    el.modalMediaFile,
    el.modalFilters,
    el.modalRenameItem,
    el.modalCreateScene,
    el.modalConfirmDelete,
    el.modalCreateSource,
    el.modalHostFileBrowser,
    el.modalEditMedia,
  ].forEach((overlay) => {
    if (!overlay) return;
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('open');
      }
    });
  });

  // Context Menu outside click dismissal
  document.addEventListener('click', (e) => {
    if (el.contextMenuPopover && !el.contextMenuPopover.contains(e.target)) {
      closeContextMenu();
    }
  });

  window.addEventListener('resize', closeContextMenu);
  window.addEventListener('scroll', closeContextMenu, true);

  // Filters Modal Handlers
  if (el.btnBackFiltersModal) {
    el.btnBackFiltersModal.addEventListener('click', (e) => {
      e.preventDefault();
      closeFiltersModal();
    });
  }
  if (el.btnCloseFiltersModal) {
    el.btnCloseFiltersModal.addEventListener('click', (e) => {
      e.preventDefault();
      closeFiltersModal();
    });
  }

  if (el.btnToggleAddFilter) {
    el.btnToggleAddFilter.addEventListener('click', (e) => {
      e.preventDefault();
      const isHidden = el.formAddFilter.style.display === 'none';
      el.formAddFilter.style.display = isHidden ? 'block' : 'none';
      el.btnToggleAddFilter.style.display = isHidden ? 'none' : 'flex';
      if (isHidden) {
        el.inputFilterName.focus();
      }
    });
  }

  if (el.btnCancelAddFilter) {
    el.btnCancelAddFilter.addEventListener('click', (e) => {
      e.preventDefault();
      el.formAddFilter.style.display = 'none';
      el.btnToggleAddFilter.style.display = 'flex';
    });
  }

  if (el.selectFilterKind) {
    el.selectFilterKind.addEventListener('change', () => {
      const kind = el.selectFilterKind.value;
      const label = FILTER_KIND_LABELS[kind] || 'Filter';
      el.inputFilterName.value = label;
    });
  }

  if (el.formAddFilter) {
    el.formAddFilter.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!activeFiltersTarget) return;
      const name = el.inputFilterName.value.trim();
      const kind = el.selectFilterKind.value;
      if (!name) return;

      try {
        await state.obs.createSourceFilter(activeFiltersTarget.name, name, kind);
        el.formAddFilter.style.display = 'none';
        el.btnToggleAddFilter.style.display = 'flex';
        loadFiltersForTarget(activeFiltersTarget);
      } catch (err) {
        console.error(err);
      }
    });
  }

  // Rename Modal Handlers
  if (el.btnCancelRename) {
    el.btnCancelRename.addEventListener('click', (e) => {
      e.preventDefault();
      closeRenameModal();
    });
  }

  if (el.formRenameItem) {
    el.formRenameItem.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!activeRenameTarget) return;
      const newName = el.inputRenameItem.value.trim();
      if (!newName || newName === activeRenameTarget.name) {
        closeRenameModal();
        return;
      }

      try {
        if (activeRenameTarget.type === 'scene') {
          await state.obs.setSceneName(activeRenameTarget.name, newName);
          if (state.currentProgramScene === activeRenameTarget.name) {
            state.currentProgramScene = newName;
          }
          if (state.currentPreviewScene === activeRenameTarget.name) {
            state.currentPreviewScene = newName;
          }
          if (state.selectedCategoryScene === activeRenameTarget.name) {
            state.selectedCategoryScene = newName;
          }
          renderTopSceneButtons();
          renderCategoryGrid();
        } else if (activeRenameTarget.type === 'filter') {
          await state.obs.setSourceFilterName(
            activeRenameTarget.sourceName,
            activeRenameTarget.name,
            newName
          );
          if (activeFiltersTarget) {
            loadFiltersForTarget(activeFiltersTarget);
          }
        } else {
          await state.obs.setInputName(activeRenameTarget.name, newName);
          thumbnailCache.delete(activeRenameTarget.name);
          loadSourcesForScene(activeRenameTarget.sceneName || state.selectedCategoryScene);
        }
        closeRenameModal();
      } catch (err) {
        console.error(err);
      }
    });
  }

  // Create Scene Modal Handlers
  if (el.btnCancelCreateScene) {
    el.btnCancelCreateScene.addEventListener('click', (e) => {
      e.preventDefault();
      closeCreateSceneModal();
    });
  }

  if (el.formCreateScene) {
    el.formCreateScene.addEventListener('submit', async (e) => {
      e.preventDefault();
      const sceneName = el.inputCreateSceneName.value.trim();
      if (!sceneName) return;

      try {
        await state.obs.createScene(sceneName);
        closeCreateSceneModal();
        const res = await state.obs.getSceneList();
        state.scenes = res.scenes || [];
        renderTopSceneButtons();
        renderCategoryGrid();
      } catch (err) {
        console.error(err);
      }
    });
  }

  // Confirm Delete Modal Handlers
  if (el.btnCancelConfirmDelete) {
    el.btnCancelConfirmDelete.addEventListener('click', (e) => {
      e.preventDefault();
      closeDeleteModal();
    });
  }

  if (el.btnExecuteConfirmDelete) {
    el.btnExecuteConfirmDelete.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!activeDeleteTarget) return;

      try {
        if (activeDeleteTarget.type === 'scene') {
          await state.obs.removeScene(activeDeleteTarget.name);
          const res = await state.obs.getSceneList();
          state.scenes = res.scenes || [];
          if (state.selectedCategoryScene === activeDeleteTarget.name) {
            state.selectedCategoryScene = '__CURRENT__';
          }
          renderTopSceneButtons();
          renderCategoryGrid();
          loadSourcesForScene(state.selectedCategoryScene);
        } else {
          await state.obs.removeSceneItem(
            activeDeleteTarget.sceneName,
            activeDeleteTarget.itemId
          );
          loadSourcesForScene(activeDeleteTarget.sceneName || state.selectedCategoryScene);
        }
        closeDeleteModal();
      } catch (err) {
        console.error(err);
      }
    });
  }

  // Source Edit / Properties Modal Handlers
  if (el.btnPropertiesApply) {
    el.btnPropertiesApply.addEventListener('click', async (e) => {
      e.preventDefault();
      await applyPropertiesChanges();
    });
  }

  if (el.btnPropertiesDefaults) {
    el.btnPropertiesDefaults.addEventListener('click', async (e) => {
      e.preventDefault();
      await resetPropertiesDefaults();
    });
  }

  // Dedicated Edit Media Modal Handlers
  if (el.btnBackEditMedia) {
    el.btnBackEditMedia.addEventListener('click', (e) => {
      e.preventDefault();
      closeEditMediaModal();
    });
  }

  if (el.btnCloseEditMedia) {
    el.btnCloseEditMedia.addEventListener('click', (e) => {
      e.preventDefault();
      closeEditMediaModal();
    });
  }

  if (el.btnMediaBrowseHost) {
    el.btnMediaBrowseHost.addEventListener('click', (e) => {
      e.preventDefault();
      openHostFileBrowser({
        propKey: 'media_file',
        currentPath: el.inputEditMediaPath.value,
        pathType: 'file',
        onSelect: (selectedPath) => {
          el.inputEditMediaPath.value = selectedPath;
        },
      });
    });
  }

  if (el.btnMediaBrowseLocal) {
    el.btnMediaBrowseLocal.addEventListener('click', (e) => {
      e.preventDefault();
      const isVideo =
        activeEditMediaKind === 'ffmpeg_source' ||
        activeEditMediaKind === 'vlc_source' ||
        activeEditMediaKind.includes('video');
      openLocalFileBrowser({
        propKey: 'media_file',
        accept: isVideo ? 'video/*,audio/*' : 'image/*',
        onUploaded: (uploadedPath) => {
          el.inputEditMediaPath.value = uploadedPath;
          showEditMediaBanner(`✓ Uploaded file selected. Click "Apply Media" to save.`, false);
        },
      });
    });
  }

  if (el.btnApplyEditMedia) {
    el.btnApplyEditMedia.addEventListener('click', async (e) => {
      e.preventDefault();
      await applyEditMedia();
    });
  }

  // Local File Input Change Handler (uploads to host and updates field)
  if (el.propLocalFileInput) {
    el.propLocalFileInput.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const isEditMediaOpen = el.modalEditMedia && el.modalEditMedia.classList.contains('open');
      const showBanner = isEditMediaOpen ? showEditMediaBanner : showPropertiesBanner;

      showBanner(`Uploading "${file.name}" to OBS host...`, false);
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
        showBanner(`✓ Uploaded "${file.name}" to host!`, false);

        if (activeLocalUploadCallback) {
          activeLocalUploadCallback(data.path);
          activeLocalUploadCallback = null;
        }
      } catch (err) {
        console.error('[Upload Error]', err);
        showBanner(`Upload failed: ${err.message}`, true);
      }
    });
  }

  // OBS Host File Browser Modal Handlers
  if (el.btnBackHostBrowser) {
    el.btnBackHostBrowser.addEventListener('click', (e) => {
      e.preventDefault();
      closeHostFileBrowser();
    });
  }

  if (el.btnCloseHostBrowser) {
    el.btnCloseHostBrowser.addEventListener('click', (e) => {
      e.preventDefault();
      closeHostFileBrowser();
    });
  }

  if (el.btnHostNavUp) {
    el.btnHostNavUp.addEventListener('click', (e) => {
      e.preventDefault();
      if (currentHostParentDir) {
        loadHostDirectory(currentHostParentDir);
      }
    });
  }

  // Quick Locations buttons
  const quickLocButtons = document.querySelectorAll('.btn-quick-loc');
  quickLocButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetDir = btn.getAttribute('data-dir');
      if (targetDir) {
        loadHostDirectory(targetDir);
      }
    });
  });

  if (el.btnSelectCurrentFolder) {
    el.btnSelectCurrentFolder.addEventListener('click', (e) => {
      e.preventDefault();
      if (activeHostBrowserTarget && activeHostBrowserTarget.onSelect && currentHostDir) {
        activeHostBrowserTarget.onSelect(currentHostDir);
      }
      closeHostFileBrowser();
    });
  }
}

// Filter labels map
const FILTER_KIND_LABELS = {
  chroma_key_filter_v2: 'Chroma Key',
  color_correction_filter_v2: 'Color Correction',
  noise_suppress_filter_v2: 'Noise Suppression',
  compressor_filter: 'Compressor',
  gain_filter: 'Gain',
  noise_gate_filter: 'Noise Gate',
  crop_filter: 'Crop / Pad',
  sharpness_filter_v2: 'Sharpen',
  scroll_filter: 'Scroll',
};

// Target tracker variables
let activeFiltersTarget = null;
let activeRenameTarget = null;
let activeDeleteTarget = null;

/**
 * Universal touch long-press & desktop right-click handler
 */
function attachLongPressAndContextMenu(element, onTrigger) {
  let timer = null;
  let startX = 0;
  let startY = 0;
  let didLongPress = false;

  element.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    onTrigger(e.clientX, e.clientY);
  });

  element.addEventListener(
    'touchstart',
    (e) => {
      if (e.touches.length > 1) return;
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      didLongPress = false;

      timer = setTimeout(() => {
        didLongPress = true;
        if (navigator.vibrate) {
          try {
            navigator.vibrate(40);
          } catch (_) {}
        }
        onTrigger(startX, startY);
      }, 480);
    },
    { passive: true }
  );

  element.addEventListener(
    'touchmove',
    (e) => {
      if (!timer) return;
      const touch = e.touches[0];
      if (Math.hypot(touch.clientX - startX, touch.clientY - startY) > 10) {
        clearTimeout(timer);
        timer = null;
      }
    },
    { passive: true }
  );

  element.addEventListener('touchend', (e) => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (didLongPress) {
      e.preventDefault();
      e.stopPropagation();
    }
  });

  element.addEventListener('touchcancel', () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  });
}

function showContextMenu({ x, y, title, items }) {
  el.contextMenuHeader.textContent = title;
  el.contextMenuItems.innerHTML = '';

  items.forEach((item) => {
    if (item.divider) {
      const div = document.createElement('div');
      div.className = 'context-menu-divider';
      el.contextMenuItems.appendChild(div);
      return;
    }

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `context-menu-item ${item.danger ? 'danger' : ''}`;
    btn.innerHTML = `${item.icon || ''}<span>${escapeHtml(item.label)}</span>`;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeContextMenu();
      item.onClick();
    });
    el.contextMenuItems.appendChild(btn);
  });

  el.contextMenuPopover.style.left = '0px';
  el.contextMenuPopover.style.top = '0px';
  el.contextMenuPopover.classList.add('open');

  const rect = el.contextMenuPopover.getBoundingClientRect();
  const pad = 12;
  let posX = x;
  let posY = y;

  if (posX + rect.width > window.innerWidth - pad) {
    posX = Math.max(pad, window.innerWidth - rect.width - pad);
  }
  if (posY + rect.height > window.innerHeight - pad) {
    posY = Math.max(pad, window.innerHeight - rect.height - pad);
  }

  el.contextMenuPopover.style.left = `${posX}px`;
  el.contextMenuPopover.style.top = `${posY}px`;
}

function closeContextMenu() {
  if (el.contextMenuPopover) {
    el.contextMenuPopover.classList.remove('open');
  }
}

function openSceneContextMenu(x, y, sceneName) {
  const items = [];

  // Rename scene is available when advanced options is enabled
  if (state.advancedOptionsEnabled) {
    items.push({
      label: 'Rename Scene',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
      onClick: () => openRenameModal({ type: 'scene', name: sceneName }),
    });
  }

  // Filters option is ALWAYS shown for normal and advanced users to toggle existing filters
  items.push({
    label: 'Filters',
    icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><circle cx="8" cy="15" r="4"/><circle cx="16" cy="15" r="4"/></svg>`,
    onClick: () => openFiltersModal({ type: 'scene', name: sceneName }),
  });

  // New Scene & Delete Scene are available for advanced users
  if (state.advancedOptionsEnabled) {
    items.push({
      label: 'New Scene',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
      onClick: () => openCreateSceneModal(),
    });
    items.push({ divider: true });
    items.push({
      label: 'Delete Scene',
      danger: true,
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
      onClick: () => openDeleteModal({ type: 'scene', name: sceneName }),
    });
  }

  showContextMenu({
    x,
    y,
    title: `Scene: ${sceneName}`,
    items,
  });
}

/**
 * Check if a source item is a known image or video source type
 */
function isMediaSource(item) {
  if (!item) return false;
  const category = getSourceTypeCategory(item);
  const kind = (item?.inputKind || '').toLowerCase();
  return (
    category === 'image' ||
    category === 'video' ||
    kind === 'image_source' ||
    kind === 'ffmpeg_source' ||
    kind === 'vlc_source' ||
    kind === 'slideshow' ||
    kind.includes('image') ||
    kind.includes('video') ||
    kind.includes('media')
  );
}

function openSourceContextMenu(x, y, sceneName, item) {
  const isMedia = isMediaSource(item);
  const menuItems = [];

  // Edit media(s): Available for ALL users on known image and video sources
  if (isMedia) {
    menuItems.push({
      label: 'Edit media(s)',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
      onClick: () => openEditMediaModal(item.sourceName, sceneName, item),
    });
  }

  // Rename Source: Available for ALL users
  menuItems.push({
    label: 'Rename Source',
    icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
    onClick: () => openRenameModal({ type: 'source', name: item.sourceName, sceneName }),
  });

  // Open Filters: Available for ALL users
  menuItems.push({
    label: 'Open Filters',
    icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><circle cx="8" cy="15" r="4"/><circle cx="16" cy="15" r="4"/></svg>`,
    onClick: () => openFiltersModal({ type: 'source', name: item.sourceName, sceneName }),
  });

  // Toggle Visibility: available for all users
  menuItems.push({
    label: item.sceneItemEnabled ? 'Hide Source' : 'Show Source',
    icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
    onClick: async () => {
      try {
        const next = !item.sceneItemEnabled;
        await state.obs.setSceneItemEnabled(sceneName, item.sceneItemId, next);
        item.sceneItemEnabled = next;
        renderSourcesList(sceneName, state.sceneItems);
      } catch (err) {
        console.error(err);
      }
    },
  });

  // Advanced only: Edit Source, Add Source to Scene, Remove from Scene
  if (state.advancedOptionsEnabled) {
    menuItems.push({ divider: true });
    menuItems.push({
      label: 'Edit Source',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
      onClick: () => openMediaModal(item.sourceName, sceneName, item),
    });
    menuItems.push({
      label: 'Add Source to Scene',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
      onClick: () => openCreateSourceModal(),
    });
    menuItems.push({
      label: 'Remove from Scene',
      danger: true,
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
      onClick: () =>
        openDeleteModal({
          type: 'source',
          name: item.sourceName,
          sceneName,
          itemId: item.sceneItemId,
        }),
    });
  }

  showContextMenu({
    x,
    y,
    title: `Source: ${item.sourceName}`,
    items: menuItems,
  });
}

function openFiltersModal(target) {
  activeFiltersTarget = target;
  el.filtersModalTitle.textContent =
    target.type === 'scene' ? 'Scene Filters' : 'Source Filters';
  el.filtersTargetName.textContent = target.name;
  el.formAddFilter.style.display = 'none';

  // Add filter section is strictly available when advanced options is enabled
  if (state.advancedOptionsEnabled) {
    el.btnToggleAddFilter.style.display = 'flex';
  } else {
    el.btnToggleAddFilter.style.display = 'none';
  }

  const defaultLabel = FILTER_KIND_LABELS[el.selectFilterKind.value] || 'Chroma Key';
  el.inputFilterName.value = defaultLabel;
  el.modalFilters.classList.add('open');
  loadFiltersForTarget(target);
}

function closeFiltersModal() {
  el.modalFilters.classList.remove('open');
  activeFiltersTarget = null;
}

async function loadFiltersForTarget(target) {
  if (!target || !target.name) return;
  el.filtersListContainer.innerHTML = `
    <div style="padding: 16px; text-align: center; color: var(--obs-text-gray); font-size: 13px;">
      Loading filters...
    </div>
  `;

  try {
    const res = await state.obs.getSourceFilterList(target.name);
    const filters = res.filters || [];
    renderFiltersList(target, filters);
  } catch (err) {
    el.filtersListContainer.innerHTML = `
      <div style="padding: 16px; text-align: center; color: var(--obs-red); font-size: 13px;">
        Failed to load filters: ${escapeHtml(err.message)}
      </div>
    `;
  }
}

function renderFiltersList(target, filters) {
  el.filtersListContainer.innerHTML = '';

  if (!filters || filters.length === 0) {
    el.filtersListContainer.innerHTML = `
      <div style="padding: 24px 12px; text-align: center; color: var(--obs-text-gray); font-size: 13px; background: #080c14; border-radius: 8px; border: 1px dashed #1c2638;">
        No filters active on this ${target.type}.
        ${
          state.advancedOptionsEnabled
            ? '<br/><span style="font-size: 11px; opacity: 0.8; margin-top: 4px; display: inline-block;">Tap "+ Add New Filter" below to add video or audio filters.</span>'
            : ''
        }
      </div>
    `;
    return;
  }

  filters.forEach((filter) => {
    const card = document.createElement('div');
    card.className = 'filter-card-blade';

    const kindLabel =
      FILTER_KIND_LABELS[filter.filterKind] ||
      filter.filterKind.replace(/_filter(_v\d+)?$/, '').replace(/_/g, ' ');

    let actionsHtml = `
      <label class="switch-control" title="Toggle Filter">
        <input type="checkbox" class="filter-toggle-checkbox" ${filter.filterEnabled ? 'checked' : ''} />
        <span class="switch-slider"></span>
      </label>
    `;

    // Only show Rename and Delete filter buttons if Advanced Options is enabled!
    if (state.advancedOptionsEnabled) {
      actionsHtml += `
        <button type="button" class="btn-filter-rename" title="Rename Filter">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
        </button>
        <button type="button" class="btn-filter-trash" title="Delete Filter">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      `;
    }

    card.innerHTML = `
      <div class="filter-info-left">
        <span class="filter-title-text" title="${escapeHtml(filter.filterName)}">${escapeHtml(filter.filterName)}</span>
        <span class="filter-kind-pill">${escapeHtml(kindLabel)}</span>
      </div>
      <div class="filter-actions-right">
        ${actionsHtml}
      </div>
    `;

    const checkbox = card.querySelector('.filter-toggle-checkbox');
    checkbox.addEventListener('change', async (e) => {
      const next = e.target.checked;
      try {
        await state.obs.setSourceFilterEnabled(target.name, filter.filterName, next);
        filter.filterEnabled = next;
      } catch (err) {
        console.error(err);
        e.target.checked = !next;
      }
    });

    if (state.advancedOptionsEnabled) {
      const btnRename = card.querySelector('.btn-filter-rename');
      if (btnRename) {
        btnRename.addEventListener('click', (e) => {
          e.preventDefault();
          openRenameModal({
            type: 'filter',
            name: filter.filterName,
            sourceName: target.name,
          });
        });
      }

      const btnTrash = card.querySelector('.btn-filter-trash');
      if (btnTrash) {
        btnTrash.addEventListener('click', async (e) => {
          e.preventDefault();
          try {
            await state.obs.removeSourceFilter(target.name, filter.filterName);
            loadFiltersForTarget(target);
          } catch (err) {
            console.error(err);
          }
        });
      }
    }

    el.filtersListContainer.appendChild(card);
  });
}

function openRenameModal(target) {
  activeRenameTarget = target;
  if (target.type === 'scene') {
    el.renameModalTitle.textContent = 'Rename Scene';
  } else if (target.type === 'filter') {
    el.renameModalTitle.textContent = 'Rename Filter';
  } else {
    el.renameModalTitle.textContent = 'Rename Source';
  }
  el.renameItemLabel.textContent = `New name for "${target.name}":`;
  el.inputRenameItem.value = target.name;
  el.modalRenameItem.classList.add('open');
  setTimeout(() => {
    el.inputRenameItem.focus();
    el.inputRenameItem.select();
  }, 100);
}

function closeRenameModal() {
  el.modalRenameItem.classList.remove('open');
  activeRenameTarget = null;
}

function openCreateSceneModal() {
  el.inputCreateSceneName.value = '';
  el.modalCreateScene.classList.add('open');
  setTimeout(() => {
    el.inputCreateSceneName.focus();
  }, 100);
}

function closeCreateSceneModal() {
  el.modalCreateScene.classList.remove('open');
}

function openCreateSourceModal() {
  el.inputCreateSourceName.value = '';
  el.modalCreateSource.classList.add('open');
  setTimeout(() => {
    el.inputCreateSourceName.focus();
  }, 100);
}

function closeCreateSourceModal() {
  el.modalCreateSource.classList.remove('open');
}

function applyAdvancedOptionsVisibility() {
  if (el.sourcesHeaderBar) {
    el.sourcesHeaderBar.style.display = state.advancedOptionsEnabled ? 'flex' : 'none';
  }
  renderTopSceneButtons();
  if (state.sceneItems && state.sceneItems.length > 0) {
    renderSourcesList(state.selectedCategoryScene, state.sceneItems);
  }
  if (activeFiltersTarget) {
    loadFiltersForTarget(activeFiltersTarget);
  }
}

function openDeleteModal(target) {
  activeDeleteTarget = target;
  el.confirmDeleteTitle.textContent =
    target.type === 'scene' ? 'Delete Scene' : 'Remove Source';
  if (target.type === 'scene') {
    el.confirmDeleteDesc.textContent = `Are you sure you want to delete scene "${target.name}"? This removes the scene and its sources from OBS Studio.`;
  } else {
    el.confirmDeleteDesc.textContent = `Are you sure you want to remove "${target.name}" from scene "${target.sceneName}"?`;
  }
  el.modalConfirmDelete.classList.add('open');
}

function closeDeleteModal() {
  el.modalConfirmDelete.classList.remove('open');
  activeDeleteTarget = null;
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

    // Attach right-click and long-press context menu (rename, filters, delete, new)
    attachLongPressAndContextMenu(btn, (x, y) => {
      openSceneContextMenu(x, y, scene.sceneName);
    });

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

  // Dedicated "+" Add Scene button at the end of the top grid (Advanced only)
  if (state.advancedOptionsEnabled) {
    const btnAdd = document.createElement('button');
    btnAdd.type = 'button';
    btnAdd.className = 'scene-block-btn btn-add-scene';
    btnAdd.title = 'Add New Scene';
    btnAdd.textContent = '+';
    btnAdd.addEventListener('click', (e) => {
      e.preventDefault();
      openCreateSceneModal();
    });
    el.scenesGridTop.appendChild(btnAdd);
  }
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

    // Attach right-click and long-press context menu
    attachLongPressAndContextMenu(btn, (x, y) => {
      openSceneContextMenu(x, y, scene.sceneName);
    });

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
    const isMedia = isMediaSource(item);

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
        <!-- Eye Icon Button (Toggle Visibility) -->
        <button type="button" class="btn-blade-eye ${item.sceneItemEnabled ? 'visible' : 'hidden'}" title="Toggle Visibility">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            ${
              item.sceneItemEnabled
                ? `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3" fill="currentColor"/>`
                : `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`
            }
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
      e.stopPropagation();
      try {
        const next = !item.sceneItemEnabled;
        await state.obs.setSceneItemEnabled(sceneName, item.sceneItemId, next);
        item.sceneItemEnabled = next;
        renderSourcesList(sceneName, items);
      } catch (err) {
        console.error(err);
      }
    });

    // Right-click and long-press on source row to open source context menu (edit media, rename, filters, visibility, etc.)
    attachLongPressAndContextMenu(row, (x, y) => {
      openSourceContextMenu(x, y, sceneName, item);
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

// Dynamic Source Properties & Host File Browser State
let activePropertiesDraftSettings = {};
let activePropertiesDefaults = {};
let activePropertiesInputKind = '';
let activeHostBrowserTarget = null;
let activeLocalUploadCallback = null;
let currentHostDir = '';
let currentHostParentDir = null;

// Dedicated Edit Media State (available for all users)
let activeEditMediaSource = null;
let activeEditMediaScene = null;
let activeEditMediaKind = '';

function showEditMediaBanner(message, isError = false) {
  if (!el.editMediaStatusBanner) return;
  el.editMediaStatusBanner.textContent = message;
  el.editMediaStatusBanner.className = `properties-status-banner ${isError ? 'error' : ''}`;
  el.editMediaStatusBanner.style.display = 'block';
  if (!isError) {
    setTimeout(() => {
      if (el.editMediaStatusBanner && el.editMediaStatusBanner.textContent === message) {
        el.editMediaStatusBanner.style.display = 'none';
      }
    }, 4000);
  }
}

async function openEditMediaModal(sourceName, sceneName, item) {
  activeEditMediaSource = sourceName;
  activeEditMediaScene = sceneName || state.selectedCategoryScene;

  el.editMediaTitle.textContent = `Edit Media: ${sourceName}`;
  el.editMediaCurrentPath.textContent = 'Loading path...';
  el.inputEditMediaPath.value = '';

  if (el.editMediaStatusBanner) {
    el.editMediaStatusBanner.style.display = 'none';
  }

  el.modalEditMedia.classList.add('open');

  try {
    const res = await state.obs.getInputSettings(sourceName);
    const kind = res.inputKind || (item ? item.inputKind : '');
    activeEditMediaKind = kind;

    const category = getSourceTypeCategory({ sourceName, inputKind: kind });
    const isVideo = category === 'video' || kind === 'ffmpeg_source' || kind === 'vlc_source';

    if (el.editMediaTypeBadge) {
      el.editMediaTypeBadge.textContent = isVideo ? 'VIDEO' : 'IMAGE';
    }

    const currentPath =
      res.inputSettings?.file ||
      res.inputSettings?.local_file ||
      res.inputSettings?.path ||
      '';

    el.editMediaCurrentPath.textContent = currentPath || '(No media file path configured)';
    el.inputEditMediaPath.value = currentPath;
  } catch (err) {
    console.error('Failed to get input settings for media edit:', err);
    el.editMediaCurrentPath.textContent = 'Failed to load media settings: ' + err.message;
  }
}

function closeEditMediaModal() {
  el.modalEditMedia.classList.remove('open');
  activeEditMediaSource = null;
  activeEditMediaScene = null;
}

async function applyEditMedia() {
  if (!activeEditMediaSource) return;

  const newPath = el.inputEditMediaPath.value.trim();
  if (!newPath) {
    showEditMediaBanner('Please specify or select a media file path.', true);
    return;
  }

  const category = getSourceTypeCategory({ sourceName: activeEditMediaSource, inputKind: activeEditMediaKind });
  const isVideo = category === 'video' || activeEditMediaKind === 'ffmpeg_source' || activeEditMediaKind === 'vlc_source';

  const newSettings = {};
  if (isVideo) {
    newSettings.local_file = newPath;
    newSettings.is_local_file = true;
  } else {
    newSettings.file = newPath;
  }

  try {
    if (el.btnApplyEditMedia) {
      el.btnApplyEditMedia.textContent = 'Applying...';
    }

    await state.obs.setInputSettings(activeEditMediaSource, newSettings);

    el.editMediaCurrentPath.textContent = newPath;
    thumbnailCache.delete(activeEditMediaSource);
    loadSourcesForScene(state.selectedCategoryScene);

    if (state.isPreviewExpanded) {
      setTimeout(fetchPreviewSnapshot, 300);
    }

    showEditMediaBanner('✓ Media updated successfully in OBS Studio!', false);

    if (el.btnApplyEditMedia) {
      el.btnApplyEditMedia.textContent = '✓ Applied';
      setTimeout(() => {
        if (el.btnApplyEditMedia) {
          el.btnApplyEditMedia.textContent = 'Apply Media';
        }
      }, 1500);
    }
  } catch (err) {
    console.error('Failed to set media settings:', err);
    showEditMediaBanner(`Failed to save media: ${err.message}`, true);
    if (el.btnApplyEditMedia) {
      el.btnApplyEditMedia.textContent = 'Apply Media';
    }
  }
}

function showPropertiesBanner(message, isError = false) {
  if (!el.propertiesStatusBanner) return;
  el.propertiesStatusBanner.textContent = message;
  el.propertiesStatusBanner.className = `properties-status-banner ${isError ? 'error' : ''}`;
  el.propertiesStatusBanner.style.display = 'block';
  if (!isError) {
    setTimeout(() => {
      if (el.propertiesStatusBanner && el.propertiesStatusBanner.textContent === message) {
        el.propertiesStatusBanner.style.display = 'none';
      }
    }, 4000);
  }
}

// Universal Source Edit Modal Logic (Dynamic OBS Properties View)
async function openMediaModal(sourceName, sceneName, item) {
  state.selectedMediaSource = sourceName;
  state.selectedMediaScene = sceneName || state.selectedCategoryScene;
  el.mediaSourceTitle.textContent = `Properties for '${sourceName}'`;

  if (el.propertiesStatusBanner) {
    el.propertiesStatusBanner.style.display = 'none';
  }

  el.sourcePropertiesForm.innerHTML = `
    <div style="text-align: center; color: var(--obs-text-gray); padding: 32px 0; font-size: 13px;">
      Loading properties from OBS...
    </div>
  `;

  el.modalMediaFile.classList.add('open');

  try {
    const res = await state.obs.getInputSettings(sourceName);
    const kind = res.inputKind || (item ? item.inputKind : 'image_source');
    activePropertiesInputKind = kind;

    const kindLabel = kind.replace(/_source(_v\d+)?$/, '').replace(/_input$/, '').replace(/_/g, ' ');
    if (el.sourceTypePill) {
      el.sourceTypePill.textContent = kindLabel.toUpperCase();
    }

    let defRes = { defaultInputSettings: {} };
    try {
      defRes = await state.obs.getInputDefaultSettings(kind);
    } catch (_) {}

    activePropertiesDefaults = defRes.defaultInputSettings || {};
    activePropertiesDraftSettings = { ...activePropertiesDefaults, ...(res.inputSettings || {}) };

    await buildPropertiesView({
      container: el.sourcePropertiesForm,
      sourceName,
      inputKind: kind,
      currentSettings: res.inputSettings || {},
      defaultSettings: activePropertiesDefaults,
      obsClient: state.obs,
      onBrowseHost: (args) => openHostFileBrowser(args),
      onBrowseLocal: (args) => openLocalFileBrowser(args),
      onSettingChange: (_key, _val, draft) => {
        activePropertiesDraftSettings = draft;
      },
      onTriggerButton: async (actionOrKey) => {
        if (actionOrKey === 'refresh_browser') {
          try {
            await state.obs.request('PressInputPropertiesButton', {
              inputName: sourceName,
              propertyName: 'refreshnocache',
            });
            showPropertiesBanner('✓ Browser cache reloaded in OBS', false);
          } catch (err) {
            showPropertiesBanner(`Error refreshing browser: ${err.message}`, true);
          }
        } else {
          try {
            await state.obs.pressInputPropertiesButton(sourceName, actionOrKey);
            showPropertiesBanner(`✓ Action "${actionOrKey}" triggered in OBS`, false);
          } catch (err) {
            showPropertiesBanner(`Action error: ${err.message}`, true);
          }
        }
      },
    });
  } catch (err) {
    el.sourcePropertiesForm.innerHTML = `
      <div style="padding: 24px; text-align: center; color: var(--obs-red); font-size: 13px;">
        Failed to load properties: ${escapeHtml(err.message)}
      </div>
    `;
  }
}

function closeMediaModal() {
  el.modalMediaFile.classList.remove('open');
  if (el.propLocalFileInput) {
    el.propLocalFileInput.value = '';
  }
}

async function applyPropertiesChanges() {
  if (!state.selectedMediaSource) return;

  try {
    if (el.btnPropertiesApply) {
      el.btnPropertiesApply.textContent = 'Applying...';
    }

    await state.obs.setInputSettings(state.selectedMediaSource, activePropertiesDraftSettings);

    thumbnailCache.delete(state.selectedMediaSource);
    loadSourcesForScene(state.selectedCategoryScene);

    if (state.isPreviewExpanded) {
      setTimeout(fetchPreviewSnapshot, 300);
    }

    showPropertiesBanner('✓ Settings successfully saved to OBS Studio!', false);

    if (el.btnPropertiesApply) {
      el.btnPropertiesApply.textContent = '✓ Saved';
      setTimeout(() => {
        if (el.btnPropertiesApply) el.btnPropertiesApply.textContent = 'Apply Changes';
      }, 1500);
    }
  } catch (err) {
    console.error('[Apply Properties Error]', err);
    if (el.btnPropertiesApply) {
      el.btnPropertiesApply.textContent = 'Apply Changes';
    }
    showPropertiesBanner(`Failed to save settings: ${err.message}`, true);
  }
}

async function resetPropertiesDefaults() {
  if (!state.selectedMediaSource || !activePropertiesDefaults) return;
  activePropertiesDraftSettings = { ...activePropertiesDefaults };

  await buildPropertiesView({
    container: el.sourcePropertiesForm,
    sourceName: state.selectedMediaSource,
    inputKind: activePropertiesInputKind,
    currentSettings: activePropertiesDraftSettings,
    defaultSettings: activePropertiesDefaults,
    obsClient: state.obs,
    onBrowseHost: (args) => openHostFileBrowser(args),
    onBrowseLocal: (args) => openLocalFileBrowser(args),
    onSettingChange: (_k, _v, draft) => {
      activePropertiesDraftSettings = draft;
    },
    onTriggerButton: async (key) => {
      try {
        await state.obs.pressInputPropertiesButton(state.selectedMediaSource, key);
        showPropertiesBanner(`✓ Action "${key}" triggered in OBS`, false);
      } catch (err) {
        showPropertiesBanner(`Action error: ${err.message}`, true);
      }
    },
  });

  showPropertiesBanner('Reset to default values. Click "Apply Changes" to save to OBS.', false);
}

// Local Device File Picker / Upload Helper
function openLocalFileBrowser({ propKey, accept, onUploaded }) {
  activeLocalUploadCallback = onUploaded;
  if (el.propLocalFileInput) {
    el.propLocalFileInput.accept = accept || '*/*';
    el.propLocalFileInput.value = '';
    el.propLocalFileInput.click();
  }
}

// OBS Host Filesystem Browser Modal Logic
async function openHostFileBrowser({ propKey, currentPath, pathType, accept, onSelect }) {
  activeHostBrowserTarget = { propKey, currentPath, pathType, accept, onSelect };

  if (el.hostBrowserFooter) {
    el.hostBrowserFooter.style.display = pathType === 'folder' ? 'block' : 'none';
  }

  let startDir = '';
  if (currentPath && typeof currentPath === 'string') {
    const isFile = /\.[a-zA-Z0-9]+$/.test(currentPath);
    const parts = currentPath.split(/[\\/]/);
    if (isFile && parts.length > 1) {
      parts.pop();
      startDir = parts.join('/');
    } else {
      startDir = currentPath;
    }
  }

  el.modalHostFileBrowser.classList.add('open');
  await loadHostDirectory(startDir || '__UPLOADS__');
}

function closeHostFileBrowser() {
  el.modalHostFileBrowser.classList.remove('open');
  activeHostBrowserTarget = null;
}

async function loadHostDirectory(dir) {
  el.hostBrowserEntries.innerHTML = `
    <div style="text-align: center; color: var(--obs-text-gray); padding: 28px 0; font-size: 13px;">
      Loading host directory...
    </div>
  `;

  try {
    const res = await fetch(`/api/fs/browse?dir=${encodeURIComponent(dir || '')}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    currentHostDir = data.currentDir;
    currentHostParentDir = data.parentDir;

    el.hostBrowserBreadcrumb.textContent = data.currentDir;

    if (data.parentDir) {
      el.btnHostNavUp.style.display = 'flex';
    } else {
      el.btnHostNavUp.style.display = 'none';
    }

    renderHostEntries(data.entries || []);
  } catch (err) {
    el.hostBrowserEntries.innerHTML = `
      <div style="text-align: center; color: var(--obs-red); padding: 24px 12px; font-size: 13px;">
        Failed to browse host folder: ${escapeHtml(err.message)}
      </div>
    `;
  }
}

function renderHostEntries(entries) {
  el.hostBrowserEntries.innerHTML = '';

  if (entries.length === 0) {
    el.hostBrowserEntries.innerHTML = `
      <div style="text-align: center; color: var(--obs-text-gray); padding: 32px 0; font-size: 13px;">
        Folder is empty.
      </div>
    `;
    return;
  }

  entries.forEach((entry) => {
    const row = document.createElement('div');
    row.className = 'host-entry-item';

    const icon = entry.isDirectory ? '📁' : getFileIcon(entry.ext);
    const sizeStr = entry.isDirectory ? '' : formatFileSize(entry.size);

    row.innerHTML = `
      <div class="host-entry-left">
        <span class="host-entry-icon">${icon}</span>
        <span class="host-entry-name">${escapeHtml(entry.name)}</span>
        ${sizeStr ? `<span class="host-entry-meta">${sizeStr}</span>` : ''}
      </div>
      <div>
        <button type="button" class="btn-host-select-file">
          ${entry.isDirectory ? 'Open' : 'Select'}
        </button>
      </div>
    `;

    row.addEventListener('click', (e) => {
      e.preventDefault();
      if (entry.isDirectory) {
        loadHostDirectory(entry.path);
      } else {
        if (activeHostBrowserTarget && activeHostBrowserTarget.onSelect) {
          activeHostBrowserTarget.onSelect(entry.path);
        }
        closeHostFileBrowser();
      }
    });

    el.hostBrowserEntries.appendChild(row);
  });
}

function getFileIcon(ext) {
  switch (ext) {
    case '.png':
    case '.jpg':
    case '.jpeg':
    case '.gif':
    case '.webp':
    case '.svg':
      return '🖼️';
    case '.mp4':
    case '.mov':
    case '.mkv':
    case '.webm':
    case '.avi':
      return '🎬';
    case '.mp3':
    case '.wav':
    case '.aac':
    case '.flac':
    case '.ogg':
      return '🎵';
    case '.html':
    case '.htm':
      return '🌐';
    case '.txt':
    case '.log':
      return '📄';
    default:
      return '📄';
  }
}

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
  if (el.toggleAdvancedOptions) {
    el.toggleAdvancedOptions.checked = state.advancedOptionsEnabled;
  }
  el.modalSettings.classList.add('open');
}

function closeSettingsModal() {
  el.modalSettings.classList.remove('open');
}

// Dedicated OBS Connection Modal
function openConnectionModal() {
  loadSavedCredentials();
  el.modalConnection.classList.add('open');
}

function closeConnectionModal() {
  el.modalConnection.classList.remove('open');
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
