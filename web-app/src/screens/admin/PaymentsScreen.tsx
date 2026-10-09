/**
 * Pay & payouts (admin) — GET /admin/settlements. Every shift's pay from
 * clock-out to M-Pesa, filterable by stage. Failed payouts can be retried
 * (POST /payments/retry/:paymentId) once Kipkiren Pay is live.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, useWindowDimensions } from 'react-native';
import { GlassCard } from '../../components/KlokdLayout';
import { StatusPill, GhostBtn, Tone } from '../../components/Primitives';
import { Chip, Notice } from '../../components/Form';
import { ErrorState, EmptyState } from '../../components/States';
import { useApiData, useApiAction } from '../../hooks/useApiData';
import { colors, spacing } from '../../theme';
import { kes, day } from '../../lib/format';

interface Row {
  shiftId: string;
  date: string;
  role: string;
  employer: string;
  worker: string | null;
  grossKes: number;
  netKes: number;
  feeKes: number;
  totalKes: number;
  status: string;
  approvedBy: 'auto' | 'person' | null;
  approveBy: string;
  escrow: string | null;
  payment: { id: string; status: string; mpesaRef: string | null; retryCount: number } | null;
}

const STAGES: { key: string; label: string }[] = [
  { key: '', label: 'All' },
  { key: 'AWAITING_APPROVAL', label: 'Waiting for employer' },
  { key: 'APPROVED', label: 'Approved, unpaid' },
  { key: 'PAID', label: 'Paid' },
  { key: 'DISPUTED', label: 'Disputed' },
  { key: 'VOID', label: 'Not payable' },
];
const TONE: Record<string, Tone> = { AWAITING_APPROVAL: 'warn', APPROVED: 'mint', PAID: 'mint', DISPUTED: 'err', VOID: 'neutral' };

export function PaymentsScreen() {
  const [stage, setStage] = useState('');
  // The table needs ~840px; narrower screens get one card per shift.
  const wide = useWindowDimensions().width >= 1100;
  const q = useApiData<{ paymentsLive: boolean; rows: Row[] }>(`/admin/settlements${stage ? `?status=${stage}` : ''}`, { pollMs: 60_000 });
  const act = useApiAction();
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  const retry = async (paymentId: string) => {
    setMsg(null);
    try {
      await act(`/payments/retry/${paymentId}`);
      setMsg({ tone: 'ok', text: 'Retry queued.' });
      q.reload();
    } catch (e: any) {
      setMsg({ tone: 'err', text: e.message });
    }
  };

  return (
    <View style={{ gap: spacing.lg }}>
      {q.data && !q.data.paymentsLive && (
        <Notice>Kipkiren Pay isn’t connected, so nothing pays out yet. Approved pay waits here and the payout sweep sends it once the rail is configured.</Notice>
      )}
      {msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
      <View style={styles.chips}>
        {STAGES.map(s => (
          <Chip key={s.key} active={stage === s.key} onPress={() => setStage(s.key)}>{s.label}</Chip>
        ))}
      </View>
      {q.status === 'loading' && <View style={styles.loading}><ActivityIndicator color={colors.electric} /></View>}
      {q.status === 'error' && <ErrorState title="Couldn’t load pay." detail={q.error ?? undefined} onRetry={q.reload} />}
      {q.status === 'ready' && q.data!.rows.length === 0 && <EmptyState title="Nothing at this stage." />}
      {q.status === 'ready' && q.data!.rows.length > 0 && !wide && (
        <View style={{ gap: spacing.sm }}>
          {q.data!.rows.map(r => (
            <GlassCard key={r.shiftId} padding={spacing.md}>
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>{r.role} · {day(r.date)}</Text>
                <StatusPill tone={TONE[r.status] ?? 'neutral'}>{r.status.toLowerCase().replace('_', ' ')}</StatusPill>
              </View>
              <Text style={styles.sub}>{r.employer} → {r.worker ?? '—'}</Text>
              <View style={styles.cardRow}><Text style={styles.sub}>Employer pays</Text><Text style={styles.cardVal}>{kes(r.totalKes)}</Text></View>
              <View style={styles.cardRow}><Text style={styles.sub}>Worker gets</Text><Text style={styles.cardVal}>{kes(r.netKes)}</Text></View>
              <View style={styles.cardRow}>
                <Text style={styles.sub}>Payout</Text>
                <Text style={styles.cardVal}>{r.payment ? `${r.payment.status.toLowerCase()}${r.payment.mpesaRef ? ` · ${r.payment.mpesaRef}` : ''}` : r.escrow ? `hold ${r.escrow.toLowerCase()}` : 'no hold yet'}</Text>
              </View>
              {r.approvedBy && <Text style={styles.sub}>{r.approvedBy === 'auto' ? 'Auto-approved' : 'Approved by a person'}</Text>}
              {r.payment?.status === 'FAILED' && <View style={{ flexDirection: 'row', marginTop: 6 }}><GhostBtn size="sm" onPress={() => retry(r.payment!.id)}>Retry</GhostBtn></View>}
            </GlassCard>
          ))}
        </View>
      )}
      {q.status === 'ready' && q.data!.rows.length > 0 && wide && (
        <GlassCard padding={spacing.sm}>
          <View style={[styles.row, styles.headRow]}>
              {['Shift', 'Employer', 'Worker', 'Employer pays', 'Worker gets', 'Stage', 'Payout'].map(h => (
                <Text key={h} style={[styles.cell, styles.headCell]}>{h}</Text>
              ))}
            </View>
            {q.data!.rows.map(r => (
              <View key={r.shiftId} style={styles.row}>
                <Text style={styles.cell}>{r.role}{'\n'}<Text style={styles.sub}>{day(r.date)}</Text></Text>
                <Text style={styles.cell}>{r.employer}</Text>
                <Text style={styles.cell}>{r.worker ?? '—'}</Text>
                <Text style={styles.cell}>{kes(r.totalKes)}{'\n'}<Text style={styles.sub}>fee {kes(r.feeKes)}</Text></Text>
                <Text style={styles.cell}>{kes(r.netKes)}</Text>
                <View style={styles.cell}>
                  <StatusPill tone={TONE[r.status] ?? 'neutral'}>{r.status.toLowerCase().replace('_', ' ')}</StatusPill>
                  {r.approvedBy && <Text style={styles.sub}>{r.approvedBy === 'auto' ? 'auto-approved' : 'approved by a person'}</Text>}
                </View>
                <View style={styles.cell}>
                  <Text style={styles.sub}>
                    {r.payment ? `${r.payment.status.toLowerCase()}${r.payment.mpesaRef ? ` · ${r.payment.mpesaRef}` : ''}` : r.escrow ? `hold ${r.escrow.toLowerCase()}` : 'no hold yet'}
                  </Text>
                  {r.payment?.status === 'FAILED' && <GhostBtn size="sm" onPress={() => retry(r.payment!.id)}>Retry</GhostBtn>}
                </View>
              </View>
            ))}
        </GlassCard>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { paddingVertical: 60, alignItems: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.white06 },
  headRow: { borderBottomColor: colors.white12 },
  cell: { flex: 1, color: colors.white85, fontSize: 12.5, paddingRight: spacing.sm, gap: 4 },
  headCell: { color: colors.white50, fontSize: 10.5, fontWeight: '900', letterSpacing: 0.6, textTransform: 'uppercase' },
  sub: { color: colors.white50, fontSize: 11.5 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm, marginBottom: 4 },
  cardTitle: { color: colors.white, fontSize: 14, fontWeight: '800', flexShrink: 1 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, paddingVertical: 3 },
  cardVal: { color: colors.white85, fontSize: 12.5, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
});
