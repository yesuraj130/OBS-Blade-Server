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
  copiedTransform: null,
  activeEditTransform: null,
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
  chkExpanderAutoRefresh: document.getElementById('chk-expander-auto-refresh'),

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
  chkOverrideIp: document.getElementById('chk-override-ip'),
  setPort: document.getElementById('set-port'),
  chkOverridePort: document.getElementById('chk-override-port'),
  setPass: document.getElementById('set-pass'),
  chkOverridePass: document.getElementById('chk-override-pass'),
  setFileUrl: document.getElementById('set-file-url'),
  chkOverrideFileUrl: document.getElementById('chk-override-file-url'),
  setFilePass: document.getElementById('set-file-pass'),
  chkOverrideFilePass: document.getElementById('chk-override-file-pass'),
  btnUseRealObs: document.getElementById('btn-use-real-obs'),
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

  // Dedicated Full Preview Modal
  modalFullPreview: document.getElementById('modal-full-preview'),
  btnBackFullPreview: document.getElementById('btn-back-full-preview'),
  btnCloseFullPreview: document.getElementById('btn-close-full-preview'),
  fullPreviewTitle: document.getElementById('full-preview-title'),
  fullPreviewTypeBadge: document.getElementById('full-preview-type-badge'),
  fullPreviewImg: document.getElementById('full-preview-img'),
  fullPreviewLoading: document.getElementById('full-preview-loading'),
  fullPreviewFallback: document.getElementById('full-preview-fallback'),
  fullPreviewFallbackIcon: document.getElementById('full-preview-fallback-icon'),
  fullPreviewFallbackTitle: document.getElementById('full-preview-fallback-title'),
  fullPreviewFallbackDesc: document.getElementById('full-preview-fallback-desc'),
  fullPreviewStatusText: document.getElementById('full-preview-status-text'),
  fullPreviewTimestamp: document.getElementById('full-preview-timestamp'),
  fullPreviewSceneHint: document.getElementById('full-preview-scene-hint'),
  fullPreviewResHint: document.getElementById('full-preview-res-hint'),
  btnFullPreviewRefresh: document.getElementById('btn-full-preview-refresh'),
  chkFullPreviewAutoRefresh: document.getElementById('chk-full-preview-auto-refresh'),

  // OBS Host Filesystem Browser Modal
  modalHostFileBrowser: document.getElementById('modal-host-file-browser'),
  btnBackHostBrowser: document.getElementById('btn-back-host-browser'),
  btnCloseHostBrowser: document.getElementById('btn-close-host-browser'),
  btnHostNavUp: document.getElementById('btn-host-nav-up'),
  hostBrowserBreadcrumb: document.getElementById('host-browser-breadcrumb'),
  hostBrowserEntries: document.getElementById('host-browser-entries'),
  hostBrowserFooter: document.getElementById('host-browser-footer'),
  btnSelectCurrentFolder: document.getElementById('btn-select-current-folder'),
  modalLargeUploadConfirm: document.getElementById('modal-large-upload-confirm'),
  largeUploadConfirmBody: document.getElementById('large-upload-confirm-body'),
  btnCancelLargeUpload: document.getElementById('btn-cancel-large-upload'),
  btnConfirmLargeUpload: document.getElementById('btn-confirm-large-upload'),

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

  // Edit Transform Modal (OBS 32+)
  modalEditTransform: document.getElementById('modal-edit-transform'),
  btnBackEditTransform: document.getElementById('btn-back-edit-transform'),
  btnDoneEditTransform: document.getElementById('btn-done-edit-transform'),
  editTransformTitle: document.getElementById('edit-transform-title'),
  transformSceneBadge: document.getElementById('transform-scene-badge'),
  transformTypeBadge: document.getElementById('transform-type-badge'),
  transformDimsBadge: document.getElementById('transform-dims-badge'),
  btnCopyTransform: document.getElementById('btn-copy-transform'),
  btnPasteTransform: document.getElementById('btn-paste-transform'),
  textPasteTransform: document.getElementById('text-paste-transform'),
  btnResetTransform: document.getElementById('btn-reset-transform'),
  transformStatusBanner: document.getElementById('transform-status-banner'),
  btnPresetFit: document.getElementById('btn-preset-fit'),
  btnPresetStretch: document.getElementById('btn-preset-stretch'),
  btnPresetCenter: document.getElementById('btn-preset-center'),
  btnPresetFlipH: document.getElementById('btn-preset-flip-h'),
  btnPresetFlipV: document.getElementById('btn-preset-flip-v'),
  formEditTransform: document.getElementById('form-edit-transform'),
  transformPosAlignment: document.getElementById('transform-pos-alignment'),
  transformPosX: document.getElementById('transform-pos-x'),
  transformPosY: document.getElementById('transform-pos-y'),
  transformRotation: document.getElementById('transform-rotation'),
  transformSizeW: document.getElementById('transform-size-w'),
  transformSizeH: document.getElementById('transform-size-h'),
  transformScaleX: document.getElementById('transform-scale-x'),
  transformScaleY: document.getElementById('transform-scale-y'),
  transformBoundsType: document.getElementById('transform-bounds-type'),
  transformBoundsAlignment: document.getElementById('transform-bounds-alignment'),
  transformBoundsW: document.getElementById('transform-bounds-w'),
  transformBoundsH: document.getElementById('transform-bounds-h'),
  transformCropTop: document.getElementById('transform-crop-top'),
  transformCropBottom: document.getElementById('transform-crop-bottom'),
  transformCropLeft: document.getElementById('transform-crop-left'),
  transformCropRight: document.getElementById('transform-crop-right'),
  btnRevertTransform: document.getElementById('btn-revert-transform'),
  btnApplyTransform: document.getElementById('btn-apply-transform'),

  // Pan & Zoom (PTZ) Modal Elements
  modalPtz: document.getElementById('modal-ptz'),
  btnBackPtz: document.getElementById('btn-back-ptz'),
  btnDonePtz: document.getElementById('btn-done-ptz'),
  ptzModalTitle: document.getElementById('ptz-modal-title'),
  ptzBoundsWarning: document.getElementById('ptz-bounds-warning'),
  ptzSourceBadge: document.getElementById('ptz-source-badge'),
  ptzSceneBadge: document.getElementById('ptz-scene-badge'),
  ptzZoomIndicator: document.getElementById('ptz-zoom-indicator'),
  btnPtzRefreshFrame: document.getElementById('btn-ptz-refresh-frame'),
  ptzStatusBanner: document.getElementById('ptz-status-banner'),
  ptzPreviewWrapper: document.getElementById('ptz-preview-wrapper'),
  ptzGestureViewport: document.getElementById('ptz-gesture-viewport'),
  ptzCropMask: document.getElementById('ptz-crop-mask'),
  ptzLiveImg: document.getElementById('ptz-live-img'),
  ptzLoadingSpinner: document.getElementById('ptz-loading-spinner'),
  ptzPreviewFallback: document.getElementById('ptz-preview-fallback'),
  ptzZoomLevelText: document.getElementById('ptz-zoom-level-text'),
  btnPtzZoomOut: document.getElementById('btn-ptz-zoom-out'),
  sliderPtzZoom: document.getElementById('slider-ptz-zoom'),
  btnPtzZoomIn: document.getElementById('btn-ptz-zoom-in'),
  btnPtzZoomReset: document.getElementById('btn-ptz-zoom-reset'),
  btnPtzPanUp: document.getElementById('btn-ptz-pan-up'),
  btnPtzPanDown: document.getElementById('btn-ptz-pan-down'),
  btnPtzPanLeft: document.getElementById('btn-ptz-pan-left'),
  btnPtzPanRight: document.getElementById('btn-ptz-pan-right'),
  btnPtzPanCenter: document.getElementById('btn-ptz-pan-center'),
  hikPtzDial: document.getElementById('hik-ptz-dial'),
  hikPtzKnob: document.getElementById('hik-ptz-knob'),
  hikPanXText: document.getElementById('hik-pan-x-text'),
  hikPanYText: document.getElementById('hik-pan-y-text'),
  btnOpenSavePreset: document.getElementById('btn-open-save-preset'),
  ptzPresetsListContainer: document.getElementById('ptz-presets-list-container'),
  btnPtzReturnWide: document.getElementById('btn-ptz-return-wide'),
  btnPtzApplyNow: document.getElementById('btn-ptz-apply-now'),
  modalSavePtzPreset: document.getElementById('modal-save-ptz-preset'),
  formSavePtzPreset: document.getElementById('form-save-ptz-preset'),
  inputPtzPresetName: document.getElementById('input-ptz-preset-name'),
  btnCancelSavePtzPreset: document.getElementById('btn-cancel-save-ptz-preset'),
};

// Wake lock sentinel instance
let wakeLockSentinel = null;

let fileServerMaxUploadMb = 2048;

function getConfiguredDefaults() {
  const cfg = window.OBS_BLADE_CONFIG || {};
  return {
    obsIp: typeof cfg.obsIp === 'string' ? cfg.obsIp.trim() : '',
    obsPort:
      cfg.obsPort !== undefined && cfg.obsPort !== null ? String(cfg.obsPort).trim() : '',
    obsPassword: typeof cfg.obsPassword === 'string' ? cfg.obsPassword : '',
    fileServerUrl: typeof cfg.fileServerUrl === 'string' ? cfg.fileServerUrl.trim() : '',
    fileServerPassword:
      typeof cfg.fileServerPassword === 'string' ? cfg.fileServerPassword : '',
  };
}

function getEffectiveConnectionConfig() {
  const defaults = getConfiguredDefaults();
  let overrideIp = null;
  let overridePort = null;
  let overridePass = null;
  let overrideFileUrl = null;
  let overrideFilePass = null;

  try {
    overrideIp = localStorage.getItem('obs_blade_ip');
    overridePort = localStorage.getItem('obs_blade_port');
    overridePass = localStorage.getItem('obs_blade_pw');
    overrideFileUrl = localStorage.getItem('obs_blade_file_server_url');
    overrideFilePass = localStorage.getItem('obs_blade_file_pw');
  } catch (_) {}

  return {
    ip: overrideIp !== null ? overrideIp.trim() : defaults.obsIp,
    port: (overridePort !== null ? overridePort.trim() : defaults.obsPort) || '4455',
    password: overridePass !== null ? overridePass : defaults.obsPassword,
    fileUrl: overrideFileUrl !== null ? overrideFileUrl.trim() : defaults.fileServerUrl,
    filePassword:
      overrideFilePass !== null ? overrideFilePass : defaults.fileServerPassword,
    overrides: {
      ip: overrideIp,
      port: overridePort,
      password: overridePass,
      fileUrl: overrideFileUrl,
      filePassword: overrideFilePass,
    },
  };
}

// Helper to resolve the File Browser microservice URL (override -> config.js -> fallback port 3000)
function getFileServerApiUrl(endpoint) {
  const effectiveUrl = getEffectiveConnectionConfig().fileUrl;
  if (effectiveUrl) {
    return effectiveUrl.replace(/\/+$/, '') + endpoint;
  }

  // If dashboard is served over HTTP from IIS or another port (e.g. port 80), connect to port 3000
  if (location.protocol === 'http:' && location.port !== '3000') {
    return `${location.protocol}//${location.hostname}:3000${endpoint}`;
  }
  return endpoint;
}

// Helper to resolve the active File Browser password (override -> config.js)
function getFileServerPassword() {
  return getEffectiveConnectionConfig().filePassword;
}

// Non-blocking asynchronous verification of File Browser server upon OBS connection
async function checkFileBrowserStatus(customUrl, password) {
  let fileUrl = customUrl;
  if (fileUrl === undefined || fileUrl === null) {
    fileUrl = getEffectiveConnectionConfig().fileUrl;
  }
  if (!fileUrl) {
    fileUrl =
      location.protocol === 'http:' && location.port !== '3000'
        ? `${location.protocol}//${location.hostname}:3000`
        : location.origin;
  }
  if (!fileUrl) return;

  const targetUrl = fileUrl.replace(/\/+$/, '') + '/api/status';
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const headers = password ? { Authorization: `Bearer ${password}` } : {};
    const res = await fetch(targetUrl, {
      signal: controller.signal,
      headers,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        showGlobalNotice(`⚠️ Connected to OBS, but File Browser password was incorrect (${res.status}).`, true);
      } else {
        showGlobalNotice(`⚠️ Connected to OBS, but File Browser returned error HTTP ${res.status}.`, true);
      }
      return;
    }

    const data = await res.json();
    if (typeof data.maxUploadMb === 'number' && data.maxUploadMb > 0) {
      fileServerMaxUploadMb = data.maxUploadMb;
    }
    if (data.authValid === false) {
      showGlobalNotice(`⚠️ Connected to OBS, but File Browser password did not match.`, true);
    } else {
      console.log('[File Server] Verified connection to', fileUrl);
      showGlobalNotice(`✓ Connected to OBS & File Browser server`, false);
    }
  } catch (err) {
    console.warn('[File Server Notice]', err.message);
    showGlobalNotice(`Notice: Connected to OBS. File Browser server unreachable at ${fileUrl} (media uploads disabled).`, false, 6000);
  }
}

// Global non-intrusive floating toast notice
function showGlobalNotice(message, isError = false, duration = 4500) {
  let toast = document.getElementById('global-obs-notice-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'global-obs-notice-toast';
    toast.style.position = 'fixed';
    toast.style.top = '16px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.zIndex = '99999';
    toast.style.maxWidth = '90vw';
    toast.style.padding = '10px 18px';
    toast.style.borderRadius = '8px';
    toast.style.fontSize = '12.5px';
    toast.style.fontWeight = '500';
    toast.style.boxShadow = '0 8px 24px rgba(0,0,0,0.5)';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.gap = '8px';
    toast.style.transition = 'opacity 0.3s ease';
    document.body.appendChild(toast);
  }

  toast.style.background = isError ? '#3f1212' : '#14291f';
  toast.style.color = isError ? '#fca5a5' : '#86efac';
  toast.style.border = `1px solid ${isError ? '#991b1b' : '#166534'}`;
  toast.textContent = message;
  toast.style.opacity = '1';
  toast.style.display = 'flex';

  setTimeout(() => {
    if (toast && toast.textContent === message) {
      toast.style.opacity = '0';
      setTimeout(() => { toast.style.display = 'none'; }, 300);
    }
  }, duration);
}

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
    const effective = getEffectiveConnectionConfig();
    if (effective.fileUrl) {
      checkFileBrowserStatus(effective.fileUrl, effective.filePassword);
    }
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

    const rawCopiedTransform = localStorage.getItem('obs_blade_copied_transform');
    if (rawCopiedTransform) {
      try {
        state.copiedTransform = JSON.parse(rawCopiedTransform);
      } catch (_) {}
    }
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

// Re-acquire wake lock & automatically re-connect / health-check OBS WebSocket when tab becomes active
async function handleTabActive() {
  if (state.wakeLockEnabled) {
    requestWakeLock();
  }

  // If user deliberately opened connection modal, don't interrupt them
  const isConnModalOpen = el.modalConnection && el.modalConnection.classList.contains('open');
  if (isConnModalOpen) return;

  console.log('[App] Tab active / visible. Checking OBS connection health...');
  if (state.obs.status !== 'connected' || !state.obs.ws || state.obs.ws.readyState !== WebSocket.OPEN) {
    if (state.url) {
      state.obs.connect(state.url, state.password, false);
    } else {
      connectToLocalSimulator();
    }
  } else {
    // Check health & re-sync initial state
    state.obs.checkConnectionHealth();
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    handleTabActive();
  }
});

window.addEventListener('focus', () => {
  handleTabActive();
});

window.addEventListener('pageshow', () => {
  handleTabActive();
});

window.addEventListener('online', () => {
  console.log('[App] Network recovered online.');
  handleTabActive();
});

function syncOverrideInputState(checkboxEl, inputEl, overrideValue, overridePlaceholder) {
  if (!checkboxEl || !inputEl) return;
  const isOverridden = overrideValue !== null && overrideValue !== undefined;
  checkboxEl.checked = isOverridden;
  inputEl.disabled = !isOverridden;
  inputEl.value = isOverridden ? overrideValue : '';
  inputEl.placeholder = isOverridden ? overridePlaceholder : 'Using default configuration';
}

