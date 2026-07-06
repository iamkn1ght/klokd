/**
 * Consent screen — Per-data-type tiles with DPA 2019 trust signals.
 * Ported 1:1 from claude-design/screens/onboarding.jsx
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GradientBtn, Eyebrow, StepProgress } from '../../components/Primitives';
import { AmbientOrbs, FadeUp, SafeTop } from '../../components/KlokdLayout';
import { Icons } from '../../components/Icons';
import { colors } from '../../theme';

type Props = { navigation: NativeStackNavigationProp<any> };

const ITEMS = [
  { name: 'National ID', meta: 'Front, back, selfie', use: "Verify it's you. Stored encrypted for 3 years.", who: 'Employers see: verified badge only.', icon: 'id' as const },
  { name: 'Location (GPS)', meta: 'Clock-in only', use: "Proves you're at the venue. Never tracked off-shift.", who: 'Employers see: clock-in confirmed only.', icon: 'pin' as const },
  { name: 'M-Pesa number', meta: 'For payment', use: 'Receive earnings after every shift.', who: 'Employers see: never.', icon: 'mpesa' as const },
  { name: 'Shift history', meta: 'Your reputation', use: 'Builds your rating, show-up rate, portable record.', who: 'Employers see: rating & show-up rate.', icon: 'clock' as const },
];

function ConsentToggle({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.toggleRow, on ? styles.toggleOn : styles.toggleOff]}
    >
      <Text style={[styles.toggleLabel, { color: on ? colors.white : colors.white65 }]}>{label}</Text>
      <View style={[styles.toggleTrack, { backgroundColor: on ? colors.electric : colors.white10 }]}>
        <View style={[styles.toggleThumb, { transform: [{ translateX: on ? 16 : 0 }] }]} />
      </View>
    </TouchableOpacity>
  );
}

function OnbHeader({ step, onBack }: { step: number; onBack?: () => void }) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Icons.back color={colors.white} size={14} />
        </TouchableOpacity>
      ) : <View style={{ width: 34 }} />}
      <View style={{ flex: 1 }}>
        <StepProgress step={step} total={5} />
      </View>
      <View style={{ width: 34 }} />
    </View>
  );
}

export function ConsentScreen({ navigation }: Props) {
  const [idOK, setIdOK] = useState(false);
  const [gpsOK, setGpsOK] = useState(false);
  const ready = idOK && gpsOK;

  return (
    <View style={styles.screen}>
      <AmbientOrbs intensity="subtle" />
      <SafeTop />
      <OnbHeader step={1} onBack={() => navigation.goBack()} />
      <FadeUp delay={0} style={styles.titleBlock}>
        <Eyebrow color={colors.white40} style={{ marginBottom: 8 }}>Step 2 of 5 · Your data</Eyebrow>
        <Text style={styles.h2}>Before we start — here's exactly what we collect.</Text>
        <Text style={styles.sub}>No surprises. No selling your data. DPA 2019 compliant.</Text>
      </FadeUp>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
        <View style={{ gap: 8 }}>
          {ITEMS.map((it, i) => {
            const Ico = Icons[it.icon];
            return (
              <FadeUp key={i} delay={120 + i * 80}>
                <View style={styles.itemCard}>
                  <View style={{ flexDirection: 'row', gap: 11, alignItems: 'flex-start' }}>
                    <View style={styles.itemIcon}>
                      <Ico color={colors.electric} size={18} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.itemTop}>
                        <Text style={styles.itemName}>{it.name}</Text>
                        <Text style={styles.itemMeta}>{it.meta}</Text>
                      </View>
                      <Text style={styles.itemUse}>{it.use}</Text>
                      <Text style={styles.itemWho}>{it.who}</Text>
                    </View>
                  </View>
                </View>
              </FadeUp>
            );
          })}
        </View>

        <FadeUp delay={500} style={styles.agreeBox}>
          <Eyebrow style={{ marginBottom: 10 }}>I agree to share</Eyebrow>
          <ConsentToggle label="My identity documents" on={idOK} onPress={() => setIdOK(!idOK)} />
          <View style={{ height: 8 }} />
          <ConsentToggle label="My GPS at clock-in" on={gpsOK} onPress={() => setGpsOK(!gpsOK)} />
        </FadeUp>

        <FadeUp delay={580}>
          <Text style={styles.legal}>
            By continuing, you agree to our{' '}
            <Text style={styles.link}>Privacy Policy</Text> and{' '}
            <Text style={styles.link}>Terms</Text>. You can change your consent any time in Me → Privacy.
          </Text>
        </FadeUp>
      </ScrollView>

      <View style={styles.footer}>
        <GradientBtn disabled={!ready} onPress={() => navigation.navigate('VerifyID')}>
          {ready ? 'Continue' : 'Agree to both to continue'}
        </GradientBtn>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  header: { paddingHorizontal: 18, paddingTop: 12, flexDirection: 'row', alignItems: 'center', gap: 14 },
  backBtn: {
    width: 34, height: 34, borderRadius: 17,
    borderWidth: 0.5, borderColor: colors.white12,
    backgroundColor: colors.white04,
    alignItems: 'center', justifyContent: 'center',
  },
  titleBlock: { paddingHorizontal: 22, paddingTop: 20 },
  h2: { fontSize: 25, fontWeight: '900', letterSpacing: -0.8, lineHeight: 29, color: colors.white, marginBottom: 8 },
  sub: { fontSize: 13.5, color: colors.white50, lineHeight: 20 },

  scrollContent: { paddingHorizontal: 22, paddingTop: 18, paddingBottom: 20 },

  itemCard: {
    padding: 13,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderWidth: 1,
    borderColor: colors.white06,
  },
  itemIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: colors.electricAlpha['10'],
    alignItems: 'center', justifyContent: 'center',
  },
  itemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 2 },
  itemName: { fontSize: 13, fontWeight: '700', color: colors.white },
  itemMeta: { fontSize: 9.5, color: colors.white40, letterSpacing: 0.38, textTransform: 'uppercase' },
  itemUse: { fontSize: 11, color: colors.white55, lineHeight: 16.5, marginBottom: 4 },
  itemWho: { fontSize: 10, color: colors.electric, fontWeight: '600' },

  agreeBox: {
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(0,229,160,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(0,229,160,0.2)',
  },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1,
  },
  toggleOn: { backgroundColor: 'rgba(0,229,160,0.08)', borderColor: colors.electricAlpha['30'] },
  toggleOff: { backgroundColor: colors.white02, borderColor: colors.white06 },
  toggleLabel: { fontSize: 12.5, fontWeight: '600' },
  toggleTrack: { width: 36, height: 20, borderRadius: 999, padding: 2 },
  toggleThumb: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.white },

  legal: { fontSize: 10.5, color: colors.white35, lineHeight: 16.3, marginTop: 10, marginBottom: 4 },
  link: { color: colors.electric, textDecorationLine: 'underline' },

  footer: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 20, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.white06 },
});
