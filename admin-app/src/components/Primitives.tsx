/**
 * Admin Primitives — small set of admin-side building blocks that compose
 * with the shared KlokdLayout. Same visual language as worker/employer apps:
 * electric accent, tight type, glass surfaces.
 */
import React, { useRef, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { colors, spacing, radius } from '../theme';

// ─── Logo ─────────────────────────────────────────────────

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.27,
          backgroundColor: colors.electric,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: colors.ink, fontWeight: '900', fontSize: size * 0.55, letterSpacing: -0.5 }}>K</Text>
      </View>
      <Text style={{ color: colors.white, fontSize: size * 0.55, fontWeight: '900', letterSpacing: -0.6 }}>
        Klokd<Text style={{ color: colors.white50, fontWeight: '600' }}> admin</Text>
      </Text>
    </View>
  );
}

// ─── Buttons ──────────────────────────────────────────────

export function GradientBtn({
  children,
  onPress,
  disabled,
  size = 'md',
}: {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}) {
  const pad = size === 'sm' ? { v: 10, h: 16, f: 13 } : { v: 14, h: 22, f: 14.5 };
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ hovered, pressed }: any) => [
        { borderRadius: radius.lg, overflow: 'hidden', opacity: disabled ? 0.45 : 1 },
        hovered && !disabled && { transform: [{ translateY: -1 }] },
        pressed && !disabled && { transform: [{ scale: 0.985 }] },
      ]}
    >
      <LinearGradient
        colors={[colors.electric, '#0FBD83']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingVertical: pad.v,
          paddingHorizontal: pad.h,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: colors.ink, fontWeight: '800', fontSize: pad.f, letterSpacing: -0.2 }}>
          {children}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

export function GhostBtn({
  children,
  onPress,
  tone = 'default',
  size = 'md',
}: {
  children: React.ReactNode;
  onPress?: () => void;
  tone?: 'default' | 'danger';
  size?: 'sm' | 'md';
}) {
  const pad = size === 'sm' ? { v: 9, h: 14, f: 12.5 } : { v: 13, h: 20, f: 14 };
  const borderColor = tone === 'danger' ? 'rgba(255,107,107,0.35)' : colors.white15;
  const text = tone === 'danger' ? colors.error : colors.white;
  return (
    <Pressable
      onPress={onPress}
      style={({ hovered, pressed }: any) => [
        {
          paddingVertical: pad.v,
          paddingHorizontal: pad.h,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor,
          backgroundColor: colors.white03,
          alignItems: 'center',
          justifyContent: 'center',
        },
        hovered && { backgroundColor: colors.white06, borderColor: tone === 'danger' ? 'rgba(255,107,107,0.55)' : colors.white25 },
        pressed && { transform: [{ scale: 0.985 }] },
      ]}
    >
      <Text style={{ color: text, fontWeight: '700', fontSize: pad.f, letterSpacing: -0.15 }}>{children}</Text>
    </Pressable>
  );
}

// ─── Text primitives ──────────────────────────────────────

export function Eyebrow({ children, color = colors.electric, style }: { children: React.ReactNode; color?: string; style?: any }) {
  return (
    <Text style={[{ color, fontSize: 11, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase' }, style]}>
      {children}
    </Text>
  );
}

export function Label({ children, color = colors.white60, style }: { children: React.ReactNode; color?: string; style?: any }) {
  return <Text style={[{ color, fontSize: 12, fontWeight: '600' }, style]}>{children}</Text>;
}

export function H1({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <Text style={[{ color: colors.white, fontSize: 36, fontWeight: '900', letterSpacing: -1.6, lineHeight: 38 }, style]}>
      {children}
    </Text>
  );
}

export function H2({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <Text style={[{ color: colors.white, fontSize: 22, fontWeight: '900', letterSpacing: -0.9, lineHeight: 24 }, style]}>
      {children}
    </Text>
  );
}

// ─── Status pills ─────────────────────────────────────────

export type Tone = 'mint' | 'volt' | 'warn' | 'err' | 'neutral';

const toneMap: Record<Tone, { bg: string; border: string; fg: string }> = {
  mint: { bg: 'rgba(0,229,160,0.10)', border: 'rgba(0,229,160,0.30)', fg: colors.electric },
  volt: { bg: 'rgba(188,255,78,0.10)', border: 'rgba(188,255,78,0.30)', fg: colors.volt },
  warn: { bg: 'rgba(255,179,71,0.10)', border: 'rgba(255,179,71,0.30)', fg: colors.warning },
  err: { bg: 'rgba(255,107,107,0.10)', border: 'rgba(255,107,107,0.30)', fg: colors.error },
  neutral: { bg: colors.white06, border: colors.white15, fg: colors.white75 },
};

export function StatusPill({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: Tone }) {
  const c = toneMap[tone];
  return (
    <View
      style={{
        paddingHorizontal: 9,
        paddingVertical: 3,
        borderRadius: 999,
        backgroundColor: c.bg,
        borderWidth: 1,
        borderColor: c.border,
        alignSelf: 'flex-start',
      }}
    >
      <Text style={{ color: c.fg, fontSize: 10.5, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase' }}>
        {children}
      </Text>
    </View>
  );
}

// ─── Avatar ───────────────────────────────────────────────

export function Avatar({
  initials,
  size = 32,
  tone = 'electric',
}: {
  initials: string;
  size?: number;
  tone?: 'electric' | 'volt' | 'mid';
}) {
  const bg = tone === 'electric' ? colors.electric : tone === 'volt' ? colors.volt : colors.mid;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: colors.ink, fontWeight: '900', fontSize: size * 0.38 }}>{initials}</Text>
    </View>
  );
}

// ─── Sparkline (svg) ──────────────────────────────────────

export function Sparkline({
  values,
  color = colors.electric,
  height = 28,
  width = 80,
}: {
  values: number[];
  color?: string;
  height?: number;
  width?: number;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = width / (values.length - 1);
  const d = values
    .map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * height;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <Svg width={width} height={height}>
      <Path d={d} stroke={color} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ─── Pulse ring ───────────────────────────────────────────

export function PulseDot({ color = colors.electric, size = 9 }: { color?: string; size?: number }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opac = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, { toValue: 2.4, duration: 1400, easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opac, { toValue: 0, duration: 1400, useNativeDriver: true }),
          Animated.timing(opac, { toValue: 0.6, duration: 0, useNativeDriver: true }),
        ]),
      ]),
    ).start();
  }, [scale, opac]);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity: opac,
          transform: [{ scale }],
        }}
      />
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
    </View>
  );
}

const styles = StyleSheet.create({});
