/**
 * Payments — live escrow positions, payouts today, failed-retry queue.
 *
 * MONEY RULE: this screen is read + retry-trigger only. All money mutations
 * land via KP rail and are recorded as Hakken audit events. No direct
 * editing of payout amounts from here.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GlassCard, FadeUp, LiveDot } from '../../components/KlokdLayout';
import { Eyebrow, StatusPill, Avatar, GhostBtn, Sparkline } from '../../components/Primitives';
import { colors, spacing, radius } from '../../theme';

const HERO = [
  { k: 'KES 14.2M', l: 'Held in escrow', sub: 'across 47 employers' },
  { k: 'KES 482K', l: 'Released today', sub: '318 payouts · avg 18 min' },
  { k: 'KES 4,200', l: 'Disputed escrow', sub: '3 cases · awaiting admin' },
  { k: '2', l: 'Failed retries', sub: 'auto-retrying in <5 min' },
];

const FAILED = [
  { id: 'pay-9842', worker: { name: 'Joseph K.', initials: 'JK' }, amount: 1640, mpesa: '0722 ••• 500', reason: 'Daraja: Counterparty suspended', attempts: 2, nextRetry: 'in 4 min' },
  { id: 'pay-9839', worker: { name: 'Faith W.', initials: 'FW' }, amount: 1450, mpesa: '0710 ••• 218', reason: 'Daraja: Insufficient float (timeout)', attempts: 1, nextRetry: 'in 2 min' },
];

const ESCROW_TOP = [
  { name: 'Brew Bistro Limited', initials: 'BB', amount: 2_840_000, shifts: 38, spark: [1.8, 2.0, 2.1, 2.3, 2.4, 2.5, 2.6, 2.65, 2.7, 2.78, 2.82, 2.84] },
  { name: 'Sarova Stanley', initials: 'SS', amount: 1_920_000, shifts: 24, spark: [1.6, 1.62, 1.7, 1.72, 1.75, 1.78, 1.8, 1.82, 1.85, 1.88, 1.9, 1.92] },
  { name: 'Java House (group)', initials: 'JH', amount: 1_640_000, shifts: 31, spark: [1.4, 1.45, 1.5, 1.52, 1.55, 1.58, 1.6, 1.62, 1.62, 1.63, 1.64, 1.64] },
  { name: 'Artcaffe (group)', initials: 'AC', amount: 1_280_000, shifts: 22, spark: [1.0, 1.05, 1.1, 1.12, 1.15, 1.18, 1.2, 1.22, 1.24, 1.26, 1.27, 1.28] },
  { name: 'KICC Events', initials: 'KE', amount: 940_000, shifts: 12, spark: [0.6, 0.7, 0.75, 0.8, 0.82, 0.85, 0.88, 0.9, 0.92, 0.93, 0.94, 0.94] },
];

const RECON = [
  { k: 'Funded in', v: 'KES 1,420,000', tone: 'mint' as const },
  { k: 'Released out', v: 'KES 482,400', tone: 'neutral' as const },
  { k: 'Refunded', v: 'KES 12,840', tone: 'neutral' as const },
  { k: 'Reserved (disputes)', v: 'KES 4,200', tone: 'warn' as const },
  { k: 'KP fees (1.4%)', v: 'KES 6,754', tone: 'neutral' as const },
];

export function PaymentsScreen() {
  return (
    <View>
      {/* Hero row */}
      <View style={styles.heroRow}>
        {HERO.map((h, i) => (
          <FadeUp key={i} delay={i * 60} style={styles.heroWrap}>
            <GlassCard interactive style={styles.heroCard}>
              <Text style={styles.heroLabel}>{h.l}</Text>
              <Text style={styles.heroValue}>{h.k}</Text>
              <Text style={styles.heroSub}>{h.sub}</Text>
            </GlassCard>
          </FadeUp>
        ))}
      </View>

      {/* Failed retries */}
      <FadeUp delay={280} style={{ marginTop: spacing.xxxl }}>
        <View style={styles.sectionHead}>
          <View>
            <Eyebrow color={colors.warning}>FAILED RETRIES</Eyebrow>
            <Text style={styles.sectionTitle}>Auto-retrying — manual override only if needed.</Text>
          </View>
          <View style={styles.liveRow}>
            <LiveDot color={colors.warning} />
            <Text style={styles.liveText}>Next retry sweep · 60s</Text>
          </View>
        </View>

        <GlassCard padding={0}>
          {FAILED.map((f, i) => (
            <View key={f.id} style={[styles.failRow, i < FAILED.length - 1 && styles.failRowBorder]}>
              <View style={{ width: 36 }}>
                <Avatar initials={f.worker.initials} size={32} tone="electric" />
              </View>
              <View style={{ flex: 2 }}>
                <Text style={styles.failName}>{f.worker.name}</Text>
                <Text style={styles.failPayId}>{f.id} → {f.mpesa}</Text>
              </View>
              <View style={{ flex: 2.4 }}>
                <Text style={styles.failReasonLabel}>REASON</Text>
                <Text style={styles.failReason}>{f.reason}</Text>
              </View>
              <View style={{ width: 90, alignItems: 'flex-start' }}>
                <Text style={styles.failReasonLabel}>ATTEMPTS</Text>
                <Text style={styles.failAttempts}>{f.attempts} / 5</Text>
              </View>
              <View style={{ width: 110, alignItems: 'flex-start' }}>
                <Text style={styles.failReasonLabel}>NEXT</Text>
                <Text style={styles.failRetry}>{f.nextRetry}</Text>
              </View>
              <View style={{ width: 130, alignItems: 'flex-end' }}>
                <Text style={styles.failAmount}>KES {f.amount.toLocaleString()}</Text>
                <View style={{ height: spacing.xs }} />
                <GhostBtn size="sm">Retry now</GhostBtn>
              </View>
            </View>
          ))}
        </GlassCard>
      </FadeUp>

      {/* Two-up: escrow leaderboard + reconciliation */}
      <View style={styles.splitRow}>
        <FadeUp delay={380} style={{ flex: 1.6, minWidth: 420 }}>
          <View style={styles.sectionHead}>
            <View>
              <Eyebrow>ESCROW LEADERBOARD</Eyebrow>
              <Text style={styles.sectionTitle}>Top 5 employers by held balance</Text>
            </View>
          </View>
          <GlassCard padding={0}>
            {ESCROW_TOP.map((e, i) => (
              <View key={e.name} style={[styles.escrowRow, i < ESCROW_TOP.length - 1 && styles.escrowRowBorder]}>
                <Text style={styles.escrowRank}>{(i + 1).toString().padStart(2, '0')}</Text>
                <Avatar initials={e.initials} size={32} tone="volt" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.escrowName}>{e.name}</Text>
                  <Text style={styles.escrowShifts}>{e.shifts} active shifts · 7d trend</Text>
                </View>
                <Sparkline values={e.spark} color={colors.electric} width={70} />
                <Text style={styles.escrowAmount}>KES {(e.amount / 1000).toLocaleString()}k</Text>
              </View>
            ))}
          </GlassCard>
        </FadeUp>

        <FadeUp delay={440} style={{ flex: 1, minWidth: 280 }}>
          <View style={styles.sectionHead}>
            <View>
              <Eyebrow>RECONCILIATION · TODAY</Eyebrow>
              <Text style={styles.sectionTitle}>KP ledger ↔ Klokd ledger</Text>
            </View>
          </View>
          <GlassCard>
            {RECON.map((r, i) => (
              <View key={i} style={[styles.reconRow, i < RECON.length - 1 && styles.reconRowBorder]}>
                <Text style={styles.reconK}>{r.k}</Text>
                <Text style={[styles.reconV, r.tone === 'warn' && { color: colors.warning }, r.tone === 'mint' && { color: colors.electric }]}>{r.v}</Text>
              </View>
            ))}
            <View style={styles.reconFootRow}>
              <View style={styles.reconFootBadge}>
                <LiveDot size={6} />
                <Text style={styles.reconFootBadgeText}>BALANCED</Text>
              </View>
              <Text style={styles.reconFootDelta}>Δ KES 0 · last check 2 min ago</Text>
            </View>
          </GlassCard>
        </FadeUp>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  heroWrap: { flex: 1, minWidth: 220 },
  heroCard: { padding: spacing.lg },
  heroLabel: { color: colors.white55, fontSize: 11.5, fontWeight: '700', letterSpacing: 0.3, textTransform: 'uppercase' },
  heroValue: { color: colors.white, fontSize: 28, fontWeight: '900', letterSpacing: -1.1, marginTop: spacing.sm },
  heroSub: { color: colors.white50, fontSize: 11.5, marginTop: spacing.xs },

  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: spacing.lg, flexWrap: 'wrap', gap: spacing.sm },
  sectionTitle: { color: colors.white, fontSize: 19, fontWeight: '900', letterSpacing: -0.6, marginTop: 4 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveText: { color: colors.white55, fontSize: 11.5, fontWeight: '700' },

  failRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  failRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.white06 },
  failName: { color: colors.white, fontSize: 13, fontWeight: '800', letterSpacing: -0.2 },
  failPayId: { color: colors.white40, fontSize: 10.5, marginTop: 2, fontWeight: '600' },
  failReasonLabel: { color: colors.white35, fontSize: 9.5, fontWeight: '900', letterSpacing: 0.7 },
  failReason: { color: colors.warning, fontSize: 12, fontWeight: '700', marginTop: 3 },
  failAttempts: { color: colors.white, fontSize: 13, fontWeight: '800', marginTop: 3 },
  failRetry: { color: colors.white75, fontSize: 12, fontWeight: '700', marginTop: 3 },
  failAmount: { color: colors.white, fontSize: 14, fontWeight: '900' },

  splitRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, marginTop: spacing.xxxl, alignItems: 'flex-start' },

  escrowRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  escrowRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.white06 },
  escrowRank: { color: colors.white35, fontSize: 11, fontWeight: '900', letterSpacing: 0.5, width: 22 },
  escrowName: { color: colors.white, fontSize: 13, fontWeight: '800', letterSpacing: -0.2 },
  escrowShifts: { color: colors.white45, fontSize: 11, marginTop: 2, fontWeight: '600' },
  escrowAmount: { color: colors.white, fontSize: 14, fontWeight: '900' },

  reconRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  reconRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.white06 },
  reconK: { color: colors.white60, fontSize: 12.5, fontWeight: '600' },
  reconV: { color: colors.white, fontSize: 13.5, fontWeight: '800' },
  reconFootRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.white10 },
  reconFootBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(0,229,160,0.08)', borderWidth: 1, borderColor: 'rgba(0,229,160,0.28)' },
  reconFootBadgeText: { color: colors.electric, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  reconFootDelta: { color: colors.white50, fontSize: 11, fontWeight: '600' },
});
