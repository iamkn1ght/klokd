/**
 * useEmployerShifts — the signed-in employer's real posted shifts
 * (GET /shifts/mine) with full async states, mirroring useShifts.
 *
 *   status: 'loading' | 'live' | 'empty' | 'error'
 */
import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export interface EmployerShift {
  id: string;
  role: string;
  description: string | null;
  date: string;
  startTime: string;
  endTime: string;
  rateKes: number;
  locationName: string | null;
  status: string;
  applications: number;
}

export function useEmployerShifts() {
  const { accessToken } = useAuth();

  const [shifts, setShifts] = useState<EmployerShift[] | null>(null);
  const [status, setStatus] = useState<'loading' | 'live' | 'empty' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setStatus('loading');
    setAttempt(n => n + 1);
  }, []);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    setStatus('loading');
    setError(null);
    api<EmployerShift[]>('/shifts/mine', { token: accessToken! })
      .then(rows => {
        if (cancelled) return;
        setShifts(rows ?? []);
        setStatus((rows ?? []).length === 0 ? 'empty' : 'live');
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setError(e.message || 'The Klokd API didn’t answer.');
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, attempt]);

  return { shifts, status, error, retry };
}
