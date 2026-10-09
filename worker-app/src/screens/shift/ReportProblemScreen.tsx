/**
 * Report a problem with a shift — POST /disputes. Pay is paused while Klokd
 * reviews; both sides hear the outcome within 24 hours.
 */
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { IconBtn, Chip, GradientBtn } from '../../components/Primitives';
import { AmbientOrbs, SafeTop } from '../../components/KlokdLayout';
import { Icons } from '../../components/Icons';
import { useApi } from '../../hooks/useApi';
import { colors } from '../../theme';

type Props = { navigation: NativeStackNavigationProp<any>; route: { params?: { id?: string } } };

const TYPES: { key: string; label: string }[] = [
  { key: 'INCOMPLETE_SHIFT', label: 'Hours or pay are wrong' },
  { key: 'PAYMENT_NOT_RECEIVED', label: 'Pay not received' },
  { key: 'CONDUCT_ISSUE', label: 'How I was treated' },
  { key: 'UNSAFE_CONDITIONS', label: 'Unsafe conditions' },
  { key: 'OTHER', label: 'Something else' },
];

export function ReportProblemScreen({ navigation, route }: Props) {
  const id = route.params?.id;
  const { post } = useApi();
  const [type, setType] = useState(TYPES[0].key);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await post<{ id: string }>('/disputes', { shiftId: id, type, description: text.trim() });
      setDone(`Sent (reference ${r.id.slice(0, 8)}). Klokd replies within 24 hours.`);
    } catch (e: any) {
      setErr(e?.message ?? 'Couldn’t send.');
    }
    setBusy(false);
  };

  return (
    <View style={styles.screen}>
      <AmbientOrbs intensity="subtle" />
      <SafeTop />
      <View style={styles.header}>
        <IconBtn onPress={() => navigation.goBack()}>
          <Icons.back color={colors.white} size={14} />
        </IconBtn>
        <Text style={styles.title}>Report a problem</Text>
        <View style={{ width: 38 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
        {done ? (
          <>
            <Text style={styles.ok}>{done}</Text>
            <GradientBtn onPress={() => navigation.goBack()}>Back to the shift</GradientBtn>
          </>
        ) : (
          <>
            <Text style={styles.p}>Tell us what happened. Klokd checks the check-in records too.</Text>
            <View style={styles.chips}>
              {TYPES.map(t => (
                <Chip key={t.key} active={type === t.key} onPress={() => setType(t.key)}>{t.label}</Chip>
              ))}
            </View>
            <TextInput value={text} onChangeText={setText} multiline placeholder="Give times and details" placeholderTextColor={colors.white35} style={styles.input} />
            {err ? <Text style={styles.err}>{err}</Text> : null}
            <GradientBtn disabled={busy || text.trim().length < 10} onPress={submit}>{busy ? 'Sending…' : 'Send to Klokd'}</GradientBtn>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  header: { paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.white, fontSize: 16, fontWeight: '900' },
  p: { color: colors.white70, fontSize: 13, lineHeight: 19 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  input: { minHeight: 120, borderWidth: 1, borderColor: colors.white12, borderRadius: 14, padding: 14, color: colors.white, fontSize: 14, backgroundColor: colors.white03, textAlignVertical: 'top' },
  err: { color: colors.warning, fontSize: 13 },
  ok: { color: colors.electric, fontSize: 14, fontWeight: '700', lineHeight: 20 },
});
