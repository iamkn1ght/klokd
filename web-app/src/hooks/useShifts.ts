/**
 * useShifts — the worker's nearby-shift feed with full async states.
 *
 *   status:
 *     'loading' → fetch in flight (skeletons render)
 *     'live'    → real rows from GET /shifts/available
 *     'empty'   → live load succeeded but zero shifts nearby
 *     'demo'    → sample feed (demo sessions, or API unreachable)
 *     'error'   → live fetch failed for a signed-in session (retry offered)
 */
import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { DEMO_SHIFTS, Shift } from './demoShifts';

export type FeedStatus = 'loading' | 'live' | 'empty' | 'demo' | 'error';

// Nairobi CBD — the feed is city-wide at this stage; distance text is
// relative to CBD until the worker's last clock-in geohash is available
// (DPA: Klokd never stores worker coords).
const CBD = { lat: -1.2864, lng: 36.8172 };

function timeRange(start: Date, end: Date): string {
  const fmt = (d: Date) =>
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${fmt(start)} – ${fmt(end)}`;
}

function dayLabel(d: Date): string {
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return 'Today';
  if (same(d, tomorrow)) return 'Tomorrow';
  return d.toLocaleDateString('en-KE', { weekday: 'short' });
}

interface ApiShift {
  id: string;
  role: string;
  startTime: string;
  endTime: string;
  date: string;
  rateKes: number;
  locationName: string | null;
  distanceMeters: number;
  employer: { businessName: string; ratingAggregate: number | null; totalShifts: number } | null;
}

function mapRow(s: ApiShift): Shift {
  return {
    id: s.id,
    role: s.role.charAt(0).toUpperCase() + s.role.slice(1),
    venue: s.employer?.businessName ?? 'Venue',
    area: s.locationName ?? 'Nairobi',
    date: dayLabel(new Date(s.date)),
    time: timeRange(new Date(s.startTime), new Date(s.endTime)),
    pay: s.rateKes,
    dist: s.distanceMeters != null ? `${(s.distanceMeters / 1000).toFixed(1)} km` : '—',
    rating: s.employer?.ratingAggregate ?? null,
    shifts: s.employer?.totalShifts ?? 0,
  };
}

export function useShifts() {
  const { accessToken, account } = useAuth();
  const demoSession = !accessToken || !!account?.demo;

  const [shifts, setShifts] = useState<Shift[]>(DEMO_SHIFTS);
  const [status, setStatus] = useState<FeedStatus>(demoSession ? 'demo' : 'loading');
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // Apply flow — per-shift in-flight set + the set of shift IDs this worker
  // has already applied to (server-confirmed), so the UI can disable the
  // button honestly instead of letting the API reject a duplicate.
  const [applying, setApplying] = useState<Set<string>>(new Set());
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());

  const retry = useCallback(() => {
    setStatus('loading');
    setAttempt(n => n + 1);
  }, []);

  useEffect(() => {
    if (demoSession) {
      setShifts(DEMO_SHIFTS);
      setStatus('demo');
      return;
    }
    let cancelled = false;
    setStatus('loading');
    setError(null);
    api<ApiShift[]>(`/shifts/available?lat=${CBD.lat}&lng=${CBD.lng}&radiusKm=25`, {
      token: accessToken!,
    })
      .then(rows => {
        if (cancelled) return;
        const mapped = (rows ?? []).map(mapRow);
        setShifts(mapped);
        setStatus(mapped.length === 0 ? 'empty' : 'live');
        // Hydrate which shifts this worker already applied to, so Apply
        // buttons render their true state (applied/disabled) on arrival.
        // Non-fatal: failure just leaves the buttons enabled.
        api<{ id: string; shift: { id: string } }[]>('/shifts/my/applications', {
          token: accessToken!,
        })
          .then(apps => {
            if (cancelled) return;
            setAppliedIds(new Set((apps ?? []).map(a => a.shift.id)));
          })
          .catch(() => undefined);
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

  /**
   * Apply to a shift. Resolves true when the application is in, throws with
   * a user-safe message otherwise. Demo sessions never hit the API — the
   * caller shows the sign-in prompt instead.
   */
  const apply = useCallback(
    async (shiftId: string): Promise<boolean> => {
      if (demoSession) return false;
      if (appliedIds.has(shiftId) || applying.has(shiftId)) return true;
      setApplying(prev => new Set(prev).add(shiftId));
      try {
        await api<{ id: string }>(`/shifts/${shiftId}/apply`, {
          method: 'POST',
          token: accessToken!,
        });
        setAppliedIds(prev => new Set(prev).add(shiftId));
        return true;
      } finally {
        setApplying(prev => {
          const next = new Set(prev);
          next.delete(shiftId);
          return next;
        });
      }
    },
    [demoSession, accessToken, appliedIds, applying]
  );

  return { shifts, status, error, retry, apply, applying, appliedIds };
}
