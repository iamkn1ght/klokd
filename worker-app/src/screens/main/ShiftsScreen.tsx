import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { colors, typography, spacing, radius } from '../../theme';

const MOCK_HISTORY = [
  { id: '1', role: 'Waiter', employer: 'The Brew Bistro', date: 'Mar 28', rateKes: 1800, status: 'PAID' },
  { id: '2', role: 'Barista', employer: 'Java House', date: 'Mar 25', rateKes: 1500, status: 'PAID' },
  { id: '3', role: 'Waiter', employer: 'Artcaffe', date: 'Mar 22', rateKes: 1600, status: 'PAID' },
  { id: '4', role: 'Cashier', employer: 'Carrefour', date: 'Mar 20', rateKes: 1400, status: 'PAID' },
  { id: '5', role: 'Waiter', employer: 'The Brew Bistro', date: 'Mar 18', rateKes: 1800, status: 'DISPUTED' },
];

const statusColor: Record<string, string> = {
  PAID: colors.electric,
  DISPUTED: colors.warning,
  ACTIVE: colors.info,
  ACCEPTED: colors.volt,
};

export function ShiftsScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>My shifts</Text>
      <Text style={styles.sub}>Your shift history</Text>

      <FlatList
        data={MOCK_HISTORY}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View>
                <Text style={styles.role}>{item.role}</Text>
                <Text style={styles.employer}>{item.employer} · {item.date}</Text>
              </View>
              <Text style={styles.rate}>KES {item.rateKes.toLocaleString()}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: (statusColor[item.status] || colors.mid) + '18' }]}>
              <Text style={[styles.statusText, { color: statusColor[item.status] || colors.mid }]}>
                {item.status}
              </Text>
            </View>
          </View>
        )}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink, padding: spacing.lg, paddingTop: spacing.xl },
  title: { fontSize: typography.size.h2, fontWeight: '700', color: '#fff', letterSpacing: -0.02, marginBottom: 2 },
  sub: { fontSize: typography.size.caption, color: colors.white42, marginBottom: 16 },
  list: { paddingBottom: 20 },
  card: {
    backgroundColor: colors.white08,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 8,
    borderWidth: 0.5,
    borderColor: colors.white10,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  role: { fontSize: typography.size.body, fontWeight: '600', color: '#fff' },
  employer: { fontSize: 10, color: colors.white50, marginTop: 2 },
  rate: { fontSize: typography.size.body, fontWeight: '700', color: colors.electric },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  statusText: { fontSize: typography.size.nano, fontWeight: '700', letterSpacing: 0.5 },
});
