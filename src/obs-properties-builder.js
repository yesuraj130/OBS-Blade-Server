/**
 * Dynamic OBS Source Properties View Builder
 * Direct implementation of OBS Studio's UI/properties-view.cpp & libobs/obs-properties.h
 * 
 * Dynamically builds form widgets for any OBS source / input based on its property types:
 * - OBS_PROPERTY_BOOL: Switch / Checkbox
 * - OBS_PROPERTY_INT / FLOAT: Spinbox & range slider with min/max/step/units
 * - OBS_PROPERTY_TEXT: Single-line input or multi-line textarea
 * - OBS_PROPERTY_PATH: Path textbox with "🖥️ Browse OBS Host Files" & "📁 Browse Local / Upload"
 * - OBS_PROPERTY_LIST: Combobox / Select dropdown (populated statically or via GetInputPropertiesListPropertyItems)
 * - OBS_PROPERTY_COLOR: Color picker + Hex value
 * - OBS_PROPERTY_BUTTON: Action buttons (e.g. Reload, Defaults)
 */

export const OBS_SCHEMAS = {
  // 1. Image Source
  image_source: [
    {
      key: 'file',
      name: 'Image File',
      type: 'path',
      pathType: 'file',
      accept: 'image/*',
      description: 'Local file path on the OBS host machine.',
    },
    {
      key: 'unload',
      name: 'Unload image when not showing',
      type: 'bool',
      description: 'Saves memory when source is not visible in the active scene.',
    },
  ],

  // 2. Media Source (FFmpeg)
  ffmpeg_source: [
    {
      key: 'is_local_file',
      name: 'Local File',
      type: 'bool',
      default: true,
    },
    {
      key: 'local_file',
      name: 'Media File Path',
      type: 'path',
      pathType: 'file',
      accept: 'video/*,audio/*',
      showIf: (s) => s.is_local_file !== false,
      description: 'Local video or audio file path on the OBS host machine.',
    },
    {
      key: 'input',
      name: 'Network Stream / URL',
      type: 'text',
      showIf: (s) => s.is_local_file === false,
      placeholder: 'rtsp://... or https://...',
    },
    {
      key: 'looping',
      name: 'Loop Playback',
      type: 'bool',
    },
    {
      key: 'restart_on_activate',
      name: 'Restart playback when source becomes active',
      type: 'bool',
    },
    {
      key: 'speed_percent',
      name: 'Speed',
      type: 'int',
      min: 1,
      max: 500,
      step: 5,
      unit: '%',
      default: 100,
    },
    {
      key: 'buffering_mb',
      name: 'Network Buffering',
      type: 'int',
      min: 1,
      max: 100,
      step: 1,
      unit: 'MB',
      default: 2,
    },
    {
      key: 'linear_alpha',
      name: 'Apply alpha in linear space',
      type: 'bool',
    },
  ],

  // 3. Browser Source
  browser_source: [
    {
      key: 'is_local_file',
      name: 'Local HTML File',
      type: 'bool',
      default: false,
    },
    {
      key: 'local_file',
      name: 'Local File Path',
      type: 'path',
      pathType: 'file',
      accept: '.html,.htm',
      showIf: (s) => !!s.is_local_file,
    },
    {
      key: 'url',
      name: 'URL',
      type: 'text',
      placeholder: 'https://...',
      showIf: (s) => !s.is_local_file,
    },
    {
      key: 'width',
      name: 'Width (px)',
      type: 'int',
      min: 10,
      max: 7680,
      step: 1,
      default: 1920,
    },
    {
      key: 'height',
      name: 'Height (px)',
      type: 'int',
      min: 10,
      max: 4320,
      step: 1,
      default: 1080,
    },
    {
      key: 'fps',
      name: 'FPS',
      type: 'int',
      min: 1,
      max: 120,
      step: 1,
      default: 60,
    },
    {
      key: 'custom_css',
      name: 'Custom CSS',
      type: 'text',
      multiline: true,
      rows: 3,
      default: 'body { background-color: rgba(0, 0, 0, 0); margin: 0px auto; overflow: hidden; }',
    },
    {
      key: 'shutdown',
      name: 'Shutdown source when not visible',
      type: 'bool',
    },
    {
      key: 'restart_when_active',
      name: 'Refresh browser when scene becomes active',
      type: 'bool',
    },
    {
      key: 'reroute_audio',
      name: 'Control audio via OBS',
      type: 'bool',
    },
    {
      key: 'refreshnocache',
      name: 'Refresh cache of current page',
      type: 'button',
      label: '↻ Refresh Browser Page',
      action: 'refresh_browser',
    },
  ],

  // 4. Text Source (GDI+ or FreeType2)
  text_gdiplus_v2: [
    {
      key: 'text',
      name: 'Text',
      type: 'text',
      multiline: true,
      rows: 4,
      placeholder: 'Enter text here...',
    },
    {
      key: 'read_from_file',
      name: 'Read from file',
      type: 'bool',
    },
    {
      key: 'file',
      name: 'Text File Path',
      type: 'path',
      pathType: 'file',
      accept: '.txt',
      showIf: (s) => !!s.read_from_file,
    },
    {
      key: 'color',
      name: 'Text Color',
      type: 'color',
      default: 16777215, // White in BGR
    },
    {
      key: 'opacity',
      name: 'Opacity',
      type: 'int',
      min: 0,
      max: 100,
      step: 1,
      unit: '%',
      default: 100,
    },
    {
      key: 'gradient',
      name: 'Gradient Fill',
      type: 'bool',
    },
    {
      key: 'color2',
      name: 'Gradient Secondary Color',
      type: 'color',
      showIf: (s) => !!s.gradient,
    },
    {
      key: 'outline',
      name: 'Outline',
      type: 'bool',
    },
    {
      key: 'outline_size',
      name: 'Outline Size',
      type: 'int',
      min: 1,
      max: 20,
      step: 1,
      unit: 'px',
      showIf: (s) => !!s.outline,
    },
    {
      key: 'outline_color',
      name: 'Outline Color',
      type: 'color',
      showIf: (s) => !!s.outline,
    },
  ],

  // 5. Color Source
  color_source_v3: [
    {
      key: 'color',
      name: 'Color',
      type: 'color',
      default: 4278190080,
    },
    {
      key: 'width',
      name: 'Width (px)',
      type: 'int',
      min: 1,
      max: 7680,
      step: 1,
      default: 1920,
    },
    {
      key: 'height',
      name: 'Height (px)',
      type: 'int',
      min: 1,
      max: 4320,
      step: 1,
      default: 1080,
    },
  ],

  // 6. Video Capture Device (DirectShow)
  dshow_input: [
    {
      key: 'video_device_id',
      name: 'Device',
      type: 'list',
      fetchItems: true,
      description: 'Select connected video capture card or webcam.',
    },
    {
      key: 'res_type',
      name: 'Resolution / FPS Type',
      type: 'list',
      options: [
        { name: 'Device Default', value: 0 },
        { name: 'Custom', value: 1 },
      ],
    },
    {
      key: 'resolution',
      name: 'Resolution',
      type: 'list',
      fetchItems: true,
      showIf: (s) => s.res_type === 1,
      options: [
        { name: '3840x2160', value: '3840x2160' },
        { name: '1920x1080', value: '1920x1080' },
        { name: '1280x720', value: '1280x720' },
      ],
    },
    {
      key: 'flip_vertically',
      name: 'Flip Vertically',
      type: 'bool',
    },
    {
      key: 'audio_output_mode',
      name: 'Audio Output Mode',
      type: 'list',
      options: [
        { name: 'Capture audio only', value: 0 },
        { name: 'Output desktop audio (WaveOut)', value: 1 },
        { name: 'Output desktop audio (DirectSound)', value: 2 },
      ],
    },
  ],

  // 7. Audio Capture (WASAPI Input / Output)
  wasapi_input_capture: [
    {
      key: 'device_id',
      name: 'Device',
      type: 'list',
      fetchItems: true,
      description: 'System audio recording device.',
    },
    {
      key: 'use_device_timing',
      name: 'Use Device Timestamps',
      type: 'bool',
      default: true,
    },
  ],

  wasapi_output_capture: [
    {
      key: 'device_id',
      name: 'Device',
      type: 'list',
      fetchItems: true,
      description: 'System audio playback device.',
    },
    {
      key: 'use_device_timing',
      name: 'Use Device Timestamps',
      type: 'bool',
      default: true,
    },
  ],

  // 8. Display / Monitor Capture
  monitor_capture: [
    {
      key: 'monitor',
      name: 'Display',
      type: 'list',
      fetchItems: true,
      options: [
        { name: 'Primary Display', value: 0 },
        { name: 'Secondary Display', value: 1 },
      ],
    },
    {
      key: 'capture_cursor',
      name: 'Capture Cursor',
      type: 'bool',
      default: true,
    },
    {
      key: 'method',
      name: 'Capture Method',
      type: 'list',
      options: [
        { name: 'Automatic', value: 0 },
        { name: 'DXGI Desktop Duplication', value: 1 },
        { name: 'Windows 10 / 11 (WGC)', value: 2 },
      ],
    },
  ],

  // 9. Window Capture
  window_capture: [
    {
      key: 'window',
      name: 'Window',
      type: 'list',
      fetchItems: true,
    },
    {
      key: 'priority',
      name: 'Window Match Priority',
      type: 'list',
      options: [
        { name: 'Window title must match', value: 0 },
        { name: 'Match title, otherwise find window of same type', value: 1 },
        { name: 'Match title, otherwise find window of same executable', value: 2 },
      ],
    },
    {
      key: 'cursor',
      name: 'Capture Cursor',
      type: 'bool',
      default: true,
    },
    {
      key: 'client_area',
      name: 'Client Area',
      type: 'bool',
      default: true,
    },
  ],

  // 10. VLC Video Source
  vlc_source: [
    {
      key: 'loop',
      name: 'Loop Playlist',
      type: 'bool',
      default: true,
    },
    {
      key: 'shuffle',
      name: 'Shuffle Playlist',
      type: 'bool',
      default: false,
    },
    {
      key: 'playback_behavior',
      name: 'Visibility Behavior',
      type: 'list',
      options: [
        { name: 'Stop when not visible, restart when visible', value: 'stop_restart' },
        { name: 'Pause when not visible, unpause when visible', value: 'pause_unpause' },
        { name: 'Always play even when not visible', value: 'always_play' },
      ],
    },
    {
      key: 'network_caching',
      name: 'Network Caching (ms)',
      type: 'int',
      min: 100,
      max: 10000,
      step: 100,
      unit: 'ms',
      default: 1000,
    },
  ],
};

