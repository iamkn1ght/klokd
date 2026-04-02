import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, typography, radius } from '../theme';

interface Props {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}

export function GradientButton({ title, onPress, disabled, style }: Props) {
  if (disabled) {
    return (
      <TouchableOpacity style={[styles.base, styles.disabled, style]} disabled>
        <Text style={[styles.text, styles.disabledText]}>{title}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={style}>
      <LinearGradient colors={[...gradients.cta]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.base}>
        <Text style={styles.text}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: { width: '100%', paddingVertical: 14, borderRadius: radius.lg, alignItems: 'center' },
  text: { fontSize: typography.size.h4, fontWeight: '700', color: colors.ink },
  disabled: { backgroundColor: colors.soft },
  disabledText: { color: colors.mid },
});
