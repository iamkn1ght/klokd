/**
 * Disputes (admin) — GET /disputes/admin/all, open first.
 * Decide one: mark under review (PATCH /disputes/:id/review) or resolve
 * (PATCH /disputes/:id/resolve) — release the pay as calculated, pay a
 * partial amount, or refund the employer. Both parties are notified and the
 * shift's pay record updates.
 */
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { GlassCard } from '../../components/KlokdLayout';
import { Eyebrow, StatusPill, GradientBtn, GhostBtn, Tone } from '../../components/Primitives';
import { Field, Chip, Notice } from '../../components/Form';
import { ErrorState, EmptyState } from '../../components/States';
import { useApiData, useApiAction } from '../../hooks/useApiData';
import { colors, spacing, radius } from '../../theme';
import { kes, day, time, hm, ago } from '../../lib/format';

interface Dispute {
  id: string;
  type: string;
  description: string;
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'ESCALATED';
  resolution: string | null;
  createdAt: string;
  resolvedAt: string | null;
  workerId: string | null;
  employerId: string | null;
  shift: {
    id: string;
    role: string;
    startTime: string;
    endTime: string;
    rateKes: number;
    locationName: string | null;
    status: string;
    clockInAt: string | null;
    clockOutAt: string | null;
    settlement: { grossKes: number; netKes: number; workedMinutes: number; scheduledMinutes: number; status: string } | null;
    worker: { firstName: string; lastName: string } | null;
    employer: { businessName: string };
  };
  worker: { firstName: string; lastName: string } | null;
  employer: { businessName: string } | null;
}

const TYPE: Record<string, string> = {
  NO_SHOW: 'No-show',
  INCOMPLETE_SHIFT: 'Hours or pay wrong',
  CONDUCT_ISSUE: 'Conduct',
  PAYMENT_NOT_RECEIVED: 'Pay not received',
  UNSAFE_CONDITIONS: 'Unsafe conditions',
  OTHER: 'Other',
};
const STATE: Record<string, { label: string; tone: Tone }> = {
  OPEN: { label: 'new', tone: 'err' },
  UNDER_REVIEW: { label: 'in review', tone: 'warn' },
  RESOLVED: { label: 'resolved', tone: 'mint' },
  ESCALATED: { label: 'escalated', tone: 'err' },
};

