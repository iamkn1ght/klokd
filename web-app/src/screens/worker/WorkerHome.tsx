/**
 * Worker Home (web) — desktop-shape shifts feed with full async states.
 *
 * The feed is REAL (GET /shifts/available) for signed-in accounts: skeletons
 * while loading, empty state when nothing is nearby, retry on failure, and a
 * clearly-labelled sample feed for demo sessions.
 *
 * NOTE (honesty): the left "ledger" pane is still sample data until the
 * payments/comms rails are live (per project scope). It is labelled as such.
 */
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { GlassCard, FadeUp, LiveDot } from '../../components/KlokdLayout';
import { Eyebrow, Avatar } from '../../components/Primitives';
import { ShiftCardSkeleton, ErrorState, EmptyState } from '../../components/States';
import { colors, spacing, radius } from '../../theme';
import { useShifts } from '../../hooks/useShifts';
import { useAuth } from '../../context/AuthContext';
import { navigate } from '../../navigation/router';

const STATUS_LABEL: Record<string, string> = {
  live: 'Live from Klokd API',
  empty: 'Live · nothing nearby right now',
  demo: 'Sample feed · demo data',
  error: 'Feed unavailable',
};

export function WorkerHome() {
  const { shifts, status, error, retry, apply, applying, appliedIds } = useShifts();
  const { account } = useAuth();

  // One transient apply error at a time — keyed by shift id so it renders on
  // the offending card and clears on the next attempt.
  const [applyError, setApplyError] = useState<{ id: string; msg: string } | null>(null);

  const handleApply = (id: string) => {
    setApplyError(null);
    apply(id).catch((e: Error) => setApplyError({ id, msg: e.message || 'Could not apply — try again.' }));
  };

  return (
    <View style={styles.row}>
      {/* Left: your ledger (sample data until payments rail ships) */}
      <FadeUp delay={0} style={styles.left}>
        <GlassCard variant="raised" padding={spacing.xl}>
          <View style={styles.ledgerHead}>
            <Eyebrow color={colors.electric}>YOUR LEDGER · SAMPLE</Eyebrow>
            <View style={styles.ledgerChip}>
              <Text style={styles.ledgerChipText}>DEMO</Text>
            </View>
            <Avatar initials={account?.initials ?? 'K'} size={30} tone="electric" />
          </View>
          <Text style={styles.big}>KES 18,400</Text>
          <Text style={styles.ledgerNote}>
            Payments rails aren’t live yet — this pane shows sample figures.
          </Text>

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
      </FadeUp>

      {/* Right: shifts feed */}
      <FadeUp delay={120} style={styles.right}>
        <View style={styles.feedHead}>
          <View>
            <Eyebrow>
              {status === 'demo' ? 'SAMPLE FEED · DEMO' : 'NEAR YOU · NAIROBI'}
            </Eyebrow>
            <Text style={styles.h2}>
              {status === 'live' && `${shifts.length} shifts open near you.`}
              {status === 'loading' && 'Finding shifts near you…'}
              {status === 'empty' && 'No shifts open right now.'}
              {status === 'demo' && 'Sample shifts.'}
              {status === 'error' && 'Feed unavailable.'}
            </Text>
          </View>
          <View style={styles.liveRow}>
            <LiveDot color={status === 'error' ? colors.error : status === 'demo' ? colors.warning : colors.electric} />
            <Text style={styles.liveText}>{STATUS_LABEL[status]}</Text>
          </View>
        </View>

        {status === 'loading' && (
          <View style={styles.stack}>
            <ShiftCardSkeleton />
            <ShiftCardSkeleton />
            <ShiftCardSkeleton />
          </View>
        )}

        {status === 'error' && (
          <ErrorState
            title="Couldn’t load shifts."
            detail={error ?? 'The Klokd API didn’t answer.'}
            onRetry={retry}
          />
        )}

        {status === 'empty' && (
          <EmptyState
            title="No shifts open nearby."
            detail="New shifts are posted throughout the day. We’ll show them here the moment they go live."
          />
        )}

        {(status === 'live' || status === 'demo') && (
          <View style={styles.stack}>
            {shifts.map((s, i) => (
              <FadeUp key={s.id} delay={200 + i * 60}>
                <View style={styles.shiftRow}>
                  <GlassCard
                    interactive
                    variant={s.highlighted ? 'electric' : 'default'}
                    style={styles.shiftCard}
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
                      <Text style={styles.empMetaK}>{s.rating != null ? `★ ${s.rating.toFixed(1)}` : 'New'}</Text>
                      <Text style={styles.empMetaL}>{s.shifts} shifts hired</Text>
                    </View>
                    <View style={styles.shiftRight}>
                      <Text style={styles.shiftPay}>KES {s.pay.toLocaleString()}</Text>
                      {(() => {
                        const isApplied = appliedIds.has(s.id);
                        const isApplying = applying.has(s.id);
                        return (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Apply to ${s.role} at ${s.venue}`}
                            disabled={isApplied || isApplying}
                            onPress={() =>
                              status === 'demo'
                                ? navigate('/signin?persona=worker')
                                : handleApply(s.id)
                            }
                            style={({ hovered }: any) => [
                              styles.applyBtn,
                              isApplied && styles.applyBtnDone,
                              (hovered || s.highlighted) && !isApplied && !isApplying && styles.applyBtnHot,
                            ]}
                          >
                            <Text
                              style={[
                                styles.applyBtnText,
                                isApplied && styles.applyBtnTextDone,
                              ]}
                            >
                              {isApplied ? 'Applied ✓' : isApplying ? 'Applying…' : s.highlighted ? 'Apply now →' : 'View →'}
                            </Text>
                          </Pressable>
                        );
                      })()}
                      {applyError?.id === s.id && (
                        <Text style={styles.applyErr} numberOfLines={2}>{applyError.msg}</Text>
                      )}
                    </View>
                  </GlassCard>
                </View>
              </FadeUp>
            ))}
          </View>
        )}

        {status === 'live' && (
          <View style={styles.seeAll}>
            <Text style={styles.seeAllText}>Pull to refresh on mobile · this feed auto-loads live</Text>
          </View>
        )}
      </FadeUp>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.lg, flexWrap: 'wrap', alignItems: 'flex-start' },
  left: { flex: 1, minWidth: 300, maxWidth: 380 },
  right: { flex: 2, minWidth: 320, gap: spacing.sm },

  ledgerHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ledgerChip: { flex: 1, alignItems: 'flex-start' },
  ledgerChipText: { color: colors.warning, fontSize: 9.5, fontWeight: '900', letterSpacing: 0.8, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,179,71,0.35)', backgroundColor: 'rgba(255,179,71,0.10)', overflow: 'hidden' },
  ledgerNote: { color: colors.white55, fontSize: 12, lineHeight: 17, marginTop: 6, marginBottom: spacing.md },
  big: { color: colors.white, fontSize: 36, fontWeight: '900', letterSpacing: -1.4 },

  nextPayout: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, backgroundColor: 'rgba(0,229,160,0.05)', borderWidth: 1, borderColor: 'rgba(0,229,159,0.25)', marginTop: spacing.md },
  mpesaIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#00A859', alignItems: 'center', justifyContent: 'center' },
  mpesaIconText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  nextPayoutLabel: { color: colors.electric, fontSize: 9.5, fontWeight: '900', letterSpacing: 0.7 },
  nextPayoutValue: { color: colors.white, fontSize: 13, fontWeight: '800', marginTop: 3 },

  feedHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: spacing.md, flexWrap: 'wrap', gap: spacing.sm },
  h2: { color: colors.white, fontSize: 24, fontWeight: '900', letterSpacing: -1, marginTop: 6 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveText: { color: colors.white60, fontSize: 11.5, fontWeight: '700' },

  stack: { gap: spacing.sm },

  shiftRow: {},
  shiftCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, gap: spacing.md, flexWrap: 'wrap' },
  shiftLeft: { flex: 2, minWidth: 200 },
  shiftRole: { color: colors.white, fontSize: 15, fontWeight: '900', letterSpacing: -0.3 },
  shiftVenue: { color: colors.white75, fontSize: 13, marginTop: 2, fontWeight: '700' },
  shiftMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  shiftMeta: { color: colors.white55, fontSize: 11.5, fontWeight: '600' },
  shiftDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.white25 },
  shiftMid: { width: 120 },
  empMetaK: { color: colors.white, fontSize: 13, fontWeight: '800' },
  empMetaL: { color: colors.white50, fontSize: 11, marginTop: 2, fontWeight: '600' },
  shiftRight: { alignItems: 'flex-end', minWidth: 120 },
  shiftPay: { color: colors.white, fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  applyBtn: { marginTop: 8, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(0,229,160,0.4)', backgroundColor: 'rgba(0,229,160,0.10)' },
  applyBtnHot: { borderColor: colors.electric, backgroundColor: 'rgba(0,229,160,0.18)' },
  applyBtnDone: { borderColor: 'rgba(255,255,255,0.18)', backgroundColor: 'rgba(255,255,255,0.06)' },
  applyBtnText: { color: colors.electric, fontSize: 12, fontWeight: '800', letterSpacing: -0.2 },
  applyBtnTextDone: { color: colors.white60 },
  applyErr: { color: colors.error, fontSize: 10.5, fontWeight: '700', marginTop: 6, maxWidth: 140, textAlign: 'right' },

  seeAll: { alignSelf: 'center', paddingVertical: spacing.md },
  seeAllText: { color: colors.white45, fontSize: 12, fontWeight: '700' },
});
