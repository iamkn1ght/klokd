/**
 * Operations overview (admin) — all live:
 *   GET /admin/stats          people, shifts, queues, money by stage
 *   GET /admin/rails-health   partner services with latency + detail
 *   GET /admin/backups        database backups (POST /admin/backups/run)
 */
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { GlassCard, FadeUp, LiveDot } from '../../components/KlokdLayout';
import { Eyebrow, StatusPill, GhostBtn } from '../../components/Primitives';
import { ErrorState } from '../../components/States';
import { Notice } from '../../components/Form';
import { useApiData, useApiAction } from '../../hooks/useApiData';
import { navigate } from '../../navigation/router';
import { StatRow } from '../../components/StatRow';
import { colors, spacing, radius } from '../../theme';
import { kes, ago } from '../../lib/format';

interface Stats {
  workers: number;
  verifiedWorkers: number;
  employers: number;
  verifiedEmployers: number;
  totalShifts: number;
  openShifts: number;
  liveShifts: number;
  shiftsToday: number;
  awaitingApproval: { count: number; totalKes: number };
  approvedUnpaid: { count: number; netKes: number; feesKes: number };
  paid: { count: number; netKes: number; feesKes: number };
  openDisputes: number;
  flaggedAttendance: number;
  waitlist: number;
  openDataRequests: number;
  paymentsLive: boolean;
}

interface Rails {
  checkedAt: string;
  summary: string;
  rails: { key: string; name: string; desc: string; status: 'up' | 'down' | 'unconfigured'; ms?: number; detail?: string | null }[];
  hakkenBacklog?: { workersUnregistered: number; employersUnregistered: number; openShiftsNotBroadcast: number } | null;
}

interface Backups {
  lastRun: { file: string; bytes: number; offsite: 'uploaded' | 'not-configured' | 'failed'; error?: string; at: string } | null;
  local: { file: string; bytes: number; at: string }[];
  offsiteConfigured: boolean;
}

const size = (b: number) => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);

