/**
 * Employer Dashboard (web). Everything on it is real:
 *   GET /employer/overview          pay committed, spend, show-up, approvals
 *   GET /shifts/mine                your shifts
 *   GET /attendance/feed            live activity at your venues
 *   GET /identity/employers/profile verification banner
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { GlassCard, FadeUp, LiveDot } from '../../components/KlokdLayout';
import { Eyebrow, StatusPill, GradientBtn, GhostBtn } from '../../components/Primitives';
import { ShiftCardSkeleton, ErrorState, EmptyState } from '../../components/States';
import { colors, spacing, radius } from '../../theme';
import { useEmployerShifts, EmployerShift } from '../../hooks/useEmployerShifts';
import { useEmployerProfile } from '../../hooks/useEmployerProfile';
import { navigate } from '../../navigation/router';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { useApiData } from '../../hooks/useApiData';
import { kes } from '../../lib/format';

interface Overview {
  shiftsThisWeek: number;
  openShifts: number;
  committedKes: number;
  committedShifts: number;
  spentThisWeekKes: number;
  awaitingApproval: number;
  showUpRate: number | null;
  paymentsLive: boolean;
}

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
  const { profile } = useEmployerProfile();
  const ov = useApiData<Overview>('/employer/overview', { pollMs: 60_000 });
  const o = ov.data;

  const live = status === 'live';
  const openCount = live ? shifts!.filter(s => s.status === 'POSTED').length : 0;

  const kpis = [
    { k: o ? String(o.shiftsThisWeek) : '—', l: 'Shifts this week', delta: o ? `${o.openShifts} open for applicants` : '' },
    { k: o ? kes(o.spentThisWeekKes) : '—', l: 'Spent this week', delta: 'shift pay + Klokd fee, from clock-outs' },
    { k: o?.showUpRate != null ? `${o.showUpRate}%` : '—', l: 'Show-up rate', delta: o?.showUpRate != null ? 'workers who started vs no-shows' : 'appears after your first shift starts' },
  ];

  return (
    <View>
      {/* Business verification gate — posting is blocked until both checks pass. */}
      {profile && !profile.canPostShifts && (
        <FadeUp delay={0} style={styles.verifyBanner}>
          <View style={{ flex: 1, minWidth: 240 }}>
            <Text style={styles.verifyH}>Verify your business to start posting shifts.</Text>
            <Text style={styles.verifyP}>
              {!profile.kraPinMasked ? 'Add your KRA PIN' : 'KRA PIN on file'} ·{' '}
              {profile.wiba.status === 'confirmed' ? 'WIBA cover on file' : profile.wiba.status === 'expired' ? 'renew your WIBA policy' : 'declare your WIBA policy'}
            </Text>
          </View>
          <GradientBtn size="sm" onPress={() => navigate('/employer/verify')}>Verify business</GradientBtn>
        </FadeUp>
      )}

      {/* Pay committed + KPIs */}
      <View style={styles.topRow}>
        <FadeUp delay={0} style={styles.escrowWrap}>
          <GlassCard variant="electric" padding={spacing.xl}>
            <View style={styles.escrowHeadRow}>
              <Eyebrow color={colors.electric}>PAY COMMITTED</Eyebrow>
              {o && o.awaitingApproval > 0 && (
                <Pressable onPress={() => navigate('/employer/pay')}>
                  <Text style={styles.approveLink}>{o.awaitingApproval} to approve →</Text>
                </Pressable>
              )}
            </View>
            <View style={styles.escrowBigRow}>
              <View>
                <Text style={styles.escrowBig}>{o ? kes(o.committedKes) : '—'}</Text>
                <Text style={styles.escrowSub}>
                  {o ? `across ${o.committedShifts} upcoming or open shift${o.committedShifts === 1 ? '' : 's'}, including the 4% Klokd fee` : 'Loading…'}
                </Text>
              </View>
            </View>
            <Text style={styles.escrowNote}>
              {o?.paymentsLive
                ? 'You fund each shift by M-Pesa when you pick a worker; it’s paid out after the shift.'
                : 'M-Pesa funding switches on when Klokd payments (Kipkiren Pay) go live. Until then pay is tracked and approved here, and settled once payments are live.'}
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
            </Text>
          </View>
          {(
            <View style={styles.headActions}>
              <GhostBtn size="sm" onPress={() => navigate('/employer/shifts')}>All shifts</GhostBtn>
              <GradientBtn size="sm" onPress={() => navigate('/employer/shifts/new')}>Post a shift</GradientBtn>
            </View>
          )}
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
                <GlassCard
                  interactive
                  padding={spacing.lg}
                  onPress={status === 'live' ? () => navigate(`/employer/shifts/${s.id}`) : undefined}
                >
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

      </FadeUp>

      {/* Live activity — real attendance events across this employer's shifts */}
      <FadeUp delay={520} style={{ marginTop: spacing.xxxl }}>
        <View style={styles.sectionHead}>
          <View>
            <Eyebrow>LIVE ACTIVITY</Eyebrow>
            <Text style={styles.h2}>What’s happening at your venues.</Text>
          </View>
          <View style={styles.liveRow}>
            <LiveDot color={colors.electric} />
            <Text style={styles.liveText}>Updates every 20 seconds</Text>
          </View>
        </View>
        <ActivityFeed />
      </FadeUp>
    </View>
  );
}

