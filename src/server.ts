import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import {join} from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

app.use(express.json());

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

const companionSessions = new Map<string, CompanionSession>();

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
  const session = companionSessions.get(code);

  if (!session) {
    res.status(404).json({ success: false, message: 'Invalid pairing code or session expired' });
    return;
  }

  session.paired = true;
  session.lastSeen = Date.now();
  session.deviceName = deviceName || 'Samsung Galaxy Note9 (SM-N960F)';
  if (phoneBattery !== undefined) session.phoneBattery = phoneBattery;
  if (spenBattery !== undefined) session.spenBattery = spenBattery;

  // Notify laptop client via SSE
  session.clients.forEach(client => {
    client.write(`data: ${JSON.stringify({
      type: 'DEVICE_PAIRED',
      payload: {
        deviceName: session.deviceName,
        phoneBattery: session.phoneBattery,
        spenBattery: session.spenBattery
      }
    })}\n\n`);
  });

  res.json({
    success: true,
    message: 'Paired successfully with FlowBoard',
    deviceName: session.deviceName
  });
});

// 3. Dispatch remote command from Note9
app.post('/api/companion/command', (req, res): void => {
  const { code, action, payload } = req.body;
  const session = companionSessions.get(code);

  if (!session) {
    res.status(404).json({ success: false, message: 'Session not found' });
    return;
  }

  session.lastSeen = Date.now();

  // Forward command to whiteboard SSE clients
  session.clients.forEach(client => {
    client.write(`data: ${JSON.stringify({
      type: 'COMMAND',
      action,
      payload,
      timestamp: Date.now()
    })}\n\n`);
  });

  res.json({ success: true, action });
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
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
