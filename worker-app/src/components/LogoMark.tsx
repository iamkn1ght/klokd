import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients } from '../theme';

interface Props {
  size?: number;
  showText?: boolean;
}

export function LogoMark({ size = 30, showText = true }: Props) {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[...gradients.logo]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.mark, { width: size, height: size, borderRadius: size * 0.28 }]}
      >
        <Text style={[styles.letter, { fontSize: size * 0.44 }]}>K</Text>
      </LinearGradient>
      {showText && <Text style={[styles.wordmark, { fontSize: size * 0.52 }]}>klokd</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mark: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    color: colors.ink,
    fontWeight: '900',
    letterSpacing: -0.04,
  },
  wordmark: {
    color: '#fff',
    fontWeight: '900',
    letterSpacing: -0.05,
  },
});