// Aliases
OBS_SCHEMAS.text_gdiplus = OBS_SCHEMAS.text_gdiplus_v2;
OBS_SCHEMAS.text_ft2_source_v2 = OBS_SCHEMAS.text_gdiplus_v2;
OBS_SCHEMAS.text_ft2_source = OBS_SCHEMAS.text_gdiplus_v2;
OBS_SCHEMAS.color_source = OBS_SCHEMAS.color_source_v3;
OBS_SCHEMAS.display_capture = OBS_SCHEMAS.monitor_capture;

/**
 * Convert OBS integer color format (BGR / ABGR integer) to Hex string (#RRGGBB)
 */
export function obsColorToHex(num) {
  if (typeof num !== 'number') return '#ffffff';
  // OBS text_gdiplus uses BGR: (B << 16) | (G << 8) | R
  const r = num & 0xff;
  const g = (num >> 8) & 0xff;
  const b = (num >> 16) & 0xff;
  const toHex = (n) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Convert Hex string (#RRGGBB) to OBS integer color (BGR)
 */
export function hexToObsColor(hex) {
  if (!hex || typeof hex !== 'string') return 16777215;
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) || 0;
  const g = parseInt(clean.slice(2, 4), 16) || 0;
  const b = parseInt(clean.slice(4, 6), 16) || 0;
  return (b << 16) | (g << 8) | r;
}

/**
 * Dynamically construct the source properties view matching OBS Studio UI
 */
export async function buildPropertiesView({
  container,
  sourceName,
  inputKind,
  currentSettings,
  defaultSettings,
  obsClient,
  onBrowseHost,
  onBrowseLocal,
  onSettingChange,
  onTriggerButton,
}) {
  container.innerHTML = '';

  const schema = OBS_SCHEMAS[inputKind] || [];
  const handledKeys = new Set();
  const draftSettings = { ...(defaultSettings || {}), ...(currentSettings || {}) };

  // Helper to re-evaluate conditional visibility (`showIf`)
  const propertyRows = [];
  function updateConditionalVisibility() {
    propertyRows.forEach(({ rowEl, def }) => {
      if (typeof def.showIf === 'function') {
        const isVisible = def.showIf(draftSettings);
        rowEl.style.display = isVisible ? 'flex' : 'none';
      }
    });
  }

  // 1. Render all defined properties from official schema
  for (const propDef of schema) {
    handledKeys.add(propDef.key);
    const rowEl = await createPropertyRow({
      propDef,
      sourceName,
      draftSettings,
      obsClient,
      onBrowseHost,
      onBrowseLocal,
      onChange: (val) => {
        draftSettings[propDef.key] = val;
        updateConditionalVisibility();
        if (onSettingChange) onSettingChange(propDef.key, val, draftSettings);
      },
      onTriggerButton,
    });
    propertyRows.push({ rowEl, def: propDef });
    container.appendChild(rowEl);
  }

  // 2. Discover any additional or custom plugin settings not in schema
  const remainingKeys = Object.keys(draftSettings).filter(
    (k) => !handledKeys.has(k) && !k.startsWith('_')
  );

  if (remainingKeys.length > 0) {
    const extraHeader = document.createElement('div');
    extraHeader.className = 'properties-group-title';
    extraHeader.textContent = 'Additional Settings';
    container.appendChild(extraHeader);

    for (const key of remainingKeys) {
      const val = draftSettings[key];
      const autoDef = inferPropertyDefinition(key, val);
      const rowEl = await createPropertyRow({
        propDef: autoDef,
        sourceName,
        draftSettings,
        obsClient,
        onBrowseHost,
        onBrowseLocal,
        onChange: (v) => {
          draftSettings[key] = v;
          if (onSettingChange) onSettingChange(key, v, draftSettings);
        },
        onTriggerButton,
      });
      container.appendChild(rowEl);
    }
  }

  // Initial conditional visibility pass
  updateConditionalVisibility();

  return {
    getDraftSettings: () => draftSettings,
  };
}

/**
 * Infer definition from primitive type
 */
function inferPropertyDefinition(key, value) {
  const label = key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase());

  const keyLower = key.toLowerCase();
  const isPath =
    keyLower.includes('file') ||
    keyLower.includes('path') ||
    keyLower.includes('dir') ||
    keyLower.includes('folder');

  if (typeof value === 'boolean') {
    return { key, name: label, type: 'bool' };
  } else if (typeof value === 'number') {
    return { key, name: label, type: Number.isInteger(value) ? 'int' : 'float' };
  } else if (isPath) {
    return { key, name: label, type: 'path', pathType: 'file' };
  } else if (typeof value === 'string' && value.includes('\n')) {
    return { key, name: label, type: 'text', multiline: true };
  } else {
    return { key, name: label, type: 'text' };
  }
}

