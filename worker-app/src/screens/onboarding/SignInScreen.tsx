/**
 * Worker sign-in. Phone first; name and consent only when the number is new
 * to Klokd (the API asks for them by refusing the code request with
 * "Profile required"). Then the 6-digit code.
 *
 * While SMS delivery isn't live the API returns the code in the response
 * (sandbox echo); it's shown plainly so people can still sign in, and the
 * note disappears once codes arrive by SMS.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Logo, GradientBtn, Eyebrow, Label } from '../../components/Primitives';
import { AmbientOrbs, FadeUp, SafeTop } from '../../components/KlokdLayout';
import { colors, spacing, radius } from '../../theme';
import { useAuth } from '../../context/AuthContext';

type Props = { navigation: NativeStackNavigationProp<any> };
type Step = 'phone' | 'details' | 'code';

const RESEND_AFTER_S = 30;

const cleanPhone = (p: string) => p.replace(/[\s\-()]/g, '');
const validPhone = (p: string) => /^(\+?254|0)[17]\d{8}$/.test(cleanPhone(p));
const displayPhone = (p: string) => {
  const d = cleanPhone(p).replace(/^\+?254/, '0');
  return d.length === 10 ? `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}` : p;
};

function friendly(message: string): string {
  if (/phone_already_registered/i.test(message)) {
    return 'This number is already registered with a Kirimon account that Klokd can’t open yet. We’re fixing this — please contact Klokd support.';
  }
  if (/Invalid or expired OTP|Invalid OTP|expired/i.test(message)) return 'That code didn’t work or has expired. Check it, or send a new one.';
  if (/Too many|rate/i.test(message)) return 'Too many attempts. Wait a few minutes, then try again.';
  if (/Network request failed|Failed to fetch|reach/i.test(message)) return 'Can’t reach Klokd. Check your connection and try again.';
  if (/worker|employer/i.test(message) && /account/i.test(message)) return message;
  return 'Something went wrong. Please try again.';
}

export function SignInScreen({ navigation }: Props) {
  const { requestOtp, verifyOtp } = useAuth();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [code, setCode] = useState('');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [echoed, setEchoed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  const startResendTimer = () => {
    setResendIn(RESEND_AFTER_S);
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      setResendIn(s => {
        if (s <= 1 && timer.current) clearInterval(timer.current);
        return Math.max(0, s - 1);
      });
    }, 1000);
  };

  const sendCode = async (withProfile: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const r = await requestOtp(
        cleanPhone(phone),
        withProfile ? { nameFirst: first.trim(), nameLast: last.trim(), dpaConsent: true, kycConsent: true } : undefined
      );
      setChallengeId(r.challengeId);
      setEchoed(r.sandboxOtp ?? null);
      setCode(r.sandboxOtp ?? '');
      setStep('code');
      startResendTimer();
    } catch (e: any) {
      const msg = e?.message ?? '';
      // A number Klokd hasn't seen needs a name and consent first.
      if (!withProfile && /Profile required/i.test(msg)) {
        setStep('details');
      } else {
        setError(friendly(msg));
      }
    } finally {
      setBusy(false);
    }
  };

  const checkCode = async () => {
    if (!challengeId) return;
    setBusy(true);
    setError(null);
    try {
      const r = await verifyOtp(cleanPhone(phone), challengeId, code.trim());
      // Returning workers go straight in (the navigator switches on sign-in);
      // new ones continue through onboarding.
      if (r.isNewUser) navigation.navigate('Consent');
    } catch (e: any) {
      setError(friendly(e?.message ?? ''));
    } finally {
      setBusy(false);
    }
  };

  const detailsOk = first.trim().length >= 2 && last.trim().length >= 2 && agreed;

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <AmbientOrbs />
      <SafeTop />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <FadeUp delay={0} style={styles.head}>
          <Logo size={28} />
          <Text style={styles.title}>
            {step === 'phone' ? 'Sign in' : step === 'details' ? 'New to Klokd' : 'Enter your code'}
          </Text>
          <Text style={styles.sub}>
            {step === 'phone' && 'Use your phone number. We’ll send you a code.'}
            {step === 'details' && 'Tell us your name as it appears on your National ID.'}
            {step === 'code' && `We sent a 6-digit code to ${displayPhone(phone)}.`}
          </Text>
        </FadeUp>

        <FadeUp delay={80} style={styles.card}>
          {step === 'phone' && (
            <>
              <Field label="Phone number" value={phone} onChange={setPhone} placeholder="0712 345 678" keyboardType="phone-pad" autoFocus />
              <View style={{ height: spacing.lg }} />
              <Action busy={busy} disabled={!validPhone(phone)} onPress={() => sendCode(false)}>Continue</Action>
            </>
          )}

          {step === 'details' && (
            <>
              <Field label="First name" value={first} onChange={setFirst} autoCapitalize="words" autoFocus />
              <Field label="Last name" value={last} onChange={setLast} autoCapitalize="words" />
              <TouchableOpacity style={styles.agree} onPress={() => setAgreed(a => !a)} activeOpacity={0.7} accessibilityRole="checkbox" accessibilityState={{ checked: agreed }}>
                <View style={[styles.box, agreed && styles.boxOn]}>{agreed && <Text style={styles.tick}>✓</Text>}</View>
                <Text style={styles.agreeText}>
                  I agree to Klokd’s privacy notice, and to Klokd checking my identity before I can apply for shifts.
                </Text>
              </TouchableOpacity>
              <View style={{ height: spacing.lg }} />
              <Action busy={busy} disabled={!detailsOk} onPress={() => sendCode(true)}>Send code</Action>
              <TextLink onPress={() => setStep('phone')}>Use a different number</TextLink>
            </>
          )}

          {step === 'code' && (
            <>
              {echoed && (
                <View style={styles.echo}>
                  <Eyebrow color={colors.electric}>Your code</Eyebrow>
                  <Text style={styles.echoCode}>{echoed}</Text>
                  <Label color={colors.white50}>Text messages aren’t switched on yet, so your code is shown here.</Label>
                </View>
              )}
              <Field label="6-digit code" value={code} onChange={v => setCode(v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" autoFocus={!echoed} />
              <View style={{ height: spacing.lg }} />
              <Action busy={busy} disabled={code.length !== 6} onPress={checkCode}>Sign in</Action>
              <TextLink disabled={resendIn > 0 || busy} onPress={() => sendCode(first.trim().length > 0)}>
                {resendIn > 0 ? `Send a new code in ${resendIn}s` : 'Send a new code'}
              </TextLink>
              <TextLink onPress={() => { setStep('phone'); setCode(''); setError(null); }}>Change number</TextLink>
            </>
          )}

          {error && <Text style={styles.error}>{error}</Text>}
        </FadeUp>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboardType,
  autoCapitalize = 'none',
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad' | 'phone-pad';
  autoCapitalize?: 'none' | 'words';
  autoFocus?: boolean;
}) {
  return (
    <View style={{ marginVertical: spacing.sm }}>
      <Label color={colors.white50}>{label}</Label>
      <TextInput
        value={value}
        onChangeText={onChange}
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.white30}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        autoFocus={autoFocus}
        accessibilityLabel={label}
      />
    </View>
  );
}

function Action({ busy, disabled, onPress, children }: { busy: boolean; disabled?: boolean; onPress: () => void; children: string }) {
  if (busy) return <ActivityIndicator color={colors.electric} style={{ paddingVertical: 14 }} />;
  return (
    <View style={{ opacity: disabled ? 0.45 : 1 }} pointerEvents={disabled ? 'none' : 'auto'}>
      <GradientBtn onPress={onPress}>{children}</GradientBtn>
    </View>
  );
}

function TextLink({ onPress, disabled, children }: { onPress: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} style={{ paddingVertical: 12, alignItems: 'center' }}>
      <Text style={{ color: disabled ? colors.white30 : colors.white70, fontSize: 13.5, fontWeight: '600' }}>{children}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  scroll: { padding: spacing.xl, paddingTop: spacing.xxxl + 12, flexGrow: 1 },
  head: { marginBottom: spacing.xl },
  title: { color: colors.white, fontSize: 30, fontWeight: '900', letterSpacing: -1, marginTop: 18 },
  sub: { color: colors.white60, fontSize: 14.5, lineHeight: 21, marginTop: 6 },
  card: {
    backgroundColor: colors.white03,
    borderColor: colors.white10,
    borderWidth: 1,
    borderRadius: radius.xxl,
    padding: spacing.lg,
  },
  input: {
    backgroundColor: colors.ink,
    borderColor: colors.white10,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    color: colors.white,
    fontSize: 16,
    marginTop: 6,
  },
  agree: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginTop: spacing.md },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.white30, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  boxOn: { backgroundColor: colors.electric, borderColor: colors.electric },
  tick: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  agreeText: { color: colors.white70, fontSize: 13.5, lineHeight: 19, flex: 1 },
  echo: {
    backgroundColor: 'rgba(0,229,160,0.07)',
    borderColor: 'rgba(0,229,160,0.35)',
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  echoCode: { color: colors.electric, fontWeight: '900', fontSize: 30, letterSpacing: 6, marginVertical: 4 },
  error: { color: colors.error, fontSize: 13.5, lineHeight: 19, marginTop: spacing.md },
});
