/**
 * Employer Dashboard (web) — desktop-shape ops view.
 *
 * Top: escrow meter + 3 KPIs. Middle: open shifts grid. Bottom: recent
 * activity. Aim: open the page, know if anything needs attention in 5s.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GlassCard, FadeUp, LiveDot } from '../../components/KlokdLayout';
import { Eyebrow, StatusPill, Avatar, GradientBtn, Sparkline, Tone } from '../../components/Primitives';
import { colors, spacing, radius } from '../../theme';

const ESCROW_TOTAL = 200_000;
const ESCROW_HELD = 142_400;

const KPIS = [
  { k: '12', l: 'Shifts this week', delta: '+3 vs last week' },
  { k: 'KES 18,400', l: 'Spent this week', delta: 'avg KES 1,533 / shift' },
  { k: '94.2%', l: 'Show-up rate', delta: 'across 47 workers' },
];

const OPEN_SHIFTS = [
  { id: 'sh-9921', role: 'Waiter', venue: 'Brew Bistro · Westlands', when: 'Tonight · 5–10 PM', pay: 1800, applied: 12, picked: 0, state: 'filling' as const },
  { id: 'sh-9922', role: 'Barista', venue: 'Brew Bistro · Sarit', when: 'Tomorrow · 7 AM – 2 PM', pay: 2100, applied: 8, picked: 1, state: 'filled' as const },
  { id: 'sh-9923', role: 'Event steward', venue: 'KICC · Sat', when: 'Sat · 8 PM – 1 AM', pay: 1200, applied: 4, picked: 0, state: 'open' as const },
];

const RECENT = [
  { ts: '2m', t: 'Akinyi M. applied to Waiter · Brew Bistro', tone: 'mint' as Tone },
  { ts: '14m', t: 'Joseph K. clocked in at Brew Bistro · Sarit', tone: 'mint' as Tone },
  { ts: '38m', t: 'Released KES 1,640 → Brian O. · M-Pesa', tone: 'volt' as Tone },
  { ts: '1h', t: 'Escrow topped up · KES 200,000 via STK push', tone: 'mint' as Tone },
];

const STATE_TONE = { filled: 'mint' as Tone, filling: 'warn' as Tone, open: 'err' as Tone };

export function EmployerDashboard() {
  const pct = Math.round((ESCROW_HELD / ESCROW_TOTAL) * 100);
  return (
    <View>
      {/* Escrow + KPIs */}
      <View style={styles.topRow}>
        <FadeUp delay={0} style={styles.escrowWrap}>
          <GlassCard variant="electric" padding={spacing.xl}>
            <Eyebrow color={colors.electric}>ESCROW HEALTH</Eyebrow>
            <View style={styles.escrowBigRow}>
              <View>
                <Text style={styles.escrowBig}>KES {ESCROW_HELD.toLocaleString()}</Text>
                <Text style={styles.escrowSub}>held · {pct}% of KES {ESCROW_TOTAL.toLocaleString()} funded</Text>
              </View>
              <View style={{ minWidth: 160 }}>
                <GradientBtn>Top up</GradientBtn>
              </View>
            </View>
            <View style={styles.meter}>
              <View style={[styles.meterFill, { width: `${pct}%` }]} />
            </View>
            <View style={styles.escrowFootRow}>
              <View style={styles.escrowFootCell}>
                <Text style={styles.escrowFootK}>KES 57,600</Text>
                <Text style={styles.escrowFootL}>RELEASED THIS WEEK</Text>
              </View>
              <View style={styles.escrowFootCell}>
                <Text style={styles.escrowFootK}>KES 4,200</Text>
                <Text style={styles.escrowFootL}>IN DISPUTE</Text>
              </View>
              <View style={styles.escrowFootCell}>
                <Text style={styles.escrowFootK}>≈ 38 shifts</Text>
                <Text style={styles.escrowFootL}>RUNWAY AT CURRENT RATE</Text>
              </View>
            </View>
          </GlassCard>
        </FadeUp>

        <View style={styles.kpiCol}>
          {KPIS.map((k, i) => (
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

      {/* Open shifts */}
      <FadeUp delay={300} style={{ marginTop: spacing.xxxl }}>
        <View style={styles.sectionHead}>
          <View>
            <Eyebrow>OPEN POSITIONS</Eyebrow>
            <Text style={styles.h2}>3 shifts active right now.</Text>
          </View>
          <View style={{ minWidth: 160 }}>
            <GradientBtn>+ Post a shift</GradientBtn>
          </View>
        </View>

        <View style={styles.shiftGrid}>
          {OPEN_SHIFTS.map((s, i) => (
            <FadeUp key={s.id} delay={340 + i * 60} style={styles.shiftWrap}>
              <GlassCard interactive padding={spacing.lg}>
                <View style={styles.shiftTop}>
                  <Text style={styles.shiftId}>{s.id}</Text>
                  <StatusPill tone={STATE_TONE[s.state]}>{s.state}</StatusPill>
                </View>
                <Text style={styles.shiftRole}>{s.role}</Text>
                <Text style={styles.shiftVenue}>{s.venue}</Text>
                <Text style={styles.shiftWhen}>{s.when}</Text>

                <View style={styles.shiftStats}>
                  <View style={styles.shiftStat}>
                    <Text style={styles.shiftStatK}>{s.applied}</Text>
                    <Text style={styles.shiftStatL}>APPLIED</Text>
                  </View>
                  <View style={styles.shiftStat}>
                    <Text style={styles.shiftStatK}>{s.picked}</Text>
                    <Text style={styles.shiftStatL}>PICKED</Text>
                  </View>
                  <View style={[styles.shiftStat, { alignItems: 'flex-end', flex: 1.4 }]}>
                    <Text style={styles.shiftPay}>KES {s.pay.toLocaleString()}</Text>
                    <Text style={styles.shiftStatL}>PAY</Text>
                  </View>
                </View>
              </GlassCard>
            </FadeUp>
          ))}
        </View>
      </FadeUp>

      {/* Recent activity */}
      <FadeUp delay={520} style={{ marginTop: spacing.xxxl }}>
        <View style={styles.sectionHead}>
          <View>
            <Eyebrow>LIVE ACTIVITY</Eyebrow>
            <Text style={styles.h2}>What’s happening at your venues.</Text>
          </View>
          <View style={styles.liveRow}>
            <LiveDot />
            <Text style={styles.liveText}>Streaming · refreshed 4s ago</Text>
          </View>
        </View>
        <GlassCard padding={0}>
          {RECENT.map((r, i) => (
            <View key={i} style={[styles.actRow, i < RECENT.length - 1 && styles.actRowBorder]}>
              <View style={[styles.actDot, r.tone === 'mint' && { backgroundColor: colors.electric }, r.tone === 'volt' && { backgroundColor: colors.volt }]} />
              <Text style={styles.actT}>{r.t}</Text>
              <Text style={styles.actTs}>{r.ts}</Text>
            </View>
          ))}
        </GlassCard>
      </FadeUp>
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, alignItems: 'stretch' },
  escrowWrap: { flex: 2, minWidth: 480 },
  kpiCol: { flex: 1, minWidth: 240, gap: spacing.md },

  escrowBigRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm, gap: spacing.md, flexWrap: 'wrap' },
  escrowBig: { color: colors.white, fontSize: 36, fontWeight: '900', letterSpacing: -1.6 },
  escrowSub: { color: colors.white60, fontSize: 12, marginTop: 4 },
  meter: { height: 6, borderRadius: 3, backgroundColor: colors.white06, marginTop: spacing.lg, overflow: 'hidden' },
  meterFill: { height: '100%', backgroundColor: colors.electric },

  escrowFootRow: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.white10, flexWrap: 'wrap' },
  escrowFootCell: { flex: 1, minWidth: 110 },
  escrowFootK: { color: colors.white, fontSize: 14.5, fontWeight: '900', letterSpacing: -0.3 },
  escrowFootL: { color: colors.white45, fontSize: 9.5, fontWeight: '900', letterSpacing: 0.6, marginTop: 4 },

  kpiK: { color: colors.white, fontSize: 22, fontWeight: '900', letterSpacing: -0.9 },
  kpiL: { color: colors.white55, fontSize: 11.5, marginTop: 4, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  kpiDelta: { color: colors.electric, fontSize: 11.5, marginTop: 6, fontWeight: '700' },

  sectionHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: spacing.lg, flexWrap: 'wrap', gap: spacing.sm },
  h2: { color: colors.white, fontSize: 22, fontWeight: '900', letterSpacing: -0.9, marginTop: 6 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveText: { color: colors.white55, fontSize: 11.5, fontWeight: '700' },

  shiftGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  shiftWrap: { flex: 1, minWidth: 280 },
  shiftTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  shiftId: { color: colors.white45, fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },
  shiftRole: { color: colors.white, fontSize: 16, fontWeight: '900', letterSpacing: -0.4 },
  shiftVenue: { color: colors.white75, fontSize: 12.5, marginTop: 3, fontWeight: '700' },
  shiftWhen: { color: colors.white50, fontSize: 11.5, marginTop: 3, fontWeight: '600' },
  shiftStats: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.white06 },
  shiftStat: { flex: 1 },
  shiftStatK: { color: colors.white, fontSize: 16, fontWeight: '900', letterSpacing: -0.4 },
  shiftStatL: { color: colors.white40, fontSize: 9.5, fontWeight: '900', letterSpacing: 0.7, marginTop: 3 },
  shiftPay: { color: colors.electric, fontSize: 16, fontWeight: '900', letterSpacing: -0.4 },

  actRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: 11 },
  actRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.white06 },
  actDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.white25 },
  actT: { flex: 1, color: colors.white75, fontSize: 13, fontWeight: '600' },
  actTs: { color: colors.white45, fontSize: 11, fontWeight: '700' },
});
