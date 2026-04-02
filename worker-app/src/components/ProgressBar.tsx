import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing } from '../theme';

interface Props {
  currentStep: number;
  totalSteps: number;
  onBack?: () => void;
}

export function ProgressBar({ currentStep, totalSteps, onBack }: Props) {
  return (
    <View style={styles.container}>
      {onBack && (
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backArrow}>{'‹'}</Text>
        </TouchableOpacity>
      )}
      <View style={styles.track}>
        {Array.from({ length: totalSteps }, (_, i) => (
          <View
            key={i}
            style={[
              styles.segment,
              { backgroundColor: i < currentStep ? colors.electric : colors.white10 },
            ]}
          />
        ))}
      </View>
      <Text style={styles.stepLabel}>
        Step {currentStep} of {totalSteps}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 0.5,
    borderColor: colors.white10,
    backgroundColor: colors.white05,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    color: colors.white50,
    fontSize: 18,
    fontWeight: '600',
    marginTop: -2,
  },
  track: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  segment: {
    flex: 1,
    height: 3,
    borderRadius: 999,
  },
  stepLabel: {
    fontSize: 10,
    color: colors.white25,
    letterSpacing: 0.5,
  },
});
