/**
 * Home screen — "Your ledger" card + sorted shift feed.
 * Ported 1:1 from claude-design/screens/main.jsx
 */
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { StatusPill, Label, VLine } from '../../components/Primitives';
import { Icons } from '../../components/Icons';
import { useApi } from '../../hooks/useApi';
import { colors, typography } from '../../theme';

type Props = { navigation: NativeStackNavigationProp<any> };

const DEMO_SHIFTS = [
  { id: 's1', role: 'Waiter', venue: 'The Brew Bistro', area: 'Westlands', date: 'Tonight', time: '5:00 – 10:00 PM', pay: 1800, dist: '0.8 km', rating: 4.8, shifts: 23, highlighted: true },
  { id: 's2', role: 'Barista', venue: 'Java House · Sarit', area: 'Sarit Centre', date: 'Tomorrow', time: '7:00 AM – 2:00 PM', pay: 2100, dist: '1.6 km', rating: 4.6, shifts: 41 },
  { id: 's3', role: 'Bartender', venue: 'Brew Bistro · Kilimani', area: 'Kilimani', date: 'Fri', time: '6:00 – 11:00 PM', pay: 2200, dist: '3.1 km', rating: 4.7, shifts: 12 },
  { id: 's4', role: 'Cashier', venue: 'Artcaffe · Westgate', area: 'Westlands', date: 'Sat', time: '9:00 AM – 5:00 PM', pay: 1600, dist: '1.2 km', rating: 4.5, shifts: 67 },
];

function Stat({ n, l, color, star }: { n: string; l: string; color: string; star?: boolean }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
        <Text style={{ fontSize: 18, fontWeight: '900', color, letterSpacing: -0.36 }}>{n}</Text>
        {star && <Icons.star color={color} size={11} />}
      </View>
      <Text style={{ fontSize: 9.5, color: colors.white40, letterSpacing: 0.76, textTransform: 'uppercase', marginTop: 3 }}>{l}</Text>
    </View>
  );
}

function TimePill({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'volt' }) {
  const map = {
    neutral: { bg: colors.white05, c: colors.white65 },
    volt: { bg: 'rgba(188,255,78,0.1)', c: colors.volt },
  };
  const t = map[tone];
  return (
    <View style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, backgroundColor: t.bg }}>
      <Text style={{ fontSize: 10.5, fontWeight: '600', color: t.c, letterSpacing: 0.21 }}>{label}</Text>
    </View>
  );
}

function ShiftCard({ shift, dim = 0, onPress }: { shift: typeof DEMO_SHIFTS[0]; dim?: number; onPress: () => void }) {
  const isHi = shift.highlighted;
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={{
        borderRadius: 16,
        padding: 14,
        backgroundColor: isHi ? 'rgba(0,229,160,0.035)' : 'rgba(255,255,255,0.025)',
        borderWidth: 1,
        borderColor: isHi ? colors.electricAlpha['40'] : colors.white06,
        opacity: 1 - dim,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: colors.white, letterSpacing: -0.28 }}>{shift.role}</Text>
            {isHi && <StatusPill tone="mint">New</StatusPill>}
          </View>
          <Text style={{ fontSize: 11.5, color: colors.white55, marginBottom: 3 }}>{shift.venue}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Icons.pin color={colors.white40} size={10} />
              <Text style={{ fontSize: 10, color: colors.white40 }}>{shift.dist}</Text>
            </View>
            <Text style={{ fontSize: 10, color: colors.white25 }}>·</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Icons.star color={colors.volt} size={10} />
              <Text style={{ fontSize: 10, color: colors.white40 }}>{shift.rating}</Text>
            </View>
            <Text style={{ fontSize: 10, color: colors.white25 }}>·</Text>
            <Text style={{ fontSize: 10, color: colors.white40 }}>{shift.shifts} shifts</Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 17, fontWeight: '900', color: colors.electric, letterSpacing: -0.34 }}>KES {shift.pay.toLocaleString()}</Text>
          <Text style={{ fontSize: 10, color: colors.white45, marginTop: 2 }}>{shift.date}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        <TimePill label={shift.time} />
        <TimePill label={shift.area} />
        {isHi && <TimePill label="Fills fast" tone="volt" />}
      </View>
    </TouchableOpacity>
  );
}

export function HomeScreen({ navigation }: Props) {
  const [shifts, setShifts] = useState(DEMO_SHIFTS);
  const { get } = useApi();

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        let lat = -1.2921, lng = 36.8219;
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          lat = loc.coords.latitude;
          lng = loc.coords.longitude;
        }
        await get(`/shifts/available?lat=${lat}&lng=${lng}&radiusKm=10`);
      } catch {}
    })();
  }, []);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.date}>Thursday · 3 Apr</Text>
            <Text style={styles.greeting}>Good morning, Akinyi</Text>
          </View>
          <View style={{ position: 'relative' }}>
            <TouchableOpacity style={styles.bellBtn}>
              <Icons.bell color={colors.white} size={16} />
            </TouchableOpacity>
            <View style={styles.bellDot} />
          </View>
        </View>

        {/* Ledger card */}
        <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
          <View style={styles.ledger}>
            <View style={styles.ledgerHead}>
              <Label color={colors.white40}>Your ledger · 47 shifts</Label>
              <Text style={styles.verified}>VERIFIED</Text>
            </View>
            <View style={{ flexDirection: 'row' }}>
              <Stat n="94%" l="show-up" color={colors.electric} />
              <VLine />
              <Stat n="4.8" l="rating" color={colors.volt} star />
              <VLine />
              <Stat n="KES 84k" l="this month" color={colors.white} />
            </View>
          </View>
        </View>

        {/* Shift feed */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Label>Shifts near you · {shifts.length}</Label>
            <Text style={{ fontSize: 10, color: colors.white35 }}>Sorted by distance</Text>
          </View>
          <View style={{ gap: 10 }}>
            {shifts.map((s, i) => (
              <ShiftCard
                key={s.id}
                shift={s}
                dim={i > 0 ? 0.06 * i : 0}
                onPress={() => navigation.navigate('ShiftDetail', { shift: s })}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  headerRow: { paddingHorizontal: 20, paddingTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  date: { fontSize: 11, color: colors.white45, marginBottom: 2 },
  greeting: { fontSize: 22, fontWeight: '900', letterSpacing: -0.66, color: colors.white },
  bellBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.white05,
    borderWidth: 0.5, borderColor: colors.white08,
    alignItems: 'center', justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute', top: 6, right: 6,
    width: 7, height: 7, borderRadius: 3.5,
    backgroundColor: colors.electric,
    borderWidth: 1.5, borderColor: colors.ink,
  },
  ledger: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: colors.white03,
    borderWidth: 1, borderColor: colors.white06,
  },
  ledgerHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  verified: { fontSize: 10, color: colors.electric, fontWeight: '700' },
});
