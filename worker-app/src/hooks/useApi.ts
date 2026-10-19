import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

type Extra = { timeoutMs?: number };

/**
 * Hook that wraps the api() function with the current auth token.
 * Usage: const { get, post, put } = useApi();
 */
export function useApi() {
  const { getToken } = useAuth();

  const request = useCallback(async <T = unknown>(
    path: string,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
    body?: unknown,
    extra?: Extra,
  ): Promise<T> => {
    const token = await getToken();
    return api<T>(path, { method, body, token: token || undefined, ...extra });
  }, [getToken]);

  return {
    get: <T = unknown>(path: string) => request<T>(path, 'GET'),
    post: <T = unknown>(path: string, body?: unknown, extra?: Extra) => request<T>(path, 'POST', body, extra),
    put: <T = unknown>(path: string, body?: unknown) => request<T>(path, 'PUT', body),
    patch: <T = unknown>(path: string, body?: unknown) => request<T>(path, 'PATCH', body),
    del: <T = unknown>(path: string) => request<T>(path, 'DELETE'),
  };
}
