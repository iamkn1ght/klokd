/**
 * Verify your business — both checks the API requires before posting:
 *   PUT  /identity/employers/profile   business name + KRA PIN (+ contact)
 *   POST /identity/employers/wiba      WIBA insurer, policy number, expiry
 */
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GradientBtn, IconBtn, StatusPill, Label } from '../../components/Primitives';
import { AmbientOrbs, SafeTop } from '../../components/KlokdLayout';
import { Icons } from '../../components/Icons';
import { useData } from '../../hooks/useData';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme';
import { day } from '../../lib/format';
import type { EmployerProfile } from './DashboardScreen';

type Props = { navigation: NativeStackNavigationProp<any> };

const KRA_RE = /^[A-Z]\d{9}[A-Z]$/;

export function VerifyScreen({ navigation }: Props) {
  const q = useData<EmployerProfile>('/identity/employers/profile');
  const { put, post } = useApi();
  const { refreshName } = useAuth();
  const [name, setName] = useState('');
  const [kra, setKra] = useState('');
  const [contact, setContact] = useState('');
  const [insurer, setInsurer] = useState('');
  const [policy, setPolicy] = useState('');
  const [expiry, setExpiry] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const p = q.data;
  const pin = kra.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const expiryDate = /^\d{4}-\d{2}-\d{2}$/.test(expiry) ? new Date(`${expiry}T23:59:59`) : null;

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      setMsg({ ok: true, text: ok });
      await q.reload();
      await refreshName();
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message ?? 'Couldn’t save.' });
    }
    setBusy(false);
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AmbientOrbs intensity="subtle" />
      <SafeTop />
      <View style={styles.header}>
        <IconBtn onPress={() => navigation.goBack()}><Icons.back color={colors.white} size={14} /></IconBtn>
        <Text style={styles.title}>Verify your business</Text>
        <View style={{ width: 38 }} />
      </View>
      {q.status === 'loading' && <ActivityIndicator color={colors.volt} style={{ marginTop: 40 }} />}
      {p && (
        <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <Text style={styles.p}>Workers only see shifts from businesses with a KRA PIN and current Work Injury Benefits Act cover on file.</Text>
          {msg && <Text style={{ color: msg.ok ? colors.volt : colors.warning, fontWeight: '700' }}>{msg.text}</Text>}

          <View style={styles.block}>
            <View style={styles.blockHead}>
              <Text style={styles.blockH}>1 · Business</Text>
              <StatusPill tone={p.kraPinMasked ? 'mint' : 'warn'}>{p.kraPinMasked ? 'Done' : 'To do'}</StatusPill>
            </View>
            {p.kraPinMasked && <Text style={styles.small}>{p.businessName} · KRA PIN {p.kraPinMasked}{p.contactPerson ? ` · ${p.contactPerson}` : ''}</Text>}
            <Label color={colors.white55}>{p.kraPinMasked ? 'Update details' : 'Registered business name'}</Label>
            <TextInput value={name} onChangeText={setName} placeholder={p.businessName === 'Unregistered business' ? 'The Brew Bistro Ltd' : p.businessName} placeholderTextColor={colors.white35} style={styles.input} />
            <TextInput value={kra} onChangeText={setKra} autoCapitalize="characters" placeholder="KRA PIN, e.g. P051234567A" placeholderTextColor={colors.white35} style={styles.input} />
            {pin.length > 0 && !KRA_RE.test(pin) && <Text style={styles.err}>A KRA PIN is a letter, 9 digits, then a letter.</Text>}
            <TextInput value={contact} onChangeText={setContact} placeholder="Contact person (optional)" placeholderTextColor={colors.white35} style={styles.input} />
            <GradientBtn size="sm" disabled={busy || !KRA_RE.test(pin) || (name.trim().length < 2 && p.businessName === 'Unregistered business')} onPress={() => run(() => put('/identity/employers/profile', { businessName: name.trim() || p.businessName, kraPin: pin, contactPerson: contact.trim() || undefined }), 'Business details saved.')}>
              Save business details
            </GradientBtn>
          </View>

          <View style={styles.block}>
            <View style={styles.blockHead}>
              <Text style={styles.blockH}>2 · WIBA cover</Text>
              <StatusPill tone={p.wiba.status === 'confirmed' ? 'mint' : p.wiba.status === 'expired' ? 'err' : 'warn'}>{p.wiba.status === 'confirmed' ? 'Done' : p.wiba.status === 'expired' ? 'Expired' : 'To do'}</StatusPill>
            </View>
            {p.wiba.policyRef && <Text style={styles.small}>{p.wiba.insurer} · policy {p.wiba.policyRef}{p.wiba.expiresAt ? ` · expires ${day(p.wiba.expiresAt)}` : ''}</Text>}
            <TextInput value={insurer} onChangeText={setInsurer} placeholder="Insurer, e.g. Jubilee, Britam, CIC" placeholderTextColor={colors.white35} style={styles.input} />
            <TextInput value={policy} onChangeText={setPolicy} placeholder="Policy number" placeholderTextColor={colors.white35} style={styles.input} />
            <TextInput value={expiry} onChangeText={setExpiry} maxLength={10} placeholder="Expiry date YYYY-MM-DD" placeholderTextColor={colors.white35} style={styles.input} />
            {expiry.length > 0 && (!expiryDate || expiryDate < new Date()) && <Text style={styles.err}>Use YYYY-MM-DD and a date that hasn’t passed.</Text>}
            <GradientBtn size="sm" disabled={busy || insurer.trim().length < 2 || policy.trim().length < 3 || !expiryDate || expiryDate < new Date()} onPress={() => run(() => post('/identity/employers/wiba', { insurer: insurer.trim(), policyRef: policy.trim(), policyExpiry: expiryDate!.toISOString() }), 'WIBA policy declared.')}>
              Declare WIBA policy
            </GradientBtn>
          </View>

          {p.canPostShifts && <GradientBtn onPress={() => navigation.replace('PostShift')}>Post a shift</GradientBtn>}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  header: { paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.white, fontSize: 16, fontWeight: '900' },
  p: { color: colors.white70, fontSize: 13, lineHeight: 19 },
  block: { padding: 16, borderRadius: 18, backgroundColor: colors.white03, borderWidth: 1, borderColor: colors.white08, gap: 10 },
  blockHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  blockH: { fontSize: 16, fontWeight: '900', color: colors.white },
  small: { fontSize: 12, color: colors.white60 },
  input: { borderWidth: 1, borderColor: colors.white12, borderRadius: 12, padding: 12, color: colors.white, fontSize: 15, backgroundColor: colors.ink },
  err: { color: colors.warning, fontSize: 12 },
});
