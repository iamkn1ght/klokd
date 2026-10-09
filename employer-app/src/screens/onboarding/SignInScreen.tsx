/**
 * Sign in — phone, then the one-time code. New numbers add the owner's name
 * and consent once (Identiti needs it to create the account).
 */
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GradientBtn, Eyebrow, IconBtn } from '../../components/Primitives';
import { AmbientOrbs, SafeTop } from '../../components/KlokdLayout';
import { Icons } from '../../components/Icons';
import { useAuth } from '../../context/AuthContext';
import { colors, typography } from '../../theme';

type Props = { navigation: NativeStackNavigationProp<any> };

export function SignInScreen({ navigation }: Props) {
  const { requestOtp, verifyOtp } = useAuth();
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [needsProfile, setNeedsProfile] = useState(false);
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [consent, setConsent] = useState(false);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [shownCode, setShownCode] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phoneOk = /^(?:\+?254|0)\d{9}$/.test(phone.replace(/[\s-]/g, ''));

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await requestOtp(
        phone.replace(/[\s-]/g, ''),
        needsProfile ? { nameFirst: first.trim(), nameLast: last.trim(), dpaConsent: consent, kycConsent: consent } : undefined
      );
      setChallengeId(r.challengeId);
      setShownCode(r.sandboxOtp ?? null);
      setCode(r.sandboxOtp ?? '');
      setStep('code');
    } catch (e: any) {
      const m = String(e?.message ?? '');
      if (m.includes('Profile required')) {
        setNeedsProfile(true);
        setError('New to Klokd? Add your name and consent, then send the code again.');
      } else setError(m || 'Couldn’t send the code.');
    }
    setBusy(false);
  };

  const verify = async () => {
    if (!challengeId) return;
    setBusy(true);
    setError(null);
    try {
      await verifyOtp(phone.replace(/[\s-]/g, ''), challengeId, code);
    } catch (e: any) {
      setError(e?.message ?? 'That code didn’t work.');
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AmbientOrbs intensity="subtle" />
      <SafeTop />
      <View style={styles.header}>
        <IconBtn onPress={() => (step === 'code' ? setStep('phone') : navigation.goBack())}>
          <Icons.back color={colors.white} size={14} />
        </IconBtn>
      </View>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 14 }} keyboardShouldPersistTaps="handled">
        <Eyebrow color={colors.volt}>{step === 'phone' ? 'Sign in' : 'Enter the code'}</Eyebrow>
        <Text style={styles.h1}>{step === 'phone' ? (needsProfile ? 'Create your account' : 'Your business phone number') : 'Check the code'}</Text>

        {step === 'phone' ? (
          <>
            <TextInput value={phone} onChangeText={t => { setPhone(t); setError(null); }} placeholder="0722 400 500" placeholderTextColor={colors.white35} keyboardType="phone-pad" style={styles.input} autoFocus />
            {needsProfile && (
              <>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TextInput value={first} onChangeText={setFirst} placeholder="First name" placeholderTextColor={colors.white35} style={[styles.input, { flex: 1 }]} />
                  <TextInput value={last} onChangeText={setLast} placeholder="Last name" placeholderTextColor={colors.white35} style={[styles.input, { flex: 1 }]} />
                </View>
                <TouchableOpacity onPress={() => setConsent(c => !c)} style={styles.consent}>
                  <View style={[styles.box, consent && styles.boxOn]}>{consent && <Text style={styles.tick}>✓</Text>}</View>
                  <Text style={styles.consentText}>I agree to identity checks and data processing under Kenya’s Data Protection Act 2019. Required by Identiti to create the account.</Text>
                </TouchableOpacity>
              </>
            )}
            {error && <Text style={styles.error}>{error}</Text>}
            <GradientBtn disabled={busy || !phoneOk || (needsProfile && (!first.trim() || !last.trim() || !consent))} onPress={send}>
              {busy ? 'Sending…' : 'Send code'}
            </GradientBtn>
          </>
        ) : (
          <>
            {shownCode ? (
              <View style={styles.codeBox}>
                <Text style={styles.codeLabel}>YOUR CODE</Text>
                <Text style={styles.codeValue}>{shownCode}</Text>
                <Text style={styles.codeNote}>SMS delivery isn’t switched on yet, so your code is shown here.</Text>
              </View>
            ) : (
              <Text style={styles.p}>We sent a 6-digit code to {phone}.</Text>
            )}
            <TextInput value={code} onChangeText={t => setCode(t.replace(/\D/g, '').slice(0, 6))} placeholder="000000" placeholderTextColor={colors.white35} keyboardType="number-pad" style={[styles.input, styles.codeInput]} autoFocus />
            {error && <Text style={styles.error}>{error}</Text>}
            <GradientBtn disabled={busy || code.length !== 6} onPress={verify}>{busy ? 'Signing in…' : 'Sign in'}</GradientBtn>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  header: { paddingHorizontal: 18, paddingVertical: 14 },
  h1: { fontSize: 28, fontWeight: '900', color: colors.white, letterSpacing: -1 },
  p: { fontSize: 13.5, color: colors.white70 },
  input: { borderWidth: 1, borderColor: colors.white12, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14, color: colors.white, fontSize: 16, backgroundColor: colors.white03 },
  codeInput: { textAlign: 'center', letterSpacing: 8, fontSize: 22, fontWeight: '900', fontFamily: typography.mono },
  consent: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.white25, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: colors.volt, borderColor: colors.volt },
  tick: { color: colors.ink, fontWeight: '900' },
  consentText: { flex: 1, color: colors.white65, fontSize: 12, lineHeight: 17 },
  error: { color: colors.warning, fontSize: 13 },
  codeBox: { padding: 14, borderRadius: 14, backgroundColor: colors.voltAlpha['10'], borderWidth: 1, borderColor: colors.voltAlpha['25'], alignItems: 'center' },
  codeLabel: { color: colors.volt, fontSize: 10.5, fontWeight: '900', letterSpacing: 1 },
  codeValue: { color: colors.white, fontSize: 28, fontWeight: '900', letterSpacing: 6, fontFamily: typography.mono, marginTop: 4 },
  codeNote: { color: colors.white60, fontSize: 11.5, marginTop: 6, textAlign: 'center' },
});
