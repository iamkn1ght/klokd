/**
 * Pay tab — Hero ledger + full statutory breakdown (PAYE/NSSF/SHIF/AHL) + recent payouts.
 * Ported 1:1 from claude-design/screens/main.jsx
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Label } from '../../components/Primitives';
import { colors, typography } from '../../theme';

function DeductRow({ label, v, note, bold, ahlOn }: { label: React.ReactNode; v: number; note?: string; bold?: boolean; ahlOn?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
          {typeof label === 'string' ? (
            <Text style={{ fontSize: 12, fontWeight: bold ? '800' : '600', color: bold ? colors.white : colors.white75 }}>{label}</Text>
          ) : label}
        </View>
        {note && <Text style={{ fontSize: 9.5, color: colors.white35, marginTop: 1 }}>{note}</Text>}
      </View>
      <Text style={{ fontSize: 12.5, fontWeight: '700', color: bold ? colors.white : colors.white85, fontFamily: typography.mono }}>
        − KES {v.toLocaleString()}
      </Text>
    </View>
  );
}

const PAYOUTS = [
  { d: '3 Apr', r: 'Waiter', n: '1,642', ref: 'QAB7X2K1P9' },
  { d: '2 Apr', r: 'Barista', n: '1,915', ref: 'QAB6R8L2M4' },
  { d: '31 Mar', r: 'Waiter', n: '1,642', ref: 'QAB5K3N8C2' },
  { d: '28 Mar', r: 'Cashier', n: '1,460', ref: 'QAB4F9X1Y7' },
];

export function PayScreen() {
  const [ahl] = useState(false);
  const gross = 84210, paye = 2340, nssf = 5050, shif = 2315;
  const ahlD = ahl ? Math.round(gross * 0.015) : 0;
  const net = gross - paye - nssf - shif - ahlD;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <Text style={styles.title}>Your pay</Text>
          <Text style={styles.sub}>April · 12 shifts completed</Text>
        </View>

        {/* Hero ledger */}
        <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
          <LinearGradient
            colors={[colors.electricAlpha['07'], 'rgba(0,229,160,0.01)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.hero}
          >
            <Label color={colors.white55} style={{ marginBottom: 6 }}>Net this month</Label>
            <Text style={styles.heroKES}>KES {net.toLocaleString()}</Text>
            <Text style={styles.heroSub}>Gross KES {gross.toLocaleString()} · − KES {(gross - net).toLocaleString()} deducted</Text>
          </LinearGradient>
        </View>

        {/* Statutory */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
          <Label style={{ marginBottom: 10 }}>Statutory deductions</Label>
          <View style={styles.statCard}>
            <DeductRow label="PAYE · tax" v={paye} note="2025/26 bands" />
            <DeductRow label="NSSF · Tier I + II" v={nssf} note="6% · employer matches" />
            <DeductRow label="SHIF · health" v={shif} note="2.75% of gross" />
            <DeductRow
              label={
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.white75 }}>AHL · housing</Text>
                  <View style={[styles.ahlBadge, { backgroundColor: ahl ? 'rgba(255,179,71,0.12)' : colors.white05 }]}>
                    <Text style={{ fontSize: 9.5, color: ahl ? colors.warning : colors.white40, fontWeight: '700' }}>{ahl ? 'ON' : 'SUSPENDED'}</Text>
                  </View>
                </View>
              }
              v={ahlD}
              note="1.5% · toggle above"
            />
            <View style={styles.divider} />
            <DeductRow label="Total deducted" v={gross - net} bold />
          </View>
        </View>

        {/* Recent payouts */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
          <Label style={{ marginBottom: 10 }}>Recent payouts</Label>
          {PAYOUTS.map((p, i) => (
            <View key={i} style={styles.payoutRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.payoutRole}>{p.r} · {p.d}</Text>
                <Text style={styles.payoutRef}>M-Pesa · {p.ref}</Text>
              </View>
              <Text style={styles.payoutKES}>KES {p.n}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  title: { fontSize: 22, fontWeight: '900', letterSpacing: -0.66, color: colors.white, marginBottom: 2 },
  sub: { fontSize: 11, color: colors.white50 },

  hero: {
    paddingHorizontal: 16, paddingVertical: 16,
    borderRadius: 18,
    borderWidth: 1, borderColor: colors.electricAlpha['25'],
  },
  heroKES: { fontSize: 34, fontWeight: '900', color: colors.electric, letterSpacing: -1.36, fontFamily: typography.mono, lineHeight: 36 },
  heroSub: { fontSize: 11, color: colors.white55, marginTop: 6 },

  statCard: {
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderWidth: 1, borderColor: colors.white06,
  },
  ahlBadge: { marginLeft: 4, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.white08, marginVertical: 6 },

  payoutRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.white02,
    borderWidth: 1, borderColor: colors.white04,
    marginBottom: 6,
  },
  payoutRole: { fontSize: 12, fontWeight: '700', color: colors.white },
  payoutRef: { fontSize: 10, color: colors.white40, fontFamily: typography.mono, marginTop: 1 },
  payoutKES: { fontSize: 13, fontWeight: '900', color: colors.electric, fontFamily: typography.mono },
});
