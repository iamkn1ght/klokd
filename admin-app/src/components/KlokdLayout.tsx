/**
 * Klokd Layout System — shared design primitives extracted from the v5
 * employer Welcome (the locked design backbone). Use these on every screen
 * for visual consistency with the brand DNA:
 *
 *   - Ambient electric orbs (top-right + center-left) — the "glass background"
 *   - Subtle dot-grid texture behind hero
 *   - Frosted glass cards over the orbs (everything reads as floating glass)
 *   - One accent: electric. Motion: 520ms ease-out-quart. Premium hover states.
 *
 * Usage:
 *   import { KlokdScreen, FadeUp, GlassCard, HoverCard, LiveDot } from '../../components/KlokdLayout';
 *
 *   <KlokdScreen>
 *     <FadeUp delay={0}><Text style={...}>Heading</Text></FadeUp>
 *     <GlassCard>...content over the glass...</GlassCard>
 *   </KlokdScreen>
 */
import React, { useEffect, useRef } from 'react';
import {
  View,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  Animated,
  Easing,
  ViewStyle,
} from 'react-native';
import Svg, { Defs, Pattern, Rect, Circle, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radius } from '../theme';

export const EASE = Easing.bezier(0.22, 1, 0.36, 1);

// ─── Ambient background ───────────────────────────────────

/**
 * Drop-in ambient background — orbs + dot grid — that sits behind any screen.
 * Use this on mobile-shaped flows (onboarding, shift detail, etc.) that have
 * their own chrome and don't fit the marketing `KlokdScreen` shell.
 *
 * Renders nothing on native (web-only orbs/blur). Always `pointerEvents='none'`.
 *
 *   <View style={{ flex: 1, backgroundColor: colors.ink }}>
 *     <AmbientOrbs />
 *     {/* normal screen chrome over the top *\/}
 *   </View>
 */
export function AmbientOrbs({ intensity = 'default' }: { intensity?: 'default' | 'subtle' }) {
  if (Platform.OS !== 'web') return null;
  const aColors = intensity === 'subtle'
    ? ['rgba(0,229,160,0.12)', 'rgba(0,229,160,0)'] as const
    : ['rgba(0,229,160,0.22)', 'rgba(0,229,160,0)'] as const;
  const bColors = intensity === 'subtle'
    ? ['rgba(0,229,160,0.05)', 'rgba(0,229,160,0)'] as const
    : ['rgba(0,229,160,0.10)', 'rgba(0,229,160,0)'] as const;
  return (
    <>
      <View pointerEvents="none" style={styles.dotsLayer}>
        <DotGrid />
      </View>
      <View pointerEvents="none" style={[styles.orb, styles.orbA]}>
        <LinearGradient
          colors={aColors as any}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>
      <View pointerEvents="none" style={[styles.orb, styles.orbB]}>
        <LinearGradient
          colors={bColors as any}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>
    </>
  );
}

function DotGrid({ height = 780 }: { height?: number }) {
  return (
    <Svg width="100%" height={height} style={{ opacity: 0.5 }} pointerEvents="none">
      <Defs>
        <Pattern id="kdots" width="24" height="24" patternUnits="userSpaceOnUse">
          <Circle cx="1" cy="1" r="1" fill={colors.white15} />
        </Pattern>
        <SvgLinearGradient id="kdotsFade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#000" stopOpacity="0" />
          <Stop offset="0.6" stopColor="#000" stopOpacity="0.6" />
          <Stop offset="1" stopColor="#000" stopOpacity="1" />
        </SvgLinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#kdots)" />
      <Rect width="100%" height="100%" fill="url(#kdotsFade)" />
    </Svg>
  );
}

/**
 * Full-screen wrapper with the locked Klokd ambient atmosphere:
 *   - Ink background
 *   - Two electric orbs (top-right large, center-left smaller)
 *   - Dot-grid texture (web only)
 *   - Vertical-scrolling content area with max-width centred column
 *
 * The orbs + grid render BEHIND everything; all `children` paint on top
 * via standard z-stacking. Card primitives in this file are pre-styled to
 * read as frosted glass over the orbs.
 */
