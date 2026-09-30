import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { WebSocketServer, WebSocket } from 'ws';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ noServer: true });
const angularApp = new AngularNodeAppEngine();

app.use(express.json());

// In-memory WebSocket connected peers
interface WsConnectedClient {
  id: string;
  role: 'host' | 'device';
  code: string;
  deviceName: string;
  phoneBattery: number;
  spenBattery: number;
  ws: WebSocket;
  connectedAt: number;
}

const wsClients = new Map<WebSocket, WsConnectedClient>();

function broadcastPeers(code: string): void {
  const peersInRoom: { id: string; role: 'host' | 'device'; code: string; deviceName: string; phoneBattery: number; spenBattery: number; connectedAt: number }[] = [];
  wsClients.forEach((client) => {
    if (client.code === code || !code) {
      peersInRoom.push({
        id: client.id,
        role: client.role,
        code: client.code,
        deviceName: client.deviceName,
        phoneBattery: client.phoneBattery,
        spenBattery: client.spenBattery,
        connectedAt: client.connectedAt
      });
    }
  });

  const msg = JSON.stringify({
    type: 'PRESENCE_UPDATE',
    peers: peersInRoom,
    timestamp: Date.now()
  });

  wsClients.forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(msg);
    }
  });
}

wss.on('connection', (ws: WebSocket) => {
  const defaultClient: WsConnectedClient = {
    id: 'client-' + Math.random().toString(36).slice(2, 9),
    role: 'host',
    code: '839-204',
    deviceName: 'Workstation',
    phoneBattery: 88,
    spenBattery: 100,
    ws,
    connectedAt: Date.now()
  };
  wsClients.set(ws, defaultClient);

  ws.on('message', (data: Buffer | string) => {
    try {
      const message = JSON.parse(data.toString());
      const client = wsClients.get(ws);
      if (!client) return;

      if (message.type === 'JOIN') {
        client.id = message.senderId || client.id;
        client.role = message.senderRole || client.role;
        client.code = message.code || client.code;
        if (message.payload) {
          client.deviceName = message.payload.deviceName || client.deviceName;
          client.phoneBattery = message.payload.phoneBattery ?? client.phoneBattery;
          client.spenBattery = message.payload.spenBattery ?? client.spenBattery;
        }
        broadcastPeers(client.code);
        return;
      }

      if (message.type === 'PING') {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'PONG',
            clientTime: message.clientTime,
            serverTime: Date.now()
          }));
        }
        return;
      }

      // Broadcast drawing payloads, strokes, state changes to all other peers
      const outgoing = JSON.stringify({
        ...message,
        timestamp: Date.now()
      });

      wsClients.forEach((otherClient) => {
        if (otherClient.ws !== ws && otherClient.ws.readyState === WebSocket.OPEN) {
          otherClient.ws.send(outgoing);
        }
      });
    } catch (e) {
      console.warn('WS message parse error', e);
    }
  });

  ws.on('close', () => {
    const client = wsClients.get(ws);
    wsClients.delete(ws);
    if (client) {
      broadcastPeers(client.code);
    }
  });
});

// Handle WebSocket upgrade before Angular SSR
app.use('/api', (req, res, next) => {
  if (req.path === '/ws' && req.headers.upgrade?.toLowerCase() === 'websocket') {
    wss.handleUpgrade(req, req.socket, Buffer.alloc(0), (ws) => {
      wss.emit('connection', ws, req);
    });
    return;
  }
  next();
});

server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
  if (url.pathname === '/api/ws' || url.pathname === '/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
});

// In-memory Companion Sessions for Galaxy Note9 Remote Control
interface CompanionSession {
  code: string;
  createdAt: number;
  lastSeen: number;
  paired: boolean;
  deviceId?: string;
  deviceName?: string;
  phoneBattery?: number;
  spenBattery?: number;
  clients: express.Response[];
}

interface QueuedCommand {
  id: string;
  code?: string;
  action: string;
  payload: unknown;
  timestamp: number;
}

const companionSessions = new Map<string, CompanionSession>();
const globalRecentCommands: QueuedCommand[] = [];

// Periodic SSE keepalive to prevent proxy timeouts
setInterval(() => {
  companionSessions.forEach(session => {
    session.clients.forEach(client => {
      try {
        client.write(': keepalive\n\n');
      } catch {
        // ignore
      }
    });
  });
}, 12000);

// Cleanup stale sessions (> 2 hours old)
setInterval(() => {
  const now = Date.now();
  for (const [code, session] of companionSessions.entries()) {
    if (now - session.lastSeen > 2 * 60 * 60 * 1000) {
      companionSessions.delete(code);
    }
  }
}, 60000);

// 1. Create or retrieve pairing code for whiteboard
app.post('/api/companion/session', (req, res) => {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const formattedCode = `${code.slice(0, 3)}-${code.slice(3)}`;
  
  const session: CompanionSession = {
    code: formattedCode,
    createdAt: Date.now(),
    lastSeen: Date.now(),
    paired: false,
    phoneBattery: 88,
    spenBattery: 100,
    clients: []
  };

  companionSessions.set(formattedCode, session);
  res.json({ success: true, pairingCode: formattedCode });
});

