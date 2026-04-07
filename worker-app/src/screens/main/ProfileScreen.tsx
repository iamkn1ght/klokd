import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { colors, gradients, typography, spacing, radius } from '../../theme';

const MOCK_PROFILE = {
  firstName: 'Akinyi',
  lastName: 'K.',
  phone: '0722 ••• •••',
  verified: true,
  skills: ['Waiter', 'Barista'],
  showUpRate: 94,
  rating: 4.8,
  totalShifts: 47,
};

const MENU_ITEMS = [
  { label: 'Edit skills', icon: '🎯' },
  { label: 'ID verification', icon: '🪪', badge: 'Verified' },
  { label: 'M-Pesa settings', icon: '💰' },
  { label: 'Privacy & data', icon: '🔒' },
  { label: 'Help & support', icon: '💬' },
  { label: 'Sign out', icon: '👋', danger: true },
];

export function ProfileScreen() {
  const { logout } = useAuth();

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => logout() },
    ]);
  };
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
      {/* Profile header */}
      <View style={styles.headerCard}>
        <LinearGradient
          colors={[gradients.cta[0], gradients.cta[1]]}
          style={styles.avatar}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.avatarText}>AK</Text>
        </LinearGradient>
        <Text style={styles.name}>{MOCK_PROFILE.firstName} {MOCK_PROFILE.lastName}</Text>
        <Text style={styles.phone}>{MOCK_PROFILE.phone}</Text>
        {MOCK_PROFILE.verified && (
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedText}>✦ Verified</Text>
          </View>
        )}

        {/* Skills chips */}
        <View style={styles.skillsRow}>
          {MOCK_PROFILE.skills.map(skill => (
            <View key={skill} style={styles.skillChip}>
              <Text style={styles.skillText}>{skill}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.electric }]}>{MOCK_PROFILE.showUpRate}%</Text>
          <Text style={styles.statLabel}>Show-up rate</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.volt }]}>{MOCK_PROFILE.rating}</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{MOCK_PROFILE.totalShifts}</Text>
          <Text style={styles.statLabel}>Shifts</Text>
        </View>
      </View>

      {/* Menu */}
      <View style={styles.menuCard}>
        {MENU_ITEMS.map((item, i) => (
          <TouchableOpacity
            key={item.label}
            style={[styles.menuItem, i < MENU_ITEMS.length - 1 && styles.menuItemBorder]}
            activeOpacity={0.7}
            onPress={item.danger ? handleSignOut : undefined}
          >
            <View style={styles.menuLeft}>
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={[styles.menuLabel, item.danger && { color: colors.error }]}>
                {item.label}
              </Text>
            </View>
            {item.badge && (
              <View style={styles.badgePill}>
                <Text style={styles.badgeText}>{item.badge}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.version}>klokd v1.0.0 · klokd.co.ke</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  scrollContent: { padding: spacing.lg, paddingTop: spacing.xl, paddingBottom: 30 },

  headerCard: {
    backgroundColor: colors.white08,
    borderRadius: radius.xl,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: colors.white10,
  },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  avatarText: { fontSize: 18, fontWeight: '700', color: colors.ink },
  name: { fontSize: typography.size.h2, fontWeight: '700', color: '#fff', marginBottom: 2 },
  phone: { fontSize: typography.size.caption, color: colors.white42, marginBottom: 8 },
  verifiedBadge: {
    backgroundColor: colors.electricAlpha['10'],
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    marginBottom: 12,
  },
  verifiedText: { fontSize: 10, fontWeight: '700', color: colors.electric },
  skillsRow: { flexDirection: 'row', gap: 6 },
  skillChip: {
    backgroundColor: colors.electricAlpha['13'],
    borderWidth: 1,
    borderColor: colors.electric,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  skillText: { fontSize: 11, fontWeight: '600', color: colors.electric },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statCard: {
    flex: 1,
    backgroundColor: colors.white08,
    borderRadius: radius.md,
    padding: 12,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: colors.white10,
  },
  statValue: { fontSize: typography.size.h3, fontWeight: '700', color: '#fff', marginBottom: 2 },
  statLabel: { fontSize: typography.size.nano, color: colors.white42 },

  menuCard: {
    backgroundColor: colors.white08,
    borderRadius: radius.xl,
    borderWidth: 0.5,
    borderColor: colors.white10,
    marginBottom: 16,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  menuItemBorder: { borderBottomWidth: 0.5, borderBottomColor: colors.white10 },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  menuIcon: { fontSize: 16 },
  menuLabel: { fontSize: typography.size.body, fontWeight: '500', color: '#fff' },
  badgePill: {
    backgroundColor: colors.electricAlpha['10'],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  badgeText: { fontSize: typography.size.nano, fontWeight: '600', color: colors.electric },

  version: { textAlign: 'center', fontSize: typography.size.nano, color: colors.white25 },
});
