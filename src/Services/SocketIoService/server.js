import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import axios from 'axios';
import { SOCKETIO_PORT as CONFIG_PORT, GATEWAY_URL as CONFIG_GATEWAY_URL, WEBCLIENT_ORIGIN as CONFIG_WEBCLIENT_ORIGIN } from './config.js';

const PORT = CONFIG_PORT;
const CORE_API_BASE = CONFIG_GATEWAY_URL;
const WEBCLIENT_ORIGIN = CONFIG_WEBCLIENT_ORIGIN;
const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: WEBCLIENT_ORIGIN, methods: ['GET', 'POST'], credentials: true }
});

// Simple per-socket rate limiting
const RATE_LIMIT_WINDOW_MS = 1000;
const RATE_LIMIT_MAX = 5;

io.on('connection', (socket) => {
  console.log('Client connected', socket.id);
  socket.data.rate = { count: 0, windowStart: Date.now() };

  // Join a room per chatId so broadcasts only go to participants
  socket.on('join', async (payload) => {
    try {
      const { chatId, userId, authorization } = payload || {};
      if (!chatId || !userId) return;
      const authHeader = authorization || (socket.handshake?.auth?.authorization);
      const resp = await axios.get(`${CORE_API_BASE}/api/core/chats/${chatId}`, {
        headers: authHeader ? { Authorization: authHeader } : undefined
      });
      const chat = resp.data || {};
      const allowed = `${chat.user1Id}` === `${userId}` || `${chat.user2Id}` === `${userId}`;
      if (!allowed) {
        console.warn(`Unauthorized join attempt: userId=${userId} chatId=${chatId}`);
        socket.emit('error', 'Unauthorized join');
        return;
      }
      const room = `chat-${chatId}`;
      socket.join(room);
      console.log(`Socket ${socket.id} joined room ${room} (userId=${userId})`);
    } catch (e) {
      console.error('join error:', e?.response?.data || e.message);
      socket.emit('error', 'Join failed');
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

      // Rate limit check
      const now = Date.now();
      const rate = socket.data.rate || { count: 0, windowStart: now };
      if (now - rate.windowStart >= RATE_LIMIT_WINDOW_MS) {
        rate.windowStart = now;
        rate.count = 0;
      }
      rate.count += 1;
      socket.data.rate = rate;
      if (rate.count > RATE_LIMIT_MAX) {
        const err = { error: 'Rate limit exceeded' };
        if (typeof ack === 'function') ack(err);
        return;
      }

      const authHeader = authorization || (socket.handshake?.auth?.authorization);
      // Persist the message via the gateway Core API and use the created message for ack/broadcast
      const createResp = await axios.post(`${CORE_API_BASE}/api/core/messages`, messageDto, {
        headers: authHeader ? { Authorization: authHeader } : undefined
      });
      let createdMessage = createResp.data;

      const room = `chat-${messageDto.chatId}`;
      // Fallback: if created message not returned, fetch latest from chat
      if (!createdMessage || !createdMessage.id) {
        try {
          const listResp = await axios.get(`${CORE_API_BASE}/api/core/messages/chat/${messageDto.chatId}`, {
            headers: authHeader ? { Authorization: authHeader } : undefined
          });
          const messages = Array.isArray(listResp.data) ? listResp.data : [];
          createdMessage = messages.length > 0 ? messages[messages.length - 1] : null;
        } catch (e) {
          // ignore, will handle below
        }
      }

      if (createdMessage && createdMessage.id) {
        io.to(room).emit('message', createdMessage);
        if (typeof ack === 'function') ack(createdMessage);
        console.log('Broadcasted message to', room);
      } else {
        console.warn('Message persisted but created message not retrievable');
        if (typeof ack === 'function') ack({ error: 'Message persisted but not retrievable' });
      }
    } catch (error) {
      console.error('Failed to persist/broadcast message:', error?.response?.data || error.message);
      const err = { error: 'Failed to send message' };
      if (typeof ack === 'function') ack(err);
    }
  });

  socket.on('disconnect', () => console.log('Client disconnected'));
});

httpServer.listen(PORT, () => {
  console.log(`Socket.IO service listening on http://localhost:${PORT}`);
});
