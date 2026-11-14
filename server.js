/**
 * OBS Blade Server (Node.js Express + WebSocket Server)
 * Full-stack backend providing:
 * 1. Direct Media File Uploads (multer) into local storage
 * 2. Media Library APIs (list, delete)
 * 3. OBS WebSocket v5 Bridge & Built-in Simulator
 * 4. Vite middleware for frontend development and static hosting for production
 */

import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { WebSocketServer, WebSocket } from 'ws';
import { execFile, exec, spawn } from 'child_process';
import net from 'net';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const VNC_PORT = 5901;
const NOVNC_PORT = 6080;
const VNC_PASSWORD = process.env.VNC_PASSWORD || 'vncpassword';
const isProduction = process.env.NODE_ENV === 'production';

// Guard process against unhandled errors/socket resets to prevent dev server bounce
process.on('uncaughtException', (err) => {
  console.warn('[Server] Uncaught exception caught safely:', err?.message || err);
});
process.on('unhandledRejection', (reason) => {
  console.warn('[Server] Unhandled rejection caught safely:', reason?.message || reason);
});

// Ensure uploads directory exists
const uploadsDir = path.resolve(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    // Sanitize filename and prepend timestamp
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniquePrefix = Date.now() + '-' + Math.round(Math.random() * 1e4);
    cb(null, `${uniquePrefix}_${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB limit
  },
});

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  app.use(express.json());

  // Enable CORS for external callers (e.g. IIS on port 80 or network LAN clients)
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-OBS-Password, X-Delete-Unlocked');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Serve uploaded media files publicly for browser preview
  app.use('/uploads', express.static(uploadsDir));

  // File Browser directory path (mounted cleanly in frontend routes below)
  const fileBrowserDir = path.resolve(__dirname, 'file-browser');

  // Initialize and attach OBS WebSocket Simulator only if simulator folder exists (for dev)
  const simulatorModulePath = path.resolve(__dirname, '.obs-websocket-simulator/simulator.js');
  if (fs.existsSync(simulatorModulePath)) {
    try {
      const { ObsWebSocketSimulator } = await import('./.obs-websocket-simulator/simulator.js');
      const simulator = new ObsWebSocketSimulator();
      simulator.attachToServer(server, '/obs-ws');
      console.log('[Dev] Attached OBS WebSocket Simulator on /obs-ws');
    } catch (simErr) {
      console.warn('[Dev] Simulator module not loaded:', simErr.message);
    }
  }

  // Helper to check if internal TCP port is accepting connections
  function checkLocalPort(port, host = '127.0.0.1') {
    return new Promise((resolve) => {
      const sock = new net.Socket();
      sock.setTimeout(800);
      sock.on('connect', () => {
        sock.destroy();
        resolve(true);
      });
      sock.on('error', () => resolve(false));
      sock.on('timeout', () => {
        sock.destroy();
        resolve(false);
      });
      sock.connect(port, host);
    });
  }

  function checkPort4455() {
    return checkLocalPort(4455, '127.0.0.1');
  }

  // Real OBS WebSocket v5 transparent proxy on /obs-real-ws
  const realObsWss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    try {
      const { pathname, search } = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
      if (pathname === '/obs-real-ws') {
        realObsWss.handleUpgrade(request, socket, head, (clientWs) => {
          realObsWss.emit('connection', clientWs, request);
        });
        return;
      }
      if (pathname === '/obs-vnc/websockify' || pathname === '/websockify' || pathname.startsWith('/obs-vnc/websockify')) {
        const upstream = net.connect(NOVNC_PORT, '127.0.0.1', () => {
          const targetPath = `/websockify${search || ''}`;
          let rawReq = `${request.method} ${targetPath} HTTP/${request.httpVersion}\r\n`;
          for (let i = 0; i < request.rawHeaders.length; i += 2) {
            const k = request.rawHeaders[i];
            const v = k.toLowerCase() === 'host' ? `127.0.0.1:${NOVNC_PORT}` : request.rawHeaders[i + 1];
            rawReq += `${k}: ${v}\r\n`;
          }
          rawReq += '\r\n';
          upstream.write(rawReq);
          if (head && head.length > 0) upstream.write(head);
          upstream.pipe(socket);
          socket.pipe(upstream);
        });
        upstream.on('error', () => socket.destroy());
        socket.on('error', () => upstream.destroy());
      }
    } catch (_) {}
  });

  realObsWss.on('connection', (clientWs) => {
    console.log('[Real OBS Proxy] Incoming client connected, bridging to 127.0.0.1:4455...');
    const obsWs = new WebSocket('ws://127.0.0.1:4455');

    obsWs.on('open', () => {
      console.log('[Real OBS Proxy] Established bridge to local OBS Studio 4455');
    });

    obsWs.on('message', (data, isBinary) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(data, { binary: isBinary });
      }
    });

    clientWs.on('message', (data, isBinary) => {
      if (obsWs.readyState === WebSocket.OPEN) {
        obsWs.send(data, { binary: isBinary });
      }
    });

    obsWs.on('close', (code, reason) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        if (typeof code === 'number' && code >= 1000 && code !== 1005 && code !== 1006) {
          clientWs.close(code, reason);
        } else {
          clientWs.close();
        }
      }
    });

    clientWs.on('close', (code, reason) => {
      if (obsWs.readyState === WebSocket.OPEN) {
        if (typeof code === 'number' && code >= 1000 && code !== 1005 && code !== 1006) {
          obsWs.close(code, reason);
        } else {
          obsWs.close();
        }
      }
    });

    obsWs.on('error', (err) => {
      console.error('[Real OBS Proxy] Failed to connect to local OBS:', err.message);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.close(1011, `Local OBS connection error: ${err.message}`);
      }
    });

    clientWs.on('error', (err) => {
      console.error('[Real OBS Proxy] Client error:', err.message);
    });
  });

  // --- OBS 29 + Move Transition + TigerVNC + noVNC + Pinggy Tunnel Manager ---
  const launcherScript = path.resolve(__dirname, '.devcontainer/scripts/setup-and-start-obs.sh');
  const tunnelCacheFile = path.resolve(__dirname, '.devcontainer/.vnc_tunnel_cache.json');
  const obsSetupLogs = [];
  let isSettingUp = false;
  let isRestarting = false;
  let currentCommand = 'Checking OBS & VNC environment...';
  let activeSetupProc = null;
  let currentResolutionMode = 'auto';
  let pinggyProcess = null;
  let tcpTunnelInfo = {
    host: '',
    port: '',
    full: '',
    status: 'connecting',
    provider: 'pinggy',
    isReused: false,
    lastUpdated: null,
  };

  function addObsLog(msg) {
    const line = `[${new Date().toLocaleTimeString('en-GB', { hour12: false })}] ${String(msg).trimEnd()}`;
    obsSetupLogs.push(line);
    if (obsSetupLogs.length > 260) {
      obsSetupLogs.splice(0, obsSetupLogs.length - 260);
    }
    console.log(`[OBS Setup] ${msg}`);
  }

  function loadTunnelCache() {
    try {
      if (fs.existsSync(tunnelCacheFile)) {
        const cached = JSON.parse(fs.readFileSync(tunnelCacheFile, 'utf8'));
        if (cached && cached.full) {
          tcpTunnelInfo = { ...tcpTunnelInfo, ...cached, isReused: true };
        }
      }
    } catch (_) {}
  }

  function saveTunnelCache() {
    try {
      fs.mkdirSync(path.dirname(tunnelCacheFile), { recursive: true });
      fs.writeFileSync(tunnelCacheFile, JSON.stringify(tcpTunnelInfo, null, 2));
    } catch (_) {}
  }

  function spawnNewPinggyTunnel() {
    exec('which ssh >/dev/null 2>&1 && echo "1" || echo "0"', (_err, stdout) => {
      if (!stdout || stdout.trim() !== '1') {
        tcpTunnelInfo.status = 'offline';
        return;
      }
      addObsLog('Establishing persistent Pinggy TCP tunnel for VNC access (port 5901)...');
      tcpTunnelInfo.status = 'connecting';
      try {
        fs.writeFileSync('/tmp/pinggy_vnc.log', '');
        const proc = spawn('setsid', [
          'ssh',
          '-p', '443',
          '-o', 'StrictHostKeyChecking=no',
          '-o', 'UserKnownHostsFile=/dev/null',
          '-o', 'ServerAliveInterval=30',
          '-o', 'ServerAliveCountMax=3',
          '-R', `0:localhost:${VNC_PORT}`,
          'tcp@a.pinggy.io',
        ], {
          stdio: ['ignore', 'pipe', 'pipe'],
          detached: true,
        });
        pinggyProcess = proc;

        const parseOutput = (chunk) => {
          const text = chunk.toString();
          try { fs.appendFileSync('/tmp/pinggy_vnc.log', text); } catch (_) {}
          const match = text.match(/tcp:\/\/([^:\s]+):(\d+)/);
          if (match) {
            tcpTunnelInfo.host = match[1];
            tcpTunnelInfo.port = match[2];
            tcpTunnelInfo.full = `${match[1]}:${match[2]}`;
            tcpTunnelInfo.status = 'online';
            tcpTunnelInfo.provider = 'pinggy';
            tcpTunnelInfo.isReused = false;
            tcpTunnelInfo.lastUpdated = new Date().toISOString();
            saveTunnelCache();
            addObsLog(`Public VNC TCP Tunnel (Pinggy) ready: ${tcpTunnelInfo.full}`);
          }
        };

        proc.stdout.on('data', parseOutput);
        proc.stderr.on('data', parseOutput);
        proc.on('close', () => {
          pinggyProcess = null;
          exec('pgrep -f "ssh.*5901.*tcp@a\\.pinggy\\.io" >/dev/null && echo "1" || echo "0"', (_e2, out2) => {
            if (!out2 || out2.trim() !== '1') {
              tcpTunnelInfo.status = 'offline';
              setTimeout(() => startPinggyTunnel(false), 10000);
            }
          });
        });
        proc.on('error', () => {
          pinggyProcess = null;
          tcpTunnelInfo.status = 'offline';
        });
        proc.unref();
      } catch (e) {
        addObsLog(`Pinggy spawn error: ${e.message}`);
      }
    });
  }

  function startPinggyTunnel(forceReset = false) {
    if (!forceReset) {
      exec('pgrep -f "ssh.*5901.*tcp@a\\.pinggy\\.io" >/dev/null && echo "1" || echo "0"', (_err, stdout) => {
        const isRunning = stdout && stdout.trim() === '1';
        if (isRunning && fs.existsSync('/tmp/pinggy_vnc.log')) {
          const logContent = fs.readFileSync('/tmp/pinggy_vnc.log', 'utf8');
          const match = logContent.match(/tcp:\/\/([^:\s]+):(\d+)/);
          if (match) {
            tcpTunnelInfo.host = match[1];
            tcpTunnelInfo.port = match[2];
            tcpTunnelInfo.full = `${match[1]}:${match[2]}`;
            tcpTunnelInfo.status = 'online';
            tcpTunnelInfo.provider = 'pinggy';
            tcpTunnelInfo.isReused = true;
            tcpTunnelInfo.lastUpdated = tcpTunnelInfo.lastUpdated || new Date().toISOString();
            saveTunnelCache();
            return;
          }
        }
        if (isRunning && tcpTunnelInfo.full && tcpTunnelInfo.status === 'online') {
          tcpTunnelInfo.isReused = true;
          return;
        }
        spawnNewPinggyTunnel();
      });
    } else {
      exec('pkill -9 -f "ssh.*5901.*tcp@a\\.pinggy\\.io" 2>/dev/null || true', () => {
        if (pinggyProcess) {
          try { pinggyProcess.kill(); } catch (_) {}
          pinggyProcess = null;
        }
        spawnNewPinggyTunnel();
      });
    }
  }

  function runObsSetupScript({ restartAll = false, label = 'OBS 29 + VNC Provisioning' } = {}, callback) {
    if (!fs.existsSync(launcherScript)) {
      const err = new Error('Launcher script not found');
      if (callback) callback(err);
      return;
    }
    if (isSettingUp || isRestarting) {
      if (callback) callback(null, 'Setup already in progress');
      return;
    }
    if (restartAll) isRestarting = true;
    else isSettingUp = true;

    currentCommand = label;
    addObsLog(`==> Starting ${label}...`);

    const args = restartAll ? [launcherScript, '--restart-all'] : [launcherScript];
    const proc = spawn('bash', args, {
      env: { ...process.env, DEBIAN_FRONTEND: 'noninteractive', VNC_PASSWORD },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    activeSetupProc = proc;

    let stdoutBuf = '';
    let stderrBuf = '';
    const flushLines = (chunk, isErr = false) => {
      const text = chunk.toString();
      if (isErr) stderrBuf += text;
      else stdoutBuf += text;
      const buf = isErr ? stderrBuf : stdoutBuf;
      const parts = buf.split(/\r?\n/);
      const rem = parts.pop();
      if (isErr) stderrBuf = rem || '';
      else stdoutBuf = rem || '';
      for (const raw of parts) {
        const clean = raw.trim();
        if (!clean) continue;
        if (clean.startsWith('[')) currentCommand = clean;
        addObsLog(clean);
      }
    };

    proc.stdout.on('data', (c) => flushLines(c, false));
    proc.stderr.on('data', (c) => flushLines(c, true));

    proc.on('close', (code) => {
      activeSetupProc = null;
      if (stdoutBuf.trim()) addObsLog(stdoutBuf.trim());
      if (stderrBuf.trim()) addObsLog(stderrBuf.trim());
      isSettingUp = false;
      isRestarting = false;
      if (code === 0) {
        currentCommand = 'OBS Studio 29 & VNC Desktop Ready';
        addObsLog('==> Provisioning & startup completed cleanly.');
        startPinggyTunnel(false);
        if (callback) callback(null, 'OBS & VNC services initialized');
      } else {
        currentCommand = `Setup exited with code ${code}`;
        addObsLog(`==> Setup finished with exit code ${code}`);
        if (callback) callback(new Error(`Setup exited with code ${code}`));
      }
    });

    proc.on('error', (err) => {
      activeSetupProc = null;
      isSettingUp = false;
      isRestarting = false;
      currentCommand = `Setup error: ${err.message}`;
      addObsLog(`==> Setup error: ${err.message}`);
      if (callback) callback(err);
    });
  }

  function triggerRealObsLaunch() {
    loadTunnelCache();
    const checkCmd = [
      'which obs Xtigervnc websockify openbox ssh xrandr >/dev/null 2>&1',
      '[ -f /usr/share/novnc/core/rfb.js ]',
      '([ -f /usr/lib/x86_64-linux-gnu/obs-plugins/move-transition.so ] || [ -f /root/.config/obs-studio/plugins/move-transition/bin/64bit/move-transition.so ])',
      'pgrep -x Xtigervnc >/dev/null 2>&1',
      'pgrep -f "websockify.*6080" >/dev/null 2>&1',
      'pgrep -x obs >/dev/null 2>&1',
    ].join(' && ') + ' && echo "READY" || echo "NEEDS_SETUP"';

    exec(checkCmd, (_err, stdout) => {
      const state = (stdout || '').trim();
      if (state === 'READY') {
        currentCommand = 'OBS Studio 29 & VNC Desktop Ready';
        addObsLog('Detected running OBS Studio 29, Move Transition, TigerVNC & noVNC.');
        startPinggyTunnel(false);
      } else {
        addObsLog('Fresh/incomplete OBS environment detected on boot — starting automatic setup...');
        runObsSetupScript({ restartAll: false, label: 'Initial OBS 29 + Move Transition + VNC Setup' });
      }
    });
  }

  // Run immediately on boot without waiting for Tab 3 click
  setTimeout(triggerRealObsLaunch, 400);

  // Keep desktop VNC, websockify, OBS & Pinggy healthy in background
  setInterval(() => {
    if (isSettingUp || isRestarting) return;
    exec(
      'which obs Xtigervnc websockify >/dev/null 2>&1 && (! pgrep -x Xtigervnc >/dev/null 2>&1 || ! pgrep -f "websockify.*6080" >/dev/null 2>&1 || ! pgrep -x obs >/dev/null 2>&1) && echo "RECOVER" || echo "OK"',
      (_err, stdout) => {
        if ((stdout || '').trim() === 'RECOVER') {
          addObsLog('Supervisor detected stopped desktop/OBS service — recovering...');
          runObsSetupScript({ restartAll: false, label: 'Auto-recovering OBS & VNC services' });
        } else {
          startPinggyTunnel(false);
        }
      }
    );
  }, 15000);

  // --- API Endpoints ---

  /**
   * Real OBS Status & Control APIs
   */
  app.get('/api/real-obs/status', async (req, res) => {
    const isOnline = await checkPort4455();
    res.json({
      online: isOnline,
      port: 4455,
      endpoint: '/obs-real-ws',
      fullUrl: `${req.protocol === 'https' ? 'wss' : 'ws'}://${req.get('host')}/obs-real-ws`,
      time: new Date().toISOString(),
    });
  });

  app.post('/api/real-obs/start', (_req, res) => {
    if (!fs.existsSync(launcherScript)) {
      return res.status(404).json({ error: 'Launcher script not found' });
    }
    runObsSetupScript({ restartAll: false, label: 'Starting OBS Studio 29 & VNC' }, (err, msg) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, message: msg });
    });
  });

  /**
   * VNC / OBS Desktop Status, Logs, Resolution & Pinggy APIs
   */
  app.get('/api/vnc/status', async (req, res) => {
    const [vncOnline, novncOnline, obsWsOnline] = await Promise.all([
      checkLocalPort(VNC_PORT, '127.0.0.1'),
      checkLocalPort(NOVNC_PORT, '127.0.0.1'),
      checkLocalPort(4455, '127.0.0.1'),
    ]);

    exec(
      `echo "OBS_BIN=$(which obs >/dev/null 2>&1 && echo 1 || echo 0)"; ` +
      `echo "OBS_VER=$(obs --version 2>/dev/null | grep -oE '[0-9]+\\.[0-9]+\\.[0-9]+' | head -n1 || true)"; ` +
      `echo "MOVE_OK=$(if [ -f /usr/lib/x86_64-linux-gnu/obs-plugins/move-transition.so ] || [ -f /root/.config/obs-studio/plugins/move-transition/bin/64bit/move-transition.so ]; then echo 1; else echo 0; fi)"; ` +
      `echo "OBS_RUN=$(pgrep -x obs >/dev/null 2>&1 && echo 1 || echo 0)"; ` +
      `echo "PROCS_START"; ` +
      `ps -eo pid,etime,args --sort=-etime | grep -E "apt-get|dpkg|gcc|curl|tar|obs|Xtigervnc|websockify|openbox|ssh.*pinggy|setup-and-start-obs" | grep -v "grep" | head -n 12`,
      (_err, stdout = '') => {
        const lines = stdout.split('\n');
        const kv = {};
        const procs = [];
        let inProcs = false;
        for (const l of lines) {
          if (l === 'PROCS_START') {
            inProcs = true;
            continue;
          }
          if (!inProcs) {
            const idx = l.indexOf('=');
            if (idx > 0) kv[l.slice(0, idx)] = l.slice(idx + 1).trim();
          } else if (l.trim()) {
            procs.push(l.trim());
          }
        }

        const rawProto = String(req.headers['x-forwarded-proto'] || req.protocol || 'https');
        const proto = rawProto.split(',')[0].trim() || 'https';
        const host = req.get('host');
        const resizeParam = currentResolutionMode === 'auto' ? 'remote' : 'scale';
        const publicWebVncUrl = `${proto}://${host}/obs-vnc/vnc.html?autoconnect=true&resize=${resizeParam}&password=${encodeURIComponent(VNC_PASSWORD)}`;

        res.json({
          obsInstalled: kv.OBS_BIN === '1',
          obsVersion: kv.OBS_VER || '29.0.2',
          moveTransitionInstalled: kv.MOVE_OK === '1',
          obsRunning: kv.OBS_RUN === '1',
          obsWsOnline,
          vncOnline,
          novncOnline,
          isSettingUp,
          isRestarting,
          currentCommand,
          runningProcesses: procs,
          logs: obsSetupLogs.slice(-150),
          publicWebVncUrl,
          tcpTunnel: tcpTunnelInfo,
          resolutionMode: currentResolutionMode,
          vncPassword: VNC_PASSWORD,
        });
      }
    );
  });

  app.post('/api/vnc/start', (_req, res) => {
    addObsLog('Restarting OBS Studio 29 process...');
    exec(
      'pkill -9 -x obs 2>/dev/null || true; sleep 0.4; rm -rf /root/.config/obs-studio/.sentinel 2>/dev/null || true; DISPLAY=:1 LIBGL_ALWAYS_SOFTWARE=1 QT_X11_NO_MITSHM=1 setsid obs --disable-shutdown-check >/tmp/obs.log 2>&1 < /dev/null & sleep 1.5; DISPLAY=:1 wmctrl -r "OBS" -b add,maximized_vert,maximized_horz 2>/dev/null || true',
      (err) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        addObsLog('OBS Studio 29 restarted.');
        res.json({ success: true, message: 'OBS Studio restarted' });
      }
    );
  });

  app.post('/api/vnc/setup', (_req, res) => {
    res.json({ success: true, message: 'Setup triggered' });
    runObsSetupScript({ restartAll: false, label: 'OBS 29 + Move Transition + VNC Setup' });
  });

  app.post('/api/vnc/restart-pc', (_req, res) => {
    res.json({ success: true, message: 'Full Desktop & OBS restart initiated' });
    runObsSetupScript({ restartAll: true, label: 'Full Desktop Check & Restart PC' });
  });

  app.post('/api/vnc/resolution', (req, res) => {
    const resolution = String(req.body?.resolution || 'auto');
    currentResolutionMode = resolution;
    let modeArg = '';
    if (resolution === '720x1280') modeArg = '"720x1280_60.00"';
    else if (resolution === '1080x1920') modeArg = '"1080x1920_60.00"';
    else if (resolution === '1280x720') modeArg = '1280x720';
    else if (resolution === '1920x1080') modeArg = '1920x1080';
    else if (resolution === '1280x800') modeArg = '1280x800';

    if (!modeArg) {
      return res.json({ success: true, resolution: 'auto' });
    }
    exec(
      `DISPLAY=:1 xrandr --newmode "720x1280_60.00" 74.50 720 760 832 944 1280 1283 1293 1316 -hsync +vsync 2>/dev/null || true; ` +
      `DISPLAY=:1 xrandr --addmode VNC-0 "720x1280_60.00" 2>/dev/null || true; ` +
      `DISPLAY=:1 xrandr --newmode "1080x1920_60.00" 173.00 1080 1152 1264 1448 1920 1923 1933 1968 -hsync +vsync 2>/dev/null || true; ` +
      `DISPLAY=:1 xrandr --addmode VNC-0 "1080x1920_60.00" 2>/dev/null || true; ` +
      `DISPLAY=:1 xrandr -s ${modeArg}; DISPLAY=:1 wmctrl -r "OBS" -b add,maximized_vert,maximized_horz 2>/dev/null || true`,
      (err) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        addObsLog(`Desktop resolution updated to ${resolution}`);
        res.json({ success: true, resolution });
      }
    );
  });

  app.post('/api/vnc/reset-ip', (_req, res) => {
    addObsLog('Resetting Pinggy VNC TCP tunnel & generating fresh address...');
    try {
      if (fs.existsSync(tunnelCacheFile)) fs.unlinkSync(tunnelCacheFile);
    } catch (_) {}
    tcpTunnelInfo = {
      host: '',
      port: '',
      full: '',
      status: 'connecting',
      provider: 'pinggy',
      isReused: false,
      lastUpdated: null,
    };
    startPinggyTunnel(true);
    res.json({ success: true, message: 'Fresh Pinggy VNC TCP tunnel requested' });
  });

  // Standalone noVNC reverse proxy (/obs-vnc/* -> 127.0.0.1:6080/*) for "New Tab"
  app.use('/obs-vnc', (req, res) => {
    let targetPath = req.url || '/';
    if (targetPath === '/' || targetPath === '') {
      targetPath = `/vnc.html?autoconnect=true&resize=remote&password=${encodeURIComponent(VNC_PASSWORD)}`;
    }
    const proxyReq = http.request(
      {
        host: '127.0.0.1',
        port: NOVNC_PORT,
        path: targetPath,
        method: req.method,
        headers: { ...req.headers, host: `127.0.0.1:${NOVNC_PORT}` },
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
        proxyRes.pipe(res);
      }
    );
    proxyReq.on('error', () => {
      res.status(503).type('html').send(`<!DOCTYPE html>
<html style="background:#020617;color:#e2e8f0;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;height:100%;margin:0;">
<body style="margin:0;height:100%;display:flex;flex-direction:column;background:#020617;padding:16px;box-sizing:border-box;">
  <div style="display:flex;align-items:center;justify-content:space-between;background:#0f172a;border:1px solid #1e293b;padding:12px 16px;border-radius:8px 8px 0 0;">
    <strong style="color:#f8fafc;font-size:13px;">OBS Studio 29 Desktop Starting — Live Command Console</strong>
    <span id="cmd-badge" style="font-size:11px;color:#38bdf8;background:#020617;padding:3px 8px;border-radius:4px;border:1px solid #1e293b;">Initializing...</span>
  </div>
  <pre id="procs" style="margin:0;background:#090d16;border-left:1px solid #1e293b;border-right:1px solid #1e293b;border-bottom:1px solid #1e293b;padding:8px 16px;font-size:11px;color:#a5f3fc;white-space:pre-wrap;max-height:90px;overflow:auto;">Checking running commands...</pre>
  <pre id="logs" style="flex:1;margin:0;background:#020617;border:1px solid #1e293b;border-top:none;border-radius:0 0 8px 8px;padding:14px 16px;font-size:12px;line-height:1.5;color:#cbd5e1;overflow:auto;white-space:pre-wrap;"></pre>
  <script>
    function poll(){
      fetch('/api/vnc/status').then(r=>r.json()).then(d=>{
        if(d.vncOnline && d.novncOnline && !d.isSettingUp && !d.isRestarting){ location.reload(); return; }
        document.getElementById('cmd-badge').textContent = d.currentCommand || 'Provisioning OBS & VNC...';
        document.getElementById('procs').textContent = (d.runningProcesses||[]).join('\\n') || 'Waiting for next command...';
        var el = document.getElementById('logs'); el.textContent = (d.logs||[]).join('\\n'); el.scrollTop = el.scrollHeight;
      }).catch(()=>{});
    }
    setInterval(poll, 1200); poll();
  </script>
</body>
</html>`);
    });
    req.pipe(proxyReq);
  });

  /**
   * Status and Server Diagnostics
   */
  app.get('/api/status', (req, res) => {
    const reqPass = req.headers['x-obs-password'] || req.query.password || '';
    const configuredPass = process.env.FILE_SERVER_PASSWORD || process.env.OBS_PASSWORD || '';
    const authValid = !configuredPass || reqPass === configuredPass;

    res.json({
      service: 'OBS Host File Browser',
      status: 'online',
      nodeVersion: process.version,
      port: PORT,
      uploadsDir: uploadsDir,
      maxUploadMb: 100,
      simulatorAttached: true,
      authRequired: Boolean(configuredPass),
      authValid: authValid,
      time: new Date().toISOString(),
    });
  });

  /**
   * Direct File Upload API
   * Accepts multipart/form-data with field 'media'
   * Returns the exact local disk path required by OBS Studio
   */
  app.post('/api/upload', upload.single('media'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No media file provided' });
    }

    const absolutePath = path.resolve(req.file.path);
    const publicUrl = `/uploads/${req.file.filename}`;

    console.log(`[Upload] File saved to ${absolutePath}`);

    res.json({
      success: true,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      path: absolutePath, // Absolute disk path for OBS SetInputSettings
      url: publicUrl,
    });
  });

  /**
   * Media Library API
   * Lists all uploaded assets with paths, previews, and sizes
   */
  app.get('/api/media', (_req, res) => {
    try {
      const files = fs.readdirSync(uploadsDir);
      const mediaList = files
        .filter((file) => !file.startsWith('.'))
        .map((file) => {
          const filePath = path.join(uploadsDir, file);
          const stats = fs.statSync(filePath);
          return {
            filename: file,
            path: filePath,
            url: `/uploads/${file}`,
            size: stats.size,
            updatedAt: stats.mtime,
          };
        })
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      res.json({ files: mediaList });
    } catch (err) {
      res.status(500).json({ error: 'Failed to read media library', details: err.message });
    }
  });

  /**
   * Delete uploaded media
   */
  app.delete('/api/media/:filename', (req, res) => {
    const filename = req.params.filename;
    // Prevent path traversal
    const safeFilename = path.basename(filename);
    const targetPath = path.join(uploadsDir, safeFilename);

    if (!fs.existsSync(targetPath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    try {
      fs.unlinkSync(targetPath);
      res.json({ success: true, message: 'File deleted' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete file', details: err.message });
    }
  });

  /**
   * OBS Host Filesystem Browser API
   * Enables browsing files and folders on the OBS host machine
   */
  app.get('/api/fs/browse', (req, res) => {
    try {
      let requestedDir = req.query.dir ? String(req.query.dir).trim() : '';
      const isWindows = process.platform === 'win32';

      if (requestedDir === '__DRIVES__') {
        if (isWindows) {
          const drives = [];
          for (let code = 65; code <= 90; code++) {
            const driveRoot = `${String.fromCharCode(code)}:\\`;
            try {
              if (fs.statSync(driveRoot).isDirectory()) {
                drives.push({ name: driveRoot, path: driveRoot, isDirectory: true, isDrive: true, size: 0, ext: '' });
              }
            } catch (_) {}
          }
          return res.json({
            currentDir: '__DRIVES__',
            parentDir: null,
            uploadsDir: uploadsDir,
            projectDir: __dirname,
            entries: drives,
          });
        }
        requestedDir = '/';
      }

      if (!requestedDir || requestedDir === '__UPLOADS__') {
        requestedDir = uploadsDir;
      } else if (requestedDir === '__PROJECT__') {
        requestedDir = __dirname;
      } else if (isWindows && /^[a-zA-Z]:$/.test(requestedDir)) {
        requestedDir = `${requestedDir}\\`;
      }

      const targetDir = fs.existsSync(requestedDir) && fs.statSync(requestedDir).isDirectory()
        ? path.resolve(requestedDir)
        : uploadsDir;

      const entries = fs.readdirSync(targetDir, { withFileTypes: true });
      const items = [];

      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;
        try {
          const fullPath = path.join(targetDir, entry.name);
          const isDir = entry.isDirectory();
          let size = 0;
          if (!isDir) {
            const st = fs.statSync(fullPath);
            size = st.size;
          }
          const isInsideUploads = (() => {
            const rel = path.relative(path.resolve(uploadsDir), path.resolve(fullPath));
            return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
          })();
          items.push({
            name: entry.name,
            path: fullPath,
            isDirectory: isDir,
            size: size,
            ext: isDir ? '' : path.extname(entry.name).toLowerCase(),
            deletable: !isDir && isInsideUploads,
          });
        } catch (_) {}
      }

      items.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
      });

      const parentDir = path.dirname(targetDir);

      res.json({
        currentDir: targetDir,
        parentDir: parentDir !== targetDir ? parentDir : (isWindows ? '__DRIVES__' : null),
        uploadsDir: uploadsDir,
        projectDir: __dirname,
        entries: items,
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to browse directory', details: err.message });
    }
  });

  // Streaming Media Preview API for File Browser tab in AI Studio preview
  const PREVIEWABLE_EXTS = new Set([
    '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico',
    '.mp4', '.mov', '.mkv', '.webm', '.m4v', '.avi',
    '.mp3', '.wav', '.aac', '.flac', '.ogg', '.m4a',
    '.txt', '.log', '.json', '.srt', '.vtt',
  ]);

  app.get('/api/fs/preview', (req, res) => {
    const rawPath = req.query.path ? String(req.query.path) : '';
    if (!rawPath) return res.status(400).json({ error: 'Missing file path' });
    const resolvedPath = path.resolve(rawPath);
    if (!PREVIEWABLE_EXTS.has(path.extname(resolvedPath).toLowerCase())) {
      return res.status(415).json({ error: 'Preview is not supported for this file type' });
    }
    try {
      if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isFile()) {
        return res.status(404).json({ error: 'File not found' });
      }
      res.sendFile(resolvedPath, {
        dotfiles: 'allow',
        headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to preview file', details: err.message });
    }
  });

  // Locked Delete API for File Browser tab in AI Studio preview (uploadsDir only)
  app.delete('/api/fs/file', (req, res) => {
    if (req.headers['x-delete-unlocked'] !== 'true') {
      return res.status(403).json({ error: 'Delete lock is enabled. Unlock delete mode first.' });
    }
    const rawPath = req.query.path ? String(req.query.path) : '';
    if (!rawPath) return res.status(400).json({ error: 'Missing file path' });
    const targetPath = path.resolve(rawPath);
    const rel = path.relative(path.resolve(uploadsDir), targetPath);
    if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) {
      return res.status(403).json({ error: 'Delete is restricted to the uploads folder.' });
    }
    try {
      if (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isFile()) {
        return res.status(404).json({ error: 'File not found' });
      }
      fs.unlinkSync(targetPath);
      res.json({ success: true, path: targetPath });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete file', details: err.message });
    }
  });

  // --- Frontend Serving (AI Studio Zero-Reload 3-Tab Preview — No Nested Iframes) ---
  const staticRoot = isProduction && fs.existsSync(path.resolve(__dirname, 'dist'))
    ? path.resolve(__dirname, 'dist')
    : path.resolve(__dirname, 'src');

  function buildDualTabObsHtml(obsRawHtml) {
    const fbHtmlPath = path.resolve(fileBrowserDir, 'index.html');
    let fbStyle = '';
    let fbBody = '<div style="padding:24px;color:#94a3b8;">File browser UI not found.</div>';
    let fbScript = '';

    if (fs.existsSync(fbHtmlPath)) {
      const fbRaw = fs.readFileSync(fbHtmlPath, 'utf8');
      const styleMatch = fbRaw.match(/<style>([\s\S]*?)<\/style>/i);
      const bodyMatch = fbRaw.match(/<body>([\s\S]*?)<script>/i);
      const scriptMatch = fbRaw.match(/<script>([\s\S]*?)<\/script>/i);
      if (styleMatch) {
        fbStyle = styleMatch[1]
          .replace(/:root\s*\{/g, ':host {')
          .replace(/(^|\s)body\s*\{/gm, '$1.fb-root {');
      }
      if (bodyMatch) {
        fbBody = bodyMatch[1];
      }
      if (scriptMatch) {
        fbScript = scriptMatch[1].replace(/<\/script>/gi, '<\\/script>');
      }
    }

    const previewInjection = `
<style>
  body .top-nav-bar { top: 38px !important; }
  body .blade-dialog-overlay { top: 38px !important; }
  #aistudio-preview-tabbar {
    position: sticky; top: 0; height: 38px; min-height: 38px; flex-shrink: 0;
    background: #0f1624; border-bottom: 1px solid #1e293b;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 12px; gap: 8px; z-index: 50001;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  #aistudio-preview-tabbar .ai-tab-group { display: flex; align-items: center; gap: 6px; overflow-x: auto; }
  #aistudio-preview-tabbar .ai-tab-btn {
    border: 1px solid transparent; background: transparent; color: #94a3b8;
    padding: 5px 11px; border-radius: 6px; font-size: 12.5px; font-weight: 600;
    cursor: pointer; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap;
  }
  #aistudio-preview-tabbar .ai-tab-btn:hover { color: #e2e8f0; background: rgba(255,255,255,0.05); }
  #aistudio-preview-tabbar .ai-tab-btn.active { background: #1e293b; color: #ffffff; border-color: #3b82f6; }
  #aistudio-obs-tab-dot { width: 7px; height: 7px; border-radius: 50%; background: #f59e0b; display: inline-block; }
  #aistudio-obs-tab-dot.ready { background: #10b981; }
  #aistudio-obs-tab-dot.offline { background: #ef4444; }
  #aistudio-preview-tabbar .ai-open-link {
    font-size: 12px; color: #93c5fd; text-decoration: none; padding: 4px 10px;
    border-radius: 6px; border: 1px solid #1e293b; background: #131c2e; white-space: nowrap;
  }
  #aistudio-preview-tabbar .ai-open-link:hover { background: #1d2a42; color: #fff; }
  #aistudio-fb-panel, #aistudio-obs-panel {
    display: none; position: fixed; top: 38px; left: 0; right: 0; bottom: 0;
    z-index: 50000; overflow: auto; background: #020617;
  }
  #aistudio-fb-panel { background: #12141a; }
  #aistudio-fb-panel.active, #aistudio-obs-panel.active { display: block; }
</style>
<div id="aistudio-preview-tabbar">
  <div class="ai-tab-group">
    <button type="button" id="aistudio-tab-obs" class="ai-tab-btn active">🎛️ OBS Blade</button>
    <button type="button" id="aistudio-tab-files" class="ai-tab-btn">📁 File Browser</button>
    <button type="button" id="aistudio-tab-desktop" class="ai-tab-btn">🖥️ OBS <span id="aistudio-obs-tab-dot" title="OBS / VNC Status"></span></button>
  </div>
  <a id="aistudio-open-tab" class="ai-open-link" href="/obs/" target="_blank" rel="noopener">Open Tab ↗</a>
</div>
<div id="aistudio-fb-panel"></div>
<div id="aistudio-obs-panel"></div>
<script>
(function () {
  var btnObs = document.getElementById('aistudio-tab-obs');
  var btnFiles = document.getElementById('aistudio-tab-files');
  var btnDesktop = document.getElementById('aistudio-tab-desktop');
  var obsTabDot = document.getElementById('aistudio-obs-tab-dot');
  var fbPanel = document.getElementById('aistudio-fb-panel');
  var obsPanel = document.getElementById('aistudio-obs-panel');
  var openLink = document.getElementById('aistudio-open-tab');
  var fbInitialized = false;
  var obsInitialized = false;
  var activeTab = 'obs';

  var fbStyleText = ${JSON.stringify(fbStyle)};
  var fbBodyHtml = ${JSON.stringify(fbBody)};
  var fbScriptCode = ${JSON.stringify(fbScript)};

  function initFileBrowserTab() {
    if (fbInitialized || !fbPanel) return;
    fbInitialized = true;
    var shadow = fbPanel.attachShadow({ mode: 'open' });
    shadow.innerHTML = '<style>:host{display:block;min-height:100%;}' + fbStyleText + '</style><div class="fb-root">' + fbBodyHtml + '</div>';
    var fbDoc = {
      getElementById: function (id) { return shadow.getElementById(id); },
      createElement: function (tag) { return document.createElement(tag); },
      createDocumentFragment: function () { return document.createDocumentFragment(); },
      execCommand: function (cmd) { return document.execCommand(cmd); },
      body: document.body
    };
    try {
      var runner = new Function('document', fbScriptCode);
      runner(fbDoc);
    } catch (err) {
      shadow.innerHTML = '<div style="padding:24px;color:#f87171;font-family:sans-serif;">Failed to initialize File Browser tab: ' + err.message + '</div>';
    }
  }

  function initObsDesktopTab() {
    if (obsInitialized || !obsPanel) return;
    obsInitialized = true;
    var shadow = obsPanel.attachShadow({ mode: 'open' });
    shadow.innerHTML = [
      '<style>',
      ':host { display:flex; flex-direction:column; height:100%; width:100%; background:#020617; color:#e2e8f0; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; }',
      '* { box-sizing:border-box; }',
      '.obs-wrap { display:flex; flex-direction:column; height:100%; width:100%; overflow:hidden; }',
      '.obs-toolbar { background:#0f172a; border-bottom:1px solid #1e293b; padding:7px 12px; display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:8px; font-size:12px; flex-shrink:0; }',
      '.obs-group { display:flex; flex-wrap:wrap; align-items:center; gap:7px; min-width:0; }',
      '.obs-pill { display:inline-flex; align-items:center; gap:5px; padding:3px 8px; border-radius:6px; background:#020617; border:1px solid #1e293b; color:#cbd5e1; font-size:11.5px; }',
      '.obs-dot { width:7px; height:7px; border-radius:50%; background:#f59e0b; flex-shrink:0; }',
      '.obs-dot.ok { background:#10b981; }',
      '.obs-dot.err { background:#ef4444; }',
      '.obs-copy { cursor:pointer; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; max-width:240px; transition:border-color .15s; }',
      '.obs-copy:hover { border-color:#3b82f6; color:#fff; }',
      '.obs-copy-text { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }',
      '.obs-select { background:#020617; color:#93c5fd; border:1px solid #334155; border-radius:5px; padding:3px 6px; font-size:11.5px; font-family:ui-monospace,monospace; cursor:pointer; }',
      '.obs-btn { background:#1e293b; color:#e2e8f0; border:1px solid #334155; border-radius:5px; padding:4px 9px; font-size:11.5px; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:5px; text-decoration:none; }',
      '.obs-btn:hover { background:#334155; color:#fff; }',
      '.obs-btn.primary { background:#4f46e5; border-color:#6366f1; color:#fff; }',
      '.obs-btn.primary:hover { background:#4338ca; }',
      '.obs-btn.warn { background:#451a03; border-color:#b45309; color:#fde68a; }',
      '.obs-btn.warn:hover { background:#78350f; }',
      '.obs-btn:disabled { opacity:.5; cursor:not-allowed; }',
      '.obs-stage { position:relative; flex:1; width:100%; min-height:0; background:#000; overflow:hidden; }',
      '#obs-vnc-screen { width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#050811; }',
      '#obs-vnc-screen canvas { max-width:100%; max-height:100%; outline:none; }',
      '#obs-startup-console { position:absolute; inset:0; z-index:20; background:#020617; display:flex; flex-direction:column; padding:14px; font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; }',
      '#obs-startup-console.hidden { display:none; }',
      '.con-head { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:8px; background:#0f172a; border:1px solid #1e293b; padding:10px 14px; border-radius:8px 8px 0 0; }',
      '.con-title { display:flex; align-items:center; gap:8px; font-size:12.5px; font-weight:700; color:#f8fafc; }',
      '.con-spin { width:13px; height:13px; border:2px solid #6366f1; border-top-color:transparent; border-radius:50%; animation:obsSpin 1s linear infinite; }',
      '@keyframes obsSpin { to { transform:rotate(360deg); } }',
      '.con-cmd { font-size:11px; color:#38bdf8; background:#020617; padding:3px 8px; border-radius:4px; border:1px solid #1e293b; max-width:460px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }',
      '.con-procs-wrap { background:#090d16; border-left:1px solid #1e293b; border-right:1px solid #1e293b; border-bottom:1px solid #1e293b; padding:8px 14px; }',
      '.con-procs-lbl { font-size:10px; color:#64748b; text-transform:uppercase; margin-bottom:4px; }',
      '.con-procs { margin:0; font-size:11px; color:#a5f3fc; white-space:pre-wrap; max-height:84px; overflow:auto; }',
      '.con-logs { flex:1; margin:0; background:#020617; border:1px solid #1e293b; border-top:none; border-radius:0 0 8px 8px; padding:12px 14px; font-size:11.5px; line-height:1.5; color:#cbd5e1; overflow:auto; white-space:pre-wrap; }',
      '.con-footer { display:flex; justify-content:space-between; align-items:center; padding-top:8px; font-size:11px; color:#94a3b8; }',
      '</style>',
      '<div class="obs-wrap">',
      '  <div class="obs-toolbar">',
      '    <div class="obs-group">',
      '      <span class="obs-pill"><span id="obs-status-dot" class="obs-dot"></span><span id="obs-status-text">Checking OBS...</span></span>',
      '      <span id="obs-ver-badge" class="obs-pill" style="color:#93c5fd;">OBS 29 + Move</span>',
      '      <select id="obs-res-select" class="obs-select" title="Desktop Resolution">',
      '        <option value="auto">Auto (Dynamic)</option>',
      '        <option value="1280x720">1280x720 (Landscape)</option>',
      '        <option value="720x1280">720x1280 (Portrait)</option>',
      '        <option value="1920x1080">1920x1080 (Landscape)</option>',
      '        <option value="1080x1920">1080x1920 (Portrait)</option>',
      '        <option value="1280x800">1280x800 (Desktop)</option>',
      '      </select>',
      '      <span id="obs-pass-copy" class="obs-pill obs-copy" title="Tap to copy VNC password">Pass: <strong style="color:#a5b4fc;">vncpassword</strong></span>',
      '      <span id="obs-weburl-copy" class="obs-pill obs-copy" style="border-color:#1e3a8a;color:#93c5fd;" title="Tap to copy Public Web VNC URL"><span class="obs-dot ok"></span><span>Web VNC:</span><span id="obs-weburl-text" class="obs-copy-text">Loading...</span></span>',
      '      <span id="obs-pinggy-copy" class="obs-pill obs-copy" style="border-color:#065f46;color:#6ee7b7;" title="Tap to copy Public Pinggy VNC TCP host:port"><span id="obs-pinggy-dot" class="obs-dot"></span><span>VNC IP:</span><span id="obs-pinggy-text" class="obs-copy-text">Connecting tunnel...</span></span>',
      '      <button type="button" id="obs-btn-reset-ip" class="obs-btn warn" title="Generate new Pinggy VNC IP">Reset IP</button>',
      '    </div>',
      '    <div class="obs-group">',
      '      <button type="button" id="obs-btn-logs" class="obs-btn" title="Toggle startup logs">Logs</button>',
      '      <button type="button" id="obs-btn-reconnect" class="obs-btn">Reconnect</button>',
      '      <button type="button" id="obs-btn-restart-obs" class="obs-btn">Restart OBS</button>',
      '      <button type="button" id="obs-btn-restart-pc" class="obs-btn warn">Restart PC</button>',
      '      <a id="obs-btn-newtab" class="obs-btn primary" href="/obs-vnc/vnc.html?autoconnect=true&resize=remote&password=vncpassword" target="_blank" rel="noopener">New Tab ↗</a>',
      '    </div>',
      '  </div>',
      '  <div class="obs-stage">',
      '    <div id="obs-vnc-screen"></div>',
      '    <div id="obs-startup-console">',
      '      <div class="con-head">',
      '        <div class="con-title"><span class="con-spin"></span><span id="obs-con-heading">OBS Studio 29 & VNC Desktop Starting — Live Command Console</span></div>',
      '        <span id="obs-con-cmd" class="con-cmd">Initializing...</span>',
      '      </div>',
      '      <div class="con-procs-wrap">',
      '        <div class="con-procs-lbl">Active Running Processes (PID / Elapsed / Command)</div>',
      '        <pre id="obs-con-procs" class="con-procs">Checking running commands...</pre>',
      '      </div>',
      '      <pre id="obs-con-logs" class="con-logs"></pre>',
      '      <div class="con-footer">',
      '        <span id="obs-con-hint">Desktop will launch automatically as soon as OBS Studio 29, Move Transition & noVNC are ready.</span>',
      '        <button type="button" id="obs-btn-hide-logs" class="obs-btn" style="display:none;">Back to VNC Desktop</button>',
      '      </div>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('\\n');

    var $ = function (id) { return shadow.getElementById(id); };
    var statusDot = $('obs-status-dot');
    var statusText = $('obs-status-text');
    var verBadge = $('obs-ver-badge');
    var resSelect = $('obs-res-select');
    var passCopy = $('obs-pass-copy');
    var webUrlCopy = $('obs-weburl-copy');
    var webUrlText = $('obs-weburl-text');
    var pinggyCopy = $('obs-pinggy-copy');
    var pinggyDot = $('obs-pinggy-dot');
    var pinggyText = $('obs-pinggy-text');
    var btnResetIp = $('obs-btn-reset-ip');
    var btnLogs = $('obs-btn-logs');
    var btnReconnect = $('obs-btn-reconnect');
    var btnRestartObs = $('obs-btn-restart-obs');
    var btnRestartPc = $('obs-btn-restart-pc');
    var btnNewTab = $('obs-btn-newtab');
    var btnHideLogs = $('obs-btn-hide-logs');
    var vncScreen = $('obs-vnc-screen');
    var consoleEl = $('obs-startup-console');
    var conCmd = $('obs-con-cmd');
    var conProcs = $('obs-con-procs');
    var conLogs = $('obs-con-logs');

    var currentWebUrl = location.origin + '/obs-vnc/vnc.html?autoconnect=true&resize=remote&password=vncpassword';
    var currentTcpAddr = '';
    var rfbClient = null;
    var rfbConnecting = false;
    var rfbConnected = false;
    var forceShowLogs = false;
    var latestReady = false;
    var savedRes = localStorage.getItem('obs_vnc_res_mode') || 'auto';
    resSelect.value = savedRes;

    function copyText(text, labelEl, restoreText) {
      if (!text) return;
      var done = function () {
        if (!labelEl) return;
        var prev = restoreText || labelEl.textContent;
        labelEl.textContent = '✓ Copied!';
        setTimeout(function () { labelEl.textContent = prev; }, 1400);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(function () {
          var ta = document.createElement('textarea');
          ta.value = text; document.body.appendChild(ta); ta.select();
          try { document.execCommand('copy'); } catch (_) {}
          document.body.removeChild(ta); done();
        });
      } else {
        var ta = document.createElement('textarea');
        ta.value = text; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); } catch (_) {}
        document.body.removeChild(ta); done();
      }
    }

    passCopy.addEventListener('click', function () {
      var strong = passCopy.querySelector('strong');
      copyText('vncpassword', strong, 'vncpassword');
    });
    webUrlCopy.addEventListener('click', function () {
      copyText(currentWebUrl, webUrlText, currentWebUrl);
    });
    pinggyCopy.addEventListener('click', function () {
      if (currentTcpAddr) copyText(currentTcpAddr, pinggyText, currentTcpAddr);
    });

    function connectRfb() {
      if (rfbConnecting || rfbConnected || !latestReady) return;
      rfbConnecting = true;
      vncScreen.innerHTML = '';
      import('/obs-vnc/core/rfb.js').then(function (mod) {
        var RFB = mod.default;
        var wsProto = location.protocol === 'https:' ? 'wss://' : 'ws://';
        var wsUrl = wsProto + location.host + '/obs-vnc/websockify';
        var rfb = new RFB(vncScreen, wsUrl, {
          credentials: { password: 'vncpassword' }
        });
        rfb.scaleViewport = true;
        rfb.resizeSession = (resSelect.value === 'auto');
        rfb.clipViewport = false;
        rfb.addEventListener('connect', function () {
          rfbConnecting = false;
          rfbConnected = true;
        });
        rfb.addEventListener('disconnect', function () {
          rfbConnecting = false;
          rfbConnected = false;
          rfbClient = null;
        });
        rfb.addEventListener('credentialsrequired', function () {
          rfb.sendCredentials({ password: 'vncpassword' });
        });
        rfb.addEventListener('clipboard', function (e) {
          if (navigator.clipboard && navigator.clipboard.writeText && e.detail && e.detail.text) {
            navigator.clipboard.writeText(e.detail.text).catch(function () {});
          }
        });
        rfbClient = rfb;
      }).catch(function () {
        rfbConnecting = false;
      });
    }

    function disconnectRfb() {
      if (rfbClient) {
        try { rfbClient.disconnect(); } catch (_) {}
        rfbClient = null;
      }
      rfbConnected = false;
      rfbConnecting = false;
    }

    resSelect.addEventListener('change', function () {
      var val = resSelect.value;
      localStorage.setItem('obs_vnc_res_mode', val);
      fetch('/api/vnc/resolution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution: val })
      }).then(function () {
        if (rfbClient) {
          rfbClient.resizeSession = (val === 'auto');
          rfbClient.scaleViewport = true;
        }
      }).catch(function () {});
    });

    btnReconnect.addEventListener('click', function () {
      disconnectRfb();
      connectRfb();
    });

    btnRestartObs.addEventListener('click', function () {
      btnRestartObs.disabled = true;
      fetch('/api/vnc/start', { method: 'POST' })
        .finally(function () {
          btnRestartObs.disabled = false;
          setTimeout(pollVncStatus, 1000);
        });
    });

    btnRestartPc.addEventListener('click', function () {
      disconnectRfb();
      forceShowLogs = false;
      btnRestartPc.disabled = true;
      consoleEl.classList.remove('hidden');
      fetch('/api/vnc/restart-pc', { method: 'POST' })
        .finally(function () {
          btnRestartPc.disabled = false;
          pollVncStatus();
        });
    });

    btnResetIp.addEventListener('click', function () {
      pinggyDot.className = 'obs-dot';
      pinggyText.textContent = 'Generating IP...';
      currentTcpAddr = '';
      fetch('/api/vnc/reset-ip', { method: 'POST' }).catch(function () {});
    });

    btnLogs.addEventListener('click', function () {
      forceShowLogs = !forceShowLogs;
      if (forceShowLogs) consoleEl.classList.remove('hidden');
      else if (latestReady) consoleEl.classList.add('hidden');
      btnHideLogs.style.display = latestReady ? 'inline-flex' : 'none';
    });

    btnHideLogs.addEventListener('click', function () {
      forceShowLogs = false;
      if (latestReady) consoleEl.classList.add('hidden');
    });

    window.addEventListener('focus', function () {
      if (rfbClient && rfbConnected && activeTab === 'desktop' && navigator.clipboard && navigator.clipboard.readText) {
        navigator.clipboard.readText().then(function (t) {
          if (t && rfbClient) rfbClient.clipboardPasteFrom(t);
        }).catch(function () {});
      }
    });

    function pollVncStatus() {
      fetch('/api/vnc/status').then(function (r) { return r.json(); }).then(function (d) {
        latestReady = Boolean(d.vncOnline && d.novncOnline && !d.isSettingUp && !d.isRestarting);
        if (obsTabDot) {
          obsTabDot.className = latestReady ? 'ready' : ((d.isSettingUp || d.isRestarting) ? '' : 'offline');
        }
        if (latestReady) {
          statusDot.className = 'obs-dot ok';
          statusText.textContent = d.obsRunning ? 'OBS Desktop Ready' : 'VNC Ready (OBS Starting)';
        } else {
          statusDot.className = 'obs-dot';
          statusText.textContent = d.isSettingUp ? 'Installing & Setting Up...' : (d.isRestarting ? 'Restarting Desktop...' : 'Starting Desktop...');
        }
        verBadge.textContent = 'OBS ' + (d.obsVersion || '29') + (d.moveTransitionInstalled ? ' + Move' : '') + (d.obsWsOnline ? ' • WS:4455' : '');

        if (d.publicWebVncUrl) {
          currentWebUrl = d.publicWebVncUrl;
          webUrlText.textContent = d.publicWebVncUrl;
          btnNewTab.href = d.publicWebVncUrl;
          if (activeTab === 'desktop' && openLink) openLink.href = d.publicWebVncUrl;
        }

        var tun = d.tcpTunnel || {};
        if (tun.full && tun.status === 'online') {
          currentTcpAddr = tun.full;
          pinggyDot.className = 'obs-dot ok';
          if (pinggyText.textContent !== '✓ Copied!') pinggyText.textContent = tun.full;
        } else {
          currentTcpAddr = '';
          pinggyDot.className = tun.status === 'offline' ? 'obs-dot err' : 'obs-dot';
          if (pinggyText.textContent !== '✓ Copied!') pinggyText.textContent = tun.status === 'offline' ? 'Tunnel offline' : 'Connecting tunnel...';
        }

        conCmd.textContent = d.currentCommand || 'Provisioning & starting OBS 29 + VNC...';
        conProcs.textContent = (d.runningProcesses && d.runningProcesses.length) ? d.runningProcesses.join('\\n') : 'No active background command.';
        if (d.logs && d.logs.length) {
          var atBottom = conLogs.scrollHeight - conLogs.scrollTop - conLogs.clientHeight < 60;
          conLogs.textContent = d.logs.join('\\n');
          if (atBottom) conLogs.scrollTop = conLogs.scrollHeight;
        }
        btnHideLogs.style.display = latestReady ? 'inline-flex' : 'none';

        if (!latestReady || forceShowLogs) {
          consoleEl.classList.remove('hidden');
        } else {
          consoleEl.classList.add('hidden');
          connectRfb();
        }
      }).catch(function () {});
    }

    pollVncStatus();
    setInterval(pollVncStatus, 1800);
  }

  // Keep Tab 3 status dot synced even before user clicks Tab 3
  setInterval(function () {
    if (obsInitialized) return;
    fetch('/api/vnc/status').then(function (r) { return r.json(); }).then(function (d) {
      var ready = Boolean(d.vncOnline && d.novncOnline && !d.isSettingUp && !d.isRestarting);
      if (obsTabDot) obsTabDot.className = ready ? 'ready' : ((d.isSettingUp || d.isRestarting) ? '' : 'offline');
    }).catch(function () {});
  }, 4000);

  function switchPreviewTab(tab) {
    activeTab = tab;
    if (btnObs) btnObs.classList.toggle('active', tab === 'obs');
    if (btnFiles) btnFiles.classList.toggle('active', tab === 'files');
    if (btnDesktop) btnDesktop.classList.toggle('active', tab === 'desktop');
    if (fbPanel) fbPanel.classList.toggle('active', tab === 'files');
    if (obsPanel) obsPanel.classList.toggle('active', tab === 'desktop');
    if (openLink) {
      if (tab === 'obs') openLink.href = '/obs/';
      else if (tab === 'files') openLink.href = '/file-browser/';
      else openLink.href = '/obs-vnc/vnc.html?autoconnect=true&resize=remote&password=vncpassword';
    }
    if (tab === 'files') initFileBrowserTab();
    if (tab === 'desktop') initObsDesktopTab();
  }

  if (btnObs) btnObs.addEventListener('click', function () { switchPreviewTab('obs'); });
  if (btnFiles) btnFiles.addEventListener('click', function () { switchPreviewTab('files'); });
  if (btnDesktop) btnDesktop.addEventListener('click', function () { switchPreviewTab('desktop'); });
})();
</script>`;

    return obsRawHtml.replace(/<body([^>]*)>/i, `<body$1>${previewInjection}`);
  }

  const obsIndexPath = path.resolve(staticRoot, 'index.html');
  const fbIndexPath = path.resolve(fileBrowserDir, 'index.html');

  function sendObsWithTabSwitcher(res) {
    try {
      const rawHtml = fs.readFileSync(obsIndexPath, 'utf8');
      res.setHeader('Cache-Control', 'no-store');
      res.type('html').send(buildDualTabObsHtml(rawHtml));
    } catch (err) {
      res.status(500).send(`Failed to load UI: ${err.message}`);
    }
  }

  // Root / serves OBS Blade + zero-reload Shadow DOM File Browser tab switcher
  app.get('/', (_req, res) => {
    sendObsWithTabSwitcher(res);
  });

  // Direct standalone routes (/obs/ and /file-browser/) for "Open Tab ↗"
  app.get('/obs', (_req, res) => res.redirect(302, '/obs/'));
  app.use('/obs', express.static(staticRoot));
  app.get('/obs/*', (_req, res) => {
    res.sendFile(obsIndexPath);
  });

  if (fs.existsSync(fileBrowserDir)) {
    app.get(['/file-browser', '/files'], (req, res) => res.redirect(302, `${req.path}/`));
    app.use('/file-browser', express.static(fileBrowserDir));
    app.use('/files', express.static(fileBrowserDir));
    app.get('/file-browser/*', (_req, res) => {
      res.sendFile(fbIndexPath);
    });
  }

  app.use(express.static(staticRoot));
  app.get('*', (_req, res) => {
    sendObsWithTabSwitcher(res);
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] OBS Blade Backend running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server Error] Failed to start server:', err);
  process.exit(1);
});
