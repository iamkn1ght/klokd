/**
 * useApiData — GET a path with the session token and track its state.
 *
 *   status: 'loading' | 'ready' | 'error'
 *   reload(): refetch without blanking what's on screen
 *   pollMs:  optional background refresh while mounted
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export function useApiData<T>(path: string | null, opts: { pollMs?: number } = {}) {
  const { accessToken } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const loaded = useRef(false);

  const reload = useCallback(() => setTick(n => n + 1), []);

  useEffect(() => {
    loaded.current = false;
    setData(null);
    setStatus('loading');
  }, [path]);

  useEffect(() => {
    if (!path || !accessToken) return;
    let cancelled = false;
    api<T>(path, { token: accessToken })
      .then(d => {
        if (cancelled) return;
        setData(d);
        setError(null);
        setStatus('ready');
        loaded.current = true;
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setError(e.message || 'The Klokd API didn’t answer.');
        // Keep showing the last good data on a failed background refresh.
        if (!loaded.current) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [path, accessToken, tick]);

  useEffect(() => {
    if (!opts.pollMs || !path) return;
    const t = setInterval(reload, opts.pollMs);
    return () => clearInterval(t);
  }, [opts.pollMs, path, reload]);

  return { data, status, error, reload, setData };
}

/** POST/PUT helper bound to the session token. */
export function useApiAction() {
  const { accessToken } = useAuth();
  return useCallback(
    <T = unknown>(path: string, body?: unknown, method: 'POST' | 'PUT' | 'PATCH' = 'POST') =>
      api<T>(path, { method, body: body ?? {}, token: accessToken! }),
    [accessToken]
  );
}
