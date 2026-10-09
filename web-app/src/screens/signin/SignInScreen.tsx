/**
 * SignIn — persona-first, then identity, then verify:
 *
 *   1. Pick persona (Worker / Employer; staff use the "Klokd staff?" link)
 *   2a. Worker / Employer → phone + OTP against the live rails
 *       (Identiti customer-create → Klokd OTP via Todoku). New accounts are
 *       asked for a name + consent once, which Identiti requires at
 *       customer-create time.
 *   2b. Staff → listed phone number + the Klokd staff access key
 *       (POST /auth/staff/login).
 *
 * While SMS delivery is off the API echoes `sandboxOtp`; it is shown inline
 * and prefilled. Once Todoku SMS works the echo is switched off.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { KlokdScreen, FadeUp, GlassCard, HoverCard } from '../../components/KlokdLayout';
import { Logo, GradientBtn, Eyebrow, Label } from '../../components/Primitives';
import { useAuth, Persona } from '../../context/AuthContext';
import { navigate } from '../../navigation/router';
import { colors, spacing, radius, typography } from '../../theme';

type Step = 'pick' | 'identity' | 'otp';

const PERSONAS: { key: Persona; label: string; desc: string; tint: string; staff?: boolean }[] = [
  {
    key: 'worker',
    label: 'I work shifts',
    desc: 'Find verified shifts. Get paid by M-Pesa within minutes of clock-out.',
    tint: colors.electric,
  },
  {
    key: 'employer',
    label: 'I hire workers',
    desc: 'Post a shift. Fund the escrow. Pick a vetted worker. Pay on clock-out.',
    tint: colors.volt,
  },
  {
    key: 'admin',
    label: 'Operations',
    desc: 'Compliance, payments, support, audit. Staff only.',
    tint: colors.white75,
    staff: true,
  },
];

function PersonaCard({
  p,
  active,
  onPress,
}: {
  p: (typeof PERSONAS)[number];
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ hovered, pressed }: any) => [
        styles.personaCard,
        active && { borderColor: p.tint, backgroundColor: 'rgba(0,229,160,0.04)' },
        hovered && !active && { borderColor: colors.white25, backgroundColor: colors.white06 },
        pressed && { transform: [{ scale: 0.99 }] },
      ]}
    >
      <View style={[styles.personaIcon, { backgroundColor: p.tint + '22', borderColor: p.tint + '55' }]}>
        <Text style={[styles.personaIconText, { color: p.tint }]}>{p.key === 'worker' ? '★' : p.key === 'employer' ? '◆' : '⌘'}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.personaLabelRow}>
          <Text style={styles.personaLabel}>{p.label}</Text>
          {p.staff ? (
            <View style={styles.staffBadge}>
              <Text style={styles.staffBadgeText}>STAFF</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.personaDesc}>{p.desc}</Text>
      </View>
      <Text style={[styles.personaCaret, active && { color: p.tint }]}>{active ? '✓' : '→'}</Text>
    </Pressable>
  );
}

export function SignInScreen({
  onBackToLanding,
  initialPersona,
  onAuthenticated,
}: {
  onBackToLanding: () => void;
  /** Deep link: #/signin?persona=x preselects the workspace. */
  initialPersona?: Persona | null;
  /** Called after ANY successful sign-in — the router owns navigation then. */
  onAuthenticated?: () => void;
}) {
  const { requestOtp, verifyOtp, staffSignIn: signInStaff } = useAuth();
  const [step, setStep] = useState<Step>('pick');
  const [picked, setPicked] = useState<Persona | null>(null);

  // identity fields
  const [phone, setPhone] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [needsProfile, setNeedsProfile] = useState(false);
  const [consent, setConsent] = useState(true);

  // otp fields
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [sandboxOtp, setSandboxOtp] = useState<string | null>(null);
  const [otp, setOtp] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Deep link: #/signin?persona=employer lands directly on that flow.
  useEffect(() => {
    if (initialPersona === 'worker' || initialPersona === 'employer') {
      setPicked(initialPersona);
      setStep('identity');
    } else if (initialPersona === 'admin') {
      setPicked('admin');
      setStep('identity');
    }
  }, [initialPersona]);

  const visiblePersonas = PERSONAS.filter(p => !p.staff);
  const staffSignIn = picked === 'admin';

  const validatePhone = (p: string): string | null => {
    const digits = p.replace(/[\s-()]/g, '');
    if (/^(?:\+?254|0)\d{9}$/.test(digits)) return null;
    return 'Enter a Kenyan number, e.g. 0722400500 or +254722400500.';
  };

  const handleSendCode = async () => {
    setError(null);
    if (staffSignIn) {
      // Staff: listed phone number + the Klokd staff access key.
      const phoneErr = validatePhone(phone);
      if (phoneErr) {
        setError(phoneErr);
        return;
      }
      if (!accessKey.trim()) {
        setError('Enter the staff access key.');
        return;
      }
      setBusy(true);
      try {
        await signInStaff(phone, accessKey.trim());
        onAuthenticated?.();
      } catch (e: any) {
        setError(e.message ?? 'Sign-in failed.');
      } finally {
        setBusy(false);
      }
      return;
    }

    // Worker / employer — real rails.
    const phoneError = validatePhone(phone);
    if (phoneError) {
      setError(phoneError);
      return;
    }
    if (needsProfile && (!first.trim() || !last.trim())) {
      setError('First and last name are required for a new account.');
      return;
    }
    setBusy(true);
    try {
      const profile = needsProfile
        ? { nameFirst: first.trim(), nameLast: last.trim(), dpaConsent: consent, kycConsent: consent }
        : undefined;
      const result = await requestOtp(phone, profile);
      setChallengeId(result.challengeId);
      setSandboxOtp(result.sandboxOtp ?? null);
      setOtp(result.sandboxOtp ?? '');
      setStep('otp');
    } catch (e: any) {
      // API can't tell us "new phone" before we send profile — it 422s with a
      // clear message. Catch it and reveal the profile fields.
      const msg = String(e?.message ?? '');
      if (msg.includes('Profile required')) {
        setNeedsProfile(true);
        setError('New to Klokd? Add your name and consent, then send the code again.');
      } else {
        setError(msg || 'Could not send the code. Try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async () => {
    if (!picked || !challengeId) return;
    if (otp.trim().length !== 6) {
      setError('Enter the 6-digit code.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      // The resolved persona comes back from the server (returning accounts
      // keep their registered role); AuthContext persists it and the router
      // navigates to the right workspace via onAuthenticated.
      await verifyOtp(phone, challengeId, otp.trim(), picked);
      onAuthenticated?.();
    } catch (e: any) {
      setError(e?.message ?? 'Verification failed.');
    } finally {
      setBusy(false);
    }
  };

  const heading =
    step === 'pick'
      ? 'Choose your workspace.'
      : staffSignIn
        ? 'Staff sign-in.'
        : needsProfile
          ? 'Create your account.'
          : 'What’s your phone number?';

  const subheading =
    step === 'pick'
      ? 'Returning accounts open in the workspace their number is registered as.'
      : staffSignIn
        ? 'Use your registered staff phone number and the Klokd staff access key.'
        : needsProfile
          ? 'Identiti requires your name + consent once, when your account is created.'
          : 'We’ll send a one-time code by SMS. No password to remember.';

  return (
    <KlokdScreen maxWidth={520} paddingHorizontal={spacing.xl}>
      {/* Top bar */}
      <View style={styles.topRow}>
        <Pressable onPress={onBackToLanding}>
          <Logo size={28} />
        </Pressable>
        <Pressable onPress={onBackToLanding} style={({ hovered }: any) => [styles.backLink, hovered && { opacity: 0.6 }]}>
          <Text style={styles.backLinkText}>← Back to home</Text>
        </Pressable>
      </View>

      {/* Card */}
      <FadeUp delay={0} style={{ marginTop: spacing.xxxl }}>
        <GlassCard variant="raised" padding={spacing.xxl}>
          <Eyebrow color={colors.electric}>
            {step === 'pick' ? 'STEP 1 OF 3' : step === 'identity' ? 'STEP 2 OF 3' : 'STEP 3 OF 3'}
          </Eyebrow>
          <Text style={styles.cardH}>{heading}</Text>
          <Text style={styles.cardSub}>{subheading}</Text>

          {/* STEP: pick */}
          {step === 'pick' && (
            <View style={styles.personaList}>
              {visiblePersonas.map((p, i) => (
                <FadeUp key={p.key} delay={80 + i * 60}>
                  <PersonaCard p={p} active={picked === p.key} onPress={() => setPicked(p.key)} />
                </FadeUp>
              ))}
              <View style={styles.staffHint}>
                <Text style={styles.staffHintText}>
                  Klokd staff?{' '}
                  <Text
                    onPress={() => {
                      setStep('identity');
                      setPicked('admin');
                    }}
                    style={styles.staffHintLink}
                  >
                    Sign in to the operations console →
                  </Text>
                </Text>
              </View>
              <View style={{ height: spacing.lg }} />
              <GradientBtn onPress={() => picked && setStep('identity')} disabled={!picked}>
                Continue
              </GradientBtn>
            </View>
          )}

          {/* STEP: identity */}
          {step === 'identity' && (
            <View style={styles.formBlock}>
              {staffSignIn ? (
                <>
                  <Text style={styles.fieldLabel}>STAFF PHONE NUMBER</Text>
                  <TextInput
                    value={phone}
                    onChangeText={t => {
                      setPhone(t);
                      setError(null);
                    }}
                    placeholder="0722 400 500"
                    placeholderTextColor={colors.white35}
                    style={styles.input}
                    keyboardType="phone-pad"
                    autoFocus
                  />
                  <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>ACCESS KEY</Text>
                  <TextInput
                    value={accessKey}
                    onChangeText={t => {
                      setAccessKey(t);
                      setError(null);
                    }}
                    placeholder="Klokd staff access key"
                    placeholderTextColor={colors.white35}
                    style={styles.input}
                    secureTextEntry
                    autoCapitalize="none"
                    onSubmitEditing={handleSendCode}
                  />
                </>
              ) : (
                <>
                  <Text style={styles.fieldLabel}>PHONE NUMBER</Text>
                  <TextInput
                    value={phone}
                    onChangeText={t => {
                      setPhone(t);
                      setError(null);
                    }}
                    placeholder="0722 400 500"
                    placeholderTextColor={colors.white35}
                    style={styles.input}
                    keyboardType="phone-pad"
                    autoFocus
                  />
                  {needsProfile && (
                    <>
                      <View style={styles.nameRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.fieldLabel}>FIRST NAME</Text>
                          <TextInput
                            value={first}
                            onChangeText={setFirst}
                            placeholder="Grace"
                            placeholderTextColor={colors.white35}
                            style={styles.input}
                            autoCapitalize="words"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.fieldLabel}>LAST NAME</Text>
                          <TextInput
                            value={last}
                            onChangeText={setLast}
                            placeholder="Wanjiru"
                            placeholderTextColor={colors.white35}
                            style={styles.input}
                            autoCapitalize="words"
                          />
                        </View>
                      </View>
                      <Pressable
                        onPress={() => setConsent(v => !v)}
                        style={({ hovered }: any) => [styles.consentRow, hovered && { backgroundColor: colors.white04 }]}
                      >
                        <View style={[styles.checkbox, consent && styles.checkboxOn]}>
                          {consent ? <Text style={styles.checkmark}>✓</Text> : null}
                        </View>
                        <Text style={styles.consentText}>
                          I agree to the DPA 2019 data-processing and KYC verification consent. Required by Identiti to create your account.
                        </Text>
                      </Pressable>
                    </>
                  )}
                </>
              )}

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <View style={{ height: spacing.lg }} />
              <GradientBtn
                onPress={handleSendCode}
                disabled={busy || (staffSignIn ? !phone || !accessKey : !phone || (needsProfile && (!first.trim() || !last.trim() || !consent)))}
              >
                {busy ? (staffSignIn ? 'Signing in…' : 'Sending…') : staffSignIn ? 'Sign in' : 'Send code'}
              </GradientBtn>
              <Pressable onPress={() => setStep('pick')} style={({ hovered }: any) => [styles.stepBack, hovered && { opacity: 0.6 }]}>
                <Text style={styles.stepBackText}>← Change workspace</Text>
              </Pressable>
            </View>
          )}

          {/* STEP: otp */}
          {step === 'otp' && !staffSignIn && (
            <View style={styles.formBlock}>
              {sandboxOtp ? (
                <View style={styles.sandboxBox}>
                  <Text style={styles.sandboxLabel}>YOUR CODE</Text>
                  <Text style={styles.sandboxCode}>{sandboxOtp}</Text>
                  <Text style={styles.sandboxSub}>SMS delivery isn’t switched on yet, so your code is shown here and filled in for you.</Text>
                </View>
              ) : (
                <Label color={colors.white60} style={{ marginBottom: spacing.md }}>
                  Code sent to {phone}. It expires in 5 minutes.
                </Label>
              )}
              <Text style={styles.fieldLabel}>6-DIGIT CODE</Text>
              <TextInput
                value={otp}
                onChangeText={t => {
                  setOtp(t);
                  setError(null);
                }}
                placeholder="000000"
                placeholderTextColor={colors.white35}
                style={[styles.input, styles.inputCode]}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <View style={{ height: spacing.lg }} />
              <GradientBtn onPress={handleVerify} disabled={busy || otp.length !== 6}>
                {busy ? 'Verifying…' : 'Verify & continue →'}
              </GradientBtn>
              <Pressable onPress={() => setStep('identity')} style={({ hovered }: any) => [styles.stepBack, hovered && { opacity: 0.6 }]}>
                <Text style={styles.stepBackText}>← Change number</Text>
              </Pressable>
            </View>
          )}
        </GlassCard>
      </FadeUp>

      <FadeUp delay={200} style={styles.legal}>
        <Text style={styles.legalText}>
          By signing in you agree to Klokd’s{' '}
          <Text onPress={() => navigate('/terms')} style={styles.legalLink}>Terms</Text> and{' '}
          <Text onPress={() => navigate('/privacy')} style={styles.legalLink}>Privacy Policy</Text>. We never share your data with employers,
          workers, or third parties without consent. DPA 2019 aligned.
        </Text>
      </FadeUp>
    </KlokdScreen>
  );
}

const styles = StyleSheet.create({
  topRow: {
    paddingTop: spacing.xxl + 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backLink: { paddingHorizontal: 12, paddingVertical: 8 },
  backLinkText: { color: colors.white60, fontSize: 13, fontWeight: '700' },

  cardH: { color: colors.white, fontSize: 26, fontWeight: '900', letterSpacing: -1, marginTop: 10, marginBottom: 6 },
  cardSub: { color: colors.white55, fontSize: 13.5, lineHeight: 20, marginBottom: spacing.xl },

  personaList: { gap: 10 },
  personaCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.white10, backgroundColor: colors.white03 },
  personaIcon: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  personaIconText: { fontSize: 18, fontWeight: '900' },
  personaLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  personaLabel: { color: colors.white, fontSize: 14.5, fontWeight: '900', letterSpacing: -0.3 },
  staffBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: colors.white06, borderWidth: 1, borderColor: colors.white15 },
  staffBadgeText: { color: colors.white75, fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  personaDesc: { color: colors.white55, fontSize: 11.5, marginTop: 3, fontWeight: '500', lineHeight: 16 },
  personaCaret: { color: colors.white35, fontSize: 18, fontWeight: '900', width: 16, textAlign: 'center' as any },

  staffHint: { marginTop: 4, paddingHorizontal: 4 },
  staffHintText: { color: colors.white50, fontSize: 11.5, fontWeight: '600' },
  staffHintLink: { color: colors.electric, fontWeight: '800' },

  formBlock: { gap: 10 },
  modeRow: { flexDirection: 'row', gap: 6, marginBottom: spacing.sm, backgroundColor: colors.white03, borderRadius: radius.md, padding: 3 },
  modeTab: { flex: 1, paddingVertical: 8, borderRadius: radius.sm, alignItems: 'center' },
  modeTabActive: { backgroundColor: colors.white10 },
  modeTabHover: { backgroundColor: colors.white06 },
  modeTabText: { color: colors.white55, fontSize: 12.5, fontWeight: '800' },
  modeTabTextActive: { color: colors.white },

  fieldLabel: { color: colors.white45, fontSize: 10, fontWeight: '900', letterSpacing: 0.9, marginBottom: 6, marginTop: 4 },
  input: { backgroundColor: colors.ink, borderColor: colors.white12, borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: 14, color: colors.white, fontSize: 15, fontWeight: '600' },
  inputCode: { textAlign: 'center', letterSpacing: 6, fontSize: 22, fontWeight: '900', fontFamily: typography.mono },
  nameRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: spacing.md, padding: spacing.sm, borderRadius: radius.md },
  checkbox: { width: 18, height: 18, borderRadius: 5, borderWidth: 1.5, borderColor: colors.white25, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkboxOn: { backgroundColor: colors.electric, borderColor: colors.electric },
  checkmark: { color: colors.ink, fontSize: 12, fontWeight: '900', lineHeight: 14 },
  consentText: { color: colors.white60, fontSize: 11.5, lineHeight: 16, flex: 1, fontWeight: '500' },
  error: { color: colors.error, fontSize: 12, fontWeight: '700', marginTop: 8 },

  sandboxBox: { padding: spacing.md, borderRadius: radius.lg, backgroundColor: 'rgba(0,229,160,0.07)', borderWidth: 1, borderColor: 'rgba(0,229,160,0.30)', marginBottom: spacing.md, alignItems: 'center' },
  sandboxLabel: { color: colors.electric, fontSize: 10, fontWeight: '900', letterSpacing: 1.0 },
  sandboxCode: { color: colors.electric, fontWeight: '900', fontSize: 28, letterSpacing: 6, marginTop: 4, fontFamily: typography.mono },
  sandboxSub: { color: colors.white50, fontSize: 10.5, marginTop: 4 },

  stepBack: { alignSelf: 'flex-start', paddingVertical: spacing.sm, paddingHorizontal: spacing.xs, marginTop: 4 },
  stepBackText: { color: colors.white55, fontSize: 12, fontWeight: '700' },

  legal: { marginTop: spacing.xl, paddingHorizontal: spacing.sm },
  legalText: { color: colors.white45, fontSize: 11, lineHeight: 17, textAlign: 'center' },
  legalLink: { color: colors.electric, fontWeight: '700' },
});
