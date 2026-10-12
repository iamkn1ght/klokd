/**
 * API client for the Klokd backend (octopus-api).
 *
 * Base URL resolution:
 *   1. EXPO_PUBLIC_API_URL — Expo inlines this at bundle time
 *      (`npx expo start --web` picks it up from web-app/.env).
 *   2. window.__KLOKD_API_URL__ — set before the bundle loads.
 *   3. Deployed Railway API — the default everywhere. For local work run
 *      octopus-api (`npm run dev`) and set EXPO_PUBLIC_API_URL=http://localhost:3000.
 */
import { newId, stampSend } from '../lib/requestIds';

const API_ORIGIN =
  process.env.EXPO_PUBLIC_API_URL ||
  (typeof window !== 'undefined' && (window as any).__KLOKD_API_URL__) ||
  'https://octopus-api-production.up.railway.app';

const BASE_URL = `${API_ORIGIN}/api/v1`;

/**
 * EXPO_PUBLIC_SIGNIN_MODE=early-access (set by the production Dockerfile)
 * swaps self-serve sign-in for the early-access waitlist. Unset = live sign-in.
 */
export const EARLY_ACCESS = process.env.EXPO_PUBLIC_SIGNIN_MODE === 'early-access';

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

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(stampSend(body)) : undefined,
    });
  } catch {
    throw new Error('Cannot reach the Klokd API. Check your connection and try again.');
  }

  const data = await res.json().catch(() => null);

  if (!res.ok || data?.success === false) {
    const err: any = new Error(data?.details?.[0]?.message || data?.error || `API error ${res.status}`);
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

export const API_ORIGIN_EXPORT = API_ORIGIN;
