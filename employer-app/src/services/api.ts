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
const API_ORIGIN =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ||
  'https://klokd-production.up.railway.app';

const BASE_URL = `${API_ORIGIN}/api/v1`;

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string;
}

export async function api<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();

  if (!res.ok || data.success === false) {
    throw new Error(data.error || `API error ${res.status}`);
  }

  return data.data ?? data;
}
