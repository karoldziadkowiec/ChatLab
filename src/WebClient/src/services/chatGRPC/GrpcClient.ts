import { Metadata } from 'grpc-web';
import AccountService from '../api/AccountService';
import GatewayPORT from "../../config/GatewayConfig";

export const CORE_GRPC_BASE = `http://localhost:${GatewayPORT}`;
// gRPC-web server streaming is frequently broken/buffered by gateways/proxies.
// Use CoreService directly for stable realtime delivery.
export const CORE_GRPC_DIRECT_BASE = 'http://localhost:8001';

export async function buildAuthMetadata(): Promise<Metadata> {
  const md: Metadata = {};
  try {
    const auth = await AccountService.getAuthorizationHeader();
    // grpc-web metadata keys become HTTP headers; header names are case-insensitive.
    // IMPORTANT: do NOT set both lowercase+uppercase variants, because browsers merge them
    // into a single comma-separated header value, which breaks JWT parsing.
    md['authorization'] = auth;

    // Fallback header that we explicitly parse on the server (helps when Authorization is stripped).
    md['x-authorization'] = auth;
  } catch {
    // leave empty; server will enforce [Authorize]
  }
  return md;
}

export function timestampToIso(ts: { getSeconds: () => number; getNanos: () => number }): string {
  const seconds = ts.getSeconds();
  const nanos = ts.getNanos();
  const ms = seconds * 1000 + Math.floor(nanos / 1_000_000);
  return new Date(ms).toISOString();
}
