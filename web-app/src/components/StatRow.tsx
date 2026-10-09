/**
 * StatRow — summary tiles that always sit side by side in one row, from a
 * 320 px phone to a desktop. On narrow screens the tiles compact (smaller
 * number, two-line label) instead of stacking.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { colors, spacing, radius } from '../theme';

export interface Stat {
  k: string;
  l: string;
  tone?: string;
  onPress?: () => void;
}

export function StatRow({ items }: { items: Stat[] }) {
  const { width } = useWindowDimensions();
  const compact = width < 700;
  const tiny = width < 400 && items.length >= 4;
  return (
    <View style={[styles.row, compact && { gap: spacing.sm }]}>
      {items.map(s => {
        const body = (
          <>
            <Text
              style={[styles.k, compact && styles.kCompact, tiny && styles.kTiny, s.tone ? { color: s.tone } : null]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {s.k}
            </Text>
            <Text style={[styles.l, compact && styles.lCompact]} numberOfLines={compact ? 3 : 2}>
              {s.l}
            </Text>
          </>
        );
        const tileStyle = [styles.tile, compact && styles.tileCompact];
        return s.onPress ? (
          <Pressable
            key={s.l}
            onPress={s.onPress}
            accessibilityRole="link"
            style={({ hovered }: any) => [tileStyle, hovered && styles.tileHover]}
          >
            {body}
          </Pressable>
        ) : (
          <View key={s.l} style={tileStyle}>
            {body}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'stretch' },
  tile: {
    flex: 1,
    minWidth: 0,
    padding: spacing.lg,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.white10,
    backgroundColor: 'rgba(255,255,255,0.045)',
  },
  tileCompact: { paddingHorizontal: 10, paddingVertical: 12, borderRadius: radius.lg },
  tileHover: { borderColor: 'rgba(0,229,160,0.45)', backgroundColor: 'rgba(255,255,255,0.07)' },
  k: { color: colors.white, fontSize: 26, fontWeight: '900', letterSpacing: -1 },
  kCompact: { fontSize: 20, letterSpacing: -0.6 },
  kTiny: { fontSize: 18 },
  l: { color: colors.white60, fontSize: 11.5, fontWeight: '700', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.3 },
  lCompact: { fontSize: 9.5, letterSpacing: 0.2, lineHeight: 12, marginTop: 3 },
});
