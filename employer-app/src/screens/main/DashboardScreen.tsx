/**
 * Employer Dashboard — Escrow balance card + stats + open shifts + matched + activity ticker.
 * Ported 1:1 from claude-design/screens/employer-main.jsx (EmpDashboard)
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Label, StatusPill } from '../../components/Primitives';
import { EmpHeader, StatTile, WorkerCard, EscrowMeter, Worker } from '../../components/EmployerPrimitives';
import { Icons } from '../../components/Icons';
import { IE } from '../../components/IconsEmployer';
import { colors, typography, gradients } from '../../theme';

type Props = { navigation: NativeStackNavigationProp<any> };

const EMP_WORKERS: Worker[] = [
  { id: 'w1', name: 'Akinyi O.', initials: 'AO', rating: 4.8, shifts: 47, showUp: 94, verified: true, badge: 'Worked here 3× · last Fri', avatarBg: ['#5B4A8A', '#2B1F52'], match: 98 },
  { id: 'w2', name: 'Kevin M.', initials: 'KM', rating: 4.7, shifts: 62, showUp: 96, verified: true, badge: 'Top 5% in Westlands', avatarBg: ['#3B6E5E', '#1B3E34'], match: 94 },
  { id: 'w3', name: 'Njeri W.', initials: 'NW', rating: 4.9, shifts: 31, showUp: 97, verified: true, badge: 'Worked similar venues', avatarBg: ['#8A5B3B', '#4E2E1B'], match: 91 },
];

const EMP_SHIFTS = [
  { id: 'es1', role: 'Waiter', date: 'Tonight', time: '5:00 – 10:00 PM', pay: 1800, needed: 3, filled: 2 },
  { id: 'es2', role: 'Barista', date: 'Tomorrow', time: '7:00 AM – 2:00 PM', pay: 2100, needed: 2, filled: 2 },
  { id: 'es3', role: 'Waiter', date: 'Fri', time: '6:00 – 11:00 PM', pay: 2200, needed: 4, filled: 1 },
];

function EmpShiftRow({ shift, onPress }: { shift: typeof EMP_SHIFTS[0]; onPress?: () => void }) {
  const done = shift.filled >= shift.needed;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        padding: 14,
        borderRadius: 14,
        backgroundColor: done ? 'rgba(0,229,160,0.04)' : 'rgba(255,255,255,0.025)',
        borderWidth: 1, borderColor: done ? 'rgba(0,229,160,0.2)' : colors.white06,
        flexDirection: 'row', alignItems: 'center', gap: 12,
      }}
    >
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <Text style={styles.shiftRole}>{shift.role}</Text>
          {done ? <StatusPill tone="mint">Filled</StatusPill> : <StatusPill tone="volt">Filling</StatusPill>}
        </View>
        <Text style={styles.shiftMeta}>{shift.date} · {shift.time}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 3 }}>
        {Array.from({ length: shift.needed }).map((_, i) => (
          <View key={i} style={{
            width: 7, height: 16, borderRadius: 2,
            backgroundColor: i < shift.filled ? colors.electric : colors.white08,
          }} />
        ))}
      </View>
      <View style={{ alignItems: 'flex-end', minWidth: 68 }}>
        <Text style={styles.shiftRatio}>{shift.filled}/{shift.needed}</Text>
        <Text style={styles.shiftPay}>KES {shift.pay}</Text>
      </View>
    </TouchableOpacity>
  );
}

export function DashboardScreen({ navigation }: Props) {
  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <EmpHeader greeting="Habari, Wanjiku" />

        {/* Escrow balance */}
        <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
          <LinearGradient
            colors={[colors.electricAlpha['08'], colors.electricAlpha['03']]}
            start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
            style={styles.escrowCard}
          >
            <View style={styles.escrowHead}>
              <Label color={colors.white50}>Escrow balance</Label>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Icons.shield color={colors.electric} size={11} />
                <Text style={styles.held}>M-PESA HELD</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
              <Text style={styles.escrowAmount}>KES 42,300</Text>
              <Text style={styles.escrowOf}>of 50,000</Text>
            </View>
            <View style={{ marginTop: 10 }}>
              <EscrowMeter funded={50000} held={42300} committed={12600} />
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <TouchableOpacity activeOpacity={0.85} style={{ flex: 1 }}>
                <LinearGradient
                  colors={[gradients.cta[0], gradients.cta[1]]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={styles.topUpBtn}
                >
                  <Text style={styles.topUpText}>Top up</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={styles.ledgerBtn} activeOpacity={0.7}>
                <Text style={styles.ledgerText}>Ledger</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* Quick stats */}
        <View style={{ paddingHorizontal: 20, paddingTop: 14, flexDirection: 'row', gap: 8 }}>
          <StatTile label="Today" value="7 workers" sub="4 clocked in · 3 expected" tone="mint" compact icon={<IE.users color={colors.electric} size={11} />} />
          <StatTile label="This week" value="KES 58.2k" sub="paid to 14 workers" tone="volt" compact icon={<IE.trend color={colors.volt} size={11} />} />
        </View>

        {/* Open shifts */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Label>Open shifts · {EMP_SHIFTS.length}</Label>
            <TouchableOpacity onPress={() => navigation.navigate('PostShift')} activeOpacity={0.85}>
              <LinearGradient
                colors={[gradients.cta[0], gradients.cta[1]]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.newShiftBtn}
              >
                <IE.plus color={colors.ink} size={12} />
                <Text style={styles.newShiftText}>New shift</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
          <View style={{ gap: 10 }}>
            {EMP_SHIFTS.map(s => (
              <EmpShiftRow key={s.id} shift={s} onPress={() => navigation.navigate('SelectWorker', { shift: s })} />
            ))}
          </View>
        </View>

        {/* Top matches */}
        <View style={{ paddingHorizontal: 20, paddingTop: 22 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Label>Top matches · tonight's Waiter</Label>
            <Text style={{ fontSize: 10.5, color: colors.electric, fontWeight: '700' }}>View all</Text>
          </View>
          <View style={{ gap: 8 }}>
            {EMP_WORKERS.slice(0, 3).map(w => (
              <WorkerCard key={w.id} worker={w} match={w.match} compact />
            ))}
          </View>
        </View>

        {/* Recent activity */}
        <View style={{ paddingHorizontal: 20, paddingTop: 22 }}>
          <Label style={{ marginBottom: 10 }}>Recent activity</Label>
          <View style={styles.activityCard}>
            {[
              { t: 'Akinyi O. clocked out', s: 'KES 1,800 released · 2m ago', d: colors.electric },
              { t: 'Kevin M. confirmed shift', s: 'Tonight · Waiter · 11m ago', d: colors.volt },
              { t: 'Escrow topped up', s: 'KES 20,000 · this morning', d: colors.white },
            ].map((a, i) => (
              <View key={i} style={[styles.activityRow, i < 2 && styles.activityBorder]}>
                <View style={[styles.activityDot, { backgroundColor: a.d }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.activityTitle}>{a.t}</Text>
                  <Text style={styles.activitySub}>{a.s}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },

  escrowCard: {
    paddingHorizontal: 16, paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1, borderColor: colors.electricAlpha['20'],
  },
  escrowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  held: { fontSize: 9.5, color: colors.electric, fontWeight: '700', letterSpacing: 0.95 },
  escrowAmount: { fontSize: 28, fontWeight: '900', color: colors.white, letterSpacing: -1.12, fontFamily: typography.mono },
  escrowOf: { fontSize: 11, color: colors.white40 },
  topUpBtn: { paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
  topUpText: { color: colors.ink, fontSize: 11.5, fontWeight: '800' },
  ledgerBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, backgroundColor: colors.white04, borderWidth: 0.5, borderColor: colors.white10, alignItems: 'center' },
  ledgerText: { color: colors.white80, fontSize: 11.5, fontWeight: '600' },

  newShiftBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 999,
  },
  newShiftText: { fontSize: 11, fontWeight: '800', color: colors.ink, letterSpacing: -0.11 },

  shiftRole: { fontSize: 13, fontWeight: '800', color: colors.white, letterSpacing: -0.13 },
  shiftMeta: { fontSize: 11, color: colors.white55 },
  shiftRatio: { fontSize: 13, fontWeight: '900', color: colors.electric, letterSpacing: -0.26, fontFamily: typography.mono },
  shiftPay: { fontSize: 10, color: colors.white45, fontFamily: typography.mono },

  activityCard: {
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.white02,
    borderWidth: 0.5, borderColor: colors.white06,
  },
  activityRow: { flexDirection: 'row', gap: 10, paddingVertical: 6 },
  activityBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.white05 },
  activityDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  activityTitle: { fontSize: 12, fontWeight: '700', color: colors.white },
  activitySub: { fontSize: 10.5, color: colors.white50 },
});
