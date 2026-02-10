// Centralized configuration for SocketIoService (env-driven for perf tests)
const env = (k, d) => (process.env[k] ?? d);

export const SOCKETIO_PORT = parseInt(env('SOCKETIO_PORT', '8016'), 10);
export const GATEWAY_URL = env('GATEWAY_URL', 'http://localhost:8000');

// Allow multiple origins via comma-separated list
const origins = env('WEBCLIENT_ORIGIN', 'http://localhost:3000');
export const WEBCLIENT_ORIGIN = origins.includes(',')
	? origins.split(',').map(s => s.trim()).filter(Boolean)
	: origins;

// Tunables for performance and resilience
export const RATE_LIMIT_WINDOW_MS = parseInt(env('RATE_LIMIT_WINDOW_MS', '1000'), 10);
export const RATE_LIMIT_MAX = parseInt(env('RATE_LIMIT_MAX', '5'), 10);
export const PING_TIMEOUT_MS = parseInt(env('PING_TIMEOUT_MS', '20000'), 10);
export const PING_INTERVAL_MS = parseInt(env('PING_INTERVAL_MS', '25000'), 10);
export const MAX_HTTP_BUFFER_SIZE = parseInt(env('MAX_HTTP_BUFFER_SIZE', '1048576'), 10);
export const SOCKETIO_TRANSPORTS = env('SOCKETIO_TRANSPORTS', 'websocket'); 

// Logging and auth header
export const LOG_LEVEL = env('LOG_LEVEL', 'info'); // silent | error | info | debug
export const AUTH_HEADER_NAME = env('AUTH_HEADER_NAME', 'Authorization');