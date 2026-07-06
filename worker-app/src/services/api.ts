/**
 * API client for Klokd backend.
 * Dev: localhost:3000 on web, 10.0.2.2:3000 on Android emulator.
 * Prod: Railway.
 */
import { Platform } from 'react-native';

const DEV_BASE =
  Platform.OS === 'web' || Platform.OS === 'ios'
    ? 'http://localhost:3000/api/v1'
    : 'http://10.0.2.2:3000/api/v1';

const BASE_URL = __DEV__ ? DEV_BASE : 'https://klokd-production.up.railway.app/api/v1';

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
