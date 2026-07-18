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

// Message size guardrail (characters). DB uses NVARCHAR(MAX), but we still cap payload size for safety.
export const MAX_MESSAGE_CONTENT_LENGTH = parseInt(env('MAX_MESSAGE_CONTENT_LENGTH', '10000'), 10);

// Upstream HTTP timeout (SocketIoService -> Gateway). Without this, axios can hang under load
// and the client will time out waiting for the Socket.IO ack.
export const API_TIMEOUT_MS = parseInt(env('API_TIMEOUT_MS', '15000'), 10);

// Logging and auth header
export const LOG_LEVEL = env('LOG_LEVEL', 'info'); // silent | error | info | debug
export const AUTH_HEADER_NAME = env('AUTH_HEADER_NAME', 'Authorization');

// Performance testing mode: bypass Gateway/Core REST and write directly to the DB.
// NOTE: Intended for perf/load tests; keep disabled in production.
export const USE_DIRECT_DB = env('USE_DIRECT_DB', 'false').toLowerCase() === 'true';

// DB connection string used only when USE_DIRECT_DB=true.
// Default targets local SQL Server (Windows auth) to support running without Docker.
// For Docker compose we override this via env (Server=sqlserver;User Id=sa;Password=...).
const DEFAULT_LOCAL_DB_CONNECTION_STRING = "Server=.;Database=ChatLab;Integrated Security=true;TrustServerCertificate=True;MultipleActiveResultSets=true";
export const DB_CONNECTION_STRING = env('DB_CONNECTION_STRING', DEFAULT_LOCAL_DB_CONNECTION_STRING);

// When using Integrated Security on Windows, we may use the optional msnodesqlv8 driver.
// This setting controls the ODBC driver name in the generated ODBC connection string.
export const DB_ODBC_DRIVER = env('DB_ODBC_DRIVER', 'ODBC Driver 17 for SQL Server');
