import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, FlatList,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, typography, spacing, radius } from '../../theme';

type Props = { navigation: NativeStackNavigationProp<any> };

// Mock data — in production fetched from API
const MOCK_STATS = { showUpRate: 94, rating: 4.8, totalShifts: 47 };

const MOCK_SHIFTS = [
  {
    id: '1',
    role: 'Waiter',
    employer: 'The Brew Bistro',
    location: 'Westlands',
    rateKes: 1800,
    time: 'Today 5pm–10pm',
    distanceKm: 1.2,
    highlighted: true,
  },
  {
    id: '2',
    role: 'Barista',
    employer: 'Java House',
    location: 'Kilimani',
    rateKes: 1500,
    time: 'Sat 8am–3pm',
    distanceKm: 3.4,
    highlighted: false,
  },
  {
    id: '3',
    role: 'Cashier',
    employer: 'Artcaffe',
    location: 'Junction',
    rateKes: 1600,
    time: 'Sun 10am–4pm',
    distanceKm: 4.1,
    highlighted: false,
  },
];

export function HomeScreen({ navigation }: Props) {
  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good morning</Text>
            <Text style={styles.name}>Akinyi</Text>
          </View>
          <LinearGradient
            colors={[...gradients.cta]}
            style={styles.avatar}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.avatarText}>AK</Text>
          </LinearGradient>
        </View>

        {/* Stats card */}
        <View style={styles.statsCard}>
          <Text style={styles.statsLabel}>YOUR STATS</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.electric }]}>
                {MOCK_STATS.showUpRate}%
              </Text>
              <Text style={styles.statCaption}>Show-up</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.volt }]}>
                {MOCK_STATS.rating}
              </Text>
              <Text style={styles.statCaption}>Rating</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#fff' }]}>
                {MOCK_STATS.totalShifts}
              </Text>
              <Text style={styles.statCaption}>Shifts</Text>
            </View>
          </View>
        </View>

        {/* Section header */}
        <Text style={styles.sectionLabel}>AVAILABLE SHIFTS NEAR YOU</Text>

        {/* Shift cards */}
        {MOCK_SHIFTS.map(shift => (
          <TouchableOpacity
            key={shift.id}
            style={[styles.shiftCard, shift.highlighted && styles.shiftCardHighlighted]}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('ShiftDetail', { shiftId: shift.id })}
          >
            <View style={styles.shiftTop}>
              <Text style={styles.shiftRole}>{shift.role}</Text>
              <Text style={[
                styles.shiftRate,
                shift.highlighted ? { color: colors.electric } : { color: colors.white50 },
              ]}>
                KES {shift.rateKes.toLocaleString()}
              </Text>
            </View>
            <Text style={styles.shiftVenue}>
              {shift.employer} · {shift.location}
            </Text>
            <View style={styles.shiftPills}>
              <View style={[styles.pill, shift.highlighted ? styles.pillHighlighted : styles.pillDefault]}>
                <Text style={[styles.pillText, shift.highlighted && styles.pillTextHighlighted]}>
                  {shift.time}
                </Text>
              </View>
              <View style={styles.pillDefault}>
                <Text style={styles.pillText}>{shift.distanceKm} km</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  greeting: { fontSize: 10, color: colors.white50, marginBottom: 2 },
  name: { fontSize: typography.size.h3, fontWeight: '700', color: '#fff', letterSpacing: -0.03 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 11, fontWeight: '700', color: colors.ink },

  // Stats
  statsCard: {
    backgroundColor: colors.white08,
    borderRadius: radius.md,
    padding: 10,
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: colors.white10,
  },
  statsLabel: {
    fontSize: typography.size.nano,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.electric,
    marginBottom: 6,
  },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: typography.size.h3, fontWeight: '700' },
  statCaption: { fontSize: typography.size.nano, color: colors.white42 },
  statDivider: { width: 0.5, height: 24, backgroundColor: colors.white10 },

  // Section
  sectionLabel: {
    fontSize: typography.size.nano,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.white42,
    marginBottom: 8,
  },

  // Shift cards
  shiftCard: {
    backgroundColor: colors.white08,
    borderRadius: radius.md,
    padding: 10,
    marginBottom: 6,
    borderWidth: 0.5,
    borderColor: colors.white08,
  },
  shiftCardHighlighted: {
    borderWidth: 1.5,
    borderColor: colors.electricAlpha['40'],
  },
  shiftTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  shiftRole: { fontSize: 11, fontWeight: '700', color: '#fff' },
  shiftRate: { fontSize: 10, fontWeight: '700' },
  shiftVenue: { fontSize: 10, color: colors.white60, marginBottom: 6 },
  shiftPills: { flexDirection: 'row', gap: 6 },
  pill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  pillDefault: {
    backgroundColor: colors.white08,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  pillHighlighted: { backgroundColor: colors.electricAlpha['15'] },
  pillText: { fontSize: typography.size.nano, color: colors.white42 },
  pillTextHighlighted: { color: '#00A870' },
});
