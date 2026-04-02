import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, typography, spacing, radius } from '../../theme';

const TEAM = [
  { initials: 'AK', name: 'Akinyi K.', shifts: 12, showUp: 94, rating: 4.8, skills: ['Waiter'], top: true },
  { initials: 'JM', name: 'James M.', shifts: 5, showUp: 88, rating: 4.5, skills: ['Waiter', 'Barista'], top: false },
  { initials: 'BN', name: 'Beatrice N.', shifts: 3, showUp: 83, rating: 4.3, skills: ['Waiter'], top: false },
];

export function TeamScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Team</Text>
      <Text style={styles.sub}>Workers you've hired before</Text>

      <FlatList
        data={TEAM}
        keyExtractor={item => item.initials}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardRow}>
              {item.top ? (
                <LinearGradient colors={[...gradients.cta]} style={styles.avatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Text style={styles.avatarText}>{item.initials}</Text>
                </LinearGradient>
              ) : (
                <View style={[styles.avatar, { backgroundColor: colors.soft }]}>
                  <Text style={[styles.avatarText, { color: colors.mid }]}>{item.initials}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>{item.shifts} shifts with you · {item.showUp}% show-up · {item.rating} ★</Text>
              </View>
            </View>
            <View style={styles.skillsRow}>
              {item.skills.map(s => (
                <View key={s} style={styles.skillChip}>
                  <Text style={styles.skillText}>{s}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.mist, padding: spacing.lg, paddingTop: spacing.xl },
  title: { fontSize: typography.size.h2, fontWeight: '700', color: colors.ink, marginBottom: 2 },
  sub: { fontSize: typography.size.caption, color: colors.mid, marginBottom: 16 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 12, marginBottom: 8, borderWidth: 0.5, borderColor: colors.soft },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 11, fontWeight: '700', color: colors.ink },
  name: { fontSize: typography.size.body, fontWeight: '700', color: colors.ink },
  meta: { fontSize: 10, color: colors.mid, marginTop: 2 },
  skillsRow: { flexDirection: 'row', gap: 4 },
  skillChip: { backgroundColor: colors.electricAlpha['10'], paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  skillText: { fontSize: 8, fontWeight: '600', color: '#00A870' },
});
