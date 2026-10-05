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
      ['Sermon Slide', { inputKind: 'image_source', inputSettings: { file: 'C:/OBS/Assets/sermon_slide_01.png' } }],
      ['Countdown Video', { inputKind: 'ffmpeg_source', inputSettings: { local_file: 'C:/OBS/Assets/countdown_5min.mp4' } }],
      ['Testimony Video', { inputKind: 'ffmpeg_source', inputSettings: { local_file: 'C:/OBS/Videos/testimony_maria.mp4' } }],
      ['Graphic Overlay', { inputKind: 'image_source', inputSettings: { file: 'C:/OBS/Assets/overlay_frame.png' } }],
      ['QR Code Banner', { inputKind: 'image_source', inputSettings: { file: 'C:/OBS/Assets/tithe_qr.png' } }],
      ['Welcome Graphic', { inputKind: 'image_source', inputSettings: { file: 'C:/OBS/Assets/welcome_banner.jpg' } }],
      ['Church Logo', { inputKind: 'image_source', inputSettings: { file: 'C:/OBS/Assets/church_logo_white.png' } }],
    ]);
  }

  attachToServer(server, path = '/obs-ws') {
    this.wss = new WebSocketServer({ server, path });

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

      case 'GetInputSettings': {
        const entry = this.sourceSettings.get(data.inputName) || {
          inputKind: this.findInputKind(data.inputName),
          inputSettings: {},
        };
        return { data: entry };
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
}