/**
 * Create a single property widget row
 */
async function createPropertyRow({
  propDef,
  sourceName,
  draftSettings,
  obsClient,
  onBrowseHost,
  onBrowseLocal,
  onChange,
  onTriggerButton,
}) {
  const row = document.createElement('div');
  row.className = 'property-control-row';
  row.dataset.propKey = propDef.key;

  const currentValue = draftSettings[propDef.key] !== undefined ? draftSettings[propDef.key] : propDef.default;

  // Header / Label
  const labelCol = document.createElement('div');
  labelCol.className = 'property-label-col';

  const label = document.createElement('label');
  label.className = 'property-label-text';
  label.textContent = propDef.name;
  labelCol.appendChild(label);

  if (propDef.description) {
    const desc = document.createElement('div');
    desc.className = 'property-desc-text';
    desc.textContent = propDef.description;
    labelCol.appendChild(desc);
  }

  const widgetCol = document.createElement('div');
  widgetCol.className = 'property-widget-col';

  switch (propDef.type) {
    // Boolean Checkbox / Toggle
    case 'bool': {
      row.classList.add('property-row-switch');
      const switchEl = document.createElement('label');
      switchEl.className = 'switch-control';
      switchEl.title = propDef.name;

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = !!currentValue;
      checkbox.addEventListener('change', (e) => {
        onChange(e.target.checked);
      });

      const slider = document.createElement('span');
      slider.className = 'switch-slider';

      switchEl.appendChild(checkbox);
      switchEl.appendChild(slider);
      widgetCol.appendChild(switchEl);
      break;
    }

    // Number (Int / Float)
    case 'int':
    case 'float': {
      const isFloat = propDef.type === 'float';
      const container = document.createElement('div');
      container.style.cssText = 'display: flex; align-items: center; gap: 8px; width: 100%;';

      const numInput = document.createElement('input');
      numInput.type = 'number';
      numInput.className = 'input-blade prop-num-input';
      numInput.style.cssText = 'width: 100px; padding: 8px 10px; font-family: monospace; font-size: 13px;';
      if (propDef.min !== undefined) numInput.min = propDef.min;
      if (propDef.max !== undefined) numInput.max = propDef.max;
      numInput.step = propDef.step !== undefined ? propDef.step : (isFloat ? '0.01' : '1');
      numInput.value = currentValue !== undefined ? currentValue : (propDef.min || 0);

      // Range Slider if min and max are specified
      let slider = null;
      if (propDef.min !== undefined && propDef.max !== undefined) {
        slider = document.createElement('input');
        slider.type = 'range';
        slider.className = 'prop-slider';
        slider.min = propDef.min;
        slider.max = propDef.max;
        slider.step = numInput.step;
        slider.value = numInput.value;
        slider.style.cssText = 'flex: 1; accent-color: var(--obs-blue); cursor: pointer;';

        slider.addEventListener('input', (e) => {
          const val = isFloat ? parseFloat(e.target.value) : parseInt(e.target.value, 10);
          numInput.value = val;
          onChange(val);
        });
      }

      numInput.addEventListener('input', (e) => {
        const val = isFloat ? parseFloat(e.target.value) : parseInt(e.target.value, 10);
        if (!isNaN(val)) {
          if (slider) slider.value = val;
          onChange(val);
        }
      });

      container.appendChild(numInput);
      if (slider) container.appendChild(slider);
      if (propDef.unit) {
        const unitLabel = document.createElement('span');
        unitLabel.style.cssText = 'font-size: 12px; color: var(--obs-text-gray); min-width: 24px;';
        unitLabel.textContent = propDef.unit;
        container.appendChild(unitLabel);
      }

      widgetCol.appendChild(container);
      break;
    }

    // Text Input or Multiline Textarea
    case 'text': {
      if (propDef.multiline) {
        const textarea = document.createElement('textarea');
        textarea.className = 'input-blade prop-textarea';
        textarea.rows = propDef.rows || 3;
        textarea.style.cssText = 'width: 100%; resize: vertical; font-family: inherit; font-size: 13px; line-height: 1.4;';
        textarea.placeholder = propDef.placeholder || '';
        textarea.value = currentValue || '';
        textarea.addEventListener('input', (e) => {
          onChange(e.target.value);
        });
        widgetCol.appendChild(textarea);
      } else {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'input-blade';
        input.style.cssText = 'width: 100%; font-size: 13px; padding: 8px 12px;';
        input.placeholder = propDef.placeholder || '';
        input.value = currentValue || '';
        input.addEventListener('input', (e) => {
          onChange(e.target.value);
        });
        widgetCol.appendChild(input);
      }
      break;
    }

    // Path Property (File or Directory) with Dual Browse Helpers
    case 'path': {
      const pathBox = document.createElement('div');
      pathBox.style.cssText = 'display: flex; flex-direction: column; gap: 8px; width: 100%;';

      const inputRow = document.createElement('div');
      inputRow.style.cssText = 'display: flex; gap: 6px; width: 100%;';

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'input-blade';
      input.style.cssText = 'flex: 1; font-family: monospace; font-size: 12px; padding: 8px 10px; word-break: break-all;';
      input.placeholder = propDef.pathType === 'folder' ? 'C:/OBS/Assets' : 'C:/OBS/Assets/file.ext';
      input.value = currentValue || '';
      input.addEventListener('input', (e) => {
        onChange(e.target.value);
      });
      inputRow.appendChild(input);

      // Action helper buttons: "🖥️ Browse Host" and "📁 Browse Local / Upload"
      const buttonsRow = document.createElement('div');
      buttonsRow.style.cssText = 'display: flex; gap: 8px; flex-wrap: wrap;';

      const btnBrowseHost = document.createElement('button');
      btnBrowseHost.type = 'button';
      btnBrowseHost.className = 'btn-prop-browse btn-browse-host';
      btnBrowseHost.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
        <span>Browse OBS Host</span>
      `;
      btnBrowseHost.addEventListener('click', (e) => {
        e.preventDefault();
        if (onBrowseHost) {
          onBrowseHost({
            propKey: propDef.key,
            currentPath: input.value,
            pathType: propDef.pathType || 'file',
            accept: propDef.accept,
            onSelect: (selectedPath) => {
              input.value = selectedPath;
              onChange(selectedPath);
            },
          });
        }
      });
      buttonsRow.appendChild(btnBrowseHost);

      const btnBrowseLocal = document.createElement('button');
      btnBrowseLocal.type = 'button';
      btnBrowseLocal.className = 'btn-prop-browse btn-browse-local';
      btnBrowseLocal.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        <span>Browse Local / Upload</span>
      `;
      btnBrowseLocal.addEventListener('click', (e) => {
        e.preventDefault();
        if (onBrowseLocal) {
          onBrowseLocal({
            propKey: propDef.key,
            accept: propDef.accept || '*/*',
            onUploaded: (uploadedPath) => {
              input.value = uploadedPath;
              onChange(uploadedPath);
            },
          });
        }
      });
      buttonsRow.appendChild(btnBrowseLocal);

      pathBox.appendChild(inputRow);
      pathBox.appendChild(buttonsRow);
      widgetCol.appendChild(pathBox);
      break;
    }

    // List / Dropdown Combobox
    case 'list': {
      const select = document.createElement('select');
      select.className = 'input-blade prop-select';
      select.style.cssText = 'width: 100%; font-size: 13px; padding: 8px 10px; cursor: pointer;';

      let optionsList = propDef.options ? [...propDef.options] : [];

      // If dynamic property items can be queried from OBS
      if (propDef.fetchItems && obsClient && typeof obsClient.getInputPropertiesListPropertyItems === 'function') {
        try {
          const res = await obsClient.getInputPropertiesListPropertyItems(sourceName, propDef.key);
          if (res && Array.isArray(res.propertyItems) && res.propertyItems.length > 0) {
            optionsList = res.propertyItems.map((item) => ({
              name: item.itemName,
              value: item.itemValue,
              enabled: item.itemEnabled !== false,
            }));
          }
        } catch (_) {
          // Keep default static options if query fails or unsupported
        }
      }

      if (optionsList.length === 0 && currentValue !== undefined) {
        optionsList.push({ name: String(currentValue), value: currentValue });
      }

      optionsList.forEach((opt) => {
        const optionEl = document.createElement('option');
        optionEl.value = opt.value;
        optionEl.textContent = opt.name;
        if (String(opt.value) === String(currentValue)) {
          optionEl.selected = true;
        }
        select.appendChild(optionEl);
      });

      select.addEventListener('change', (e) => {
        let val = e.target.value;
        // Cast numeric values if options are integers
        if (optionsList.length > 0 && typeof optionsList[0].value === 'number') {
          val = Number(val);
        }
        onChange(val);
      });

      widgetCol.appendChild(select);
      break;
    }

    // Color Picker
    case 'color': {
      const colorBox = document.createElement('div');
      colorBox.style.cssText = 'display: flex; align-items: center; gap: 8px; width: 100%;';

      const hexValue = typeof currentValue === 'number' ? obsColorToHex(currentValue) : (currentValue || '#ffffff');

      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.value = hexValue;
      colorInput.style.cssText =
        'width: 40px; height: 36px; border: 1px solid #1e2638; border-radius: 6px; padding: 2px; background: #090c14; cursor: pointer;';

      const hexText = document.createElement('input');
      hexText.type = 'text';
      hexText.className = 'input-blade';
      hexText.style.cssText = 'width: 100px; font-family: monospace; font-size: 13px; padding: 8px 10px;';
      hexText.value = hexValue.toUpperCase();

      colorInput.addEventListener('input', (e) => {
        const hex = e.target.value;
        hexText.value = hex.toUpperCase();
        onChange(hexToObsColor(hex));
      });

      hexText.addEventListener('input', (e) => {
        const hex = e.target.value;
        if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
          colorInput.value = hex;
          onChange(hexToObsColor(hex));
        }
      });

      colorBox.appendChild(colorInput);
      colorBox.appendChild(hexText);
      widgetCol.appendChild(colorBox);
      break;
    }

    // Button Property
    case 'button': {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-blue-outline prop-action-btn';
      btn.style.cssText = 'padding: 8px 14px; font-size: 13px; font-weight: 600;';
      btn.textContent = propDef.label || propDef.name;
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        if (onTriggerButton) {
          onTriggerButton(propDef.action || propDef.key);
        }
      });
      widgetCol.appendChild(btn);
      break;
    }

    default:
      break;
  }

  row.appendChild(labelCol);
  row.appendChild(widgetCol);
  return row;
}
