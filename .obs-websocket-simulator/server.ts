/**
 * Standalone OBS WebSocket v5 Simulator
 * Strictly adheres to OBS WebSocket v5 RPC Protocol (OBS Studio 28+)
 * Preloaded with user's exact scenes and sources from screenshots
 */

import type { IncomingMessage } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

export interface SceneItem {
  sceneItemId: number;
  sourceName: string;
  sceneItemEnabled: boolean;
  sceneItemLocked: boolean;
  inputKind: string;
  sourceType: string;
  settings?: Record<string, any>;
}

export interface Scene {
  sceneName: string;
  sceneIndex: number;
  items: SceneItem[];
}

export class ObsWebSocketSimulator {
  private wss: WebSocketServer | null = null;
  public port: number;

  public studioMode = false;
  public currentProgramSceneName = 'Verse Full - Camera 200';
  public currentPreviewSceneName = 'Verse Bottom';

  public scenes: Scene[] = [
    {
      sceneName: 'None',
      sceneIndex: 0,
      items: [
        { sceneItemId: 1, sourceName: 'Black Background', sceneItemEnabled: true, sceneItemLocked: true, inputKind: 'color_source', sourceType: 'OBS_SOURCE_TYPE_INPUT' },
      ],
    },
    {
      sceneName: 'Verse Bottom',
      sceneIndex: 1,
      items: [
        { sceneItemId: 10, sourceName: 'VerseView Full', sceneItemEnabled: true, sceneItemLocked: false, inputKind: 'image_source', sourceType: 'OBS_SOURCE_TYPE_INPUT', settings: { file: 'C:\\Streams\\Assets\\VerseView.png' } },
        { sceneItemId: 11, sourceName: '_One Cam Border', sceneItemEnabled: true, sceneItemLocked: false, inputKind: 'image_source', sourceType: 'OBS_SOURCE_TYPE_INPUT', settings: { file: 'C:\\Streams\\Assets\\CamBorder.png' } },
        { sceneItemId: 12, sourceName: 'Back Verse', sceneItemEnabled: true, sceneItemLocked: false, inputKind: 'image_source', sourceType: 'OBS_SOURCE_TYPE_INPUT', settings: { file: 'C:\\Streams\\Assets\\BackVerse.png' } },
      ],
    },
    {
      sceneName: 'Verse Full - Camera 200',
      sceneIndex: 2,
      items: [
        { sceneItemId: 20, sourceName: 'VerseView Full', sceneItemEnabled: true, sceneItemLocked: false, inputKind: 'image_source', sourceType: 'OBS_SOURCE_TYPE_INPUT', settings: { file: 'C:\\Streams\\Assets\\VerseView.png' } },
        { sceneItemId: 21, sourceName: '_One Cam Border', sceneItemEnabled: true, sceneItemLocked: false, inputKind: 'image_source', sourceType: 'OBS_SOURCE_TYPE_INPUT', settings: { file: 'C:\\Streams\\Assets\\CamBorder.png' } },
        { sceneItemId: 22, sourceName: 'Back Verse', sceneItemEnabled: true, sceneItemLocked: false, inputKind: 'image_source', sourceType: 'OBS_SOURCE_TYPE_INPUT', settings: { file: 'C:\\Streams\\Assets\\BackVerse.png' } },
      ],
    },
    {
      sceneName: 'Verse Full',
      sceneIndex: 3,
      items: [
        { sceneItemId: 30, sourceName: 'VerseView Full', sceneItemEnabled: true, sceneItemLocked: false, inputKind: 'image_source', sourceType: 'OBS_SOURCE_TYPE_INPUT', settings: { file: 'C:\\Streams\\Assets\\VerseView.png' } },
        { sceneItemId: 31, sourceName: 'Back Verse', sceneItemEnabled: false, sceneItemLocked: false, inputKind: 'image_source', sourceType: 'OBS_SOURCE_TYPE_INPUT', settings: { file: 'C:\\Streams\\Assets\\BackVerse.png' } },
      ],
    },
    {
      sceneName: 'Testimony',
      sceneIndex: 4,
      items: [
        { sceneItemId: 40, sourceName: 'Testimony Cam', sceneItemEnabled: true, sceneItemLocked: true, inputKind: 'dshow_input', sourceType: 'OBS_SOURCE_TYPE_INPUT' },
        { sceneItemId: 41, sourceName: 'Lower Third Name', sceneItemEnabled: true, sceneItemLocked: false, inputKind: 'text_gdiplus_v2', sourceType: 'OBS_SOURCE_TYPE_INPUT' },
      ],
    },
    {
      sceneName: 'Testimony 2',
      sceneIndex: 5,
      items: [
        { sceneItemId: 50, sourceName: 'Testimony Cam 2', sceneItemEnabled: true, sceneItemLocked: true, inputKind: 'dshow_input', sourceType: 'OBS_SOURCE_TYPE_INPUT' },
      ],
    },
    {
      sceneName: 'Projector Back',
      sceneIndex: 6,
      items: [
        { sceneItemId: 60, sourceName: 'Image - Black', sceneItemEnabled: false, sceneItemLocked: false, inputKind: 'image_source', sourceType: 'OBS_SOURCE_TYPE_INPUT', settings: { file: 'C:\\Streams\\Assets\\Black.png' } },
        { sceneItemId: 61, sourceName: 'Image - Starting Prayer', sceneItemEnabled: false, sceneItemLocked: false, inputKind: 'image_source', sourceType: 'OBS_SOURCE_TYPE_INPUT', settings: { file: 'C:\\Streams\\Assets\\StartingPrayer.png' } },
        { sceneItemId: 62, sourceName: 'Image - Song', sceneItemEnabled: false, sceneItemLocked: false, inputKind: 'image_source', sourceType: 'OBS_SOURCE_TYPE_INPUT', settings: { file: 'C:\\Streams\\Assets\\Song.png' } },
        { sceneItemId: 63, sourceName: 'Image - Worship', sceneItemEnabled: false, sceneItemLocked: false, inputKind: 'image_source', sourceType: 'OBS_SOURCE_TYPE_INPUT', settings: { file: 'C:\\Streams\\Assets\\Worship.png' } },
      ],
    },
    {
      sceneName: 'Back Verse',
      sceneIndex: 7,
      items: [
        { sceneItemId: 70, sourceName: 'VLC Verse Background 02', sceneItemEnabled: false, sceneItemLocked: false, inputKind: 'vlc_source', sourceType: 'OBS_SOURCE_TYPE_INPUT', settings: { local_file: 'C:\\Streams\\Videos\\Loop02.mp4' } },
        { sceneItemId: 71, sourceName: 'Verse Background 01', sceneItemEnabled: false, sceneItemLocked: false, inputKind: 'image_source', sourceType: 'OBS_SOURCE_TYPE_INPUT', settings: { file: 'C:\\Streams\\Assets\\BG01.png' } },
        { sceneItemId: 72, sourceName: 'Verse Background 02', sceneItemEnabled: true, sceneItemLocked: false, inputKind: 'image_source', sourceType: 'OBS_SOURCE_TYPE_INPUT', settings: { file: 'C:\\Streams\\Assets\\BG02.png' } },
        { sceneItemId: 73, sourceName: 'Verse Background 03', sceneItemEnabled: false, sceneItemLocked: false, inputKind: 'image_source', sourceType: 'OBS_SOURCE_TYPE_INPUT', settings: { file: 'C:\\Streams\\Assets\\BG03.png' } },
        { sceneItemId: 74, sourceName: 'Verse Background 04', sceneItemEnabled: false, sceneItemLocked: false, inputKind: 'image_source', sourceType: 'OBS_SOURCE_TYPE_INPUT', settings: { file: 'C:\\Streams\\Assets\\BG04.png' } },
        { sceneItemId: 75, sourceName: 'Verse Background 05', sceneItemEnabled: false, sceneItemLocked: false, inputKind: 'image_source', sourceType: 'OBS_SOURCE_TYPE_INPUT', settings: { file: 'C:\\Streams\\Assets\\BG05.png' } },
        { sceneItemId: 76, sourceName: 'Verse Background 06', sceneItemEnabled: false, sceneItemLocked: false, inputKind: 'image_source', sourceType: 'OBS_SOURCE_TYPE_INPUT', settings: { file: 'C:\\Streams\\Assets\\BG06.png' } },
        { sceneItemId: 77, sourceName: 'Verse Background 07', sceneItemEnabled: false, sceneItemLocked: false, inputKind: 'image_source', sourceType: 'OBS_SOURCE_TYPE_INPUT', settings: { file: 'C:\\Streams\\Assets\\BG07.png' } },
      ],
    },
    {
      sceneName: 'Video',
      sceneIndex: 8,
      items: [
        { sceneItemId: 80, sourceName: 'Video Player', sceneItemEnabled: true, sceneItemLocked: false, inputKind: 'ffmpeg_source', sourceType: 'OBS_SOURCE_TYPE_INPUT', settings: { local_file: 'C:\\Streams\\Videos\\Main.mp4' } },
      ],
    },
    {
      sceneName: 'Calendar',
      sceneIndex: 9,
      items: [
        { sceneItemId: 90, sourceName: 'Weekly Calendar Slide', sceneItemEnabled: true, sceneItemLocked: false, inputKind: 'image_source', sourceType: 'OBS_SOURCE_TYPE_INPUT', settings: { file: 'C:\\Streams\\Assets\\Calendar.png' } },
      ],
    },
    {
      sceneName: 'Projector',
      sceneIndex: 10,
      items: [
        { sceneItemId: 100, sourceName: 'Projector Output Window', sceneItemEnabled: true, sceneItemLocked: true, inputKind: 'window_capture', sourceType: 'OBS_SOURCE_TYPE_INPUT' },
      ],
    },
    {
      sceneName: 'Filters',
      sceneIndex: 11,
      items: [
        { sceneItemId: 110, sourceName: 'Color Grade Filter', sceneItemEnabled: true, sceneItemLocked: false, inputKind: 'color_filter', sourceType: 'OBS_SOURCE_TYPE_INPUT' },
      ],
    },
    {
      sceneName: 'One Cam',
      sceneIndex: 12,
      items: [
        { sceneItemId: 120, sourceName: 'Main Cam 1080p', sceneItemEnabled: true, sceneItemLocked: true, inputKind: 'dshow_input', sourceType: 'OBS_SOURCE_TYPE_INPUT' },
      ],
    },
    {
      sceneName: 'Two Cam',
      sceneIndex: 13,
      items: [
        { sceneItemId: 130, sourceName: 'Cam 1 Wide', sceneItemEnabled: true, sceneItemLocked: true, inputKind: 'dshow_input', sourceType: 'OBS_SOURCE_TYPE_INPUT' },
        { sceneItemId: 131, sourceName: 'Cam 2 Close', sceneItemEnabled: true, sceneItemLocked: true, inputKind: 'dshow_input', sourceType: 'OBS_SOURCE_TYPE_INPUT' },
      ],
    },
    {
      sceneName: 'Outside TV',
      sceneIndex: 14,
      items: [
        { sceneItemId: 140, sourceName: 'Outside Lobby Feed', sceneItemEnabled: true, sceneItemLocked: true, inputKind: 'display_capture', sourceType: 'OBS_SOURCE_TYPE_INPUT' },
      ],
    },
    {
      sceneName: 'Projector TV',
      sceneIndex: 15,
      items: [
        { sceneItemId: 150, sourceName: 'Hall TV Feed', sceneItemEnabled: true, sceneItemLocked: true, inputKind: 'display_capture', sourceType: 'OBS_SOURCE_TYPE_INPUT' },
      ],
    },
  ];

