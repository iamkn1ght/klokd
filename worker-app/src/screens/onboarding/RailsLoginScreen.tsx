/**
 * Rails-aware login — captures phone + name + consent (Identiti requires all
 * three at customer-create time per v3 contract), then walks through the
 * Klokd → Identiti → Todoku chain showing each rail response inline.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Logo, GradientBtn, Eyebrow, Label } from '../../components/Primitives';
import { AmbientOrbs, FadeUp, SafeTop } from '../../components/KlokdLayout';
import { colors, spacing, radius, typography } from '../../theme';
import { useAuth } from '../../context/AuthContext';

type Props = { navigation: NativeStackNavigationProp<any> };

type Step = 'profile' | 'otp' | 'done';

interface LogEntry {
  rail: 'Klokd' | 'Identiti' | 'Todoku';
  label: string;
  payload?: unknown;
  tone?: 'ok' | 'warn' | 'err';
}

export function RailsLoginScreen({ navigation }: Props) {
  const { requestOtp, verifyOtp } = useAuth();

  const [step, setStep] = useState<Step>('profile');
  const [phone, setPhone] = useState('+254700000005');
  const [first, setFirst] = useState('Wanjiku');
  const [last, setLast] = useState('Demo');
  const [dpa, setDpa] = useState(true);
  const [kyc, setKyc] = useState(true);
  const [otpCode, setOtpCode] = useState('');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);

  const push = (entry: LogEntry) => setLog(l => [...l, entry]);

  const [sandboxOtp, setSandboxOtp] = useState<string | null>(null);

  const doRequest = async () => {
    setBusy(true);
    try {
      push({ rail: 'Klokd', label: 'POST /api/v1/auth/otp/request', payload: { phone, profile: { nameFirst: first, nameLast: last, dpaConsent: dpa, kycConsent: kyc } } });
      push({ rail: 'Identiti', label: 'POST /v1/customers (HMAC-signed)' });
      const { challengeId: c, sandboxOtp: dev } = await requestOtp(phone, { nameFirst: first, nameLast: last, dpaConsent: dpa, kycConsent: kyc });
      setChallengeId(c);
      push({ rail: 'Klokd', label: `Generated OTP, persisted with 5-min TTL`, payload: { challenge_id: c }, tone: 'ok' });
      push({ rail: 'Identiti', label: 'POST /v1/phone-tokens (mint Todoku phone_token)' });
      push({ rail: 'Todoku', label: 'POST /v1/messages/send (OTP_SMS template)', tone: 'ok' });
      if (dev) {
        setSandboxOtp(dev);
        setOtpCode(dev);
      }
      setStep('otp');
    } catch (e) {
      push({ rail: 'Klokd', label: `Error: ${(e as Error).message}`, tone: 'err' });
    } finally {
      setBusy(false);
    }
  };

  const doVerify = async () => {
    if (!challengeId) return;
    setBusy(true);
    try {
      push({ rail: 'Klokd', label: 'POST /api/v1/auth/otp/verify', payload: { phone, challengeId, code: otpCode, role: 'WORKER' } });
      push({ rail: 'Klokd', label: 'Validate OTP against in-memory store (5-min TTL)' });
      const r = await verifyOtp(phone, challengeId, otpCode);
      push({ rail: 'Klokd', label: `User activated · JWT + refresh token minted · isNewUser=${r.isNewUser}`, tone: 'ok' });
      setStep('done');
      setTimeout(() => navigation.reset({ index: 0, routes: [{ name: 'Main' }] }), 1200);
    } catch (e) {
      push({ rail: 'Klokd', label: `Error: ${(e as Error).message}`, tone: 'err' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.screen}>
      <AmbientOrbs />
      <SafeTop />
      <ScrollView contentContainerStyle={styles.scroll}>
        <FadeUp delay={0} style={styles.head}>
          <Logo size={28} />
          <Eyebrow color={colors.electric} style={{ marginTop: 14 }}>v3 · live rails</Eyebrow>
          <Text style={styles.title}>Sign in</Text>
          <Label color={colors.white50} style={{ marginTop: 4 }}>
            Identiti issues your account · Todoku delivers your OTP · Klokd holds the spine
          </Label>
        </FadeUp>

        {step === 'profile' && (
          <FadeUp delay={120} style={styles.card}>
            <Eyebrow color={colors.electric}>01 · Identity</Eyebrow>
            <Field label="Phone (E.164)" value={phone} onChange={setPhone} />
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}><Field label="First name" value={first} onChange={setFirst} /></View>
              <View style={{ flex: 1 }}><Field label="Last name" value={last} onChange={setLast} /></View>
            </View>
            <Toggle label="DPA 2019 consent" on={dpa} onPress={() => setDpa(v => !v)} />
            <Toggle label="KYC consent" on={kyc} onPress={() => setKyc(v => !v)} />
            <Label color={colors.white45} style={{ marginTop: 10 }}>
              Required by Identiti at customer-create time. Klokd never persists this PII;
              account_uuid + kyc_tier come back and that's all Klokd stores.
            </Label>
            <View style={{ height: spacing.lg }} />
            {busy ? (
              <ActivityIndicator color={colors.electric} />
            ) : (
              <GradientBtn onPress={doRequest}>Send OTP via rails</GradientBtn>
            )}
          </FadeUp>
        )}

        {step === 'otp' && (
          <FadeUp delay={0} style={styles.card}>
            <Eyebrow color={colors.electric}>02 · Verify</Eyebrow>
            {sandboxOtp ? (
              <View style={[styles.card, { backgroundColor: 'rgba(0,229,160,0.07)', borderColor: colors.electric, marginTop: spacing.sm, marginBottom: 0 }]}>
                <Label color={colors.electric}>Sandbox OTP — prefilled</Label>
                <Text style={{ color: colors.electric, fontWeight: '900', fontSize: 28, letterSpacing: 4, marginTop: 4 }}>{sandboxOtp}</Text>
                <Label color={colors.white50} style={{ marginTop: 4 }}>
                  Production strips this field; OTP arrives via SMS only.
                </Label>
              </View>
            ) : (
              <Label color={colors.white70} style={{ marginVertical: spacing.sm }}>
                Check the API console for `[DEV] OTP for {phone}: ...`
              </Label>
            )}
            <Field label="OTP code (6 digits)" value={otpCode} onChange={setOtpCode} keyboardType="number-pad" />
            <View style={{ height: spacing.lg }} />
            {busy ? <ActivityIndicator color={colors.electric} /> : <GradientBtn onPress={doVerify}>Verify</GradientBtn>}
          </FadeUp>
        )}

        {step === 'done' && (
          <FadeUp delay={0} style={[styles.card, { borderColor: colors.electric }]}>
            <Text style={{ color: colors.electric, fontWeight: '900', fontSize: 18 }}>✓ Authenticated</Text>
            <Label color={colors.white70} style={{ marginTop: 6 }}>Klokd issued a JWT. Routing to main app...</Label>
          </FadeUp>
        )}

        <FadeUp delay={200} style={styles.logBox}>
          <Eyebrow color={colors.white50}>Live rail trace</Eyebrow>
          {log.length === 0 && (
            <Label color={colors.white30} style={{ marginTop: 8 }}>
              Each call you make appears here, tagged by rail.
            </Label>
          )}
          {log.map((e, i) => (
            <View key={i} style={styles.logRow}>
              <View style={[styles.tag, tagStyle(e.rail, e.tone)]}>
                <Text style={styles.tagText}>{e.rail}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.logLabel, e.tone === 'err' && { color: colors.error }]}>{e.label}</Text>
                {e.payload != null && (
                  <Text style={styles.logPayload}>{JSON.stringify(e.payload, null, 2)}</Text>
                )}
              </View>
            </View>
          ))}
        </FadeUp>
      </ScrollView>
    </View>
  );
}

function Field({ label, value, onChange, keyboardType }: { label: string; value: string; onChange: (v: string) => void; keyboardType?: 'default' | 'number-pad' }) {
  return (
    <View style={{ marginVertical: spacing.sm }}>
      <Label color={colors.white50}>{label}</Label>
      <TextInput
        value={value}
        onChangeText={onChange}
        style={styles.input}
        placeholderTextColor={colors.white30}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize="none"
      />
    </View>
  );
}

function Toggle({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.toggleRow} activeOpacity={0.7}>
      <Text style={{ color: on ? colors.white : colors.white65, fontSize: 13, flex: 1 }}>{label}</Text>
      <View style={[styles.track, { backgroundColor: on ? colors.electric : colors.white10 }]}>
        <View style={[styles.thumb, { transform: [{ translateX: on ? 18 : 0 }] }]} />
      </View>
    </TouchableOpacity>
  );
}

function tagStyle(rail: LogEntry['rail'], tone?: LogEntry['tone']) {
  if (tone === 'err') return { backgroundColor: 'rgba(255,107,107,0.15)', borderColor: colors.error };
  if (rail === 'Identiti') return { backgroundColor: 'rgba(0,229,160,0.12)', borderColor: colors.electric };
  if (rail === 'Todoku') return { backgroundColor: 'rgba(188,255,78,0.12)', borderColor: colors.volt };
  return { backgroundColor: colors.white06, borderColor: colors.white15 };
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  scroll: { padding: spacing.xl, paddingTop: spacing.xxxl + 12 },
  head: { marginBottom: spacing.xl },
  title: { color: colors.white, fontSize: 28, fontWeight: '900', letterSpacing: -1, marginTop: 8 },
  card: {
    backgroundColor: colors.white03,
    borderColor: colors.white10,
    borderWidth: 1,
    borderRadius: radius.xxl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  input: {
    backgroundColor: colors.ink,
    borderColor: colors.white10,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    color: colors.white,
    fontSize: 14,
    marginTop: 4,
  },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  track: { width: 38, height: 22, borderRadius: 999, padding: 2, justifyContent: 'center' },
  thumb: { width: 18, height: 18, borderRadius: 999, backgroundColor: colors.white },
  logBox: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.white03,
    borderColor: colors.white06,
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  logRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, alignItems: 'flex-start' },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    minWidth: 64,
    alignItems: 'center',
  },
  tagText: { color: colors.white, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  logLabel: { color: colors.white, fontSize: 12, fontWeight: '600' },
  logPayload: {
    color: colors.white45,
    fontSize: 10.5,
    fontFamily: typography.mono,
    marginTop: 4,
  },
});
