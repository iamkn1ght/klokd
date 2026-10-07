/**
 * useEmployerShifts — the signed-in employer's real posted shifts
 * (GET /shifts/mine) with full async states, mirroring useShifts.
 *
 *   status: 'loading' | 'live' | 'empty' | 'demo' | 'error'
 *
 * Demo sessions (and API outages for demo sessions) get the labelled sample
 * rows so the dashboard stays explorable without pretending to be live.
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

function demoShifts(): EmployerShift[] {
  const mk = (
    id: string,
    role: string,
    when: string,
    rate: number,
    applications: number,
    status: string
  ): EmployerShift => ({
    id,
    role,
    description: null,
    date: when,
    startTime: when,
    endTime: when,
    rateKes: rate,
    locationName: 'Westlands',
    status,
    applications,
  });
  return [
    mk('demo-e1', 'Waiter', 'Tonight · 5–10 PM', 1800, 12, 'POSTED'),
    mk('demo-e2', 'Barista', 'Tomorrow · 7 AM – 2 PM', 2100, 8, 'POSTED'),
    mk('demo-e3', 'Event steward', 'Sat · 8 PM – 1 AM', 1200, 4, 'POSTED'),
  ];
}

export function useEmployerShifts() {
  const { accessToken, account } = useAuth();
  const demoSession = !accessToken || !!account?.demo;

  const [shifts, setShifts] = useState<EmployerShift[] | null>(null);
  const [status, setStatus] = useState<'loading' | 'live' | 'empty' | 'demo' | 'error'>(
    demoSession ? 'demo' : 'loading'
  );
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setStatus('loading');
    setAttempt(n => n + 1);
  }, []);

  useEffect(() => {
    if (demoSession) {
      setShifts(demoShifts());
      setStatus('demo');
      return;
    }
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
  }, [accessToken, account?.demo, attempt]);

  return { shifts, status, error, retry };
}
