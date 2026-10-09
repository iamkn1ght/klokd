/**
 * Shifts — GET /shifts/mine. Every shift you've posted, newest first; tap to
 * see applicants, the start PIN, attendance and pay.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusPill, GradientBtn } from '../../components/Primitives';
import { AmbientOrbs, SafeTop } from '../../components/KlokdLayout';
import { useData } from '../../hooks/useData';
import { colors } from '../../theme';
import { kes, when } from '../../lib/format';

type Props = { navigation: NativeStackNavigationProp<any> };

interface Mine { id: string; role: string; startTime: string; endTime: string; rateKes: number; locationName: string | null; status: string; applications: number }

export const SHIFT_PILL: Record<string, { label: string; tone: 'mint' | 'warn' | 'err' | 'neutral' }> = {
  POSTED: { label: 'Open', tone: 'warn' },
  CONFIRMED: { label: 'Worker picked', tone: 'mint' },
  ACCEPTED: { label: 'Worker confirmed', tone: 'mint' },
  ACTIVE: { label: 'On shift', tone: 'mint' },
  COMPLETED: { label: 'Done', tone: 'mint' },
  PAID: { label: 'Paid', tone: 'mint' },
  DISPUTED: { label: 'Disputed', tone: 'err' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
};

export function ShiftsScreen({ navigation }: Props) {
  const q = useData<Mine[]>('/shifts/mine', { pollMs: 30_000 });
  return (
    <View style={styles.screen}>
      <AmbientOrbs intensity="subtle" />
      <SafeTop />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 30, gap: 10 }}>
        <View style={styles.head}>
          <Text style={styles.h1}>Shifts</Text>
          <GradientBtn size="sm" onPress={() => navigation.navigate('PostShift')}>Post a shift</GradientBtn>
        </View>
        {q.status === 'loading' && <ActivityIndicator color={colors.volt} style={{ marginTop: 40 }} />}
        {q.status === 'error' && <Text style={styles.err}>{q.error}</Text>}
        {q.status === 'ready' && q.data!.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyH}>No shifts yet</Text>
            <Text style={styles.emptyP}>Post your first shift and verified workers nearby can apply straight away.</Text>
          </View>
        )}
        {(q.data ?? []).map(s => {
          const pill = SHIFT_PILL[s.status] ?? { label: s.status, tone: 'neutral' as const };
          return (
            <TouchableOpacity key={s.id} activeOpacity={0.85} onPress={() => navigation.navigate('ShiftDetail', { id: s.id })} style={styles.row}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.role}>{s.role}</Text>
                  <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
                </View>
                <Text style={styles.meta}>{when(s.startTime, s.endTime)} · {s.locationName ?? 'Nairobi'}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.pay}>{kes(s.rateKes)}</Text>
                <Text style={styles.meta}>{s.applications} applicant{s.applications === 1 ? '' : 's'}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 6 },
  h1: { fontSize: 28, fontWeight: '900', color: colors.white, letterSpacing: -0.9 },
  err: { color: colors.warning },
  row: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: 16, backgroundColor: colors.white03, borderWidth: 1, borderColor: colors.white08 },
  role: { fontSize: 15, fontWeight: '800', color: colors.white },
  meta: { fontSize: 11.5, color: colors.white55, marginTop: 4 },
  pay: { fontSize: 15, fontWeight: '900', color: colors.volt },
  empty: { marginTop: 20, padding: 18, borderRadius: 16, borderWidth: 1, borderColor: colors.white08, alignItems: 'center' },
  emptyH: { color: colors.white, fontSize: 15, fontWeight: '800' },
  emptyP: { color: colors.white60, fontSize: 12.5, textAlign: 'center', marginTop: 4, lineHeight: 18 },
});
