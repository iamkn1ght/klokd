import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { colors, typography, spacing, radius } from '../../theme';

const SHIFTS = [
  { id: '1', role: 'Waiter', time: 'Today 5–10pm', worker: 'Akinyi K.', status: 'Confirmed', color: colors.electric },
  { id: '2', role: 'Chef', time: 'Sat 12–8pm', worker: 'Pending', status: 'Pending', color: colors.warning },
  { id: '3', role: 'Barista', time: 'Mon 7am–2pm', worker: 'James M.', status: 'Completed', color: colors.mid },
  { id: '4', role: 'Waiter', time: 'Last Tue 5–10pm', worker: 'Beatrice N.', status: 'Paid', color: colors.electric },
];

export function ShiftsScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Shifts</Text>
      <FlatList
        data={SHIFTS}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.cardRole}>{item.role} · {item.time}</Text>
              <View style={[styles.dot, { backgroundColor: item.color }]} />
            </View>
            <Text style={styles.cardWorker}>{item.worker} · {item.status}</Text>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.mist, padding: spacing.lg, paddingTop: spacing.xl },
  title: { fontSize: typography.size.h2, fontWeight: '700', color: colors.ink, marginBottom: 14 },
  card: { backgroundColor: colors.white, borderRadius: radius.md, padding: 10, marginBottom: 6, borderWidth: 0.5, borderColor: colors.soft },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  cardRole: { fontSize: 11, fontWeight: '600', color: colors.ink },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 2 },
  cardWorker: { fontSize: 10, color: colors.mid },
});