export function OverviewScreen() {
  const stats = useApiData<Stats>('/admin/stats', { pollMs: 60_000 });
  const rails = useApiData<Rails>('/admin/rails-health', { pollMs: 60_000 });
  const backups = useApiData<Backups>('/admin/backups', { pollMs: 300_000 });
  const act = useApiAction();
  const [backingUp, setBackingUp] = useState(false);
  const [backupMsg, setBackupMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  const backupNow = async () => {
    setBackingUp(true);
    setBackupMsg(null);
    try {
      const r: any = await act('/admin/backups/run');
      const off = r?.offsite === 'uploaded' ? 'and copied off-site' : r?.offsite === 'failed' ? `but the off-site copy failed${r?.error ? ` (${r.error})` : ''}` : '(off-site storage not configured)';
      setBackupMsg({ tone: r?.offsite === 'failed' ? 'err' : 'ok', text: `Backup saved ${off}.` });
      backups.reload();
    } catch (e: any) {
      setBackupMsg({ tone: 'err', text: e.message });
    } finally {
      setBackingUp(false);
    }
  };

  if (stats.status === 'loading') return <View style={styles.loading}><ActivityIndicator color={colors.electric} /></View>;
  if (stats.status === 'error') return <ErrorState title="Couldn’t load the overview." detail={stats.error ?? undefined} onRetry={stats.reload} />;
  const s = stats.data!;

  const queues = [
    { k: s.openDisputes, l: 'Open disputes', to: '/admin/disputes' },
    { k: s.flaggedAttendance, l: 'Check-ins to review', to: '/admin/attendance' },
    { k: s.workers - s.verifiedWorkers, l: 'Workers not verified', to: '/admin/verification' },
    { k: s.openDataRequests, l: 'Data requests open', to: '/admin/privacy' },
  ];

  return (
    <View style={{ gap: spacing.xxl }}>
      {!s.paymentsLive && (
        <Notice>
          Kipkiren Pay isn’t connected yet, so no money moves through Klokd. Shift pay is calculated, approved and queued; payouts start automatically once the rail is configured.
        </Notice>
      )}

      <StatRow
        items={queues.map(q => ({ k: String(q.k), l: q.l, tone: q.k > 0 ? colors.warning : colors.white, onPress: () => navigate(q.to) }))}
      />

      <View style={styles.cols}>
        <View style={styles.col}>
          <Eyebrow>PEOPLE & SHIFTS</Eyebrow>
          <GlassCard padding={spacing.lg} style={{ marginTop: spacing.sm }}>
            <Line k="Workers" v={`${s.workers} · ${s.verifiedWorkers} ID-verified`} />
            <Line k="Businesses" v={`${s.employers} · ${s.verifiedEmployers} with KRA PIN + WIBA`} />
            <Line k="Shifts, all time" v={String(s.totalShifts)} />
            <Line k="Open for applicants" v={String(s.openShifts)} />
            <Line k="On shift right now" v={String(s.liveShifts)} />
            <Line k="Starting today" v={String(s.shiftsToday)} />
            <Line k="Early-access waitlist" v={String(s.waitlist)} />
          </GlassCard>
        </View>
        <View style={styles.col}>
          <Eyebrow>MONEY BY STAGE</Eyebrow>
          <GlassCard padding={spacing.lg} style={{ marginTop: spacing.sm }}>
            <Line k="Waiting for employer check" v={`${s.awaitingApproval.count} · ${kes(s.awaitingApproval.totalKes)}`} />
            <Line k="Approved, to pay out" v={`${s.approvedUnpaid.count} · ${kes(s.approvedUnpaid.netKes)} to workers`} />
            <Line k="Paid to workers" v={`${s.paid.count} · ${kes(s.paid.netKes)}`} />
            <Line k="Klokd fees earned" v={kes(s.paid.feesKes)} />
            <Line k="Klokd fees pending" v={kes(s.approvedUnpaid.feesKes)} />
          </GlassCard>

          <Eyebrow style={{ marginTop: spacing.xl }}>DATABASE BACKUPS</Eyebrow>
          <GlassCard padding={spacing.lg} style={{ marginTop: spacing.sm }}>
            {backups.status === 'error' && <Text style={styles.backupNote}>Couldn’t load backup status.</Text>}
            {backups.data && (() => {
              const b = backups.data;
              const latest = b.local[0];
              const off = !b.offsiteConfigured
                ? 'Not configured'
                : !b.lastRun
                  ? 'Next run after a backup'
                  : b.lastRun.offsite === 'uploaded' ? `Uploaded ${ago(b.lastRun.at)}` : `Failed ${ago(b.lastRun.at)}`;
              return (
                <>
                  <Line k="Latest backup" v={latest ? `${ago(latest.at)} · ${size(latest.bytes)}` : 'None yet'} />
                  <Line k="Off-site copy (Supabase)" v={off} />
                  <Line k="Copies on the volume" v={String(b.local.length)} />
                </>
              );
            })()}
            {backupMsg ? <Notice tone={backupMsg.tone}>{backupMsg.text}</Notice> : null}
            <View style={{ flexDirection: 'row', marginTop: spacing.sm }}>
              <GhostBtn size="sm" onPress={backingUp ? undefined : backupNow}>{backingUp ? 'Backing up…' : 'Back up now'}</GhostBtn>
            </View>
          </GlassCard>
        </View>
      </View>

      <View>
        <View style={styles.railHead}>
          <Eyebrow>PARTNER SERVICES</Eyebrow>
          {rails.data && (
            <View style={styles.liveRow}>
              <LiveDot />
              <Text style={styles.small}>{rails.data.summary} · checked {ago(rails.data.checkedAt)}</Text>
            </View>
          )}
        </View>
        {rails.status === 'error' && <Notice tone="err">{rails.error}</Notice>}
        <View style={styles.grid}>
          {(rails.data?.rails ?? []).map(r => (
            <View key={r.key} style={styles.cell}>
              <GlassCard padding={spacing.lg}>
                <View style={styles.railTop}>
                  <Text style={styles.railName}>{r.name}</Text>
                  <StatusPill tone={r.status === 'up' ? 'mint' : r.status === 'down' ? 'err' : 'neutral'}>
                    {r.status === 'unconfigured' ? 'not connected' : r.status}
                  </StatusPill>
                </View>
                <Text style={styles.small}>{r.desc}</Text>
                {r.ms != null && r.status !== 'unconfigured' ? <Text style={styles.small}>{r.ms} ms</Text> : null}
                {r.detail ? <Text style={styles.detail}>{r.detail}</Text> : null}
              </GlassCard>
            </View>
          ))}
        </View>
        {rails.data?.hakkenBacklog && (
          <Text style={[styles.small, { marginTop: spacing.sm }]}>
            Waiting to publish to Hakken: {rails.data.hakkenBacklog.workersUnregistered} workers · {rails.data.hakkenBacklog.employersUnregistered} businesses · {rails.data.hakkenBacklog.openShiftsNotBroadcast} open shifts
          </Text>
        )}
      </View>
    </View>
  );
}

function Line({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.line}>
      <Text style={styles.lineK}>{k}</Text>
      <Text style={styles.lineV}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backupNote: { color: colors.white50, fontSize: 12.5 },
  loading: { paddingVertical: 80, alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  cell: { flex: 1, minWidth: 200 },
  big: { fontSize: 30, fontWeight: '900', letterSpacing: -1 },
  label: { color: colors.white60, fontSize: 12, fontWeight: '700', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.3 },
  cols: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xl },
  col: { flex: 1, minWidth: 260 },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.white06 },
  lineK: { color: colors.white65, fontSize: 13 },
  lineV: { color: colors.white, fontSize: 13, fontWeight: '800', textAlign: 'right', flexShrink: 1 },
  railHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm, flexWrap: 'wrap', gap: spacing.sm },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  railTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  railName: { color: colors.white, fontSize: 15, fontWeight: '900' },
  small: { color: colors.white55, fontSize: 12, marginTop: 4 },
  detail: { color: colors.warning, fontSize: 11.5, marginTop: 4, padding: 6, borderRadius: radius.sm, backgroundColor: colors.warnAlpha['12'] },
});
