/**
 * Pay & billing — GET /employer/billing. What's waiting for your check,
 * approved, paid and committed, with every shift's line.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusPill } from '../../components/Primitives';
import { AmbientOrbs, SafeTop } from '../../components/KlokdLayout';
import { useData } from '../../hooks/useData';
import { colors } from '../../theme';
import { kes, day, hm, time } from '../../lib/format';

type Props = { navigation: NativeStackNavigationProp<any> };

interface Billing {
  paymentsLive: boolean;
  totals: { awaitingApprovalKes: number; approvedUnpaidKes: number; paidKes: number; committedKes: number };
  lines: { shiftId: string; date: string; role: string; worker: string | null; workedMinutes: number; grossKes: number; feeKes: number; totalKes: number; status: string; approveBy: string; mpesaRef: string | null }[];
}

const PILL: Record<string, { label: string; tone: 'mint' | 'warn' | 'err' | 'neutral' }> = {
  AWAITING_APPROVAL: { label: 'Check needed', tone: 'warn' },
  APPROVED: { label: 'Approved', tone: 'mint' },
  PAID: { label: 'Paid', tone: 'mint' },
  DISPUTED: { label: 'Disputed', tone: 'err' },
  VOID: { label: 'Not payable', tone: 'neutral' },
};

export function PayScreen({ navigation }: Props) {
  const q = useData<Billing>('/employer/billing', { pollMs: 60_000 });
  const d = q.data;
  return (
    <View style={styles.screen}>
      <AmbientOrbs intensity="subtle" />
      <SafeTop />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 30, gap: 12 }}>
        <Text style={styles.h1}>Pay & billing</Text>
        {q.status === 'loading' && <ActivityIndicator color={colors.volt} style={{ marginTop: 40 }} />}
        {q.status === 'error' && <Text style={styles.err}>{q.error}</Text>}
        {d && (
          <>
            {!d.paymentsLive && <Text style={styles.note}>M-Pesa funding and payouts switch on when Klokd payments (Kipkiren Pay) go live. Until then every shift’s pay is calculated, approved and recorded here.</Text>}
            <View style={styles.tiles}>
              <Tile k={kes(d.totals.awaitingApprovalKes)} l="to check" warn={d.totals.awaitingApprovalKes > 0} />
              <Tile k={kes(d.totals.approvedUnpaidKes)} l="approved" />
            </View>
            <View style={styles.tiles}>
              <Tile k={kes(d.totals.paidKes)} l="paid" />
              <Tile k={kes(d.totals.committedKes)} l="committed" />
            </View>
            <Text style={styles.small}>The CSV export for your accountant is on klokd.co.ke → Pay & billing.</Text>
            {d.lines.length === 0 && <Text style={styles.empty}>Each shift appears here when your worker clocks out.</Text>}
            {d.lines.map(l => {
              const pill = PILL[l.status] ?? { label: l.status, tone: 'neutral' as const };
              return (
                <TouchableOpacity key={l.shiftId} style={styles.row} onPress={() => navigation.navigate('ShiftDetail', { id: l.shiftId })}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{l.role} · {l.worker ?? '—'}</Text>
                    <Text style={styles.meta}>{day(l.date)} · {hm(l.workedMinutes)}{l.status === 'AWAITING_APPROVAL' ? ` · auto-approves ${time(l.approveBy)}` : ''}{l.mpesaRef ? ` · ${l.mpesaRef}` : ''}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 5 }}>
                    <Text style={styles.total}>{kes(l.totalKes)}</Text>
                    <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Tile({ k, l, warn }: { k: string; l: string; warn?: boolean }) {
  return (
    <View style={styles.tile}>
      <Text style={[styles.tileK, warn && { color: colors.warning }]} numberOfLines={1} adjustsFontSizeToFit>{k}</Text>
      <Text style={styles.tileL}>{l}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  h1: { fontSize: 28, fontWeight: '900', color: colors.white, letterSpacing: -0.9, marginTop: 8 },
  err: { color: colors.warning },
  note: { color: colors.white65, fontSize: 12.5, lineHeight: 18 },
  small: { color: colors.white55, fontSize: 11.5 },
  empty: { color: colors.white60, fontSize: 13, textAlign: 'center', marginTop: 10 },
  tiles: { flexDirection: 'row', gap: 8 },
  tile: { flex: 1, padding: 14, borderRadius: 14, backgroundColor: colors.white03, borderWidth: 1, borderColor: colors.white08 },
  tileK: { fontSize: 18, fontWeight: '900', color: colors.white },
  tileL: { fontSize: 10.5, color: colors.white55, marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.4 },
  row: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: 16, backgroundColor: colors.white03, borderWidth: 1, borderColor: colors.white08 },
  title: { fontSize: 14, fontWeight: '800', color: colors.white },
  meta: { fontSize: 11.5, color: colors.white55, marginTop: 3 },
  total: { fontSize: 15, fontWeight: '900', color: colors.white },
});
