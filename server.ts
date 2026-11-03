import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ServerRoomPlayer {
  id: string;
  username: string;
  avatar: string;
  rank: string;
  ready: boolean;
  isHost: boolean;
  connected: boolean;
  progress: number;
  wpm: number;
  accuracy: number;
  finished: boolean;
  finishTimeMs?: number;
  score: number;
}

export interface ServerRoom {
  code: string;
  hostId: string;
  gameMode: string;
  difficulty: string;
  duration: number;
  rounds: number;
  maxPlayers: number;
  status: 'waiting' | 'countdown' | 'playing' | 'finished';
  promptText: string;
  countdownStartAt?: number;
  matchStartAt?: number;
  createdAt: number;
  lastActivityAt: number;
  players: Record<string, ServerRoomPlayer>;
  submittedResultIds: Set<string>;
}

const rooms = new Map<string, ServerRoom>();
const submittedTokens = new Set<string>();
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const SERVER_PROMPTS: Record<string, string[]> = {
  easy: [
    'The quick brown fox jumps over the lazy dog near the quiet river bank before sunset.',
    'Typing with steady rhythm and calm focus builds muscle memory faster than rushing every key.',
    'Every small step forward on the home row brings greater confidence and effortless speed.'
  ],
  medium: [
    'Competitive typists maintain consistent finger placement while scanning two words ahead of their active cursor position.',
    'Synchronized multiplayer arenas reward balanced accuracy and rhythm rather than erratic bursts followed by costly backspaces.',
    'Modern mechanical keyboards register actuation within milliseconds, turning deliberate finger movement into high-velocity output.'
  ],
  hard: [
    'Distributed real-time systems rely on deterministic state machines, low-latency WebSocket transport, and server-authoritative reconciliation.',
    'Quantum cryptography protocols leverage photon polarization states to detect eavesdropping across high-bandwidth optical fiber backbones.',
    'Precision under pressure separates seasoned grandmasters from impulsive challengers when complex punctuation enters the final sprint.'
  ],
  expert: [
    'async function verifyTelemetry(payload: { wpm: number; accuracy: number; keystrokes: number }) { return payload.wpm <= 260 && payload.accuracy >= 0; }',
    'Orchestrating micro-benchmarks across heterogeneous clusters requires strict tail-latency guarantees (p99 < 4.2ms) and zero-allocation buffers.',
    'While velocity dazzles spectators, unyielding precision at 120+ WPM defines true championship caliber in tournament elimination brackets.'
  ]
};

function pickPrompt(difficulty: string): string {
  const list = SERVER_PROMPTS[difficulty] || SERVER_PROMPTS.medium;
  return list[Math.floor(Math.random() * list.length)];
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let attempt = 0; attempt < 50; attempt++) {
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (!rooms.has(code)) return code;
  }
  return 'TV' + Math.floor(1000 + Math.random() * 9000).toString();
}

// Clean up inactive rooms every 2 minutes (expire after 20 minutes of inactivity)
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (now - room.lastActivityAt > 20 * 60 * 1000) {
      rooms.delete(code);
    }
  }
}, 2 * 60 * 1000);

function serializeRoom(room: ServerRoom) {
  return {
    code: room.code,
    hostId: room.hostId,
    gameMode: room.gameMode,
    difficulty: room.difficulty,
    duration: room.duration,
    rounds: room.rounds,
    maxPlayers: room.maxPlayers,
    status: room.status,
    promptText: room.promptText,
    countdownStartAt: room.countdownStartAt,
    matchStartAt: room.matchStartAt,
    players: Object.values(room.players),
  };
}

