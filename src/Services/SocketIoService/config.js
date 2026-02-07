// Centralized configuration for SocketIoService
export const SOCKETIO_PORT = parseInt(process.env.SOCKETIO_PORT || '8016', 10);
export const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:8000';
export const WEBCLIENT_ORIGIN = process.env.WEBCLIENT_ORIGIN || 'http://localhost:3000';