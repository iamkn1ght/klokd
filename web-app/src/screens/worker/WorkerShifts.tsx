/**
 * Worker shifts (web) — GET /me/shifts, grouped the way a worker thinks:
 *   Waiting for your answer · Coming up · Applied · Done · Not picked
 * Every row opens the shift page (#/worker/shifts/:id).
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { GlassCard, FadeUp } from '../../components/KlokdLayout';
import { Eyebrow, StatusPill, Tone } from '../../components/Primitives';
import { ShiftCardSkeleton, ErrorState, EmptyState } from '../../components/States';
import { colors, spacing, radius } from '../../theme';
import { useApiData } from '../../hooks/useApiData';
import { navigate } from '../../navigation/router';
import { kes, when, day } from '../../lib/format';
import { WorkerShiftDetail } from './WorkerShiftDetail';

export interface MyShift {
  id: string;
  role: string;
  venue: string;
  area: string | null;
  startTime: string;
  endTime: string;
  rateKes: number;
  status: string;
  directOffer: boolean;
  arrivedAt: string | null;
  clockInAt: string | null;
  clockOutAt: string | null;
  settlement: { status: string; netKes: number; grossKes: number } | null;
  rated: boolean;
  disputeStatus: string | null;
}

interface MyShifts {
  offers: MyShift[];
  upcoming: MyShift[];
  applied: { applicationId: string; appliedAt: string; shift: { id: string; role: string; venue: string; area: string | null; startTime: string; endTime: string; rateKes: number } }[];
  history: MyShift[];
  notPicked: { applicationId: string; role: string; venue: string; startTime: string; outcome: string }[];
}

const STATUS: Record<string, { label: string; tone: Tone }> = {
  CONFIRMED: { label: 'needs your answer', tone: 'warn' },
  ACCEPTED: { label: 'confirmed', tone: 'mint' },
  ACTIVE: { label: 'on shift', tone: 'mint' },
  COMPLETED: { label: 'done', tone: 'mint' },
  PAID: { label: 'paid', tone: 'mint' },
  DISPUTED: { label: 'under review', tone: 'err' },
  CANCELLED: { label: 'cancelled', tone: 'neutral' },
};

export function WorkerShifts({ sub }: { sub?: string }) {
  if (sub) return <WorkerShiftDetail id={sub} />;
  return <ShiftList />;
}

function ShiftList() {
  const q = useApiData<MyShifts>('/me/shifts', { pollMs: 30_000 });

  if (q.status === 'loading') {
    return (
      <View style={styles.list}>
        {[0, 1, 2].map(i => (
          <GlassCard key={i} padding={spacing.lg}>
            <ShiftCardSkeleton />
          </GlassCard>
        ))}
      </View>
    );
  }
  if (q.status === 'error') return <ErrorState title="Couldn’t load your shifts." detail={q.error ?? undefined} onRetry={q.reload} />;
  const d = q.data!;
  const nothing = !d.offers.length && !d.upcoming.length && !d.applied.length && !d.history.length;

  return (
    <View style={{ gap: spacing.xxl }}>
      <View>
        <Eyebrow>MY SHIFTS</Eyebrow>
        <Text style={styles.h1}>Your shifts, start to payslip.</Text>
      </View>
      {nothing && (
        <EmptyState title="No shifts yet." detail="Apply to shifts on the Home tab. When a business picks you, it shows up here for you to confirm." />
      )}
      <Group title="Waiting for your answer" rows={d.offers} highlight />
      <Group title="Coming up" rows={d.upcoming} />
      {d.applied.length > 0 && (
        <View>
          <Text style={styles.groupH}>Applied · waiting to be picked</Text>
          <View style={styles.list}>
            {d.applied.map(a => (
              <Row
                key={a.applicationId}
                onPress={() => navigate(`/worker/shifts/${a.shift.id}`)}
                title={a.shift.role}
                sub={`${a.shift.venue} · ${a.shift.area ?? 'Nairobi'}`}
                when={when(a.shift.startTime, a.shift.endTime)}
                right={kes(a.shift.rateKes)}
                pill={{ label: 'applied', tone: 'neutral' }}
              />
            ))}
          </View>
        </View>
      )}
      <Group title="Done" rows={d.history} />
      {d.notPicked.length > 0 && (
        <View>
          <Text style={styles.groupH}>Not picked</Text>
          {d.notPicked.map(n => (
            <Text key={n.applicationId} style={styles.notPicked}>
              {n.role} at {n.venue} · {day(n.startTime)} · {n.outcome}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

function Group({ title, rows, highlight }: { title: string; rows: MyShift[]; highlight?: boolean }) {
  if (!rows.length) return null;
  return (
    <View>
      <Text style={[styles.groupH, highlight && { color: colors.warning }]}>{title}</Text>
      <View style={styles.list}>
        {rows.map((s, i) => {
          const st = STATUS[s.status] ?? { label: s.status.toLowerCase(), tone: 'neutral' as Tone };
          const extra =
            s.status === 'COMPLETED' && !s.rated ? 'rate this shift' : s.settlement ? `you get ${kes(s.settlement.netKes)}` : null;
          return (
            <FadeUp key={s.id} delay={Math.min(i, 6) * 40}>
              <Row
                onPress={() => navigate(`/worker/shifts/${s.id}`)}
                title={`${s.role}${s.directOffer && s.status === 'CONFIRMED' ? ' · offered to you' : ''}`}
                sub={`${s.venue} · ${s.area ?? 'Nairobi'}`}
                when={when(s.startTime, s.endTime)}
                right={kes(s.rateKes)}
                pill={st}
                extra={extra}
              />
            </FadeUp>
          );
        })}
      </View>
    </View>
  );
}

function Row({
  onPress,
  title,
  sub,
  when: w,
  right,
  pill,
  extra,
}: {
  onPress: () => void;
  title: string;
  sub: string;
  when: string;
  right: string;
  pill: { label: string; tone: Tone };
  extra?: string | null;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="link" style={({ hovered }: any) => [styles.row, hovered && styles.rowHover]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.rowTop}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
        </View>
        <Text style={styles.sub} numberOfLines={1}>{sub}</Text>
        <Text style={styles.when}>{w}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.right}>{right}</Text>
        {extra ? <Text style={styles.extra}>{extra}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  h1: { color: colors.white, fontSize: 26, fontWeight: '900', letterSpacing: -1, marginTop: 8 },
  groupH: { color: colors.white60, fontSize: 11, fontWeight: '900', letterSpacing: 0.9, textTransform: 'uppercase', marginBottom: spacing.sm },
  list: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.white10,
    backgroundColor: 'rgba(255,255,255,0.045)',
  },
  rowHover: { borderColor: 'rgba(0,229,160,0.45)', backgroundColor: 'rgba(255,255,255,0.07)' },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { color: colors.white, fontSize: 15.5, fontWeight: '900', letterSpacing: -0.3, flexShrink: 1 },
  sub: { color: colors.white70, fontSize: 12.5, fontWeight: '700', marginTop: 3 },
  when: { color: colors.white50, fontSize: 12, fontWeight: '600', marginTop: 2 },
  right: { color: colors.electric, fontSize: 15, fontWeight: '900' },
  extra: { color: colors.white60, fontSize: 11.5, fontWeight: '700', marginTop: 3 },
  notPicked: { color: colors.white55, fontSize: 12.5, paddingVertical: 4 },
});
