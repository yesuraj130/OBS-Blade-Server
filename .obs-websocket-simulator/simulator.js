/**
 * Built-in OBS WebSocket v5 Protocol Simulator
 * Enables standalone dev and preview environments to test scene switching,
 * media file switching, source item toggling, and live source thumbnails.
 */

import { WebSocketServer } from 'ws';

export class ObsWebSocketSimulator {
  constructor() {
    this.wss = null;
    this.studioModeEnabled = true;
    this.currentProgramScene = 'Verse Bottom';
    this.currentPreviewScene = 'Testimony';
    this.isStreaming = false;
    this.isRecording = false;

    // Rich sample scenes with diverse source types
    this.scenes = [
      {
        sceneName: 'Projector Back',
        sceneIndex: 0,
        items: [
          { sceneItemId: 1, sourceName: 'Sermon Slide', inputKind: 'image_source', sceneItemEnabled: true },
          { sceneItemId: 2, sourceName: 'Pastor Camera', inputKind: 'dshow_input', sceneItemEnabled: true },
          { sceneItemId: 3, sourceName: 'Praise Lyrics', inputKind: 'text_gdiplus_v2', sceneItemEnabled: true },
          { sceneItemId: 4, sourceName: 'Countdown Video', inputKind: 'ffmpeg_source', sceneItemEnabled: true },
          { sceneItemId: 5, sourceName: 'Host Mic', inputKind: 'wasapi_input_capture', sceneItemEnabled: true },
          { sceneItemId: 6, sourceName: 'Stage Display Screen', inputKind: 'monitor_capture', sceneItemEnabled: false },
        ],
      },
      {
        sceneName: 'Verse Bottom',
        sceneIndex: 1,
        items: [
          { sceneItemId: 11, sourceName: 'Scripture LowerThird', inputKind: 'text_gdiplus_v2', sceneItemEnabled: true },
          { sceneItemId: 12, sourceName: 'Speaker Cam', inputKind: 'dshow_input', sceneItemEnabled: true },
          { sceneItemId: 13, sourceName: 'Background Motion', inputKind: 'ffmpeg_source', sceneItemEnabled: true },
          { sceneItemId: 14, sourceName: 'BGM Audio', inputKind: 'wasapi_input_capture', sceneItemEnabled: true },
        ],
      },
      {
        sceneName: 'Testimony',
        sceneIndex: 2,
        items: [
          { sceneItemId: 21, sourceName: 'Testimony Video', inputKind: 'ffmpeg_source', sceneItemEnabled: true },
          { sceneItemId: 22, sourceName: 'Interview Camera', inputKind: 'dshow_input', sceneItemEnabled: true },
          { sceneItemId: 23, sourceName: 'Interview Mic', inputKind: 'wasapi_input_capture', sceneItemEnabled: true },
          { sceneItemId: 24, sourceName: 'Graphic Overlay', inputKind: 'image_source', sceneItemEnabled: true },
          { sceneItemId: 25, sourceName: 'Live Web Page', inputKind: 'browser_source', sceneItemEnabled: false },
        ],
      },
      {
        sceneName: 'Offertory',
        sceneIndex: 3,
        items: [
          { sceneItemId: 31, sourceName: 'QR Code Banner', inputKind: 'image_source', sceneItemEnabled: true },
          { sceneItemId: 32, sourceName: 'Congregation Cam', inputKind: 'dshow_input', sceneItemEnabled: true },
          { sceneItemId: 33, sourceName: 'Offertory Music', inputKind: 'wasapi_input_capture', sceneItemEnabled: true },
        ],
      },
      {
        sceneName: 'Welcome',
        sceneIndex: 4,
        items: [
          { sceneItemId: 41, sourceName: 'Welcome Graphic', inputKind: 'image_source', sceneItemEnabled: true },
          { sceneItemId: 42, sourceName: 'Ambient Music', inputKind: 'wasapi_input_capture', sceneItemEnabled: true },
          { sceneItemId: 43, sourceName: 'Church Logo', inputKind: 'image_source', sceneItemEnabled: true },
        ],
      },
      {
        sceneName: 'Closing',
        sceneIndex: 5,
        items: [
          { sceneItemId: 51, sourceName: 'Credits Scroll', inputKind: 'text_gdiplus_v2', sceneItemEnabled: true },
          { sceneItemId: 52, sourceName: 'Post-service Stream', inputKind: 'browser_source', sceneItemEnabled: true },
        ],
      },
    ];

    this.sourceSettings = new Map([
      ['Sermon Slide', { inputKind: 'image_source', inputSettings: { file: '/.aistudio/assets/camera_backdrop.png', unload: false } }],
      ['Countdown Video', { inputKind: 'ffmpeg_source', inputSettings: { local_file: '/.aistudio/assets/motion_backdrop.mp4', looping: true, restart_on_activate: true, speed_percent: 100, buffering_mb: 2, is_local_file: true } }],
      ['Testimony Video', { inputKind: 'ffmpeg_source', inputSettings: { local_file: '/.aistudio/assets/speaker_cam_feed.mp4', looping: true, restart_on_activate: true, speed_percent: 100, buffering_mb: 2, is_local_file: true } }],
      ['Graphic Overlay', { inputKind: 'image_source', inputSettings: { file: '/.aistudio/assets/scripture_lowerthird.png', unload: false } }],
      ['QR Code Banner', { inputKind: 'image_source', inputSettings: { file: '/.aistudio/assets/animated_radar.gif', unload: false } }],
      ['Welcome Graphic', { inputKind: 'image_source', inputSettings: { file: '/.aistudio/assets/testimony_backdrop.png', unload: false } }],
      ['Church Logo', { inputKind: 'image_source', inputSettings: { file: '/.aistudio/assets/standby_slate.png', unload: false } }],
      ['Live Web Page', { inputKind: 'browser_source', inputSettings: { url: 'https://obsblade.app', width: 1920, height: 1080, fps: 60, custom_css: 'body { background-color: rgba(0, 0, 0, 0); margin: 0px auto; overflow: hidden; }', shutdown: false, restart_when_active: false, reroute_audio: false } }],
      ['Praise Lyrics', { inputKind: 'text_gdiplus_v2', inputSettings: { text: 'Amazing Grace, how sweet the sound\nThat saved a wretch like me', color: 16777215, opacity: 100, gradient: false, outline: true, outline_color: 0, outline_size: 2, read_from_file: false } }],
      ['Scripture LowerThird', { inputKind: 'text_gdiplus_v2', inputSettings: { text: 'John 3:16 - For God so loved the world...', color: 16777215, opacity: 100, gradient: false, outline: true, outline_color: 0, outline_size: 2, read_from_file: false } }],
      ['Credits Scroll', { inputKind: 'text_gdiplus_v2', inputSettings: { text: 'Pastor: John Doe\nMusic: Worship Team\nAudio/Video: Blade Web Crew', color: 16777215, opacity: 100, gradient: false, outline: false, read_from_file: false } }],
      ['Pastor Camera', { inputKind: 'dshow_input', inputSettings: { video_device_id: 'Elgato Cam Link 4K', res_type: 1, resolution: '3840x2160', frame_interval: 166666, video_format: 0, flip_vertically: false, audio_output_mode: 0 } }],
      ['Interview Camera', { inputKind: 'dshow_input', inputSettings: { video_device_id: 'Logitech Brio 4K', res_type: 0, flip_vertically: false, audio_output_mode: 0 } }],
      ['Congregation Cam', { inputKind: 'dshow_input', inputSettings: { video_device_id: 'Integrated Webcam (04f2:b61e)', res_type: 1, resolution: '1920x1080', frame_interval: 166666, video_format: 1, flip_vertically: false, audio_output_mode: 0 } }],
      ['Host Mic', { inputKind: 'wasapi_input_capture', inputSettings: { device_id: 'Microphone (Realtek(R) Audio)', use_device_timing: true } }],
      ['Pulpit Mic', { inputKind: 'wasapi_input_capture', inputSettings: { device_id: 'Shure MV7 USB Microphone', use_device_timing: true } }],
      ['Offertory Music', { inputKind: 'wasapi_input_capture', inputSettings: { device_id: 'Line In (Audio Interface)', use_device_timing: true } }],
      ['Ambient Music', { inputKind: 'wasapi_input_capture', inputSettings: { device_id: 'Default Audio In', use_device_timing: true } }],
      ['Lower Third Background', { inputKind: 'color_source_v3', inputSettings: { color: 4278190080, width: 1920, height: 160 } }],
      ['Sermon PPT Display', { inputKind: 'monitor_capture', inputSettings: { monitor: 0, capture_cursor: true, method: 0 } }],
    ]);

    this.sourceFilters = new Map([
      [
        'Pastor Camera',
        [
          {
            filterName: 'Chroma Key (Green Screen)',
            filterKind: 'chroma_key_filter_v2',
            filterEnabled: true,
            filterIndex: 0,
            filterSettings: { similarity: 400, smoothness: 80 },
          },
          {
            filterName: 'Color Correction',
            filterKind: 'color_correction_filter_v2',
            filterEnabled: true,
            filterIndex: 1,
            filterSettings: { contrast: 1.1, saturation: 1.2 },
          },
        ],
      ],
      [
        'Interview Camera',
        [
          {
            filterName: 'Chroma Key',
            filterKind: 'chroma_key_filter_v2',
            filterEnabled: false,
            filterIndex: 0,
            filterSettings: { similarity: 350 },
          },
          {
            filterName: 'Sharpening',
            filterKind: 'sharpness_filter_v2',
            filterEnabled: true,
            filterIndex: 1,
            filterSettings: { sharpness: 0.15 },
          },
        ],
      ],
      [
        'Host Mic',
        [
          {
            filterName: 'Noise Suppression (RNNoise)',
            filterKind: 'noise_suppress_filter_v2',
            filterEnabled: true,
            filterIndex: 0,
            filterSettings: { method: 'rnnoise' },
          },
          {
            filterName: 'Compressor',
            filterKind: 'compressor_filter',
            filterEnabled: true,
            filterIndex: 1,
            filterSettings: { ratio: 4, threshold: -18 },
          },
          {
            filterName: 'Gain (+2.5 dB)',
            filterKind: 'gain_filter',
            filterEnabled: false,
            filterIndex: 2,
            filterSettings: { db: 2.5 },
          },
        ],
      ],
      [
        'Interview Mic',
        [
          {
            filterName: 'Noise Gate',
            filterKind: 'noise_gate_filter',
            filterEnabled: true,
            filterIndex: 0,
            filterSettings: {},
          },
          {
            filterName: 'Compressor',
            filterKind: 'compressor_filter',
            filterEnabled: true,
            filterIndex: 1,
            filterSettings: {},
          },
        ],
      ],
      [
        'Graphic Overlay',
        [
          {
            filterName: 'Crop / Pad (16:9)',
            filterKind: 'crop_filter',
            filterEnabled: true,
            filterIndex: 0,
            filterSettings: { top: 0, bottom: 20 },
          },
          {
            filterName: 'Color Grade',
            filterKind: 'color_correction_filter_v2',
            filterEnabled: false,
            filterIndex: 1,
            filterSettings: {},
          },
        ],
      ],
      [
        'Projector Back',
        [
          {
            filterName: 'Projector Color LUT',
            filterKind: 'color_correction_filter_v2',
            filterEnabled: true,
            filterIndex: 0,
            filterSettings: { contrast: 1.05 },
          },
          {
            filterName: 'Edge Soften',
            filterKind: 'sharpness_filter_v2',
            filterEnabled: false,
            filterIndex: 1,
            filterSettings: { sharpness: -0.1 },
          },
        ],
      ],
      [
        'Verse Bottom',
        [
          {
            filterName: 'Scene Color Tint',
            filterKind: 'color_correction_filter_v2',
            filterEnabled: true,
            filterIndex: 0,
            filterSettings: {},
          },
          {
            filterName: 'Lower Third Blur',
            filterKind: 'sharpness_filter_v2',
            filterEnabled: false,
            filterIndex: 1,
            filterSettings: { sharpness: -0.2 },
          },
        ],
      ],
      [
        'Testimony',
        [
          {
            filterName: 'Warm Contrast Grade',
            filterKind: 'color_correction_filter_v2',
            filterEnabled: true,
            filterIndex: 0,
            filterSettings: { contrast: 1.15 },
          },
        ],
      ],
    ]);

    this.sceneItemTransforms = new Map();
  }

