/**
 * Skills screen — 12 roles + optional certificate upload + KES 300 more nudge.
 * Ported 1:1 from claude-design/screens/onboarding.jsx
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Chip, GradientBtn, Eyebrow, Label, StepProgress } from '../../components/Primitives';
import { AmbientOrbs, FadeUp, SafeTop } from '../../components/KlokdLayout';
import { Icons } from '../../components/Icons';
import { useApi } from '../../hooks/useApi';
import { colors } from '../../theme';

type Props = { navigation: NativeStackNavigationProp<any> };

const ROLES = [
  'Waiter', 'Barista', 'Chef', 'Cashier', 'Security', 'Cleaner',
  'Receptionist', 'Bartender', 'Dishwasher', 'Kitchen Porter', 'Host/Hostess', 'Housekeeper',
];

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

export function SkillsScreen({ navigation }: Props) {
  const { put } = useApi();
  const [picked, setPicked] = useState<Set<string>>(new Set(['Waiter']));
  const [loading, setLoading] = useState(false);

  const toggle = (r: string) => {
    setPicked(p => {
      const n = new Set(p);
      n.has(r) ? n.delete(r) : n.add(r);
      return n;
    });
  };

  const ready = picked.size > 0;

  const handleContinue = async () => {
    setLoading(true);
    try {
      await put('/identity/workers/profile', {
        firstName: 'User', lastName: 'Name',
        skills: Array.from(picked),
      });
    } catch {}
    setLoading(false);
    navigation.navigate('MpesaSetup');
  };

  return (
    <View style={styles.screen}>
      <AmbientOrbs intensity="subtle" />
      <SafeTop />
      <OnbHeader step={3} onBack={() => navigation.goBack()} />

      <FadeUp delay={0} style={styles.titleBlock}>
        <Eyebrow color={colors.white40} style={{ marginBottom: 8 }}>Step 4 of 5 · Your skills</Eyebrow>
        <Text style={styles.h2}>What work do you do?</Text>
        <Text style={styles.sub}>Pick everything you can do. You'll only see shifts that match.</Text>
      </FadeUp>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
        <FadeUp delay={120}>
          <Label style={{ marginBottom: 10 }}>Hospitality roles · pick any</Label>
          <View style={styles.chipWrap}>
            {ROLES.map(r => (
              <Chip key={r} active={picked.has(r)} onPress={() => toggle(r)}>{r}</Chip>
            ))}
            <Chip onPress={() => {}}>+ Other</Chip>
          </View>
        </FadeUp>

        <FadeUp delay={220} style={styles.certBox}>
          <View style={styles.certHeader}>
            <Label color={colors.white55}>Certificates · optional</Label>
            <Text style={styles.certHeaderSub}>PDF or photo · 5MB max</Text>
          </View>
          <Text style={styles.certDesc}>Food handlers cert, bartending course, first aid — employers pay more for certified workers.</Text>
          <TouchableOpacity style={styles.uploadBtn} activeOpacity={0.7}>
            <Icons.upload color={colors.white55} size={14} />
            <Text style={styles.uploadBtnText}>Upload a certificate</Text>
          </TouchableOpacity>
        </FadeUp>

        <FadeUp delay={320} style={styles.nudge}>
          <View style={styles.nudgeIcon}>
            <Icons.star color={colors.volt} size={12} />
          </View>
          <Text style={styles.nudgeText}>Certified workers earn ~KES 300 more per shift, on average.</Text>
        </FadeUp>
      </ScrollView>

      <View style={styles.footer}>
        <GradientBtn disabled={!ready || loading} onPress={handleContinue}>
          {ready ? (loading ? 'Saving…' : `Continue · ${picked.size} skill${picked.size > 1 ? 's' : ''}`) : 'Pick at least one'}
        </GradientBtn>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  header: { paddingHorizontal: 18, paddingTop: 12, flexDirection: 'row', alignItems: 'center', gap: 14 },
  backBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 0.5, borderColor: colors.white12, backgroundColor: colors.white04, alignItems: 'center', justifyContent: 'center' },
  titleBlock: { paddingHorizontal: 22, paddingTop: 20 },
  h2: { fontSize: 25, fontWeight: '900', letterSpacing: -0.8, lineHeight: 29, color: colors.white, marginBottom: 8 },
  sub: { fontSize: 13.5, color: colors.white50, lineHeight: 20 },

  scrollContent: { paddingHorizontal: 22, paddingTop: 18, paddingBottom: 20 },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },

  certBox: {
    marginTop: 22,
    padding: 13,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderWidth: 1, borderColor: colors.white06,
  },
  certHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  certHeaderSub: { fontSize: 10, color: colors.white35 },
  certDesc: { fontSize: 11.5, color: colors.white50, lineHeight: 17.25, marginBottom: 10 },
  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 11, borderRadius: 11,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.white12,
    backgroundColor: colors.white02,
  },
  uploadBtnText: { fontSize: 12, color: colors.white55, fontWeight: '600' },

  nudge: {
    marginTop: 14,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(188,255,78,0.04)',
    borderWidth: 1, borderColor: colors.voltAlpha['18'],
  },
  nudgeIcon: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(188,255,78,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  nudgeText: { flex: 1, fontSize: 10.5, color: colors.volt, fontWeight: '600', lineHeight: 15.2 },

  footer: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 20, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.white06 },
});
