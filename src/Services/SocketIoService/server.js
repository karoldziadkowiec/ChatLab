import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import axios from 'axios';
import http from 'http';
import {
  SOCKETIO_PORT as CONFIG_PORT,
  GATEWAY_URL as CONFIG_GATEWAY_URL,
  WEBCLIENT_ORIGIN as CONFIG_WEBCLIENT_ORIGIN,
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX,
  PING_TIMEOUT_MS,
  PING_INTERVAL_MS,
  MAX_HTTP_BUFFER_SIZE,
  SOCKETIO_TRANSPORTS,
  LOG_LEVEL,
  AUTH_HEADER_NAME,
  ALLOW_NON_PARTICIPANTS_IN_CHATS
} from './config.js';

const PORT = CONFIG_PORT;
const WEBCLIENT_ORIGIN = CONFIG_WEBCLIENT_ORIGIN;
const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: WEBCLIENT_ORIGIN, methods: ['GET', 'POST'], credentials: true },
  transports: SOCKETIO_TRANSPORTS.split(',').map(s => s.trim()),
  pingTimeout: PING_TIMEOUT_MS,
  pingInterval: PING_INTERVAL_MS,
  maxHttpBufferSize: MAX_HTTP_BUFFER_SIZE
});

// Minimal logger
const levels = { silent: 0, error: 1, info: 2, debug: 3 };
const lvl = levels[LOG_LEVEL] ?? 2;
const log = {
  error: (...a) => lvl >= 1 && console.error(...a),
  info: (...a) => lvl >= 2 && console.log(...a),
  debug: (...a) => lvl >= 3 && console.debug(...a)
};

// Axios client with keep-alive
const api = axios.create({
  baseURL: CONFIG_GATEWAY_URL,
  httpAgent: new http.Agent({ keepAlive: true })
});

// Simple per-socket rate limiting
const RATE = { windowMs: RATE_LIMIT_WINDOW_MS, max: RATE_LIMIT_MAX };

io.on('connection', (socket) => {
  log.debug('Client connected', socket.id);
  socket.data.rate = { count: 0, windowStart: Date.now() };

  const hsAuth = socket.handshake?.auth || {};
  const hsHeader = hsAuth.authorization || hsAuth.token
    ? { [AUTH_HEADER_NAME]: hsAuth.authorization || `Bearer ${hsAuth.token}` }
    : undefined;

  // Join a room per chatId so broadcasts only go to participants
  socket.on('join', async (payload, ack) => {
    try {
      const { chatId, userId, authorization } = payload || {};
      if (!chatId || !userId) {
        if (typeof ack === 'function') ack({ ok: false, error: 'Invalid join payload' });
        return;
      }

      const allowNonParticipants = (process.env.NODE_ENV !== 'production') && ALLOW_NON_PARTICIPANTS_IN_CHATS;
      if (allowNonParticipants) {
        const room = `chat-${chatId}`;
        socket.join(room);
        socket.data.loadTestingOverride = true;
        log.debug(`Socket ${socket.id} joined room ${room} (userId=${userId}, load-testing override)`);
        if (typeof ack === 'function') ack({ ok: true });
        return;
      }

      const authHeader = authorization || (socket.handshake?.auth?.authorization);
      const headers = authHeader ? { [AUTH_HEADER_NAME]: authHeader } : hsHeader;
      const resp = await api.get(`/api/core/chats/${chatId}`, { headers });
      const chat = resp.data || {};
      log.debug('Join check', { chatId, userId, chatUser1Id: chat.user1Id, chatUser2Id: chat.user2Id });
      const allowed = `${chat.user1Id}` === `${userId}` || `${chat.user2Id}` === `${userId}`;
      if (!allowed) {
        log.info(`Unauthorized join attempt: userId=${userId} chatId=${chatId}`);
        socket.emit('join_error', 'Unauthorized join');
        socket.emit('error', 'Unauthorized join');
        if (typeof ack === 'function') ack({ ok: false, error: 'Unauthorized join' });
        return;
      }
      const room = `chat-${chatId}`;
      socket.join(room);
      socket.data.loadTestingOverride = false;
      log.debug(`Socket ${socket.id} joined room ${room} (userId=${userId})`);
      if (typeof ack === 'function') ack({ ok: true });
    } catch (e) {
      log.error('join error:', e?.response?.data || e.message);
      socket.emit('join_error', 'Join failed');
      socket.emit('error', 'Join failed');
      if (typeof ack === 'function') ack({ ok: false, error: 'Join failed' });
    }
  });

  // Payload: { dto: MessageSendDTO, authorization?: string }
  socket.on('send_message', async (payload, ack) => {
    try {
      const { dto: messageDto, authorization } = payload || {};
      if (!messageDto || !messageDto.chatId || !messageDto.senderId || !messageDto.receiverId || !messageDto.content) {
        const err = { error: 'Invalid message payload' };
        if (typeof ack === 'function') ack(err);
        return;
      }

      // Rate limit check (disabled when load-testing override is enabled)
      if (!socket.data.loadTestingOverride) {
        const now = Date.now();
        const rate = socket.data.rate || { count: 0, windowStart: now };
        if (now - rate.windowStart >= RATE.windowMs) {
          rate.windowStart = now;
          rate.count = 0;
        }
        rate.count += 1;
        socket.data.rate = rate;
        if (rate.count > RATE.max) {
          const err = { error: 'Rate limit exceeded' };
          if (typeof ack === 'function') ack(err);
          return;
        }
      }

      const authHeader = authorization || (socket.handshake?.auth?.authorization);
      const headers = authHeader ? { [AUTH_HEADER_NAME]: authHeader } : hsHeader;
      // Persist the message via the gateway Core API and use the created message for ack/broadcast
      const createResp = await api.post(`/api/core/messages`, messageDto, { headers });
      let createdMessage = createResp.data;

      const room = `chat-${messageDto.chatId}`;
      // Skip fallback fetch to reduce load under perf tests

      if (createdMessage && createdMessage.id) {
        io.to(room).emit('message', createdMessage);
        if (typeof ack === 'function') ack(createdMessage);
        log.debug('Broadcasted message to', room);
      } else {
        log.info('Message persisted but created message not retrievable');
        if (typeof ack === 'function') ack({ error: 'Message persisted but not retrievable' });
      }
    } catch (error) {
      log.error('Failed to persist/broadcast message:', error?.response?.data || error.message);
      const err = { error: 'Failed to send message' };
      if (typeof ack === 'function') ack(err);
    }
  });

  socket.on('disconnect', () => lvl >= 3 && console.debug('Client disconnected'));
});

httpServer.listen(PORT, () => {
  log.info(`Socket.IO service listening on http://localhost:${PORT}`);
});

// Graceful shutdown
const shutdown = () => {
  log.info('Shutting down SocketIoService...');
  io.close(() => {
    httpServer.close(() => process.exit(0));
  });
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
