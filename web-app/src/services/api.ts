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

export async function api<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Cannot reach the Klokd API. Check your connection and try again.');
  }

  const data = await res.json().catch(() => null);

  if (!res.ok || data?.success === false) {
    throw new Error(data?.details?.[0]?.message || data?.error || `API error ${res.status}`);
  }

  return data.data ?? data;
}

export const API_ORIGIN_EXPORT = API_ORIGIN;
