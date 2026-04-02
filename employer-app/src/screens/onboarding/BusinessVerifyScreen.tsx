import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProgressBar } from '../../components/ProgressBar';
import { GradientButton } from '../../components/GradientButton';
import { colors, typography, spacing, radius } from '../../theme';

type Props = { navigation: NativeStackNavigationProp<any> };

const FIELDS = [
  { label: 'Business name', value: 'The Brew Bistro', hint: '' },
  { label: 'KRA PIN', value: 'P051234567A', hint: 'Required to activate your escrow account' },
  { label: 'Contact person', value: 'David Kamau', hint: '' },
];

const ESCROW_STEPS = [
  'You pre-fund the shift before it begins',
  'Klokd holds funds securely — untouchable until completion',
  'Auto-released to the worker 30 min after clock-out',
];

export function BusinessVerifyScreen({ navigation }: Props) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
      <ProgressBar currentStep={2} totalSteps={3} onBack={() => navigation.goBack()} />

      <Text style={styles.h}>Tell us about your business</Text>
      <Text style={styles.sub}>This activates your escrow account and verifies you as an employer on Klokd.</Text>

      {FIELDS.map(f => (
        <View key={f.label} style={styles.field}>
          <Text style={styles.fieldLabel}>{f.label}</Text>
          <View style={styles.fieldVal}><Text style={styles.fieldText}>{f.value}</Text></View>
          {f.hint ? <Text style={styles.fieldHint}>{f.hint}</Text> : null}
        </View>
      ))}

      {/* Escrow explainer */}
      <View style={styles.escrowCard}>
        <Text style={styles.escrowLabel}>WHAT IS ESCROW?</Text>
        {ESCROW_STEPS.map((step, i) => (
          <View key={i} style={styles.escrowStep}>
            <View style={styles.escrowNum}>
              <Text style={styles.escrowNumText}>{i + 1}</Text>
            </View>
            <Text style={styles.escrowText}>{step}</Text>
          </View>
        ))}
      </View>

      <GradientButton title="Continue →" onPress={() => navigation.navigate('WibaDeclaration')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.mist },
  scrollContent: { padding: spacing.xl, paddingBottom: 40 },
  h: { fontSize: typography.size.h3, fontWeight: '700', color: colors.ink, letterSpacing: -0.02, marginBottom: 4 },
  sub: { fontSize: typography.size.caption, color: colors.mid, lineHeight: 19, marginBottom: 18 },
  field: { marginBottom: 12 },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: colors.mid, marginBottom: 5, letterSpacing: 0.4 },
  fieldVal: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.inkAlpha['10'], borderRadius: radius.md, padding: 12 },
  fieldText: { fontSize: 13.5, fontWeight: '600', color: colors.ink },
  fieldHint: { fontSize: 10, color: colors.mid, marginTop: 4, lineHeight: 15 },
  escrowCard: {
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.soft,
    borderLeftWidth: 3, borderLeftColor: colors.electric,
    borderRadius: radius.lg, borderTopLeftRadius: 0, borderBottomLeftRadius: 0,
    padding: 14, marginBottom: 20,
  },
  escrowLabel: { fontSize: typography.size.micro, fontWeight: '700', letterSpacing: 1.2, color: colors.electric, marginBottom: 10 },
  escrowStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 9 },
  escrowNum: {
    width: 19, height: 19, borderRadius: 10, backgroundColor: colors.electricAlpha['13'],
    borderWidth: 1, borderColor: colors.electricAlpha['28'], alignItems: 'center', justifyContent: 'center',
  },
  escrowNumText: { fontSize: 10, fontWeight: '700', color: colors.electric },
  escrowText: { flex: 1, fontSize: typography.size.caption, color: colors.mid, lineHeight: 17 },
});
