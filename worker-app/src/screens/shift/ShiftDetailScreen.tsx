import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GradientButton } from '../../components/GradientButton';
import { useApi } from '../../hooks/useApi';
import { colors, typography, spacing, radius } from '../../theme';

type Props = {
  navigation: NativeStackNavigationProp<any>;
  route: { params: { shiftId: string } };
};

export function ShiftDetailScreen({ navigation, route }: Props) {
  const { get, post } = useApi();
  const [shift, setShift] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    loadShift();
  }, []);

  const loadShift = async () => {
    try {
      const data = await get(`/shifts/${route.params.shiftId}`);
      setShift(data);
    } catch {
      Alert.alert('Error', 'Failed to load shift details');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    setApplying(true);
    try {
      await post(`/shifts/${route.params.shiftId}/apply`);
      Alert.alert('Applied!', 'Your application has been submitted. You\'ll be notified when confirmed.');
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to apply');
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return <View style={styles.screen}><ActivityIndicator color={colors.electric} style={{ marginTop: 60 }} /></View>;
  }
  if (!shift) {
    return <View style={styles.screen}><Text style={{ color: colors.white50, textAlign: 'center', marginTop: 60 }}>Shift not found</Text></View>;
  }

  const fmtTime = (d: string) => new Date(d).toLocaleTimeString('en-KE', { hour: 'numeric', minute: '2-digit' });

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Shift details</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.role}>{shift.role}</Text>
          <Text style={styles.venue}>{shift.employer?.businessName} · {shift.locationName || ''}</Text>
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Date</Text>
              <Text style={styles.gridValue}>{new Date(shift.date).toLocaleDateString('en-KE', { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Time</Text>
              <Text style={styles.gridValue}>{fmtTime(shift.startTime)} – {fmtTime(shift.endTime)}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Distance</Text>
              <Text style={styles.gridValue}>{shift.distanceMeters ? `${(shift.distanceMeters / 1000).toFixed(1)} km` : '—'}</Text>
            </View>
            <View style={styles.gridItemEarnings}>
              <Text style={styles.earningsLabel}>You earn</Text>
              <Text style={styles.earningsValue}>KES {shift.rateKes?.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        {shift.employer && (
          <View style={styles.employerCard}>
            <Text style={styles.sectionLabel}>EMPLOYER</Text>
            <View style={styles.employerRow}>
              <View>
                <Text style={styles.employerName}>{shift.employer.businessName}</Text>
                <Text style={styles.employerSub}>{shift.employer.totalShifts} shifts posted</Text>
              </View>
              {shift.employer.ratingAggregate && (
                <View style={styles.ratingBadge}>
                  <View style={styles.ratingDot} />
                  <Text style={styles.ratingText}>{shift.employer.ratingAggregate.toFixed(1)}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        <View style={styles.guaranteeStrip}>
          <Text style={styles.guaranteeTitle}>Payment guarantee</Text>
          <Text style={styles.guaranteeSub}>M-Pesa payment within 30 min of shift end</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <GradientButton title={applying ? 'Applying...' : 'Accept shift'} onPress={handleAccept} disabled={applying} />
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
  backBtn: { width: 20, height: 20, borderRadius: 10, borderWidth: 0.5, borderColor: colors.white30, alignItems: 'center', justifyContent: 'center' },
  backArrow: { color: '#fff', fontSize: 14, marginTop: -1 },
  title: { fontSize: typography.size.body, fontWeight: '700', color: '#fff', letterSpacing: -0.02 },
  infoCard: { backgroundColor: colors.white08, borderRadius: radius.lg, padding: 12, marginBottom: 10, borderWidth: 0.5, borderColor: colors.white10 },
  role: { fontSize: typography.size.h2, fontWeight: '700', color: '#fff', marginBottom: 2, letterSpacing: -0.02 },
  venue: { fontSize: 11, color: colors.white60, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridItem: { width: '47%', backgroundColor: colors.white08, borderRadius: radius.sm, padding: 8 },
  gridLabel: { fontSize: typography.size.nano, color: colors.white42, marginBottom: 2 },
  gridValue: { fontSize: 11, fontWeight: '600', color: '#fff' },
  gridItemEarnings: { width: '47%', backgroundColor: colors.electricAlpha['15'], borderRadius: radius.sm, padding: 8, borderWidth: 0.5, borderColor: colors.electricAlpha['22'] },
  earningsLabel: { fontSize: typography.size.nano, color: '#00A870', marginBottom: 2 },
  earningsValue: { fontSize: typography.size.body, fontWeight: '700', color: colors.electric },
  employerCard: { backgroundColor: colors.white08, borderRadius: radius.md, padding: 10, marginBottom: 10, borderWidth: 0.5, borderColor: colors.white08 },
  sectionLabel: { fontSize: typography.size.nano, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: colors.white42, marginBottom: 6 },
  employerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  employerName: { fontSize: 11, fontWeight: '600', color: '#fff' },
  employerSub: { fontSize: 10, color: colors.white50 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.volt },
  ratingText: { fontSize: 11, fontWeight: '700', color: colors.volt },
  guaranteeStrip: { backgroundColor: colors.white08, borderRadius: 10, padding: 8, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: colors.electric, marginBottom: 12 },
  guaranteeTitle: { fontSize: typography.size.nano, color: '#00A870', fontWeight: '600', marginBottom: 2 },
  guaranteeSub: { fontSize: typography.size.nano, color: colors.white60 },
  footer: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  declineBtn: { backgroundColor: colors.white08, borderRadius: radius.md, padding: 10, alignItems: 'center', marginTop: 8 },
  declineText: { fontSize: 11, color: colors.white50 },
});
