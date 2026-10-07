/**
 * Employer Dashboard (web) — desktop-shape ops view.
 *
 * The "open positions" grid is REAL: GET /shifts/mine for signed-in
 * employers (skeletons → rows → empty → retry, demo-labelled samples for
 * demo sessions). The escrow meter stays SAMPLE — Kipkiren Pay isn't live,
 * so every money number on this page is explicitly labelled as such.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GlassCard, FadeUp, LiveDot } from '../../components/KlokdLayout';
import { Eyebrow, StatusPill } from '../../components/Primitives';
import { ShiftCardSkeleton, ErrorState, EmptyState } from '../../components/States';
import { colors, spacing, radius } from '../../theme';
import { useEmployerShifts, EmployerShift } from '../../hooks/useEmployerShifts';

// SAMPLE until the payment rail ships — honest labelling, no invented KPIs.
const ESCROW_TOTAL = 200_000;
const ESCROW_HELD = 142_400;

const SAMPLE_KPIS = [
  { k: '—', l: 'Shifts this week', delta: 'payments not live yet' },
  { k: '—', l: 'Spent this week', delta: 'payments not live yet' },
  { k: '—', l: 'Show-up rate', delta: 'available after first clock-in' },
];

const STATE_TONE: Record<string, 'mint' | 'warn' | 'err'> = {
  POSTED: 'warn',
  CONFIRMED: 'mint',
  ACCEPTED: 'mint',
  ACTIVE: 'mint',
  COMPLETED: 'mint',
  DISPUTED: 'err',
  PAID: 'mint',
  CANCELLED: 'neutral',
} as any;

const STATE_LABEL: Record<string, string> = {
  POSTED: 'open',
  CONFIRMED: 'filled',
  ACCEPTED: 'filled',
  ACTIVE: 'active',
  COMPLETED: 'done',
  DISPUTED: 'disputed',
  PAID: 'paid',
  CANCELLED: 'cancelled',
};

function whenRange(s: EmployerShift): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
  return `${fmt(s.startTime)} → ${fmt(s.endTime)}`;
}

export function EmployerDashboard() {
  const { shifts, status, error, retry } = useEmployerShifts();

  const live = status === 'live' || status === 'demo';
  const openCount = live ? shifts!.filter(s => s.status === 'POSTED').length : 0;
  const totalApplications = live ? shifts!.reduce((n, s) => n + s.applications, 0) : 0;

  // Real KPIs where the data exists; honest em-dashes where it can't yet.
  const kpis = live
    ? [
        { k: String(shifts!.length), l: 'Shifts on Klokd', delta: openCount > 0 ? `${openCount} open right now` : 'none open right now' },
        { k: String(totalApplications), l: 'Applications received', delta: 'across all shifts' },
        { k: '—', l: 'Spent this week', delta: 'payments not live yet' },
      ]
    : SAMPLE_KPIS;

  return (
    <View>
      {/* Escrow (SAMPLE) + KPIs */}
      <View style={styles.topRow}>
        <FadeUp delay={0} style={styles.escrowWrap}>
          <GlassCard variant="electric" padding={spacing.xl}>
            <View style={styles.escrowHeadRow}>
              <Eyebrow color={colors.electric}>ESCROW HEALTH</Eyebrow>
              <View style={styles.demoChip}>
                <Text style={styles.demoChipText}>SAMPLE</Text>
              </View>
            </View>
            <View style={styles.escrowBigRow}>
              <View>
                <Text style={styles.escrowBig}>KES {ESCROW_HELD.toLocaleString()}</Text>
                <Text style={styles.escrowSub}>
                  held · {Math.round((ESCROW_HELD / ESCROW_TOTAL) * 100)}% of KES {ESCROW_TOTAL.toLocaleString()} funded
                </Text>
              </View>
            </View>
            <View style={styles.meter}>
              <View style={[styles.meterFill, { width: `${Math.round((ESCROW_HELD / ESCROW_TOTAL) * 100)}%` }]} />
            </View>
            <Text style={styles.escrowNote}>
              M-Pesa escrow activates with the payment rail (Kipkiren Pay). This meter is a sample
              of what it will look like.
            </Text>
          </GlassCard>
        </FadeUp>

        <View style={styles.kpiCol}>
          {kpis.map((k, i) => (
            <FadeUp key={i} delay={100 + i * 60}>
              <GlassCard padding={spacing.lg}>
                <Text style={styles.kpiK}>{k.k}</Text>
                <Text style={styles.kpiL}>{k.l}</Text>
                <Text style={styles.kpiDelta}>{k.delta}</Text>
              </GlassCard>
            </FadeUp>
          ))}
        </View>
      </View>

      {/* Open shifts — REAL */}
      <FadeUp delay={300} style={{ marginTop: spacing.xxxl }}>
        <View style={styles.sectionHead}>
          <View>
            <Eyebrow>YOUR SHIFTS</Eyebrow>
            <Text style={styles.h2}>
              {live && openCount > 0 && `${openCount} shift${openCount === 1 ? '' : 's'} open right now.`}
              {live && openCount === 0 && 'No shifts open right now.'}
              {status === 'loading' && 'Loading your shifts…'}
              {status === 'empty' && 'You haven’t posted a shift yet.'}
              {status === 'error' && 'Couldn’t load your shifts.'}
              {status === 'demo' && 'Sample shifts.'}
            </Text>
          </View>
        </View>

        {status === 'loading' && (
          <View style={styles.shiftGrid}>
            {[0, 1, 2].map(i => (
              <View key={i} style={styles.shiftWrap}>
                <GlassCard padding={spacing.lg}>
                  <ShiftCardSkeleton />
                </GlassCard>
              </View>
            ))}
          </View>
        )}

        {status === 'error' && (
          <ErrorState
            title="Couldn’t load your shifts."
            detail={error ?? 'The Klokd API didn’t answer.'}
            onRetry={retry}
          />
        )}

        {status === 'empty' && (
          <EmptyState
            title="No shifts posted yet."
            detail="Post your first shift and vetted workers nearby will see it instantly. Shifts open applications from minute one."
          />
        )}

        {live && (
          <View style={styles.shiftGrid}>
            {shifts!.map((s, i) => (
              <FadeUp key={s.id} delay={340 + i * 60} style={styles.shiftWrap}>
                <GlassCard interactive padding={spacing.lg}>
                  <View style={styles.shiftTop}>
                    <Text style={styles.shiftRole} numberOfLines={1}>{s.role}</Text>
                    <StatusPill tone={STATE_TONE[s.status] ?? 'neutral'}>
                      {STATE_LABEL[s.status] ?? s.status.toLowerCase()}
                    </StatusPill>
                  </View>
                  <Text style={styles.shiftVenue} numberOfLines={1}>
                    {s.locationName ?? 'Nairobi'}
                  </Text>
                  <Text style={styles.shiftWhen}>{whenRange(s)}</Text>

                  <View style={styles.shiftStats}>
                    <View style={styles.shiftStat}>
                      <Text style={styles.shiftStatK}>{s.applications}</Text>
                      <Text style={styles.shiftStatL}>APPLIED</Text>
                    </View>
                    <View style={styles.shiftStat}>
                      <Text style={styles.shiftStatK}>{s.status === 'POSTED' ? '—' : '1'}</Text>
                      <Text style={styles.shiftStatL}>PICKED</Text>
                    </View>
                    <View style={[styles.shiftStat, { alignItems: 'flex-end', flex: 1.4 }]}>
                      <Text style={styles.shiftPay}>KES {s.rateKes.toLocaleString()}</Text>
                      <Text style={styles.shiftStatL}>PAY</Text>
                    </View>
                  </View>
                </GlassCard>
              </FadeUp>
            ))}
          </View>
        )}

        {status === 'demo' && (
          <Text style={styles.demoNote}>
            Demo session — sample rows only. Sign in with the employer's phone number to see your real shifts.
          </Text>
        )}
      </FadeUp>

      {/* Sample activity — explicitly labelled */}
      <FadeUp delay={520} style={{ marginTop: spacing.xxxl }}>
        <View style={styles.sectionHead}>
          <View>
            <Eyebrow>LIVE ACTIVITY</Eyebrow>
            <Text style={styles.h2}>What’s happening at your venues.</Text>
          </View>
          <View style={styles.liveRow}>
            <LiveDot color={colors.warning} />
            <Text style={styles.liveText}>Sample · notification feed lands with comms rails</Text>
          </View>
        </View>
        <GlassCard padding={spacing.lg}>
          <Text style={styles.activityEmpty}>
            The activity stream lights up when workers apply, clock in, and get paid — all of which
            flow through the rails that aren't live yet. Your shifts above are live.
          </Text>
        </GlassCard>
      </FadeUp>
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, alignItems: 'stretch' },
  escrowWrap: { flex: 2, minWidth: 480 },
  kpiCol: { flex: 1, minWidth: 240, gap: spacing.md },

  escrowHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  demoChip: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,179,71,0.35)',
    backgroundColor: 'rgba(255,179,71,0.10)',
  },
  demoChipText: { color: colors.warning, fontSize: 9.5, fontWeight: '900', letterSpacing: 0.8 },

  escrowBigRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm, gap: spacing.md, flexWrap: 'wrap' },
  escrowBig: { color: colors.white, fontSize: 36, fontWeight: '900', letterSpacing: -1.6 },
  escrowSub: { color: colors.white60, fontSize: 12, marginTop: 4 },
  meter: { height: 6, borderRadius: 3, backgroundColor: colors.white06, marginTop: spacing.lg, overflow: 'hidden' },
  meterFill: { height: '100%', backgroundColor: colors.electric },
  escrowNote: { color: colors.white55, fontSize: 12, lineHeight: 17, marginTop: spacing.lg },

  kpiK: { color: colors.white, fontSize: 22, fontWeight: '900', letterSpacing: -0.9 },
  kpiL: { color: colors.white55, fontSize: 11.5, marginTop: 4, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  kpiDelta: { color: colors.electric, fontSize: 11.5, marginTop: 6, fontWeight: '700' },

  sectionHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: spacing.lg, flexWrap: 'wrap', gap: spacing.sm },
  h2: { color: colors.white, fontSize: 22, fontWeight: '900', letterSpacing: -0.9, marginTop: 6 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveText: { color: colors.white55, fontSize: 11.5, fontWeight: '700' },

  shiftGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  shiftWrap: { flex: 1, minWidth: 280 },
  shiftTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm, gap: spacing.sm },
  shiftRole: { color: colors.white, fontSize: 16, fontWeight: '900', letterSpacing: -0.4, flex: 1 },
  shiftVenue: { color: colors.white75, fontSize: 12.5, marginTop: 3, fontWeight: '700' },
  shiftWhen: { color: colors.white50, fontSize: 11.5, marginTop: 3, fontWeight: '600' },
  shiftStats: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.white06 },
  shiftStat: { flex: 1 },
  shiftStatK: { color: colors.white, fontSize: 16, fontWeight: '900', letterSpacing: -0.4 },
  shiftStatL: { color: colors.white40, fontSize: 9.5, fontWeight: '900', letterSpacing: 0.7, marginTop: 3 },
  shiftPay: { color: colors.electric, fontSize: 16, fontWeight: '900', letterSpacing: -0.4 },

  demoNote: {
    color: colors.white55,
    fontSize: 11.5,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.white03,
    borderWidth: 1,
    borderColor: colors.white06,
    overflow: 'hidden',
  },

  activityEmpty: { color: colors.white60, fontSize: 13, lineHeight: 19, fontWeight: '500' },
});