export function DisputesScreen() {
  const q = useApiData<Dispute[]>('/disputes/admin/all', { pollMs: 60_000 });
  const [selected, setSelected] = useState<string | null>(null);

  if (q.status === 'loading') return <View style={styles.loading}><ActivityIndicator color={colors.electric} /></View>;
  if (q.status === 'error') return <ErrorState title="Couldn’t load disputes." detail={q.error ?? undefined} onRetry={q.reload} />;
  const list = q.data!;
  if (list.length === 0) return <EmptyState title="No disputes." detail="Problems reported by workers or businesses land here." />;
  const current = list.find(d => d.id === selected) ?? list[0];

  return (
    <View style={styles.split}>
      <View style={styles.listCol}>
        <Eyebrow>{list.filter(d => d.status === 'OPEN' || d.status === 'UNDER_REVIEW').length} OPEN</Eyebrow>
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          {list.map(d => {
            const st = STATE[d.status];
            const filedBy = d.employerId ? d.employer?.businessName : d.worker ? `${d.worker.firstName} ${d.worker.lastName.charAt(0)}.` : '—';
            return (
              <Pressable key={d.id} onPress={() => setSelected(d.id)} style={[styles.card, current.id === d.id && styles.cardActive]}>
                <View style={styles.cardTop}>
                  <Text style={styles.type}>{TYPE[d.type] ?? d.type}</Text>
                  <StatusPill tone={st.tone}>{st.label}</StatusPill>
                </View>
                <Text style={styles.meta}>{d.shift.role} · {day(d.shift.startTime)} · filed by {filedBy} · {ago(d.createdAt)}</Text>
                <Text style={styles.desc} numberOfLines={2}>{d.description}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={styles.detailCol}>
        <Detail key={current.id} d={current} onChanged={q.reload} />
      </View>
    </View>
  );
}

function Detail({ d, onChanged }: { d: Dispute; onChanged: () => void }) {
  const act = useApiAction();
  const [action, setAction] = useState<'release_payment' | 'partial_payment' | 'reverse_escrow'>('release_payment');
  const [amount, setAmount] = useState('');
  const [resolution, setResolution] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const open = d.status === 'OPEN' || d.status === 'UNDER_REVIEW';
  const s = d.shift.settlement;

  const resolve = async () => {
    setBusy(true);
    setErr(null);
    try {
      await act(`/disputes/${d.id}/resolve`, {
        action,
        resolution: resolution.trim(),
        partialAmountKes: action === 'partial_payment' ? Number(amount) : undefined,
      }, 'PATCH');
      onChanged();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <GlassCard padding={spacing.xl}>
      <Eyebrow>{(TYPE[d.type] ?? d.type).toUpperCase()}</Eyebrow>
      <Text style={styles.h}>{d.shift.role} at {d.shift.employer.businessName}</Text>
      <Text style={styles.meta}>
        Worker {d.shift.worker ? `${d.shift.worker.firstName} ${d.shift.worker.lastName}` : '—'} · {day(d.shift.startTime)} {time(d.shift.startTime)}–{time(d.shift.endTime)} · {d.shift.locationName ?? 'Nairobi'}
      </Text>
      <View style={styles.quote}>
        <Text style={styles.quoteText}>{d.description}</Text>
      </View>

      <Text style={styles.section}>RECORD</Text>
      <Line k="Clocked in" v={d.shift.clockInAt ? `${day(d.shift.clockInAt)} ${time(d.shift.clockInAt)}` : 'never'} />
      <Line k="Clocked out" v={d.shift.clockOutAt ? `${day(d.shift.clockOutAt)} ${time(d.shift.clockOutAt)}` : '—'} />
      {s && <Line k="Hours" v={`${hm(s.workedMinutes)} of ${hm(s.scheduledMinutes)} booked`} />}
      <Line k="Shift pay" v={kes(s?.grossKes ?? d.shift.rateKes)} />
      {s && <Line k="Pay status" v={s.status.toLowerCase().replace('_', ' ')} />}
      <Text style={styles.small}>Check-in flags for this shift are on the Attendance page.</Text>

      {!open ? (
        <Notice tone="ok">Resolved {d.resolvedAt ? day(d.resolvedAt) : ''}: {d.resolution}</Notice>
      ) : (
        <View style={{ marginTop: spacing.lg }}>
          <Text style={styles.section}>DECISION</Text>
          <View style={styles.chips}>
            <Chip active={action === 'release_payment'} onPress={() => setAction('release_payment')}>Pay as calculated</Chip>
            <Chip active={action === 'partial_payment'} onPress={() => setAction('partial_payment')}>Pay part</Chip>
            <Chip active={action === 'reverse_escrow'} onPress={() => setAction('reverse_escrow')}>No pay · refund employer</Chip>
          </View>
          {action === 'partial_payment' && (
            <Field label="Shift pay to allow (KES)" value={amount} onChangeText={t => setAmount(t.replace(/\D/g, ''))} keyboardType="number-pad" style={{ marginTop: spacing.md, maxWidth: 240 }} hint="Deductions are recalculated on this amount." />
          )}
          <Field label="Decision note (sent to both parties)" value={resolution} onChangeText={setResolution} multiline style={{ marginTop: spacing.md }} hint={resolution.trim().length < 10 ? 'At least 10 characters.' : undefined} />
          {err ? <Notice tone="err">{err}</Notice> : null}
          <View style={styles.actions}>
            <GradientBtn size="sm" disabled={busy || resolution.trim().length < 10 || (action === 'partial_payment' && !Number(amount))} onPress={resolve}>
              {busy ? 'Saving…' : 'Resolve'}
            </GradientBtn>
            {d.status === 'OPEN' && (
              <GhostBtn size="sm" onPress={async () => {
                await act(`/disputes/${d.id}/review`, {}, 'PATCH').catch(() => undefined);
                onChanged();
              }}>Mark in review</GhostBtn>
            )}
          </View>
        </View>
      )}
    </GlassCard>
  );
}

function Line({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.line}>
      <Text style={styles.lineK}>{k}</Text>
      <Text style={styles.lineV}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { paddingVertical: 80, alignItems: 'center' },
  split: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xl, alignItems: 'flex-start' },
  listCol: { flex: 1, minWidth: 260, maxWidth: 440 },
  detailCol: { flex: 1.4, minWidth: 260 },
  card: { padding: spacing.md, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.white10, backgroundColor: colors.white03 },
  cardActive: { borderColor: colors.electricAlpha['50'], backgroundColor: colors.electricAlpha['06'] },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  type: { color: colors.white, fontSize: 14, fontWeight: '900' },
  meta: { color: colors.white55, fontSize: 12, marginTop: 4, lineHeight: 17 },
  desc: { color: colors.white75, fontSize: 12.5, marginTop: 6, lineHeight: 18 },
  h: { color: colors.white, fontSize: 19, fontWeight: '900', marginTop: 6 },
  quote: { marginTop: spacing.md, padding: spacing.md, borderLeftWidth: 3, borderLeftColor: colors.warning, backgroundColor: colors.white03, borderRadius: radius.sm },
  quoteText: { color: colors.white85, fontSize: 13.5, lineHeight: 20 },
  section: { color: colors.white45, fontSize: 10.5, fontWeight: '900', letterSpacing: 0.9, marginTop: spacing.lg, marginBottom: spacing.sm },
  line: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.white06 },
  lineK: { color: colors.white60, fontSize: 12.5 },
  lineV: { color: colors.white, fontSize: 12.5, fontWeight: '700' },
  small: { color: colors.white50, fontSize: 11.5, marginTop: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
});
