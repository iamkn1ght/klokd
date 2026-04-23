/**
 * Employer-specific UI — ported 1:1 from claude-design/lib/klokd-employer.jsx
 */
import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ViewStyle, TextStyle, ImageSourcePropType } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, typography } from '../theme';
import { Icons } from './Icons';

// ═══ EMPLOYER HEADER ═══
export function EmpHeader({ greeting, venue, notif = 2, onBell, onVenue }: {
  greeting: string; venue?: string; notif?: number; onBell?: () => void; onVenue?: () => void;
}) {
  return (
    <View style={styles.header}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <TouchableOpacity onPress={onVenue} activeOpacity={0.7} style={styles.venuePill}>
          <View style={styles.venueDot} />
          <Text style={styles.venueText} numberOfLines={1}>{venue || 'The Brew Bistro · Westlands'}</Text>
          <Icons.chevron color={colors.white40} size={10} dir="down" />
        </TouchableOpacity>
        <Text style={styles.greeting} numberOfLines={1}>{greeting}</Text>
      </View>
      <TouchableOpacity onPress={onBell} activeOpacity={0.7} style={styles.bellBtn}>
        <Icons.bell color={colors.white} size={15} />
        {notif > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{notif}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ═══ STAT TILE ═══
type StatTone = 'mint' | 'volt' | 'warn' | 'neutral';

const statToneMap: Record<StatTone, { c: string; bg: string; bd: string }> = {
  mint: { c: colors.electric, bg: colors.electricAlpha['07'], bd: colors.electricAlpha['25'] },
  volt: { c: colors.volt, bg: colors.voltAlpha['07'], bd: colors.voltAlpha['25'] },
  warn: { c: colors.warning, bg: colors.warnAlpha['07'], bd: colors.warnAlpha['22'] },
  neutral: { c: colors.white, bg: colors.white03, bd: colors.white06 },
};

export function StatTile({ label, value, sub, tone = 'neutral', icon, compact }: {
  label: string; value: string; sub?: string; tone?: StatTone; icon?: React.ReactNode; compact?: boolean;
}) {
  const t = statToneMap[tone];
  return (
    <View style={{
      paddingHorizontal: compact ? 12 : 14,
      paddingVertical: compact ? 10 : 12,
      borderRadius: 14,
      backgroundColor: t.bg,
      borderWidth: 1, borderColor: t.bd,
      gap: 4,
      flex: 1,
      minWidth: 0,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {icon}
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      <Text style={{ fontSize: compact ? 18 : 22, fontWeight: '900', color: t.c, letterSpacing: -0.66 }}>{value}</Text>
      {sub && <Text style={styles.statSub}>{sub}</Text>}
    </View>
  );
}

// ═══ WORKER CARD ═══
export interface Worker {
  id: string;
  name: string;
  initials: string;
  rating: number;
  shifts: number;
  showUp: number;
  verified?: boolean;
  badge?: string;
  avatarBg?: string[];
  match?: number;
}

export function WorkerCard({ worker, match, accepted, onAccept, compact }: {
  worker: Worker; match?: number; accepted?: boolean; onAccept?: () => void; compact?: boolean;
}) {
  const w = worker;
  const avatarColors = w.avatarBg || ['#3b3b48', '#24242e'];
  return (
    <View style={[
      styles.workerCard,
      { padding: compact ? 12 : 14 },
      accepted ? { backgroundColor: 'rgba(0,229,160,0.08)', borderColor: 'rgba(0,229,160,0.33)' } : null,
    ]}>
      {/* Avatar */}
      <View style={styles.avatarOuter}>
        <LinearGradient
          colors={avatarColors as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.avatar}
        >
          <Text style={styles.avatarInitials}>{w.initials}</Text>
        </LinearGradient>
        {w.verified && (
          <View style={styles.verifiedBadge}>
            <Icons.check color={colors.ink} size={9} />
          </View>
        )}
      </View>

      {/* Body */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <Text style={styles.workerName}>{w.name}</Text>
          {typeof match === 'number' && (
            <View style={styles.matchPill}>
              <Text style={styles.matchText}>{match}% MATCH</Text>
            </View>
          )}
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Icons.star color={colors.volt} size={10} />
            <Text style={styles.workerMeta}>{w.rating}</Text>
          </View>
          <Text style={styles.workerDot}>·</Text>
          <Text style={styles.workerMeta}>{w.shifts} shifts</Text>
          <Text style={styles.workerDot}>·</Text>
          <Text style={styles.workerShowUp}>{w.showUp}% show-up</Text>
        </View>
        {!compact && w.badge && <Text style={styles.workerBadge}>{w.badge}</Text>}
      </View>

      {/* Action */}
      {onAccept && !accepted && (
        <TouchableOpacity onPress={onAccept} activeOpacity={0.85}>
          <LinearGradient
            colors={[gradients.cta[0], gradients.cta[1]]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.acceptBtn}
          >
            <Text style={styles.acceptText}>Accept</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
      {accepted && (
        <View style={styles.confirmedPill}>
          <Icons.check color={colors.electric} size={11} />
          <Text style={styles.confirmedText}>Confirmed</Text>
        </View>
      )}
    </View>
  );
}

// ═══ MONEY LINE ═══
export function MoneyLine({ label, value, muted, bold, big, tone }: {
  label: string; value: string; muted?: boolean; bold?: boolean; big?: boolean; tone?: 'mint' | 'warn';
}) {
  const c = tone === 'mint' ? colors.electric : tone === 'warn' ? colors.warning : bold ? colors.white : colors.white70;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingVertical: 7 }}>
      <Text style={{
        fontSize: 12,
        color: muted ? colors.white45 : colors.white60,
        fontWeight: '500',
      }}>{label}</Text>
      <Text style={{
        fontSize: big ? 16 : 13,
        fontWeight: bold || big ? '800' : '600',
        color: c,
        letterSpacing: -0.26,
      }}>{value}</Text>
    </View>
  );
}

// ═══ INPUT ═══
export function EmpInput({ label, value, onChangeText, placeholder, prefix, suffix, keyboardType, hint }: {
  label?: string; value: string; onChangeText?: (v: string) => void;
  placeholder?: string; prefix?: string; suffix?: string;
  keyboardType?: 'default' | 'numeric' | 'phone-pad';
  hint?: string;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      {label && <Text style={styles.inputLabel}>{label}</Text>}
      <View style={styles.inputRow}>
        {prefix && <Text style={styles.inputPrefix}>{prefix}</Text>}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.white40}
          keyboardType={keyboardType}
          style={styles.input}
        />
        {suffix && <Text style={styles.inputSuffix}>{suffix}</Text>}
      </View>
      {hint && <Text style={styles.inputHint}>{hint}</Text>}
    </View>
  );
}

// ═══ STEPPER ═══
export function Stepper({ value, onChange, min = 1, max = 99, label, suffix }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; label?: string; suffix?: string;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <TouchableOpacity
        onPress={() => value > min && onChange(value - 1)}
        disabled={value <= min}
        style={styles.stepBtn}
        activeOpacity={0.7}
      >
        <Text style={[styles.stepBtnText, value <= min && { color: colors.white20 }]}>−</Text>
      </TouchableOpacity>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center' }}>
          <Text style={styles.stepValue}>{value}</Text>
          {suffix && <Text style={styles.stepSuffix}>{suffix}</Text>}
        </View>
        {label && <Text style={styles.stepLabel}>{label}</Text>}
      </View>
      <TouchableOpacity
        onPress={() => value < max && onChange(value + 1)}
        disabled={value >= max}
        style={styles.stepBtn}
        activeOpacity={0.7}
      >
        <Text style={[styles.stepBtnText, value >= max && { color: colors.white20 }]}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

// ═══ ESCROW METER ═══
export function EscrowMeter({ funded, held, committed, showLabels = true }: {
  funded: number; held: number; committed: number; showLabels?: boolean;
}) {
  const total = funded;
  const heldPct = total > 0 ? (held / total) * 100 : 0;
  const commPct = total > 0 ? (committed / total) * 100 : 0;

  return (
    <View>
      <View style={styles.meterBar}>
        <View style={{ width: `${commPct}%`, backgroundColor: colors.electric, height: '100%' }} />
        <View style={{ width: `${Math.max(0, heldPct - commPct)}%`, backgroundColor: colors.electricAlpha['55'], height: '100%' }} />
      </View>
      {showLabels && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
          <Text style={styles.meterCommit}>KES {committed.toLocaleString()} committed</Text>
          <Text style={styles.meterTotal}>of KES {total.toLocaleString()}</Text>
        </View>
      )}
    </View>
  );
}

// ═══ TIMELINE DOT ═══
export function TimelineDot({ state = 'future', label, sub, time, last }: {
  state?: 'past' | 'active' | 'future'; label: string; sub?: string; time?: string; last?: boolean;
}) {
  const isActive = state === 'active';
  const isPast = state === 'past';
  const lineColor = isPast ? colors.electric : colors.white08;

  return (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
      <View style={{ alignItems: 'center', width: 14, flexShrink: 0 }}>
        <View style={{
          width: 12, height: 12, borderRadius: 6,
          backgroundColor: isActive || isPast ? colors.electric : 'transparent',
          borderWidth: isActive ? 3 : isPast ? 0 : 1.5,
          borderColor: isActive ? 'rgba(0,229,160,0.27)' : isPast ? 'transparent' : colors.white25,
        }} />
        {!last && <View style={{ width: 1.5, flex: 1, minHeight: 22, backgroundColor: lineColor, marginTop: 3 }} />}
      </View>
      <View style={{ flex: 1, paddingBottom: last ? 0 : 14, paddingTop: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
          <Text style={{ fontSize: 12.5, fontWeight: isActive ? '800' : '700', color: isPast || isActive ? colors.white : colors.white50, letterSpacing: -0.13 }}>{label}</Text>
          {time && <Text style={{ fontSize: 10.5, color: isActive ? colors.electric : colors.white40, fontWeight: '700', fontFamily: typography.mono }}>{time}</Text>}
        </View>
        {sub && <Text style={{ fontSize: 10.5, color: colors.white50, marginTop: 2, lineHeight: 14.7 }}>{sub}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  venuePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: colors.white04,
    borderWidth: 0.5, borderColor: colors.white08,
    marginBottom: 6,
  },
  venueDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.electric },
  venueText: { color: colors.white70, fontSize: 10.5, fontWeight: '600' },
  greeting: { fontSize: 20, fontWeight: '900', letterSpacing: -0.6, color: colors.white },
  bellBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.white05,
    borderWidth: 0.5, borderColor: colors.white08,
    alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    position: 'absolute', top: 5, right: 5, minWidth: 13, height: 13,
    paddingHorizontal: 3,
    borderRadius: 999,
    backgroundColor: colors.electric,
    borderWidth: 1.5, borderColor: colors.ink,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { fontSize: 9, fontWeight: '900', color: colors.ink },

  statLabel: { fontSize: 9.5, color: colors.white45, letterSpacing: 1.14, textTransform: 'uppercase', fontWeight: '700' },
  statSub: { fontSize: 10.5, color: colors.white50, lineHeight: 14.2 },

  workerCard: {
    borderRadius: 14,
    backgroundColor: colors.white03,
    borderWidth: 1, borderColor: colors.white06,
    flexDirection: 'row', alignItems: 'center', gap: 11,
  },
  avatarOuter: { position: 'relative' },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.white08,
  },
  avatarInitials: { color: colors.white, fontWeight: '800', fontSize: 13, letterSpacing: -0.26 },
  verifiedBadge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: colors.electric,
    borderWidth: 1.5, borderColor: colors.ink,
    alignItems: 'center', justifyContent: 'center',
  },
  workerName: { fontSize: 13, fontWeight: '800', color: colors.white, letterSpacing: -0.13 },
  matchPill: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999, backgroundColor: colors.voltAlpha['22'] },
  matchText: { fontSize: 9.5, fontWeight: '800', color: colors.volt, letterSpacing: 0.38 },
  workerMeta: { fontSize: 10.5, color: colors.white55 },
  workerDot: { fontSize: 10, color: colors.white30 },
  workerShowUp: { fontSize: 10.5, color: colors.electric, fontWeight: '700' },
  workerBadge: { marginTop: 4, fontSize: 10, color: colors.white40 },
  acceptBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  acceptText: { fontSize: 11.5, fontWeight: '800', color: colors.ink, letterSpacing: -0.12 },
  confirmedPill: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0,229,160,0.14)',
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  confirmedText: { fontSize: 10.5, fontWeight: '800', color: colors.electric },

  inputLabel: { fontSize: 10, color: colors.white55, letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: '700', marginBottom: 6 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 13, paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: colors.white04,
    borderWidth: 1, borderColor: colors.white08,
  },
  input: { flex: 1, color: colors.white, fontSize: 13.5, fontWeight: '600' },
  inputPrefix: { fontSize: 13, color: colors.white45, fontWeight: '600' },
  inputSuffix: { fontSize: 12, color: colors.white45, fontWeight: '600' },
  inputHint: { fontSize: 10.5, color: colors.white40, marginTop: 5, lineHeight: 14.7 },

  stepBtn: {
    width: 36, height: 36, borderRadius: 10,
    borderWidth: 1, borderColor: colors.white10,
    backgroundColor: colors.white04,
    alignItems: 'center', justifyContent: 'center',
  },
  stepBtnText: { fontSize: 18, fontWeight: '700', color: colors.white },
  stepValue: { fontSize: 22, fontWeight: '900', color: colors.white, letterSpacing: -0.66 },
  stepSuffix: { fontSize: 12, fontWeight: '600', color: colors.white50, marginLeft: 4 },
  stepLabel: { fontSize: 10, color: colors.white45, marginTop: 3, letterSpacing: 0.8, textTransform: 'uppercase' },

  meterBar: { height: 8, borderRadius: 999, backgroundColor: colors.white06, overflow: 'hidden', flexDirection: 'row' },
  meterCommit: { fontSize: 10.5, color: colors.electric, fontWeight: '700' },
  meterTotal: { fontSize: 10.5, color: colors.white45 },
});