  getOrCreateItemTransform(sceneName, sceneItemId) {
    const key = `${sceneName}:${sceneItemId}`;
    if (!this.sceneItemTransforms.has(key)) {
      this.sceneItemTransforms.set(key, {
        sourceWidth: 1920,
        sourceHeight: 1080,
        width: 1920,
        height: 1080,
        positionX: 0,
        positionY: 0,
        rotation: 0,
        scaleX: 1.0,
        scaleY: 1.0,
        alignment: 5, // Top-Left (OBS default)
        boundsType: 'OBS_BOUNDS_NONE',
        boundsAlignment: 0,
        boundsWidth: 0,
        boundsHeight: 0,
        cropLeft: 0,
        cropRight: 0,
        cropTop: 0,
        cropBottom: 0,
      });
    }
    return this.sceneItemTransforms.get(key);
  }

  attachToServer(server, path = '/obs-ws') {
    this.wss = new WebSocketServer({ noServer: true });

    this.wss.on('connection', (ws) => {
      // OpCode 0: Hello
      ws.send(
        JSON.stringify({
          op: 0,
          d: {
            obsWebSocketVersion: '5.5.0',
            rpcVersion: 1,
            // no auth required for local simulator
          },
        })
      );

      ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw);
          this.handleClientMessage(ws, msg);
        } catch (err) {
          console.error('[OBS Sim] Failed to parse message:', err);
        }
      });
    });

    if (server) {
      server.on('upgrade', (request, socket, head) => {
        try {
          const { pathname } = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
          if (pathname === path) {
            this.wss.handleUpgrade(request, socket, head, (ws) => {
              this.wss.emit('connection', ws, request);
            });
          }
        } catch (_) {}
      });
    }

    console.log(`[OBS Sim] WebSocket Simulator listening on ${path}`);
  }

  broadcastEvent(eventType, eventData) {
    if (!this.wss) return;
    const payload = JSON.stringify({
      op: 5,
      d: {
        eventType,
        eventData,
      },
    });

    this.wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(payload);
      }
    });
  }

  handleClientMessage(ws, msg) {
    const { op, d } = msg;

    // OpCode 1: Identify
    if (op === 1) {
      ws.send(
        JSON.stringify({
          op: 2,
          d: {
            negotiatedRpcVersion: 1,
          },
        })
      );
      return;
    }

    // OpCode 6: Request
    if (op === 6) {
      const { requestType, requestId, requestData = {} } = d;
      const response = this.handleRequest(requestType, requestData);

      ws.send(
        JSON.stringify({
          op: 7,
          d: {
            requestType,
            requestId,
            requestStatus: {
              result: !response.error,
              code: response.error ? 600 : 100,
              comment: response.error || null,
            },
            responseData: response.data || {},
          },
        })
      );
    }
  }

  handleRequest(type, data) {
    switch (type) {
      case 'GetVersion':
        return {
          data: {
            obsVersion: '30.2.2',
            obsWebSocketVersion: '5.5.0',
            rpcVersion: 1,
          },
        };

      case 'GetStudioModeEnabled':
        return { data: { studioModeEnabled: this.studioModeEnabled } };

      case 'SetStudioModeEnabled':
        this.studioModeEnabled = !!data.studioModeEnabled;
        this.broadcastEvent('StudioModeStateChanged', { studioModeEnabled: this.studioModeEnabled });
        return { data: {} };

      case 'GetSceneList':
        return {
          data: {
            currentProgramSceneName: this.currentProgramScene,
            currentPreviewSceneName: this.currentPreviewScene,
            scenes: this.scenes.map((s) => ({ sceneName: s.sceneName, sceneIndex: s.sceneIndex })),
          },
        };

      case 'SetCurrentProgramScene':
        this.currentProgramScene = data.sceneName;
        this.broadcastEvent('CurrentProgramSceneChanged', { sceneName: this.currentProgramScene });
        return { data: {} };

      case 'SetCurrentPreviewScene':
        this.currentPreviewScene = data.sceneName;
        this.broadcastEvent('CurrentPreviewSceneChanged', { sceneName: this.currentPreviewScene });
        return { data: {} };

      case 'TriggerStudioModeTransition':
        const temp = this.currentProgramScene;
        this.currentProgramScene = this.currentPreviewScene;
        this.broadcastEvent('CurrentProgramSceneChanged', { sceneName: this.currentProgramScene });
        return { data: {} };

      case 'GetSceneTransitionList':
        return {
          data: {
            currentSceneTransitionName: 'Fade',
            currentSceneTransitionKind: 'fade_transition',
            transitions: [
              { transitionName: 'Cut', transitionKind: 'cut_transition', transitionFixed: true, transitionConfigurable: false },
              { transitionName: 'Fade', transitionKind: 'fade_transition', transitionFixed: false, transitionConfigurable: true },
              { transitionName: 'Move', transitionKind: 'move_transition', transitionFixed: false, transitionConfigurable: true },
            ],
          },
        };

      case 'GetTransitionKindList':
        return {
          data: {
            transitionKinds: [
              'cut_transition',
              'fade_transition',
              'swipe_transition',
              'slide_transition',
              'move_transition',
            ],
          },
        };

      case 'GetSceneItemList': {
        const scene = this.scenes.find((s) => s.sceneName === data.sceneName);
        return {
          data: {
            sceneItems: scene ? scene.items : [],
          },
        };
      }

      case 'SetSceneItemEnabled': {
        const scene = this.scenes.find((s) => s.sceneName === data.sceneName);
        if (scene) {
          const item = scene.items.find((i) => i.sceneItemId === data.sceneItemId);
          if (item) {
            item.sceneItemEnabled = !!data.sceneItemEnabled;
            this.broadcastEvent('SceneItemEnableStateChanged', {
              sceneName: data.sceneName,
              sceneItemId: data.sceneItemId,
              sceneItemEnabled: item.sceneItemEnabled,
            });
          }
        }
        return { data: {} };
      }

      case 'GetSceneItemTransform': {
        const transform = this.getOrCreateItemTransform(data.sceneName, data.sceneItemId);
        return { data: { sceneItemTransform: { ...transform } } };
      }

      case 'SetSceneItemTransform': {
        const transform = this.getOrCreateItemTransform(data.sceneName, data.sceneItemId);
        if (data.sceneItemTransform) {
          Object.assign(transform, data.sceneItemTransform);
          if (typeof transform.scaleX === 'number' && typeof transform.sourceWidth === 'number') {
            transform.width = Math.round(transform.sourceWidth * transform.scaleX);
          }
          if (typeof transform.scaleY === 'number' && typeof transform.sourceHeight === 'number') {
            transform.height = Math.round(transform.sourceHeight * transform.scaleY);
          }
        }
        this.broadcastEvent('SceneItemTransformChanged', {
          sceneName: data.sceneName,
          sceneItemId: data.sceneItemId,
          sceneItemTransform: { ...transform },
        });
        return { data: {} };
      }

      case 'GetVideoSettings': {
        return {
          data: {
            baseWidth: 1920,
            baseHeight: 1080,
            outputWidth: 1920,
            outputHeight: 1080,
            fpsNumerator: 60,
            fpsDenominator: 1,
          },
        };
      }

      case 'GetInputSettings': {
        const entry = this.sourceSettings.get(data.inputName) || {
          inputKind: this.findInputKind(data.inputName),
          inputSettings: {},
        };
        return { data: entry };
      }

      case 'GetInputDefaultSettings': {
        const defaults = this.getDefaultSettingsForKind(data.inputKind);
        return { data: { defaultInputSettings: defaults } };
      }

      case 'GetInputPropertiesListPropertyItems': {
        const items = this.getPropertyListItems(data.inputName, data.propertyName);
        return { data: { propertyItems: items } };
      }

      case 'PressInputPropertiesButton': {
        console.log(`[Simulator] Button pressed: "${data.propertyName}" on "${data.inputName}"`);
        return { data: {} };
      }

      case 'SetInputSettings': {
        const existing = this.sourceSettings.get(data.inputName) || {
          inputKind: this.findInputKind(data.inputName),
          inputSettings: {},
        };
        existing.inputSettings = { ...existing.inputSettings, ...data.inputSettings };
        this.sourceSettings.set(data.inputName, existing);
        this.broadcastEvent('InputSettingsChanged', {
          inputName: data.inputName,
          inputSettings: existing.inputSettings,
        });
        return { data: {} };
      }

      case 'GetSourceScreenshot': {
        const kind = this.findInputKind(data.sourceName);
        // Real OBS behavior: Audio-only sources reject GetSourceScreenshot
        if (kind && (kind.includes('audio') || kind.includes('mic') || kind.includes('wasapi'))) {
          return { error: 'Source is an audio device and cannot render visual frames.' };
        }

        // Generate synthetic, realistic high-res / thumbnail image data for visual sources
        const thumbnailSvg = this.generateThumbnailSvg(data.sourceName, kind);
        const base64Data = 'data:image/svg+xml;base64,' + Buffer.from(thumbnailSvg).toString('base64');
        return {
          data: {
            imageData: base64Data,
            imageFormat: 'png',
          },
        };
      }

      case 'GetStreamStatus':
        return { data: { outputActive: this.isStreaming, outputReconnecting: false } };

      case 'ToggleStream':
        this.isStreaming = !this.isStreaming;
        this.broadcastEvent('StreamStateChanged', { outputActive: this.isStreaming });
        return { data: { outputActive: this.isStreaming } };

      case 'GetRecordStatus':
        return { data: { outputActive: this.isRecording, outputPaused: false } };

      case 'ToggleRecord':
        this.isRecording = !this.isRecording;
        this.broadcastEvent('RecordStateChanged', { outputActive: this.isRecording });
        return { data: { outputActive: this.isRecording } };

      case 'CreateScene': {
        const sceneName = (data.sceneName || '').trim();
        if (!sceneName) return { error: 'Scene name is required' };
        if (this.scenes.some((s) => s.sceneName === sceneName)) {
          return { error: 'Scene already exists' };
        }
        const newScene = {
          sceneName,
          sceneIndex: this.scenes.length,
          items: [],
        };
        this.scenes.push(newScene);
        this.broadcastEvent('SceneCreated', { sceneName, isGroup: false });
        this.broadcastEvent('SceneListChanged', {
          scenes: this.scenes.map((s, idx) => ({ sceneName: s.sceneName, sceneIndex: idx })),
        });
        return { data: {} };
      }

      case 'SetSceneName': {
        const scene = this.scenes.find((s) => s.sceneName === data.sceneName);
        if (!scene) return { error: 'Scene not found' };
        const oldName = data.sceneName;
        const newName = (data.newSceneName || '').trim();
        if (!newName) return { error: 'New scene name cannot be empty' };
        if (oldName !== newName && this.scenes.some((s) => s.sceneName === newName)) {
          return { error: 'Scene with this name already exists' };
        }

        scene.sceneName = newName;
        if (this.currentProgramScene === oldName) this.currentProgramScene = newName;
        if (this.currentPreviewScene === oldName) this.currentPreviewScene = newName;

        if (this.sourceFilters.has(oldName)) {
          this.sourceFilters.set(newName, this.sourceFilters.get(oldName));
          this.sourceFilters.delete(oldName);
        }

        this.broadcastEvent('SceneNameChanged', { sceneName: newName, oldSceneName: oldName });
        this.broadcastEvent('SceneListChanged', {
          scenes: this.scenes.map((s, idx) => ({ sceneName: s.sceneName, sceneIndex: idx })),
        });
        return { data: {} };
      }

      case 'RemoveScene': {
        const idx = this.scenes.findIndex((s) => s.sceneName === data.sceneName);
        if (idx === -1) return { error: 'Scene not found' };
        if (this.scenes.length <= 1) return { error: 'Cannot remove the last remaining scene' };

        const [removed] = this.scenes.splice(idx, 1);
        this.scenes.forEach((s, i) => {
          s.sceneIndex = i;
        });

        if (this.currentProgramScene === removed.sceneName) {
          this.currentProgramScene = this.scenes[0].sceneName;
          this.broadcastEvent('CurrentProgramSceneChanged', { sceneName: this.currentProgramScene });
        }
        if (this.currentPreviewScene === removed.sceneName) {
          this.currentPreviewScene = this.scenes[0].sceneName;
          this.broadcastEvent('CurrentPreviewSceneChanged', { sceneName: this.currentPreviewScene });
        }

        this.sourceFilters.delete(removed.sceneName);

        this.broadcastEvent('SceneRemoved', { sceneName: removed.sceneName, isGroup: false });
        this.broadcastEvent('SceneListChanged', {
          scenes: this.scenes.map((s, i) => ({ sceneName: s.sceneName, sceneIndex: i })),
        });
        return { data: {} };
      }

      case 'SetInputName': {
        const oldName = data.inputName;
        const newName = (data.newInputName || '').trim();
        if (!newName) return { error: 'New source name cannot be empty' };

        for (const sc of this.scenes) {
          for (const item of sc.items) {
            if (item.sourceName === oldName) {
              item.sourceName = newName;
            }
          }
        }
        if (this.sourceSettings.has(oldName)) {
          this.sourceSettings.set(newName, this.sourceSettings.get(oldName));
          this.sourceSettings.delete(oldName);
        }
        if (this.sourceFilters.has(oldName)) {
          this.sourceFilters.set(newName, this.sourceFilters.get(oldName));
          this.sourceFilters.delete(oldName);
        }
        this.broadcastEvent('InputNameChanged', { inputName: newName, oldInputName: oldName });
        return { data: {} };
      }

      case 'CreateInput': {
        const scene = this.scenes.find((s) => s.sceneName === data.sceneName);
        if (!scene) return { error: 'Scene not found' };
        const inputName = (data.inputName || '').trim();
        if (!inputName) return { error: 'Source name is required' };
        const newItem = {
          sceneItemId: Date.now() % 100000,
          sourceName: inputName,
          inputKind: data.inputKind || 'image_source',
          sceneItemEnabled: true,
        };
        scene.items.push(newItem);
        if (data.inputSettings) {
          this.sourceSettings.set(inputName, {
            inputKind: newItem.inputKind,
            inputSettings: data.inputSettings,
          });
        }
        this.broadcastEvent('SceneItemCreated', {
          sceneName: data.sceneName,
          sourceName: inputName,
          sceneItemId: newItem.sceneItemId,
          sceneItemIndex: scene.items.length - 1,
        });
        return { data: { sceneItemId: newItem.sceneItemId } };
      }

      case 'RemoveSceneItem': {
        const scene = this.scenes.find((s) => s.sceneName === data.sceneName);
        if (scene) {
          const itemIdx = scene.items.findIndex((i) => i.sceneItemId === data.sceneItemId);
          if (itemIdx !== -1) {
            const [removed] = scene.items.splice(itemIdx, 1);
            this.broadcastEvent('SceneItemRemoved', {
              sceneName: data.sceneName,
              sourceName: removed.sourceName,
              sceneItemId: data.sceneItemId,
            });
          }
        }
        return { data: {} };
      }

      case 'GetSourceFilterList': {
        const filters = this.sourceFilters.get(data.sourceName) || [];
        return { data: { filters } };
      }

      case 'GetSourceFilter': {
        const list = this.sourceFilters.get(data.sourceName) || [];
        const filter = list.find((f) => f.filterName === data.filterName);
        if (!filter) return { error: 'Filter not found' };
        return { data: filter };
      }

      case 'SetSourceFilterEnabled': {
        const list = this.sourceFilters.get(data.sourceName) || [];
        const filter = list.find((f) => f.filterName === data.filterName);
        if (filter) {
          filter.filterEnabled = !!data.filterEnabled;
          this.broadcastEvent('SourceFilterEnableStateChanged', {
            sourceName: data.sourceName,
            filterName: data.filterName,
            filterEnabled: filter.filterEnabled,
          });
        }
        return { data: {} };
      }

      case 'SetSourceFilterName': {
        const list = this.sourceFilters.get(data.sourceName) || [];
        const filter = list.find((f) => f.filterName === data.filterName);
        if (!filter) return { error: 'Filter not found' };
        const newName = (data.newFilterName || '').trim();
        if (!newName) return { error: 'New filter name cannot be empty' };
        if (list.some((f) => f.filterName === newName && f !== filter)) {
          return { error: 'A filter with this name already exists' };
        }
        const oldName = filter.filterName;
        filter.filterName = newName;
        this.broadcastEvent('SourceFilterNameChanged', {
          sourceName: data.sourceName,
          filterName: newName,
          oldFilterName: oldName,
        });
        return { data: {} };
      }

      case 'SetSourceFilterSettings': {
        const list = this.sourceFilters.get(data.sourceName) || [];
        const filter = list.find((f) => f.filterName === data.filterName);
        if (filter) {
          filter.filterSettings = { ...(filter.filterSettings || {}), ...(data.filterSettings || {}) };
          this.broadcastEvent('SourceFilterSettingsChanged', {
            sourceName: data.sourceName,
            filterName: data.filterName,
            filterSettings: filter.filterSettings,
          });
        }
        return { data: {} };
      }

      case 'CreateSourceFilter': {
        let list = this.sourceFilters.get(data.sourceName);
        if (!list) {
          list = [];
          this.sourceFilters.set(data.sourceName, list);
        }
        const filterName = (data.filterName || '').trim();
        if (!filterName) return { error: 'Filter name is required' };
        if (list.some((f) => f.filterName === filterName)) {
          return { error: 'Filter name already exists on this source' };
        }
        const newFilter = {
          filterName,
          filterKind: data.filterKind || 'color_correction_filter_v2',
          filterIndex: list.length,
          filterEnabled: true,
          filterSettings: data.filterSettings || {},
        };
        list.push(newFilter);
        this.broadcastEvent('SourceFilterCreated', {
          sourceName: data.sourceName,
          filterName: newFilter.filterName,
          filterKind: newFilter.filterKind,
          filterIndex: newFilter.filterIndex,
          filterSettings: newFilter.filterSettings,
        });
        return { data: {} };
      }

      case 'RemoveSourceFilter': {
        const list = this.sourceFilters.get(data.sourceName) || [];
        const idx = list.findIndex((f) => f.filterName === data.filterName);
        if (idx !== -1) {
          const [removed] = list.splice(idx, 1);
          list.forEach((f, i) => {
            f.filterIndex = i;
          });
          this.broadcastEvent('SourceFilterRemoved', {
            sourceName: data.sourceName,
            filterName: removed.filterName,
          });
        }
        return { data: {} };
      }

      default:
        return { data: {} };
    }
  }

  findInputKind(name) {
    for (const sc of this.scenes) {
      const match = sc.items.find((i) => i.sourceName === name);
      if (match) return match.inputKind;
    }
    return 'image_source';
  }

  generateThumbnailSvg(name, kind) {
    const isVideo = kind === 'ffmpeg_source' || kind === 'vlc_source';
    const isCamera = kind === 'dshow_input' || kind === 'v4l2_input';
    const isText = kind?.includes('text');
    const isBrowser = kind === 'browser_source';
    const isMonitor = kind?.includes('monitor') || kind?.includes('window');

    let badge = 'IMAGE';
    let gradA = '#1e3a8a';
    let gradB = '#0f172a';
    let accent = '#38bdf8';

    if (isVideo) {
      badge = 'VIDEO';
      gradA = '#831843';
      gradB = '#1e1b4b';
      accent = '#f43f5e';
    } else if (isCamera) {
      badge = 'CAM';
      gradA = '#064e3b';
      gradB = '#022c22';
      accent = '#10b981';
    } else if (isText) {
      badge = 'TEXT';
      gradA = '#312e81';
      gradB = '#1e1b4b';
      accent = '#818cf8';
    } else if (isBrowser) {
      badge = 'WEB';
      gradA = '#0f766e';
      gradB = '#134e4a';
      accent = '#14b8a6';
    } else if (isMonitor) {
      badge = 'SCREEN';
      gradA = '#374151';
      gradB = '#111827';
      accent = '#9ca3af';
    }

    // Escape name for XML
    const safeName = (name || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    return `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="90" viewBox="0 0 160 90">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${gradA}" />
          <stop offset="100%" stop-color="${gradB}" />
        </linearGradient>
      </defs>
      <rect width="160" height="90" fill="url(#bg)" rx="6"/>
      <rect x="4" y="4" width="152" height="82" fill="none" stroke="${accent}" stroke-width="1.5" stroke-opacity="0.3" rx="4"/>
      <rect x="8" y="8" width="46" height="16" rx="3" fill="#000000" fill-opacity="0.6"/>
      <text x="31" y="19" fill="${accent}" font-family="-apple-system, sans-serif" font-size="9" font-weight="bold" text-anchor="middle">${badge}</text>
      <text x="80" y="52" fill="#ffffff" font-family="-apple-system, sans-serif" font-size="11" font-weight="600" text-anchor="middle" letter-spacing="-0.2">${safeName}</text>
      <circle cx="146" cy="14" r="3.5" fill="${accent}"/>
    </svg>`;
  }

  getDefaultSettingsForKind(kind) {
    switch (kind) {
      case 'image_source':
        return { file: '', unload: false };
      case 'ffmpeg_source':
        return {
          local_file: '',
          is_local_file: true,
          looping: false,
          restart_on_activate: true,
          buffering_mb: 2,
          speed_percent: 100,
          color_range: 0,
          linear_alpha: false,
        };
      case 'browser_source':
        return {
          url: 'https://obsblade.app',
          is_local_file: false,
          width: 1920,
          height: 1080,
          fps: 60,
          custom_css: 'body { background-color: rgba(0, 0, 0, 0); margin: 0px auto; overflow: hidden; }',
          shutdown: false,
          restart_when_active: false,
          reroute_audio: false,
        };
      case 'text_gdiplus_v2':
      case 'text_gdiplus':
      case 'text_ft2_source_v2':
        return {
          text: '',
          read_from_file: false,
          file: '',
          color: 16777215,
          opacity: 100,
          gradient: false,
          outline: false,
          outline_size: 2,
          outline_color: 0,
        };
      case 'color_source_v3':
      case 'color_source':
        return { color: 4278190080, width: 1920, height: 1080 };
      case 'dshow_input':
        return {
          video_device_id: 'Elgato Cam Link 4K',
          res_type: 0,
          resolution: '1920x1080',
          frame_interval: 166666,
          video_format: 0,
          flip_vertically: false,
          audio_output_mode: 0,
        };
      case 'wasapi_input_capture':
      case 'wasapi_output_capture':
        return { device_id: 'default', use_device_timing: true };
      case 'monitor_capture':
        return { monitor: 0, capture_cursor: true, method: 0 };
      default:
        return {};
    }
  }

  getPropertyListItems(inputName, propertyName) {
    if (propertyName === 'video_device_id') {
      return [
        { itemName: 'Elgato Cam Link 4K', itemValue: 'Elgato Cam Link 4K', itemEnabled: true },
        { itemName: 'Logitech Brio 4K Webcam', itemValue: 'Logitech Brio 4K', itemEnabled: true },
        { itemName: 'Integrated Webcam (04f2:b61e)', itemValue: 'Integrated Webcam (04f2:b61e)', itemEnabled: true },
      ];
    }
    if (propertyName === 'resolution') {
      return [
        { itemName: '3840x2160 (4K UHD)', itemValue: '3840x2160', itemEnabled: true },
        { itemName: '1920x1080 (1080p FHD)', itemValue: '1920x1080', itemEnabled: true },
        { itemName: '1280x720 (720p HD)', itemValue: '1280x720', itemEnabled: true },
      ];
    }
    if (propertyName === 'device_id') {
      return [
        { itemName: 'Default Audio In', itemValue: 'default', itemEnabled: true },
        { itemName: 'Shure MV7 USB Microphone', itemValue: 'Shure MV7 USB Microphone', itemEnabled: true },
        { itemName: 'Microphone (Realtek(R) Audio)', itemValue: 'Microphone (Realtek(R) Audio)', itemEnabled: true },
        { itemName: 'Line In (Audio Interface)', itemValue: 'Line In (Audio Interface)', itemEnabled: true },
      ];
    }
    if (propertyName === 'monitor') {
      return [
        { itemName: 'Primary Display (1920x1080 @ 0,0)', itemValue: 0, itemEnabled: true },
        { itemName: 'Secondary Display (2560x1440 @ 1920,0)', itemValue: 1, itemEnabled: true },
      ];
    }
    if (propertyName === 'audio_output_mode') {
      return [
        { itemName: 'Capture audio only', itemValue: 0, itemEnabled: true },
        { itemName: 'Output desktop audio (WaveOut)', itemValue: 1, itemEnabled: true },
        { itemName: 'Output desktop audio (DirectSound)', itemValue: 2, itemEnabled: true },
      ];
    }
    return [];
  }
}