const styles = StyleSheet.create({
  verifyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.warnAlpha['25'],
    backgroundColor: colors.warnAlpha['12'],
    marginBottom: spacing.xl,
  },
  verifyH: { color: colors.white, fontSize: 15, fontWeight: '900', letterSpacing: -0.3 },
  verifyP: { color: colors.white70, fontSize: 12.5, marginTop: 3, fontWeight: '600' },
  headActions: { flexDirection: 'row', gap: spacing.sm },
  topRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, alignItems: 'stretch' },
  escrowWrap: { flex: 2, minWidth: 260 },
  kpiCol: { flex: 1, minWidth: 240, gap: spacing.md },

  escrowHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  approveLink: { color: colors.warning, fontSize: 12.5, fontWeight: '800' },
  escrowBigRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm, gap: spacing.md, flexWrap: 'wrap' },
  escrowBig: { color: colors.white, fontSize: 36, fontWeight: '900', letterSpacing: -1.6 },
  escrowSub: { color: colors.white60, fontSize: 12, marginTop: 4 },
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


  feedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 10, paddingHorizontal: spacing.md, borderRadius: radius.md },
  feedDot: { width: 8, height: 8, borderRadius: 4 },
  feedText: { color: colors.white, fontSize: 13.5, fontWeight: '700' },
  feedMeta: { color: colors.white50, fontSize: 11.5, fontWeight: '600', marginTop: 2 },
  feedAt: { color: colors.white50, fontSize: 12, fontWeight: '700' },
  activityEmpty: { color: colors.white60, fontSize: 13, lineHeight: 19, fontWeight: '500' },
});

// ─── Live activity feed ───────────────────────────────────

interface FeedItem {
  id: string;
  type: string;
  at: string;
  flags: string[];
  reason: string | null;
  shiftId: string;
  role: string;
  worker: string | null;
}

const FEED_TEXT: Record<string, (w: string) => string> = {
  ARRIVED: w => `${w} arrived`,
  STARTED: w => `${w} started the shift`,
  OVERRIDE_START: w => `You started ${w}’s shift without a PIN`,
  PIN_LOCKED: w => `${w} got locked out of the PIN`,
  CLOCKED_OUT: w => `${w} finished · check and approve pay`,
  LATE_WARNING: w => `${w} is running late`,
  NO_SHOW: w => `${w} hasn’t shown up`,
  NO_SHOW_RESOLVED: () => 'No-show resolved',
};

function ActivityFeed() {
  const { accessToken } = useAuth();
  const [items, setItems] = useState<FeedItem[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      api<FeedItem[]>('/attendance/feed', { token: accessToken! })
        .then(rows => {
          if (!cancelled) {
            setItems(rows);
            setFailed(false);
          }
        })
        .catch(() => !cancelled && setFailed(true));
    load();
    const timer = setInterval(load, 20_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [accessToken]);

  if (failed && !items) {
    return (
      <GlassCard padding={spacing.lg}>
        <Text style={styles.activityEmpty}>Couldn’t load activity. It retries every 20 seconds.</Text>
      </GlassCard>
    );
  }
  if (!items) return null;
  if (items.length === 0) {
    return (
      <GlassCard padding={spacing.lg}>
        <Text style={styles.activityEmpty}>
          Nothing yet. You’ll see workers arrive, start, and finish here as it happens.
        </Text>
      </GlassCard>
    );
  }
  return (
    <GlassCard padding={spacing.sm}>
      {items.map(e => {
        const alert = e.type === 'NO_SHOW' || e.type === 'PIN_LOCKED' || e.type === 'LATE_WARNING';
        return (
          <Pressable
            key={e.id}
            onPress={() => navigate(`/employer/shifts/${e.shiftId}`)}
            style={({ hovered }: any) => [styles.feedRow, hovered && { backgroundColor: colors.white04 }]}
          >
            <View style={[styles.feedDot, { backgroundColor: alert ? colors.warning : colors.electric }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.feedText}>{(FEED_TEXT[e.type] ?? (() => e.type))(e.worker ?? 'Your worker')}</Text>
              <Text style={styles.feedMeta}>{e.role}</Text>
            </View>
            <Text style={styles.feedAt}>
              {new Date(e.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </Text>
          </Pressable>
        );
      })}
    </GlassCard>
  );
}
