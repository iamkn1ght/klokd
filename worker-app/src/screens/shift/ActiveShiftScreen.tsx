/**
 * Active shift — Live timer + progress + accruing earnings + WhatsApp contact + dispute button.
 * Ported 1:1 from claude-design/screens/main.jsx
 */
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientBtn, IconBtn, StatusPill, Label } from '../../components/Primitives';
import { Icons } from '../../components/Icons';
import { useApi } from '../../hooks/useApi';
import { colors, typography } from '../../theme';

type Props = {
  navigation: NativeStackNavigationProp<any>;
  route?: { params?: { shift?: any } };
};

export function ActiveShiftScreen({ navigation, route }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const { post } = useApi();

  useEffect(() => {
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const hrs = String(Math.floor(elapsed / 3600)).padStart(2, '0');
  const mns = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
  const scs = String(elapsed % 60).padStart(2, '0');

  const handleClockOut = async () => {
    try {
      const shiftId = route?.params?.shift?.id || 's1';
      await post(`/shifts/${shiftId}/clockout`);
    } catch {}
    navigation.navigate('PaymentConfirmed');
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <IconBtn onPress={() => navigation.goBack()}>
          <Icons.back color={colors.white} size={14} />
        </IconBtn>
        <StatusPill tone="mint">● LIVE</StatusPill>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}>
        {/* Timer */}
        <View style={styles.timerBlock}>
          <Label color={colors.white40} style={{ marginBottom: 10 }}>You clocked in at 4:58 PM</Label>
          <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
            <Text style={[styles.timer, { color: colors.electric }]}>{hrs}</Text>
            <Text style={styles.timer}>:{mns}:</Text>
            <Text style={[styles.timer, { color: colors.white50 }]}>{scs}</Text>
          </View>
          <Text style={styles.timerSub}>Waiter · The Brew Bistro</Text>
        </View>

        {/* Progress bar */}
        <View style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={styles.progLabel}>5:00 PM · in</Text>
            <Text style={styles.progLabel}>10:00 PM · out</Text>
          </View>
          <View style={styles.progTrack}>
            <LinearGradient
              colors={[colors.electric, colors.volt]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ width: '38%', height: '100%', borderRadius: 999 }}
            />
          </View>
        </View>

        {/* Earnings accumulating */}
        <View style={styles.earningsCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Label>Earning now</Label>
            <Text style={{ fontSize: 10, color: colors.electric }}>● Accruing</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
            <Text style={styles.earningsKES}>KES 684</Text>
            <Text style={styles.earningsOf}>of 1,800</Text>
          </View>
          <Text style={styles.earningsSub}>Released to M-Pesa at clock-out</Text>
        </View>

        {/* Employer contact */}
        <View style={styles.empRow}>
          <View style={styles.empAvatar}>
            <Text style={styles.empInitials}>TB</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.empTitle}>On-site contact</Text>
            <Text style={styles.empSub}>David M. · Floor manager</Text>
          </View>
          <TouchableOpacity style={styles.waBtn} activeOpacity={0.7}>
            <Text style={styles.waText}>WhatsApp</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.disputeBtn} activeOpacity={0.7}>
          <Icons.dispute color={colors.warning} size={13} />
          <Text style={styles.disputeText}>Something's wrong with this shift</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.footer}>
        <GradientBtn onPress={handleClockOut}>Clock out</GradientBtn>
        <Text style={styles.footerNote}>You'll confirm before payment is triggered.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  header: { paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  timerBlock: { alignItems: 'center', paddingVertical: 18 },
  timer: { fontSize: 56, fontWeight: '900', fontFamily: typography.mono, letterSpacing: -1.68, color: colors.white, lineHeight: 56 },
  timerSub: { fontSize: 11, color: colors.white40, marginTop: 6 },

  progLabel: { fontSize: 10, color: colors.white45 },
  progTrack: { height: 5, borderRadius: 999, backgroundColor: colors.white06, overflow: 'hidden' },

  earningsCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderWidth: 1, borderColor: colors.white06,
    marginBottom: 12,
  },
  earningsKES: { fontSize: 28, fontWeight: '900', color: colors.white, fontFamily: typography.mono, letterSpacing: -0.84 },
  earningsOf: { fontSize: 12, color: colors.white40 },
  earningsSub: { fontSize: 10.5, color: colors.white45, marginTop: 6 },

  empRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderWidth: 1, borderColor: colors.white06,
    marginBottom: 12,
  },
  empAvatar: { width: 34, height: 34, borderRadius: 9, backgroundColor: colors.white05, alignItems: 'center', justifyContent: 'center' },
  empInitials: { fontSize: 11, fontWeight: '900', color: colors.white },
  empTitle: { fontSize: 12.5, fontWeight: '700', color: colors.white },
  empSub: { fontSize: 10.5, color: colors.white50 },
  waBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: 'rgba(0,229,160,0.1)', borderWidth: 1, borderColor: 'rgba(0,229,160,0.25)' },
  waText: { fontSize: 11, fontWeight: '700', color: colors.electric },

  disputeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    paddingVertical: 10, borderRadius: 11,
    borderWidth: 1, borderColor: 'rgba(255,179,71,0.25)',
    backgroundColor: 'transparent',
  },
  disputeText: { fontSize: 11.5, color: colors.warning, fontWeight: '600' },

  footer: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 18, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.white06, alignItems: 'center' },
  footerNote: { fontSize: 10, color: colors.white40, marginTop: 8 },
});
