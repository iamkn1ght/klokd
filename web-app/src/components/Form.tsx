/**
 * Form primitives for the workspace screens — labelled text field, choice
 * chip, and an inline notice. Same glass language as the sign-in inputs.
 */
import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, TextInputProps } from 'react-native';
import { colors, spacing, radius } from '../theme';

export function Field({
  label,
  hint,
  error,
  style,
  ...input
}: TextInputProps & { label: string; hint?: string; error?: string | null; style?: any }) {
  const [focused, setFocused] = React.useState(false);
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.white35}
        {...input}
        accessibilityLabel={label}
        onFocus={e => {
          setFocused(true);
          input.onFocus?.(e);
        }}
        onBlur={e => {
          setFocused(false);
          input.onBlur?.(e);
        }}
        style={[styles.input, focused && styles.inputFocus, !!error && styles.inputErr]}
      />
      {error ? <Text style={styles.err}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Chip({
  children,
  active,
  onPress,
}: {
  children: React.ReactNode;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      style={({ hovered }: any) => [styles.chip, hovered && !active && styles.chipHover, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{children}</Text>
    </Pressable>
  );
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'err' | 'ok'; children: React.ReactNode }) {
  const t =
    tone === 'err'
      ? { bg: colors.errAlpha['06'], border: colors.errAlpha['20'], fg: colors.error }
      : tone === 'ok'
        ? { bg: colors.electricAlpha['06'], border: colors.electricAlpha['25'], fg: colors.electric }
        : { bg: colors.white03, border: colors.white10, fg: colors.white70 };
  return (
    <View style={[styles.notice, { backgroundColor: t.bg, borderColor: t.border }]}>
      <Text style={[styles.noticeText, { color: t.fg }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: spacing.lg },
  label: { color: colors.white45, fontSize: 10, fontWeight: '900', letterSpacing: 0.9, marginBottom: 6, textTransform: 'uppercase' },
  input: {
    backgroundColor: colors.ink,
    borderColor: colors.white12,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
    outlineStyle: 'none',
  } as any,
  inputFocus: { borderColor: colors.electricAlpha['50'] },
  inputErr: { borderColor: colors.errAlpha['20'] },
  hint: { color: colors.white50, fontSize: 11.5, marginTop: 6, lineHeight: 16 },
  err: { color: colors.error, fontSize: 11.5, marginTop: 6, fontWeight: '600' },

  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.white12,
    backgroundColor: colors.white03,
  },
  chipHover: { borderColor: colors.white25, backgroundColor: colors.white06 },
  chipActive: { borderColor: colors.electricAlpha['50'], backgroundColor: colors.electricAlpha['12'] },
  chipText: { color: colors.white75, fontSize: 13, fontWeight: '700' },
  chipTextActive: { color: colors.electric },

  notice: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 10, marginBottom: spacing.lg },
  noticeText: { fontSize: 12.5, lineHeight: 18, fontWeight: '600' },
});