function bindOverrideToggle(checkboxEl, inputEl, storageKey, overridePlaceholder) {
  if (!checkboxEl || !inputEl) return;
  checkboxEl.addEventListener('change', () => {
    const enabled = checkboxEl.checked;
    inputEl.disabled = !enabled;
    if (enabled) {
      let saved = null;
      try {
        saved = localStorage.getItem(storageKey);
      } catch (_) {}
      inputEl.value = saved !== null ? saved : '';
      inputEl.placeholder = overridePlaceholder;
      inputEl.focus();
    } else {
      inputEl.value = '';
      inputEl.placeholder = 'Using default configuration';
    }
  });
}

function loadSavedCredentials() {
  try {
    localStorage.removeItem('obs_blade_file_same_pass');
  } catch (_) {}

  const effective = getEffectiveConnectionConfig();
  const { overrides } = effective;

  syncOverrideInputState(el.chkOverrideIp, el.setIp, overrides.ip, '192.168.1.100');
  syncOverrideInputState(el.chkOverridePort, el.setPort, overrides.port, '4455');
  syncOverrideInputState(el.chkOverridePass, el.setPass, overrides.password, 'Leave empty if none');
  syncOverrideInputState(
    el.chkOverrideFileUrl,
    el.setFileUrl,
    overrides.fileUrl,
    'http://192.168.1.100:3001'
  );
  syncOverrideInputState(
    el.chkOverrideFilePass,
    el.setFilePass,
    overrides.filePassword,
    'Leave empty if none'
  );

  state.password = effective.password;
  if (effective.ip) {
    if (effective.ip.startsWith('ws://') || effective.ip.startsWith('wss://')) {
      state.url = effective.ip;
    } else {
      const isSecure = location.protocol === 'https:';
      const protocol = isSecure && effective.ip === location.hostname ? 'wss://' : 'ws://';
      state.url = `${protocol}${effective.ip}:${effective.port}`;
    }
  } else {
    state.url = '';
  }
}

