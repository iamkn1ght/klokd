/**
 * useData — GET a path with the session token; refetches when the screen
 * regains focus and (optionally) on an interval. Keeps the last good data on
 * a failed background refresh.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useApi } from './useApi';

export function useData<T>(path: string | null, opts: { pollMs?: number } = {}) {
  const { get } = useApi();
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const loaded = useRef(false);
  const getRef = useRef(get);
  getRef.current = get;

  const load = useCallback(async () => {
    if (!path) return;
    try {
      const d = await getRef.current<T>(path);
      setData(d);
      setError(null);
      setStatus('ready');
      loaded.current = true;
    } catch (e: any) {
      setError(e?.message ?? 'Couldn’t reach Klokd.');
      if (!loaded.current) setStatus('error');
    }
  }, [path]);

  useEffect(() => {
    loaded.current = false;
    setStatus('loading');
    setData(null);
  }, [path]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    if (!opts.pollMs) return;
    const t = setInterval(load, opts.pollMs);
    return () => clearInterval(t);
  }, [opts.pollMs, load]);

  return { data, status, error, reload: load };
}
