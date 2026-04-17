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
  API_TIMEOUT_MS,
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX,
  PING_TIMEOUT_MS,
  PING_INTERVAL_MS,
  MAX_HTTP_BUFFER_SIZE,
  SOCKETIO_TRANSPORTS,
  LOG_LEVEL,
  AUTH_HEADER_NAME,
  ALLOW_NON_PARTICIPANTS_IN_CHATS,
  USE_DIRECT_DB,
  DB_CONNECTION_STRING,
  DB_ODBC_DRIVER
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
  httpAgent: new http.Agent({ keepAlive: true }),
  timeout: API_TIMEOUT_MS
});

// Optional direct DB mode (perf/load testing): bypass Gateway/Core REST.
const nodeEnv = (process.env.NODE_ENV ?? '').toLowerCase();
const isProd = nodeEnv === 'production';
if (USE_DIRECT_DB && isProd) {
  // Hard-stop: direct DB writes should not be enabled in production.
  console.error('USE_DIRECT_DB=true is not allowed in production.');
  process.exit(1);
}

const looksLikeIntegratedSecurity = (cs) => /(^|;)\s*(integrated security|trusted_connection)\s*=\s*true\s*(;|$)/i.test(String(cs || ''));
const looksLikeOdbcDriverString = (cs) => /(^|;)\s*driver\s*=\s*\{/i.test(String(cs || ''));

const parseConnectionString = (cs) => {
  const out = {};
  String(cs || '')
    .split(';')
    .map(s => s.trim())
    .filter(Boolean)
    .forEach(part => {
      const idx = part.indexOf('=');
      if (idx <= 0) return;
      const k = part.slice(0, idx).trim().toLowerCase();
      const v = part.slice(idx + 1).trim();
      out[k] = v;
    });
  return out;
};

const toOdbcTrustedConnectionString = (cs) => {
  // Convert ADO-style connection string to an ODBC-style one required by msnodesqlv8.
  // If the user already provided an ODBC string (Driver={...}), keep it as-is.
  if (looksLikeOdbcDriverString(cs)) return String(cs);

  const kv = parseConnectionString(cs);
  const server = kv['server'] || kv['data source'] || kv['address'] || kv['addr'] || kv['network address'] || '.';
  const database = kv['database'] || kv['initial catalog'] || 'ChatLab';

  const trustCert = (kv['trustservercertificate'] || '').toLowerCase();
  const trustYes = trustCert === 'true' || trustCert === 'yes' || trustCert === '1';

  // Note: the ODBC driver must be installed on the machine.
  const driver = DB_ODBC_DRIVER || 'ODBC Driver 17 for SQL Server';
  return `Driver={${driver}};Server=${server};Database=${database};Trusted_Connection=Yes;TrustServerCertificate=${trustYes ? 'Yes' : 'No'};`;
};

let _mssql = null;
let _dbPool = null;
let _dbPoolConnecting = null;

const getDbPool = async () => {
  if (!USE_DIRECT_DB) return null;
  if (!DB_CONNECTION_STRING) {
    throw new Error('USE_DIRECT_DB=true requires DB_CONNECTION_STRING to be set.');
  }

  if (_dbPool) return _dbPool;
  if (_dbPoolConnecting) return _dbPoolConnecting;

  _dbPoolConnecting = (async () => {
    const integrated = looksLikeIntegratedSecurity(DB_CONNECTION_STRING);

    if (integrated) {
      if (process.platform !== 'win32') {
        throw new Error('DB_CONNECTION_STRING uses Integrated Security/Trusted_Connection, which is only supported here on Windows. Use SQL auth (User Id/Password) instead.');
      }

      // Best-effort: use optional msnodesqlv8 driver for Windows auth.
      // Requires: npm i msnodesqlv8 and an installed ODBC driver.
      try {
        const mod = await import('mssql/msnodesqlv8');
        _mssql = mod?.default ?? mod;
      } catch {
        throw new Error('Integrated Security detected. Install optional dependency "msnodesqlv8" (and ensure an ODBC driver is installed), or set DB_CONNECTION_STRING to SQL auth (User Id/Password).');
      }

      const odbc = toOdbcTrustedConnectionString(DB_CONNECTION_STRING);
      _dbPool = await _mssql.connect(odbc);
      log.info('Direct DB mode enabled (SocketIoService -> SQL Server, Integrated Security)');
      return _dbPool;
    }

    const mod = await import('mssql');
    _mssql = mod?.default ?? mod;
    _dbPool = await _mssql.connect(DB_CONNECTION_STRING);
    log.info('Direct DB mode enabled (SocketIoService -> SQL Server)');
    return _dbPool;
  })();

  return _dbPoolConnecting;
};

const dbGetChatParticipants = async (chatId) => {
  const pool = await getDbPool();
  const req = pool.request();
  req.input('chatId', _mssql.Int, chatId);
  const res = await req.query('SELECT TOP (1) Id, User1Id, User2Id FROM Chats WHERE Id = @chatId');
  return res?.recordset?.[0] ?? null;
};

const dbInsertMessage = async (dto) => {
  const pool = await getDbPool();
  const req = pool.request();

  req.input('chatId', _mssql.Int, dto.chatId);
  req.input('content', _mssql.NVarChar(200), dto.content);
  req.input('senderId', _mssql.NVarChar(450), dto.senderId);
  req.input('receiverId', _mssql.NVarChar(450), dto.receiverId);
  req.input('techId', _mssql.Int, dto.communicationTechnologyId);
  req.input('timestamp', _mssql.DateTime2, new Date());

  const res = await req.query(`
    INSERT INTO Messages (ChatId, Content, SenderId, ReceiverId, CommunicationTechnologyId, Timestamp)
    OUTPUT inserted.Id, inserted.ChatId, inserted.Content, inserted.SenderId, inserted.ReceiverId, inserted.CommunicationTechnologyId, inserted.Timestamp
    VALUES (@chatId, @content, @senderId, @receiverId, @techId, @timestamp);
  `);

  const row = res?.recordset?.[0];
  if (!row) return null;

  // Match CoreService JSON (camelCase) shape.
  return {
    id: row.Id,
    chatId: row.ChatId,
    chat: null,
    content: row.Content,
    senderId: row.SenderId,
    sender: null,
    receiverId: row.ReceiverId,
    receiver: null,
    communicationTechnologyId: row.CommunicationTechnologyId,
    communicationTechnology: null,
    timestamp: row.Timestamp instanceof Date ? row.Timestamp.toISOString() : row.Timestamp
  };
};

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

      const numericChatId = Number(chatId);
      if (!Number.isFinite(numericChatId) || numericChatId <= 0) {
        if (typeof ack === 'function') ack({ ok: false, error: 'Invalid chatId' });
        return;
      }

      let chatUser1Id;
      let chatUser2Id;

      if (USE_DIRECT_DB) {
        const chat = await dbGetChatParticipants(numericChatId);
        if (!chat) {
          if (typeof ack === 'function') ack({ ok: false, error: 'Chat not found' });
          return;
        }
        chatUser1Id = chat.User1Id;
        chatUser2Id = chat.User2Id;
      } else {
        const authHeader = authorization || (socket.handshake?.auth?.authorization);
        const headers = authHeader ? { [AUTH_HEADER_NAME]: authHeader } : hsHeader;
        const resp = await api.get(`/api/core/chats/${numericChatId}`, { headers });
        const chat = resp.data || {};
        chatUser1Id = chat.user1Id;
        chatUser2Id = chat.user2Id;
      }

      log.debug('Join check', { chatId: numericChatId, userId, chatUser1Id, chatUser2Id });
      const allowed = `${chatUser1Id}` === `${userId}` || `${chatUser2Id}` === `${userId}`;
      if (!allowed) {
        log.info(`Unauthorized join attempt: userId=${userId} chatId=${numericChatId}`);
        socket.emit('join_error', 'Unauthorized join');
        socket.emit('error', 'Unauthorized join');
        if (typeof ack === 'function') ack({ ok: false, error: 'Unauthorized join' });
        return;
      }
      const room = `chat-${numericChatId}`;
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

      const numericChatId = Number(messageDto.chatId);
      if (!Number.isFinite(numericChatId) || numericChatId <= 0) {
        if (typeof ack === 'function') ack({ error: 'Invalid chatId' });
        return;
      }

      const room = `chat-${numericChatId}`;
      // Basic authorization: require the socket to have joined the room (unless load-testing override is enabled).
      if (!socket.data.loadTestingOverride && !socket.rooms.has(room)) {
        if (typeof ack === 'function') ack({ error: 'Not joined to this chat room' });
        return;
      }

      if (typeof messageDto.content === 'string' && messageDto.content.length > 200) {
        if (typeof ack === 'function') ack({ error: 'Message content exceeds 200 characters' });
        return;
      }

      let createdMessage;
      if (USE_DIRECT_DB) {
        createdMessage = await dbInsertMessage({ ...messageDto, chatId: numericChatId });
      } else {
        const authHeader = authorization || (socket.handshake?.auth?.authorization);
        const headers = authHeader ? { [AUTH_HEADER_NAME]: authHeader } : hsHeader;
        // Persist the message via the gateway Core API and use the created message for ack/broadcast
        const createResp = await api.post(`/api/core/messages`, messageDto, { headers });
        createdMessage = createResp.data;
      }

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
      const status = error?.response?.status;
      const upstreamMsg = error?.response?.data?.message || error?.response?.data?.error;
      log.error('Failed to persist/broadcast message:', { status, upstreamMsg, message: error?.message });

      // Provide a compact, actionable error. (Avoid dumping full upstream payloads.)
      const err = status
        ? { error: `Upstream error (${status})` }
        : (String(error?.message || '').toLowerCase().includes('timeout')
          ? { error: `Upstream timeout (${API_TIMEOUT_MS} ms)` }
          : { error: 'Failed to send message' });
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
  try {
    if (_dbPool) {
      // Best-effort; do not block shutdown on DB close.
      _dbPool.close();
    }
  } catch {
    // ignore
  }
  io.close(() => {
    httpServer.close(() => process.exit(0));
  });
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
