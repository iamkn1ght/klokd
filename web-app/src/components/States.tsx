/**
 * Shared async-state primitives — skeleton loaders, error-with-retry, and
 * empty states in the Klokd glass language. Feed screens compose these so
 * no surface ever shows a bare "Loading…" or an unexplained blank.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Easing } from 'react-native';
import { colors, spacing, radius } from '../theme';

/** Shimmering bar — the skeleton building block. */
export function Skeleton({
  width,
  height = 14,
  radius: r = 7,
  style,
}: {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: any;
}) {
  const shimmer = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 0.12, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0.35, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    ).start();
  }, [shimmer]);
  return (
    <Animated.View
      style={[
        {
          width: width ?? '100%',
          height,
          borderRadius: r,
          backgroundColor: colors.white,
          opacity: shimmer,
        },
        style,
      ]}
    />
  );
}

/** Card-shaped placeholder matching the shift-row geometry. */
export function ShiftCardSkeleton() {
  return (
    <View style={styles.shiftCard}>
      <View style={styles.shiftLeft}>
        <Skeleton width={130} height={16} style={{ marginBottom: 8 }} />
        <Skeleton width={190} height={12} style={{ marginBottom: 8 }} />
        <Skeleton width={220} height={11} />
      </View>
      <View style={styles.shiftRight}>
        <Skeleton width={90} height={18} style={{ marginBottom: 10 }} />
        <Skeleton width={70} height={26} radius={8} />
      </View>
    </View>
  );
}

/** Error state with retry — used when the live feed can't be reached. */
export function ErrorState({
  title = 'Couldn’t load the feed.',
  detail = 'Klokd API didn’t answer. Check your connection and retry.',
  onRetry,
  retrying,
}: {
  title?: string;
  detail?: string;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  return (
    <View style={styles.stateCard}>
      <View style={styles.stateIconErr}>
        <Text style={styles.stateIconText}>!</Text>
      </View>
      <Text style={styles.stateH}>{title}</Text>
      <Text style={styles.stateP}>{detail}</Text>
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          disabled={retrying}
          style={({ hovered }: any) => [styles.retryBtn, hovered && { backgroundColor: 'rgba(0,229,160,0.16)' }]}
        >
          <Text style={styles.retryText}>{retrying ? 'Retrying…' : 'Retry'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Empty state — zero rows after a successful load. */
export function EmptyState({
  title,
  detail,
}: {
  title: string;
  detail?: string;
}) {
  return (
    <View style={styles.stateCard}>
      <View style={styles.stateIconEmpty}>
        <Text style={styles.stateIconText}>○</Text>
      </View>
      <Text style={styles.stateH}>{title}</Text>
      {detail ? <Text style={styles.stateP}>{detail}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shiftCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.white06,
    backgroundColor: colors.white03,
    gap: spacing.md,
  },
  shiftLeft: { flex: 1, gap: 2 },
  shiftRight: { alignItems: 'flex-end', minWidth: 110 },

  stateCard: {
    padding: spacing.xxl,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.white10,
    backgroundColor: colors.white03,
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  stateIconErr: { width: 40, height: 40, borderRadius: 999, backgroundColor: 'rgba(255,107,107,0.12)', borderWidth: 1, borderColor: 'rgba(255,107,107,0.35)', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  stateIconEmpty: { width: 40, height: 40, borderRadius: 999, backgroundColor: colors.white04, borderWidth: 1, borderColor: colors.white15, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  stateIconText: { color: colors.white75, fontSize: 17, fontWeight: '900' },
  stateH: { color: colors.white, fontSize: 16, fontWeight: '900', letterSpacing: -0.4 },
  stateP: { color: colors.white60, fontSize: 12.5, lineHeight: 18, marginTop: 6, textAlign: 'center', maxWidth: 340 },
  retryBtn: { marginTop: spacing.lg, paddingHorizontal: 18, paddingVertical: 9, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(0,229,160,0.4)', backgroundColor: 'rgba(0,229,160,0.10)' },
  retryText: { color: colors.electric, fontSize: 12.5, fontWeight: '800' },
});
