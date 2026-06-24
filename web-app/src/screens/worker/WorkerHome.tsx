/**
 * Worker Home (web) — desktop-shape shifts feed.
 *
 * Mobile worker-app has a phone-shaped vertical feed; on web we get more
 * screen, so we run a left "your ledger" pane and a right shifts feed.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { GlassCard, FadeUp, LiveDot } from '../../components/KlokdLayout';
import { Eyebrow, StatusPill, Avatar, GradientBtn, Sparkline } from '../../components/Primitives';
import { colors, spacing, radius } from '../../theme';

const SHIFTS = [
  { id: 's1', role: 'Waiter', venue: 'The Brew Bistro', area: 'Westlands', date: 'Tonight', time: '5:00 – 10:00 PM', pay: 1800, dist: '0.8 km', rating: 4.8, shifts: 23, highlighted: true },
  { id: 's2', role: 'Barista', venue: 'Java House · Sarit', area: 'Sarit Centre', date: 'Tomorrow', time: '7:00 AM – 2:00 PM', pay: 2100, dist: '1.6 km', rating: 4.6, shifts: 41 },
  { id: 's3', role: 'Bartender', venue: 'Brew Bistro · Kilimani', area: 'Kilimani', date: 'Fri', time: '6:00 – 11:00 PM', pay: 2200, dist: '3.1 km', rating: 4.7, shifts: 12 },
  { id: 's4', role: 'Cashier', venue: 'Artcaffe · Westgate', area: 'Westlands', date: 'Sat', time: '9:00 AM – 5:00 PM', pay: 1600, dist: '1.2 km', rating: 4.5, shifts: 67 },
];

export function WorkerHome() {
  return (
    <View style={styles.row}>
      {/* Left: your ledger */}
      <FadeUp delay={0} style={styles.left}>
        <GlassCard variant="raised" padding={spacing.xl}>
          <Eyebrow color={colors.electric}>YOUR LEDGER · THIS MONTH</Eyebrow>
          <Text style={styles.big}>KES 18,400</Text>
          <View style={styles.sparkRow}>
            <Sparkline values={[1, 2, 3, 5, 7, 9, 12, 14, 16, 17, 18, 18]} width={150} height={36} />
            <View style={styles.delta}>
              <Text style={styles.deltaText}>↑ KES 4,200</Text>
              <Text style={styles.deltaSub}>vs last month</Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statCell}>
              <Text style={styles.statK}>23</Text>
              <Text style={styles.statL}>Shifts completed</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.statK}>4.92</Text>
              <Text style={styles.statL}>Average rating</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.statK}>96%</Text>
              <Text style={styles.statL}>Show-up rate</Text>
            </View>
          </View>

          <View style={styles.nextPayout}>
            <View style={styles.mpesaIcon}>
              <Text style={styles.mpesaIconText}>M</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.nextPayoutLabel}>NEXT PAYOUT</Text>
              <Text style={styles.nextPayoutValue}>KES 1,640 · within 18 min of clock-out</Text>
            </View>
          </View>
        </GlassCard>

        <View style={{ height: spacing.md }} />

        <GlassCard padding={spacing.lg}>
          <Eyebrow color={colors.white45}>WALLET · M-PESA</Eyebrow>
          <Text style={styles.walletPhone}>0722 ••• 500</Text>
          <Text style={styles.walletVerified}>✓ Verified Mar 2026</Text>
        </GlassCard>
      </FadeUp>

      {/* Right: shifts feed */}
      <FadeUp delay={120} style={styles.right}>
        <View style={styles.feedHead}>
          <View>
            <Eyebrow>NEAR YOU · NAIROBI</Eyebrow>
            <Text style={styles.h2}>Tonight, 284 shifts open.</Text>
          </View>
          <View style={styles.liveRow}>
            <LiveDot />
            <Text style={styles.liveText}>12 new in last hour</Text>
          </View>
        </View>

        {SHIFTS.map((s, i) => (
          <FadeUp key={s.id} delay={200 + i * 60}>
            <Pressable>
              {({ hovered }: any) => (
                <GlassCard
                  interactive
                  variant={s.highlighted ? 'electric' : 'default'}
                  style={[styles.shiftCard, hovered && { transform: [{ translateY: -2 }] }] as any}
                >
                  <View style={styles.shiftLeft}>
                    <Text style={styles.shiftRole}>{s.role}</Text>
                    <Text style={styles.shiftVenue}>{s.venue}</Text>
                    <View style={styles.shiftMetaRow}>
                      <Text style={styles.shiftMeta}>{s.date} · {s.time}</Text>
                      <View style={styles.shiftDot} />
                      <Text style={styles.shiftMeta}>{s.area} · {s.dist}</Text>
                    </View>
                  </View>
                  <View style={styles.shiftMid}>
                    <View style={styles.empMeta}>
                      <Text style={styles.empMetaK}>★ {s.rating}</Text>
                      <Text style={styles.empMetaL}>{s.shifts} shifts hired</Text>
                    </View>
                  </View>
                  <View style={styles.shiftRight}>
                    <Text style={styles.shiftPay}>KES {s.pay.toLocaleString()}</Text>
                    <View style={styles.applyBtn}>
                      <Text style={styles.applyBtnText}>{s.highlighted ? 'Apply now →' : 'View →'}</Text>
                    </View>
                  </View>
                </GlassCard>
              )}
            </Pressable>
          </FadeUp>
        ))}

        <View style={{ height: spacing.md }} />
        <View style={styles.seeAll}>
          <Text style={styles.seeAllText}>See all 284 →</Text>
        </View>
      </FadeUp>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.lg, flexWrap: 'wrap', alignItems: 'flex-start' },
  left: { flex: 1, minWidth: 300, maxWidth: 380 },
  right: { flex: 2, minWidth: 420, gap: spacing.sm },

  big: { color: colors.white, fontSize: 36, fontWeight: '900', letterSpacing: -1.4, marginTop: 8 },
  sparkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md, marginBottom: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.white06 },
  delta: { flex: 1 },
  deltaText: { color: colors.electric, fontSize: 13, fontWeight: '800' },
  deltaSub: { color: colors.white50, fontSize: 11, marginTop: 2 },

  statsGrid: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  statCell: { flex: 1 },
  statK: { color: colors.white, fontSize: 19, fontWeight: '900', letterSpacing: -0.6 },
  statL: { color: colors.white50, fontSize: 10.5, marginTop: 3, fontWeight: '600' },

  nextPayout: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, backgroundColor: 'rgba(0,229,160,0.05)', borderWidth: 1, borderColor: 'rgba(0,229,160,0.25)' },
  mpesaIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#00A859', alignItems: 'center', justifyContent: 'center' },
  mpesaIconText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  nextPayoutLabel: { color: colors.electric, fontSize: 9.5, fontWeight: '900', letterSpacing: 0.7 },
  nextPayoutValue: { color: colors.white, fontSize: 13, fontWeight: '800', marginTop: 3 },

  walletPhone: { color: colors.white, fontSize: 18, fontWeight: '900', letterSpacing: -0.5, marginTop: 6 },
  walletVerified: { color: colors.electric, fontSize: 11.5, fontWeight: '700', marginTop: 4 },

  feedHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: spacing.md },
  h2: { color: colors.white, fontSize: 24, fontWeight: '900', letterSpacing: -1, marginTop: 6 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveText: { color: colors.white55, fontSize: 11.5, fontWeight: '700' },

  shiftCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, gap: spacing.md, flexWrap: 'wrap' },
  shiftLeft: { flex: 2, minWidth: 220 },
  shiftRole: { color: colors.white, fontSize: 15, fontWeight: '900', letterSpacing: -0.3 },
  shiftVenue: { color: colors.white75, fontSize: 13, marginTop: 2, fontWeight: '700' },
  shiftMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  shiftMeta: { color: colors.white55, fontSize: 11.5, fontWeight: '600' },
  shiftDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.white25 },

  shiftMid: { width: 130 },
  empMeta: {},
  empMetaK: { color: colors.white, fontSize: 13, fontWeight: '800' },
  empMetaL: { color: colors.white50, fontSize: 11, marginTop: 2, fontWeight: '600' },

  shiftRight: { alignItems: 'flex-end', minWidth: 130 },
  shiftPay: { color: colors.white, fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  applyBtn: { marginTop: 8, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(0,229,160,0.4)', backgroundColor: 'rgba(0,229,160,0.10)' },
  applyBtnText: { color: colors.electric, fontSize: 12, fontWeight: '800', letterSpacing: -0.2 },

  seeAll: { alignSelf: 'center', paddingVertical: spacing.md },
  seeAllText: { color: colors.electric, fontSize: 13.5, fontWeight: '800' },
});
