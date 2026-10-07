/**
 * Overview — live ops dashboard: real rail health, honest labels elsewhere.
 *
 * RAIL HEALTH IS REAL: GET /api/v1/rails/status probes Klokd's DB plus each
 * KMV rail with per-rail timeouts and renders up / down / unconfigured. When
 * the API itself can't be reached (Railway unpaid → app not found), the panel
 * degrades to an explicit "unreachable" state instead of pretending green.
 *
 * The KPI, activity and fill-rate panels remain SAMPLE — inventing ops
 * numbers would be the exact credibility problem this screen exists to avoid.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GlassCard, FadeUp } from '../../components/KlokdLayout';
import { Eyebrow, StatusPill, Tone } from '../../components/Primitives';
import { ErrorState } from '../../components/States';
import { colors, spacing } from '../../theme';
import { api, API_ORIGIN_EXPORT } from '../../services/api';

type RailState = 'up' | 'down' | 'unconfigured' | 'unreachable';

const RAIL_DESC: Record<string, string> = {
  self: 'Core API + database',
  identiti: 'KYC + customers',
  todoku: 'SMS / OTP delivery',
  kppay: 'M-Pesa escrow + payouts',
  hakken: 'Shift discovery broadcast',
  helpan: 'Match + scoring',
};

const TONE: Record<RailState, Tone> = {
  up: 'mint',
  down: 'err',
  unconfigured: 'warn',
  unreachable: 'err',
};

const LABEL: Record<RailState, string> = {
  up: 'live',
  down: 'down',
  unconfigured: 'not provisioned',
  unreachable: 'API unreachable',
};

interface RailRow {
  key: string;
  name: string;
  desc: string;
  status: RailState;
}

// Sample panels — kept but honestly labelled; they preview the real thing.
const KPIS_SAMPLE = [
  { k: '—', l: 'Today’s shifts', delta: 'opens with live traffic' },
  { k: '—', l: 'Escrow held', delta: 'payment rail pending' },
  { k: '—', l: 'Verifications', delta: 'Identiti KYC flow pending' },
  { k: '—', l: 'Open disputes', delta: 'none recorded' },
];

const SAMPLE_ACTIVITY = [
  { t: 'Rail deployment', sub: 'All rails currently offline — unpaid Railway balance', when: 'now', tone: 'err' as const },
];

export function OverviewScreen() {
  const [rails, setRails] = useState<RailRow[] | null>(null);
  const [state, setState] = useState<'loading' | 'live' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setState('loading');
    setAttempt(n => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    api<{ rails: RailRow[] }>('/rails/status', { token: undefined })
      .then(d => {
        if (cancelled) return;
        setRails(d.rails ?? []);
        setState('live');
      })
      .catch(() => {
        if (cancelled) return;
        // The API didn't answer at all (unpaid hosting, offline demo) — show
        // every rail as unreachable instead of a fake green board.
        setRails(
          (['self', 'identiti', 'todoku', 'kppay', 'hakken', 'helpan'] as const).map(k => ({
            key: k,
            name: k === 'self' ? 'Klokd API' : k.charAt(0).toUpperCase() + k.slice(1),
            desc: RAIL_DESC[k] ?? '',
            status: 'unreachable' as RailState,
          }))
        );
        setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const anyDown = rails?.some(r => r.status !== 'up') ?? false;
  const upCount = rails?.filter(r => r.status === 'up').length ?? 0;

  return (
    <View>
      {/* ─── Deployment banner (honest, always visible when degraded) ─── */}
      {anyDown && (
        <FadeUp delay={0} style={{ marginBottom: spacing.lg }}>
          <GlassCard variant="raised" padding={spacing.lg}>
            <View style={styles.bannerRow}>
              <View style={styles.bannerDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.bannerTitle}>Rails degraded — deployments offline</Text>
                <Text style={styles.bannerSub}>
                  {state === 'error'
                    ? `Klokd API unreachable at ${API_ORIGIN_EXPORT}. Hosting (Railway) is likely unpaid — settle the balance and the API, OTP and shift feeds come back.`
                    : 'One or more rails are down or not provisioned. This panel probes the real rails on every load — no fake green.'}
                </Text>
              </View>
            </View>
          </GlassCard>
          {state === 'error' && (
            <View style={{ marginTop: spacing.sm }}>
              <ErrorState
                title="Couldn’t reach the Klokd API."
                detail="Rail probes and ops data need the API. Retry once hosting is restored."
                onRetry={retry}
              />
            </View>
          )}
        </FadeUp>
      )}

      {/* ─── Rail health (REAL) ─── */}
      <FadeUp delay={80}>
        <View style={styles.sectionHead}>
          <View>
            <Eyebrow>RAIL HEALTH · LIVE PROBE</Eyebrow>
            <Text style={styles.sectionTitle}>
              {state === 'live' && `${upCount}/${rails!.length} rails up`}
              {state === 'loading' && 'Probing rails…'}
              {state === 'error' && 'API unreachable'}
            </Text>
          </View>
          <View style={styles.sectionHeadRight}>
            <StatusPill tone={state === 'live' ? (anyDown ? 'warn' : 'mint') : 'err'}>
              {state === 'live' ? (anyDown ? 'degraded' : 'healthy') : 'offline'}
            </StatusPill>
          </View>
        </View>

        <View style={styles.railsGrid}>
          {state === 'loading' &&
            [0, 1, 2, 3].map(i => (
              <View key={i} style={styles.railWrap}>
                <GlassCard padding={spacing.lg}>
                  <View style={styles.skeletonBar} />
                  <View style={[styles.skeletonBar, { width: '60%' }]} />
                </GlassCard>
              </View>
            ))}

          {rails?.map((r, i) => (
            <FadeUp key={r.key} delay={120 + i * 50} style={styles.railWrap}>
              <GlassCard padding={spacing.lg}>
                <View style={styles.railTop}>
                  <View
                    style={[
                      styles.railDot,
                      r.status === 'up' && { backgroundColor: colors.electric },
                      r.status === 'down' && { backgroundColor: colors.error },
                      r.status === 'unconfigured' && { backgroundColor: colors.warning },
                      r.status === 'unreachable' && { backgroundColor: colors.error },
                    ]}
                  />
                  <Text style={styles.railName}>{RAIL_NAMES[r.key] ?? r.name}</Text>
                  <StatusPill tone={TONE[r.status]}>{LABEL[r.status]}</StatusPill>
                </View>
                <Text style={styles.railDesc}>{RAIL_DESC[r.key] ?? r.desc}</Text>
              </GlassCard>
            </FadeUp>
          ))}
        </View>
      </FadeUp>

      {/* ─── Ops panels (SAMPLE) ─── */}
      <View style={styles.splitRow}>
        <FadeUp delay={300} style={{ flex: 1.4, minWidth: 360 }}>
          <View style={styles.sectionHead}>
            <View>
              <Eyebrow>PLATFORM KPIs</Eyebrow>
              <Text style={styles.sectionTitle}>Preview · opens with live traffic</Text>
            </View>
          </View>
          <View style={styles.kpiRow}>
            {KPIS_SAMPLE.map((k, i) => (
              <FadeUp key={k.l} delay={340 + i * 60} style={styles.kpiWrap}>
                <GlassCard padding={spacing.lg}>
                  <Text style={styles.kpiLabel}>{k.l}</Text>
                  <Text style={styles.kpiValue}>{k.k}</Text>
                  <Text style={styles.kpiDelta}>{k.delta}</Text>
                </GlassCard>
              </FadeUp>
            ))}
          </View>
        </FadeUp>

        <FadeUp delay={380} style={{ flex: 1, minWidth: 320 }}>
          <View style={styles.sectionHead}>
            <View>
              <Eyebrow>LIVE ACTIVITY</Eyebrow>
              <Text style={styles.sectionTitle}>Waits on rails</Text>
            </View>
          </View>
          <GlassCard>
            {SAMPLE_ACTIVITY.map((a, i) => (
              <View key={i} style={[styles.activityRow, i < SAMPLE_ACTIVITY.length - 1 && styles.activityRowBorder]}>
                <View style={[styles.activityDot, a.tone === 'err' && { backgroundColor: colors.error }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.activityT}>{a.t}</Text>
                  <Text style={styles.activitySub}>{a.sub}</Text>
                </View>
                <Text style={styles.activityWhen}>{a.when}</Text>
              </View>
            ))}
          </GlassCard>
        </FadeUp>
      </View>
    </View>
  );
}

