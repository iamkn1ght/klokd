/**
 * Overview — live ops dashboard: KPIs, rail health, activity stream,
 * fill-rate-by-hour. The first screen anyone sees in the morning.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GlassCard, FadeUp, LiveDot } from '../../components/KlokdLayout';
import { Eyebrow, Sparkline, StatusPill, Avatar } from '../../components/Primitives';
import { colors, spacing, radius } from '../../theme';

const KPIS = [
  { k: 'Today’s shifts', v: '284', delta: '+18%', spark: [12, 14, 18, 22, 24, 28, 31, 33, 36, 38, 42, 46], tone: 'up' as const },
  { k: 'Escrow held', v: 'KES 14.2M', delta: '+KES 1.1M', spark: [10, 11, 11.5, 12, 12.4, 13, 13.3, 13.7, 14, 14.1, 14.2, 14.2], tone: 'up' as const },
  { k: 'Verifications', v: '12', delta: '4 over SLA', spark: [3, 5, 6, 8, 9, 11, 14, 13, 12, 12, 12, 12], tone: 'warn' as const },
  { k: 'Open disputes', v: '3', delta: '−1 vs avg', spark: [6, 5, 5, 4, 4, 5, 3, 4, 3, 3, 3, 3], tone: 'down' as const },
];

const RAILS = [
  { name: 'Identiti', desc: 'KYC + customers', uptime: '99.98%', lat: '124 ms', state: 'live' as const, owner: 'Maina' },
  { name: 'Todoku', desc: 'SMS / OTP delivery', uptime: '99.91%', lat: '218 ms', state: 'live' as const, owner: 'Maina' },
  { name: 'Kipkiren Pay', desc: 'M-Pesa escrow + STK', uptime: '99.78%', lat: '342 ms', state: 'live' as const, owner: 'Maina' },
  { name: 'Helpan AI', desc: 'Match + scoring', uptime: '99.95%', lat: '86 ms', state: 'live' as const, owner: 'Maina' },
  { name: 'Hakken', desc: 'Audit + compliance', uptime: '99.99%', lat: '14 ms', state: 'live' as const, owner: 'Maina' },
];

const ACTIVITY = [
  { t: 'Shift filled', sub: 'Brew Bistro Westlands · Waiter · Brian O.', when: 'just now', tone: 'mint' as const },
  { t: 'Verification escalated', sub: 'Akinyi M. · liveness check failed twice', when: '2m', tone: 'warn' as const },
  { t: 'Payout released', sub: 'KES 1,640 → 0722 ••• 500 · QAB7X2K1P9', when: '3m', tone: 'mint' as const },
  { t: 'Dispute opened', sub: 'Java Sarit · employer claims worker left early', when: '6m', tone: 'err' as const },
  { t: 'Escrow topped up', sub: 'Brew Bistro · +KES 200K via STK push', when: '11m', tone: 'mint' as const },
  { t: 'New employer onboarded', sub: 'Mama Wanjiku Hospitality · KRA verified', when: '17m', tone: 'neutral' as const },
];

const FILL_BY_HOUR = [
  { h: '8a', f: 38 },{ h: '9a', f: 52 },{ h: '10a', f: 64 },{ h: '11a', f: 71 },
  { h: '12p', f: 78 },{ h: '1p', f: 81 },{ h: '2p', f: 84 },{ h: '3p', f: 86 },
  { h: '4p', f: 88 },{ h: '5p', f: 91 },{ h: '6p', f: 94 },{ h: '7p', f: 95 },
];

export function OverviewScreen() {
  return (
    <View>
      {/* ─── KPI row ─── */}
      <View style={styles.kpiRow}>
        {KPIS.map((k, i) => (
          <FadeUp key={k.k} delay={i * 60} style={styles.kpiWrap}>
            <GlassCard interactive style={styles.kpi}>
              <Text style={styles.kpiLabel}>{k.k}</Text>
              <View style={styles.kpiBody}>
                <Text style={styles.kpiValue}>{k.v}</Text>
                <Sparkline values={k.spark} color={k.tone === 'warn' ? colors.warning : k.tone === 'down' ? colors.error : colors.electric} />
              </View>
              <View style={styles.kpiDelta}>
                <Text style={[styles.kpiDeltaText, { color: k.tone === 'warn' ? colors.warning : k.tone === 'down' ? colors.error : colors.electric }]}>
                  {k.tone === 'down' ? '↓' : '↑'} {k.delta}
                </Text>
                <Text style={styles.kpiVs}>vs 7-day avg</Text>
              </View>
            </GlassCard>
          </FadeUp>
        ))}
      </View>

      {/* ─── Rail health ─── */}
      <FadeUp delay={280} style={{ marginTop: spacing.xxxl }}>
        <View style={styles.sectionHead}>
          <View>
            <Eyebrow>RAIL HEALTH</Eyebrow>
            <Text style={styles.sectionTitle}>All five upstream rails reporting green.</Text>
          </View>
          <View style={styles.sectionHeadRight}>
            <LiveDot />
            <Text style={styles.sectionHeadStatus}>Live · refreshed 4s ago</Text>
          </View>
        </View>
        <View style={styles.railsGrid}>
          {RAILS.map((r, i) => (
            <FadeUp key={r.name} delay={320 + i * 50} style={styles.railWrap}>
              <GlassCard interactive style={styles.railCard}>
                <View style={styles.railTop}>
                  <View style={styles.railDotWrap}><LiveDot size={6} /></View>
                  <Text style={styles.railName}>{r.name}</Text>
                  <StatusPill tone="mint">{r.state}</StatusPill>
                </View>
                <Text style={styles.railDesc}>{r.desc}</Text>
                <View style={styles.railMetrics}>
                  <View>
                    <Text style={styles.railMetricLabel}>UPTIME</Text>
                    <Text style={styles.railMetricValue}>{r.uptime}</Text>
                  </View>
                  <View>
                    <Text style={styles.railMetricLabel}>LATENCY p95</Text>
                    <Text style={styles.railMetricValue}>{r.lat}</Text>
                  </View>
                  <View>
                    <Text style={styles.railMetricLabel}>OWNER</Text>
                    <Text style={styles.railMetricValue}>{r.owner}</Text>
                  </View>
                </View>
              </GlassCard>
            </FadeUp>
          ))}
        </View>
      </FadeUp>

      {/* ─── Activity + fill rate side-by-side ─── */}
      <View style={styles.splitRow}>
        <FadeUp delay={620} style={{ flex: 1.4, minWidth: 360 }}>
          <View style={styles.sectionHead}>
            <View>
              <Eyebrow>LIVE ACTIVITY</Eyebrow>
              <Text style={styles.sectionTitle}>Last hour</Text>
            </View>
          </View>
          <GlassCard>
            {ACTIVITY.map((a, i) => (
              <View key={i} style={[styles.activityRow, i < ACTIVITY.length - 1 && styles.activityRowBorder]}>
                <View style={[styles.activityDot, a.tone === 'mint' && styles.activityDotMint, a.tone === 'warn' && styles.activityDotWarn, a.tone === 'err' && styles.activityDotErr]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.activityT}>{a.t}</Text>
                  <Text style={styles.activitySub}>{a.sub}</Text>
                </View>
                <Text style={styles.activityWhen}>{a.when}</Text>
              </View>
            ))}
          </GlassCard>
        </FadeUp>

        <FadeUp delay={680} style={{ flex: 1, minWidth: 320 }}>
          <View style={styles.sectionHead}>
            <View>
              <Eyebrow>FILL RATE</Eyebrow>
              <Text style={styles.sectionTitle}>Cumulative · today</Text>
            </View>
          </View>
          <GlassCard>
            <Text style={styles.fillBig}>95%</Text>
            <Text style={styles.fillSub}>of 284 posted shifts have at least one applicant</Text>
            <View style={styles.fillBars}>
              {FILL_BY_HOUR.map((p, i) => (
                <View key={i} style={styles.fillBarCol}>
                  <View style={[styles.fillBar, { height: p.f * 1.1 }]} />
                  <Text style={styles.fillBarLabel}>{p.h}</Text>
                </View>
              ))}
            </View>
          </GlassCard>
        </FadeUp>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // KPI
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  kpiWrap: { flex: 1, minWidth: 220 },
  kpi: { padding: spacing.lg },
  kpiLabel: { color: colors.white55, fontSize: 11.5, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  kpiBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: spacing.md },
  kpiValue: { color: colors.white, fontSize: 30, fontWeight: '900', letterSpacing: -1.2 },
  kpiDelta: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: spacing.md },
  kpiDeltaText: { fontSize: 12.5, fontWeight: '800' },
  kpiVs: { color: colors.white40, fontSize: 11, fontWeight: '600' },

  // Section
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: spacing.lg },
  sectionTitle: { color: colors.white, fontSize: 20, fontWeight: '900', letterSpacing: -0.7, marginTop: 6 },
  sectionHeadRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionHeadStatus: { color: colors.white55, fontSize: 11.5, fontWeight: '700' },

  // Rails
  railsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  railWrap: { flex: 1, minWidth: 260 },
  railCard: { padding: spacing.lg },
  railTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 6 },
  railDotWrap: { width: 10, height: 10, alignItems: 'center', justifyContent: 'center' },
  railName: { color: colors.white, fontSize: 14.5, fontWeight: '800', letterSpacing: -0.3, flex: 1 },
  railDesc: { color: colors.white50, fontSize: 11.5, fontWeight: '500', marginBottom: spacing.md },
  railMetrics: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.white06 },
  railMetricLabel: { color: colors.white35, fontSize: 9.5, fontWeight: '800', letterSpacing: 0.8 },
  railMetricValue: { color: colors.white, fontSize: 12.5, fontWeight: '800', marginTop: 3 },

  // Split row
  splitRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, marginTop: spacing.xxxl },

  // Activity
  activityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingVertical: 10 },
  activityRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.white06 },
  activityDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.white25, marginTop: 8 },
  activityDotMint: { backgroundColor: colors.electric },
  activityDotWarn: { backgroundColor: colors.warning },
  activityDotErr: { backgroundColor: colors.error },
  activityT: { color: colors.white, fontSize: 12.5, fontWeight: '700', letterSpacing: -0.15 },
  activitySub: { color: colors.white55, fontSize: 11.5, marginTop: 2 },
  activityWhen: { color: colors.white40, fontSize: 11, fontWeight: '600' },

  // Fill
  fillBig: { color: colors.white, fontSize: 48, fontWeight: '900', letterSpacing: -2 },
  fillSub: { color: colors.white50, fontSize: 12.5, marginTop: 4 },
  fillBars: { flexDirection: 'row', gap: 6, marginTop: spacing.xl, height: 140, alignItems: 'flex-end' },
  fillBarCol: { flex: 1, alignItems: 'center' },
  fillBar: { width: '100%', borderRadius: 6, backgroundColor: 'rgba(0,229,160,0.40)', borderTopWidth: 2, borderTopColor: colors.electric },
  fillBarLabel: { color: colors.white45, fontSize: 9.5, fontWeight: '700', marginTop: 6 },
});
