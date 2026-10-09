/**
 * Post a shift — POST /shifts. Same rules as the website: shifts start in the
 * future, end after they start, at most 12 hours, pay at or above the
 * minimum wage. From the Team tab, the shift is offered straight to one
 * worker (inviteWorkerId).
 */
import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GradientBtn, Chip, IconBtn, Label } from '../../components/Primitives';
import { AmbientOrbs, SafeTop } from '../../components/KlokdLayout';
import { Icons } from '../../components/Icons';
import { useApi } from '../../hooks/useApi';
import { colors } from '../../theme';
import { kes } from '../../lib/format';

type Props = { navigation: NativeStackNavigationProp<any>; route: { params?: { inviteWorkerId?: string; inviteName?: string } } };

const ROLES = ['Waiter', 'Barista', 'Bartender', 'Chef', 'Cashier', 'Cleaner', 'Security', 'Receptionist'];
const AREAS = [
  { name: 'Westlands', lat: -1.2636, lng: 36.8036 },
  { name: 'CBD', lat: -1.2864, lng: 36.8172 },
  { name: 'Kilimani', lat: -1.2864, lng: 36.783 },
  { name: 'Lavington', lat: -1.2783, lng: 36.77 },
  { name: 'Kileleshwa', lat: -1.2722, lng: 36.78 },
  { name: 'Parklands', lat: -1.258, lng: 36.812 },
  { name: 'Hurlingham', lat: -1.295, lng: 36.795 },
  { name: 'Karen', lat: -1.3197, lng: 36.7112 },
];
const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;

