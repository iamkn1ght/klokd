/**
 * SignIn — three-step flow inside one screen:
 *   1. Pick persona (Worker / Employer; Admin appears only after the email
 *      box is filled with an @klokd.co.ke address)
 *   2. Enter email · receive OTP
 *   3. Enter OTP · routed to the persona dashboard
 *
 * Sandbox: OTP code is shown inline (will be stripped in prod).
 */
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Platform } from 'react-native';
import { KlokdScreen, FadeUp, GlassCard, HoverCard } from '../../components/KlokdLayout';
import { Logo, GradientBtn, Eyebrow } from '../../components/Primitives';
import { useAuth, Persona } from '../../context/AuthContext';
import { colors, spacing, radius, typography } from '../../theme';

type Step = 'pick' | 'email' | 'otp';

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

export function SignInScreen({ onBackToLanding }: { onBackToLanding: () => void }) {
  const { signIn, canPickAdmin } = useAuth();
  const [step, setStep] = useState<Step>('pick');
  const [picked, setPicked] = useState<Persona | null>(null);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sandbox-known OTP that the user can type without an SMS arriving.
  const SANDBOX_OTP = '482931';

  const adminVisible = canPickAdmin(email);
  const visiblePersonas = PERSONAS.filter(p => (p.staff ? adminVisible : true));

  const handleRequestOtp = () => {
    if (!email.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    setError(null);
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      setStep('otp');
      setOtp(SANDBOX_OTP);
    }, 700);
  };

  const handleVerifyOtp = async () => {
    if (!picked) return;
    if (otp !== SANDBOX_OTP) {
      setError('Code does not match.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await signIn(email, picked);
    } catch (e: any) {
      setError(e.message ?? 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

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
            {step === 'pick' ? 'STEP 1 OF 3' : step === 'email' ? 'STEP 2 OF 3' : 'STEP 3 OF 3'}
          </Eyebrow>
          <Text style={styles.cardH}>
            {step === 'pick' && 'Choose your workspace.'}
            {step === 'email' && 'What’s your email?'}
            {step === 'otp' && 'Enter the 6-digit code.'}
          </Text>
          <Text style={styles.cardSub}>
            {step === 'pick' && 'You can switch any time after you sign in.'}
            {step === 'email' && 'We’ll send a one-time code. No password to remember.'}
            {step === 'otp' && `Sent to ${email} · check your inbox.`}
          </Text>

          {/* STEP: pick */}
          {step === 'pick' && (
            <View style={styles.personaList}>
              {visiblePersonas.map((p, i) => (
                <FadeUp key={p.key} delay={80 + i * 60}>
                  <PersonaCard p={p} active={picked === p.key} onPress={() => setPicked(p.key)} />
                </FadeUp>
              ))}
              {!adminVisible && (
                <View style={styles.staffHint}>
                  <Text style={styles.staffHintText}>
                    Staff?{' '}
                    <Text
                      onPress={() => {
                        setStep('email');
                      }}
                      style={styles.staffHintLink}
                    >
                      Sign in with your @klokd.co.ke email →
                    </Text>
                  </Text>
                </View>
              )}
              <View style={{ height: spacing.lg }} />
              <GradientBtn onPress={() => picked && setStep('email')} disabled={!picked}>
                Continue
              </GradientBtn>
            </View>
          )}

          {/* STEP: email */}
          {step === 'email' && (
            <View style={styles.formBlock}>
              <Text style={styles.fieldLabel}>EMAIL</Text>
              <TextInput
                value={email}
                onChangeText={t => {
                  setEmail(t);
                  setError(null);
                }}
                placeholder="you@example.com"
                placeholderTextColor={colors.white35}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                autoFocus
              />

              {/* If picking was deferred (staff hint route), let them pick now */}
              {!picked && (
                <View style={{ marginTop: spacing.md }}>
                  <Text style={styles.fieldLabel}>WORKSPACE</Text>
                  <View style={styles.personaList}>
                    {PERSONAS.filter(p => (p.staff ? canPickAdmin(email) : true)).map(p => (
                      <PersonaCard key={p.key} p={p} active={picked === p.key} onPress={() => setPicked(p.key)} />
                    ))}
                  </View>
                </View>
              )}

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <View style={{ height: spacing.lg }} />
              <GradientBtn onPress={handleRequestOtp} disabled={busy || !email || !picked}>
                {busy ? 'Sending code…' : 'Send code'}
              </GradientBtn>
              <Pressable onPress={() => setStep('pick')} style={({ hovered }: any) => [styles.stepBack, hovered && { opacity: 0.6 }]}>
                <Text style={styles.stepBackText}>← Change workspace</Text>
              </Pressable>
            </View>
          )}

          {/* STEP: OTP */}
          {step === 'otp' && (
            <View style={styles.formBlock}>
              <View style={styles.sandboxBox}>
                <Text style={styles.sandboxLabel}>SANDBOX · CODE PREFILLED</Text>
                <Text style={styles.sandboxCode}>{SANDBOX_OTP}</Text>
                <Text style={styles.sandboxSub}>Production strips this field.</Text>
              </View>
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
              <GradientBtn onPress={handleVerifyOtp} disabled={busy || otp.length !== 6}>
                {busy ? 'Verifying…' : `Enter ${picked} workspace →`}
              </GradientBtn>
              <Pressable onPress={() => setStep('email')} style={({ hovered }: any) => [styles.stepBack, hovered && { opacity: 0.6 }]}>
                <Text style={styles.stepBackText}>← Change email</Text>
              </Pressable>
            </View>
          )}
        </GlassCard>
      </FadeUp>

      <FadeUp delay={200} style={styles.legal}>
        <Text style={styles.legalText}>
          By signing in you agree to Klokd’s{' '}
          <Text style={styles.legalLink}>Terms</Text> and{' '}
          <Text style={styles.legalLink}>Privacy Policy</Text>. We never share your data with employers,
          workers, or third parties without consent. DPA 2019 compliant.
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
  fieldLabel: { color: colors.white45, fontSize: 10, fontWeight: '900', letterSpacing: 0.9, marginBottom: 6, marginTop: 4 },
  input: { backgroundColor: colors.ink, borderColor: colors.white12, borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: 14, color: colors.white, fontSize: 15, fontWeight: '600' },
  inputCode: { textAlign: 'center', letterSpacing: 6, fontSize: 22, fontWeight: '900', fontFamily: typography.mono },
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
