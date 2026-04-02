import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useApi } from '../../hooks/useApi';
import { colors, gradients, typography, spacing, radius } from '../../theme';

type Props = { navigation: NativeStackNavigationProp<any> };

const UPCOMING = [
  { role: 'Waiter', time: 'Tonight 5–10pm', worker: 'Akinyi K. · 4.8 ★', status: 'Confirmed', color: colors.electric },
  { role: 'Chef', time: 'Sat 12–8pm', worker: 'Awaiting confirmation', status: 'Pending', color: colors.warning },
];

export function DashboardScreen({ navigation }: Props) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good morning</Text>
          <Text style={styles.name}>Wanjiku</Text>
        </View>
        <LinearGradient colors={[colors.volt, colors.electric]} style={styles.avatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Text style={styles.avatarText}>WN</Text>
        </LinearGradient>
      </View>

      {/* Active shifts card (dark card on light shell) */}
      <View style={styles.activeCard}>
        <Text style={styles.activeLabel}>ACTIVE SHIFTS TODAY</Text>
        <View style={styles.activeGrid}>
          <View style={styles.activeItem}>
            <Text style={[styles.activeNum, { color: colors.electric }]}>3</Text>
            <Text style={styles.activeSub}>Confirmed</Text>
          </View>
          <View style={styles.activeItem}>
            <Text style={[styles.activeNum, { color: colors.error }]}>1</Text>
            <Text style={styles.activeSub}>Pending</Text>
          </View>
        </View>
      </View>

      {/* Post a shift CTA */}
      <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('PostShift')}>
        <LinearGradient colors={[...gradients.cta]} style={styles.postCta} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View>
            <Text style={styles.postCtaTitle}>Post a shift</Text>
            <Text style={styles.postCtaSub}>Under 2 minutes</Text>
          </View>
          <View style={styles.postCtaArrow}>
            <Text style={{ color: colors.ink, fontWeight: '700' }}>→</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {/* Upcoming */}
      <Text style={styles.sectionLabel}>UPCOMING SHIFTS</Text>
      {UPCOMING.map((shift, i) => (
        <View key={i} style={styles.upcomingCard}>
          <View style={styles.upcomingTop}>
            <Text style={styles.upcomingTitle}>{shift.role} · {shift.time}</Text>
            <View style={[styles.statusDot, { backgroundColor: shift.color }]} />
          </View>
          <Text style={styles.upcomingWorker}>{shift.worker} · {shift.status}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.mist },
  scrollContent: { padding: spacing.lg, paddingTop: spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  greeting: { fontSize: 10, color: colors.mid, marginBottom: 2 },
  name: { fontSize: typography.size.h3, fontWeight: '700', color: colors.ink, letterSpacing: -0.03 },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 11, fontWeight: '700', color: colors.ink },

  activeCard: { backgroundColor: colors.ink, borderRadius: radius.lg, padding: 12, marginBottom: 10 },
  activeLabel: { fontSize: typography.size.nano, fontWeight: '700', letterSpacing: 1, color: colors.electric, marginBottom: 8 },
  activeGrid: { flexDirection: 'row', gap: 6 },
  activeItem: { flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: radius.sm, padding: 8, alignItems: 'center' },
  activeNum: { fontSize: typography.size.h2, fontWeight: '700' },
  activeSub: { fontSize: typography.size.nano, color: 'rgba(255,255,255,0.4)' },

  postCta: { borderRadius: radius.lg, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  postCtaTitle: { fontSize: 11, fontWeight: '700', color: colors.ink },
  postCtaSub: { fontSize: typography.size.nano, color: 'rgba(10,10,15,0.5)' },
  postCtaArrow: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(10,10,15,0.12)', alignItems: 'center', justifyContent: 'center' },

  sectionLabel: { fontSize: typography.size.nano, fontWeight: '700', letterSpacing: 1, color: colors.mid, marginBottom: 8 },
  upcomingCard: { backgroundColor: colors.white, borderRadius: radius.md, padding: 10, marginBottom: 6, borderWidth: 0.5, borderColor: colors.soft },
  upcomingTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  upcomingTitle: { fontSize: 11, fontWeight: '600', color: colors.ink },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginTop: 2 },
  upcomingWorker: { fontSize: 10, color: colors.mid },
});
