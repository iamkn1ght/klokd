import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { colors, typography, spacing, radius } from '../../theme';

const PAYMENTS = [
  { id: '1', worker: 'Akinyi K.', role: 'Waiter', date: 'Mar 28', grossKes: 1800, feeKes: 72, totalKes: 1872 },
  { id: '2', worker: 'James M.', role: 'Barista', date: 'Mar 25', grossKes: 1500, feeKes: 60, totalKes: 1560 },
  { id: '3', worker: 'Beatrice N.', role: 'Waiter', date: 'Mar 22', grossKes: 1600, feeKes: 64, totalKes: 1664 },
];

export function PayScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Payments</Text>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>This month</Text>
        <Text style={styles.summaryAmount}>KES 5,096</Text>
        <Text style={styles.summaryDetail}>3 shifts · KES 196 platform fees (4%)</Text>
      </View>

      <Text style={styles.sectionLabel}>RECENT</Text>
      <FlatList
        data={PAYMENTS}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View>
                <Text style={styles.cardWorker}>{item.worker}</Text>
                <Text style={styles.cardMeta}>{item.role} · {item.date}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.cardTotal}>KES {item.totalKes.toLocaleString()}</Text>
                <Text style={styles.cardFee}>incl. KES {item.feeKes} fee</Text>
              </View>
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
  title: { fontSize: typography.size.h2, fontWeight: '700', color: colors.ink, marginBottom: 14 },
  summaryCard: {
    backgroundColor: colors.white, borderRadius: radius.xl, padding: 16, alignItems: 'center',
    borderWidth: 0.5, borderColor: colors.soft, marginBottom: 18,
  },
  summaryLabel: { fontSize: typography.size.label, color: colors.mid, marginBottom: 4 },
  summaryAmount: { fontSize: 28, fontWeight: '700', color: colors.ink, letterSpacing: -0.03, marginBottom: 4 },
  summaryDetail: { fontSize: typography.size.label, color: colors.mid },
  sectionLabel: { fontSize: typography.size.nano, fontWeight: '700', letterSpacing: 1, color: colors.mid, marginBottom: 8 },
  card: { backgroundColor: colors.white, borderRadius: radius.md, padding: 12, marginBottom: 6, borderWidth: 0.5, borderColor: colors.soft },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between' },
  cardWorker: { fontSize: typography.size.body, fontWeight: '600', color: colors.ink },
  cardMeta: { fontSize: 10, color: colors.mid, marginTop: 2 },
  cardTotal: { fontSize: typography.size.body, fontWeight: '700', color: colors.ink },
  cardFee: { fontSize: 10, color: colors.mid, marginTop: 1 },
});