export function KlokdScreen({
  children,
  maxWidth = 1180,
  paddingHorizontal = spacing.xl,
  scrollViewProps,
}: {
  children: React.ReactNode;
  maxWidth?: number;
  paddingHorizontal?: number;
  scrollViewProps?: React.ComponentProps<typeof ScrollView>;
}) {
  return (
    <View style={styles.screen}>
      {Platform.OS === 'web' && (
        <>
          <View pointerEvents="none" style={styles.dotsLayer}>
            <DotGrid />
          </View>
          <View pointerEvents="none" style={[styles.orb, styles.orbA]}>
            <LinearGradient
              colors={['rgba(0,229,160,0.22)', 'rgba(0,229,160,0)']}
              start={{ x: 0.5, y: 0.5 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </View>
          <View pointerEvents="none" style={[styles.orb, styles.orbB]}>
            <LinearGradient
              colors={['rgba(0,229,160,0.10)', 'rgba(0,229,160,0)']}
              start={{ x: 0.5, y: 0.5 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </View>
        </>
      )}

      <ScrollView
        contentContainerStyle={styles.scroll}
        bounces={false}
        {...scrollViewProps}
      >
        <View style={[styles.maxWidth, { maxWidth, paddingHorizontal }]}>{children}</View>
      </ScrollView>
    </View>
  );
}

// ─── Motion ───────────────────────────────────────────────

/**
 * Staggered fade-up reveal. 520ms · ease-out-quart. Use `delay` (ms) to
 * cascade siblings: 0, 80, 160, 240... gives the v5 Welcome feel.
 */
export function FadeUp({
  delay = 0,
  duration = 520,
  style,
  children,
}: {
  delay?: number;
  duration?: number;
  style?: any;
  children: React.ReactNode;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(18)).current;
  useEffect(() => {
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration, easing: EASE, useNativeDriver: true }),
        Animated.timing(ty, { toValue: 0, duration, easing: EASE, useNativeDriver: true }),
      ]).start();
    }, delay);
    return () => clearTimeout(t);
  }, [opacity, ty, delay, duration]);
  return <Animated.View style={[style, { opacity, transform: [{ translateY: ty }] }]}>{children}</Animated.View>;
}

/**
 * Web-aware hover container. Provides `hoverStyle` on hover + `scale(0.985)`
 * on press for haptic-feel feedback. Falls back to standard Pressable on native.
 */
export function HoverCard({
  onPress,
  children,
  style,
  hoverStyle,
  disabled,
}: {
  onPress?: () => void;
  children: React.ReactNode;
  style?: any;
  hoverStyle?: any;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ hovered, pressed }: any) => [
        style,
        hovered && !disabled && hoverStyle,
        pressed && !disabled && { transform: [{ scale: 0.985 }] },
      ]}
    >
      {children}
    </Pressable>
  );
}

/** Pulsing electric dot — the "alive" signal used everywhere. */
export function LiveDot({ size = 7, color = colors.electric }: { size?: number; color?: string }) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.35, duration: 1200, easing: EASE, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1200, easing: EASE, useNativeDriver: true }),
      ])
    ).start();
  }, [pulse]);
  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity: pulse,
      }}
    />
  );
}

// ─── Glass cards ──────────────────────────────────────────

/**
 * The Klokd glass card — frosted, soft border, electric-tinted shadow on hover.
 * Use for any container that should read as floating glass over the orbs.
 *
 * Variants:
 *   variant="default" — subtle (white03 + white06 border)
 *   variant="raised"  — bumped (white06 + white10 border + larger shadow)
 *   variant="electric" — accent-tinted background + electric border
 */
export function GlassCard({
  children,
  style,
  variant = 'default',
  padding = spacing.lg,
  interactive,
  onPress,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'raised' | 'electric';
  padding?: number;
  interactive?: boolean;
  onPress?: () => void;
}) {
  const base: ViewStyle = {
    padding,
    borderRadius: radius.xxl,
    borderWidth: 1,
    ...(variant === 'electric'
      ? { backgroundColor: 'rgba(0,229,160,0.05)', borderColor: 'rgba(0,229,160,0.22)' }
      : variant === 'raised'
        ? { backgroundColor: colors.white06, borderColor: colors.white10 }
        : { backgroundColor: colors.white03, borderColor: colors.white06 }),
    ...(Platform.OS === 'web' && variant === 'raised'
      ? ({ backdropFilter: 'blur(20px)' } as any)
      : {}),
  };

  if (!interactive) {
    return <View style={[base, style]}>{children}</View>;
  }

  return (
    <HoverCard
      onPress={onPress}
      style={[base, style]}
      hoverStyle={{
        borderColor: variant === 'electric' ? 'rgba(0,229,160,0.4)' : colors.white15,
        backgroundColor: variant === 'electric' ? 'rgba(0,229,160,0.08)' : colors.white06,
        transform: [{ translateY: -2 }],
      }}
    >
      {children}
    </HoverCard>
  );
}

// ─── Styles ───────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  dotsLayer: { position: 'absolute', top: 0, left: 0, right: 0, height: 780, overflow: 'hidden' },
  orb: { position: 'absolute', borderRadius: 999, overflow: 'hidden' },
  orbA: { top: -200, right: -200, width: 760, height: 760 },
  orbB: { top: 200, left: -260, width: 580, height: 580 },
  scroll: { paddingBottom: spacing.xxxl + 32 },
  maxWidth: { width: '100%', alignSelf: 'center' },
});
