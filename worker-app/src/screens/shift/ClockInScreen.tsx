/**
 * Check-in screen — confirm → arrive (GPS) → start PIN, with the pulse ring + countdown.
 * Visuals from claude-design/screens/main.jsx; flow per the Uber-style attendance model.
 */
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, TextInput } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { GradientBtn, IconBtn, Label } from '../../components/Primitives';
import { AmbientOrbs, SafeTop } from '../../components/KlokdLayout';
import { Icons } from '../../components/Icons';
import { useApi } from '../../hooks/useApi';
import { colors, typography } from '../../theme';

type Props = {
  navigation: NativeStackNavigationProp<any>;
  route?: { params?: { shift?: any } };
};

function PulseRing({ delay, withinRange }: { delay: number; withinRange: boolean }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 2400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [delay]);

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.25] });
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        borderRadius: 120,
        borderWidth: 1.5,
        borderColor: withinRange ? colors.electric : colors.white15,
        transform: [{ scale }],
        opacity,
      }}
    />
  );
}

interface WorkerAttendance {
  shift: {
    id: string;
    role: string;
    venue: string;
    area: string | null;
    startTime: string;
    endTime: string;
    rateKes: number;
    status: string;
    arrivedAt: string | null;
  };
  pinAttemptsLeft: number;
}

type Phase = 'loading' | 'confirm' | 'arrive' | 'pin' | 'error';

/**
 * Check-in, Uber-style:
 *   1. CONFIRMED → "I'll be there"                    POST /shifts/:id/accept
 *   2. ACCEPTED  → "I've arrived" (GPS, ≤500 m)        POST /attendance/shifts/:id/arrive
 *   3. arrived   → enter the manager's 4-digit PIN     POST /attendance/shifts/:id/start
 *   4. ACTIVE    → Active shift screen
 * The server's clock is the only clock; location is read only at these taps.
 */
