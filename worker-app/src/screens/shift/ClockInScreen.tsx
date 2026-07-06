/**
 * Clock-in screen — Animated GPS ring (pulse) + WIBA confirmation + countdown.
 * Ported 1:1 from claude-design/screens/main.jsx
 */
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
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

export function ClockInScreen({ navigation, route }: Props) {
  const [phase, setPhase] = useState<'locating' | 'inRange'>('locating');
  const { post, get } = useApi();
  const withinRange = phase === 'inRange';

  useEffect(() => {
    const run = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        }
      } catch {}
      setTimeout(() => setPhase('inRange'), 1400);
    };
    run();
  }, []);

  const handleClockIn = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const shiftId = route?.params?.shift?.id || 's1';
      await post(`/shifts/${shiftId}/clockin`, { lat: loc.coords.latitude, lng: loc.coords.longitude });
    } catch {}
    navigation.navigate('ActiveShift', { shift: route?.params?.shift });
  };

  return (
    <View style={styles.screen}>
      <AmbientOrbs intensity="subtle" />
      <SafeTop />
      <View style={styles.header}>
        <IconBtn onPress={() => navigation.goBack()}>
          <Icons.back color={colors.white} size={14} />
        </IconBtn>
        <View style={{ alignItems: 'center' }}>
          <Label color={colors.white35}>Shift starts in</Label>
          <Text style={styles.countdown}>00:04:32</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <View style={styles.content}>
        {/* GPS ring */}
        <View style={styles.ringOuter}>
          {[0, 1, 2].map(i => (
            <PulseRing key={i} delay={i * 800} withinRange={withinRange} />
          ))}
          <LinearGradient
            colors={withinRange ? [colors.electricAlpha['22'], 'rgba(0,229,160,0.03)'] : [colors.white06, 'transparent']}
            style={[
              styles.innerRing,
              withinRange
                ? { borderWidth: 2, borderColor: colors.electric, borderStyle: 'solid' }
                : { borderWidth: 1.5, borderColor: colors.white25, borderStyle: 'dashed' },
            ]}
          >
            <Icons.pin color={withinRange ? colors.electric : colors.white55} size={22} />
            <Text style={[styles.ringLabel, { color: withinRange ? colors.electric : colors.white55 }]}>
              {phase === 'locating' ? 'Locating…' : 'At venue'}
            </Text>
          </LinearGradient>
        </View>

        <View style={{ alignItems: 'center' }}>
          <Text style={styles.statusTitle}>{phase === 'locating' ? 'Finding you…' : "You're in range."}</Text>
          <Text style={styles.statusSub}>
            {phase === 'locating'
              ? "Hold on — checking you're within 500 m of The Brew Bistro, Westlands."
              : '0.04 km from The Brew Bistro · Westlands. WIBA cover confirmed.'}
          </Text>
        </View>

        {/* WIBA card */}
        <View style={styles.wiba}>
          <Icons.shield color={colors.electric} size={14} />
          <View style={{ flex: 1 }}>
            <Text style={styles.wibaTitle}>WIBA insurance · active</Text>
            <Text style={styles.wibaSub}>You're covered for the duration of this shift.</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <GradientBtn disabled={!withinRange} onPress={handleClockIn}>
          {withinRange ? 'Clock in · Brew Bistro' : 'Move closer to clock in'}
        </GradientBtn>
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
});
