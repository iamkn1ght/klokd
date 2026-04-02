import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GradientButton } from '../../components/GradientButton';
import { colors, typography, spacing, radius } from '../../theme';

type Props = {
  navigation: NativeStackNavigationProp<any>;
  route: { params: { shiftId: string } };
};

// Mock — in production fetched from API
const MOCK = {
  role: 'Waiter',
  employer: 'The Brew Bistro',
  location: 'Westlands',
  date: 'Today',
  time: '5pm – 10pm',
  distance: '1.2 km',
  rateKes: 1800,
  employerRating: 4.7,
  employerShifts: 28,
  mpesaMasked: '0722 ••• •••',
};

export function ShiftDetailScreen({ navigation, route }: Props) {
  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Back + title */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Shift details</Text>
        </View>

        {/* Main info card */}
        <View style={styles.infoCard}>
          <Text style={styles.role}>{MOCK.role}</Text>
          <Text style={styles.venue}>{MOCK.employer} · {MOCK.location}</Text>

          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Date</Text>
              <Text style={styles.gridValue}>{MOCK.date}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Time</Text>
              <Text style={styles.gridValue}>{MOCK.time}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Distance</Text>
              <Text style={styles.gridValue}>{MOCK.distance}</Text>
            </View>
            {/* Earnings — highlighted per mockup */}
            <View style={styles.gridItemEarnings}>
              <Text style={styles.earningsLabel}>You earn</Text>
              <Text style={styles.earningsValue}>KES {MOCK.rateKes.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        {/* Employer card */}
        <View style={styles.employerCard}>
          <Text style={styles.sectionLabel}>EMPLOYER</Text>
          <View style={styles.employerRow}>
            <View>
              <Text style={styles.employerName}>{MOCK.employer}</Text>
              <Text style={styles.employerSub}>{MOCK.employerShifts} shifts posted · {MOCK.location}</Text>
            </View>
            <View style={styles.ratingBadge}>
              <View style={styles.ratingDot} />
              <Text style={styles.ratingText}>{MOCK.employerRating}</Text>
            </View>
          </View>
        </View>

        {/* Payment guarantee strip */}
        <View style={styles.guaranteeStrip}>
          <Text style={styles.guaranteeTitle}>Payment guarantee</Text>
          <Text style={styles.guaranteeSub}>
            M-Pesa to {MOCK.mpesaMasked} within 30 min of shift end
          </Text>
        </View>
      </ScrollView>

      {/* CTAs */}
      <View style={styles.footer}>
        <GradientButton
          title="Accept shift"
          onPress={() => navigation.navigate('ClockIn', { shiftId: route.params.shiftId })}
        />
        <TouchableOpacity style={styles.declineBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.declineText}>Decline</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  scrollContent: { padding: spacing.lg, paddingBottom: 20 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  backBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: colors.white30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: { color: '#fff', fontSize: 14, marginTop: -1 },
  title: { fontSize: typography.size.body, fontWeight: '700', color: '#fff', letterSpacing: -0.02 },

  // Info card
  infoCard: {
    backgroundColor: colors.white08,
    borderRadius: radius.lg,
    padding: 12,
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: colors.white10,
  },
  role: { fontSize: typography.size.h2, fontWeight: '700', color: '#fff', marginBottom: 2, letterSpacing: -0.02 },
  venue: { fontSize: 11, color: colors.white60, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridItem: {
    width: '47%',
    backgroundColor: colors.white08,
    borderRadius: radius.sm,
    padding: 8,
  },
  gridLabel: { fontSize: typography.size.nano, color: colors.white42, marginBottom: 2 },
  gridValue: { fontSize: 11, fontWeight: '600', color: '#fff' },
  gridItemEarnings: {
    width: '47%',
    backgroundColor: colors.electricAlpha['15'],
    borderRadius: radius.sm,
    padding: 8,
    borderWidth: 0.5,
    borderColor: colors.electricAlpha['22'],
  },
  earningsLabel: { fontSize: typography.size.nano, color: '#00A870', marginBottom: 2 },
  earningsValue: { fontSize: typography.size.body, fontWeight: '700', color: colors.electric },

  // Employer
  employerCard: {
    backgroundColor: colors.white08,
    borderRadius: radius.md,
    padding: 10,
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: colors.white08,
  },
  sectionLabel: {
    fontSize: typography.size.nano,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.white42,
    marginBottom: 6,
  },
  employerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  employerName: { fontSize: 11, fontWeight: '600', color: '#fff' },
  employerSub: { fontSize: 10, color: colors.white50 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.volt },
  ratingText: { fontSize: 11, fontWeight: '700', color: colors.volt },

  // Payment guarantee
  guaranteeStrip: {
    backgroundColor: colors.white08,
    borderRadius: 10,
    padding: 8,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: colors.electric,
    marginBottom: 12,
  },
  guaranteeTitle: { fontSize: typography.size.nano, color: '#00A870', fontWeight: '600', marginBottom: 2 },
  guaranteeSub: { fontSize: typography.size.nano, color: colors.white60 },

  // Footer
  footer: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  declineBtn: {
    backgroundColor: colors.white08,
    borderRadius: radius.md,
    padding: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  declineText: { fontSize: 11, color: colors.white50 },
});