export function PostShiftScreen({ navigation, route }: Props) {
  const invite = route.params?.inviteWorkerId;
  const inviteName = route.params?.inviteName;
  const { post } = useApi();
  const days = useMemo(() => {
    const out: { key: string; label: string; date: Date }[] = [];
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      out.push({ key: d.toDateString(), label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' }), date: d });
    }
    return out;
  }, []);

  const [role, setRole] = useState('Waiter');
  const [other, setOther] = useState('');
  const [dayKey, setDayKey] = useState(days[0].key);
  const [start, setStart] = useState('17:00');
  const [end, setEnd] = useState('22:00');
  const [area, setArea] = useState(AREAS[0].name);
  const [pay, setPay] = useState('1800');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const roleValue = role === 'Other' ? other.trim() : role;
  const day = days.find(d => d.key === dayKey)!.date;
  const at = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    const d = new Date(day);
    d.setHours(h, m, 0, 0);
    return d;
  };
  const timesOk = TIME_RE.test(start) && TIME_RE.test(end);
  const startAt = timesOk ? at(start) : null;
  let endAt = timesOk ? at(end) : null;
  if (startAt && endAt && endAt <= startAt) endAt = new Date(endAt.getTime() + 86_400_000);
  const hours = startAt && endAt ? (endAt.getTime() - startAt.getTime()) / 3_600_000 : 0;
  const payNum = Number(pay.replace(/\D/g, ''));

  const problem = !roleValue
    ? 'Pick a role.'
    : !timesOk
      ? 'Times use 24-hour HH:MM, e.g. 17:00.'
      : hours > 12
        ? 'Shifts can be at most 12 hours.'
        : startAt!.getTime() < Date.now()
          ? 'That start time has already passed.'
          : payNum < 100
            ? 'Enter the pay for the shift in KES.'
            : null;

  const submit = async () => {
    if (problem) return;
    const a = AREAS.find(x => x.name === area)!;
    setBusy(true);
    setErr(null);
    try {
      const shift = await post<{ id: string }>('/shifts', {
        role: roleValue,
        description: notes.trim() || undefined,
        date: day.toISOString(),
        startTime: startAt!.toISOString(),
        endTime: endAt!.toISOString(),
        rateKes: payNum,
        locationLat: a.lat,
        locationLng: a.lng,
        locationName: a.name,
        inviteWorkerId: invite,
      });
      navigation.replace('ShiftDetail', { id: shift.id });
    } catch (e: any) {
      setErr(e?.message ?? 'Couldn’t post the shift.');
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AmbientOrbs intensity="subtle" />
      <SafeTop />
      <View style={styles.header}>
        <IconBtn onPress={() => navigation.goBack()}>
          <Icons.back color={colors.white} size={14} />
        </IconBtn>
        <Text style={styles.title}>{invite ? `Book ${inviteName ?? 'again'}` : 'Post a shift'}</Text>
        <View style={{ width: 38 }} />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30, gap: 16 }} keyboardShouldPersistTaps="handled">
        {invite && <Text style={styles.invite}>This shift goes straight to {inviteName ?? 'this worker'}. Nobody else sees it unless they decline.</Text>}
        <View>
          <Label color={colors.white60}>Role</Label>
          <View style={styles.chips}>
            {[...ROLES, 'Other'].map(r => <Chip key={r} active={role === r} color={colors.volt} onPress={() => setRole(r)}>{r}</Chip>)}
          </View>
          {role === 'Other' && <TextInput value={other} onChangeText={setOther} placeholder="Role name" placeholderTextColor={colors.white35} style={[styles.input, { marginTop: 8 }]} />}
        </View>
        <View>
          <Label color={colors.white60}>Day</Label>
          <View style={styles.chips}>
            {days.map(d => <Chip key={d.key} active={dayKey === d.key} color={colors.volt} onPress={() => setDayKey(d.key)}>{d.label}</Chip>)}
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Label color={colors.white60}>Start</Label>
            <TextInput value={start} onChangeText={setStart} maxLength={5} placeholder="17:00" placeholderTextColor={colors.white35} style={styles.input} keyboardType="numbers-and-punctuation" />
          </View>
          <View style={{ flex: 1 }}>
            <Label color={colors.white60}>End</Label>
            <TextInput value={end} onChangeText={setEnd} maxLength={5} placeholder="22:00" placeholderTextColor={colors.white35} style={styles.input} keyboardType="numbers-and-punctuation" />
          </View>
          <View style={styles.hours}>
            <Text style={styles.hoursK}>{hours > 0 ? `${+hours.toFixed(1)}h` : '—'}</Text>
          </View>
        </View>
        <View>
          <Label color={colors.white60}>Area</Label>
          <View style={styles.chips}>
            {AREAS.map(a => <Chip key={a.name} active={area === a.name} color={colors.volt} onPress={() => setArea(a.name)}>{a.name}</Chip>)}
          </View>
        </View>
        <View>
          <Label color={colors.white60}>Pay for the shift (KES)</Label>
          <TextInput value={pay} onChangeText={setPay} keyboardType="number-pad" style={styles.input} />
          {payNum > 0 && hours > 0 ? <Text style={styles.hint}>≈ {kes(payNum / hours)} an hour · you pay {kes(payNum + Math.round(payNum * 0.04))} incl. the 4% Klokd fee</Text> : null}
        </View>
        <View>
          <Label color={colors.white60}>Notes for workers (optional)</Label>
          <TextInput value={notes} onChangeText={setNotes} multiline placeholder="Dress code, who to ask for, what to bring" placeholderTextColor={colors.white35} style={[styles.input, { minHeight: 70 }]} />
        </View>
        {(problem || err) && <Text style={styles.err}>{err ?? problem}</Text>}
        <GradientBtn disabled={!!problem || busy} onPress={submit}>{busy ? 'Posting…' : invite ? 'Offer the shift' : 'Post shift'}</GradientBtn>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  header: { paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.white, fontSize: 16, fontWeight: '900' },
  invite: { color: colors.volt, fontSize: 13, lineHeight: 19, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  input: { marginTop: 8, borderWidth: 1, borderColor: colors.white12, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, color: colors.white, fontSize: 15, backgroundColor: colors.white03 },
  hours: { width: 70, marginTop: 22, borderRadius: 12, backgroundColor: colors.voltAlpha['10'], alignItems: 'center', justifyContent: 'center' },
  hoursK: { color: colors.volt, fontWeight: '900', fontSize: 15 },
  hint: { color: colors.white55, fontSize: 11.5, marginTop: 6 },
  err: { color: colors.warning, fontSize: 13 },
});