  constructor(port = 4455) {
    this.port = port;
  }

  private generateMockFrame(sceneName: string): string {
    const isProgram = sceneName === this.currentProgramSceneName;
    const now = new Date().toLocaleTimeString();

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#141824"/>
            <stop offset="100%" stop-color="#242c3d"/>
          </linearGradient>
        </defs>
        <rect width="640" height="360" fill="url(#bg)"/>
        
        <text x="32" y="48" fill="#e2e8f0" font-family="system-ui, sans-serif" font-size="14" font-weight="600">
          GStreamer 1.22.10: State changed to PLAYING
        </text>

        <!-- Viewfinder center crosshair -->
        <circle cx="320" cy="180" r="64" fill="none" stroke="#2196f3" stroke-width="2" opacity="0.3"/>
        <line x1="290" y1="180" x2="350" y2="180" stroke="#2196f3" stroke-width="2" opacity="0.4"/>
        <line x1="320" y1="150" x2="320" y2="210" stroke="#2196f3" stroke-width="2" opacity="0.4"/>

        <!-- Scene Title -->
        <text x="320" y="175" fill="#ffffff" font-family="system-ui, sans-serif" font-size="26" font-weight="700" text-anchor="middle">
          ${sceneName}
        </text>
        <text x="320" y="205" fill="#94a3b8" font-family="monospace" font-size="13" text-anchor="middle">
          Live Scene Feed • ${now}
        </text>

        <rect x="520" y="24" width="90" height="26" rx="4" fill="${isProgram ? '#ff4766' : '#2196f3'}"/>
        <text x="565" y="42" fill="#ffffff" font-family="system-ui, sans-serif" font-size="11" font-weight="800" text-anchor="middle">
          ${isProgram ? 'PROGRAM' : 'PREVIEW'}
        </text>
      </svg>
    `.trim();

    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  }

  public handleConnection(ws: WebSocket) {
    ws.send(
      JSON.stringify({
        op: 0,
        d: {
          obsWebSocketVersion: '5.5.0',
          rpcVersion: 1,
        },
      })
    );

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        this.processClientMessage(ws, data);
      } catch (err) {
        console.error('[OBS Simulator] Failed to parse message:', err);
      }
    });
  }

  private broadcastEvent(eventType: string, eventData: Record<string, any>) {
    if (!this.wss) return;
    const msg = JSON.stringify({
      op: 5,
      d: {
        eventType,
        eventIntent: 0,
        eventData,
      },
    });
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    });
  }

  private processClientMessage(ws: WebSocket, msg: any) {
    const { op, d } = msg;

    if (op === 1) {
      ws.send(JSON.stringify({ op: 2, d: { negotiatedRpcVersion: 1 } }));
      return;
    }

    if (op === 6) {
      const { requestType, requestId, requestData = {} } = d;
      const response = this.handleRequest(requestType, requestData);

      ws.send(
        JSON.stringify({
          op: 7,
          d: {
            requestType,
            requestId,
            requestStatus: { result: true, code: 100 },
            responseData: response,
          },
        })
      );
    }
  }

  private handleRequest(requestType: string, data: any): Record<string, any> {
    switch (requestType) {
      case 'GetVersion':
        return { obsVersion: '30.2.0', obsWebSocketVersion: '5.5.0', rpcVersion: 1 };

      case 'GetStudioModeEnabled':
        return { studioModeEnabled: this.studioMode };

      case 'SetStudioModeEnabled':
        this.studioMode = !!data.studioModeEnabled;
        this.broadcastEvent('StudioModeStateChanged', { studioModeEnabled: this.studioMode });
        return {};

      case 'GetSceneList':
        return {
          currentProgramSceneName: this.currentProgramSceneName,
          currentPreviewSceneName: this.currentPreviewSceneName,
          scenes: this.scenes.map((s) => ({ sceneName: s.sceneName, sceneIndex: s.sceneIndex })),
        };

      case 'GetCurrentProgramScene':
        return { currentProgramSceneName: this.currentProgramSceneName };

      case 'SetCurrentProgramScene': {
        this.currentProgramSceneName = data.sceneName;
        this.broadcastEvent('CurrentProgramSceneChanged', { sceneName: data.sceneName });
        return {};
      }

      case 'GetCurrentPreviewScene':
        return { currentPreviewSceneName: this.currentPreviewSceneName };

      case 'SetCurrentPreviewScene': {
        this.currentPreviewSceneName = data.sceneName;
        this.broadcastEvent('CurrentPreviewSceneChanged', { sceneName: data.sceneName });
        return {};
      }

      case 'TriggerStudioModeTransition': {
        this.currentProgramSceneName = this.currentPreviewSceneName;
        this.broadcastEvent('CurrentProgramSceneChanged', { sceneName: this.currentProgramSceneName });
        return {};
      }

      case 'GetSceneItemList': {
        const targetSceneName = data.sceneName || this.currentProgramSceneName;
        const scene = this.scenes.find((s) => s.sceneName === targetSceneName);
        return { sceneItems: scene ? scene.items : [] };
      }

      case 'SetSceneItemEnabled': {
        const { sceneName, sceneItemId, sceneItemEnabled } = data;
        const scene = this.scenes.find((s) => s.sceneName === sceneName);
        if (scene) {
          const item = scene.items.find((i) => i.sceneItemId === sceneItemId);
          if (item) {
            item.sceneItemEnabled = sceneItemEnabled;
            this.broadcastEvent('SceneItemEnableStateChanged', { sceneName, sceneItemId, sceneItemEnabled });
          }
        }
        return {};
      }

      case 'GetInputSettings': {
        const inputName = data.inputName;
        for (const scene of this.scenes) {
          const item = scene.items.find((i) => i.sourceName === inputName);
          if (item) {
            return { inputSettings: item.settings || {}, inputKind: item.inputKind };
          }
        }
        return { inputSettings: {}, inputKind: 'unknown' };
      }

      case 'SetInputSettings': {
        const { inputName, inputSettings } = data;
        for (const scene of this.scenes) {
          const item = scene.items.find((i) => i.sourceName === inputName);
          if (item) {
            item.settings = { ...(item.settings || {}), ...inputSettings };
            this.broadcastEvent('InputSettingsChanged', { inputName, inputSettings: item.settings });
            break;
          }
        }
        return {};
      }

      case 'GetSourceScreenshot': {
        const sourceName = data.sourceName || this.currentProgramSceneName;
        return { imageData: this.generateMockFrame(sourceName) };
      }

      case 'GetStreamStatus':
        return { outputActive: false, outputTimecode: '00:00:00' };

      case 'GetRecordStatus':
        return { outputActive: false, outputTimecode: '00:00:00' };

      default:
        return {};
    }
  }

  public attachToServer(server: any, path = '/obs-ws') {
    this.wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (request: IncomingMessage, socket: any, head: any) => {
      const url = new URL(request.url || '', `http://${request.headers.host}`);
      if (url.pathname === path) {
        this.wss!.handleUpgrade(request, socket, head, (ws) => {
          this.handleConnection(ws);
        });
      }
    });

    console.log(`[OBS Simulator] WebSocket listener attached to ${path}`);
  }
}
