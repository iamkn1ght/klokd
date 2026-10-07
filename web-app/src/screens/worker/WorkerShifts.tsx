/**
 * Worker Shifts (web) — the worker's real applications list.
 *
 * Live from GET /shifts/my/applications for signed-in accounts: every shift
 * this worker has applied to, with the application's current state. Skeleton
 * while loading, retry on failure, and the labelled demo feed for demo
 * sessions (payments rails aren't live, so demo rows are honest samples).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GlassCard, FadeUp } from '../../components/KlokdLayout';
import { Eyebrow, StatusPill, Tone } from '../../components/Primitives';
import { ShiftCardSkeleton, ErrorState, EmptyState } from '../../components/States';
import { colors, spacing, radius } from '../../theme';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { DEMO_SHIFTS } from '../../hooks/demoShifts';

type AppStatus = 'PENDING' | 'SELECTED' | 'REJECTED' | 'WITHDRAWN';

const STATUS_TONE: Record<AppStatus, Tone> = {
  PENDING: 'warn',
  SELECTED: 'mint',
  REJECTED: 'err',
  WITHDRAWN: 'neutral',
};

const STATUS_LABEL: Record<AppStatus, string> = {
  PENDING: 'Applied · waiting',
  SELECTED: 'Selected ✓',
  REJECTED: 'Not selected',
  WITHDRAWN: 'Withdrawn',
};

interface MyApplication {
  id: string;
  status: AppStatus;
  appliedAt: string;
  shift: {
    id: string;
    role: string;
    venue: string;
    area: string | null;
    date: string;
    startTime: string;
    endTime: string;
    rateKes: number;
    shiftStatus: string;
  };
}

function demoRows(): MyApplication[] {
  // Honest labelled demo rows — same shape the API returns.
  return DEMO_SHIFTS.slice(0, 3).map((s, i) => ({
    id: `demo-${s.id}`,
    status: (['PENDING', 'SELECTED', 'PENDING'] as AppStatus[])[i],
    appliedAt: new Date(Date.now() - (i + 1) * 3600_000).toISOString(),
    shift: {
      id: s.id,
      role: s.role,
      venue: s.venue,
      area: s.area,
      date: s.date,
      startTime: s.time.split('–')[0]?.trim() ?? '09:00',
      endTime: s.time.split('–')[1]?.trim() ?? '17:00',
      rateKes: s.pay,
      shiftStatus: 'POSTED',
    },
  }));
}

function whenLabel(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
}

export function WorkerShifts() {
  const { accessToken, account } = useAuth();
  const demoSession = !accessToken || !!account?.demo;

  const [rows, setRows] = useState<MyApplication[] | null>(null);
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
      setRows(demoRows());
      setStatus('demo');
      return;
    }
    let cancelled = false;
    setStatus('loading');
    setError(null);
    api<MyApplication[]>('/shifts/my/applications', { token: accessToken! })
      .then(apps => {
        if (cancelled) return;
        setRows(apps ?? []);
        setStatus((apps ?? []).length === 0 ? 'empty' : 'live');
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

  return (
    <View>
      <View style={styles.head}>
        <View>
          <Eyebrow>MY SHIFTS</Eyebrow>
          <Text style={styles.h2}>
            {status === 'live' && `${rows!.length} application${rows!.length === 1 ? '' : 's'} in flight.`}
            {status === 'loading' && 'Loading your applications…'}
            {status === 'empty' && 'You haven’t applied to anything yet.'}
            {status === 'demo' && 'Sample applications.'}
            {status === 'error' && 'Couldn’t load your applications.'}
          </Text>
        </View>
      </View>

      {status === 'loading' && (
        <View style={styles.stack}>
          <ShiftCardSkeleton />
          <ShiftCardSkeleton />
        </View>
      )}

      {status === 'error' && (
        <ErrorState
          title="Couldn’t load your applications."
          detail={error ?? 'The Klokd API didn’t answer.'}
          onRetry={retry}
        />
      )}

      {status === 'empty' && (
        <EmptyState
          title="No applications yet."
          detail="Open the Home tab and hit “Apply now” on any shift — it lands here instantly so you can track it."
        />
      )}

      {(status === 'live' || status === 'demo') && (
        <View style={styles.stack}>
          {rows!.map((a, i) => (
            <FadeUp key={a.id} delay={100 + i * 60}>
              <GlassCard padding={spacing.lg} style={styles.row}>
                <View style={styles.rowLeft}>
                  <Text style={styles.role}>{a.shift.role}</Text>
                  <Text style={styles.venue}>{a.shift.venue}</Text>
                  <Text style={styles.meta}>
                    {a.shift.area ?? 'Nairobi'} · applied {whenLabel(a.appliedAt)}
                  </Text>
                </View>
                <View style={styles.rowRight}>
                  <Text style={styles.pay}>KES {a.shift.rateKes.toLocaleString()}</Text>
                  <StatusPill tone={STATUS_TONE[a.status]}>{STATUS_LABEL[a.status]}</StatusPill>
                </View>
              </GlassCard>
            </FadeUp>
          ))}
          {status === 'demo' && (
            <Text style={styles.demoNote}>Demo session — sample rows only. Sign in with your phone to see your real applications.</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { marginBottom: spacing.lg },
  h2: { color: colors.white, fontSize: 24, fontWeight: '900', letterSpacing: -1, marginTop: 6 },
  stack: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowLeft: { flex: 1, minWidth: 180 },
  role: { color: colors.white, fontSize: 15, fontWeight: '900', letterSpacing: -0.3 },
  venue: { color: colors.white75, fontSize: 13, marginTop: 2, fontWeight: '700' },
  meta: { color: colors.white55, fontSize: 11.5, marginTop: 4, fontWeight: '600' },
  rowRight: { alignItems: 'flex-end', gap: 6 },
  pay: { color: colors.white, fontSize: 16, fontWeight: '900', letterSpacing: -0.4 },
  demoNote: {
    color: colors.white45,
    fontSize: 11.5,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.white03,
    borderWidth: 1,
    borderColor: colors.white06,
    overflow: 'hidden',
  },
});
