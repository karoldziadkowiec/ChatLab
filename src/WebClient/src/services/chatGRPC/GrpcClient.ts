import { Metadata } from 'grpc-web';
import AccountService from '../api/AccountService';
import GatewayPORT from "../../config/GatewayConfig";

export const CORE_GRPC_BASE = `http://localhost:${GatewayPORT}`;

export async function buildAuthMetadata(): Promise<Metadata> {
  const md: Metadata = {};
  try {
    const auth = await AccountService.getAuthorizationHeader();
    md['Authorization'] = auth;
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
