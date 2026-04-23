/**
 * Employer Shifts tab — Grouped by day, filter chips, status-colored left bar.
 * Ported 1:1 from claude-design/screens/employer-tabs.jsx (EmpShiftsTab)
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Chip, Label, StatusPill } from '../../components/Primitives';
import { IE } from '../../components/IconsEmployer';
import { colors, typography, gradients } from '../../theme';

type ShiftStatus = 'live' | 'filled' | 'filling' | 'open';
type Tone = 'mint' | 'volt' | 'warn';

interface EmpShift {
  id: string; day: string; date: string; role: string; time: string;
  workers: string; status: ShiftStatus; pay: number; tone: Tone;
}

const SHIFTS: EmpShift[] = [
  { id: 't1', day: 'TODAY', date: '3 Apr', role: 'Waiter', time: '5 – 10 PM', workers: '3/3', status: 'live', pay: 5400, tone: 'mint' },
  { id: 't2', day: 'TODAY', date: '3 Apr', role: 'Dishwasher', time: '6 – 11 PM', workers: '2/2', status: 'live', pay: 3400, tone: 'mint' },
  { id: 't3', day: 'TOMORROW', date: '4 Apr', role: 'Barista', time: '7 AM – 2 PM', workers: '2/2', status: 'filled', pay: 4200, tone: 'mint' },
  { id: 't4', day: 'FRIDAY', date: '5 Apr', role: 'Waiter', time: '6 – 11 PM', workers: '1/4', status: 'filling', pay: 8800, tone: 'volt' },
  { id: 't5', day: 'FRIDAY', date: '5 Apr', role: 'Kitchen', time: '4 – 10 PM', workers: '0/2', status: 'open', pay: 4000, tone: 'warn' },
  { id: 't6', day: 'SATURDAY', date: '6 Apr', role: 'Cashier', time: '9 AM – 5 PM', workers: '0/1', status: 'open', pay: 1600, tone: 'warn' },
];

const statusLabel: Record<ShiftStatus, string> = { live: 'Live', filled: 'Filled', filling: 'Filling', open: 'Open' };
const statusTone: Record<ShiftStatus, 'mint' | 'volt' | 'warn'> = { live: 'mint', filled: 'mint', filling: 'volt', open: 'warn' };

export function ShiftsScreen() {
  const [filter, setFilter] = useState<'all' | ShiftStatus>('all');

  const filtered = filter === 'all' ? SHIFTS : SHIFTS.filter(s => s.status === filter);
  const days = ['TODAY', 'TOMORROW', 'FRIDAY', 'SATURDAY'];

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Shifts</Text>
            <Text style={styles.sub}>6 upcoming · 2 live now</Text>
          </View>
          <TouchableOpacity activeOpacity={0.85}>
            <LinearGradient
              colors={[gradients.cta[0], gradients.cta[1]]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.newBtn}
            >
              <IE.plus color={colors.ink} size={12} />
              <Text style={styles.newText}>New</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, gap: 6 }}>
          {([['all', 'All · 6'], ['live', 'Live · 2'], ['filled', 'Filled · 1'], ['open', 'Open · 3']] as const).map(([k, l]) => (
            <Chip key={k} active={filter === k} onPress={() => setFilter(k)}>{l}</Chip>
          ))}
        </ScrollView>

        <View style={{ paddingHorizontal: 20, paddingTop: 18 }}>
          {days.map(day => {
            const list = filtered.filter(s => s.day === day);
            if (!list.length) return null;
            const total = list.reduce((a, s) => a + s.pay, 0);
            return (
              <View key={day} style={{ marginBottom: 18 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                  <Label>{day} · {list[0].date}</Label>
                  <Text style={styles.dayTotal}>KES {total.toLocaleString()}</Text>
                </View>
                <View style={{ gap: 8 }}>
                  {list.map(s => (
                    <View key={s.id} style={styles.row}>
                      <View style={[styles.toneBar, { backgroundColor: s.tone === 'mint' ? colors.electric : s.tone === 'volt' ? colors.volt : colors.warning }]} />
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          <Text style={styles.rowRole}>{s.role}</Text>
                          <StatusPill tone={statusTone[s.status]}>{statusLabel[s.status]}</StatusPill>
                        </View>
                        <Text style={styles.rowTime}>{s.time}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.rowWorkers, { color: s.tone === 'warn' ? colors.warning : colors.electric }]}>{s.workers}</Text>
                        <Text style={styles.rowPay}>KES {s.pay.toLocaleString()}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  headerRow: { paddingHorizontal: 20, paddingTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 20, fontWeight: '900', letterSpacing: -0.6, color: colors.white },
  sub: { fontSize: 11, color: colors.white50, marginTop: 2 },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999 },
  newText: { fontSize: 11.5, fontWeight: '800', color: colors.ink },

  dayTotal: { fontSize: 10.5, color: colors.white40, fontFamily: typography.mono },
  row: {
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderWidth: 1, borderColor: colors.white06,
    flexDirection: 'row', alignItems: 'center', gap: 11,
  },
  toneBar: { width: 4, alignSelf: 'stretch', borderRadius: 999 },
  rowRole: { fontSize: 13, fontWeight: '800', color: colors.white, letterSpacing: -0.13 },
  rowTime: { fontSize: 11, color: colors.white55 },
  rowWorkers: { fontSize: 13, fontWeight: '900', letterSpacing: -0.26, fontFamily: typography.mono },
  rowPay: { fontSize: 10, color: colors.white45, fontFamily: typography.mono },
});
