import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useApi } from '../../hooks/useApi';
import { colors, typography, spacing, radius } from '../../theme';

const statusColor: Record<string, string> = {
  PAID: colors.electric, DISPUTED: colors.warning, ACTIVE: colors.info,
  ACCEPTED: colors.volt, COMPLETED: colors.electric, POSTED: colors.mid,
};

export function ShiftsScreen() {
  const { get } = useApi();
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadShifts();
  }, []);

  const loadShifts = async () => {
    try {
      const data = await get<any[]>('/payments/my');
      setShifts(data || []);
    } catch {
      setShifts([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>My shifts</Text>
      <Text style={styles.sub}>Your shift history</Text>

      {loading && <ActivityIndicator color={colors.electric} style={{ marginTop: 20 }} />}

      <FlatList
        data={shifts}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View>
                <Text style={styles.role}>{item.shift?.role || 'Shift'}</Text>
                <Text style={styles.employer}>{item.shift?.locationName || ''} · {new Date(item.shift?.date).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })}</Text>
              </View>
              <Text style={styles.rate}>KES {(item.netKes || 0).toLocaleString()}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: (statusColor[item.status] || colors.mid) + '18' }]}>
              <Text style={[styles.statusText, { color: statusColor[item.status] || colors.mid }]}>{item.status}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>No shifts yet. Accept your first shift to get started!</Text> : null}
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
  card: { backgroundColor: colors.white08, borderRadius: radius.md, padding: 12, marginBottom: 8, borderWidth: 0.5, borderColor: colors.white10 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  role: { fontSize: typography.size.body, fontWeight: '600', color: '#fff' },
  employer: { fontSize: 10, color: colors.white50, marginTop: 2 },
  rate: { fontSize: typography.size.body, fontWeight: '700', color: colors.electric },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  statusText: { fontSize: typography.size.nano, fontWeight: '700', letterSpacing: 0.5 },
  empty: { color: colors.white30, textAlign: 'center', marginTop: 40, fontSize: typography.size.caption },
});