export function ClockInScreen({ navigation, route }: Props) {
  const shiftId: string | undefined = route?.params?.shift?.id;
  const { post, get } = useApi();
  const [view, setView] = useState<WorkerAttendance | null>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const load = async () => {
    if (!shiftId) {
      setMessage('Open this from one of your confirmed shifts.');
      setPhase('error');
      return;
    }
    try {
      const v = await get<WorkerAttendance>(`/attendance/shifts/${shiftId}`);
      setView(v);
      if (v.shift.status === 'ACTIVE') {
        navigation.replace('ActiveShift', { shift: { id: shiftId } });
        return;
      }
      if (v.shift.status === 'CONFIRMED') setPhase('confirm');
      else if (v.shift.status === 'ACCEPTED') setPhase(v.shift.arrivedAt ? 'pin' : 'arrive');
      else {
        setMessage('This shift isn’t waiting for you to check in.');
        setPhase('error');
      }
    } catch (e: any) {
      setMessage(e?.message ?? 'Couldn’t load the shift.');
      setPhase('error');
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shiftId]);

  const confirm = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await post(`/shifts/${shiftId}/accept`);
      await load();
    } catch (e: any) {
      setMessage(e?.message ?? 'Couldn’t confirm the shift.');
    }
    setBusy(false);
  };

  const arrive = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setMessage('Klokd needs your location once, to confirm you’re at the venue.');
        setBusy(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      await post(`/attendance/shifts/${shiftId}/arrive`, {
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        accuracy: loc.coords.accuracy ?? undefined,
        mocked: (loc as any).mocked === true,
      });
      await load();
    } catch (e: any) {
      setMessage(e?.message ?? 'Couldn’t check you in. Try again.');
    }
    setBusy(false);
  };

  const start = async () => {
    if (pin.length !== 4) return;
    setBusy(true);
    setMessage(null);
    try {
      await post(`/attendance/shifts/${shiftId}/start`, { pin });
      navigation.replace('ActiveShift', { shift: { id: shiftId } });
    } catch (e: any) {
      setPin('');
      setMessage(e?.message ?? 'Couldn’t start the shift.');
      await load();
    }
    setBusy(false);
  };

  const s = view?.shift;
  const startsIn = s ? new Date(s.startTime).getTime() - now : 0;
  const abs = Math.abs(startsIn);
  const countdown =
    `${startsIn < 0 ? '+' : ''}${String(Math.floor(abs / 3_600_000)).padStart(2, '0')}:` +
    `${String(Math.floor((abs % 3_600_000) / 60_000)).padStart(2, '0')}:` +
    `${String(Math.floor((abs % 60_000) / 1000)).padStart(2, '0')}`;
  const ready = phase === 'pin';

  return (
    <View style={styles.screen}>
      <AmbientOrbs intensity="subtle" />
      <SafeTop />
      <View style={styles.header}>
        <IconBtn onPress={() => navigation.goBack()}>
          <Icons.back color={colors.white} size={14} />
        </IconBtn>
        <View style={{ alignItems: 'center' }}>
          <Label color={colors.white35}>{startsIn < 0 ? 'Shift started' : 'Shift starts in'}</Label>
          <Text style={styles.countdown}>{s ? countdown : '--:--:--'}</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.ringOuter}>
          {[0, 1, 2].map(i => (
            <PulseRing key={i} delay={i * 800} withinRange={ready} />
          ))}
          <LinearGradient
            colors={ready ? [colors.electricAlpha['22'], 'rgba(0,229,160,0.03)'] : [colors.white06, 'transparent']}
            style={[
              styles.innerRing,
              ready
                ? { borderWidth: 2, borderColor: colors.electric, borderStyle: 'solid' }
                : { borderWidth: 1.5, borderColor: colors.white25, borderStyle: 'dashed' },
            ]}
          >
            <Icons.pin color={ready ? colors.electric : colors.white55} size={22} />
            <Text style={[styles.ringLabel, { color: ready ? colors.electric : colors.white55 }]}>
              {phase === 'loading' ? 'Loading…' : ready ? 'At venue' : busy ? 'Locating…' : 'Not checked in'}
            </Text>
          </LinearGradient>
        </View>

        <View style={{ alignItems: 'center' }}>
          <Text style={styles.statusTitle}>
            {phase === 'confirm' && 'Confirm your shift'}
            {phase === 'arrive' && 'Tap when you get there'}
            {phase === 'pin' && 'Ask the manager for the PIN'}
            {phase === 'loading' && 'Loading your shift…'}
            {phase === 'error' && 'Can’t check in'}
          </Text>
          {s ? (
            <Text style={styles.statusSub}>
              {phase === 'confirm' && `${s.role} at ${s.venue}${s.area ? ` · ${s.area}` : ''}. Let them know you’re coming.`}
              {phase === 'arrive' && `We check you’re within 500 m of ${s.venue}. Your location is only read when you tap.`}
              {phase === 'pin' && `You’re checked in at ${s.venue}. Enter the 4-digit start PIN from the manager to start your shift.`}
            </Text>
          ) : null}
        </View>

        {phase === 'pin' && (
          <View style={{ alignItems: 'center', gap: 8 }}>
            <TextInput
              value={pin}
              onChangeText={t => setPin(t.replace(/\D/g, '').slice(0, 4))}
              keyboardType="number-pad"
              maxLength={4}
              autoFocus
              placeholder="• • • •"
              placeholderTextColor={colors.white25}
              style={styles.pinInput}
              accessibilityLabel="Start PIN"
            />
            <Text style={styles.pinHint}>{view?.pinAttemptsLeft ?? 5} tries left</Text>
          </View>
        )}

        {message ? <Text style={styles.message}>{message}</Text> : null}

        <View style={styles.wiba}>
          <Icons.shield color={colors.electric} size={14} />
          <View style={{ flex: 1 }}>
            <Text style={styles.wibaTitle}>WIBA cover is checked when you arrive</Text>
            <Text style={styles.wibaSub}>You’re covered for the whole shift once it starts.</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        {phase === 'confirm' && <GradientBtn disabled={busy} onPress={confirm}>{busy ? 'Confirming…' : 'I’ll be there'}</GradientBtn>}
        {phase === 'arrive' && <GradientBtn disabled={busy} onPress={arrive}>{busy ? 'Checking location…' : 'I’ve arrived'}</GradientBtn>}
        {phase === 'pin' && <GradientBtn disabled={busy || pin.length !== 4} onPress={start}>{busy ? 'Starting…' : 'Start shift'}</GradientBtn>}
        {phase === 'error' && <GradientBtn onPress={() => navigation.goBack()}>Back</GradientBtn>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  header: { paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  countdown: { fontSize: 12, fontWeight: '700', color: colors.electric, fontFamily: typography.mono, marginTop: 2 },

  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 20 },

  ringOuter: { position: 'relative', width: 240, height: 240, alignItems: 'center', justifyContent: 'center' },
  innerRing: {
    width: 112, height: 112, borderRadius: 56,
    alignItems: 'center', justifyContent: 'center',
  },
  ringLabel: { fontSize: 10, fontWeight: '700', marginTop: 6, letterSpacing: 0.8, textTransform: 'uppercase' },

  statusTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -0.66, color: colors.white, marginBottom: 6 },
  statusSub: { fontSize: 12, color: colors.white55, lineHeight: 18.6, textAlign: 'center', paddingHorizontal: 8 },

  wiba: {
    width: '100%',
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.electricAlpha['04'],
    borderWidth: 1, borderColor: colors.electricAlpha['20'],
  },
  wibaTitle: { fontSize: 11.5, color: colors.white, fontWeight: '600' },
  wibaSub: { fontSize: 10, color: colors.white45 },

  footer: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 20 },
  pinInput: {
    width: 220, textAlign: 'center', fontSize: 34, fontWeight: '900', letterSpacing: 14,
    color: colors.white, fontFamily: typography.mono,
    paddingVertical: 12, borderRadius: 16, borderWidth: 1.5, borderColor: colors.electricAlpha['40'],
    backgroundColor: colors.electricAlpha['06'],
  },
  pinHint: { fontSize: 11, color: colors.white45 },
  message: { fontSize: 12.5, color: colors.warning, textAlign: 'center', fontWeight: '600', paddingHorizontal: 12 },
});
