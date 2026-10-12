/**
 * API client for Klokd backend.
 *
 * Base URL resolution:
 *   1. EXPO_PUBLIC_API_URL (origin, no path) — set when pointing at a local
 *      or tunnelled API during development.
 *   2. Deployed Railway API — the default everywhere. A physical phone can
 *      never reach the dev machine's localhost, so the deployed API is the
 *      only safe default for real devices.
 */
import { newId, stampSend } from '../lib/requestIds';

const API_ORIGIN =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ||
  'https://octopus-api-production.up.railway.app';

const BASE_URL = `${API_ORIGIN}/api/v1`;

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string;
}

async function call<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  // Every write gets its own key so a retried request is recognised, not duplicated.
  if (method !== 'GET') headers['Idempotency-Key'] = newId();

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(stampSend(body)) : undefined,
  });

  const data = await res.json();

  if (!res.ok || data.success === false) {
    const err: any = new Error(data.error || `API error ${res.status}`);
    err.status = res.status;
    throw err;
  }

  return data.data ?? data;
}

// ─── Session renewal ────────────────────────────────────
// Access tokens last 15 minutes. When a signed-in request is refused as
// expired, renew once with the refresh token (shared by concurrent requests),
// retry, and end the session only if renewal fails. The auth context supplies
// where tokens live and what to do on renewal / expiry.
export interface SessionHooks {
  getRefreshToken: () => Promise<string | null> | string | null;
  onRenewed: (accessToken: string) => Promise<void> | void;
  onExpired: () => void;
}

let session: SessionHooks | null = null;
export function setSessionHooks(hooks: SessionHooks | null) {
  session = hooks;
}

let renewing: Promise<string | null> | null = null;
function renewAccessToken(): Promise<string | null> {
  if (!session) return Promise.resolve(null);
  if (!renewing) {
    renewing = (async () => {
      try {
        const refreshToken = await session!.getRefreshToken();
        if (!refreshToken) return null;
        const r = await call<{ accessToken: string }>('/auth/refresh', { method: 'POST', body: { refreshToken } });
        await session!.onRenewed(r.accessToken);
        return r.accessToken;
      } catch {
        return null;
      } finally {
        // Callers already waiting keep this result; later expiries renew afresh.
        renewing = null;
      }
    })();
  }
  return renewing;
}

export async function api<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  try {
    return await call<T>(path, options);
  } catch (e: any) {
    // Auth endpoints manage their own tokens; only signed-in calls renew.
    if (e?.status !== 401 || !options.token || path.startsWith('/auth/')) throw e;
    const fresh = await renewAccessToken();
    if (!fresh) {
      session?.onExpired();
      throw new Error('Your session has ended. Please sign in again.');
    }
    return call<T>(path, { ...options, token: fresh });
  }
}
