/**
 * Employer Pay tab — Escrow hero + top-up/withdraw + full ledger (in/out/refund) + export.
 * Ported 1:1 from claude-design/screens/employer-tabs.jsx (EmpPayTab)
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Label } from '../../components/Primitives';
import { AmbientOrbs } from '../../components/KlokdLayout';
import { EscrowMeter } from '../../components/EmployerPrimitives';
import { Icons } from '../../components/Icons';
import { colors, typography, gradients } from '../../theme';

type LedgerTone = 'in' | 'out' | 'refund';

interface LedgerRow {
  d: string; t: string; s: string; k: number; tone: LedgerTone;
}

const LEDGER: LedgerRow[] = [
  { d: '3 Apr', t: 'Released · Akinyi O.', s: 'Waiter · 5h · tonight', k: -1800, tone: 'out' },
  { d: '3 Apr', t: 'Escrow top-up', s: 'M-Pesa · Till 504-221', k: +20000, tone: 'in' },
  { d: '2 Apr', t: 'Released · Kevin M.', s: 'Dishwasher · 5h', k: -1600, tone: 'out' },
  { d: '2 Apr', t: 'Released · 3 workers', s: 'Brunch shift · Sat', k: -5400, tone: 'out' },
  { d: '31 Mar', t: 'Refund · flagged', s: 'Brian K. no-show · auto', k: +1800, tone: 'refund' },
  { d: '30 Mar', t: 'Released · Njeri W.', s: 'Kitchen · 6h', k: -2400, tone: 'out' },
];

function MiniStat({ l, v, c }: { l: string; v: string; c: string }) {
  return (
    <View>
      <Text style={styles.miniLabel}>{l}</Text>
      <Text style={[styles.miniValue, { color: c }]}>{v}</Text>
    </View>
  );
}

export function PayScreen() {
  return (
    <View style={styles.screen}>
      <AmbientOrbs intensity="subtle" />
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <Text style={styles.title}>Pay</Text>
          <Text style={styles.sub}>Escrow + M-Pesa ledger</Text>
        </View>

        {/* Escrow hero */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <LinearGradient
            colors={[colors.electricAlpha['07'], colors.electricAlpha['03']]}
            start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
            style={styles.hero}
          >
            <Label color={colors.white50}>Escrow balance</Label>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 6, marginBottom: 14 }}>
              <Text style={styles.kes}>KES</Text>
              <Text style={styles.heroAmount}>42,300</Text>
            </View>
            <EscrowMeter funded={50000} held={42300} committed={12600} showLabels={false} />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
              <View style={{ flex: 1 }}><MiniStat l="Committed" v="12,600" c={colors.electric} /></View>
              <View style={{ flex: 1 }}><MiniStat l="Available" v="29,700" c={colors.white} /></View>
              <View style={{ flex: 1 }}><MiniStat l="Released 30d" v="184k" c={colors.volt} /></View>
            </View>
          </LinearGradient>
        </View>

        {/* Actions */}
        <View style={{ paddingHorizontal: 20, paddingTop: 14, flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity activeOpacity={0.85} style={{ flex: 1 }}>
            <LinearGradient
              colors={[gradients.cta[0], gradients.cta[1]]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.topupBtn}
            >
              <Text style={styles.topupText}>Top up escrow</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.withdrawBtn} activeOpacity={0.7}>
            <Text style={styles.withdrawText}>Withdraw</Text>
          </TouchableOpacity>
        </View>

        {/* Ledger */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
          <Label style={{ marginBottom: 10 }}>Ledger · April</Label>
          <View style={styles.ledger}>
            {LEDGER.map((r, i) => (
              <View key={i} style={[styles.ledgerRow, i < LEDGER.length - 1 && styles.ledgerBorder]}>
                <View style={[
                  styles.ledgerIcon,
                  { backgroundColor: r.tone === 'in' ? 'rgba(0,229,160,0.13)' : r.tone === 'refund' ? 'rgba(188,255,78,0.14)' : colors.white04 },
                ]}>
                  <Text style={{
                    color: r.tone === 'in' ? colors.electric : r.tone === 'refund' ? colors.volt : colors.white50,
                    fontWeight: '900', fontSize: 16,
                  }}>
                    {r.tone === 'in' ? '↓' : r.tone === 'refund' ? '↩' : '↑'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ledgerTitle}>{r.t}</Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <Text style={styles.ledgerMeta}>{r.d}</Text>
                    <Text style={styles.ledgerMeta}>·</Text>
                    <Text style={styles.ledgerMeta}>{r.s}</Text>
                  </View>
                </View>
                <Text style={{
                  fontSize: 13,
                  fontWeight: '800',
                  color: r.k > 0 ? colors.electric : colors.white,
                  fontFamily: typography.mono,
                  letterSpacing: -0.13,
                }}>
                  {r.k > 0 ? '+' : ''}{r.k.toLocaleString()}
                </Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.exportBtn} activeOpacity={0.7}>
            <Icons.download color={colors.white60} size={12} />
            <Text style={styles.exportText}>Export for accountant · PDF</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  title: { fontSize: 20, fontWeight: '900', letterSpacing: -0.6, color: colors.white },
  sub: { fontSize: 11, color: colors.white50, marginTop: 2 },

  hero: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1, borderColor: colors.electricAlpha['20'],
  },
  kes: { fontSize: 13, color: colors.white50, fontWeight: '700' },
  heroAmount: { fontSize: 34, fontWeight: '900', color: colors.white, letterSpacing: -1.36, fontFamily: typography.mono },
  miniLabel: { fontSize: 9.5, color: colors.white45, letterSpacing: 0.95, textTransform: 'uppercase', fontWeight: '700', marginBottom: 4 },
  miniValue: { fontSize: 14, fontWeight: '800', letterSpacing: -0.28, fontFamily: typography.mono },

  topupBtn: { paddingVertical: 11, borderRadius: 12, alignItems: 'center' },
  topupText: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  withdrawBtn: { flex: 1, paddingVertical: 11, borderRadius: 12, backgroundColor: colors.white04, borderWidth: 0.5, borderColor: colors.white10, alignItems: 'center' },
  withdrawText: { color: colors.white80, fontSize: 12, fontWeight: '600' },

  ledger: {
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: colors.white02,
    borderWidth: 0.5, borderColor: colors.white06,
  },
  ledgerRow: { flexDirection: 'row', gap: 12, paddingVertical: 12, alignItems: 'center' },
  ledgerBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.white05 },
  ledgerIcon: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  ledgerTitle: { fontSize: 12.5, fontWeight: '700', color: colors.white, letterSpacing: -0.13 },
  ledgerMeta: { fontSize: 10.5, color: colors.white45 },

  exportBtn: {
    marginTop: 14, paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: colors.white03,
    borderWidth: 0.5, borderColor: colors.white08,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  exportText: { fontSize: 12, fontWeight: '600', color: colors.white70 },
});
