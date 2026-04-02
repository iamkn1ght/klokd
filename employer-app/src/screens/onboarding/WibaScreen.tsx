import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProgressBar } from '../../components/ProgressBar';
import { GradientButton } from '../../components/GradientButton';
import { colors, typography, spacing, radius } from '../../theme';

type Props = { navigation: NativeStackNavigationProp<any> };

export function WibaScreen({ navigation }: Props) {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
      <ProgressBar currentStep={2} totalSteps={3} onBack={() => navigation.goBack()} />

      <Text style={styles.h}>WIBA & Insurance</Text>
      <Text style={styles.sub}>
        The Work Injury Benefits Act requires employers to have valid insurance before workers can clock in.
      </Text>

      {/* WIBA info */}
      <View style={styles.wibaCard}>
        <Text style={styles.wibaIcon}>🛡️</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.wibaTitle}>Why WIBA matters</Text>
          <Text style={styles.wibaSub}>
            Workers cannot clock in unless your WIBA policy is active and verified. This protects both you and the worker.
          </Text>
        </View>
      </View>

      {/* Mock fields */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Insurance provider</Text>
        <View style={styles.fieldVal}><Text style={styles.fieldText}>Jubilee Insurance</Text></View>
      </View>
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Policy reference</Text>
        <View style={styles.fieldVal}><Text style={styles.fieldText}>POL-2026-WIBA-00142</Text></View>
      </View>
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Policy expiry</Text>
        <View style={styles.fieldVal}><Text style={styles.fieldText}>31 December 2026</Text></View>
      </View>

      {/* Confirmation toggle */}
      <TouchableOpacity
        style={[styles.confirmToggle, confirmed && styles.confirmToggleOn]}
        onPress={() => setConfirmed(!confirmed)}
        activeOpacity={0.7}
      >
        <View style={[styles.checkBox, confirmed && styles.checkBoxOn]}>
          {confirmed && <Text style={styles.checkMark}>✓</Text>}
        </View>
        <Text style={[styles.confirmText, confirmed && { color: colors.ink }]}>
          I confirm this WIBA policy covers all casual workers engaged through Klokd
        </Text>
      </TouchableOpacity>

      <GradientButton
        title={confirmed ? 'Continue →' : 'Confirm WIBA to continue'}
        onPress={() => navigation.navigate('MpesaSetup')}
        disabled={!confirmed}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.mist },
  scrollContent: { padding: spacing.xl, paddingBottom: 40 },
  h: { fontSize: typography.size.h3, fontWeight: '700', color: colors.ink, letterSpacing: -0.02, marginBottom: 4 },
  sub: { fontSize: typography.size.caption, color: colors.mid, lineHeight: 19, marginBottom: 18 },
  wibaCard: {
    backgroundColor: colors.electricAlpha['08'], borderWidth: 1, borderColor: colors.electricAlpha['18'],
    borderRadius: radius.lg, padding: 14, flexDirection: 'row', gap: 12, marginBottom: 18,
  },
  wibaIcon: { fontSize: 24 },
  wibaTitle: { fontSize: typography.size.body, fontWeight: '700', color: colors.ink, marginBottom: 4 },
  wibaSub: { fontSize: typography.size.label, color: colors.mid, lineHeight: 16 },
  field: { marginBottom: 12 },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: colors.mid, marginBottom: 5 },
  fieldVal: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.inkAlpha['10'], borderRadius: radius.md, padding: 12 },
  fieldText: { fontSize: 13.5, fontWeight: '600', color: colors.ink },
  confirmToggle: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14,
    borderRadius: radius.lg, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.soft, marginBottom: 20,
  },
  confirmToggleOn: { borderColor: colors.ink, backgroundColor: colors.electricAlpha['08'] },
  checkBox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: colors.soft, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkBoxOn: { borderColor: colors.ink, backgroundColor: colors.ink },
  checkMark: { color: colors.electric, fontSize: 12, fontWeight: '700' },
  confirmText: { flex: 1, fontSize: typography.size.caption, color: colors.mid, lineHeight: 17 },
});
