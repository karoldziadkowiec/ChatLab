import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';

const PORT = 8016;
const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'socketio' });
});

app.get('/api/ping', (req, res) => {
  res.json({ pong: true });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*'}
});

io.on('connection', (socket) => {
  console.log('Client connected', socket.id);
  socket.on('message', (msg) => {
    console.log('message:', msg);
    socket.emit('message', `echo: ${msg}`);
  });
  socket.on('disconnect', () => console.log('Client disconnected'));
});

httpServer.listen(PORT, () => {
  console.log(`Socket.IO service listening on http://localhost:${PORT}`);
});
