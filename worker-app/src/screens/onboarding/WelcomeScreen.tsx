/**
 * Welcome screen — Bank-grade ledger metaphor.
 * Ported 1:1 from claude-design/screens/onboarding.jsx
 */
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Logo, GradientBtn, Eyebrow, Label } from '../../components/Primitives';
import { colors, typography } from '../../theme';

type Props = { navigation: NativeStackNavigationProp<any> };

const SLIDES = [
  { kicker: '01 · VERIFIED', head: 'Verified once.\nWork everywhere.', sub: 'One National ID check. Every employer sees the same trusted badge.' },
  { kicker: '02 · INSTANT', head: 'Shifts near you.\nApply in seconds.', sub: 'Real shifts. Real rates. Sorted by distance, always.' },
  { kicker: '03 · PAID', head: 'Clock out.\nM-Pesa pays you.', sub: 'Average 18 minutes from clock-out to cash. No chasing, no WhatsApp.' },
];

const METRICS = [
  { k: '16,412', l: 'shifts paid' },
  { k: '94.2%', l: 'show-up rate' },
  { k: 'KES 1,823', l: 'avg pay/shift' },
  { k: '18 min', l: 'clock-out → M-Pesa' },
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
      {/* ambient glow — omitted on native (uses LinearGradient overlay if needed) */}
      <ScrollView contentContainerStyle={styles.scroll} bounces={false}>
        {/* logo */}
        <View style={styles.logoRow}>
          <Logo size={30} />
        </View>

        {/* content */}
        <View style={styles.content}>
          {/* Metric grid */}
          <View style={styles.metricGrid}>
            {METRICS.map((m, i) => (
              <View key={i} style={styles.metricCard}>
                <Text style={[styles.metricK, { color: i % 2 ? colors.volt : colors.electric }]}>{m.k}</Text>
                <Text style={styles.metricL}>{m.l}</Text>
              </View>
            ))}
          </View>
          <Label color={colors.white30} style={{ marginTop: 4 }}>Live, last 30 days · Nairobi</Label>

          <View style={{ marginTop: 28, marginBottom: 20 }}>
            <Eyebrow color={colors.electric} style={{ marginBottom: 10 }}>{s.kicker}</Eyebrow>
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

          <GradientBtn onPress={() => navigation.navigate('Consent')}>Get started</GradientBtn>
          <TouchableOpacity style={{ marginTop: 14 }}>
            <Text style={styles.signInText}>I already have an account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  scroll: { flexGrow: 1 },
  logoRow: { padding: 28, paddingBottom: 0 },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 36, paddingBottom: 32, justifyContent: 'flex-end' },

  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  metricCard: {
    width: '48%',
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.white03,
    borderWidth: 1,
    borderColor: colors.white06,
  },
  metricK: { fontSize: 14, fontWeight: '900', letterSpacing: -0.28 },
  metricL: {
    fontSize: 9.5,
    color: colors.white45,
    letterSpacing: 0.38,
    textTransform: 'uppercase',
    marginTop: 2,
  },

  headline: {
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -1.2,
    lineHeight: 31,
    color: colors.white,
    marginBottom: 12,
  },
  sub: { fontSize: 13.5, color: colors.white55, lineHeight: 21 },

  dots: { flexDirection: 'row', gap: 4, marginBottom: 16 },
  signInText: { color: colors.white50, fontSize: 13, fontWeight: '500', textAlign: 'center' },
});
