import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing } from '../theme';

interface Props { currentStep: number; totalSteps: number; onBack?: () => void }

export function ProgressBar({ currentStep, totalSteps, onBack }: Props) {
  return (
    <View style={styles.container}>
      {onBack && (
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
      )}
      <View style={styles.track}>
        {Array.from({ length: totalSteps }, (_, i) => (
          <View key={i} style={[styles.segment, { backgroundColor: i < currentStep ? colors.ink : colors.soft }]} />
        ))}
      </View>
      <Text style={styles.stepLabel}>Step {currentStep} of {totalSteps}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xl },
  backBtn: {
    width: 34, height: 34, borderRadius: 17, borderWidth: 0.5, borderColor: colors.soft,
    backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2,
  },
  backArrow: { color: colors.mid, fontSize: 18, fontWeight: '600', marginTop: -2 },
  track: { flex: 1, flexDirection: 'row', gap: 4 },
  segment: { flex: 1, height: 3, borderRadius: 999 },
  stepLabel: { fontSize: 10, color: colors.mid, letterSpacing: 0.5 },
});
