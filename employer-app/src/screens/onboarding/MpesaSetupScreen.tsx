/**
 * Employer Escrow Setup (was "MpesaSetup") — Large fund amount display + presets + M-Pesa source + 3-step explainer.
 * Ported 1:1 from claude-design/screens/employer-onboarding.jsx (EmpEscrow)
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientBtn, Eyebrow, Label, StepProgress } from '../../components/Primitives';
import { AmbientOrbs, FadeUp, SafeTop } from '../../components/KlokdLayout';
import { Icons } from '../../components/Icons';
import { colors, typography } from '../../theme';

type Props = { navigation: NativeStackNavigationProp<any> };

const PRESETS = [20000, 50000, 100000, 200000];

function EmpOnbHeader({ step, onBack }: { step: number; onBack?: () => void }) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Icons.back color={colors.white} size={14} />
        </TouchableOpacity>
      ) : <View style={{ width: 34 }} />}
      <View style={{ flex: 1 }}>
        <StepProgress step={step} total={3} />
      </View>
      <View style={{ width: 34 }} />
    </View>
  );
}

export function MpesaSetupScreen({ navigation }: Props) {
  const [amount, setAmount] = useState(50000);
  const [loading, setLoading] = useState(false);
  const [funded, setFunded] = useState(false);

  const handleFund = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setFunded(true);
      setTimeout(() => navigation.getParent()?.navigate('Main'), 1400);
    }, 1600);
  };

  if (funded) {
    return (
      <View style={[styles.screen, { alignItems: 'center', justifyContent: 'center', padding: 24 }]}>
        <LinearGradient
          colors={[colors.electric, colors.volt]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.fundedCircle}
        >
          <Icons.check color={colors.ink} size={34} />
        </LinearGradient>
        <Text style={styles.fundedTitle}>Escrow funded</Text>
        <Text style={styles.fundedAmount}>KES {amount.toLocaleString()}</Text>
        <Text style={styles.fundedDesc}>Your M-Pesa is holding this. It releases worker-by-worker only on clock-out.</Text>
        <Text style={styles.fundedLoading}>Opening your dashboard…</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <AmbientOrbs intensity="subtle" />
      <SafeTop />
      <EmpOnbHeader step={1} onBack={() => navigation.goBack()} />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 22, paddingBottom: 120 }}>
        <FadeUp delay={0}>
          <Eyebrow color={colors.volt} style={{ marginBottom: 10 }}>STEP 02 · ESCROW</Eyebrow>
          <Text style={styles.h1}>Fund your M-Pesa escrow</Text>
          <Text style={styles.sub}>Pre-fund an amount. Workers see you're ready to pay, which means faster fills.</Text>
        </FadeUp>

        {/* Big amount display */}
        <FadeUp delay={120}>
          <LinearGradient
            colors={[colors.electricAlpha['10'], colors.electricAlpha['03']]}
            start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
            style={styles.amountCard}
          >
            <Label color={colors.white50}>Fund amount</Label>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 6, marginTop: 10 }}>
              <Text style={styles.amountKES}>KES</Text>
              <Text style={styles.amountBig}>{amount.toLocaleString()}</Text>
            </View>
            <Text style={styles.amountShifts}>≈ {Math.round(amount / 1800)} shifts</Text>
          </LinearGradient>
        </FadeUp>

        {/* Presets */}
        <FadeUp delay={200} style={styles.presets}>
          {PRESETS.map(p => (
            <TouchableOpacity
              key={p}
              onPress={() => setAmount(p)}
              activeOpacity={0.7}
              style={[
                styles.preset,
                amount === p
                  ? { borderWidth: 1.5, borderColor: colors.electric, backgroundColor: 'rgba(0,229,160,0.08)' }
                  : { borderWidth: 1, borderColor: colors.white08, backgroundColor: colors.white03 },
              ]}
            >
              <Text style={{ color: amount === p ? colors.electric : colors.white70, fontSize: 11.5, fontWeight: '700' }}>
                {p / 1000}k
              </Text>
            </TouchableOpacity>
          ))}
        </FadeUp>

        {/* M-Pesa source */}
        <FadeUp delay={280} style={styles.mpesaSource}>
          <View style={styles.mpesaIcon}>
            <Icons.mpesa color={colors.electric} size={18} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.mpesaTitle}>M-Pesa Business</Text>
            <Text style={styles.mpesaSub}>Till 504-221 · Brew Bistro</Text>
          </View>
          <View style={styles.defaultPill}>
            <Text style={styles.defaultText}>DEFAULT</Text>
          </View>
        </FadeUp>

        {/* How escrow works */}
        <FadeUp delay={360} style={styles.howBox}>
          <Label color={colors.white50} style={{ marginBottom: 10 }}>How escrow works</Label>
          {[
            { n: '1', t: 'You fund', s: 'M-Pesa holds the amount. Worker sees funded badge.' },
            { n: '2', t: 'Worker clocks out', s: 'Amount earmarks for that worker.' },
            { n: '3', t: 'Auto-release in 5 min', s: 'Unless you flag an issue. Average: 3 min.' },
          ].map(s => (
            <View key={s.n} style={{ flexDirection: 'row', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
              <View style={styles.stepCircle}>
                <Text style={styles.stepCircleText}>{s.n}</Text>
              </View>
              <View>
                <Text style={styles.stepTitle}>{s.t}</Text>
                <Text style={styles.stepSub}>{s.s}</Text>
              </View>
            </View>
          ))}
        </FadeUp>
      </ScrollView>

      <View style={styles.footer}>
        <GradientBtn onPress={handleFund} disabled={loading}>
          {loading ? 'Waiting for M-Pesa prompt…' : `Fund KES ${amount.toLocaleString()} via STK push`}
        </GradientBtn>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'center', marginTop: 10 }}>
          <Icons.lock color={colors.white40} size={10} />
          <Text style={styles.footerText}>Fully refundable anytime · M-Pesa trust score unaffected</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  header: { paddingHorizontal: 18, paddingTop: 12, flexDirection: 'row', alignItems: 'center', gap: 14 },
  backBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 0.5, borderColor: colors.white12, backgroundColor: colors.white04, alignItems: 'center', justifyContent: 'center' },

  h1: { fontSize: 28, fontWeight: '900', letterSpacing: -1.1, lineHeight: 32, color: colors.white, marginBottom: 8 },
  sub: { fontSize: 14, color: colors.white55, lineHeight: 21, marginBottom: 20 },

  amountCard: {
    paddingHorizontal: 20, paddingVertical: 22,
    borderRadius: 18,
    borderWidth: 1, borderColor: colors.electricAlpha['40'],
    alignItems: 'center',
    marginBottom: 16,
  },
  amountKES: { fontSize: 16, color: colors.white50, fontWeight: '700' },
  amountBig: { fontSize: 44, fontWeight: '900', color: colors.white, letterSpacing: -2.2, fontFamily: typography.mono },
  amountShifts: { fontSize: 11, color: colors.electric, fontWeight: '700', marginTop: 4 },

  presets: { flexDirection: 'row', gap: 6, marginBottom: 18 },
  preset: { flex: 1, paddingHorizontal: 4, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },

  mpesaSource: {
    paddingHorizontal: 14, paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: colors.white03,
    borderWidth: 1, borderColor: colors.white06,
    flexDirection: 'row', alignItems: 'center', gap: 11,
    marginBottom: 14,
  },
  mpesaIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(0,229,160,0.13)', alignItems: 'center', justifyContent: 'center' },
  mpesaTitle: { fontSize: 12, fontWeight: '800', color: colors.white },
  mpesaSub: { fontSize: 10.5, color: colors.white50, fontFamily: typography.mono },
  defaultPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(0,229,160,0.13)' },
  defaultText: { fontSize: 9.5, fontWeight: '800', color: colors.electric, letterSpacing: 0.76 },

  howBox: {
    paddingHorizontal: 14, paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.white02,
    borderWidth: 0.5, borderColor: colors.white06,
  },
  stepCircle: { width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,229,160,0.13)', alignItems: 'center', justifyContent: 'center' },
  stepCircleText: { fontSize: 11, fontWeight: '800', color: colors.electric, fontFamily: typography.mono },
  stepTitle: { fontSize: 12, fontWeight: '700', color: colors.white },
  stepSub: { fontSize: 10.5, color: colors.white50, lineHeight: 14.7, marginTop: 1 },

  footer: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 24 },
  footerText: { fontSize: 10.5, color: colors.white40 },

  // Funded state
  fundedCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  fundedTitle: { fontSize: 28, fontWeight: '900', letterSpacing: -0.84, color: colors.white, marginBottom: 8 },
  fundedAmount: { fontSize: 32, fontWeight: '900', color: colors.electric, letterSpacing: -1.28, fontFamily: typography.mono, marginBottom: 12 },
  fundedDesc: { fontSize: 13, color: colors.white60, lineHeight: 19.5, maxWidth: 260, marginBottom: 24, textAlign: 'center' },
  fundedLoading: { fontSize: 10.5, color: colors.white40, letterSpacing: 1.05, textTransform: 'uppercase' },
});
