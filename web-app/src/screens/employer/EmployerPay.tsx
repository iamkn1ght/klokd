/**
 * Employer Pay & billing (web) — GET /employer/billing. What's owed, what's
 * approved, what's paid, per shift, plus a CSV export for the accountant
 * (GET /employer/billing.csv). Approvals happen from each shift's page.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { GlassCard } from '../../components/KlokdLayout';
import { Eyebrow, StatusPill, GhostBtn, Tone } from '../../components/Primitives';
import { Notice } from '../../components/Form';
import { ErrorState, EmptyState } from '../../components/States';
import { useApiData } from '../../hooks/useApiData';
import { useAuth } from '../../context/AuthContext';
import { API_ORIGIN_EXPORT } from '../../services/api';
import { navigate } from '../../navigation/router';
import { StatRow } from '../../components/StatRow';
import { colors, spacing } from '../../theme';
import { kes, day, hm, time, downloadText } from '../../lib/format';

interface Billing {
  paymentsLive: boolean;
  totals: { awaitingApprovalKes: number; approvedUnpaidKes: number; paidKes: number; disputedKes: number; committedKes: number; fundedKes: number };
  lines: {
    shiftId: string;
    date: string;
    role: string;
    area: string | null;
    worker: string | null;
    workedMinutes: number;
    grossKes: number;
    feeKes: number;
    totalKes: number;
    status: string;
    approveBy: string;
    paidAt: string | null;
    mpesaRef: string | null;
  }[];
}

const STATE: Record<string, { label: string; tone: Tone }> = {
  AWAITING_APPROVAL: { label: 'needs your check', tone: 'warn' },
  APPROVED: { label: 'approved', tone: 'mint' },
  PAID: { label: 'paid', tone: 'mint' },
  DISPUTED: { label: 'disputed', tone: 'err' },
  VOID: { label: 'not payable', tone: 'neutral' },
};

export function EmployerPay() {
  const q = useApiData<Billing>('/employer/billing', { pollMs: 60_000 });
  const { accessToken } = useAuth();
  const [exportErr, setExportErr] = React.useState<string | null>(null);

  const exportCsv = async () => {
    setExportErr(null);
    try {
      const res = await fetch(`${API_ORIGIN_EXPORT}/api/v1/employer/billing.csv`, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      downloadText(`klokd-billing-${new Date().toISOString().slice(0, 10)}.csv`, await res.text(), 'text/csv');
    } catch (e: any) {
      setExportErr(e.message);
    }
  };

  if (q.status === 'loading') return <View style={styles.loading}><ActivityIndicator color={colors.electric} /></View>;
  if (q.status === 'error') return <ErrorState title="Couldn’t load billing." detail={q.error ?? undefined} onRetry={q.reload} />;
  const d = q.data!;

  return (
    <View style={{ gap: spacing.xl }}>
      <View style={styles.head}>
        <View style={{ flex: 1, minWidth: 240 }}>
          <Eyebrow color={colors.volt}>PAY & BILLING</Eyebrow>
          <Text style={styles.h1}>What you owe, what you’ve paid.</Text>
        </View>
        <GhostBtn size="sm" onPress={exportCsv}>Export CSV</GhostBtn>
      </View>
      {exportErr ? <Notice tone="err">{exportErr}</Notice> : null}
      {!d.paymentsLive && (
        <Notice>
          M-Pesa funding and payouts switch on when Klokd payments (Kipkiren Pay) go live. Until then every shift’s pay is calculated, approved and recorded here, and settled in order once payments are live.
        </Notice>
      )}

      <StatRow
        items={[
          { k: kes(d.totals.awaitingApprovalKes), l: 'to check', tone: d.totals.awaitingApprovalKes ? colors.warning : colors.white },
          { k: kes(d.totals.approvedUnpaidKes), l: 'approved, to pay' },
          { k: kes(d.totals.paidKes), l: 'paid, all time' },
          { k: kes(d.totals.committedKes), l: 'committed' },
        ]}
      />

      {d.lines.length === 0 ? (
        <EmptyState title="Nothing billed yet." detail="Each shift appears here when your worker clocks out, with the hours and pay to check." />
      ) : (
        <GlassCard padding={spacing.sm}>
          {d.lines.map(l => {
            const st = STATE[l.status] ?? { label: l.status.toLowerCase(), tone: 'neutral' as Tone };
            return (
              <Pressable key={l.shiftId} onPress={() => navigate(`/employer/shifts/${l.shiftId}`)} style={({ hovered }: any) => [styles.row, hovered && { backgroundColor: colors.white04 }]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.rowTitle}>{l.role} · {l.worker ?? '—'}</Text>
                  <Text style={styles.rowMeta}>
                    {day(l.date)} · {hm(l.workedMinutes)} · {kes(l.grossKes)} + {kes(l.feeKes)} fee
                    {l.status === 'AWAITING_APPROVAL' ? ` · auto-approves ${time(l.approveBy)}` : ''}
                    {l.mpesaRef ? ` · M-Pesa ${l.mpesaRef}` : ''}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={styles.total}>{kes(l.totalKes)}</Text>
                  <StatusPill tone={st.tone}>{st.label}</StatusPill>
                </View>
              </Pressable>
            );
          })}
        </GlassCard>
      )}
    </View>
  );
}

function Tile({ k, l, tone = colors.white }: { k: string; l: string; tone?: string }) {
  return (
    <GlassCard padding={spacing.lg} style={{ flex: 1, minWidth: 190 }}>
      <Text style={[styles.tileK, { color: tone }]}>{k}</Text>
      <Text style={styles.tileL}>{l}</Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  loading: { paddingVertical: 80, alignItems: 'center' },
  head: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md, flexWrap: 'wrap' },
  h1: { color: colors.white, fontSize: 26, fontWeight: '900', letterSpacing: -1, marginTop: 8 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tileK: { fontSize: 21, fontWeight: '900', letterSpacing: -0.8 },
  tileL: { color: colors.white55, fontSize: 11.5, fontWeight: '700', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.3 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.white06 },
  rowTitle: { color: colors.white, fontSize: 14, fontWeight: '800' },
  rowMeta: { color: colors.white55, fontSize: 12, marginTop: 3 },
  total: { color: colors.white, fontSize: 15, fontWeight: '900' },
});
