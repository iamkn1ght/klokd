import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { colors, typography, spacing, radius } from '../../theme';

const MOCK_EARNINGS = {
  thisMonth: 14400,
  lastMonth: 28600,
  totalShifts: 8,
  avgPerShift: 1800,
};

const MOCK_PAYMENTS = [
  { id: '1', date: 'Mar 28', employer: 'The Brew Bistro', grossKes: 1800, netKes: 1642, ref: 'B2C-28032026' },
  { id: '2', date: 'Mar 25', employer: 'Java House', grossKes: 1500, netKes: 1369, ref: 'B2C-25032026' },
  { id: '3', date: 'Mar 22', employer: 'Artcaffe', grossKes: 1600, netKes: 1460, ref: 'B2C-22032026' },
  { id: '4', date: 'Mar 20', employer: 'Carrefour', grossKes: 1400, netKes: 1278, ref: 'B2C-20032026' },
];

export function PayScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Earnings</Text>

      {/* Summary card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryMain}>
          <Text style={styles.summaryLabel}>This month</Text>
          <Text style={styles.summaryAmount}>KES {MOCK_EARNINGS.thisMonth.toLocaleString()}</Text>
        </View>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.itemValue}>{MOCK_EARNINGS.totalShifts}</Text>
            <Text style={styles.itemLabel}>Shifts</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.itemValue}>KES {MOCK_EARNINGS.avgPerShift.toLocaleString()}</Text>
            <Text style={styles.itemLabel}>Avg/shift</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.itemValue}>KES {MOCK_EARNINGS.lastMonth.toLocaleString()}</Text>
            <Text style={styles.itemLabel}>Last month</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionLabel}>RECENT PAYMENTS</Text>

      <FlatList
        data={MOCK_PAYMENTS}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.paymentCard}>
            <View style={styles.paymentTop}>
              <View>
                <Text style={styles.paymentEmployer}>{item.employer}</Text>
                <Text style={styles.paymentDate}>{item.date}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.paymentNet}>KES {item.netKes.toLocaleString()}</Text>
                <Text style={styles.paymentGross}>of KES {item.grossKes.toLocaleString()}</Text>
              </View>
            </View>
            <Text style={styles.paymentRef}>{item.ref}</Text>
          </View>
        )}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink, padding: spacing.lg, paddingTop: spacing.xl },
  title: { fontSize: typography.size.h2, fontWeight: '700', color: '#fff', letterSpacing: -0.02, marginBottom: 14 },

  summaryCard: {
    backgroundColor: colors.white08,
    borderRadius: radius.xl,
    padding: 16,
    marginBottom: 18,
    borderWidth: 0.5,
    borderColor: colors.white10,
  },
  summaryMain: { alignItems: 'center', marginBottom: 14 },
  summaryLabel: { fontSize: typography.size.label, color: colors.white42, marginBottom: 4 },
  summaryAmount: { fontSize: 28, fontWeight: '700', color: colors.electric, letterSpacing: -0.03 },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 0.5, height: 24, backgroundColor: colors.white10 },
  itemValue: { fontSize: 12, fontWeight: '700', color: '#fff', marginBottom: 2 },
  itemLabel: { fontSize: typography.size.nano, color: colors.white42 },

  sectionLabel: {
    fontSize: typography.size.nano,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.white42,
    marginBottom: 8,
  },

  list: { paddingBottom: 20 },
  paymentCard: {
    backgroundColor: colors.white08,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 6,
    borderWidth: 0.5,
    borderColor: colors.white10,
  },
  paymentTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  paymentEmployer: { fontSize: typography.size.body, fontWeight: '600', color: '#fff' },
  paymentDate: { fontSize: 10, color: colors.white42, marginTop: 2 },
  paymentNet: { fontSize: typography.size.body, fontWeight: '700', color: colors.electric },
  paymentGross: { fontSize: 10, color: colors.white42, marginTop: 1 },
  paymentRef: { fontSize: typography.size.nano, color: colors.white25, fontFamily: 'monospace' },
});
