import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { ProgressBar } from '../../components/ProgressBar';
import { GradientButton } from '../../components/GradientButton';
import { colors, gradients, typography, spacing, radius } from '../../theme';

type Props = { navigation: NativeStackNavigationProp<any> };

const METHODS = [
  { id: 'paybill', label: 'M-Pesa Paybill', sub: 'For businesses with a Safaricom paybill number', icon: '🏢', num: '247247' },
  { id: 'till', label: 'Till Number', sub: 'For businesses with an M-Pesa till', icon: '📟', num: '5223890' },
  { id: 'personal', label: 'Personal M-Pesa', sub: 'Your own M-Pesa number', icon: '📱', num: '0722 400 500' },
];

const ESCROW_STEPS = ['You fund', 'Klokd holds', 'Worker paid'];
const ESCROW_SUBS = ['On shift confirm', 'Held securely', '30 min post clock-out'];

export function MpesaSetupScreen({ navigation }: Props) {
  const [method, setMethod] = useState('paybill');
  const [activated, setActivated] = useState(false);
  const current = METHODS.find(m => m.id === method)!;

  if (activated) {
    return (
      <View style={[styles.screen, styles.successCenter]}>
        <LinearGradient colors={[...gradients.cta]} style={styles.successGlow} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Text style={styles.successCheck}>✓</Text>
        </LinearGradient>
        <Text style={styles.successTitle}>You're live.</Text>
        <Text style={styles.successSub}>Your employer account is active. Post your first shift in under 2 minutes.</Text>

        <View style={styles.escrowActiveCard}>
          <Text style={styles.escrowActiveLabel}>ESCROW ACTIVE</Text>
          <Text style={styles.escrowActiveMethod}>{current.label}</Text>
          <Text style={styles.escrowActiveNum}>{current.num}</Text>
          <Text style={styles.escrowActiveSub}>Workers paid within 30 min of clock-out</Text>
        </View>

        <View style={styles.feeCard}>
          <Text style={styles.feeText}>
            <Text style={{ color: colors.ink, fontWeight: '700' }}>4% platform fee</Text> charged per completed shift. No fee on no-shows. No monthly minimum.
          </Text>
        </View>

        <GradientButton title="Post my first shift →" onPress={() => navigation.getParent()?.navigate('Main')} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
      <ProgressBar currentStep={3} totalSteps={3} onBack={() => navigation.goBack()} />

      <Text style={styles.h}>How will you pay workers?</Text>
      <Text style={styles.sub}>Choose how funds are drawn from your M-Pesa to pay workers.</Text>

      {/* Method cards */}
      {METHODS.map(m => {
        const isOn = method === m.id;
        return (
          <TouchableOpacity
            key={m.id}
            style={[styles.methodCard, isOn ? styles.methodOn : styles.methodOff]}
            onPress={() => setMethod(m.id)}
            activeOpacity={0.7}
          >
            <View style={[styles.methodIcon, { backgroundColor: isOn ? colors.ink : colors.soft }]}>
              <Text style={{ fontSize: 16 }}>{m.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.methodLabel}>{m.label}</Text>
              <Text style={styles.methodSub}>{m.sub}</Text>
            </View>
            <View style={[styles.radio, isOn ? styles.radioOn : styles.radioOff]}>
              {isOn && <View style={styles.radioDot} />}
            </View>
          </TouchableOpacity>
        );
      })}

      {/* Account number display */}
      <View style={styles.accountCard}>
        <Text style={styles.accountLabel}>{current.label} Number</Text>
        <Text style={styles.accountNum}>{current.num}</Text>
      </View>

      {/* Escrow visual */}
      <View style={styles.escrowCard}>
        <Text style={styles.escrowTitle}>HOW ESCROW WORKS</Text>
        <View style={styles.escrowRow}>
          {ESCROW_STEPS.map((step, i) => (
            <View key={i} style={styles.escrowItem}>
              <LinearGradient colors={[...gradients.cta]} style={styles.escrowCircle} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Text style={styles.escrowCircleText}>{i + 1}</Text>
              </LinearGradient>
              <Text style={styles.escrowStepText}>{step}</Text>
              <Text style={styles.escrowStepSub}>{ESCROW_SUBS[i]}</Text>
            </View>
          ))}
        </View>
      </View>

      <GradientButton title="Activate my account →" onPress={() => setActivated(true)} />
      <Text style={styles.feeNote}>4% per completed shift · No monthly fees · No lock-in</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.mist },
  scrollContent: { padding: spacing.xl, paddingBottom: 40 },
  successCenter: { alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  h: { fontSize: typography.size.h3, fontWeight: '700', color: colors.ink, letterSpacing: -0.02, marginBottom: 4 },
  sub: { fontSize: typography.size.caption, color: colors.mid, lineHeight: 19, marginBottom: 16 },

  methodCard: { borderRadius: radius.lg, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 8 },
  methodOn: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.ink },
  methodOff: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.soft },
  methodIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  methodLabel: { fontSize: typography.size.body, fontWeight: '700', color: colors.ink, marginBottom: 2 },
  methodSub: { fontSize: typography.size.label, color: colors.mid, lineHeight: 14 },
  radio: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderWidth: 2.5, borderColor: colors.ink },
  radioOff: { borderWidth: 2, borderColor: colors.soft },
  radioDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.electric },

  accountCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.inkAlpha['10'], borderRadius: radius.lg, padding: 12, marginTop: 6, marginBottom: 14 },
  accountLabel: { fontSize: typography.size.micro, fontWeight: '600', color: colors.mid, letterSpacing: 0.5, marginBottom: 5 },
  accountNum: { fontSize: 20, fontWeight: '800', color: colors.ink, letterSpacing: 0.3 },

  escrowCard: { backgroundColor: colors.electricAlpha['08'], borderWidth: 1, borderColor: colors.electricAlpha['18'], borderRadius: radius.lg, padding: 13, marginBottom: 16 },
  escrowTitle: { fontSize: typography.size.micro, fontWeight: '700', letterSpacing: 1.2, color: colors.electric, marginBottom: 12 },
  escrowRow: { flexDirection: 'row' },
  escrowItem: { flex: 1, alignItems: 'center' },
  escrowCircle: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  escrowCircleText: { fontSize: 10.5, fontWeight: '800', color: colors.ink },
  escrowStepText: { fontSize: typography.size.label, fontWeight: '700', color: colors.ink, marginBottom: 2 },
  escrowStepSub: { fontSize: typography.size.micro, color: colors.mid, textAlign: 'center', lineHeight: 14 },

  feeNote: { textAlign: 'center', fontSize: typography.size.label, color: colors.mid, marginTop: 10 },

  // Success
  successGlow: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  successCheck: { fontSize: 32, fontWeight: '700', color: colors.ink },
  successTitle: { fontSize: 22, fontWeight: '900', color: colors.ink, letterSpacing: -0.04, marginBottom: 6 },
  successSub: { fontSize: 12, color: colors.mid, textAlign: 'center', lineHeight: 20, maxWidth: 210, marginBottom: 28 },
  escrowActiveCard: {
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.soft,
    borderLeftWidth: 3, borderLeftColor: colors.electric, borderRadius: radius.lg,
    borderTopLeftRadius: 0, borderBottomLeftRadius: 0, padding: 14, width: '100%', marginBottom: 10,
  },
  escrowActiveLabel: { fontSize: typography.size.micro, fontWeight: '700', letterSpacing: 1.2, color: colors.electric, marginBottom: 7 },
  escrowActiveMethod: { fontSize: 13.5, fontWeight: '700', color: colors.ink, marginBottom: 3 },
  escrowActiveNum: { fontSize: typography.size.label, color: colors.mid, marginBottom: 3 },
  escrowActiveSub: { fontSize: typography.size.label, color: colors.mid },
  feeCard: { backgroundColor: colors.electricAlpha['08'], borderWidth: 1, borderColor: colors.electricAlpha['18'], borderRadius: radius.lg, padding: 12, width: '100%', marginBottom: 24 },
  feeText: { fontSize: typography.size.label, color: colors.mid, lineHeight: 17 },
});