const RAIL_NAMES: Record<string, string> = {
  self: 'Klokd API',
  identiti: 'Identiti',
  todoku: 'Todoku',
  kppay: 'Kipkiren Pay',
  hakken: 'Hakken',
  helpan: 'Helpan AI',
};

const styles = StyleSheet.create({
  bannerRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  bannerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.error, marginTop: 6 },
  bannerTitle: { color: colors.white, fontSize: 14.5, fontWeight: '900', letterSpacing: -0.3 },
  bannerSub: { color: colors.white60, fontSize: 12.5, lineHeight: 18, marginTop: 3 },

  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: spacing.lg, flexWrap: 'wrap', gap: spacing.sm },
  sectionTitle: { color: colors.white, fontSize: 20, fontWeight: '900', letterSpacing: -0.7, marginTop: 6 },
  sectionHeadRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  railsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  railWrap: { flex: 1, minWidth: 260 },
  railTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 6 },
  railDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.white25 },
  railName: { color: colors.white, fontSize: 14.5, fontWeight: '800', letterSpacing: -0.3, flex: 1 },
  railDesc: { color: colors.white50, fontSize: 11.5, fontWeight: '500' },

  splitRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, marginTop: spacing.xxxl },
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  kpiWrap: { flex: 1, minWidth: 200 },
  kpiLabel: { color: colors.white55, fontSize: 11.5, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  kpiValue: { color: colors.white, fontSize: 30, fontWeight: '900', letterSpacing: -1.2, marginTop: spacing.sm },
  kpiDelta: { color: colors.electric, fontSize: 11.5, fontWeight: '700', marginTop: spacing.sm },
  skeletonBar: { height: 12, borderRadius: 6, backgroundColor: colors.white08, marginBottom: spacing.sm },

  activityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingVertical: 10 },
  activityRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.white06 },
  activityDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.white25, marginTop: 8 },
  activityT: { color: colors.white, fontSize: 12.5, fontWeight: '700', letterSpacing: -0.15 },
  activitySub: { color: colors.white55, fontSize: 11.5, marginTop: 2 },
  activityWhen: { color: colors.white40, fontSize: 11, fontWeight: '600' },
});
