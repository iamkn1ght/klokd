/**
 * Worker Home (web) — your ledger + shifts near you. All real:
 *   GET /me/worker          ledger (shifts done, show-up, rating, this month)
 *   GET /shifts/available   nearby open shifts (browser location if allowed,
 *                           Nairobi CBD otherwise — Klokd never stores it)
 *   GET /me/shifts          which shifts you've already applied to
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { GlassCard, FadeUp } from '../../components/KlokdLayout';
import { Eyebrow, Avatar, GradientBtn, GhostBtn, StatusPill } from '../../components/Primitives';
import { ShiftCardSkeleton, ErrorState, EmptyState } from '../../components/States';
import { Notice } from '../../components/Form';
import { colors, spacing, radius } from '../../theme';
import { useApiData, useApiAction } from '../../hooks/useApiData';
import { useAuth } from '../../context/AuthContext';
import { navigate } from '../../navigation/router';
import { kes, when, hours } from '../../lib/format';

export interface WorkerMe {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  kycTier: number;
  skills: string[];
  certificates: number;
  consent: { identity: boolean; location: boolean; at: string | null };
  showUpRate: number | null;
  rating: number | null;
  ratingCount: number;
  completedShifts: number;
  upcomingShifts: number;
  monthEarningsKes: number;
  monthShifts: number;
  paymentsLive: boolean;
  memberSince: string;
}

interface FeedShift {
  id: string;
  role: string;
  startTime: string;
  endTime: string;
  rateKes: number;
  locationName: string | null;
  distanceMeters?: number;
  description: string | null;
  employer: { businessName: string; ratingAggregate: number | null; totalShifts: number } | null;
}

const CBD = { lat: -1.2864, lng: 36.8172 };

export function WorkerHome() {
  const { account } = useAuth();
  const me = useApiData<WorkerMe>('/me/worker');
  const [where, setWhere] = useState<{ lat: number; lng: number; label: string }>({ ...CBD, label: 'Nairobi CBD' });
  const feed = useApiData<FeedShift[]>(`/shifts/available?lat=${where.lat}&lng=${where.lng}&radiusKm=25`, { pollMs: 60_000 });
  const mine = useApiData<{ applied: { shift: { id: string } }[]; offers: { id: string }[] }>('/me/shifts');
  const act = useApiAction();
  const [applying, setApplying] = useState<string | null>(null);
  const [applyErr, setApplyErr] = useState<{ id: string; msg: string } | null>(null);

  const appliedIds = useMemo(() => new Set((mine.data?.applied ?? []).map(a => a.shift.id)), [mine.data]);

  // Use the browser's location for distances when the worker allows it.
  const locate = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      p => setWhere({ lat: p.coords.latitude, lng: p.coords.longitude, label: 'your location' }),
      () => undefined,
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 }
    );
  };
  useEffect(() => {
    try {
      (navigator as any).permissions?.query({ name: 'geolocation' }).then((r: any) => r.state === 'granted' && locate());
    } catch {
      /* permissions API unavailable */
    }
  }, []);

  const apply = async (id: string) => {
    setApplying(id);
    setApplyErr(null);
    try {
      await act(`/shifts/${id}/apply`);
      mine.reload();
    } catch (e: any) {
      setApplyErr({ id, msg: e.message });
    } finally {
      setApplying(null);
    }
  };

  const m = me.data;
  const verified = m?.verificationStatus === 'APPROVED';

  return (
    <View style={styles.row}>
      <FadeUp delay={0} style={styles.left}>
        <GlassCard variant="raised" padding={spacing.xl}>
          <View style={styles.ledgerHead}>
            <Eyebrow color={colors.electric}>YOUR LEDGER</Eyebrow>
            <Avatar initials={account?.initials ?? 'K'} size={30} tone="electric" />
          </View>
          {me.status === 'error' ? (
            <Text style={styles.note}>Couldn’t load your ledger. {me.error}</Text>
          ) : (
            <>
              <Text style={styles.big}>{m ? kes(m.monthEarningsKes) : '—'}</Text>
              <Text style={styles.note}>
                {m ? `Earned this month from ${m.monthShifts} shift${m.monthShifts === 1 ? '' : 's'}, after statutory deductions.` : 'Loading…'}
              </Text>
              <View style={styles.stats}>
                <Stat k={m ? String(m.completedShifts) : '—'} l="shifts done" />
                <Stat k={m?.showUpRate != null ? `${Math.round(m.showUpRate)}%` : '—'} l="show-up" />
                <Stat k={m?.rating != null ? `★ ${m.rating.toFixed(1)}` : '—'} l={m && m.ratingCount < 3 ? `rating (${m.ratingCount}/3)` : 'rating'} />
              </View>
              {m && !m.paymentsLive && (
                <Text style={styles.small}>M-Pesa payouts start when Klokd payments go live. Your pay is tracked in the Pay tab until then.</Text>
              )}
            </>
          )}
        </GlassCard>

        {m && !verified && (
          <View style={styles.verify}>
            <Text style={styles.verifyH}>Verify your ID to apply for shifts.</Text>
            <Text style={styles.verifyP}>It takes a minute: your National ID number is checked with the government register through Identiti.</Text>
            <GradientBtn size="sm" onPress={() => navigate('/worker/profile')}>Verify my ID</GradientBtn>
          </View>
        )}
        {(mine.data?.offers.length ?? 0) > 0 && (
          <Pressable onPress={() => navigate('/worker/shifts')} style={styles.offer}>
            <Text style={styles.offerH}>
              {mine.data!.offers.length} shift{mine.data!.offers.length === 1 ? '' : 's'} waiting for your answer →
            </Text>
          </Pressable>
        )}
      </FadeUp>

      <View style={styles.right}>
        <View style={styles.feedHead}>
          <View>
            <Eyebrow>SHIFTS NEAR YOU</Eyebrow>
            <Text style={styles.h2}>
              {feed.status === 'ready' ? `${feed.data!.length} open within 25 km of ${where.label}` : 'Finding shifts…'}
            </Text>
          </View>
          {where.label !== 'your location' && <GhostBtn size="sm" onPress={locate}>Use my location</GhostBtn>}
        </View>

        {feed.status === 'loading' && (
          <View style={styles.list}>
            {[0, 1, 2].map(i => (
              <GlassCard key={i} padding={spacing.lg}>
                <ShiftCardSkeleton />
              </GlassCard>
            ))}
          </View>
        )}
        {feed.status === 'error' && <ErrorState title="Couldn’t load shifts." detail={feed.error ?? undefined} onRetry={feed.reload} />}
        {feed.status === 'ready' && feed.data!.length === 0 && (
          <EmptyState title="No open shifts nearby right now." detail="New shifts appear here the moment a business posts them. Check back soon." />
        )}
        {feed.status === 'ready' && feed.data!.length > 0 && (
          <View style={styles.list}>
            {feed.data!.map((s, i) => {
              const applied = appliedIds.has(s.id);
              return (
                <FadeUp key={s.id} delay={Math.min(i, 6) * 40}>
                  <GlassCard padding={spacing.lg}>
                    <Pressable onPress={() => navigate(`/worker/shifts/${s.id}`)} accessibilityRole="link">
                      <View style={styles.cardTop}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.role}>{s.role}</Text>
                          <Text style={styles.venue}>
                            {s.employer?.businessName ?? 'Venue'} · {s.locationName ?? 'Nairobi'}
                            {s.distanceMeters != null ? ` · ${(s.distanceMeters / 1000).toFixed(1)} km` : ''}
                          </Text>
                          <Text style={styles.meta}>{when(s.startTime, s.endTime)} · {hours(s.startTime, s.endTime)}</Text>
                        </View>
                        <Text style={styles.pay}>{kes(s.rateKes)}</Text>
                      </View>
                    </Pressable>
                    <View style={styles.cardActions}>
                      {s.employer?.ratingAggregate != null && (
                        <StatusPill tone="neutral">★ {s.employer.ratingAggregate.toFixed(1)} venue</StatusPill>
                      )}
                      <View style={{ flex: 1 }} />
                      {applied ? (
                        <StatusPill tone="mint">applied</StatusPill>
                      ) : (
                        <GradientBtn size="sm" disabled={!verified || applying === s.id} onPress={() => apply(s.id)}>
                          {applying === s.id ? 'Applying…' : 'Apply'}
                        </GradientBtn>
                      )}
                    </View>
                    {applyErr?.id === s.id && <Notice tone="err">{applyErr.msg}</Notice>}
                  </GlassCard>
                </FadeUp>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}

function Stat({ k, l }: { k: string; l: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statK}>{k}</Text>
      <Text style={styles.statL}>{l}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xl, alignItems: 'flex-start' },
  left: { flex: 1, minWidth: 280, maxWidth: 420, gap: spacing.md },
  right: { flex: 2, minWidth: 300 },
  ledgerHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  big: { color: colors.white, fontSize: 32, fontWeight: '900', letterSpacing: -1.4, marginTop: spacing.md },
  note: { color: colors.white60, fontSize: 12.5, lineHeight: 18, marginTop: 4 },
  small: { color: colors.white50, fontSize: 11.5, lineHeight: 16, marginTop: spacing.md },
  stats: { flexDirection: 'row', marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.white06 },
  stat: { flex: 1 },
  statK: { color: colors.white, fontSize: 17, fontWeight: '900', letterSpacing: -0.4 },
  statL: { color: colors.white50, fontSize: 10.5, fontWeight: '800', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.4 },
  verify: { padding: spacing.lg, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.warnAlpha['25'], backgroundColor: colors.warnAlpha['12'], gap: 8 },
  verifyH: { color: colors.white, fontSize: 14.5, fontWeight: '900' },
  verifyP: { color: colors.white70, fontSize: 12.5, lineHeight: 18 },
  offer: { padding: spacing.lg, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.electricAlpha['35'], backgroundColor: colors.electricAlpha['08'] },
  offerH: { color: colors.electric, fontSize: 14, fontWeight: '900' },
  feedHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: spacing.md, gap: spacing.md, flexWrap: 'wrap' },
  h2: { color: colors.white, fontSize: 19, fontWeight: '900', letterSpacing: -0.6, marginTop: 6 },
  list: { gap: spacing.sm },
  cardTop: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  role: { color: colors.white, fontSize: 16, fontWeight: '900', letterSpacing: -0.4 },
  venue: { color: colors.white70, fontSize: 12.5, fontWeight: '700', marginTop: 3 },
  meta: { color: colors.white50, fontSize: 12, fontWeight: '600', marginTop: 3 },
  pay: { color: colors.electric, fontSize: 17, fontWeight: '900', letterSpacing: -0.4 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.white06 },
});
