/**
 * Attendance (admin) — the ops view of the on-site flow. REAL data:
 *
 *   Review queue   GET  /attendance/admin/flags           flagged events, oldest risk first
 *                  POST /attendance/admin/events/:id/review   clear | escalate (+ note)
 *   Override watch GET  /attendance/admin/overrides       employers who start shifts
 *                                                         without the worker's PIN
 *
 * Flags never block a worker on their own; this queue is where a person
 * decides whether a flag means anything.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { GlassCard, FadeUp } from '../../components/KlokdLayout';
import { Eyebrow, StatusPill, GradientBtn, GhostBtn } from '../../components/Primitives';
import { Field, Chip } from '../../components/Form';
import { ErrorState, EmptyState } from '../../components/States';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { colors, spacing, radius } from '../../theme';

interface FlaggedEvent {
  id: string;
  type: string;
  method: string;
  at: string;
  flags: string[];
  reason: string | null;
  distanceM: number | null;
  accuracyM: number | null;
  geofenceResult: string | null;
  shift: { id: string; role: string; area: string | null; startTime: string; employer: string; worker: string | null };
  review: { status: string; note: string | null; at: string } | null;
}

interface OverrideRow {
  employerId: string;
  businessName: string;
  overrides: number;
  startedShifts: number;
  overrideRate: number;
  alert: boolean;
}

const FLAG_INFO: Record<string, { label: string; tone: 'err' | 'warn' | 'neutral' }> = {
  MOCK_LOCATION: { label: 'Fake-GPS app detected', tone: 'err' },
  NO_SHOW: { label: 'No-show', tone: 'err' },
  EMPLOYER_OVERRIDE: { label: 'Started without PIN', tone: 'warn' },
  NO_PIN_LEGACY_APP: { label: 'Old app · no PIN', tone: 'warn' },
  PIN_LOCKED: { label: 'PIN locked', tone: 'warn' },
  CLOCKOUT_OUTSIDE_GEOFENCE: { label: 'Clocked out away from venue', tone: 'warn' },
  EARLY_CLOCKOUT: { label: 'Finished early', tone: 'warn' },
  LATE_START: { label: 'Late start', tone: 'neutral' },
  NO_LOCATION: { label: 'No location', tone: 'neutral' },
};

const TYPE_LABEL: Record<string, string> = {
  ARRIVED: 'Arrival',
  STARTED: 'Shift start',
  OVERRIDE_START: 'Employer started shift',
  PIN_LOCKED: 'PIN lockout',
  CLOCKED_OUT: 'Clock-out',
  NO_SHOW: 'No-show',
};

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });

export function AttendanceReviewScreen() {
  const { accessToken } = useAuth();
  const [flags, setFlags] = useState<FlaggedEvent[] | null>(null);
  const [overrides, setOverrides] = useState<OverrideRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showReviewed, setShowReviewed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => setAttempt(n => n + 1), []);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    Promise.all([
      api<FlaggedEvent[]>(`/attendance/admin/flags${showReviewed ? '?all=1' : ''}`, { token: accessToken! }),
      api<OverrideRow[]>('/attendance/admin/overrides', { token: accessToken! }),
    ])
      .then(([f, o]) => {
        if (cancelled) return;
        setFlags(f);
        setOverrides(o);
        setError(null);
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [accessToken, showReviewed, attempt]);

  if (error && !flags) return <ErrorState title="Couldn’t load attendance." detail={error} onRetry={reload} />;
  if (!flags || !overrides) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.electric} />
      </View>
    );
  }

  const open = flags.filter(f => !f.review);
  const alerts = overrides.filter(o => o.alert);

  return (
    <View style={{ gap: spacing.xxl }}>
      <View style={styles.kpiRow}>
        {[
          { k: String(open.length), l: 'Flags to review', tone: open.length ? colors.warning : colors.electric },
          { k: String(alerts.length), l: 'Employers over the override limit', tone: alerts.length ? colors.error : colors.electric },
          { k: String(overrides.reduce((n, o) => n + o.overrides, 0)), l: 'PIN overrides · last 30 days', tone: colors.white },
        ].map((s, i) => (
          <FadeUp key={s.l} delay={i * 60} style={styles.kpiWrap}>
            <GlassCard padding={spacing.lg}>
              <Text style={[styles.kpiK, { color: s.tone }]}>{s.k}</Text>
              <Text style={styles.kpiL}>{s.l}</Text>
            </GlassCard>
          </FadeUp>
        ))}
      </View>

      {/* Override watch */}
      <View>
        <Eyebrow>OVERRIDE WATCH</Eyebrow>
        <Text style={styles.h2}>Employers starting shifts without the PIN.</Text>
        <Text style={styles.p}>
          Flagged when an employer has 3 or more overrides in 30 days and they make up half or more of their shift starts.
        </Text>
        {overrides.length === 0 ? (
          <EmptyState title="No overrides in the last 30 days." />
        ) : (
          <GlassCard padding={spacing.sm}>
            {overrides.map(o => (
              <View key={o.employerId} style={[styles.ovRow, o.alert && styles.ovRowAlert]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ovName}>{o.businessName}</Text>
                  <Text style={styles.ovMeta}>
                    {o.overrides} override{o.overrides === 1 ? '' : 's'} of {o.startedShifts} shift start{o.startedShifts === 1 ? '' : 's'}
                  </Text>
                </View>
                <Text style={[styles.ovRate, o.alert && { color: colors.error }]}>{o.overrideRate}%</Text>
                {o.alert ? <StatusPill tone="err">alert</StatusPill> : <StatusPill tone="neutral">ok</StatusPill>}
              </View>
            ))}
          </GlassCard>
        )}
      </View>

      {/* Review queue */}
      <View>
        <View style={styles.headRow}>
          <View style={{ flex: 1 }}>
            <Eyebrow>REVIEW QUEUE</Eyebrow>
            <Text style={styles.h2}>{open.length ? `${open.length} flagged event${open.length === 1 ? '' : 's'} to check.` : 'Nothing to review.'}</Text>
          </View>
          <Chip active={showReviewed} onPress={() => setShowReviewed(v => !v)}>Show reviewed</Chip>
        </View>
        {flags.length === 0 ? (
          <EmptyState title="No flagged check-ins." detail="Flags appear here when something about an arrival, start, or clock-out looks off." />
        ) : (
          <View style={{ gap: spacing.sm }}>
            {flags.map(f => (
              <FlagCard key={f.id} f={f} onReviewed={reload} />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

function FlagCard({ f, onReviewed }: { f: FlaggedEvent; onReviewed: () => void }) {
  const { accessToken } = useAuth();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const review = async (status: 'CLEARED' | 'ESCALATED') => {
    setBusy(true);
    setErr(null);
    try {
      await api(`/attendance/admin/events/${f.id}/review`, {
        method: 'POST',
        token: accessToken!,
        body: { status, note: note.trim() || undefined },
      });
      onReviewed();
    } catch (e: any) {
      setErr(e.message);
      setBusy(false);
    }
  };

  return (
    <GlassCard padding={spacing.lg}>
      <View style={styles.flagTop}>
        <Text style={styles.flagType}>{TYPE_LABEL[f.type] ?? f.type}</Text>
        {f.flags.map(x => (
          <StatusPill key={x} tone={FLAG_INFO[x]?.tone ?? 'neutral'}>{FLAG_INFO[x]?.label ?? x}</StatusPill>
        ))}
        <View style={{ flex: 1 }} />
        <Text style={styles.flagAt}>{when(f.at)}</Text>
      </View>
      <Text style={styles.flagWho}>
        {f.shift.worker ?? 'Unassigned'} · {f.shift.role} at {f.shift.employer}
        {f.shift.area ? ` (${f.shift.area})` : ''}
      </Text>
      <Text style={styles.flagMeta}>
        {[
          `Shift ${when(f.shift.startTime)}`,
          f.distanceM != null ? `${f.distanceM} m from venue` : null,
          f.accuracyM != null ? `GPS ±${f.accuracyM} m` : null,
          f.reason ? `Reason: ${f.reason}` : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      </Text>

      {f.review ? (
        <Text style={styles.reviewed}>
          {f.review.status === 'CLEARED' ? 'Cleared' : 'Escalated'} {when(f.review.at)}
          {f.review.note ? ` — ${f.review.note}` : ''}
        </Text>
      ) : (
        <View style={styles.reviewRow}>
          <Field label="Note (optional)" value={note} onChangeText={setNote} placeholder="What you checked" style={styles.noteField} />
          <View style={styles.reviewBtns}>
            <GradientBtn size="sm" disabled={busy} onPress={() => review('CLEARED')}>Clear</GradientBtn>
            <GhostBtn size="sm" tone="danger" onPress={() => review('ESCALATED')}>Escalate</GhostBtn>
          </View>
        </View>
      )}
      {err ? <Text style={styles.err}>{err}</Text> : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  loading: { paddingVertical: 80, alignItems: 'center' },
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  kpiWrap: { flex: 1, minWidth: 200 },
  kpiK: { fontSize: 26, fontWeight: '900', letterSpacing: -1 },
  kpiL: { color: colors.white55, fontSize: 11.5, fontWeight: '700', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.3 },
  h2: { color: colors.white, fontSize: 19, fontWeight: '900', letterSpacing: -0.6, marginTop: 6 },
  p: { color: colors.white60, fontSize: 12.5, lineHeight: 18, marginTop: 4, marginBottom: spacing.md, maxWidth: 620 },
  headRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md, marginBottom: spacing.md, flexWrap: 'wrap' },

  ovRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 10, paddingHorizontal: spacing.md, borderRadius: radius.md },
  ovRowAlert: { backgroundColor: colors.errAlpha['06'] },
  ovName: { color: colors.white, fontSize: 14, fontWeight: '800' },
  ovMeta: { color: colors.white55, fontSize: 12, marginTop: 2 },
  ovRate: { color: colors.white, fontSize: 16, fontWeight: '900', minWidth: 48, textAlign: 'right' },

  flagTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  flagType: { color: colors.white, fontSize: 15, fontWeight: '900', letterSpacing: -0.3 },
  flagAt: { color: colors.white50, fontSize: 12, fontWeight: '700' },
  flagWho: { color: colors.white85, fontSize: 13.5, fontWeight: '700', marginTop: 8 },
  flagMeta: { color: colors.white55, fontSize: 12, marginTop: 3, lineHeight: 17 },
  reviewRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md, flexWrap: 'wrap', marginTop: spacing.md },
  noteField: { flex: 1, minWidth: 220, marginBottom: 0 },
  reviewBtns: { flexDirection: 'row', gap: spacing.sm },
  reviewed: { color: colors.white60, fontSize: 12, fontWeight: '600', marginTop: spacing.md },
  err: { color: colors.error, fontSize: 12, marginTop: 6 },
});
