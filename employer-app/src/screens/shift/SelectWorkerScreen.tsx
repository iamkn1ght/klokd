import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientButton } from '../../components/GradientButton';
import { colors, gradients, typography, spacing, radius } from '../../theme';

type Props = { navigation: NativeStackNavigationProp<any> };

const WORKERS = [
  { initials: 'AK', name: 'Akinyi K.', shifts: 47, showUp: 94, rating: 4.8, distance: 1.2, skills: ['Waiter', 'Food handler cert'], top: true },
  { initials: 'JM', name: 'James M.', shifts: 23, showUp: 88, rating: 4.5, distance: 2.8, skills: ['Waiter'], top: false },
  { initials: 'BN', name: 'Beatrice N.', shifts: 12, showUp: 83, rating: 4.3, distance: 4.1, skills: ['Waiter'], top: false },
];

export function SelectWorkerScreen({ navigation }: Props) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Matched workers</Text>
        <Text style={styles.count}>{WORKERS.length} available</Text>
      </View>
      <Text style={styles.sortLabel}>SORTED BY PROXIMITY + RATING</Text>

      {WORKERS.map((w, i) => (
        <View key={i} style={[styles.workerCard, w.top && styles.workerCardTop, !w.top && { opacity: i === 1 ? 0.85 : 0.65 }]}>
          <View style={styles.workerHeader}>
            <View style={styles.workerLeft}>
              {w.top ? (
                <LinearGradient colors={[...gradients.cta]} style={styles.workerAvatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Text style={styles.workerInitials}>{w.initials}</Text>
                </LinearGradient>
              ) : (
                <View style={[styles.workerAvatar, { backgroundColor: colors.soft }]}>
                  <Text style={[styles.workerInitials, { color: colors.mid }]}>{w.initials}</Text>
                </View>
              )}
              <View>
                <Text style={styles.workerName}>{w.name}</Text>
                <Text style={styles.workerMeta}>{w.shifts} shifts · {w.showUp}% show-up</Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.workerRating, w.top && { color: '#00A870' }]}>{w.rating} ★</Text>
              <Text style={styles.workerDistance}>{w.distance} km</Text>
            </View>
          </View>

          {w.top && (
            <View style={styles.skillsRow}>
              {w.skills.map(s => (
                <View key={s} style={[styles.skillChip, s.includes('cert') ? styles.skillChipCert : styles.skillChipRole]}>
                  <Text style={[styles.skillText, s.includes('cert') ? { color: colors.mid } : { color: '#00A870' }]}>{s}</Text>
                </View>
              ))}
            </View>
          )}

          {w.top ? (
            <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.goBack()}>
              <LinearGradient colors={[...gradients.cta]} style={styles.selectBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Text style={styles.selectBtnText}>Select {w.name.split(' ')[0]}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.selectBtnGhost}>
              <Text style={styles.selectBtnGhostText}>Select {w.name.split(' ')[0]}</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.mist },
  scrollContent: { padding: spacing.lg, paddingBottom: 40 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: typography.size.body, fontWeight: '700', color: colors.ink, letterSpacing: -0.02 },
  count: { fontSize: 10, color: colors.mid },
  sortLabel: { fontSize: typography.size.nano, fontWeight: '700', letterSpacing: 0.8, color: colors.mid, marginBottom: 8 },

  workerCard: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 11, marginBottom: 7, borderWidth: 0.5, borderColor: colors.soft },
  workerCardTop: { borderWidth: 1.5, borderColor: colors.electricAlpha['50'] },
  workerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  workerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  workerAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  workerInitials: { fontSize: 10, fontWeight: '700', color: colors.ink },
  workerName: { fontSize: 11, fontWeight: '700', color: colors.ink },
  workerMeta: { fontSize: typography.size.nano, color: colors.mid },
  workerRating: { fontSize: 12, fontWeight: '700', color: colors.mid },
  workerDistance: { fontSize: typography.size.nano, color: colors.mid },

  skillsRow: { flexDirection: 'row', gap: 4, marginBottom: 8 },
  skillChip: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  skillChipRole: { backgroundColor: colors.electricAlpha['15'] },
  skillChipCert: { backgroundColor: colors.mist },
  skillText: { fontSize: 8, fontWeight: '600' },

  selectBtn: { borderRadius: radius.sm, padding: 7, alignItems: 'center' },
  selectBtnText: { fontSize: 11, fontWeight: '700', color: colors.ink },
  selectBtnGhost: { backgroundColor: colors.mist, borderRadius: radius.sm, padding: 7, alignItems: 'center', borderWidth: 0.5, borderColor: colors.soft },
  selectBtnGhostText: { fontSize: 11, color: colors.mid },
});
