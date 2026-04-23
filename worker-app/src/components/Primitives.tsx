/**
 * Shared UI primitives — ported 1:1 from claude-design/lib/klokd-ui.jsx
 * Dark shell (Worker App) default.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, typography, radius } from '../theme';
import { Icons } from './Icons';

// ═══ BUTTONS ═══
type BtnSize = 'lg' | 'md' | 'sm';

interface GradientBtnProps {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  size?: BtnSize;
}

export function GradientBtn({ children, onPress, disabled, style, size = 'lg' }: GradientBtnProps) {
  const padV = size === 'lg' ? 16 : size === 'md' ? 12 : 9;
  const padH = size === 'lg' ? 24 : size === 'md' ? 20 : 16;
  const fs = size === 'lg' ? 15 : size === 'md' ? 14 : 13;

  if (disabled) {
    return (
      <View style={[{ width: '100%' }, style]}>
        <View style={{
          width: '100%', paddingVertical: padV, paddingHorizontal: padH,
          borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center',
        }}>
          <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: fs, fontWeight: '800', letterSpacing: -0.15 }}>
            {typeof children === 'string' ? children : <>{children}</>}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[{ width: '100%' }, style]}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        <LinearGradient
          colors={[gradients.cta[0], gradients.cta[1]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: '100%', paddingVertical: padV, paddingHorizontal: padH,
            borderRadius: 14, alignItems: 'center',
          }}
        >
          <Text style={{ color: colors.ink, fontSize: fs, fontWeight: '800', letterSpacing: -0.15 }}>
            {typeof children === 'string' ? children : <>{children}</>}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

export function GhostBtn({ children, onPress, dark = true, style }: { children: React.ReactNode; onPress?: () => void; dark?: boolean; style?: ViewStyle }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[{
        width: '100%', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 14,
        backgroundColor: 'transparent',
        borderWidth: 1, borderColor: dark ? 'rgba(255,255,255,0.1)' : colors.soft,
        alignItems: 'center',
      }, style]}
    >
      <Text style={{ color: dark ? colors.white70 : colors.mid, fontSize: 14, fontWeight: '600' }}>
        {typeof children === 'string' ? children : <>{children}</>}
      </Text>
    </TouchableOpacity>
  );
}

export function IconBtn({ children, onPress, dark = true }: { children: React.ReactNode; onPress?: () => void; dark?: boolean }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: dark ? colors.white06 : colors.white,
        borderWidth: 0.5, borderColor: dark ? colors.white10 : colors.soft,
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      {children}
    </TouchableOpacity>
  );
}

// ═══ TYPE ═══
export function Eyebrow({ children, color, style }: { children: React.ReactNode; color?: string; style?: TextStyle }) {
  return (
    <Text style={[{
      fontSize: 10, fontWeight: '800', letterSpacing: 1.8, textTransform: 'uppercase',
      color: color || colors.electric,
    }, style]}>
      {children}
    </Text>
  );
}

export function Label({ children, color = colors.white40, style }: { children: React.ReactNode; color?: string; style?: TextStyle }) {
  return (
    <Text style={[{
      fontSize: 10.5, fontWeight: '700', letterSpacing: 1.47, textTransform: 'uppercase', color,
    }, style]}>
      {children}
    </Text>
  );
}

// ═══ CHIPS ═══
interface ChipProps {
  children: React.ReactNode;
  active?: boolean;
  onPress?: () => void;
  color?: string;
  variant?: 'dark' | 'light';
}

export function Chip({ children, active, onPress, color, variant = 'dark' }: ChipProps) {
  const dark = variant === 'dark';
  const accent = color || colors.electric;

  if (active) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={{
          paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999,
          borderWidth: 1.5, borderColor: accent,
          backgroundColor: `${accent}1a`,
        }}
      >
        <Text style={{ fontSize: 12.5, fontWeight: '700', color: accent }}>
          {children}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999,
        borderWidth: 1.5, borderColor: dark ? colors.white08 : colors.soft,
        backgroundColor: dark ? colors.white03 : colors.white,
      }}
    >
      <Text style={{ fontSize: 12.5, fontWeight: '600', color: dark ? colors.white55 : colors.mid }}>
        {children}
      </Text>
    </TouchableOpacity>
  );
}

// ═══ STATUS PILL ═══
type PillTone = 'mint' | 'volt' | 'warn' | 'err' | 'info' | 'neutral';

const pillToneMap: Record<PillTone, { bg: string; c: string }> = {
  mint: { bg: colors.electricAlpha['12'], c: colors.electric },
  volt: { bg: colors.voltAlpha['12'], c: colors.volt },
  warn: { bg: colors.warnAlpha['14'], c: colors.warning },
  err: { bg: colors.errAlpha['14'], c: colors.error },
  info: { bg: colors.infoAlpha['14'], c: colors.info },
  neutral: { bg: colors.white06, c: colors.white55 },
};

export function StatusPill({ children, tone = 'mint' }: { children: React.ReactNode; tone?: PillTone }) {
  const t = pillToneMap[tone];
  return (
    <View style={{
      alignSelf: 'flex-start',
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999,
      backgroundColor: t.bg,
    }}>
      <Text style={{ fontSize: 10.5, fontWeight: '700', color: t.c, letterSpacing: 0.63, textTransform: 'uppercase' }}>
        {children}
      </Text>
    </View>
  );
}

// ═══ CARDS ═══
export function DarkCard({ children, style, glow, accent, onPress }: { children: React.ReactNode; style?: ViewStyle; glow?: boolean; accent?: boolean; onPress?: () => void }) {
  const cardStyle: ViewStyle = {
    backgroundColor: colors.white03,
    borderWidth: 1,
    borderColor: accent ? colors.electricAlpha['35'] : colors.white06,
    borderRadius: 18,
    padding: 16,
    ...style,
  };

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={cardStyle}>
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={cardStyle}>{children}</View>;
}

// ═══ DIVIDERS ═══
export function VLine({ dark = true }: { dark?: boolean }) {
  return (
    <View style={{
      width: StyleSheet.hairlineWidth,
      alignSelf: 'stretch',
      backgroundColor: dark ? colors.white08 : colors.soft,
    }} />
  );
}

// ═══ LOGO ═══
export function Logo({ size = 28, light = true }: { size?: number; light?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <LinearGradient
        colors={[gradients.logo[0], gradients.logo[1]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: size, height: size, borderRadius: size * 0.28,
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Text style={{ color: colors.ink, fontWeight: '900', fontSize: size * 0.48, letterSpacing: size * 0.48 * -0.04 }}>K</Text>
      </LinearGradient>
      <Text style={{ fontWeight: '900', fontSize: size * 0.55, letterSpacing: size * 0.55 * -0.05, color: light ? colors.white : colors.ink }}>klokd</Text>
    </View>
  );
}

export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <LinearGradient
      colors={[gradients.logo[0], gradients.logo[1]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: size, height: size, borderRadius: size * 0.28,
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      <Text style={{ color: colors.ink, fontWeight: '900', fontSize: size * 0.48, letterSpacing: size * 0.48 * -0.04 }}>K</Text>
    </LinearGradient>
  );
}

// ═══ PROGRESS ═══
export function StepProgress({ step, total, dark = true }: { step: number; total: number; dark?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6, width: '100%' }}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: 3,
            borderRadius: 999,
            backgroundColor: i <= step ? colors.electric : dark ? colors.white08 : colors.soft,
          }}
        />
      ))}
    </View>
  );
}

// Re-export Icons for convenience
export { Icons };
