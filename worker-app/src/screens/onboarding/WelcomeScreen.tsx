/**
 * Welcome — what Klokd is, in plain terms, then sign in. No invented numbers,
 * testimonials or activity: Klokd is in early access, so the screen says what
 * the app does today.
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GradientBtn, Eyebrow, Logo } from '../../components/Primitives';
import { AmbientOrbs, FadeUp, SafeTop, PressScale } from '../../components/KlokdLayout';
import { Icons } from '../../components/Icons';
import { colors } from '../../theme';

type Props = { navigation: NativeStackNavigationProp<any> };

const STEPS = [
  { icon: 'id' as const, t: 'Verify once', d: 'Your National ID is checked with the government register through Identiti. Businesses see a verified badge, never your ID.' },
  { icon: 'calendar' as const, t: 'Pick up shifts nearby', d: 'Hospitality shifts posted by verified Nairobi businesses with a KRA PIN and work-injury cover.' },
  { icon: 'pin' as const, t: 'Check in, get the PIN, start', d: 'Tap “I’ve arrived” at the venue, enter the manager’s 4-digit PIN, and your shift starts.' },
  { icon: 'wallet' as const, t: 'See every shilling', d: 'Pay, PAYE, NSSF, SHIF and housing levy shown per shift. M-Pesa payouts switch on when Klokd payments go live.' },
];

export function WelcomeScreen({ navigation }: Props) {
  return (
    <View style={styles.screen}>
      <AmbientOrbs />
      <SafeTop />
      <ScrollView contentContainerStyle={styles.content}>
        <FadeUp delay={0}>
          <Logo size={34} />
        </FadeUp>
        <FadeUp delay={80} style={{ marginTop: 36 }}>
          <Eyebrow>Klokd · for workers</Eyebrow>
          <Text style={styles.h1}>Verified shifts. Clear pay.</Text>
          <Text style={styles.sub}>
            Find hospitality shifts near you in Nairobi, check in with your phone, and see exactly what you’re paid after statutory deductions.
          </Text>
        </FadeUp>

        <View style={{ marginTop: 28, gap: 12 }}>
          {STEPS.map((s, i) => {
            const Ico = Icons[s.icon];
            return (
              <FadeUp key={s.t} delay={160 + i * 70}>
                <View style={styles.step}>
                  <View style={styles.stepIcon}>
                    <Ico color={colors.electric} size={18} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.stepT}>{s.t}</Text>
                    <Text style={styles.stepD}>{s.d}</Text>
                  </View>
                </View>
              </FadeUp>
            );
          })}
        </View>

        <FadeUp delay={480}>
          <Text style={styles.note}>Klokd is in early access in Nairobi. Your data is handled under Kenya’s Data Protection Act 2019.</Text>
        </FadeUp>
      </ScrollView>

      <View style={styles.footer}>
        <GradientBtn onPress={() => navigation.navigate('RailsLogin')}>Get started</GradientBtn>
        <PressScale onPress={() => navigation.navigate('RailsLogin')} style={styles.signIn}>
          <Text style={styles.signInText}>I already have an account</Text>
        </PressScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  content: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 30 },
  h1: { fontSize: 34, fontWeight: '900', color: colors.white, letterSpacing: -1.4, marginTop: 10, lineHeight: 38 },
  sub: { fontSize: 15, color: colors.white70, lineHeight: 22, marginTop: 12 },
  step: { flexDirection: 'row', gap: 14, padding: 14, borderRadius: 18, backgroundColor: colors.white03, borderWidth: 1, borderColor: colors.white08 },
  stepIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.electricAlpha['10'], alignItems: 'center', justifyContent: 'center' },
  stepT: { fontSize: 15, fontWeight: '900', color: colors.white },
  stepD: { fontSize: 12.5, color: colors.white65, lineHeight: 18, marginTop: 3 },
  note: { fontSize: 11.5, color: colors.white55, lineHeight: 17, marginTop: 22, textAlign: 'center' },
  footer: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 24, gap: 6 },
  signIn: { alignItems: 'center', paddingVertical: 12 },
  signInText: { color: colors.white75, fontSize: 14, fontWeight: '700' },
});