function saveCredentials({ ip, port, password, fileUrl, filePassword }) {
  try {
    const syncKey = (key, val) => {
      if (val !== null && val !== undefined) {
        localStorage.setItem(key, val);
      } else {
        localStorage.removeItem(key);
      }
    };
    syncKey('obs_blade_ip', ip);
    syncKey('obs_blade_port', port);
    syncKey('obs_blade_pw', password);
    syncKey('obs_blade_file_server_url', fileUrl);
    syncKey('obs_blade_file_pw', filePassword);
    localStorage.removeItem('obs_blade_file_same_pass');
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
  state.isRealObs = false;
  state.obs.connect(state.url, '');
}

function connectToRealObs() {
  const isSecure = location.protocol === 'https:';
  const protocol = isSecure ? 'wss://' : 'ws://';
  state.url = `${protocol}${location.host}/obs-real-ws`;
  state.password = '';
  state.isRealObs = true;
  state.obs.connect(state.url, '');
}

function setupObsEvents() {
  state.obs.on('status', ({ status, error }) => {
    if (status === 'connected') {
      state.hasFallenBackToSimulator = false;
      const isReal = state.url && state.url.includes('/obs-real-ws');
      el.navTopTitle.textContent = isReal ? 'OBS Studio 29 (Live)' : 'OBS Dashboard';
    } else if (status === 'connecting') {
      el.navTopTitle.textContent = 'Connecting...';
    } else {
      el.navTopTitle.textContent = 'OBS Dashboard (Offline)';
      isExpanderAutoRefreshRunning = false;
      isFullPreviewAutoRefreshRunning = false;
      if (state.isRealObs && error && !state.hasFallenBackToSimulator) {
        state.hasFallenBackToSimulator = true;
        console.warn('[OBS Client] Real OBS not currently reachable, connecting to local simulator...');
        setTimeout(() => {
          connectToLocalSimulator();
        }, 300);
      }
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
    if (data?.sourceName) {
      thumbnailCache.delete(data.sourceName);
    }
    if (activeFiltersTarget && activeFiltersTarget.name === data.sourceName) {
      loadFiltersForTarget(activeFiltersTarget);
    }
  });

  state.obs.on('filterSettingsChanged', (data) => {
    if (data?.sourceName) {
      thumbnailCache.delete(data.sourceName);
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
    if (typeof closePtzModal === 'function') closePtzModal();
    if (typeof closeFullPreviewModal === 'function') closeFullPreviewModal();
    if (typeof closeRenameModal === 'function') closeRenameModal();
    if (typeof closeSettingsModal === 'function') closeSettingsModal();
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
      if (el.chkExpanderAutoRefresh && el.chkExpanderAutoRefresh.checked) {
        runExpanderAutoRefreshLoop();
      } else {
        fetchPreviewSnapshot();
      }
    } else {
      isExpanderAutoRefreshRunning = false;
    }
  });

  // Expander Auto Refresh Checkbox (5 FPS rate limit)
  if (el.chkExpanderAutoRefresh) {
    el.chkExpanderAutoRefresh.addEventListener('change', (e) => {
      e.stopPropagation();
      const parentLabel = el.chkExpanderAutoRefresh.closest('.preview-auto-refresh-label');
      if (parentLabel) parentLabel.classList.toggle('active', el.chkExpanderAutoRefresh.checked);
      if (el.chkExpanderAutoRefresh.checked) {
        if (!state.isPreviewExpanded) {
          state.isPreviewExpanded = true;
          el.previewChevron.classList.add('expanded');
          el.previewAccordionBody.classList.add('open');
        }
        runExpanderAutoRefreshLoop();
      } else {
        isExpanderAutoRefreshRunning = false;
      }
    });

    // Prevent clicking on the label or checkbox from toggling the preview accordion
    el.chkExpanderAutoRefresh.closest('.preview-auto-refresh-label')?.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  // Refresh Preview button
  el.btnPreviewRefresh.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    fetchPreviewSnapshot();
  });

  // Clicking on scene live preview image opens full preview
  if (el.previewLiveImg) {
    el.previewLiveImg.style.cursor = 'pointer';
    el.previewLiveImg.title = 'Click to open full preview';
    el.previewLiveImg.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const currentTarget = getCurrentTargetScene();
      if (currentTarget) {
        openSourceFullPreview({ sourceName: currentTarget, inputKind: 'scene' }, currentTarget);
      }
    });
  }

  // Full Preview Modal Handlers
  if (el.btnBackFullPreview) {
    el.btnBackFullPreview.addEventListener('click', (e) => {
      e.preventDefault();
      closeFullPreviewModal();
    });
  }
  if (el.btnCloseFullPreview) {
    el.btnCloseFullPreview.addEventListener('click', (e) => {
      e.preventDefault();
      closeFullPreviewModal();
    });
  }
  if (el.btnFullPreviewRefresh) {
    el.btnFullPreviewRefresh.addEventListener('click', (e) => {
      e.preventDefault();
      refreshFullPreview();
    });
  }

  // Full Preview Page Auto-refresh Checkbox (5 FPS rate limit)
  if (el.chkFullPreviewAutoRefresh) {
    el.chkFullPreviewAutoRefresh.addEventListener('change', (e) => {
      const parentLabel = el.chkFullPreviewAutoRefresh.closest('.preview-auto-refresh-label');
      if (parentLabel) parentLabel.classList.toggle('active', el.chkFullPreviewAutoRefresh.checked);
      if (el.chkFullPreviewAutoRefresh.checked) {
        runFullPreviewAutoRefreshLoop();
      } else {
        isFullPreviewAutoRefreshRunning = false;
        if (el.fullPreviewStatusText) el.fullPreviewStatusText.textContent = 'LATEST FRAME';
      }
    });
  }

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

  // Per-field Override toggles in OBS Connection modal
  bindOverrideToggle(el.chkOverrideIp, el.setIp, 'obs_blade_ip', '192.168.1.100');
  bindOverrideToggle(el.chkOverridePort, el.setPort, 'obs_blade_port', '4455');
  bindOverrideToggle(el.chkOverridePass, el.setPass, 'obs_blade_pw', 'Leave empty if none');
  bindOverrideToggle(
    el.chkOverrideFileUrl,
    el.setFileUrl,
    'obs_blade_file_server_url',
    'http://192.168.1.100:3001'
  );
  bindOverrideToggle(
    el.chkOverrideFilePass,
    el.setFilePass,
    'obs_blade_file_pw',
    'Leave empty if none'
  );

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
      const useCustomIp = Boolean(el.chkOverrideIp?.checked);
      const useCustomPort = Boolean(el.chkOverridePort?.checked);
      const useCustomPass = Boolean(el.chkOverridePass?.checked);
      const useCustomFileUrl = Boolean(el.chkOverrideFileUrl?.checked);
      const useCustomFilePass = Boolean(el.chkOverrideFilePass?.checked);

      if (useCustomIp && !el.setIp.value.trim()) {
        showGlobalNotice('Please enter an OBS IP address or uncheck Override.', true);
        el.setIp.focus();
        return;
      }

      saveCredentials({
        ip: useCustomIp ? el.setIp.value.trim() : null,
        port: useCustomPort ? el.setPort.value.trim() : null,
        password: useCustomPass ? el.setPass.value : null,
        fileUrl: useCustomFileUrl ? el.setFileUrl.value.trim() : null,
        filePassword: useCustomFilePass ? el.setFilePass.value : null,
      });

      const effective = getEffectiveConnectionConfig();
      if (!effective.ip) {
        showGlobalNotice('No default OBS IP configured. Enable Override to enter an OBS IP address.', true);
        return;
      }

      if (effective.ip.startsWith('ws://') || effective.ip.startsWith('wss://')) {
        state.url = effective.ip;
      } else {
        const protocol =
          location.protocol === 'https:' && effective.ip === location.hostname ? 'wss://' : 'ws://';
        state.url = `${protocol}${effective.ip}:${effective.port}`;
      }
      state.password = effective.password;
      state.isRealObs = state.url.includes('/obs-real-ws');

      state.obs.connect(state.url, state.password);
      closeConnectionModal();

      // Non-blocking asynchronous verification of File Browser server
      checkFileBrowserStatus(effective.fileUrl, effective.filePassword);
    });
  }

  if (el.btnUseRealObs) {
    el.btnUseRealObs.addEventListener('click', (e) => {
      e.preventDefault();
      connectToRealObs();
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
    el.modalFullPreview,
  ].forEach((overlay) => {
    if (!overlay) return;
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('open');
      }
    });
  });

  // Escape key to dismiss modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (el.modalFullPreview && el.modalFullPreview.classList.contains('open')) {
        closeFullPreviewModal();
      }
    }
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

  // Local File Input Change Handler (uploads to host with >100 MB prompt & progress)
  if (el.propLocalFileInput) {
    el.propLocalFileInput.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const isEditMediaOpen = el.modalEditMedia && el.modalEditMedia.classList.contains('open');
      const showBanner = isEditMediaOpen ? showEditMediaBanner : showPropertiesBanner;

      const maxBytes = fileServerMaxUploadMb * 1024 * 1024;
      if (file.size > maxBytes) {
        showBanner(
          `File "${file.name}" (${formatFileSize(file.size)}) exceeds server limit of ${fileServerMaxUploadMb} MB.`,
          true
        );
        el.propLocalFileInput.value = '';
        return;
      }

      if (file.size > 100 * 1024 * 1024) {
        const proceed = await confirmLargeFileUpload(file, fileServerMaxUploadMb);
        if (!proceed) {
          el.propLocalFileInput.value = '';
          showBanner('Large file upload cancelled.', false);
          return;
        }
      }

      showBanner(`Uploading "${file.name}" to OBS host (0%)...`, false);
      const formData = new FormData();
      formData.append('media', file);

      try {
        const uploadUrl = getFileServerApiUrl('/api/upload');
        const filePw = getFileServerPassword();

        const data = await uploadFileWithProgress(uploadUrl, formData, filePw, (loaded, total) => {
          const pct = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0;
          showBanner(
            `Uploading "${file.name}"... ${pct}% (${formatFileSize(loaded)} / ${formatFileSize(total)})`,
            false
          );
        });

        showBanner(`✓ Uploaded "${file.name}" to host!`, false);

        if (activeLocalUploadCallback) {
          activeLocalUploadCallback(data.path);
          activeLocalUploadCallback = null;
        }
      } catch (err) {
        console.error('[Upload Error]', err);
        if (err && err.httpStatus) {
          showBanner(err.message, true);
        } else {
          showBanner('Not possible now since file browser server not connected', true);
        }
      } finally {
        el.propLocalFileInput.value = '';
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

  // Edit Transform Modal Handlers (OBS 32+)
  if (el.btnBackEditTransform) {
    el.btnBackEditTransform.addEventListener('click', (e) => {
      e.preventDefault();
      closeEditTransformModal();
    });
  }

  if (el.btnDoneEditTransform) {
    el.btnDoneEditTransform.addEventListener('click', async (e) => {
      e.preventDefault();
      await applyTransformAction();
      closeEditTransformModal();
    });
  }

  if (el.btnCopyTransform) {
    el.btnCopyTransform.addEventListener('click', (e) => {
      e.preventDefault();
      readTransformInputsToDraft();
      copyTransformData(
        state.activeEditTransform?.draftTransform,
        state.activeEditTransform?.item?.sourceName
      );
    });
  }

  if (el.btnPasteTransform) {
    el.btnPasteTransform.addEventListener('click', (e) => {
      e.preventDefault();
      pasteTransformAction();
    });
  }

  if (el.btnResetTransform) {
    el.btnResetTransform.addEventListener('click', (e) => {
      e.preventDefault();
      resetTransformAction();
    });
  }

  if (el.btnPresetFit) {
    el.btnPresetFit.addEventListener('click', (e) => {
      e.preventDefault();
      applyPresetAction('fit');
    });
  }
  if (el.btnPresetStretch) {
    el.btnPresetStretch.addEventListener('click', (e) => {
      e.preventDefault();
      applyPresetAction('stretch');
    });
  }
  if (el.btnPresetCenter) {
    el.btnPresetCenter.addEventListener('click', (e) => {
      e.preventDefault();
      applyPresetAction('center');
    });
  }
  if (el.btnPresetFlipH) {
    el.btnPresetFlipH.addEventListener('click', (e) => {
      e.preventDefault();
      applyPresetAction('flip-h');
    });
  }
  if (el.btnPresetFlipV) {
    el.btnPresetFlipV.addEventListener('click', (e) => {
      e.preventDefault();
      applyPresetAction('flip-v');
    });
  }

  if (el.btnRevertTransform) {
    el.btnRevertTransform.addEventListener('click', async (e) => {
      e.preventDefault();
      await revertTransformAction();
    });
  }

  if (el.formEditTransform) {
    el.formEditTransform.addEventListener('submit', async (e) => {
      e.preventDefault();
      await applyTransformAction();
    });
  }

  // Quick Angle Buttons
  const angleButtons = document.querySelectorAll('.btn-angle-nudge');
  angleButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const deg = parseFloat(btn.getAttribute('data-angle') || '0');
      if (el.transformRotation) {
        el.transformRotation.value = deg;
      }
      if (state.activeEditTransform?.draftTransform) {
        state.activeEditTransform.draftTransform.rotation = deg;
      }
    });
  });

  // Dynamic Scale & Size synchronization
  if (el.transformSizeW) {
    el.transformSizeW.addEventListener('input', () => {
      const w = parseFloat(el.transformSizeW.value);
      const sW = state.activeEditTransform?.draftTransform?.sourceWidth;
      if (w > 0 && sW > 0 && el.transformScaleX) {
        const sign = Math.sign(parseFloat(el.transformScaleX.value) || 1);
        el.transformScaleX.value = Math.round((sign * (w / sW)) * 1000) / 1000;
      }
    });
  }
  if (el.transformSizeH) {
    el.transformSizeH.addEventListener('input', () => {
      const h = parseFloat(el.transformSizeH.value);
      const sH = state.activeEditTransform?.draftTransform?.sourceHeight;
      if (h > 0 && sH > 0 && el.transformScaleY) {
        const sign = Math.sign(parseFloat(el.transformScaleY.value) || 1);
        el.transformScaleY.value = Math.round((sign * (h / sH)) * 1000) / 1000;
      }
    });
  }
  if (el.transformScaleX) {
    el.transformScaleX.addEventListener('input', () => {
      const sx = Math.abs(parseFloat(el.transformScaleX.value) || 1);
      const sW = state.activeEditTransform?.draftTransform?.sourceWidth || 1920;
      if (el.transformSizeW) {
        el.transformSizeW.value = Math.round(sW * sx);
      }
    });
  }
  if (el.transformScaleY) {
    el.transformScaleY.addEventListener('input', () => {
      const sy = Math.abs(parseFloat(el.transformScaleY.value) || 1);
      const sH = state.activeEditTransform?.draftTransform?.sourceHeight || 1080;
      if (el.transformSizeH) {
        el.transformSizeH.value = Math.round(sH * sy);
      }
    });
  }

  // Pan & Zoom (PTZ) Modal Handlers (Solution B: Move Transition Plugin)
  if (el.btnBackPtz) {
    el.btnBackPtz.addEventListener('click', (e) => {
      e.preventDefault();
      closePtzModal();
    });
  }

  if (el.btnDonePtz) {
    el.btnDonePtz.addEventListener('click', (e) => {
      e.preventDefault();
      closePtzModal();
    });
  }

  if (el.btnPtzRefreshFrame) {
    el.btnPtzRefreshFrame.addEventListener('click', (e) => {
      e.preventDefault();
      if (activePtzSession) {
        fetchPtzPreviewFrame(activePtzSession.sourceName);
      }
    });
  }

  if (el.btnPtzZoomIn) {
    el.btnPtzZoomIn.addEventListener('click', (e) => {
      e.preventDefault();
      if (!activePtzSession) return;
      activePtzSession.hasPtzModified = true;
      const step = activePtzSession.zoom >= 5.0 ? 1.0 : activePtzSession.zoom >= 2.0 ? 0.5 : 0.2;
      activePtzSession.zoom = Math.min(20.0, Math.round((activePtzSession.zoom + step) * 10) / 10);
      queuePtzUpdate(true);
    });
  }

  if (el.btnPtzZoomOut) {
    el.btnPtzZoomOut.addEventListener('click', (e) => {
      e.preventDefault();
      if (!activePtzSession) return;
      activePtzSession.hasPtzModified = true;
      const step = activePtzSession.zoom > 5.0 ? 1.0 : activePtzSession.zoom > 2.0 ? 0.5 : 0.2;
      activePtzSession.zoom = Math.max(1.0, Math.round((activePtzSession.zoom - step) * 10) / 10);
      queuePtzUpdate(true);
    });
  }

  if (el.btnPtzZoomReset) {
    el.btnPtzZoomReset.addEventListener('click', async (e) => {
      e.preventDefault();
      await returnToWideAction();
    });
  }

  if (el.sliderPtzZoom) {
    el.sliderPtzZoom.addEventListener('input', () => {
      if (!activePtzSession) return;
      activePtzSession.hasPtzModified = true;
      activePtzSession.zoom = parseFloat(el.sliderPtzZoom.value) || 1.0;
      queuePtzUpdate(false);
    });
    el.sliderPtzZoom.addEventListener('change', () => {
      if (!activePtzSession) return;
      activePtzSession.hasPtzModified = true;
      activePtzSession.zoom = parseFloat(el.sliderPtzZoom.value) || 1.0;
      queuePtzUpdate(true);
    });
  }

  // Robust helper for continuous press-and-hold repeating on D-Pad arrows with Hik puck visual deflection
  function attachRepeatPress(button, onStep, directionVisual) {
    if (!button) return;
    let timer = null;
    let interval = null;
    let isHolding = false;
    const knob = document.getElementById('hik-ptz-knob');

    function stop() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
      if (isHolding) {
        isHolding = false;
        if (knob && !isJoystickDragging) {
          knob.classList.remove('dragging');
          knob.style.transform = 'translate(-50%, -50%)';
        }
        if (activePtzSession) {
          queuePtzUpdate(true);
        }
      }
    }

    const start = (e) => {
      e.preventDefault();
      e.stopPropagation();
      stop();
      isHolding = true;

      if (e.pointerId != null && button.setPointerCapture) {
        try {
          button.setPointerCapture(e.pointerId);
        } catch (_) {}
      }

      if (knob && directionVisual) {
        knob.classList.add('dragging');
        knob.style.transform = directionVisual;
      }

      onStep();

      timer = setTimeout(() => {
        interval = setInterval(() => {
          onStep();
        }, 45);
      }, 160);
    };

    button.addEventListener('pointerdown', start);
    button.addEventListener('pointerup', stop);
    button.addEventListener('pointercancel', stop);
    button.addEventListener('lostpointercapture', stop);
    button.addEventListener('mouseleave', (e) => {
      if (e.buttons === 0) stop();
    });
    button.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // Hik-Connect Style PTZ Directional Pan Buttons & Recenter with Continuous Repeat Holding
  attachRepeatPress(
    el.btnPtzPanUp,
    () => {
      if (!activePtzSession) return;
      const geom = computePtzGeometry(activePtzSession);
      if (geom.marginY <= 0.5) return;
      activePtzSession.hasPtzModified = true;
      activePtzSession.panY = Math.max(-1.0, Math.round((activePtzSession.panY - ptzPanStepSize) * 1000) / 1000);
      updatePtzUiIndicators();
      queuePtzUpdate(false);
    },
    'translate(-50%, calc(-50% - 32px))'
  );

  attachRepeatPress(
    el.btnPtzPanDown,
    () => {
      if (!activePtzSession) return;
      const geom = computePtzGeometry(activePtzSession);
      if (geom.marginY <= 0.5) return;
      activePtzSession.hasPtzModified = true;
      activePtzSession.panY = Math.min(1.0, Math.round((activePtzSession.panY + ptzPanStepSize) * 1000) / 1000);
      updatePtzUiIndicators();
      queuePtzUpdate(false);
    },
    'translate(-50%, calc(-50% + 32px))'
  );

  attachRepeatPress(
    el.btnPtzPanLeft,
    () => {
      if (!activePtzSession) return;
      const geom = computePtzGeometry(activePtzSession);
      if (geom.marginX <= 0.5) return;
      activePtzSession.hasPtzModified = true;
      activePtzSession.panX = Math.max(-1.0, Math.round((activePtzSession.panX - ptzPanStepSize) * 1000) / 1000);
      updatePtzUiIndicators();
      queuePtzUpdate(false);
    },
    'translate(calc(-50% - 32px), -50%)'
  );

  attachRepeatPress(
    el.btnPtzPanRight,
    () => {
      if (!activePtzSession) return;
      const geom = computePtzGeometry(activePtzSession);
      if (geom.marginX <= 0.5) return;
      activePtzSession.hasPtzModified = true;
      activePtzSession.panX = Math.min(1.0, Math.round((activePtzSession.panX + ptzPanStepSize) * 1000) / 1000);
      updatePtzUiIndicators();
      queuePtzUpdate(false);
    },
    'translate(calc(-50% + 32px), -50%)'
  );

  if (el.btnPtzPanCenter) {
    el.btnPtzPanCenter.addEventListener('click', (e) => {
      e.preventDefault();
      if (!activePtzSession) return;
      activePtzSession.hasPtzModified = true;
      activePtzSession.panX = 0;
      activePtzSession.panY = 0;
      updateHikKnobVisual();
      queuePtzUpdate(true);
    });
  }

  // D-Pad Pan Step Size Toggles
  const stepButtons = document.querySelectorAll('.btn-pan-step-size');
  stepButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      stepButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      ptzPanStepSize = parseFloat(btn.getAttribute('data-step') || '0.06');
    });
  });

  // Return to Wide Action
  if (el.btnPtzReturnWide) {
    el.btnPtzReturnWide.addEventListener('click', async (e) => {
      e.preventDefault();
      await returnToWideAction();
    });
  }

  // Apply PTZ Now Action
  if (el.btnPtzApplyNow) {
    el.btnPtzApplyNow.addEventListener('click', async (e) => {
      e.preventDefault();
      await dispatchPtzToObs();
      showPtzBanner('✓ PTZ framing applied to OBS Studio!', false);
    });
  }

  // Save Preset Mini Modal Handlers
  if (el.btnOpenSavePreset) {
    el.btnOpenSavePreset.addEventListener('click', (e) => {
      e.preventDefault();
      openSavePtzPresetModal();
    });
  }

  if (el.btnCancelSavePtzPreset) {
    el.btnCancelSavePtzPreset.addEventListener('click', (e) => {
      e.preventDefault();
      closeSavePtzPresetModal();
    });
  }

  if (el.formSavePtzPreset) {
    el.formSavePtzPreset.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (el.inputPtzPresetName) {
        await saveCurrentPtzPreset(el.inputPtzPresetName.value);
      }
    });
  }

  window.addEventListener('resize', () => {
    if (activePtzSession && el.modalPtz?.classList.contains('open')) {
      updatePtzViewportSize();
      updatePtzUiIndicators();
    }
  });

  // Setup Gesture Viewport Handlers (Drag to Pan, Pinch to Zoom, Wheel)
  setupPtzGestureHandlers();

  // Setup Hik-Connect Style 360° Analog Joystick
  setupHikJoystick();
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
  move_source_filter: 'Move Source',
  move_value_filter: 'Move Value',
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

  // Preview Scene / Preview Page: Available for ALL users
  items.push({
    label: 'Preview Scene',
    icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
    onClick: () => openSourceFullPreview({ sourceName: sceneName, inputKind: 'scene' }, sceneName),
  });

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

  // Preview Source / Preview Page: Available for ALL users
  menuItems.push({
    label: 'Preview Source',
    icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
    onClick: () => openSourceFullPreview(item, sceneName),
  });

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

  // Advanced only: Pan & Zoom (PTZ), Edit Transform, Edit Source, Add Source, Remove from Scene
  if (state.advancedOptionsEnabled) {
    menuItems.push({ divider: true });
    menuItems.push({
      label: 'Pan & Zoom (PTZ)',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg>`,
      onClick: () => openPtzModal(sceneName, item),
    });
    menuItems.push({
      label: 'Edit Transform',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 3v18"/></svg>`,
      onClick: () => openEditTransformModal(sceneName, item),
    });
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
// OBS WebSocket v5 returns scenes array from bottom to top.
// We reverse the array to match OBS Studio's top-to-bottom dock order 1:1.
function renderTopSceneButtons() {
  el.scenesGridTop.innerHTML = '';

  const visibleScenes = state.scenes
    .slice()
    .reverse()
    .filter((s) => !state.hiddenSceneButtons.has(s.sceneName));

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
// OBS WebSocket v5 returns scenes array from bottom to top.
// We reverse the array to match OBS Studio's top-to-bottom dock order 1:1.
function renderCategoryGrid() {
  el.categoryTextGrid.innerHTML = '';

  // 1. Individual Pinned Scene Tabs (matching OBS Studio GUI scene order)
  const visibleTabs = state.scenes
    .slice()
    .reverse()
    .filter((s) => !state.hiddenSceneTabs.has(s.sceneName));

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

  if (currentTarget) {
    attachLongPressAndContextMenu(btnCurrent, (x, y) => {
      openSceneContextMenu(x, y, currentTarget);
    });
  }

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
// Cache of uncropped base source dimensions: sourceName -> { origW, origH }
const sourceBaseSizeCache = new Map();
let ptzScreenshotTrimCanvas = null;

function isConnectedToLocalSimulator() {
  try {
    const rawUrl = state.obs?.url || state.url || '';
    if (!rawUrl) return false;
    const parsed = new URL(rawUrl, location.href);
    return parsed.pathname === '/obs-ws';
  } catch (_) {
    return false;
  }
}

function summarizeSourceCropFilters(filters = []) {
  let totalCropX = 0;
  let totalCropY = 0;
  let hasActiveCropFilter = false;
  let allRelative = true;
  let ptzFilter = null;

  for (const f of filters) {
    if (f.filterName === LIVE_PTZ_FILTER_NAME || (!ptzFilter && LEGACY_PTZ_FILTER_NAMES.includes(f.filterName))) {
      ptzFilter = f;
    }
    if (f.filterKind === 'crop_filter' && f.filterEnabled !== false && f.filterSettings) {
      hasActiveCropFilter = true;
      const s = f.filterSettings;
      if (s.relative === false) {
        allRelative = false;
      } else {
        totalCropX += Math.max(0, Number(s.left || 0)) + Math.max(0, Number(s.right || 0));
        totalCropY += Math.max(0, Number(s.top || 0)) + Math.max(0, Number(s.bottom || 0));
      }
    }
  }

  return { ptzFilter, totalCropX, totalCropY, hasActiveCropFilter, allRelative };
}

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

async function trimCroppedObsScreenshot(dataUrl, fracW, fracH, options = {}) {
  const safeFracW = Math.max(0.001, Math.min(1, Number(fracW) || 1));
  const safeFracH = Math.max(0.001, Math.min(1, Number(fracH) || 1));

  if (!dataUrl || dataUrl.startsWith('data:image/svg') || (safeFracW >= 0.998 && safeFracH >= 0.998)) {
    return { dataUrl, wasTrimmed: false, natW: 0, natH: 0 };
  }

  try {
    const img = await loadImageElement(dataUrl);
    const natW = img.naturalWidth || 0;
    const natH = img.naturalHeight || 0;
    if (!natW || !natH) {
      return { dataUrl, wasTrimmed: false, natW: 0, natH: 0 };
    }

    const natRatio = natW / natH;
    if (
      options.visRatio &&
      options.origRatio &&
      Math.abs(natRatio - options.visRatio) < 0.02 &&
      Math.abs(options.visRatio - options.origRatio) > 0.05
    ) {
      return { dataUrl, wasTrimmed: false, natW, natH };
    }

    const cropW = Math.max(1, Math.min(natW, Math.round(natW * safeFracW)));
    const cropH = Math.max(1, Math.min(natH, Math.round(natH * safeFracH)));
    if (cropW >= natW && cropH >= natH) {
      return { dataUrl, wasTrimmed: false, natW, natH };
    }

    if (!ptzScreenshotTrimCanvas) {
      ptzScreenshotTrimCanvas = document.createElement('canvas');
    }
    const canvas = ptzScreenshotTrimCanvas;
    canvas.width = natW;
    canvas.height = natH;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      return { dataUrl, wasTrimmed: false, natW, natH };
    }

    ctx.clearRect(0, 0, natW, natH);
    ctx.drawImage(img, 0, 0, natW, natH);

    // Confirm outer right/bottom band is black OBS padding before trimming
    let sampleSum = 0;
    let sampleCount = 0;
    const samplePixelMax = (px, py) => {
      const d = ctx.getImageData(px, py, 1, 1).data;
      sampleSum += Math.max(d[0], d[1], d[2]);
      sampleCount++;
    };

    if (natW - cropW >= 2) {
      const sx = Math.min(natW - 1, cropW + Math.floor((natW - cropW) / 2));
      for (let k = 0; k < 6; k++) {
        const sy = Math.min(cropH - 1, Math.floor(((k + 0.5) / 6) * cropH));
        samplePixelMax(sx, Math.max(0, sy));
      }
    }
    if (natH - cropH >= 2) {
      const sy = Math.min(natH - 1, cropH + Math.floor((natH - cropH) / 2));
      for (let k = 0; k < 6; k++) {
        const sx = Math.min(cropW - 1, Math.floor(((k + 0.5) / 6) * cropW));
        samplePixelMax(Math.max(0, sx), sy);
      }
    }

    const avgOuterMax = sampleCount > 0 ? sampleSum / sampleCount : 255;
    if (avgOuterMax > 24) {
      return { dataUrl, wasTrimmed: false, natW, natH };
    }

    canvas.width = cropW;
    canvas.height = cropH;
    ctx.clearRect(0, 0, cropW, cropH);
    ctx.drawImage(img, 0, 0, cropW, cropH, 0, 0, cropW, cropH);

    const trimmedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
    return { dataUrl: trimmedDataUrl, wasTrimmed: true, natW: cropW, natH: cropH };
  } catch (_) {
    return { dataUrl, wasTrimmed: false, natW: 0, natH: 0 };
  }
}

async function fetchCroppedSourceScreenshot(sourceName, imageWidth, options = {}) {
  const isSim = isConnectedToLocalSimulator();
  let resolvedScene = options.sceneName || null;
  let resolvedItemId = options.sceneItemId ?? null;

  if (!options.isScene && resolvedItemId == null && Array.isArray(state.sceneItems)) {
    const match = state.sceneItems.find((i) => i.sourceName === sourceName);
    if (match) {
      resolvedItemId = match.sceneItemId;
      if (!resolvedScene || resolvedScene === '__CURRENT__') {
        resolvedScene = getCurrentTargetScene();
      }
    }
  } else if (resolvedScene === '__CURRENT__') {
    resolvedScene = getCurrentTargetScene();
  }

  const cachedBase = sourceBaseSizeCache.get(sourceName);
  const needTransform =
    !isSim &&
    !options.isScene &&
    resolvedScene &&
    resolvedItemId != null &&
    (!options.reuseCachedBaseSize || !cachedBase);

  const [shotRes, filterRes, transRes] = await Promise.all([
    state.obs.getSourceScreenshot(sourceName, 'jpg', imageWidth),
    isSim ? Promise.resolve(null) : state.obs.getSourceFilterList(sourceName).catch(() => null),
    needTransform
      ? state.obs.getSceneItemTransform(resolvedScene, resolvedItemId).catch(() => null)
      : Promise.resolve(null),
  ]);

  if (!shotRes || !shotRes.imageData) {
    return null;
  }

  if (isSim) {
    return { dataUrl: shotRes.imageData, wasTrimmed: false };
  }

  const filters = filterRes?.filters || [];
  const { totalCropX, totalCropY, hasActiveCropFilter, allRelative } = summarizeSourceCropFilters(filters);
  const trans = transRes?.sceneItemTransform || null;

  if (!hasActiveCropFilter) {
    if (trans && trans.sourceWidth > 0 && trans.sourceHeight > 0) {
      sourceBaseSizeCache.set(sourceName, {
        origW: Number(trans.sourceWidth),
        origH: Number(trans.sourceHeight),
      });
    }
    return { dataUrl: shotRes.imageData, wasTrimmed: false };
  }

  let origW = cachedBase?.origW || null;
  let origH = cachedBase?.origH || null;
  let visW = null;
  let visH = null;

  if (trans && trans.sourceWidth != null && trans.sourceHeight != null) {
    visW = Math.max(1, Number(trans.sourceWidth));
    visH = Math.max(1, Number(trans.sourceHeight));
    if (allRelative) {
      origW = Math.max(visW, visW + totalCropX);
      origH = Math.max(visH, visH + totalCropY);
      sourceBaseSizeCache.set(sourceName, { origW, origH });
    }
  } else if (origW && origH && allRelative) {
    visW = Math.max(1, origW - totalCropX);
    visH = Math.max(1, origH - totalCropY);
  }

  if (origW && origH && visW && visH && (visW < origW || visH < origH)) {
    const trimmed = await trimCroppedObsScreenshot(
      shotRes.imageData,
      visW / origW,
      visH / origH,
      { origRatio: origW / origH, visRatio: visW / visH }
    );
    return { dataUrl: trimmed.dataUrl, wasTrimmed: trimmed.wasTrimmed };
  }

  return { dataUrl: shotRes.imageData, wasTrimmed: false };
}

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
async function loadSourceThumbnail(sourceName, category, imgEl, fallbackEl, sceneName = null, sceneItemId = null) {
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
    const res = await fetchCroppedSourceScreenshot(sourceName, 96, { sceneName, sceneItemId });
    if (res && res.dataUrl) {
      thumbnailCache.set(sourceName, { dataUrl: res.dataUrl, timestamp: now });
      imgEl.src = res.dataUrl;
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

  // OBS WebSocket v5 returns sceneItems in bottom-to-top Z-order (index 0 is bottom layer).
  // In OBS Studio GUI, sources are displayed top-to-bottom (foreground to background).
  // We reverse the array to match OBS Studio's Sources dock 1:1.
  const displayItems = items.slice().reverse();

  displayItems.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'source-item-row-blade';
    row.setAttribute('data-source-name', item.sourceName);

    const category = getSourceTypeCategory(item);
    const categoryLabel = category.toUpperCase();
    const isMedia = isMediaSource(item);

    row.innerHTML = `
      <div class="source-left-col">
        <!-- Thumbnail / Type Icon Box (Single tap/click opens full preview) -->
        <button type="button" class="source-thumb-box" title="Tap to preview ${escapeHtml(item.sourceName)} (${categoryLabel})" aria-label="Open full preview of ${escapeHtml(item.sourceName)}">
          <div class="source-type-icon-fallback type-${category}">
            ${getTypeIconSvg(category)}
          </div>
          <img class="source-thumb-img" alt="" style="display: none;" />
        </button>
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
    loadSourceThumbnail(item.sourceName, category, thumbImg, fallbackBox, sceneName, item.sceneItemId);

    // Single tap / click on thumbnail opens full preview of source (latest frame)
    const thumbBox = row.querySelector('.source-thumb-box');
    thumbBox.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openSourceFullPreview(item, sceneName);
    });

    thumbBox.addEventListener(
      'touchstart',
      (e) => {
        // Prevent row touchstart from triggering row's long-press context menu
        e.stopPropagation();
      },
      { passive: true }
    );

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

  state.scenes.slice().reverse().forEach((scene) => {
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

  state.scenes.slice().reverse().forEach((scene) => {
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

// Preview Snapshot & Auto Refresh Loops (5 FPS, min 200ms per frame)
let isExpanderAutoRefreshRunning = false;
let isFullPreviewAutoRefreshRunning = false;

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

async function runExpanderAutoRefreshLoop() {
  if (isExpanderAutoRefreshRunning) return;
  isExpanderAutoRefreshRunning = true;

  try {
    while (
      isExpanderAutoRefreshRunning &&
      el.chkExpanderAutoRefresh &&
      el.chkExpanderAutoRefresh.checked &&
      state.isPreviewExpanded &&
      state.obs.status === 'connected'
    ) {
      const frameStart = performance.now();
      try {
        await fetchPreviewSnapshot();
      } catch (err) {
        // Silently continue
      }
      const elapsed = performance.now() - frameStart;
      // Rate limit to 5fps: minimum 200ms between each frame, max as high as next frame comes
      const delay = Math.max(0, 200 - elapsed);
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  } finally {
    isExpanderAutoRefreshRunning = false;
  }
}

async function runFullPreviewAutoRefreshLoop() {
  if (isFullPreviewAutoRefreshRunning) return;
  isFullPreviewAutoRefreshRunning = true;

  try {
    while (
      isFullPreviewAutoRefreshRunning &&
      el.chkFullPreviewAutoRefresh &&
      el.chkFullPreviewAutoRefresh.checked &&
      activePreviewTarget &&
      activePreviewTarget.item &&
      el.modalFullPreview &&
      el.modalFullPreview.classList.contains('open') &&
      state.obs.status === 'connected'
    ) {
      const frameStart = performance.now();
      try {
        await fetchFullPreviewFrame(activePreviewTarget.item.sourceName, /* isSilentAuto */ true);
      } catch (err) {
        // Silently continue
      }
      const elapsed = performance.now() - frameStart;
      // Rate limit to 5fps: minimum 200ms between each frame, max as high as next frame comes
      const delay = Math.max(0, 200 - elapsed);
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  } finally {
    isFullPreviewAutoRefreshRunning = false;
  }
}

// Full Preview Modal State & Controls
let activePreviewTarget = null; // { item, sceneName }

async function openSourceFullPreview(item, sceneName) {
  if (!item || !item.sourceName) return;
  activePreviewTarget = { item, sceneName };

  const isScene = item.inputKind === 'scene' || (item.sourceName === sceneName && item.sceneItemId == null);
  const category = isScene ? 'screen' : getSourceTypeCategory(item);
  const categoryLabel = isScene ? 'SCENE' : category.toUpperCase();

  if (el.fullPreviewTitle) {
    el.fullPreviewTitle.textContent = item.sourceName;
    el.fullPreviewTitle.title = item.sourceName;
  }
  if (el.fullPreviewTypeBadge) {
    el.fullPreviewTypeBadge.textContent = categoryLabel;
  }
  if (el.fullPreviewSceneHint) {
    const sceneDisplay =
      isScene
        ? item.sourceName
        : (sceneName === '__CURRENT__'
            ? getCurrentTargetScene() || 'Current'
            : sceneName || 'Current');
    el.fullPreviewSceneHint.textContent = `Scene: ${sceneDisplay}`;
  }
  if (el.fullPreviewResHint) {
    el.fullPreviewResHint.textContent = isScene ? 'Scene Program' : (item.inputKind || 'Source Preview');
  }

  // Audio-only source handling
  if (!isScene && category === 'audio') {
    if (el.fullPreviewImg) el.fullPreviewImg.style.display = 'none';
    if (el.fullPreviewLoading) el.fullPreviewLoading.style.display = 'none';
    if (el.fullPreviewFallback) {
      el.fullPreviewFallback.style.display = 'flex';
      el.fullPreviewFallbackIcon.innerHTML = getTypeIconSvg('audio');
      el.fullPreviewFallbackTitle.textContent = 'Audio Device';
      el.fullPreviewFallbackDesc.textContent =
        'Audio sources do not render video frames. Monitor and mix volume levels via OBS audio controls.';
    }
    if (el.fullPreviewStatusText) el.fullPreviewStatusText.textContent = 'AUDIO DEVICE';
    if (el.fullPreviewTimestamp) el.fullPreviewTimestamp.textContent = new Date().toLocaleTimeString();
    if (el.modalFullPreview) el.modalFullPreview.classList.add('open');
    return;
  }

  // Visual source handling
  if (el.fullPreviewFallback) el.fullPreviewFallback.style.display = 'none';
  if (el.fullPreviewStatusText) el.fullPreviewStatusText.textContent = 'LATEST FRAME';

  // Check if we have a recent thumbnail to immediately display
  const cached = thumbnailCache.get(item.sourceName);
  if (cached && cached.dataUrl) {
    el.fullPreviewImg.src = cached.dataUrl;
    el.fullPreviewImg.style.display = 'block';
  } else {
    el.fullPreviewImg.style.display = 'none';
  }

  if (el.fullPreviewLoading) el.fullPreviewLoading.style.display = 'flex';
  if (el.modalFullPreview) el.modalFullPreview.classList.add('open');

  await fetchFullPreviewFrame(item.sourceName);
  if (el.chkFullPreviewAutoRefresh && el.chkFullPreviewAutoRefresh.checked) {
    runFullPreviewAutoRefreshLoop();
  }
}

async function fetchFullPreviewFrame(sourceName, isSilentAuto = false) {
  try {
    if (!isSilentAuto && el.fullPreviewLoading) {
      el.fullPreviewLoading.style.display = 'flex';
    }
    const targetItem = activePreviewTarget?.item || null;
    const targetScene = activePreviewTarget?.sceneName || null;
    const isScene =
      targetItem?.inputKind === 'scene' ||
      (targetItem?.sourceName === targetScene && targetItem?.sceneItemId == null);

    // Request high-resolution frame (1280px width) and trim any OBS crop padding
    const res = await fetchCroppedSourceScreenshot(sourceName, 1280, {
      sceneName: targetScene,
      sceneItemId: targetItem?.sceneItemId ?? null,
      isScene,
      reuseCachedBaseSize: isSilentAuto,
    });
    if (!activePreviewTarget || activePreviewTarget.item?.sourceName !== sourceName) return;

    if (res && res.dataUrl) {
      if (el.fullPreviewImg) {
        el.fullPreviewImg.src = res.dataUrl;
        el.fullPreviewImg.style.display = 'block';
      }
      if (el.fullPreviewFallback) {
        el.fullPreviewFallback.style.display = 'none';
      }
      if (el.fullPreviewTimestamp) {
        el.fullPreviewTimestamp.textContent = new Date().toLocaleTimeString();
      }
      if (el.fullPreviewStatusText) {
        el.fullPreviewStatusText.textContent = isSilentAuto ? 'LIVE (5 FPS)' : 'LATEST FRAME';
      }
      // Update cache
      thumbnailCache.set(sourceName, { dataUrl: res.dataUrl, timestamp: Date.now() });

      // Update thumbnail img in source list if present
      const listThumbs = document.querySelectorAll(
        `[data-source-name="${CSS.escape(sourceName)}"] .source-thumb-img`
      );
      listThumbs.forEach((img) => {
        img.src = res.dataUrl;
        img.style.display = 'block';
        const fallback = img.parentElement?.querySelector('.source-type-icon-fallback');
        if (fallback) fallback.style.display = 'none';
      });
    } else {
      throw new Error('No image data returned from OBS');
    }
  } catch (err) {
    console.warn('[Full Preview Screenshot Failed]', err);
    if (!isSilentAuto && el.fullPreviewImg && !el.fullPreviewImg.getAttribute('src')) {
      el.fullPreviewImg.style.display = 'none';
      if (el.fullPreviewFallback) {
        el.fullPreviewFallback.style.display = 'flex';
        el.fullPreviewFallbackIcon.innerHTML = getTypeIconSvg('generic');
        el.fullPreviewFallbackTitle.textContent = 'Frame Unavailable';
        el.fullPreviewFallbackDesc.textContent =
          err.message || 'Unable to capture latest frame. Source may be inactive or hidden.';
      }
    }
  } finally {
    if (el.fullPreviewLoading) {
      el.fullPreviewLoading.style.display = 'none';
    }
  }
}

async function refreshFullPreview() {
  if (!activePreviewTarget || !activePreviewTarget.item) return;
  await fetchFullPreviewFrame(activePreviewTarget.item.sourceName);
}

function closeFullPreviewModal() {
  if (el.modalFullPreview) {
    el.modalFullPreview.classList.remove('open');
  }
  activePreviewTarget = null;
  isFullPreviewAutoRefreshRunning = false;
  if (el.chkFullPreviewAutoRefresh) {
    el.chkFullPreviewAutoRefresh.checked = false;
    const parentLabel = el.chkFullPreviewAutoRefresh.closest('.preview-auto-refresh-label');
    if (parentLabel) parentLabel.classList.remove('active');
  }
}

// --- Edit Transform State & Functions (OBS 32+ Layout) ---
function showTransformBanner(message, isError = false) {
  if (!el.transformStatusBanner) return;
  el.transformStatusBanner.textContent = message;
  el.transformStatusBanner.className = `properties-status-banner ${isError ? 'error' : ''}`;
  el.transformStatusBanner.style.display = 'block';
  setTimeout(() => {
    if (el.transformStatusBanner && el.transformStatusBanner.textContent === message) {
      el.transformStatusBanner.style.display = 'none';
    }
  }, 4000);
}

function copyTransformData(transform, sourceName) {
  if (!transform) return;
  const toCopy = {
    sourceName: sourceName || 'Source',
    positionX: Number(transform.positionX ?? 0),
    positionY: Number(transform.positionY ?? 0),
    rotation: Number(transform.rotation ?? 0),
    scaleX: Number(transform.scaleX ?? 1),
    scaleY: Number(transform.scaleY ?? 1),
    alignment: Number(transform.alignment ?? 5),
    boundsType: transform.boundsType || 'OBS_BOUNDS_NONE',
    boundsAlignment: Number(transform.boundsAlignment ?? 0),
    boundsWidth: Number(transform.boundsWidth ?? 0),
    boundsHeight: Number(transform.boundsHeight ?? 0),
    cropLeft: Number(transform.cropLeft ?? 0),
    cropRight: Number(transform.cropRight ?? 0),
    cropTop: Number(transform.cropTop ?? 0),
    cropBottom: Number(transform.cropBottom ?? 0),
    copiedAt: Date.now(),
  };

  state.copiedTransform = toCopy;
  try {
    localStorage.setItem('obs_blade_copied_transform', JSON.stringify(toCopy));
  } catch (_) {}

  updatePasteTransformButtonState();
  showTransformBanner(`✓ Copied transform from "${toCopy.sourceName}" to clipboard!`, false);
}

function updatePasteTransformButtonState() {
  if (!el.btnPasteTransform) return;
  if (state.copiedTransform) {
    el.btnPasteTransform.disabled = false;
    if (el.textPasteTransform) {
      el.textPasteTransform.textContent = `Paste (${state.copiedTransform.sourceName || 'Transform'})`;
    }
  } else {
    el.btnPasteTransform.disabled = true;
    if (el.textPasteTransform) {
      el.textPasteTransform.textContent = 'Paste Transform';
    }
  }
}

async function applyDirectPasteTransform(sceneName, sceneItemId) {
  if (!state.copiedTransform) return;
  const payload = {
    positionX: state.copiedTransform.positionX,
    positionY: state.copiedTransform.positionY,
    rotation: state.copiedTransform.rotation,
    scaleX: state.copiedTransform.scaleX,
    scaleY: state.copiedTransform.scaleY,
    alignment: state.copiedTransform.alignment,
    boundsType: state.copiedTransform.boundsType,
    boundsAlignment: state.copiedTransform.boundsAlignment,
    boundsWidth: state.copiedTransform.boundsWidth,
    boundsHeight: state.copiedTransform.boundsHeight,
    cropLeft: state.copiedTransform.cropLeft,
    cropRight: state.copiedTransform.cropRight,
    cropTop: state.copiedTransform.cropTop,
    cropBottom: state.copiedTransform.cropBottom,
  };

  await state.obs.setSceneItemTransform(sceneName, sceneItemId, payload);
  if (state.isPreviewExpanded) {
    setTimeout(fetchPreviewSnapshot, 250);
  }
}

async function openEditTransformModal(sceneName, item) {
  if (!item) return;

  const resolvedScene =
    sceneName === '__CURRENT__' || !sceneName
      ? getCurrentTargetScene() || state.currentProgramScene
      : sceneName;

  state.activeEditTransform = {
    sceneName: resolvedScene,
    item,
    originalTransform: null,
    draftTransform: null,
    baseWidth: 1920,
    baseHeight: 1080,
  };

  if (el.editTransformTitle) {
    el.editTransformTitle.textContent = `Edit Transform for '${item.sourceName}'`;
  }
  if (el.transformSceneBadge) {
    el.transformSceneBadge.textContent = `Scene: ${resolvedScene}`;
  }
  if (el.transformTypeBadge) {
    const category = getSourceTypeCategory(item);
    el.transformTypeBadge.textContent = category.toUpperCase();
  }
  if (el.transformStatusBanner) {
    el.transformStatusBanner.style.display = 'none';
  }

  updatePasteTransformButtonState();
  el.modalEditTransform.classList.add('open');

  try {
    try {
      const vid = await state.obs.getVideoSettings();
      if (vid && vid.baseWidth) {
        state.activeEditTransform.baseWidth = vid.baseWidth;
        state.activeEditTransform.baseHeight = vid.baseHeight;
      }
    } catch (_) {}

    const res = await state.obs.getSceneItemTransform(resolvedScene, item.sceneItemId);
    const trans = res?.sceneItemTransform || {};

    const normalized = {
      sourceWidth: Number(trans.sourceWidth || 1920),
      sourceHeight: Number(trans.sourceHeight || 1080),
      width: Number(trans.width || trans.sourceWidth || 1920),
      height: Number(trans.height || trans.sourceHeight || 1080),
      positionX: Number(trans.positionX ?? 0),
      positionY: Number(trans.positionY ?? 0),
      rotation: Number(trans.rotation ?? 0),
      scaleX: Number(trans.scaleX ?? 1),
      scaleY: Number(trans.scaleY ?? 1),
      alignment: Number(trans.alignment ?? 5),
      boundsType: trans.boundsType || 'OBS_BOUNDS_NONE',
      boundsAlignment: Number(trans.boundsAlignment ?? 0),
      boundsWidth: Number(trans.boundsWidth ?? 0),
      boundsHeight: Number(trans.boundsHeight ?? 0),
      cropLeft: Number(trans.cropLeft ?? 0),
      cropRight: Number(trans.cropRight ?? 0),
      cropTop: Number(trans.cropTop ?? 0),
      cropBottom: Number(trans.cropBottom ?? 0),
    };

    state.activeEditTransform.originalTransform = { ...normalized };
    state.activeEditTransform.draftTransform = { ...normalized };

    syncTransformInputsFromDraft();
  } catch (err) {
    console.error('Failed to load transform:', err);
    showTransformBanner(`Failed to load transform from OBS: ${err.message}`, true);
  }
}

function closeEditTransformModal() {
  if (el.modalEditTransform) {
    el.modalEditTransform.classList.remove('open');
  }
  state.activeEditTransform = null;
}

function syncTransformInputsFromDraft() {
  const draft = state.activeEditTransform?.draftTransform;
  if (!draft) return;

  if (el.transformPosAlignment) el.transformPosAlignment.value = String(draft.alignment ?? 5);
  if (el.transformPosX) el.transformPosX.value = Math.round(draft.positionX * 100) / 100;
  if (el.transformPosY) el.transformPosY.value = Math.round(draft.positionY * 100) / 100;
  if (el.transformRotation) el.transformRotation.value = Math.round(draft.rotation * 100) / 100;

  if (el.transformSizeW) el.transformSizeW.value = Math.round(draft.width);
  if (el.transformSizeH) el.transformSizeH.value = Math.round(draft.height);
  if (el.transformScaleX) el.transformScaleX.value = Math.round(draft.scaleX * 1000) / 1000;
  if (el.transformScaleY) el.transformScaleY.value = Math.round(draft.scaleY * 1000) / 1000;

  if (el.transformBoundsType) el.transformBoundsType.value = draft.boundsType || 'OBS_BOUNDS_NONE';
  if (el.transformBoundsAlignment) el.transformBoundsAlignment.value = String(draft.boundsAlignment ?? 0);
  if (el.transformBoundsW) el.transformBoundsW.value = Math.round(draft.boundsWidth || 0);
  if (el.transformBoundsH) el.transformBoundsH.value = Math.round(draft.boundsHeight || 0);

  if (el.transformCropTop) el.transformCropTop.value = Math.max(0, Math.round(draft.cropTop || 0));
  if (el.transformCropBottom) el.transformCropBottom.value = Math.max(0, Math.round(draft.cropBottom || 0));
  if (el.transformCropLeft) el.transformCropLeft.value = Math.max(0, Math.round(draft.cropLeft || 0));
  if (el.transformCropRight) el.transformCropRight.value = Math.max(0, Math.round(draft.cropRight || 0));

  if (el.transformDimsBadge) {
    const w = Math.round(draft.width || draft.sourceWidth || 1920);
    const h = Math.round(draft.height || draft.sourceHeight || 1080);
    el.transformDimsBadge.textContent = `${w} × ${h} px`;
  }
}

function readTransformInputsToDraft() {
  const draft = state.activeEditTransform?.draftTransform;
  if (!draft) return;

  if (el.transformPosAlignment) draft.alignment = parseInt(el.transformPosAlignment.value, 10);
  if (el.transformPosX) draft.positionX = parseFloat(el.transformPosX.value) || 0;
  if (el.transformPosY) draft.positionY = parseFloat(el.transformPosY.value) || 0;
  if (el.transformRotation) draft.rotation = parseFloat(el.transformRotation.value) || 0;

  if (el.transformScaleX) draft.scaleX = parseFloat(el.transformScaleX.value) || 1;
  if (el.transformScaleY) draft.scaleY = parseFloat(el.transformScaleY.value) || 1;

  if (draft.sourceWidth) draft.width = Math.round(draft.sourceWidth * Math.abs(draft.scaleX));
  if (draft.sourceHeight) draft.height = Math.round(draft.sourceHeight * Math.abs(draft.scaleY));

  if (el.transformBoundsType) draft.boundsType = el.transformBoundsType.value;
  if (el.transformBoundsAlignment) draft.boundsAlignment = parseInt(el.transformBoundsAlignment.value, 10);
  if (el.transformBoundsW) draft.boundsWidth = parseFloat(el.transformBoundsW.value) || 0;
  if (el.transformBoundsH) draft.boundsHeight = parseFloat(el.transformBoundsH.value) || 0;

  if (el.transformCropTop) draft.cropTop = Math.max(0, parseInt(el.transformCropTop.value, 10) || 0);
  if (el.transformCropBottom) draft.cropBottom = Math.max(0, parseInt(el.transformCropBottom.value, 10) || 0);
  if (el.transformCropLeft) draft.cropLeft = Math.max(0, parseInt(el.transformCropLeft.value, 10) || 0);
  if (el.transformCropRight) draft.cropRight = Math.max(0, parseInt(el.transformCropRight.value, 10) || 0);
}

async function applyTransformAction() {
  if (!state.activeEditTransform) return;
  readTransformInputsToDraft();

  const { sceneName, item, draftTransform } = state.activeEditTransform;
  const payload = {
    positionX: draftTransform.positionX,
    positionY: draftTransform.positionY,
    rotation: draftTransform.rotation,
    scaleX: draftTransform.scaleX,
    scaleY: draftTransform.scaleY,
    alignment: draftTransform.alignment,
    boundsType: draftTransform.boundsType,
    boundsAlignment: draftTransform.boundsAlignment,
    boundsWidth: draftTransform.boundsWidth,
    boundsHeight: draftTransform.boundsHeight,
    cropLeft: draftTransform.cropLeft,
    cropRight: draftTransform.cropRight,
    cropTop: draftTransform.cropTop,
    cropBottom: draftTransform.cropBottom,
  };

  try {
    if (el.btnApplyTransform) el.btnApplyTransform.textContent = 'Applying...';
    await state.obs.setSceneItemTransform(sceneName, item.sceneItemId, payload);
    showTransformBanner('✓ Transform successfully applied in OBS Studio!', false);

    if (state.isPreviewExpanded) {
      setTimeout(fetchPreviewSnapshot, 250);
    }

    if (el.btnApplyTransform) {
      el.btnApplyTransform.textContent = '✓ Saved';
      setTimeout(() => {
        if (el.btnApplyTransform) el.btnApplyTransform.textContent = 'Apply Transform';
      }, 1500);
    }
  } catch (err) {
    console.error('Failed to apply transform:', err);
    showTransformBanner(`Failed to apply transform: ${err.message}`, true);
    if (el.btnApplyTransform) el.btnApplyTransform.textContent = 'Apply Transform';
  }
}

async function revertTransformAction() {
  if (!state.activeEditTransform?.originalTransform) return;
  state.activeEditTransform.draftTransform = { ...state.activeEditTransform.originalTransform };
  syncTransformInputsFromDraft();
  await applyTransformAction();
  showTransformBanner('Reverted to original transform settings.', false);
}

function pasteTransformAction() {
  if (!state.copiedTransform || !state.activeEditTransform) return;
  const draft = state.activeEditTransform.draftTransform;
  if (!draft) return;

  draft.positionX = state.copiedTransform.positionX;
  draft.positionY = state.copiedTransform.positionY;
  draft.rotation = state.copiedTransform.rotation;
  draft.scaleX = state.copiedTransform.scaleX;
  draft.scaleY = state.copiedTransform.scaleY;
  draft.alignment = state.copiedTransform.alignment;
  draft.boundsType = state.copiedTransform.boundsType;
  draft.boundsAlignment = state.copiedTransform.boundsAlignment;
  draft.boundsWidth = state.copiedTransform.boundsWidth;
  draft.boundsHeight = state.copiedTransform.boundsHeight;
  draft.cropLeft = state.copiedTransform.cropLeft;
  draft.cropRight = state.copiedTransform.cropRight;
  draft.cropTop = state.copiedTransform.cropTop;
  draft.cropBottom = state.copiedTransform.cropBottom;

  if (draft.sourceWidth) draft.width = Math.round(draft.sourceWidth * Math.abs(draft.scaleX));
  if (draft.sourceHeight) draft.height = Math.round(draft.sourceHeight * Math.abs(draft.scaleY));

  syncTransformInputsFromDraft();
  showTransformBanner(`✓ Pasted transform from "${state.copiedTransform.sourceName}". Click "Apply" to save.`, false);
}

function resetTransformAction() {
  if (!state.activeEditTransform?.draftTransform) return;
  const draft = state.activeEditTransform.draftTransform;

  draft.positionX = 0;
  draft.positionY = 0;
  draft.rotation = 0;
  draft.scaleX = 1.0;
  draft.scaleY = 1.0;
  draft.alignment = 5;
  draft.boundsType = 'OBS_BOUNDS_NONE';
  draft.boundsAlignment = 0;
  draft.boundsWidth = 0;
  draft.boundsHeight = 0;
  draft.cropLeft = 0;
  draft.cropRight = 0;
  draft.cropTop = 0;
  draft.cropBottom = 0;

  if (draft.sourceWidth) draft.width = draft.sourceWidth;
  if (draft.sourceHeight) draft.height = draft.sourceHeight;

  syncTransformInputsFromDraft();
  showTransformBanner('Reset to default transform. Click "Apply" to save.', false);
}

function applyPresetAction(preset) {
  if (!state.activeEditTransform?.draftTransform) return;
  const draft = state.activeEditTransform.draftTransform;
  const baseW = state.activeEditTransform.baseWidth || 1920;
  const baseH = state.activeEditTransform.baseHeight || 1080;
  const srcW = draft.sourceWidth || baseW;
  const srcH = draft.sourceHeight || baseH;

  switch (preset) {
    case 'fit': {
      const scale = Math.min(baseW / srcW, baseH / srcH);
      draft.scaleX = Math.sign(draft.scaleX || 1) * scale;
      draft.scaleY = Math.sign(draft.scaleY || 1) * scale;
      draft.width = Math.round(srcW * scale);
      draft.height = Math.round(srcH * scale);
      draft.positionX = Math.round((baseW - srcW * scale) / 2);
      draft.positionY = Math.round((baseH - srcH * scale) / 2);
      draft.alignment = 5;
      draft.rotation = 0;
      showTransformBanner('✓ Fitted source to canvas bounds', false);
      break;
    }
    case 'stretch': {
      draft.scaleX = baseW / srcW;
      draft.scaleY = baseH / srcH;
      draft.width = baseW;
      draft.height = baseH;
      draft.positionX = 0;
      draft.positionY = 0;
      draft.alignment = 5;
      draft.rotation = 0;
      showTransformBanner('✓ Stretched source to canvas', false);
      break;
    }
    case 'center': {
      const curW = srcW * Math.abs(draft.scaleX);
      const curH = srcH * Math.abs(draft.scaleY);
      draft.positionX = Math.round((baseW - curW) / 2);
      draft.positionY = Math.round((baseH - curH) / 2);
      draft.alignment = 5;
      showTransformBanner('✓ Centered source on canvas', false);
      break;
    }
    case 'flip-h': {
      draft.scaleX = -draft.scaleX;
      showTransformBanner('✓ Flipped horizontally', false);
      break;
    }
    case 'flip-v': {
      draft.scaleY = -draft.scaleY;
      showTransformBanner('✓ Flipped vertically', false);
      break;
    }
  }

  syncTransformInputsFromDraft();
}

// --- Pan & Zoom (Live PTZ) Engine (Built-in Crop Filter) ---
const LIVE_PTZ_FILTER_NAME = 'Temporary filter for Live PTZ (Do Not Use)';
const LEGACY_PTZ_FILTER_NAMES = ['Blade Live PTZ', 'Live PTZ (Move Transition)'];

let activePtzSession = null;
let ptzPanStepSize = 0.06;
let ptzDispatchTimeout = null;
let lastPtzDispatchTime = 0;
const activePtzPointers = new Map();
let initialPinchDistance = 0;
let initialPtzZoom = 1.0;

let hikJoystickRafId = null;
let hikJoystickLastTime = 0;
let hikJoystickDeflection = { x: 0, y: 0 };
let isJoystickDragging = false;

function showPtzBanner(message, isError = false) {
  if (!el.ptzStatusBanner) return;
  el.ptzStatusBanner.textContent = message;
  el.ptzStatusBanner.className = `properties-status-banner ${isError ? 'error' : ''}`;
  el.ptzStatusBanner.style.display = 'block';
  setTimeout(() => {
    if (el.ptzStatusBanner && el.ptzStatusBanner.textContent === message) {
      el.ptzStatusBanner.style.display = 'none';
    }
  }, 4000);
}

function invertPtzCrop(crop, srcW = 1920, srcH = 1080, boundsType = 'OBS_BOUNDS_NONE', boxW = 0, boxH = 0) {
  const left = Math.max(0, Number(crop?.left || 0));
  const right = Math.max(0, Number(crop?.right || 0));
  const top = Math.max(0, Number(crop?.top || 0));
  const bottom = Math.max(0, Number(crop?.bottom || 0));

  const visW = Math.max(1, srcW - left - right);
  const visH = Math.max(1, srcH - top - bottom);
  const hasBounds = boundsType !== 'OBS_BOUNDS_NONE' && boxW > 0 && boxH > 0;

  let zoom = 1.0;
  if (hasBounds && boundsType === 'OBS_BOUNDS_SCALE_INNER') {
    const scale1 = Math.min(boxW / srcW, boxH / srcH);
    const currentScale = Math.min(boxW / visW, boxH / visH);
    zoom = scale1 > 0 ? currentScale / scale1 : 1.0;
  } else if (hasBounds && boundsType === 'OBS_BOUNDS_SCALE_OUTER') {
    const scale1 = Math.max(boxW / srcW, boxH / srcH);
    const currentScale = Math.max(boxW / visW, boxH / visH);
    zoom = scale1 > 0 ? currentScale / scale1 : 1.0;
  } else if (hasBounds && boundsType === 'OBS_BOUNDS_SCALE_TO_WIDTH') {
    zoom = srcW / visW;
  } else if (hasBounds && boundsType === 'OBS_BOUNDS_SCALE_TO_HEIGHT') {
    zoom = srcH / visH;
  } else {
    zoom = Math.max(srcW / visW, srcH / visH);
  }

  zoom = Math.max(1.0, Math.min(20.0, Math.round(zoom * 100) / 100));

  const sumX = left + right;
  const sumY = top + bottom;
  const panX = sumX > 1 ? Math.max(-1.0, Math.min(1.0, (left - right) / sumX)) : 0;
  const panY = sumY > 1 ? Math.max(-1.0, Math.min(1.0, (top - bottom) / sumY)) : 0;

  return { zoom, panX, panY, left, right, top, bottom };
}

async function openPtzModal(sceneName, item) {
  if (!item || !item.sourceName) return;

  const resolvedScene =
    sceneName === '__CURRENT__' || !sceneName
      ? getCurrentTargetScene() || state.currentProgramScene
      : sceneName;

  activePtzSession = {
    sourceName: item.sourceName,
    sceneName: resolvedScene,
    item,
    zoom: 1.0,
    panX: 0,
    panY: 0,
    sourceWidth: 1920,
    sourceHeight: 1080,
    origWidth: 1920,
    origHeight: 1080,
    boundsType: 'OBS_BOUNDS_NONE',
    boundsWidth: 0,
    boundsHeight: 0,
    boundsAlignment: 0,
    viewportWidth: 0,
    viewportHeight: 0,
    dispScaleX: 1,
    dispScaleY: 1,
    obsAppliedCrop: { left: 0, right: 0, top: 0, bottom: 0 },
    capturedCrop: { left: 0, right: 0, top: 0, bottom: 0 },
    hasPtzModified: false,
  };

  let rawSourceW = null;
  let rawSourceH = null;
  const [transRes, filterListRes] = await Promise.all([
    item.sceneItemId != null
      ? state.obs.getSceneItemTransform(resolvedScene, item.sceneItemId).catch(() => null)
      : Promise.resolve(null),
    state.obs.getSourceFilterList(item.sourceName).catch(() => null),
  ]);

  if (transRes?.sceneItemTransform) {
    const trans = transRes.sceneItemTransform;
    if (trans.sourceWidth != null) rawSourceW = Number(trans.sourceWidth);
    if (trans.sourceHeight != null) rawSourceH = Number(trans.sourceHeight);
    activePtzSession.boundsType = trans.boundsType || 'OBS_BOUNDS_NONE';
    activePtzSession.boundsWidth = Number(trans.boundsWidth || 0);
    activePtzSession.boundsHeight = Number(trans.boundsHeight || 0);
    activePtzSession.boundsAlignment = Number(trans.boundsAlignment ?? 0);
  }

  // Restore active Live PTZ crop_filter state and recover pre-crop source dimensions
  const filters = filterListRes?.filters || [];
  let { ptzFilter, totalCropX, totalCropY, allRelative } = summarizeSourceCropFilters(filters);
  if (!ptzFilter) {
    ptzFilter = await state.obs.getSourceFilter(item.sourceName, LIVE_PTZ_FILTER_NAME).catch(() => null);
    if (!ptzFilter) {
      for (const legacy of LEGACY_PTZ_FILTER_NAMES) {
        ptzFilter = await state.obs.getSourceFilter(item.sourceName, legacy).catch(() => null);
        if (ptzFilter) break;
      }
    }
  }

  const isSim = isConnectedToLocalSimulator();
  const hasActivePtz = !!(ptzFilter && ptzFilter.filterEnabled !== false && ptzFilter.filterSettings);
  const ptzSettings = hasActivePtz ? ptzFilter.filterSettings : null;
  const l = ptzSettings ? Math.max(0, Number(ptzSettings.left || 0)) : 0;
  const r = ptzSettings ? Math.max(0, Number(ptzSettings.right || 0)) : 0;
  const t = ptzSettings ? Math.max(0, Number(ptzSettings.top || 0)) : 0;
  const b = ptzSettings ? Math.max(0, Number(ptzSettings.bottom || 0)) : 0;
  const isPtzRelative = ptzSettings ? ptzSettings.relative !== false : true;

  // In real OBS, GetSceneItemTransform returns post-filter sourceWidth/sourceHeight.
  // Add back active relative crop_filter margins to recover the pre-PTZ dimensions.
  const cachedBase = sourceBaseSizeCache.get(item.sourceName);
  let prePtzW = rawSourceW && rawSourceW > 0 ? rawSourceW : 1920;
  let prePtzH = rawSourceH && rawSourceH > 0 ? rawSourceH : 1080;

  if (!isSim && rawSourceW != null && rawSourceH != null) {
    if (hasActivePtz && isPtzRelative) {
      prePtzW = Math.max(1, rawSourceW + l + r);
      prePtzH = Math.max(1, rawSourceH + t + b);
    }
    if (allRelative) {
      const origW = Math.max(1, rawSourceW + totalCropX);
      const origH = Math.max(1, rawSourceH + totalCropY);
      activePtzSession.origWidth = origW;
      activePtzSession.origHeight = origH;
      sourceBaseSizeCache.set(item.sourceName, { origW, origH });
    } else if (cachedBase) {
      activePtzSession.origWidth = cachedBase.origW;
      activePtzSession.origHeight = cachedBase.origH;
    } else {
      activePtzSession.origWidth = prePtzW;
      activePtzSession.origHeight = prePtzH;
    }
  } else {
    activePtzSession.origWidth = prePtzW;
    activePtzSession.origHeight = prePtzH;
  }

  activePtzSession.sourceWidth = prePtzW;
  activePtzSession.sourceHeight = prePtzH;

  if (hasActivePtz && l + r + t + b > 0) {
    const restored = invertPtzCrop(
      { left: l, right: r, top: t, bottom: b },
      activePtzSession.sourceWidth,
      activePtzSession.sourceHeight,
      activePtzSession.boundsType,
      activePtzSession.boundsWidth,
      activePtzSession.boundsHeight
    );
    activePtzSession.zoom = restored.zoom;
    activePtzSession.panX = restored.panX;
    activePtzSession.panY = restored.panY;
    activePtzSession.obsAppliedCrop = { left: l, right: r, top: t, bottom: b };
    activePtzSession.capturedCrop = { left: l, right: r, top: t, bottom: b };
    activePtzSession.hasPtzModified = true;
  }

  const hasValidBounds =
    activePtzSession.boundsType !== 'OBS_BOUNDS_NONE' &&
    activePtzSession.boundsWidth > 0 &&
    activePtzSession.boundsHeight > 0;
  if (el.ptzBoundsWarning) {
    el.ptzBoundsWarning.style.display = hasValidBounds ? 'none' : 'flex';
  }

  if (el.ptzModalTitle) {
    el.ptzModalTitle.textContent = `Pan & Zoom: ${item.sourceName}`;
  }
  if (el.ptzSourceBadge) {
    el.ptzSourceBadge.textContent = item.sourceName;
  }
  if (el.ptzSceneBadge) {
    el.ptzSceneBadge.textContent = `Scene: ${resolvedScene}`;
  }
  if (el.sliderPtzZoom) el.sliderPtzZoom.value = String(activePtzSession.zoom);

  // Immediate placeholder until fresh OBS screenshot arrives
  if (el.ptzLiveImg) {
    if (activePtzSession.hasPtzModified) {
      el.ptzLiveImg.removeAttribute('src');
      el.ptzLiveImg.style.display = 'none';
      if (el.ptzPreviewFallback) el.ptzPreviewFallback.style.display = 'flex';
    } else {
      const cached = thumbnailCache.get(item.sourceName);
      if (cached && cached.dataUrl) {
        el.ptzLiveImg.src = cached.dataUrl;
        el.ptzLiveImg.style.display = 'block';
        if (el.ptzPreviewFallback) el.ptzPreviewFallback.style.display = 'none';
      } else {
        el.ptzLiveImg.src = generateSyntheticPtzFrame(item.sourceName);
        el.ptzLiveImg.style.display = 'block';
        if (el.ptzPreviewFallback) el.ptzPreviewFallback.style.display = 'none';
      }
    }
  }

  if (el.modalPtz) {
    el.modalPtz.classList.add('open');
  }

  updatePtzViewportSize();
  updatePtzUiIndicators();

  // 1. Refresh fresh live preview frame from OBS
  fetchPtzPreviewFrame(item.sourceName);

  // 2. Load existing PTZ filter presets on this source
  await loadPtzPresetsList(item.sourceName);
}

async function closePtzModal() {
  if (el.modalPtz) {
    el.modalPtz.classList.remove('open');
  }
  activePtzPointers.clear();
  if (ptzDispatchTimeout) {
    clearTimeout(ptzDispatchTimeout);
    ptzDispatchTimeout = null;
  }
  stopHikJoystickVelocityLoop();

  // User requirement: "and remove this filter as soon as reset called or window closed without any changes or window closed with all zoomed out state (no scaling)"
  if (activePtzSession?.sourceName) {
    const srcName = activePtzSession.sourceName;
    const wasModified = !!activePtzSession.hasPtzModified;
    const shouldRemove = !activePtzSession.hasPtzModified || activePtzSession.zoom <= 1.001;
    if (shouldRemove) {
      state.obs.removeSourceFilter(srcName, LIVE_PTZ_FILTER_NAME).catch(() => null);
      for (const legacy of LEGACY_PTZ_FILTER_NAMES) {
        state.obs.removeSourceFilter(srcName, legacy).catch(() => null);
      }
    }
    if (wasModified) {
      thumbnailCache.delete(srcName);
      if (state.obs.status === 'connected') {
        setTimeout(() => {
          const item = (state.sceneItems || []).find((i) => i.sourceName === srcName);
          const scene = getCurrentTargetScene();
          if (!item) return;
          document
            .querySelectorAll(`[data-source-name="${CSS.escape(srcName)}"] .source-thumb-img`)
            .forEach((imgEl) => {
              const fallbackEl = imgEl.parentElement?.querySelector('.source-type-icon-fallback');
              if (fallbackEl) {
                loadSourceThumbnail(srcName, getSourceTypeCategory(item), imgEl, fallbackEl, scene, item.sceneItemId);
              }
            });
        }, 180);
      }
    }
  }

  activePtzSession = null;
}

function generateSyntheticPtzFrame(sourceName) {
  const safeName = escapeHtml(sourceName || 'Live Video Feed');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
    <rect width="640" height="360" fill="#090e18" />
    <defs>
      <pattern id="ptzgrid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
      </pattern>
      <radialGradient id="vignette" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#182438" stop-opacity="0.8"/>
        <stop offset="100%" stop-color="#060911" stop-opacity="0.95"/>
      </radialGradient>
    </defs>
    <rect width="640" height="360" fill="url(#ptzgrid)" />
    <rect width="640" height="360" fill="url(#vignette)" />
    <!-- Viewfinder Corners -->
    <path d="M 28 48 L 28 28 L 48 28 M 592 28 L 612 28 L 612 48 M 28 312 L 28 332 L 48 332 M 592 332 L 612 332 L 612 312" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round"/>
    <!-- Center Framing Marker -->
    <circle cx="320" cy="180" r="54" fill="none" stroke="rgba(56,189,248,0.25)" stroke-width="1.5" stroke-dasharray="5 5"/>
    <circle cx="320" cy="180" r="3.5" fill="#38bdf8"/>
    <!-- Top Badge -->
    <rect x="28" y="28" width="76" height="20" rx="4" fill="rgba(56,189,248,0.18)"/>
    <text x="66" y="42" fill="#38bdf8" font-family="-apple-system, sans-serif" font-size="10" font-weight="bold" text-anchor="middle">LIVE PTZ</text>
    <!-- Source Name -->
    <text x="320" y="172" fill="#f8fafc" font-family="-apple-system, sans-serif" font-size="18" font-weight="700" text-anchor="middle">${safeName}</text>
    <text x="320" y="196" fill="#64748b" font-family="-apple-system, sans-serif" font-size="12" text-anchor="middle">Touch &amp; Drag Preview to Pan • Pinch to Zoom</text>
  </svg>`;
  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
}

async function fetchPtzPreviewFrame(sourceName) {
  if (!el.ptzLiveImg) return;
  try {
    if (el.ptzLoadingSpinner) el.ptzLoadingSpinner.style.display = 'flex';

    let gotImage = false;
    const isSim = isConnectedToLocalSimulator();
    const obsCropAtCapture = activePtzSession?.obsAppliedCrop
      ? { ...activePtzSession.obsAppliedCrop }
      : { left: 0, right: 0, top: 0, bottom: 0 };

    // 1. Fetch fresh direct source screenshot from OBS
    try {
      const res = await state.obs.getSourceScreenshot(sourceName, 'jpg', 1280);
      if (!activePtzSession || activePtzSession.sourceName !== sourceName) return;

      if (res && res.imageData) {
        const prePtzW = Math.max(1, activePtzSession.sourceWidth || 1920);
        const prePtzH = Math.max(1, activePtzSession.sourceHeight || 1080);
        const capW = Math.max(1, prePtzW - obsCropAtCapture.left - obsCropAtCapture.right);
        const capH = Math.max(1, prePtzH - obsCropAtCapture.top - obsCropAtCapture.bottom);
        const origW = Math.max(capW, activePtzSession.origWidth || prePtzW);
        const origH = Math.max(capH, activePtzSession.origHeight || prePtzH);

        let finalDataUrl = res.imageData;
        let nextCapturedCrop = { left: 0, right: 0, top: 0, bottom: 0 };

        if (!isSim && (capW < origW || capH < origH)) {
          const trimmed = await trimCroppedObsScreenshot(
            res.imageData,
            capW / origW,
            capH / origH,
            { origRatio: origW / origH, visRatio: capW / capH }
          );
          if (!activePtzSession || activePtzSession.sourceName !== sourceName) return;
          finalDataUrl = trimmed.dataUrl;

          const hasPtzCrop =
            obsCropAtCapture.left + obsCropAtCapture.right + obsCropAtCapture.top + obsCropAtCapture.bottom > 0;
          const matchesTightCapAspect =
            trimmed.natW > 0 &&
            trimmed.natH > 0 &&
            Math.abs(trimmed.natW / trimmed.natH - capW / capH) < 0.02 &&
            Math.abs(capW / capH - origW / origH) > 0.05;

          if (hasPtzCrop && (trimmed.wasTrimmed || matchesTightCapAspect)) {
            nextCapturedCrop = obsCropAtCapture;
          }
        }

        activePtzSession.capturedCrop = nextCapturedCrop;
        el.ptzLiveImg.src = finalDataUrl;
        el.ptzLiveImg.style.display = 'block';
        if (el.ptzPreviewFallback) el.ptzPreviewFallback.style.display = 'none';
        thumbnailCache.set(sourceName, { dataUrl: finalDataUrl, timestamp: Date.now() });
        gotImage = true;
      }
    } catch (_) {}

    // 2. Fallback to active scene screenshot if direct source screenshot failed
    if (!gotImage && activePtzSession?.sceneName) {
      try {
        const sceneRes = await state.obs.getSourceScreenshot(activePtzSession.sceneName, 'jpg', 1280);
        if (!activePtzSession || activePtzSession.sourceName !== sourceName) return;
        if (sceneRes && sceneRes.imageData) {
          activePtzSession.capturedCrop = { left: 0, right: 0, top: 0, bottom: 0 };
          el.ptzLiveImg.src = sceneRes.imageData;
          el.ptzLiveImg.style.display = 'block';
          if (el.ptzPreviewFallback) el.ptzPreviewFallback.style.display = 'none';
          gotImage = true;
        }
      } catch (_) {}
    }

    // 3. Fallback to synthetic active viewfinder frame if screenshot unavailable
    if (!gotImage && (!el.ptzLiveImg.src || el.ptzLiveImg.style.display === 'none')) {
      if (activePtzSession && activePtzSession.sourceName === sourceName) {
        activePtzSession.capturedCrop = { left: 0, right: 0, top: 0, bottom: 0 };
      }
      el.ptzLiveImg.src = generateSyntheticPtzFrame(sourceName);
      el.ptzLiveImg.style.display = 'block';
      if (el.ptzPreviewFallback) el.ptzPreviewFallback.style.display = 'none';
    }

    if (activePtzSession && activePtzSession.sourceName === sourceName) {
      updatePtzUiIndicators();
    }
  } catch (err) {
    console.warn('[PTZ Preview Frame Failed]', err);
    if (!el.ptzLiveImg.src || el.ptzLiveImg.style.display === 'none') {
      el.ptzLiveImg.src = generateSyntheticPtzFrame(sourceName);
      el.ptzLiveImg.style.display = 'block';
      if (el.ptzPreviewFallback) el.ptzPreviewFallback.style.display = 'none';
    }
  } finally {
    if (el.ptzLoadingSpinner) el.ptzLoadingSpinner.style.display = 'none';
  }
}

function updatePtzViewportSize() {
  if (!activePtzSession || !el.ptzPreviewWrapper || !el.ptzGestureViewport) return;
  const { boundsType, boundsWidth, boundsHeight, sourceWidth, sourceHeight } = activePtzSession;
  const hasBounds = boundsType !== 'OBS_BOUNDS_NONE' && boundsWidth > 0 && boundsHeight > 0;
  const targetAr = hasBounds
    ? boundsWidth / boundsHeight
    : Math.max(0.1, (sourceWidth || 1920) / (sourceHeight || 1080));

  const wrapStyle = getComputedStyle(el.ptzPreviewWrapper);
  const padX = (parseFloat(wrapStyle.paddingLeft) || 0) + (parseFloat(wrapStyle.paddingRight) || 0);
  const padY = (parseFloat(wrapStyle.paddingTop) || 0) + (parseFloat(wrapStyle.paddingBottom) || 0);
  const availW = Math.max(100, el.ptzPreviewWrapper.clientWidth - padX);
  const availH = Math.max(100, el.ptzPreviewWrapper.clientHeight - padY);
  const availAr = availW / availH;

  let vpW, vpH;
  if (targetAr >= availAr) {
    vpW = availW;
    vpH = availW / targetAr;
  } else {
    vpH = availH;
    vpW = availH * targetAr;
  }

  el.ptzGestureViewport.style.width = `${Math.round(vpW)}px`;
  el.ptzGestureViewport.style.height = `${Math.round(vpH)}px`;
  activePtzSession.viewportWidth = vpW;
  activePtzSession.viewportHeight = vpH;
}

function computePtzGeometry(session) {
  const srcW = Math.max(1, session?.sourceWidth || 1920);
  const srcH = Math.max(1, session?.sourceHeight || 1080);
  const z = Math.max(1.0, Math.min(20.0, session?.zoom || 1.0));
  const boundsType = session?.boundsType || 'OBS_BOUNDS_NONE';
  const hasBounds = boundsType !== 'OBS_BOUNDS_NONE' && (session?.boundsWidth || 0) > 0 && (session?.boundsHeight || 0) > 0;
  const boxW = hasBounds ? session.boundsWidth : srcW;
  const boxH = hasBounds ? session.boundsHeight : srcH;

  let visW = srcW / z;
  let visH = srcH / z;

  if (hasBounds) {
    if (boundsType === 'OBS_BOUNDS_SCALE_INNER') {
      const scale1 = Math.min(boxW / srcW, boxH / srcH);
      const targetScale = scale1 * z;
      visW = Math.min(srcW, boxW / targetScale);
      visH = Math.min(srcH, boxH / targetScale);
    } else if (boundsType === 'OBS_BOUNDS_SCALE_TO_WIDTH') {
      const scale1 = boxW / srcW;
      const targetScale = scale1 * z;
      visW = srcW / z;
      visH = srcH * scale1 <= boxH ? Math.min(srcH, boxH / targetScale) : srcH / z;
    } else if (boundsType === 'OBS_BOUNDS_SCALE_TO_HEIGHT') {
      const scale1 = boxH / srcH;
      const targetScale = scale1 * z;
      visH = srcH / z;
      visW = srcW * scale1 <= boxW ? Math.min(srcW, boxW / targetScale) : srcW / z;
    }
  }

  visW = Math.max(1, Math.min(srcW, visW));
  visH = Math.max(1, Math.min(srcH, visH));

  const marginX = Math.max(0, (srcW - visW) / 2);
  const marginY = Math.max(0, (srcH - visH) / 2);

  const px = marginX > 0.5 ? Math.max(-1.0, Math.min(1.0, session?.panX || 0)) : 0;
  const py = marginY > 0.5 ? Math.max(-1.0, Math.min(1.0, session?.panY || 0)) : 0;

  const left = Math.max(0, Math.round(marginX * (1 + px)));
  const right = Math.max(0, Math.round(marginX * (1 - px)));
  const top = Math.max(0, Math.round(marginY * (1 + py)));
  const bottom = Math.max(0, Math.round(marginY * (1 - py)));

  return {
    left,
    right,
    top,
    bottom,
    relative: true,
    visW: Math.max(1, srcW - left - right),
    visH: Math.max(1, srcH - top - bottom),
    marginX,
    marginY,
    srcW,
    srcH,
    boxW,
    boxH,
    hasBounds,
    boundsType,
    boundsAlignment: Number(session?.boundsAlignment ?? 0),
  };
}

function calculatePtzCrop(zoom, panX, panY, srcW = 1920, srcH = 1080, boundsType = 'OBS_BOUNDS_NONE', boxW = 0, boxH = 0) {
  const geom = computePtzGeometry({
    zoom,
    panX,
    panY,
    sourceWidth: srcW,
    sourceHeight: srcH,
    boundsType,
    boundsWidth: boxW,
    boundsHeight: boxH,
  });
  return {
    left: geom.left,
    right: geom.right,
    top: geom.top,
    bottom: geom.bottom,
    relative: true,
  };
}

function updatePtzUiIndicators() {
  if (!activePtzSession) return;
  const z = activePtzSession.zoom;
  const zText = `${z.toFixed(2)}x`;

  if (el.ptzZoomIndicator) el.ptzZoomIndicator.textContent = zText;
  if (el.ptzZoomLevelText) {
    el.ptzZoomLevelText.textContent = z <= 1.01 ? '1.00x (Wide)' : `${zText} Zoomed`;
  }
  if (el.sliderPtzZoom) {
    el.sliderPtzZoom.value = String(z);
  }

  const geom = computePtzGeometry(activePtzSession);
  if (geom.marginX <= 0.5 && activePtzSession.panX !== 0) activePtzSession.panX = 0;
  if (geom.marginY <= 0.5 && activePtzSession.panY !== 0) activePtzSession.panY = 0;

  // Update visual framing guide crosshair position
  const crossH = document.querySelector('.ptz-crosshair-h');
  const crossV = document.querySelector('.ptz-crosshair-v');
  if (crossH) {
    const normY = 50 + (geom.marginY > 0.5 ? activePtzSession.panY : 0) * 30;
    crossH.style.top = `${normY}%`;
  }
  if (crossV) {
    const normX = 50 + (geom.marginX > 0.5 ? activePtzSession.panX : 0) * 30;
    crossV.style.left = `${normX}%`;
  }

  // 1:1 WYSIWYG preview matching OBS bounding box + crop filter
  if (el.ptzCropMask && el.ptzLiveImg && el.ptzGestureViewport) {
    if (!activePtzSession.viewportWidth || !activePtzSession.viewportHeight) {
      updatePtzViewportSize();
    }
    const vpW = activePtzSession.viewportWidth || el.ptzGestureViewport.clientWidth || 320;
    const vpH = activePtzSession.viewportHeight || el.ptzGestureViewport.clientHeight || 180;

    let scaleX;
    let scaleY;
    if (!geom.hasBounds) {
      const s = Math.min(vpW / geom.srcW, vpH / geom.srcH);
      scaleX = s;
      scaleY = s;
    } else if (geom.boundsType === 'OBS_BOUNDS_STRETCH') {
      scaleX = vpW / geom.visW;
      scaleY = vpH / geom.visH;
    } else if (geom.boundsType === 'OBS_BOUNDS_SCALE_OUTER') {
      const s = Math.max(vpW / geom.visW, vpH / geom.visH);
      scaleX = s;
      scaleY = s;
    } else if (geom.boundsType === 'OBS_BOUNDS_SCALE_TO_WIDTH') {
      const s = vpW / geom.visW;
      scaleX = s;
      scaleY = s;
    } else if (geom.boundsType === 'OBS_BOUNDS_SCALE_TO_HEIGHT') {
      const s = vpH / geom.visH;
      scaleX = s;
      scaleY = s;
    } else {
      const s = Math.min(vpW / geom.visW, vpH / geom.visH);
      scaleX = s;
      scaleY = s;
    }

    const maskW = geom.visW * scaleX;
    const maskH = geom.visH * scaleY;
    const align = geom.boundsAlignment || 0;

    let maskLeft = (vpW - maskW) / 2;
    if ((align & 1) !== 0) maskLeft = 0;
    else if ((align & 2) !== 0) maskLeft = vpW - maskW;

    let maskTop = (vpH - maskH) / 2;
    if ((align & 4) !== 0) maskTop = 0;
    else if ((align & 8) !== 0) maskTop = vpH - maskH;

    el.ptzCropMask.style.width = `${maskW}px`;
    el.ptzCropMask.style.height = `${maskH}px`;
    el.ptzCropMask.style.left = `${maskLeft}px`;
    el.ptzCropMask.style.top = `${maskTop}px`;

    const cap = activePtzSession.capturedCrop || { left: 0, right: 0, top: 0, bottom: 0 };
    const capW = Math.max(1, geom.srcW - cap.left - cap.right);
    const capH = Math.max(1, geom.srcH - cap.top - cap.bottom);

    el.ptzLiveImg.style.width = `${capW * scaleX}px`;
    el.ptzLiveImg.style.height = `${capH * scaleY}px`;
    el.ptzLiveImg.style.left = `${(cap.left - geom.left) * scaleX}px`;
    el.ptzLiveImg.style.top = `${(cap.top - geom.top) * scaleY}px`;
    el.ptzLiveImg.style.transform = '';

    activePtzSession.dispScaleX = scaleX;
    activePtzSession.dispScaleY = scaleY;
  }

  // Update Hik-Connect 360° red joystick puck and coordinates
  updateHikKnobVisual();
}

function queuePtzUpdate(immediate = false) {
  if (!activePtzSession) return;
  updatePtzUiIndicators();

  const now = Date.now();
  const delay = immediate ? 0 : Math.max(0, 50 - (now - lastPtzDispatchTime));

  if (ptzDispatchTimeout) clearTimeout(ptzDispatchTimeout);
  ptzDispatchTimeout = setTimeout(async () => {
    lastPtzDispatchTime = Date.now();
    await dispatchPtzToObs();
  }, delay);
}

let isPtzDispatching = false;
let hasQueuedPtzDispatch = false;

async function executePtzDispatch() {
  if (!activePtzSession) return;
  const { sourceName } = activePtzSession;
  const geom = computePtzGeometry(activePtzSession);

  // If zoomed all the way out (no crop on any edge), remove the temporary filter as requested
  if (geom.left === 0 && geom.right === 0 && geom.top === 0 && geom.bottom === 0) {
    await state.obs.removeSourceFilter(sourceName, LIVE_PTZ_FILTER_NAME).catch(() => null);
    for (const legacy of LEGACY_PTZ_FILTER_NAMES) {
      await state.obs.removeSourceFilter(sourceName, legacy).catch(() => null);
    }
    if (activePtzSession && activePtzSession.sourceName === sourceName) {
      activePtzSession.obsAppliedCrop = { left: 0, right: 0, top: 0, bottom: 0 };
    }
    return;
  }

  const cropSettings = {
    left: geom.left,
    right: geom.right,
    top: geom.top,
    bottom: geom.bottom,
    relative: true,
  };

  // Fast path: Try updating existing filter settings directly
  try {
    await state.obs.setSourceFilterSettings(sourceName, LIVE_PTZ_FILTER_NAME, cropSettings);
    await state.obs.setSourceFilterEnabled(sourceName, LIVE_PTZ_FILTER_NAME, true).catch(() => null);
  } catch (setErr) {
    // If filter does not exist yet (code 600 or "not found"), create it
    try {
      await state.obs.createSourceFilter(sourceName, LIVE_PTZ_FILTER_NAME, 'crop_filter', cropSettings);
    } catch (createErr) {
      // If it already exists (code 601 or "already exists"), update its settings safely
      const isAlreadyExists = createErr?.code === 601 || 
        (createErr?.message && createErr.message.toLowerCase().includes('already exists'));
      if (isAlreadyExists) {
        await state.obs.setSourceFilterSettings(sourceName, LIVE_PTZ_FILTER_NAME, cropSettings).catch(() => null);
        await state.obs.setSourceFilterEnabled(sourceName, LIVE_PTZ_FILTER_NAME, true).catch(() => null);
      } else {
        console.warn('[PTZ Filter Create Notice]', createErr?.message || createErr);
      }
    }
  }

  if (activePtzSession && activePtzSession.sourceName === sourceName) {
    activePtzSession.obsAppliedCrop = {
      left: geom.left,
      right: geom.right,
      top: geom.top,
      bottom: geom.bottom,
    };
  }
  thumbnailCache.delete(sourceName);

  if (state.isPreviewExpanded) {
    setTimeout(fetchPreviewSnapshot, 200);
  }
}

async function dispatchPtzToObs() {
  if (!activePtzSession) return;
  if (isPtzDispatching) {
    hasQueuedPtzDispatch = true;
    return;
  }
  isPtzDispatching = true;
  try {
    do {
      hasQueuedPtzDispatch = false;
      await executePtzDispatch();
    } while (hasQueuedPtzDispatch && activePtzSession);
  } catch (err) {
    console.warn('[dispatchPtzToObs Handled]', err?.message || err);
  } finally {
    isPtzDispatching = false;
  }
}

async function returnToWideAction() {
  if (!activePtzSession) return;
  activePtzSession.zoom = 1.0;
  activePtzSession.panX = 0;
  activePtzSession.panY = 0;
  activePtzSession.hasPtzModified = true;
  updatePtzUiIndicators();

  const { sourceName } = activePtzSession;
  try {
    // User requirement: "remove this filter as soon as reset called"
    await state.obs.removeSourceFilter(sourceName, LIVE_PTZ_FILTER_NAME).catch(() => null);
    for (const legacy of LEGACY_PTZ_FILTER_NAMES) {
      await state.obs.removeSourceFilter(sourceName, legacy).catch(() => null);
    }

    if (activePtzSession && activePtzSession.sourceName === sourceName) {
      activePtzSession.obsAppliedCrop = { left: 0, right: 0, top: 0, bottom: 0 };
      thumbnailCache.delete(sourceName);
      const cap = activePtzSession.capturedCrop;
      if (cap && cap.left + cap.right + cap.top + cap.bottom > 0) {
        fetchPtzPreviewFrame(sourceName);
      }
    }

    await loadPtzPresetsList(sourceName);
    showPtzBanner('✓ Reset to Wide 1.0x (temporary PTZ filter removed)', false);

    if (state.isPreviewExpanded) {
      setTimeout(fetchPreviewSnapshot, 200);
    }
  } catch (err) {
    console.error('Failed to return to wide:', err);
    showPtzBanner(`Error returning to wide: ${err.message}`, true);
  }
}

async function loadPtzPresetsList(sourceName) {
  if (!el.ptzPresetsListContainer) return;
  if (!sourceName || state.obs.status !== 'connected') {
    el.ptzPresetsListContainer.innerHTML = `
      <div style="font-size: 11.5px; color: var(--obs-text-gray); padding: 8px 0; text-align: center;">
        OBS Studio is offline. Connect to view presets.
      </div>
    `;
    return;
  }
  el.ptzPresetsListContainer.innerHTML = `
    <div style="font-size: 11.5px; color: var(--obs-text-gray); padding: 8px 0; text-align: center;">
      Loading filter presets...
    </div>
  `;

  try {
    const res = await state.obs.getSourceFilterList(sourceName);
    const filters = res?.filters || [];
    const ptzFilters = filters.filter(
      (f) =>
        (f.filterName.startsWith('PTZ') || f.filterKind === 'crop_filter' || f.filterKind === 'move_source_filter') &&
        f.filterName !== LIVE_PTZ_FILTER_NAME &&
        !LEGACY_PTZ_FILTER_NAMES.includes(f.filterName)
    );

    if (ptzFilters.length === 0) {
      el.ptzPresetsListContainer.innerHTML = `
        <div style="font-size: 11.5px; color: var(--obs-text-gray); padding: 10px 0; text-align: center;">
          No PTZ presets saved yet. Adjust framing above and click "Save as Filter Preset".
        </div>
      `;
      return;
    }

    el.ptzPresetsListContainer.innerHTML = '';
    ptzFilters.forEach((filter) => {
      const card = document.createElement('div');
      card.className = `ptz-preset-item-card ${filter.filterEnabled ? 'active' : ''}`;

      card.innerHTML = `
        <div class="ptz-preset-info-left">
          <span class="ptz-preset-name">${escapeHtml(filter.filterName)}</span>
          <span class="filter-kind-pill" style="font-size: 10px;">${escapeHtml(filter.filterKind)}</span>
        </div>
        <div class="ptz-preset-actions-right">
          <button type="button" class="btn-blade-eye ${filter.filterEnabled ? 'visible' : 'hidden'}" title="Toggle Preset">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              ${
                filter.filterEnabled
                  ? `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3" fill="currentColor"/>`
                  : `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`
              }
            </svg>
          </button>
          <button type="button" class="btn-filter-trash" title="Delete Preset">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      `;

      // Eye button toggles this preset exclusively
      const btnEye = card.querySelector('.btn-blade-eye');
      btnEye.addEventListener('click', async (e) => {
        e.preventDefault();
        const next = !filter.filterEnabled;
        try {
          if (next) {
            // Disable other PTZ filters for exclusive activation
            for (const other of ptzFilters) {
              if (other.filterName !== filter.filterName && other.filterEnabled) {
                await state.obs.setSourceFilterEnabled(sourceName, other.filterName, false);
              }
            }
          }
          await state.obs.setSourceFilterEnabled(sourceName, filter.filterName, next);
          await loadPtzPresetsList(sourceName);
          showPtzBanner(`✓ Preset "${filter.filterName}" ${next ? 'activated' : 'disabled'}`, false);
        } catch (err) {
          console.error(err);
        }
      });

      // Delete button
      const btnTrash = card.querySelector('.btn-filter-trash');
      btnTrash.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
          await state.obs.removeSourceFilter(sourceName, filter.filterName);
          await loadPtzPresetsList(sourceName);
          showPtzBanner(`Removed preset filter "${filter.filterName}"`, false);
        } catch (err) {
          console.error(err);
        }
      });

      el.ptzPresetsListContainer.appendChild(card);
    });
  } catch (err) {
    if (
      err?.isDisconnect ||
      err?.code === 'DISCONNECTED' ||
      err?.message?.includes('disconnect') ||
      err?.message?.includes('closed') ||
      state.obs.status !== 'connected'
    ) {
      if (el.ptzPresetsListContainer) {
        el.ptzPresetsListContainer.innerHTML = `
          <div style="font-size: 11.5px; color: var(--obs-text-gray); padding: 8px 0; text-align: center;">
            Disconnected from OBS Studio.
          </div>
        `;
      }
      return;
    }
    console.warn('Notice loading presets:', err?.message || err);
    if (el.ptzPresetsListContainer) {
      el.ptzPresetsListContainer.innerHTML = `
        <div style="font-size: 11.5px; color: var(--obs-text-gray); padding: 8px 0; text-align: center;">
          Presets temporarily unavailable.
        </div>
      `;
    }
  }
}

async function saveCurrentPtzPreset(presetName) {
  if (!activePtzSession) return;
  const cleanName = presetName.trim();
  if (!cleanName) return;

  const { sourceName } = activePtzSession;
  const geom = computePtzGeometry(activePtzSession);
  const cropSettings = {
    left: geom.left,
    right: geom.right,
    top: geom.top,
    bottom: geom.bottom,
    relative: true,
  };

  try {
    await state.obs.createSourceFilter(sourceName, cleanName, 'crop_filter', cropSettings);
    showPtzBanner(`✓ Created PTZ filter preset "${cleanName}" in OBS Studio!`, false);
    await loadPtzPresetsList(sourceName);
    closeSavePtzPresetModal();
  } catch (err) {
    const isAlreadyExists = err?.code === 601 || (err?.message && err.message.toLowerCase().includes('already exists'));
    if (isAlreadyExists) {
      try {
        await state.obs.setSourceFilterSettings(sourceName, cleanName, cropSettings);
        await state.obs.setSourceFilterEnabled(sourceName, cleanName, true).catch(() => null);
        showPtzBanner(`✓ Updated existing PTZ preset "${cleanName}" in OBS Studio!`, false);
        await loadPtzPresetsList(sourceName);
        closeSavePtzPresetModal();
        return;
      } catch (updateErr) {
        console.error('Failed to update existing preset:', updateErr);
      }
    }
    console.error('Failed to save preset filter:', err);
    showPtzBanner(`Error saving preset filter: ${err.message}`, true);
  }
}

function openSavePtzPresetModal() {
  if (!activePtzSession) return;
  if (el.inputPtzPresetName) {
    el.inputPtzPresetName.value = `PTZ - Zoom ${activePtzSession.zoom.toFixed(1)}x`;
  }
  if (el.modalSavePtzPreset) {
    el.modalSavePtzPreset.classList.add('open');
    setTimeout(() => {
      el.inputPtzPresetName.focus();
      el.inputPtzPresetName.select();
    }, 100);
  }
}

function closeSavePtzPresetModal() {
  if (el.modalSavePtzPreset) {
    el.modalSavePtzPreset.classList.remove('open');
  }
}

function setupPtzGestureHandlers() {
  if (!el.ptzGestureViewport) return;

  el.ptzGestureViewport.addEventListener('pointerdown', (e) => {
    if (!activePtzSession) return;
    el.ptzGestureViewport.setPointerCapture(e.pointerId);
    activePtzPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePtzPointers.size === 2) {
      const pts = Array.from(activePtzPointers.values());
      initialPinchDistance = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      initialPtzZoom = activePtzSession.zoom;
    }
  });

  el.ptzGestureViewport.addEventListener('pointermove', (e) => {
    if (!activePtzSession || !activePtzPointers.has(e.pointerId)) return;

    if (activePtzPointers.size === 2) {
      // 2-Finger Pinch to Zoom (up to max 20x)
      activePtzPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const pts = Array.from(activePtzPointers.values());
      const currentDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (initialPinchDistance > 10) {
        const ratio = currentDist / initialPinchDistance;
        activePtzSession.hasPtzModified = true;
        activePtzSession.zoom = Math.max(1.0, Math.min(20.0, initialPtzZoom * ratio));
        queuePtzUpdate(false);
      }
    } else if (activePtzPointers.size === 1) {
      // 1-Finger Drag to Pan (1:1 pixel-matched to cropped preview)
      const prev = activePtzPointers.get(e.pointerId);
      const deltaX = e.clientX - prev.x;
      const deltaY = e.clientY - prev.y;
      activePtzPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      const geom = computePtzGeometry(activePtzSession);
      const scaleX = activePtzSession.dispScaleX || 1;
      const scaleY = activePtzSession.dispScaleY || 1;

      activePtzSession.hasPtzModified = true;
      if (geom.marginX > 0.5) {
        const stepX = deltaX / (geom.marginX * scaleX);
        activePtzSession.panX = Math.max(-1.0, Math.min(1.0, activePtzSession.panX - stepX));
      } else {
        activePtzSession.panX = 0;
      }
      if (geom.marginY > 0.5) {
        const stepY = deltaY / (geom.marginY * scaleY);
        activePtzSession.panY = Math.max(-1.0, Math.min(1.0, activePtzSession.panY - stepY));
      } else {
        activePtzSession.panY = 0;
      }

      queuePtzUpdate(false);
    }
  });

  const onPointerEnd = (e) => {
    activePtzPointers.delete(e.pointerId);
    if (activePtzSession && activePtzPointers.size === 0) {
      queuePtzUpdate(true);
    }
  };

  el.ptzGestureViewport.addEventListener('pointerup', onPointerEnd);
  el.ptzGestureViewport.addEventListener('pointercancel', onPointerEnd);

  // Mouse wheel zoom (up to max 20x)
  el.ptzGestureViewport.addEventListener(
    'wheel',
    (e) => {
      if (!activePtzSession) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.2 : 0.2;
      activePtzSession.hasPtzModified = true;
      activePtzSession.zoom = Math.max(1.0, Math.min(20.0, activePtzSession.zoom + delta));
      queuePtzUpdate(true);
    },
    { passive: false }
  );
}

// --- Hik-Connect PTZ 360° Velocity Joystick Engine ---
function updateHikKnobVisual() {
  const knob = document.getElementById('hik-ptz-knob');
  if (!knob || !activePtzSession) return;
  // If not dragging, keep the red puck centered
  if (!isJoystickDragging) {
    knob.style.transform = 'translate(-50%, -50%)';
  }

  const txtX = document.getElementById('hik-pan-x-text');
  const txtY = document.getElementById('hik-pan-y-text');
  if (txtX) txtX.textContent = `Pan: ${Math.round(activePtzSession.panX * 100)}%`;
  if (txtY) txtY.textContent = `Tilt: ${Math.round(activePtzSession.panY * 100)}%`;
}

function startHikJoystickLoop() {
  if (hikJoystickRafId) return;
  hikJoystickLastTime = performance.now();

  function loop(now) {
    const dt = Math.min(0.08, (now - hikJoystickLastTime) / 1000);
    hikJoystickLastTime = now;

    if (activePtzSession && isJoystickDragging) {
      const mag = Math.hypot(hikJoystickDeflection.x, hikJoystickDeflection.y);
      if (mag > 0.05) {
        // Deadzone of 0.05. Above deadzone: slight move slowly moves, large/full move moves faster
        const sensMult = ptzPanStepSize / 0.06;
        const speed = Math.pow(mag, 1.7) * 0.95 * sensMult; // pan units per second
        const dirX = hikJoystickDeflection.x / mag;
        const dirY = hikJoystickDeflection.y / mag;

        const geom = computePtzGeometry(activePtzSession);
        const prevX = activePtzSession.panX;
        const prevY = activePtzSession.panY;

        if (geom.marginX > 0.5) {
          activePtzSession.panX = Math.max(-1.0, Math.min(1.0, activePtzSession.panX + dirX * speed * dt));
        } else {
          activePtzSession.panX = 0;
        }
        if (geom.marginY > 0.5) {
          activePtzSession.panY = Math.max(-1.0, Math.min(1.0, activePtzSession.panY + dirY * speed * dt));
        } else {
          activePtzSession.panY = 0;
        }

        if (activePtzSession.panX !== prevX || activePtzSession.panY !== prevY) {
          activePtzSession.hasPtzModified = true;
        }

        updatePtzUiIndicators();
        queuePtzUpdate(false);
      }
    }

    if (isJoystickDragging) {
      hikJoystickRafId = requestAnimationFrame(loop);
    } else {
      hikJoystickRafId = null;
    }
  }

  hikJoystickRafId = requestAnimationFrame(loop);
}

function stopHikJoystickVelocityLoop() {
  if (hikJoystickRafId) {
    cancelAnimationFrame(hikJoystickRafId);
    hikJoystickRafId = null;
  }
  isJoystickDragging = false;
  hikJoystickDeflection = { x: 0, y: 0 };
  const knob = document.getElementById('hik-ptz-knob');
  if (knob) {
    knob.classList.remove('dragging');
    knob.style.transform = 'translate(-50%, -50%)';
  }
}

function setupHikJoystick() {
  const dial = document.getElementById('hik-ptz-dial');
  const knob = document.getElementById('hik-ptz-knob');
  if (!dial || !knob) return;

  function handleJoystickPointer(clientX, clientY) {
    if (!activePtzSession) return;
    const rect = dial.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let dx = clientX - centerX;
    let dy = clientY - centerY;
    const maxR = 56;

    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }

    knob.style.transform = `translate(calc(-50% + ${Math.round(dx * 10) / 10}px), calc(-50% + ${Math.round(dy * 10) / 10}px))`;

    hikJoystickDeflection.x = dx / maxR;
    hikJoystickDeflection.y = dy / maxR;

    startHikJoystickLoop();
  }

  const onPointerDown = (e) => {
    if (e.target.closest('.hik-arrow-btn')) return;
    e.preventDefault();
    isJoystickDragging = true;
    try {
      dial.setPointerCapture(e.pointerId);
    } catch (_) {}
    knob.classList.add('dragging');
    handleJoystickPointer(e.clientX, e.clientY);
  };

  const onPointerMove = (e) => {
    if (!isJoystickDragging) return;
    e.preventDefault();
    handleJoystickPointer(e.clientX, e.clientY);
  };

  const onPointerUp = (e) => {
    if (!isJoystickDragging) return;
    stopHikJoystickVelocityLoop();
    if (activePtzSession) {
      queuePtzUpdate(true);
    }
  };

  dial.addEventListener('pointerdown', onPointerDown);
  dial.addEventListener('pointermove', onPointerMove);
  dial.addEventListener('pointerup', onPointerUp);
  dial.addEventListener('pointercancel', onPointerUp);
  dial.addEventListener('lostpointercapture', onPointerUp);
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

// Confirmation modal helper for >100 MB uploads
function confirmLargeFileUpload(file, maxMb) {
  return new Promise((resolve) => {
    if (!el.modalLargeUploadConfirm || !el.largeUploadConfirmBody) {
      resolve(true);
      return;
    }

    el.largeUploadConfirmBody.innerHTML = `
      <p><strong>${escapeHtml(file.name)}</strong> is <strong>${escapeHtml(formatFileSize(file.size))}</strong>.</p>
      <ul style="margin: 8px 0 0 18px; color: var(--obs-text-gray); font-size: 12.5px;">
        <li>Uploading files larger than 100 MB over Wi-Fi may take several minutes.</li>
        <li>Server max upload size: <strong>${escapeHtml(String(maxMb))} MB</strong>.</li>
        <li>Keep this browser tab open until the upload completes.</li>
      </ul>
    `;
    el.modalLargeUploadConfirm.classList.add('open');

    const cleanup = (accepted) => {
      el.modalLargeUploadConfirm.classList.remove('open');
      el.btnConfirmLargeUpload.removeEventListener('click', onConfirm);
      el.btnCancelLargeUpload.removeEventListener('click', onCancel);
      resolve(accepted);
    };
    const onConfirm = () => cleanup(true);
    const onCancel = () => cleanup(false);

    el.btnConfirmLargeUpload.addEventListener('click', onConfirm);
    el.btnCancelLargeUpload.addEventListener('click', onCancel);
  });
}

// Progress-tracked XHR upload (no artificial 12s timeout; streams directly from browser)
function uploadFileWithProgress(uploadUrl, formData, password, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', uploadUrl);
    if (password) {
      xhr.setRequestHeader('Authorization', `Bearer ${password}`);
    }

    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable && typeof onProgress === 'function') {
        onProgress(evt.loaded, evt.total);
      }
    };

    xhr.onload = () => {
      let data = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch (_) {}

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data);
      } else {
        const err = new Error(data.error || `Upload failed (HTTP ${xhr.status})`);
        err.httpStatus = xhr.status;
        reject(err);
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network connection error'));
    };

    xhr.send(formData);
  });
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
      startDir = parts.length === 1 && /^[a-zA-Z]:$/.test(parts[0]) ? `${parts[0]}\\` : parts.join('/');
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
      Connecting to file browser server...
    </div>
  `;

  try {
    const apiUrl = getFileServerApiUrl(`/api/fs/browse?dir=${encodeURIComponent(dir || '')}`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const filePw = getFileServerPassword();
    const headers = filePw ? { Authorization: `Bearer ${filePw}` } : {};

    const res = await fetch(apiUrl, { signal: controller.signal, headers });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    currentHostDir = data.currentDir;
    currentHostParentDir = data.parentDir;

    el.hostBrowserBreadcrumb.textContent =
      data.currentDir === '__DRIVES__' ? 'All Drives' : data.currentDir;

    if (data.parentDir) {
      el.btnHostNavUp.style.display = 'flex';
    } else {
      el.btnHostNavUp.style.display = 'none';
    }

    renderHostEntries(data.entries || []);
  } catch (err) {
    el.hostBrowserEntries.innerHTML = `
      <div style="text-align: center; padding: 28px 16px; font-size: 13px; line-height: 1.6;">
        <div style="font-size: 26px; margin-bottom: 8px;">⚠️</div>
        <div style="font-weight: 600; color: #f87171; margin-bottom: 6px; font-size: 14px;">
          Not possible now since file browser server not connected
        </div>
        <div style="color: var(--obs-text-gray); font-size: 12px; margin-bottom: 16px;">
          Live OBS scene switching, audio, and broadcast controls remain active.
        </div>
        <button type="button" id="btn-retry-browse-server" class="btn-blue-primary" style="padding: 7px 18px; font-size: 12.5px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
          <span>🔄</span>
          <span>Retry Connection</span>
        </button>
      </div>
    `;
    const retryBtn = document.getElementById('btn-retry-browse-server');
    if (retryBtn) {
      retryBtn.addEventListener('click', (e) => {
        e.preventDefault();
        loadHostDirectory(dir);
      });
    }
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

    const icon = entry.isDrive ? '💾' : entry.isDirectory ? '📁' : getFileIcon(entry.ext);
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
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
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
