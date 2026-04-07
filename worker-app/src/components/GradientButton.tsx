import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, radius } from '../theme';

interface Props {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}

export function GradientButton({ title, onPress, disabled = false, style }: Props) {
  if (disabled) {
    return (
      <View style={style}>
        <TouchableOpacity style={styles.disabledBase} disabled={true} activeOpacity={1}>
          <Text style={styles.disabledText}>{title}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={style}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        <LinearGradient
          colors={[gradients.cta[0], gradients.cta[1]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.base}
        >
          <Text style={styles.text}>{title}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  text: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
  },
  disabledBase: {
    paddingVertical: 14,
    borderRadius: radius.lg,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  disabledText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.25)',
  },
});
