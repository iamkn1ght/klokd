/**
 * Welcome — what Klokd does for a business, in plain terms. No invented
 * numbers, logos or testimonials: Klokd is in early access.
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
  { icon: 'shield' as const, t: 'Verify your business', d: 'Add your KRA PIN and your Work Injury Benefits Act policy once. Then you can post.' },
  { icon: 'calendar' as const, t: 'Post a shift', d: 'Role, day, hours, area and pay. Verified workers nearby can apply straight away.' },
  { icon: 'user' as const, t: 'Pick who works it', d: 'See each applicant’s verification, rating and show-up rate, then pick one.' },
  { icon: 'pin' as const, t: 'Give the PIN, approve the pay', d: 'The worker checks in at your venue; you give them the start PIN. After clock-out you check the hours and pay.' },
];

export function WelcomeScreen({ navigation }: Props) {
  return (
    <View style={styles.screen}>
      <AmbientOrbs />
      <SafeTop />
      <ScrollView contentContainerStyle={styles.content}>
        <FadeUp delay={0}><Logo size={34} /></FadeUp>
        <FadeUp delay={80} style={{ marginTop: 36 }}>
          <Eyebrow color={colors.volt}>Klokd for business</Eyebrow>
          <Text style={styles.h1}>Verified staff for your next shift.</Text>
          <Text style={styles.sub}>Post hospitality shifts in Nairobi, pick from ID-verified workers, and see every shift’s hours and pay in one place.</Text>
        </FadeUp>
        <View style={{ marginTop: 28, gap: 12 }}>
          {STEPS.map((s, i) => {
            const Ico = Icons[s.icon];
            return (
              <FadeUp key={s.t} delay={160 + i * 70}>
                <View style={styles.step}>
                  <View style={styles.stepIcon}><Ico color={colors.volt} size={18} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.stepT}>{s.t}</Text>
                    <Text style={styles.stepD}>{s.d}</Text>
                  </View>
                </View>
              </FadeUp>
            );
          })}
        </View>
        <Text style={styles.note}>Klokd is in early access in Nairobi. M-Pesa funding and payouts switch on when Klokd payments (Kipkiren Pay) go live.</Text>
      </ScrollView>
      <View style={styles.footer}>
        <GradientBtn onPress={() => navigation.navigate('SignIn')}>Get started</GradientBtn>
        <PressScale onPress={() => navigation.navigate('SignIn')} style={styles.signIn}>
          <Text style={styles.signInText}>I already have an account</Text>
        </PressScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  content: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 30 },
  h1: { fontSize: 32, fontWeight: '900', color: colors.white, letterSpacing: -1.3, marginTop: 10, lineHeight: 36 },
  sub: { fontSize: 15, color: colors.white70, lineHeight: 22, marginTop: 12 },
  step: { flexDirection: 'row', gap: 14, padding: 14, borderRadius: 18, backgroundColor: colors.white03, borderWidth: 1, borderColor: colors.white08 },
  stepIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.voltAlpha['10'], alignItems: 'center', justifyContent: 'center' },
  stepT: { fontSize: 15, fontWeight: '900', color: colors.white },
  stepD: { fontSize: 12.5, color: colors.white65, lineHeight: 18, marginTop: 3 },
  note: { fontSize: 11.5, color: colors.white55, lineHeight: 17, marginTop: 22, textAlign: 'center' },
  footer: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 24, gap: 6 },
  signIn: { alignItems: 'center', paddingVertical: 12 },
  signInText: { color: colors.white75, fontSize: 14, fontWeight: '700' },
});
