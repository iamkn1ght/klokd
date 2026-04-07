import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useApi } from '../../hooks/useApi';
import { colors, gradients, typography, spacing, radius } from '../../theme';

type Props = { navigation: NativeStackNavigationProp<any> };

interface Shift {
  id: string;
  role: string;
  rateKes: number;
  locationName: string;
  startTime: string;
  endTime: string;
  distanceMeters: number;
  employer: { businessName: string; ratingAggregate: number | null; totalShifts: number };
}

export function HomeScreen({ navigation }: Props) {
  const { get } = useApi();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ showUpRate: 0, rating: 0, totalShifts: 0 });

  useEffect(() => {
    loadShifts();
  }, []);

  const loadShifts = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      let lat = -1.2921, lng = 36.8219; // Default: Nairobi CBD

      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        lat = loc.coords.latitude;
        lng = loc.coords.longitude;
      }

      const data = await get<Shift[]>(`/shifts/available?lat=${lat}&lng=${lng}&radiusKm=10`);
      setShifts(data || []);
    } catch {
      // Silently fail — show empty state
      setShifts([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDistance = (m: number) => m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)} km`;

  const formatTime = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const fmt = (d: Date) => d.toLocaleTimeString('en-KE', { hour: 'numeric', minute: '2-digit' });
    return `${fmt(s)}–${fmt(e)}`;
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good morning</Text>
            <Text style={styles.name}>Worker</Text>
          </View>
          <LinearGradient colors={[gradients.cta[0], gradients.cta[1]]} style={styles.avatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={styles.avatarText}>W</Text>
          </LinearGradient>
        </View>

        <View style={styles.statsCard}>
          <Text style={styles.statsLabel}>YOUR STATS</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.electric }]}>{stats.showUpRate}%</Text>
              <Text style={styles.statCaption}>Show-up</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.volt }]}>{stats.rating || '—'}</Text>
              <Text style={styles.statCaption}>Rating</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#fff' }]}>{stats.totalShifts}</Text>
              <Text style={styles.statCaption}>Shifts</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionLabel}>AVAILABLE SHIFTS NEAR YOU</Text>

        {loading && <ActivityIndicator color={colors.electric} style={{ marginTop: 20 }} />}

        {!loading && shifts.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyText}>No shifts nearby right now</Text>
            <Text style={styles.emptySub}>Pull down to refresh or check back later</Text>
          </View>
        )}

        {shifts.map((shift, i) => (
          <TouchableOpacity key={shift.id} style={[styles.shiftCard, i === 0 && styles.shiftCardHighlighted]}
            activeOpacity={0.7} onPress={() => navigation.navigate('ShiftDetail', { shiftId: shift.id })}>
            <View style={styles.shiftTop}>
              <Text style={styles.shiftRole}>{shift.role}</Text>
              <Text style={[styles.shiftRate, i === 0 ? { color: colors.electric } : { color: colors.white50 }]}>
                KES {shift.rateKes.toLocaleString()}
              </Text>
            </View>
            <Text style={styles.shiftVenue}>{shift.employer.businessName} · {shift.locationName || ''}</Text>
            <View style={styles.shiftPills}>
              <View style={[styles.pill, i === 0 ? styles.pillHighlighted : styles.pillDefault]}>
                <Text style={[styles.pillText, i === 0 && styles.pillTextHighlighted]}>
                  {formatTime(shift.startTime, shift.endTime)}
                </Text>
              </View>
              <View style={styles.pillDefault}>
                <Text style={styles.pillText}>{formatDistance(shift.distanceMeters)}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  scrollContent: { padding: spacing.lg, paddingBottom: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  greeting: { fontSize: 10, color: colors.white50, marginBottom: 2 },
  name: { fontSize: typography.size.h3, fontWeight: '700', color: '#fff', letterSpacing: -0.03 },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 11, fontWeight: '700', color: colors.ink },
  statsCard: { backgroundColor: colors.white08, borderRadius: radius.md, padding: 10, marginBottom: 10, borderWidth: 0.5, borderColor: colors.white10 },
  statsLabel: { fontSize: typography.size.nano, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: colors.electric, marginBottom: 6 },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: typography.size.h3, fontWeight: '700' },
  statCaption: { fontSize: typography.size.nano, color: colors.white42 },
  statDivider: { width: 0.5, height: 24, backgroundColor: colors.white10 },
  sectionLabel: { fontSize: typography.size.nano, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: colors.white42, marginBottom: 8 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 32, marginBottom: 10 },
  emptyText: { fontSize: typography.size.body, fontWeight: '600', color: colors.white50, marginBottom: 4 },
  emptySub: { fontSize: typography.size.label, color: colors.white30 },
  shiftCard: { backgroundColor: colors.white08, borderRadius: radius.md, padding: 10, marginBottom: 6, borderWidth: 0.5, borderColor: colors.white08 },
  shiftCardHighlighted: { borderWidth: 1.5, borderColor: colors.electricAlpha['40'] },
  shiftTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  shiftRole: { fontSize: 11, fontWeight: '700', color: '#fff' },
  shiftRate: { fontSize: 10, fontWeight: '700' },
  shiftVenue: { fontSize: 10, color: colors.white60, marginBottom: 6 },
  shiftPills: { flexDirection: 'row', gap: 6 },
  pill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  pillDefault: { backgroundColor: colors.white08, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  pillHighlighted: { backgroundColor: colors.electricAlpha['15'] },
  pillText: { fontSize: typography.size.nano, color: colors.white42 },
  pillTextHighlighted: { color: '#00A870' },
});
