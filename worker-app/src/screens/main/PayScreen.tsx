import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useApi } from '../../hooks/useApi';
import { colors, typography, spacing, radius } from '../../theme';

export function PayScreen() {
  const { get } = useApi();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ gross: 0, net: 0, count: 0 });

  useEffect(() => { loadPayments(); }, []);

  const loadPayments = async () => {
    try {
      const data = await get<any[]>('/payments/my');
      setPayments(data || []);
      const completed = (data || []).filter((p: any) => p.status === 'COMPLETED');
      setTotals({
        gross: completed.reduce((s: number, p: any) => s + p.grossKes, 0),
        net: completed.reduce((s: number, p: any) => s + p.netKes, 0),
        count: completed.length,
      });
    } catch {
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Earnings</Text>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Total earned</Text>
        <Text style={styles.summaryAmount}>KES {totals.net.toLocaleString()}</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.itemValue}>{totals.count}</Text>
            <Text style={styles.itemLabel}>Shifts</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.itemValue}>KES {totals.count > 0 ? Math.round(totals.net / totals.count).toLocaleString() : '0'}</Text>
            <Text style={styles.itemLabel}>Avg/shift</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionLabel}>RECENT PAYMENTS</Text>

      {loading && <ActivityIndicator color={colors.electric} style={{ marginTop: 20 }} />}

      <FlatList
        data={payments}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.paymentCard}>
            <View style={styles.paymentTop}>
              <View>
                <Text style={styles.paymentRole}>{item.shift?.role || 'Shift'}</Text>
                <Text style={styles.paymentDate}>{item.paidAt ? new Date(item.paidAt).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' }) : 'Processing'}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.paymentNet}>KES {(item.netKes || 0).toLocaleString()}</Text>
                <Text style={styles.paymentGross}>of KES {(item.grossKes || 0).toLocaleString()}</Text>
              </View>
            </View>
            {item.darajaRef && <Text style={styles.paymentRef}>{item.darajaRef}</Text>}
          </View>
        )}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>No payments yet</Text> : null}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink, padding: spacing.lg, paddingTop: spacing.xl },
  title: { fontSize: typography.size.h2, fontWeight: '700', color: '#fff', letterSpacing: -0.02, marginBottom: 14 },
  summaryCard: { backgroundColor: colors.white08, borderRadius: radius.xl, padding: 16, marginBottom: 18, borderWidth: 0.5, borderColor: colors.white10 },
  summaryLabel: { fontSize: typography.size.label, color: colors.white42, marginBottom: 4, textAlign: 'center' },
  summaryAmount: { fontSize: 28, fontWeight: '700', color: colors.electric, letterSpacing: -0.03, textAlign: 'center', marginBottom: 14 },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 0.5, height: 24, backgroundColor: colors.white10 },
  itemValue: { fontSize: 12, fontWeight: '700', color: '#fff', marginBottom: 2 },
  itemLabel: { fontSize: typography.size.nano, color: colors.white42 },
  sectionLabel: { fontSize: typography.size.nano, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: colors.white42, marginBottom: 8 },
  list: { paddingBottom: 20 },
  paymentCard: { backgroundColor: colors.white08, borderRadius: radius.md, padding: 12, marginBottom: 6, borderWidth: 0.5, borderColor: colors.white10 },
  paymentTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  paymentRole: { fontSize: typography.size.body, fontWeight: '600', color: '#fff' },
  paymentDate: { fontSize: 10, color: colors.white42, marginTop: 2 },
  paymentNet: { fontSize: typography.size.body, fontWeight: '700', color: colors.electric },
  paymentGross: { fontSize: 10, color: colors.white42, marginTop: 1 },
  paymentRef: { fontSize: typography.size.nano, color: colors.white25, fontFamily: 'monospace' },
  empty: { color: colors.white30, textAlign: 'center', marginTop: 40, fontSize: typography.size.caption },
});
