/**
 * My shifts — GET /me/shifts, grouped: waiting for your answer · coming up ·
 * applied · done. Every row opens the shift.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusPill, Label } from '../../components/Primitives';
import { AmbientOrbs, SafeTop } from '../../components/KlokdLayout';
import { useData } from '../../hooks/useData';
import { colors } from '../../theme';
import { kes, when } from '../../lib/format';

type Props = { navigation: NativeStackNavigationProp<any> };

interface MyShift {
  id: string;
  role: string;
  venue: string;
  area: string | null;
  startTime: string;
  endTime: string;
  rateKes: number;
  status: string;
  directOffer: boolean;
  settlement: { status: string; netKes: number } | null;
  rated: boolean;
}
interface Mine {
  offers: MyShift[];
  upcoming: MyShift[];
  applied: { applicationId: string; shift: { id: string; role: string; venue: string; area: string | null; startTime: string; endTime: string; rateKes: number } }[];
  history: MyShift[];
}

const PILL: Record<string, { label: string; tone: 'mint' | 'warn' | 'err' | 'neutral' }> = {
  CONFIRMED: { label: 'Answer needed', tone: 'warn' },
  ACCEPTED: { label: 'Confirmed', tone: 'mint' },
  ACTIVE: { label: 'On shift', tone: 'mint' },
  COMPLETED: { label: 'Done', tone: 'mint' },
  PAID: { label: 'Paid', tone: 'mint' },
  DISPUTED: { label: 'Under review', tone: 'err' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
};

export function ShiftsScreen({ navigation }: Props) {
  const q = useData<Mine>('/me/shifts', { pollMs: 30_000 });
  const open = (id: string) => navigation.navigate('ShiftDetail', { id });
  const d = q.data;
  const empty = d && !d.offers.length && !d.upcoming.length && !d.applied.length && !d.history.length;

  return (
    <View style={styles.screen}>
      <AmbientOrbs intensity="subtle" />
      <SafeTop />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 30 }}>
        <Text style={styles.h1}>My shifts</Text>
        {q.status === 'loading' && <ActivityIndicator color={colors.electric} style={{ marginTop: 40 }} />}
        {q.status === 'error' && <Text style={styles.err}>{q.error}</Text>}
        {empty && (
          <View style={styles.empty}>
            <Text style={styles.emptyH}>No shifts yet</Text>
            <Text style={styles.emptyP}>Apply to shifts on Home. When a business picks you, it shows up here to confirm.</Text>
          </View>
        )}
        {d && (
          <>
            <Group title="Waiting for your answer" rows={d.offers} open={open} />
            <Group title="Coming up" rows={d.upcoming} open={open} />
            {d.applied.length > 0 && (
              <View style={styles.group}>
                <Label color={colors.white60}>Applied · waiting to be picked</Label>
                {d.applied.map(a => (
                  <Row key={a.applicationId} onPress={() => open(a.shift.id)} title={a.shift.role} sub={`${a.shift.venue} · ${a.shift.area ?? 'Nairobi'}`} when={when(a.shift.startTime, a.shift.endTime)} right={kes(a.shift.rateKes)} pill={{ label: 'Applied', tone: 'neutral' }} />
                ))}
              </View>
            )}
            <Group title="Done" rows={d.history} open={open} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Group({ title, rows, open }: { title: string; rows: MyShift[]; open: (id: string) => void }) {
  if (!rows.length) return null;
  return (
    <View style={styles.group}>
      <Label color={colors.white60}>{title}</Label>
      {rows.map(s => (
        <Row
          key={s.id}
          onPress={() => open(s.id)}
          title={`${s.role}${s.directOffer && s.status === 'CONFIRMED' ? ' · offered to you' : ''}`}
          sub={`${s.venue} · ${s.area ?? 'Nairobi'}`}
          when={when(s.startTime, s.endTime)}
          right={s.settlement ? kes(s.settlement.netKes) : kes(s.rateKes)}
          pill={PILL[s.status] ?? { label: s.status, tone: 'neutral' }}
          extra={s.status === 'COMPLETED' && !s.rated ? 'Tap to rate' : null}
        />
      ))}
    </View>
  );
}

function Row({ onPress, title, sub, when: w, right, pill, extra }: { onPress: () => void; title: string; sub: string; when: string; right: string; pill: { label: string; tone: 'mint' | 'warn' | 'err' | 'neutral' }; extra?: string | null }) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.row}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
        </View>
        <Text style={styles.sub} numberOfLines={1}>{sub}</Text>
        <Text style={styles.when}>{w}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <Text style={styles.right}>{right}</Text>
        <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
        {extra ? <Text style={styles.extra}>{extra}</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  h1: { fontSize: 28, fontWeight: '900', color: colors.white, letterSpacing: -0.9, marginTop: 8, marginBottom: 6 },
  err: { color: colors.warning, marginTop: 20 },
  group: { marginTop: 22, gap: 10 },
  row: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: 16, backgroundColor: colors.white03, borderWidth: 1, borderColor: colors.white08 },
  title: { fontSize: 15, fontWeight: '800', color: colors.white, flexShrink: 1 },
  sub: { fontSize: 12, color: colors.white70, marginTop: 3 },
  when: { fontSize: 11.5, color: colors.white55, marginTop: 2 },
  right: { fontSize: 15, fontWeight: '900', color: colors.electric },
  extra: { fontSize: 11, color: colors.volt, fontWeight: '700' },
  empty: { marginTop: 24, padding: 18, borderRadius: 16, borderWidth: 1, borderColor: colors.white08, alignItems: 'center' },
  emptyH: { color: colors.white, fontSize: 15, fontWeight: '800' },
  emptyP: { color: colors.white60, fontSize: 12.5, textAlign: 'center', marginTop: 4, lineHeight: 18 },
});
