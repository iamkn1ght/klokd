import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GradientButton } from '../../components/GradientButton';
import { colors, typography, spacing, radius } from '../../theme';

type Props = { navigation: NativeStackNavigationProp<any> };

const ROLES = ['Waiter', 'Barista', 'Chef', 'Cashier', 'Security', 'Cleaner'];

export function PostShiftScreen({ navigation }: Props) {
  const [selectedRole, setSelectedRole] = useState('Waiter');
  const [rate, setRate] = useState(1800);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
      {/* Back + title */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Post a shift</Text>
      </View>

      {/* Role */}
      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Role</Text>
        <View style={styles.chipWrap}>
          {ROLES.map(role => (
            <TouchableOpacity
              key={role}
              style={[styles.chip, selectedRole === role ? styles.chipOn : styles.chipOff]}
              onPress={() => setSelectedRole(role)}
            >
              <Text style={[styles.chipText, selectedRole === role ? styles.chipTextOn : styles.chipTextOff]}>
                {role}
              </Text>
            </TouchableOpacity>
          ))}
          <View style={[styles.chip, styles.chipMore]}><Text style={styles.chipMoreText}>+ More</Text></View>
        </View>
      </View>

      {/* Date / Time */}
      <View style={styles.gridRow}>
        <View style={styles.gridCard}>
          <Text style={styles.fieldLabel}>Date</Text>
          <Text style={styles.gridValue}>Today</Text>
        </View>
        <View style={styles.gridCard}>
          <Text style={styles.fieldLabel}>Time</Text>
          <Text style={styles.gridValue}>5pm – 10pm</Text>
        </View>
      </View>

      {/* Rate stepper */}
      <View style={styles.rateCard}>
        <View>
          <Text style={styles.fieldLabel}>Rate</Text>
          <Text style={styles.rateValue}>KES {rate.toLocaleString()}</Text>
        </View>
        <View style={styles.stepperRow}>
          <TouchableOpacity
            style={styles.stepperBtn}
            onPress={() => setRate(prev => Math.max(500, prev - 100))}
          >
            <Text style={styles.stepperText}>−</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.stepperBtnPlus}
            onPress={() => setRate(prev => prev + 100)}
          >
            <Text style={styles.stepperPlusText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Rate intelligence strip */}
      <View style={styles.rateIntel}>
        <Text style={styles.rateIntelTitle}>Suggested rate</Text>
        <Text style={styles.rateIntelSub}>KES 1,500–1,900 for waiters in Westlands</Text>
      </View>

      <GradientButton title="Find workers" onPress={() => navigation.navigate('SelectWorker')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.mist },
  scrollContent: { padding: spacing.lg, paddingBottom: 40 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  backBtn: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 0.5, borderColor: colors.inkAlpha['32'],
    alignItems: 'center', justifyContent: 'center',
  },
  backArrow: { color: colors.ink, fontSize: 14, marginTop: -1 },
  title: { fontSize: typography.size.body, fontWeight: '700', color: colors.ink, letterSpacing: -0.02 },

  card: { backgroundColor: colors.white, borderRadius: radius.md, padding: 10, marginBottom: 8, borderWidth: 0.5, borderColor: colors.soft },
  fieldLabel: { fontSize: typography.size.nano, color: colors.mid, marginBottom: 4 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  chipOn: { backgroundColor: colors.ink },
  chipOff: { backgroundColor: colors.mist, borderWidth: 0.5, borderColor: colors.soft },
  chipText: { fontSize: 10, fontWeight: '600' },
  chipTextOn: { color: colors.electric },
  chipTextOff: { color: colors.mid },
  chipMore: { backgroundColor: colors.mist, borderWidth: 0.5, borderColor: colors.soft },
  chipMoreText: { fontSize: 10, color: colors.mid },

  gridRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  gridCard: { flex: 1, backgroundColor: colors.white, borderRadius: radius.md, padding: 10, borderWidth: 0.5, borderColor: colors.soft },
  gridValue: { fontSize: 12, fontWeight: '600', color: colors.ink },

  rateCard: {
    backgroundColor: colors.white, borderRadius: radius.md, padding: 10, marginBottom: 8,
    borderWidth: 0.5, borderColor: colors.soft, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  rateValue: { fontSize: typography.size.h4, fontWeight: '700', color: colors.ink },
  stepperRow: { flexDirection: 'row', gap: 4 },
  stepperBtn: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 0.5, borderColor: colors.soft,
    alignItems: 'center', justifyContent: 'center',
  },
  stepperText: { fontSize: 14, color: colors.mid, fontWeight: '300' },
  stepperBtnPlus: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: colors.ink,
    alignItems: 'center', justifyContent: 'center',
  },
  stepperPlusText: { fontSize: 14, color: colors.electric, fontWeight: '300' },

  rateIntel: {
    backgroundColor: colors.electricAlpha['10'], borderRadius: 10, padding: 8, paddingLeft: 10,
    borderLeftWidth: 2, borderLeftColor: colors.electric, marginBottom: 12,
  },
  rateIntelTitle: { fontSize: typography.size.nano, color: '#00A870', fontWeight: '600', marginBottom: 1 },
  rateIntelSub: { fontSize: typography.size.nano, color: colors.mid },
});
