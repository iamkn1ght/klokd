/**
 * ShiftClock — the landing hero visual. One looping story of a shift:
 * a ring fills from clock-in to clock-out while the pay counts up, then the
 * ring lifts and a payslip slides in showing the statutory deductions and
 * the net sent to M-Pesa. Illustrative sample figures, labelled as such.
 *
 * Driven by requestAnimationFrame (only the ring offset, counter and clock
 * text change per frame). Honours prefers-reduced-motion by rendering the
 * finished state with no loop.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, radius } from '../theme';
import { EASE, GLASS_WEB } from './KlokdLayout';

const SIZE = 250;
const STROKE = 12;
const R = (SIZE - STROKE) / 2 - 4;
const CIRC = 2 * Math.PI * R;

const GROSS = 1800;
const SHIFT_MINUTES = 300; // 5:00 → 10:00 PM
const FILL_MS = 5000;
const HOLD_MS = 4200;

// Illustrative deductions on one 5-hour shift (NSSF 6%, SHIF 2.75%, no PAYE
// on a single day's pay). Sample figures — the caption says so.
const SLIP = [
  { l: 'Gross · Waiter, 5 hrs', v: '1,800' },
  { l: 'NSSF', v: '−108' },
  { l: 'SHIF', v: '−50' },
  { l: 'PAYE', v: '0' },
];
const NET = 'KES 1,642';

function prefersReducedMotion(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function clockText(minutes: number): string {
  const h = 5 + Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${String(m).padStart(2, '0')} PM`;
}

export function ShiftClock() {
  const reduced = useRef(prefersReducedMotion()).current;
  const [progress, setProgress] = useState(reduced ? 1 : 0);
  const [done, setDone] = useState(reduced);
  const settle = useRef(new Animated.Value(reduced ? 1 : 0)).current;

  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    let timers: ReturnType<typeof setTimeout>[] = [];
    let alive = true;

    const run = () => {
      if (!alive) return;
      setDone(false);
      settle.setValue(0);
      const t0 = performance.now();
      const tick = (now: number) => {
        if (!alive) return;
        const p = Math.min(1, (now - t0) / FILL_MS);
        setProgress(1 - Math.pow(1 - p, 2));
        if (p < 1) {
          raf = requestAnimationFrame(tick);
          return;
        }
        setDone(true);
        timers.push(
          setTimeout(() => {
            Animated.timing(settle, { toValue: 1, duration: 600, easing: EASE, useNativeDriver: false }).start();
          }, 300),
          setTimeout(run, HOLD_MS)
        );
      };
      raf = requestAnimationFrame(tick);
    };
    run();

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      timers = [];
    };
  }, [reduced, settle]);

  const ringLift = {
    transform: [
      { translateY: settle.interpolate({ inputRange: [0, 1], outputRange: [0, -78] }) },
      { scale: settle.interpolate({ inputRange: [0, 1], outputRange: [1, 0.72] }) },
    ],
  };
  const slipIn = {
    opacity: settle,
    transform: [{ translateY: settle.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
  };
  const pinOut = { opacity: settle.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) };

  return (
    <View style={styles.wrap} accessibilityLabel="Illustration: a five-hour shift paying KES 1,800, with NSSF and SHIF deducted and KES 1,642 sent to M-Pesa.">
      <View style={[styles.panel, Platform.OS === 'web' && (GLASS_WEB as any)]}>
        <View style={styles.stage}>
          <Animated.View style={[styles.pin, pinOut]}>
            <Text style={styles.pinText}>Clocked in · within 500 m of the venue</Text>
          </Animated.View>

          <Animated.View style={[styles.clock, ringLift]}>
            <View style={styles.glow} />
            <Svg width={SIZE} height={SIZE} style={styles.svg}>
              <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke="rgba(255,255,255,0.07)" strokeWidth={STROKE} fill="none" />
              <Circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                stroke={colors.electric}
                strokeWidth={STROKE}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${CIRC} ${CIRC}`}
                strokeDashoffset={CIRC * (1 - progress)}
                transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
              />
            </Svg>
            <View style={styles.mid}>
              <Text style={styles.phase}>{done ? 'CLOCKED OUT' : 'SHIFT LIVE'}</Text>
              <Text style={styles.kes}>KES {Math.round(GROSS * progress).toLocaleString()}</Text>
              <Text style={styles.time}>{clockText(Math.round(SHIFT_MINUTES * progress))}</Text>
            </View>
          </Animated.View>

          <Animated.View style={[styles.slip, slipIn]} pointerEvents="none">
            {SLIP.map(r => (
              <View key={r.l} style={styles.slipRow}>
                <Text style={styles.slipL}>{r.l}</Text>
                <Text style={styles.slipV}>{r.v}</Text>
              </View>
            ))}
            <View style={[styles.slipRow, styles.slipNet]}>
              <Text style={styles.slipNetL}>Sent to M-Pesa ✓</Text>
              <Text style={styles.slipNetV}>{NET}</Text>
            </View>
          </Animated.View>
        </View>
      </View>
      <Text style={styles.caption}>Illustration · sample shift and deductions</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  panel: { padding: 14, borderRadius: radius.huge, borderWidth: 1, borderColor: colors.white12, backgroundColor: 'rgba(255,255,255,0.045)' },
  stage: { width: 300, height: 440, alignItems: 'center', justifyContent: 'center' },
  pin: { position: 'absolute', top: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, backgroundColor: 'rgba(0,229,160,0.12)', borderWidth: 1, borderColor: 'rgba(0,229,160,0.40)' },
  pinText: { color: colors.electric, fontSize: 11.5, fontWeight: '800' },
  clock: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', width: SIZE - 24, height: SIZE - 24, borderRadius: SIZE, shadowColor: colors.electric, shadowOpacity: 0.45, shadowRadius: 40, shadowOffset: { width: 0, height: 0 } },
  svg: { position: 'absolute', top: 0, left: 0 },
  mid: { alignItems: 'center' },
  phase: { color: colors.electric, fontSize: 11, fontWeight: '900', letterSpacing: 1.1 },
  kes: { color: colors.white, fontSize: 40, fontWeight: '900', letterSpacing: -1.5, marginTop: 4, fontVariant: ['tabular-nums'] },
  time: { color: colors.white60, fontSize: 12.5, fontWeight: '700', marginTop: 2, fontVariant: ['tabular-nums'] },
  slip: { position: 'absolute', bottom: 18, width: 270, paddingVertical: 12, paddingHorizontal: 14, borderRadius: radius.lg, backgroundColor: '#15151D', borderWidth: 1, borderColor: 'rgba(0,229,160,0.35)' },
  slipRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  slipL: { color: colors.white60, fontSize: 12.5, fontWeight: '500' },
  slipV: { color: colors.white60, fontSize: 12.5, fontWeight: '600', fontVariant: ['tabular-nums'] },
  slipNet: { borderTopWidth: 1, borderTopColor: colors.white10, marginTop: 5, paddingTop: 7 },
  slipNetL: { color: colors.white, fontSize: 13, fontWeight: '900' },
  slipNetV: { color: colors.electric, fontSize: 13, fontWeight: '900', fontVariant: ['tabular-nums'] },
  caption: { color: colors.white45, fontSize: 11, fontWeight: '700', marginTop: 12, letterSpacing: 0.2 },
});