// 2. Join session from Galaxy Note9 companion web app
app.post('/api/companion/pair', (req, res): void => {
  const { code, deviceName, phoneBattery, spenBattery } = req.body;
  let session = companionSessions.get(code);

  if (!session) {
    // Graceful auto-creation if session code wasn't pre-initialized
    session = {
      code,
      createdAt: Date.now(),
      lastSeen: Date.now(),
      paired: true,
      deviceName: deviceName || 'Samsung Galaxy Note9 (SM-N960F)',
      phoneBattery: phoneBattery ?? 88,
      spenBattery: spenBattery ?? 100,
      clients: []
    };
    companionSessions.set(code, session);
  } else {
    session.paired = true;
    session.lastSeen = Date.now();
    session.deviceName = deviceName || session.deviceName || 'Samsung Galaxy Note9 (SM-N960F)';
    if (phoneBattery !== undefined) session.phoneBattery = phoneBattery;
    if (spenBattery !== undefined) session.spenBattery = spenBattery;
  }

  // Notify laptop client via SSE
  session.clients.forEach(client => {
    client.write(`data: ${JSON.stringify({
      type: 'DEVICE_PAIRED',
      payload: {
        code,
        deviceName: session.deviceName,
        phoneBattery: session.phoneBattery,
        spenBattery: session.spenBattery,
        connectedAt: Date.now()
      }
    })}\n\n`);
  });

  res.json({
    success: true,
    message: 'Paired successfully with FlowBoard',
    deviceName: session.deviceName,
    code,
    serverTime: Date.now()
  });
});

// 3. Dispatch remote command from Note9
app.post('/api/companion/command', (req, res): void => {
  const { code, action, payload } = req.body;
  const cmdId = 'cmd-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
  const newCmd: QueuedCommand = {
    id: cmdId,
    code,
    action,
    payload,
    timestamp: Date.now()
  };

  globalRecentCommands.push(newCmd);
  if (globalRecentCommands.length > 80) {
    globalRecentCommands.shift();
  }

  let session = code ? companionSessions.get(code) : undefined;
  if (!session && code) {
    session = {
      code,
      createdAt: Date.now(),
      lastSeen: Date.now(),
      paired: true,
      clients: []
    };
    companionSessions.set(code, session);
  }
  if (session) {
    session.lastSeen = Date.now();
    session.paired = true;
  }

  const msgData = `data: ${JSON.stringify({
    type: 'COMMAND',
    id: cmdId,
    action,
    payload,
    timestamp: Date.now()
  })}\n\n`;

  // Forward command to all connected whiteboard SSE clients
  const notified = new Set<express.Response>();
  companionSessions.forEach(s => {
    s.clients.forEach(client => {
      if (!notified.has(client)) {
        notified.add(client);
        try {
          client.write(msgData);
        } catch {
          // ignore disconnected client
        }
      }
    });
  });

  res.json({ success: true, id: cmdId, action, timestamp: Date.now() });
});

// Polling fallback endpoint for pending commands
app.get('/api/companion/commands/recent', (req, res): void => {
  const since = Number(req.query['since']) || 0;
  const list = globalRecentCommands.filter(c => c.timestamp > since);
  res.json({ commands: list, serverTime: Date.now() });
});

// Real-time Ping-Pong Endpoint to measure genuine round-trip latency
app.post('/api/companion/ping', (req, res): void => {
  const { code, clientTime } = req.body;
  const now = Date.now();
  const session = code ? companionSessions.get(code) : undefined;
  if (session) {
    session.lastSeen = now;
  }
  res.json({
    pong: true,
    serverTime: now,
    latencyMs: clientTime ? Math.max(1, now - clientTime) : 0
  });
});

app.get('/api/companion/ping', (req, res): void => {
  res.json({
    pong: true,
    serverTime: Date.now()
  });
});

// Unpair device
app.post('/api/companion/unpair', (req, res): void => {
  const { code } = req.body;
  const session = companionSessions.get(code);
  if (session) {
    session.paired = false;
    session.clients.forEach(client => {
      client.write(`data: ${JSON.stringify({ type: 'DEVICE_UNPAIRED', code })}\n\n`);
    });
  }
  res.json({ success: true });
});

// 4. SSE Stream for Whiteboard on Laptop to receive real-time commands
app.get('/api/companion/events/:code', (req, res): void => {
  const code = req.params.code;
  let session = companionSessions.get(code);

  if (!session) {
    session = {
      code,
      createdAt: Date.now(),
      lastSeen: Date.now(),
      paired: false,
      clients: []
    };
    companionSessions.set(code, session);
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', code })}\n\n`);
  session.clients.push(res);

  req.on('close', () => {
    if (session) {
      session.clients = session.clients.filter(c => c !== res);
    }
  });
});

// 5. Query session status
app.get('/api/companion/status/:code', (req, res): void => {
  const session = companionSessions.get(req.params.code);
  if (!session) {
    res.json({ connected: false });
    return;
  }
  res.json({
    connected: session.paired,
    lastSeen: session.lastSeen,
    deviceName: session.deviceName || 'Galaxy Note9',
    phoneBattery: session.phoneBattery || 88,
    spenBattery: session.spenBattery || 100
  });
});

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  server.listen(port, () => {
    console.log(`Node Express + WebSocket Gateway server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
