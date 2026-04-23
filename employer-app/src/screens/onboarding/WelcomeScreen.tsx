/**
 * Employer Welcome — Live filling tracker + For Employers badge.
 * Ported 1:1 from claude-design/screens/employer-onboarding.jsx (EmpWelcome)
 */
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Logo, GradientBtn, Eyebrow, Label } from '../../components/Primitives';
import { colors } from '../../theme';

type Props = { navigation: NativeStackNavigationProp<any> };

const SLIDES = [
  { kicker: '01 · VERIFIED POOL', head: 'The shift fills\nbefore you sleep.', sub: 'Average 11 minutes from post to confirmed. Every worker is National ID-verified.' },
  { kicker: '02 · SAFE ESCROW', head: 'Fund once.\nRelease on clock-out.', sub: 'Your M-Pesa holds the KES. It only releases when the shift is done — and you can approve.' },
  { kicker: '03 · YOUR TEAM', head: 'Build a trusted\npool of regulars.', sub: 'Workers who show up earn a spot. Invite back with one tap.' },
];

const METRICS = [
  { k: '11 min', l: 'avg fill time', c: colors.electric },
  { k: '284', l: 'shifts open now', c: colors.volt },
  { k: '2,847', l: 'verified workers', c: colors.white },
  { k: '96.1%', l: 'show-up rate', c: colors.electric },
];

export function WelcomeScreen({ navigation }: Props) {
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setSlide(s => (s + 1) % 3), 3800);
    return () => clearTimeout(t);
  }, [slide]);

  const s = SLIDES[slide];

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} bounces={false}>
        <View style={styles.topRow}>
          <Logo size={30} />
          <View style={styles.forEmpBadge}>
            <Text style={styles.forEmpText}>FOR EMPLOYERS</Text>
          </View>
        </View>

        <View style={styles.content}>
          {/* Live tracker card */}
          <View style={styles.tracker}>
            <View style={styles.trackerHead}>
              <Label color={colors.white40}>Live · Nairobi · tonight</Label>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            </View>
            <View style={styles.metricGrid}>
              {METRICS.map((m, i) => (
                <View key={i} style={styles.metricCard}>
                  <Text style={[styles.metricK, { color: m.c }]}>{m.k}</Text>
                  <Text style={styles.metricL}>{m.l}</Text>
                </View>
              ))}
            </View>
          </View>
          <Label color={colors.white30} style={{ marginTop: 10 }}>2,431 businesses fill shifts with Klokd</Label>

          <View style={{ marginTop: 36, marginBottom: 20 }}>
            <Eyebrow color={colors.volt} style={{ marginBottom: 10 }}>{s.kicker}</Eyebrow>
            <Text style={styles.headline}>{s.head}</Text>
            <Text style={styles.sub}>{s.sub}</Text>
          </View>

          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setSlide(i)}
                style={{
                  flex: i === slide ? 2 : 1,
                  height: 3,
                  borderRadius: 999,
                  backgroundColor: i === slide ? colors.electric : colors.white12,
                }}
              />
            ))}
          </View>

          <GradientBtn onPress={() => navigation.navigate('BusinessVerify')}>Set up my business</GradientBtn>
          <View style={{ marginTop: 12, alignItems: 'center' }}>
            <Text style={styles.signIn}>
              Already have an account? <Text style={{ color: colors.electric, fontWeight: '700' }}>Sign in</Text>
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  topRow: { padding: 28, paddingBottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  forEmpBadge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, backgroundColor: 'rgba(188,255,78,0.1)' },
  forEmpText: { color: colors.volt, fontSize: 9.5, fontWeight: '800', letterSpacing: 1.14 },

  content: { flex: 1, paddingHorizontal: 24, paddingTop: 36, paddingBottom: 32, justifyContent: 'flex-end' },

  tracker: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.white03,
    borderWidth: 1, borderColor: colors.white06,
  },
  trackerHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  liveDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.electric },
  liveText: { fontSize: 9.5, color: colors.electric, fontWeight: '700', letterSpacing: 0.95 },

  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metricCard: {
    width: '48%',
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.white02,
    borderWidth: 1, borderColor: colors.white05,
  },
  metricK: { fontSize: 14, fontWeight: '900', letterSpacing: -0.28 },
  metricL: { fontSize: 9.5, color: colors.white45, letterSpacing: 0.38, textTransform: 'uppercase', marginTop: 2 },

  headline: { fontSize: 28, fontWeight: '900', letterSpacing: -1.12, lineHeight: 29, color: colors.white, marginBottom: 10 },
  sub: { fontSize: 13, color: colors.white55, lineHeight: 20.15 },

  dots: { flexDirection: 'row', gap: 4, marginBottom: 14 },
  signIn: { fontSize: 11.5, color: colors.white50 },
});
