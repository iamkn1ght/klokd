/**
 * Payment confirmed — Full receipt with PAYE/NSSF/SHIF/AHL + rating + PDF.
 * Ported 1:1 from claude-design/screens/main.jsx
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientBtn, Label } from '../../components/Primitives';
import { AmbientOrbs } from '../../components/KlokdLayout';
import { Icons } from '../../components/Icons';
import { colors, typography } from '../../theme';

type Props = { navigation: NativeStackNavigationProp<any> };

function ReceiptRow({ label, v, dim, bold }: { label: string; v: string; dim?: boolean; bold?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
      <Text style={{ fontSize: 11.5, color: dim ? colors.white40 : colors.white65 }}>{label}</Text>
      <Text style={{
        fontSize: 12,
        fontWeight: bold ? '900' : '600',
        color: bold ? colors.electric : dim ? colors.white55 : colors.white,
        fontFamily: typography.mono,
      }}>{v}</Text>
    </View>
  );
}

export function PaymentConfirmedScreen({ navigation }: Props) {
  const [rated, setRated] = useState(0);
  const gross = 1800, paye = 0, nssf = 108, shif = 49.5;
  const net = Math.round(gross - nssf - shif);

  return (
    <View style={styles.screen}>
      <AmbientOrbs />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}>
        {/* Success */}
        <View style={styles.success}>
          <LinearGradient
            colors={[colors.electric, colors.volt]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.successCircle}
          >
            <Icons.check color={colors.ink} size={30} />
          </LinearGradient>
          <Label color={colors.electric} style={{ marginBottom: 8, letterSpacing: 1.8 }}>PAID · 18 MIN AFTER CLOCK-OUT</Label>
          <Text style={styles.bigKES}>KES 1,642.50</Text>
          <Text style={styles.sentTo}>Sent to M-Pesa · 0722 ••• 500</Text>
        </View>

        {/* Receipt */}
        <View style={styles.receipt}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <Label>Pay statement · 3 Apr</Label>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} activeOpacity={0.7}>
              <Icons.download color={colors.electric} size={11} />
              <Text style={styles.pdfText}>PDF</Text>
            </TouchableOpacity>
          </View>
          <ReceiptRow label="Gross · 5h @ KES 360" v={`KES ${gross.toLocaleString()}`} />
          <ReceiptRow label="PAYE (below threshold)" v="KES 0" dim />
          <ReceiptRow label="NSSF (6%)" v={`− KES ${nssf}`} dim />
          <ReceiptRow label="SHIF (2.75%)" v={`− KES ${shif}`} dim />
          <ReceiptRow label="AHL (suspended)" v="KES 0" dim />
          <View style={styles.divider} />
          <ReceiptRow label="Net to M-Pesa" v={`KES ${net.toLocaleString()}`} bold />
          <Text style={styles.mref}>M-Pesa ref: QAB7X2K1P9</Text>
        </View>

        {/* Rate */}
        <View style={styles.rateCard}>
          <Text style={styles.rateTitle}>How was Brew Bistro tonight?</Text>
          <Text style={styles.rateSub}>Your rating stays anonymous to the venue.</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map(s => (
              <TouchableOpacity key={s} onPress={() => setRated(s)} style={{ padding: 4 }} activeOpacity={0.7}>
                <Icons.star color={s <= rated ? colors.volt : colors.white15} size={28} filled={s <= rated} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <GradientBtn onPress={() => navigation.popToTop()}>See open shifts</GradientBtn>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },

  success: { alignItems: 'center', paddingVertical: 24 },
  successCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  bigKES: { fontSize: 38, fontWeight: '900', color: colors.electric, letterSpacing: -1.52, fontFamily: typography.mono, lineHeight: 40 },
  sentTo: { fontSize: 12, color: colors.white60, marginTop: 8 },

  receipt: {
    marginVertical: 20,
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.white03,
    borderWidth: 1, borderColor: colors.white06,
  },
  pdfText: { fontSize: 10.5, fontWeight: '700', color: colors.electric },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.white08, marginVertical: 8 },
  mref: { marginTop: 10, fontSize: 9.5, color: colors.white35, fontFamily: typography.mono },

  rateCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderWidth: 1, borderColor: colors.white06,
  },
  rateTitle: { fontSize: 13, fontWeight: '700', color: colors.white, marginBottom: 2 },
  rateSub: { fontSize: 11, color: colors.white50, marginBottom: 12 },
  starsRow: { flexDirection: 'row', gap: 6, justifyContent: 'center' },

  footer: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 18 },
});
