/**
 * useEmployerProfile — the signed-in employer's business verification state
 * (GET /identity/employers/profile). `canPostShifts` mirrors the server's
 * post-shift gate: KRA PIN on file + a current WIBA policy.
 *
 * Demo sessions hold no token, so they get status 'demo' and no profile —
 * screens show a labelled read-only state instead of pretending.
 */
import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export interface EmployerProfile {
  businessName: string;
  contactPerson: string | null;
  kraPinMasked: string | null;
  wiba: {
    status: 'missing' | 'expired' | 'confirmed';
    insurer: string | null;
    policyRef: string | null;
    expiresAt: string | null;
  };
  canPostShifts: boolean;
}

export function useEmployerProfile() {
  const { accessToken, account } = useAuth();
  const demoSession = !accessToken || !!account?.demo;

  const [profile, setProfile] = useState<EmployerProfile | null>(null);
  const [status, setStatus] = useState<'loading' | 'live' | 'demo' | 'error'>(demoSession ? 'demo' : 'loading');
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const reload = useCallback(() => setAttempt(n => n + 1), []);

  useEffect(() => {
    if (demoSession) {
      setStatus('demo');
      return;
    }
    let cancelled = false;
    setError(null);
    api<EmployerProfile>('/identity/employers/profile', { token: accessToken! })
      .then(p => {
        if (cancelled) return;
        setProfile(p);
        setStatus('live');
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

  return { profile, status, error, reload };
}
