/**
 * Monthly statutory report (admin) — GET /admin/statutory/:year/:month.
 * What to remit to KRA (PAYE), NSSF and SHA for a month, by business, from
 * completed payouts; plus the deductions already calculated at clock-out
 * (`accrued`), which become due as those settlements are paid. The CSV uses
 * the same columns as GET /admin/statutory/:year/:month/csv.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, useWindowDimensions } from 'react-native';
import { GlassCard } from '../../components/KlokdLayout';
import { Eyebrow, GhostBtn } from '../../components/Primitives';
import { Chip, Notice } from '../../components/Form';
import { ErrorState } from '../../components/States';
import { useApiData } from '../../hooks/useApiData';
import { colors, spacing } from '../../theme';
import { kes, downloadText } from '../../lib/format';

interface EmployerLine {
  employerId: string;
  businessName: string;
  kraPin: string | null;
  shiftCount: number;
  grossKes: number;
  payeKes: number;
  nssfKes: number;
  shifKes: number;
  ahlKes: number;
  platformFeeKes: number;
  netKes: number;
}

interface Report {
  period: string;
  generatedAt: string;
  employers: EmployerLine[];
  platformTotals: {
    totalShifts: number;
    totalGrossKes: number;
    totalPayeKes: number;
    totalNssfKes: number;
    totalShifKes: number;
    totalAhlKes: number;
    totalPlatformFeeKes: number;
    totalNetKes: number;
  };
  failedPayments: { id: string }[];
  accrued: {
    settlements: number;
    unpaid: number;
    grossKes: number;
    payeKes: number;
    nssfKes: number;
    shifKes: number;
    ahlKes: number;
    platformFeeKes: number;
    netKes: number;
  };
}

function lastMonths(n: number) {
  const out: { y: number; m: number; label: string }[] = [];
  const d = new Date();
  d.setDate(1);
  for (let i = 0; i < n; i++) {
    out.push({ y: d.getFullYear(), m: d.getMonth() + 1, label: d.toLocaleDateString('en-KE', { month: 'short', year: 'numeric' }) });
    d.setMonth(d.getMonth() - 1);
  }
  return out;
}

const csvCell = (v: string | number | null) => (typeof v === 'number' ? String(v) : `"${String(v ?? '').replace(/"/g, '""')}"`);

function toCsv(r: Report): string {
  const head = 'Employer,KRA PIN,Shifts,Gross KES,PAYE KES,NSSF KES,SHIF KES,AHL KES,Platform Fee KES,Net KES';
  const rows = r.employers.map(e =>
    [e.businessName, e.kraPin, e.shiftCount, e.grossKes, e.payeKes, e.nssfKes, e.shifKes, e.ahlKes, e.platformFeeKes, e.netKes].map(csvCell).join(',')
  );
  const t = r.platformTotals;
  rows.push(['TOTAL', '', t.totalShifts, t.totalGrossKes, t.totalPayeKes, t.totalNssfKes, t.totalShifKes, t.totalAhlKes, t.totalPlatformFeeKes, t.totalNetKes].map(csvCell).join(','));
  return [head, ...rows].join('\n') + '\n';
}

export function StatutoryScreen() {
  const months = lastMonths(6);
  const [sel, setSel] = useState(months[0]);
  const wide = useWindowDimensions().width >= 1100;
  const q = useApiData<Report>(`/admin/statutory/${sel.y}/${sel.m}`);

  return (
    <View style={{ gap: spacing.lg, maxWidth: 1000 }}>
      <View style={styles.chips}>
        {months.map(m => (
          <Chip key={`${m.y}-${m.m}`} active={m.y === sel.y && m.m === sel.m} onPress={() => setSel(m)}>{m.label}</Chip>
        ))}
      </View>

      {q.status === 'loading' && <View style={styles.loading}><ActivityIndicator color={colors.electric} /></View>}
      {q.status === 'error' && <ErrorState title="Couldn’t load the report." detail={q.error ?? undefined} onRetry={q.reload} />}
      {q.status === 'ready' && q.data && <ReportView r={q.data} wide={wide} />}
    </View>
  );
}

function ReportView({ r, wide }: { r: Report; wide: boolean }) {
  const t = r.platformTotals;
  const a = r.accrued;
  return (
    <View style={{ gap: spacing.lg }}>
      <View style={styles.cols}>
        <View style={styles.col}>
          <Eyebrow>TO REMIT · FROM PAYOUTS</Eyebrow>
          <GlassCard padding={spacing.lg} style={{ marginTop: spacing.sm }}>
            <Line k="PAYE to KRA" v={kes(t.totalPayeKes)} />
            <Line k="NSSF" v={kes(t.totalNssfKes)} />
            <Line k="SHIF to SHA" v={kes(t.totalShifKes)} />
            <Line k="Housing levy" v={kes(t.totalAhlKes)} />
            <Line k="Shifts paid" v={String(t.totalShifts)} />
            <Line k="Gross pay" v={kes(t.totalGrossKes)} />
          </GlassCard>
        </View>
        <View style={styles.col}>
          <Eyebrow>CALCULATED AT CLOCK-OUT</Eyebrow>
          <GlassCard padding={spacing.lg} style={{ marginTop: spacing.sm }}>
            <Line k="PAYE" v={kes(a.payeKes)} />
            <Line k="NSSF" v={kes(a.nssfKes)} />
            <Line k="SHIF" v={kes(a.shifKes)} />
            <Line k="Housing levy" v={kes(a.ahlKes)} />
            <Line k="Shifts" v={`${a.settlements}${a.unpaid ? ` · ${a.unpaid} not paid yet` : ''}`} />
            <Line k="Gross pay" v={kes(a.grossKes)} />
          </GlassCard>
        </View>
      </View>

      {a.unpaid > 0 && (
        <Notice>
          {a.unpaid} shift{a.unpaid === 1 ? '' : 's'} this month {a.unpaid === 1 ? 'has' : 'have'} pay calculated but not paid out yet. Their deductions move to “To remit” once paid.
        </Notice>
      )}
      {r.failedPayments.length > 0 && (
        <Notice tone="err">{r.failedPayments.length} payout{r.failedPayments.length === 1 ? '' : 's'} failed this month. Retry them from Payments.</Notice>
      )}

      <View style={styles.headRow}>
        <Eyebrow>BY BUSINESS · FROM PAYOUTS</Eyebrow>
        <GhostBtn size="sm" onPress={() => downloadText(`klokd-statutory-${r.period}.csv`, toCsv(r), 'text/csv')}>
          Download CSV
        </GhostBtn>
      </View>

      {r.employers.length === 0 ? (
        <GlassCard padding={spacing.lg}>
          <Text style={styles.sub}>No payouts completed in {r.period}.</Text>
        </GlassCard>
      ) : wide ? (
        <GlassCard padding={spacing.sm}>
          <View style={[styles.tRow, styles.tHead]}>
            {['Business', 'KRA PIN', 'Shifts', 'Gross', 'PAYE', 'NSSF', 'SHIF', 'Net'].map(h => (
              <Text key={h} style={[styles.cell, styles.headCell]}>{h}</Text>
            ))}
          </View>
          {r.employers.map(e => (
            <View key={e.employerId} style={styles.tRow}>
              <Text style={styles.cell}>{e.businessName}</Text>
              <Text style={styles.cell}>{e.kraPin ?? '—'}</Text>
              <Text style={styles.cell}>{e.shiftCount}</Text>
              <Text style={styles.cell}>{kes(e.grossKes)}</Text>
              <Text style={styles.cell}>{kes(e.payeKes)}</Text>
              <Text style={styles.cell}>{kes(e.nssfKes)}</Text>
              <Text style={styles.cell}>{kes(e.shifKes)}</Text>
              <Text style={styles.cell}>{kes(e.netKes)}</Text>
            </View>
          ))}
        </GlassCard>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {r.employers.map(e => (
            <GlassCard key={e.employerId} padding={spacing.md}>
              <Text style={styles.cardTitle}>{e.businessName}</Text>
              <Text style={styles.sub}>KRA PIN {e.kraPin ?? '—'} · {e.shiftCount} shift{e.shiftCount === 1 ? '' : 's'}</Text>
              <Line k="Gross" v={kes(e.grossKes)} />
              <Line k="PAYE" v={kes(e.payeKes)} />
              <Line k="NSSF" v={kes(e.nssfKes)} />
              <Line k="SHIF" v={kes(e.shifKes)} />
              <Line k="Net to workers" v={kes(e.netKes)} />
            </GlassCard>
          ))}
        </View>
      )}
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
  loading: { paddingVertical: 60, alignItems: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cols: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  col: { flexGrow: 1, flexBasis: 320, minWidth: 0 },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.white06 },
  lineK: { color: colors.white60, fontSize: 13, flexShrink: 1 },
  lineV: { color: colors.white, fontSize: 13, fontWeight: '800', textAlign: 'right' },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  tRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.white06 },
  tHead: { borderBottomColor: colors.white12 },
  cell: { flex: 1, color: colors.white85, fontSize: 12.5, paddingRight: spacing.sm },
  headCell: { color: colors.white50, fontSize: 10.5, fontWeight: '900', letterSpacing: 0.6, textTransform: 'uppercase' },
  cardTitle: { color: colors.white, fontSize: 14, fontWeight: '800' },
  sub: { color: colors.white50, fontSize: 12.5 },
});
