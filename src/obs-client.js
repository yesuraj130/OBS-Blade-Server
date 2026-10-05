/**
 * Pure Native Browser OBS WebSocket v5 Client
 * Conforms to OBS WebSocket Protocol v5 (OBS Studio 28+)
 * Zero external dependencies. Uses browser native WebSocket & Web Crypto API.
 */

export class ObsClient {
  constructor() {
    this.ws = null;
    this.status = 'disconnected'; // 'disconnected' | 'connecting' | 'connected'
    this.password = '';
    this.requestCounter = 0;
    this.pendingRequests = new Map();
    this.eventListeners = new Map();
    this.studioModeEnabled = false;
    this.currentProgramScene = '';
    this.currentPreviewScene = '';
    this.scenes = [];
  }

  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach((cb) => {
        try {
          cb(data);
        } catch (e) {
          console.error(`Error in OBS event handler [${event}]:`, e);
        }
      });
    }
  }

  setStatus(status, error = null) {
    this.status = status;
    this.emit('status', { status, error });
  }

  /**
   * Connect to OBS WebSocket Server
   * @param {string} url - ws:// or wss:// URL
   * @param {string} [password=''] - OBS WebSocket server password
   */
  connect(url, password = '') {
    if (this.ws) {
      try {
        this.ws.close();
      } catch (_) {}
    }

    this.password = password || '';
    this.setStatus('connecting');

    try {
      this.ws = new WebSocket(url);
    } catch (err) {
      this.setStatus('disconnected', err.message);
      return;
    }

    this.ws.onopen = () => {
      // Waiting for Hello (OpCode 0) from server
    };

    this.ws.onclose = (e) => {
      this.setStatus('disconnected', e.reason || 'Connection closed');
      this.rejectPendingRequests('WebSocket closed');
    };

    this.ws.onerror = (err) => {
      this.setStatus('disconnected', 'Network error or connection refused');
    };

    this.ws.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data);
        await this.handleMessage(msg);
      } catch (err) {
        console.error('[OBS Client] Failed to parse message:', err);
      }
    };
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('disconnected');
    this.rejectPendingRequests('Client disconnected');
  }

  rejectPendingRequests(reason) {
    for (const [id, req] of this.pendingRequests.entries()) {
      req.reject(new Error(reason));
      clearTimeout(req.timeout);
    }
    this.pendingRequests.clear();
  }

  async handleMessage(msg) {
    const { op, d } = msg;

    // OpCode 0: Hello
    if (op === 0) {
      await this.handleHello(d);
      return;
    }

    // OpCode 2: Identified
    if (op === 2) {
      this.setStatus('connected');
      await this.syncInitialState();
      return;
    }

    // OpCode 5: Event
    if (op === 5) {
      this.handleServerEvent(d);
      return;
    }

    // OpCode 7: RequestResponse
    if (op === 7) {
      const { requestId, requestStatus, responseData } = d;
      const pending = this.pendingRequests.get(requestId);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(requestId);
        if (requestStatus && requestStatus.result) {
          pending.resolve(responseData || {});
        } else {
          pending.reject(new Error(requestStatus?.comment || 'Request failed'));
        }
      }
    }
  }

  async handleHello(data) {
    const { authentication, rpcVersion } = data;
    const identifyPayload = {
      rpcVersion: rpcVersion || 1,
      eventSubscriptions: 1023, // Subscribe to all stream, scene, source, studio events
    };

    if (authentication) {
      if (!this.password) {
        this.setStatus('disconnected', 'Password required by OBS WebSocket');
        this.disconnect();
        return;
      }
      try {
        identifyPayload.authentication = await this.generateAuthString(
          this.password,
          authentication.salt,
          authentication.challenge
        );
      } catch (err) {
        this.setStatus('disconnected', 'Failed to generate authentication hash');
        this.disconnect();
        return;
      }
    }

    // Send OpCode 1: Identify
    this.sendOp(1, identifyPayload);
  }

  /**
   * Official OBS WebSocket v5 SHA256 challenge-response
   */
  async generateAuthString(password, salt, challenge) {
    const secretHash = await this.sha256Base64(password + salt);
    return await this.sha256Base64(secretHash + challenge);
  }

  async sha256Base64(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const byteArray = new Uint8Array(hashBuffer);
    let binary = '';
    for (let i = 0; i < byteArray.byteLength; i++) {
      binary += String.fromCharCode(byteArray[i]);
    }
    return btoa(binary);
  }

  sendOp(op, d) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
    this.ws.send(JSON.stringify({ op, d }));
  }

  request(requestType, requestData = {}) {
    return new Promise((resolve, reject) => {
      if (this.status !== 'connected' && requestType !== 'GetVersion') {
        // allow during handshake if needed, else reject
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
          return reject(new Error('OBS WebSocket is not connected'));
        }
      }

      const requestId = `req_${++this.requestCounter}_${Date.now()}`;
      const timeout = setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error(`Request timed out: ${requestType}`));
        }
      }, 7000);

      this.pendingRequests.set(requestId, { resolve, reject, timeout });

      this.sendOp(6, {
        requestType,
        requestId,
        requestData,
      });
    });
  }

  handleServerEvent(event) {
    const { eventType, eventData } = event;

    if (eventType === 'CurrentProgramSceneChanged') {
      this.currentProgramScene = eventData.sceneName;
      this.emit('programSceneChanged', eventData.sceneName);
    } else if (eventType === 'CurrentPreviewSceneChanged') {
      this.currentPreviewScene = eventData.sceneName;
      this.emit('previewSceneChanged', eventData.sceneName);
    } else if (eventType === 'StudioModeStateChanged') {
      this.studioModeEnabled = !!eventData.studioModeEnabled;
      this.emit('studioModeChanged', this.studioModeEnabled);
    } else if (
      eventType === 'SceneListChanged' ||
      eventType === 'SceneCreated' ||
      eventType === 'SceneRemoved' ||
      eventType === 'SceneNameChanged'
    ) {
      this.getSceneList().then((res) => {
        this.scenes = res.scenes || [];
        this.emit('scenesUpdated', this.scenes);
      });
    } else if (
      eventType === 'SceneItemEnableStateChanged' ||
      eventType === 'SceneItemCreated' ||
      eventType === 'SceneItemRemoved' ||
      eventType === 'SceneItemListReindexed'
    ) {
      this.emit('sceneItemsChanged', eventData);
    } else if (eventType === 'InputSettingsChanged') {
      this.emit('inputSettingsChanged', eventData);
    } else if (eventType === 'InputNameChanged') {
      this.emit('inputNameChanged', eventData);
    } else if (
      eventType === 'SourceFilterCreated' ||
      eventType === 'SourceFilterRemoved' ||
      eventType === 'SourceFilterEnableStateChanged' ||
      eventType === 'SourceFilterListReindexed'
    ) {
      this.emit('filterChanged', eventData);
    } else if (eventType === 'StreamStateChanged') {
      this.emit('streamStateChanged', eventData);
    } else if (eventType === 'RecordStateChanged') {
      this.emit('recordStateChanged', eventData);
    }

    this.emit('event', event);
  }

  async syncInitialState() {
    try {
      const [studioMode, sceneList] = await Promise.all([
        this.getStudioModeEnabled().catch(() => ({ studioModeEnabled: false })),
        this.getSceneList().catch(() => ({ scenes: [] })),
      ]);

      this.studioModeEnabled = !!studioMode.studioModeEnabled;
      this.scenes = sceneList.scenes || [];
      this.currentProgramScene = sceneList.currentProgramSceneName || '';
      this.currentPreviewScene = sceneList.currentPreviewSceneName || '';

      this.emit('synced', {
        studioMode: this.studioModeEnabled,
        scenes: this.scenes,
        currentProgramScene: this.currentProgramScene,
        currentPreviewScene: this.currentPreviewScene,
      });
    } catch (err) {
      console.warn('[OBS Client] Initial sync warning:', err);
    }
  }

  // --- High Level OBS Control Methods ---

  getStudioModeEnabled() {
    return this.request('GetStudioModeEnabled');
  }

  setStudioModeEnabled(enabled) {
    return this.request('SetStudioModeEnabled', { studioModeEnabled: enabled });
  }

  getSceneList() {
    return this.request('GetSceneList');
  }

  setCurrentProgramScene(sceneName) {
    return this.request('SetCurrentProgramScene', { sceneName });
  }

  setCurrentPreviewScene(sceneName) {
    return this.request('SetCurrentPreviewScene', { sceneName });
  }

  triggerStudioModeTransition() {
    return this.request('TriggerStudioModeTransition');
  }

  getSceneItemList(sceneName) {
    return this.request('GetSceneItemList', { sceneName });
  }

  setSceneItemEnabled(sceneName, sceneItemId, sceneItemEnabled) {
    return this.request('SetSceneItemEnabled', {
      sceneName,
      sceneItemId,
      sceneItemEnabled,
    });
  }

  getInputSettings(inputName) {
    return this.request('GetInputSettings', { inputName });
  }

  setInputSettings(inputName, inputSettings) {
    return this.request('SetInputSettings', {
      inputName,
      inputSettings,
      overlay: true,
    });
  }

  getSourceScreenshot(sourceName, imageFormat = 'jpg', imageWidth = 640) {
    return this.request('GetSourceScreenshot', {
      sourceName,
      imageFormat,
      imageWidth,
    });
  }

  toggleStream() {
    return this.request('ToggleStream');
  }

  toggleRecord() {
    return this.request('ToggleRecord');
  }

  getStreamStatus() {
    return this.request('GetStreamStatus');
  }

  getRecordStatus() {
    return this.request('GetRecordStatus');
  }

  // --- Scene Management ---
  createScene(sceneName) {
    return this.request('CreateScene', { sceneName });
  }

  setSceneName(sceneName, newSceneName) {
    return this.request('SetSceneName', { sceneName, newSceneName });
  }

  removeScene(sceneName) {
    return this.request('RemoveScene', { sceneName });
  }

  // --- Source / Input Management ---
  setInputName(inputName, newInputName) {
    return this.request('SetInputName', { inputName, newInputName });
  }

  createInput(sceneName, inputName, inputKind, inputSettings = {}) {
    return this.request('CreateInput', {
      sceneName,
      inputName,
      inputKind,
      inputSettings,
    });
  }

  removeSceneItem(sceneName, sceneItemId) {
    return this.request('RemoveSceneItem', { sceneName, sceneItemId });
  }

  // --- Source / Scene Filter Management ---
  getSourceFilterList(sourceName) {
    return this.request('GetSourceFilterList', { sourceName });
  }

  getSourceFilter(sourceName, filterName) {
    return this.request('GetSourceFilter', { sourceName, filterName });
  }

  setSourceFilterEnabled(sourceName, filterName, filterEnabled) {
    return this.request('SetSourceFilterEnabled', {
      sourceName,
      filterName,
      filterEnabled,
    });
  }

  setSourceFilterName(sourceName, filterName, newFilterName) {
    return this.request('SetSourceFilterName', {
      sourceName,
      filterName,
      newFilterName,
    });
  }

  createSourceFilter(sourceName, filterName, filterKind, filterSettings = {}) {
    return this.request('CreateSourceFilter', {
      sourceName,
      filterName,
      filterKind,
      filterSettings,
    });
  }

  removeSourceFilter(sourceName, filterName) {
    return this.request('RemoveSourceFilter', { sourceName, filterName });
  }
}