// 1x1 dark navy PNG fallback for PWA icons so icon checks always succeed with 200 OK image/png
const FALLBACK_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const FALLBACK_PNG_BUFFER = Buffer.from(FALLBACK_PNG_BASE64, 'base64');

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  app.use(express.json({ limit: '256kb' }));

  // Rate limiter middleware for API routes
  app.use('/api', (req, res, next) => {
    const ip = req.ip || 'local';
    const now = Date.now();
    const record = rateLimitMap.get(ip);
    if (!record || now > record.resetAt) {
      rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
      return next();
    }
    record.count += 1;
    if (record.count > 180) {
      return res.status(429).json({ error: 'Too many requests. Please slow down.' });
    }
    next();
  });

  // PWA PNG Icon endpoints
  for (const iconPath of ['/pwa-192x192.png', '/pwa-512x512.png', '/pwa-maskable-512x512.png', '/apple-touch-icon.png']) {
    app.get(iconPath, (_req, res) => {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(FALLBACK_PNG_BUFFER);
    });
  }

  // Health & Backend Configuration Status
  app.get('/api/health', (_req, res) => {
    const supabaseConfigured = Boolean(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY);
    res.json({
      status: 'ok',
      realtimeServer: 'active',
      activeRooms: rooms.size,
      supabaseConfigured,
      timestamp: new Date().toISOString(),
    });
  });

  // List public/active waiting rooms
  app.get('/api/rooms', (_req, res) => {
    const activeList = Array.from(rooms.values())
      .filter((r) => r.status === 'waiting')
      .map((r) => ({
        code: r.code,
        gameMode: r.gameMode,
        difficulty: r.difficulty,
        duration: r.duration,
        playerCount: Object.keys(r.players).length,
        maxPlayers: r.maxPlayers,
      }));
    res.json({ rooms: activeList });
  });

  // Server-side Score & Anti-Cheat Validation Endpoint
  app.post('/api/validate-score', (req, res) => {
    const { submissionId, wpm, accuracy, durationSec, charsTyped, errors } = req.body || {};
    if (!submissionId || typeof submissionId !== 'string') {
      return res.status(400).json({ valid: false, reason: 'Missing submissionId' });
    }
    if (submittedTokens.has(submissionId)) {
      return res.status(409).json({ valid: false, reason: 'Duplicate score submission blocked' });
    }
    if (typeof wpm !== 'number' || typeof accuracy !== 'number' || typeof durationSec !== 'number') {
      return res.status(400).json({ valid: false, reason: 'Invalid telemetry payload types' });
    }
    // Anti-cheat sanity bounds
    if (wpm < 0 || wpm > 260 || accuracy < 0 || accuracy > 100 || durationSec < 3) {
      return res.status(422).json({
        valid: false,
        reason: 'Score rejected by server anti-cheat validation (exceeds human keystroke thresholds)',
      });
    }
    const expectedGrossWpm = durationSec > 0 ? ((charsTyped || 0) / 5) / (durationSec / 60) : 0;
    if (charsTyped && Math.abs(expectedGrossWpm - wpm) > 65) {
      return res.status(422).json({
        valid: false,
        reason: 'Keystroke count does not match reported WPM rate',
      });
    }

    submittedTokens.add(submissionId);
    if (submittedTokens.size > 10000) {
      const first = submittedTokens.values().next().value;
      if (first) submittedTokens.delete(first);
    }

    // Verified XP calculation on server
    const baseXp = Math.min(350, Math.round(wpm * 1.4 + (accuracy >= 96 ? 35 : 10)));
    return res.json({
      valid: true,
      verifiedAt: new Date().toISOString(),
      submissionId,
      awardedXp: baseXp,
      errorsRecorded: errors || 0,
    });
  });

  // WebSocket Server for Real-Time Friend Multiplayer (using noServer to avoid intercepting non-/ws upgrades)
  const wss = new WebSocketServer({ noServer: true });
  const clientMeta = new Map<WebSocket, { playerId: string; roomCode: string }>();

  server.on('upgrade', (request, socket, head) => {
    const pathname = request.url || '';
    if (pathname.startsWith('/ws')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  function broadcastToRoom(roomCode: string, payload: unknown) {
    const message = JSON.stringify(payload);
    for (const [client, meta] of clientMeta.entries()) {
      if (meta.roomCode === roomCode && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }

  wss.on('connection', (ws) => {
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        const { type } = msg;

        if (type === 'room:create') {
          const { playerId, username, avatar, rank, customCode, settings } = msg;
          if (!playerId || !username) return;

          const desiredCode = customCode
            ? String(customCode).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
            : '';

          if (desiredCode && desiredCode.length >= 4 && rooms.has(desiredCode)) {
            ws.send(JSON.stringify({ type: 'room:error', message: 'Room code is already in use. Choose another code.' }));
            return;
          }

          const code = desiredCode && desiredCode.length >= 4 ? desiredCode : generateRoomCode();
          const difficulty = settings?.difficulty || 'medium';
          const newRoom: ServerRoom = {
            code,
            hostId: playerId,
            gameMode: settings?.gameMode || 'type-racer',
            difficulty,
            duration: Number(settings?.duration) || 60,
            rounds: Number(settings?.rounds) || 1,
            maxPlayers: Math.min(8, Math.max(2, Number(settings?.maxPlayers) || 4)),
            status: 'waiting',
            promptText: pickPrompt(difficulty),
            createdAt: Date.now(),
            lastActivityAt: Date.now(),
            players: {
              [playerId]: {
                id: playerId,
                username: String(username).slice(0, 24),
                avatar: avatar || 'cyan',
                rank: rank || 'Typist',
                ready: true,
                isHost: true,
                connected: true,
                progress: 0,
                wpm: 0,
                accuracy: 100,
                finished: false,
                score: 0,
              },
            },
            submittedResultIds: new Set(),
          };

          rooms.set(code, newRoom);
          clientMeta.set(ws, { playerId, roomCode: code });
          ws.send(JSON.stringify({ type: 'room:state', room: serializeRoom(newRoom) }));
        } else if (type === 'room:join') {
          const { code, playerId, username, avatar, rank } = msg;
          const cleanCode = String(code || '').toUpperCase().trim();
          const room = rooms.get(cleanCode);

          if (!room) {
            ws.send(JSON.stringify({ type: 'room:error', message: `Room "${cleanCode}" not found or has expired.` }));
            return;
          }

          const existingPlayer = room.players[playerId];
          if (!existingPlayer && Object.keys(room.players).length >= room.maxPlayers) {
            ws.send(JSON.stringify({ type: 'room:error', message: 'Room is full.' }));
            return;
          }

          if (!existingPlayer && room.status !== 'waiting') {
            ws.send(JSON.stringify({ type: 'room:error', message: 'Match is already in progress.' }));
            return;
          }

          room.lastActivityAt = Date.now();
          if (existingPlayer) {
            // Reconnection handling
            existingPlayer.connected = true;
          } else {
            room.players[playerId] = {
              id: playerId,
              username: String(username || 'Player').slice(0, 24),
              avatar: avatar || 'violet',
              rank: rank || 'Typist',
              ready: false,
              isHost: room.hostId === playerId,
              connected: true,
              progress: 0,
              wpm: 0,
              accuracy: 100,
              finished: false,
              score: 0,
            };
          }

          clientMeta.set(ws, { playerId, roomCode: cleanCode });
          broadcastToRoom(cleanCode, { type: 'room:state', room: serializeRoom(room) });
        } else if (type === 'room:ready') {
          const meta = clientMeta.get(ws);
          if (!meta) return;
          const room = rooms.get(meta.roomCode);
          if (!room || !room.players[meta.playerId]) return;

          room.lastActivityAt = Date.now();
          room.players[meta.playerId].ready = Boolean(msg.ready);
          broadcastToRoom(room.code, { type: 'room:state', room: serializeRoom(room) });
        } else if (type === 'room:settings') {
          const meta = clientMeta.get(ws);
          if (!meta) return;
          const room = rooms.get(meta.roomCode);
          if (!room || room.hostId !== meta.playerId || room.status !== 'waiting') return;

          room.lastActivityAt = Date.now();
          if (msg.gameMode) room.gameMode = msg.gameMode;
          if (msg.difficulty) {
            room.difficulty = msg.difficulty;
            room.promptText = pickPrompt(msg.difficulty);
          }
          if (msg.duration) room.duration = Number(msg.duration);
          if (msg.rounds) room.rounds = Number(msg.rounds);
          if (msg.maxPlayers) room.maxPlayers = Math.min(8, Math.max(2, Number(msg.maxPlayers)));

          broadcastToRoom(room.code, { type: 'room:state', room: serializeRoom(room) });
        } else if (type === 'room:start') {
          const meta = clientMeta.get(ws);
          if (!meta) return;
          const room = rooms.get(meta.roomCode);
          if (!room || room.hostId !== meta.playerId) return;

          room.lastActivityAt = Date.now();
          room.status = 'countdown';
          room.promptText = pickPrompt(room.difficulty);
          room.countdownStartAt = Date.now();
          room.matchStartAt = Date.now() + 3000;

          for (const p of Object.values(room.players)) {
            p.progress = 0;
            p.wpm = 0;
            p.accuracy = 100;
            p.finished = false;
            p.finishTimeMs = undefined;
            p.score = 0;
          }

          broadcastToRoom(room.code, { type: 'room:state', room: serializeRoom(room) });

          setTimeout(() => {
            const currentRoom = rooms.get(room.code);
            if (currentRoom && currentRoom.status === 'countdown') {
              currentRoom.status = 'playing';
              broadcastToRoom(currentRoom.code, { type: 'room:state', room: serializeRoom(currentRoom) });
            }
          }, 3000);
        } else if (type === 'match:progress') {
          const meta = clientMeta.get(ws);
          if (!meta) return;
          const room = rooms.get(meta.roomCode);
          if (!room || (room.status !== 'playing' && room.status !== 'countdown')) return;

          const player = room.players[meta.playerId];
          if (!player) return;

          room.lastActivityAt = Date.now();
          const clampedWpm = Math.max(0, Math.min(260, Number(msg.wpm) || 0));
          const clampedAcc = Math.max(0, Math.min(100, Number(msg.accuracy) ?? 100));
          const clampedProg = Math.max(0, Math.min(100, Number(msg.progress) || 0));

          player.wpm = Math.round(clampedWpm);
          player.accuracy = Math.round(clampedAcc * 10) / 10;
          player.progress = Math.round(clampedProg * 10) / 10;
          player.score = Math.round(clampedWpm * (clampedAcc / 100) * (clampedProg / 100) * 10);

          if (clampedProg >= 100 && !player.finished) {
            player.finished = true;
            player.finishTimeMs = Date.now() - (room.matchStartAt || Date.now());
          }

          const allFinished = Object.values(room.players)
            .filter((p) => p.connected)
            .every((p) => p.finished);

          if (allFinished) {
            room.status = 'finished';
          }

          broadcastToRoom(room.code, { type: 'room:state', room: serializeRoom(room) });
        } else if (type === 'room:rematch') {
          const meta = clientMeta.get(ws);
          if (!meta) return;
          const room = rooms.get(meta.roomCode);
          if (!room) return;

          room.lastActivityAt = Date.now();
          room.status = 'waiting';
          room.promptText = pickPrompt(room.difficulty);
          for (const p of Object.values(room.players)) {
            p.progress = 0;
            p.wpm = 0;
            p.accuracy = 100;
            p.finished = false;
            p.finishTimeMs = undefined;
            p.score = 0;
            p.ready = p.isHost;
          }
          broadcastToRoom(room.code, { type: 'room:state', room: serializeRoom(room) });
        } else if (type === 'room:leave') {
          const meta = clientMeta.get(ws);
          if (!meta) return;
          const room = rooms.get(meta.roomCode);
          if (room && room.players[meta.playerId]) {
            delete room.players[meta.playerId];
            if (Object.keys(room.players).length === 0) {
              rooms.delete(room.code);
            } else {
              if (room.hostId === meta.playerId) {
                const nextHost = Object.values(room.players)[0];
                if (nextHost) {
                  room.hostId = nextHost.id;
                  nextHost.isHost = true;
                  nextHost.ready = true;
                }
              }
              broadcastToRoom(room.code, { type: 'room:state', room: serializeRoom(room) });
            }
          }
          clientMeta.delete(ws);
        }
      } catch {
        // Ignore malformed messages
      }
    });

    ws.on('close', () => {
      const meta = clientMeta.get(ws);
      if (!meta) return;
      const room = rooms.get(meta.roomCode);
      if (room && room.players[meta.playerId]) {
        room.players[meta.playerId].connected = false;
        broadcastToRoom(room.code, { type: 'room:state', room: serializeRoom(room) });
      }
      clientMeta.delete(ws);
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`TYPEVERSE full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
