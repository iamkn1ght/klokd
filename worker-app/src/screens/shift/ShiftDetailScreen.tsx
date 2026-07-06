/**
 * Shift Detail — Hero + earnings block + details grid + employer + guarantee + contract.
 * Ported 1:1 from claude-design/screens/main.jsx
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientBtn, IconBtn, Label, StatusPill } from '../../components/Primitives';
import { AmbientOrbs, SafeTop } from '../../components/KlokdLayout';
import { Icons } from '../../components/Icons';
import { colors, typography } from '../../theme';

type Shift = {
  role: string;
  venue: string;
  area: string;
  date: string;
  time: string;
  pay: number;
  dist: string;
  rating: number;
  shifts: number;
};

type Props = {
  navigation: NativeStackNavigationProp<any>;
  route?: { params?: { shift?: Shift } };
};

function DetailTile({ label, v, sub }: { label: string; v: string; sub: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileV}>{v}</Text>
      <Text style={styles.tileSub}>{sub}</Text>
    </View>
  );
}

export function ShiftDetailScreen({ navigation, route }: Props) {
  const shift = route?.params?.shift || {
    role: 'Waiter', venue: 'The Brew Bistro', area: 'Westlands',
    date: 'Tonight', time: '5:00 – 10:00 PM', pay: 1800, dist: '0.8 km', rating: 4.8, shifts: 23,
  };
  const gross = shift.pay;

  return (
    <View style={styles.screen}>
      <AmbientOrbs intensity="subtle" />
      <SafeTop />
      <View style={styles.header}>
        <IconBtn onPress={() => navigation.goBack()}>
          <Icons.back color={colors.white} size={14} />
        </IconBtn>
        <Label>Shift details</Label>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}>
        {/* Hero */}
        <View style={{ marginBottom: 16 }}>
          <StatusPill tone="mint">Open · matches you</StatusPill>
          <Text style={styles.role}>{shift.role}</Text>
          <Text style={styles.venue}>{shift.venue} · {shift.area}</Text>
        </View>

        {/* Earnings block */}
        <LinearGradient
          colors={[colors.electricAlpha['08'], colors.electricAlpha['04']]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.earnings}
        >
          <Label color={colors.white50} style={{ marginBottom: 6 }}>You'll earn</Label>
          <Text style={styles.bigKES}>KES {gross.toLocaleString()}</Text>
          <Text style={styles.earningsSub}>
            After statutory deductions (PAYE, NSSF, SHIF) · paid to M-Pesa within 30 min of clock-out
          </Text>
        </LinearGradient>

        {/* Details grid */}
        <View style={styles.grid}>
          <DetailTile label="When" v={shift.date} sub={shift.time} />
          <DetailTile label="Where" v={shift.area} sub={shift.dist + ' away'} />
          <DetailTile label="Duration" v="5 hours" sub="5 PM – 10 PM" />
          <DetailTile label="Rate" v={`KES ${Math.round(gross / 5)}/hr`} sub="Above minimum" />
        </View>

        {/* Employer */}
        <Label style={{ marginBottom: 8 }}>Employer</Label>
        <View style={styles.empCard}>
          <View style={styles.empAvatar}>
            <Text style={styles.empInitials}>TB</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.empName}>{shift.venue}</Text>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', gap: 3, alignItems: 'center' }}>
                <Icons.star color={colors.volt} size={10} />
                <Text style={styles.empMeta}>{shift.rating}</Text>
              </View>
              <Text style={styles.empMeta}>·</Text>
              <Text style={styles.empMeta}>{shift.shifts} shifts posted</Text>
            </View>
          </View>
          <StatusPill tone="mint">WIBA ✓</StatusPill>
        </View>

        {/* Payment guarantee */}
        <View style={styles.guarantee}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Icons.mpesa color={colors.electric} size={14} />
            <Label color={colors.electric}>Payment guarantee</Label>
          </View>
          <Text style={styles.guaranteeHead}>KES {gross.toLocaleString()} is held in escrow before your shift starts.</Text>
          <Text style={styles.guaranteeSub}>
            If Brew Bistro doesn't confirm within 4 hours of clock-out, Klokd releases your pay automatically.
          </Text>
        </View>

        <TouchableOpacity style={styles.contractBtn} activeOpacity={0.7}>
          <Text style={styles.contractText}>Preview employment contract</Text>
          <Icons.chevron color={colors.white40} size={12} />
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.declineBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={styles.declineText}>Decline</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <GradientBtn onPress={() => navigation.navigate('ClockIn', { shift })}>Accept shift</GradientBtn>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  header: { paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  role: { fontSize: 26, fontWeight: '900', letterSpacing: -0.78, color: colors.white, marginTop: 10, marginBottom: 4 },
  venue: { fontSize: 13, color: colors.white70 },

  earnings: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.electricAlpha['30'],
    marginBottom: 14,
  },
  bigKES: { fontSize: 34, fontWeight: '900', color: colors.electric, letterSpacing: -1.36, fontFamily: typography.mono },
  earningsSub: { fontSize: 11, color: colors.white55, marginTop: 4, lineHeight: 16.5 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  tile: {
    width: '48%',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderWidth: 1, borderColor: colors.white06,
  },
  tileLabel: { fontSize: 9.5, color: colors.white40, letterSpacing: 0.95, textTransform: 'uppercase', marginBottom: 4 },
  tileV: { fontSize: 13, fontWeight: '700', color: colors.white, letterSpacing: -0.13 },
  tileSub: { fontSize: 10, color: colors.white40, marginTop: 2 },

  empCard: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.white03,
    borderWidth: 1, borderColor: colors.white06,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginBottom: 14,
  },
  empAvatar: {
    width: 40, height: 40, borderRadius: 11,
    backgroundColor: colors.white05,
    alignItems: 'center', justifyContent: 'center',
  },
  empInitials: { fontSize: 13, fontWeight: '900', color: colors.white },
  empName: { fontSize: 13, fontWeight: '700', color: colors.white, marginBottom: 2 },
  empMeta: { fontSize: 10.5, color: colors.white50 },

  guarantee: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.electricAlpha['04'],
    borderWidth: 1, borderColor: colors.electricAlpha['18'],
    marginBottom: 14,
  },
  guaranteeHead: { fontSize: 11.5, color: colors.white, fontWeight: '600', marginBottom: 2 },
  guaranteeSub: { fontSize: 10.5, color: colors.white55, lineHeight: 15.75 },

  contractBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 11, paddingHorizontal: 14,
    borderRadius: 11,
    borderWidth: 1, borderColor: colors.white08,
    backgroundColor: colors.white02,
  },
  contractText: { fontSize: 11.5, color: colors.white65, fontWeight: '600' },

  footer: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 18,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.white06,
  },
  declineBtn: {
    paddingHorizontal: 18, paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1, borderColor: colors.white08,
  },
  declineText: { fontSize: 13, color: colors.white55, fontWeight: '600' },
});
