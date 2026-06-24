/**
 * Placeholder for tabs whose full content is in the native worker / employer
 * apps and hasn't been ported to the unified web yet.
 *
 * Intentionally honest about what's shipped: a brief preview of what the
 * full tab does + a link to the native experience for now. Beats a "Coming
 * soon" page with no content.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GlassCard, FadeUp } from '../components/KlokdLayout';
import { Eyebrow } from '../components/Primitives';
import { colors, spacing } from '../theme';

export function PlaceholderTab({
  eyebrow,
  title,
  summary,
  bullets,
  nativeUrl,
}: {
  eyebrow: string;
  title: string;
  summary: string;
  bullets: string[];
  nativeUrl?: string;
}) {
  return (
    <View>
      <FadeUp delay={0}>
        <GlassCard variant="raised" padding={spacing.xxl}>
          <Eyebrow color={colors.electric}>{eyebrow}</Eyebrow>
          <Text style={styles.h1}>{title}</Text>
          <Text style={styles.sub}>{summary}</Text>

          <View style={styles.bullets}>
            {bullets.map((b, i) => (
              <View key={i} style={styles.bulletRow}>
                <View style={styles.dot} />
                <Text style={styles.bulletText}>{b}</Text>
              </View>
            ))}
          </View>

          {nativeUrl && (
            <View style={styles.foot}>
              <Text style={styles.footLabel}>WHILE WE FINISH WEB</Text>
              <Text style={styles.footValue}>{nativeUrl}</Text>
              <Text style={styles.footHint}>Full mobile experience available now on the native app.</Text>
            </View>
          )}
        </GlassCard>
      </FadeUp>
    </View>
  );
}

const styles = StyleSheet.create({
  h1: { color: colors.white, fontSize: 30, fontWeight: '900', letterSpacing: -1.2, marginTop: 8, marginBottom: 6 },
  sub: { color: colors.white65, fontSize: 14.5, lineHeight: 21, marginBottom: spacing.xl, maxWidth: 580 },
  bullets: { gap: 10, marginBottom: spacing.xl },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 6, height: 6, borderRadius: 4, backgroundColor: colors.electric },
  bulletText: { color: colors.white75, fontSize: 13.5, fontWeight: '600' },
  foot: { paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.white06 },
  footLabel: { color: colors.white45, fontSize: 10, fontWeight: '900', letterSpacing: 0.7 },
  footValue: { color: colors.electric, fontSize: 14, fontWeight: '800', marginTop: 6 },
  footHint: { color: colors.white50, fontSize: 11.5, marginTop: 4 },
});
