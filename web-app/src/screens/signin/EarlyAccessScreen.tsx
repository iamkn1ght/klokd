/**
 * EarlyAccess — replaces self-serve sign-in on klokd.co.ke while SMS OTP
 * delivery is unavailable (EXPO_PUBLIC_SIGNIN_MODE=early-access). Captures
 * role + name + phone (+ business for employers) into the API waitlist; the
 * team onboards people manually until sign-in opens.
 */
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { KlokdScreen, FadeUp, GlassCard } from '../../components/KlokdLayout';
import { Logo, GradientBtn, Eyebrow } from '../../components/Primitives';
import { navigate } from '../../navigation/router';
import { api } from '../../services/api';
import { colors, spacing, radius } from '../../theme';

type Role = 'WORKER' | 'EMPLOYER';

const ROLES: { key: Role; label: string; desc: string; tint: string; icon: string }[] = [
  {
    key: 'WORKER',
    label: 'I work shifts',
    desc: 'Find verified shifts. Get paid by M-Pesa within minutes of clock-out.',
    tint: colors.electric,
    icon: '★',
  },
  {
    key: 'EMPLOYER',
    label: 'I hire workers',
    desc: 'Post a shift. Pick a vetted worker. Pay on clock-out.',
    tint: colors.volt,
    icon: '◆',
  },
];

export function EarlyAccessScreen({
  onBackToLanding,
  initialPersona,
}: {
  onBackToLanding: () => void;
  initialPersona?: string | null;
}) {
  const [role, setRole] = useState<Role | null>(
    initialPersona === 'employer' ? 'EMPLOYER' : initialPersona === 'worker' ? 'WORKER' : null
  );
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [area, setArea] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const employer = role === 'EMPLOYER';
  const canSubmit = !!role && name.trim().length >= 2 && !!phone.trim() && (!employer || !!businessName.trim());

  const handleSubmit = async () => {
    setError(null);
    if (!/^(?:\+?254|0)\d{9}$/.test(phone.replace(/[\s\-()]/g, ''))) {
      setError('Enter a Kenyan number, e.g. 0722400500 or +254722400500.');
      return;
    }
    setBusy(true);
    try {
      await api('/early-access', {
        method: 'POST',
        body: {
          role,
          name: name.trim(),
          phone: phone.trim(),
          businessName: employer ? businessName.trim() : undefined,
          area: area.trim() || undefined,
        },
      });
      setDone(true);
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KlokdScreen maxWidth={520} paddingHorizontal={spacing.xl}>
      <View style={styles.topRow}>
        <Pressable onPress={onBackToLanding}>
          <Logo size={28} />
        </Pressable>
        <Pressable onPress={onBackToLanding} style={({ hovered }: any) => [styles.backLink, hovered && { opacity: 0.6 }]}>
          <Text style={styles.backLinkText}>← Back to home</Text>
        </Pressable>
      </View>

      <FadeUp delay={0} style={{ marginTop: spacing.xxxl }}>
        <GlassCard variant="raised" padding={spacing.xxl}>
          {done ? (
            <View>
              <Eyebrow color={colors.electric}>YOU’RE ON THE LIST</Eyebrow>
              <Text style={styles.cardH}>Thanks, {name.trim().split(' ')[0]}.</Text>
              <Text style={styles.cardSub}>
                We’re onboarding {employer ? 'employers' : 'workers'} in Nairobi in small groups. We’ll reach you on{' '}
                {phone.trim()} when your spot opens.
              </Text>
              <GradientBtn onPress={onBackToLanding}>Back to home</GradientBtn>
            </View>
          ) : (
            <View>
              <Eyebrow color={colors.electric}>EARLY ACCESS · NAIROBI</Eyebrow>
              <Text style={styles.cardH}>Get early access.</Text>
              <Text style={styles.cardSub}>
                Klokd is opening in waves. Tell us who you are and we’ll reach you as soon as your spot opens.
              </Text>

              <View style={styles.roleList}>
                {ROLES.map(r => {
                  const active = role === r.key;
                  return (
                    <Pressable
                      key={r.key}
                      onPress={() => {
                        setRole(r.key);
                        setError(null);
                      }}
                      style={({ hovered, pressed }: any) => [
                        styles.roleCard,
                        active && { borderColor: r.tint, backgroundColor: 'rgba(0,229,160,0.04)' },
                        hovered && !active && { borderColor: colors.white25, backgroundColor: colors.white06 },
                        pressed && { transform: [{ scale: 0.99 }] },
                      ]}
                    >
                      <View style={[styles.roleIcon, { backgroundColor: r.tint + '22', borderColor: r.tint + '55' }]}>
                        <Text style={[styles.roleIconText, { color: r.tint }]}>{r.icon}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.roleLabel}>{r.label}</Text>
                        <Text style={styles.roleDesc}>{r.desc}</Text>
                      </View>
                      <Text style={[styles.roleCaret, active && { color: r.tint }]}>{active ? '✓' : ''}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {role && (
                <View style={styles.formBlock}>
                  <Text style={styles.fieldLabel}>{employer ? 'YOUR NAME' : 'FULL NAME'}</Text>
                  <TextInput
                    value={name}
                    onChangeText={t => {
                      setName(t);
                      setError(null);
                    }}
                    placeholder="Grace Wanjiru"
                    placeholderTextColor={colors.white35}
                    style={styles.input}
                    autoCapitalize="words"
                  />
                  {employer && (
                    <>
                      <Text style={styles.fieldLabel}>BUSINESS NAME</Text>
                      <TextInput
                        value={businessName}
                        onChangeText={t => {
                          setBusinessName(t);
                          setError(null);
                        }}
                        placeholder="Java House Westlands"
                        placeholderTextColor={colors.white35}
                        style={styles.input}
                        autoCapitalize="words"
                      />
                    </>
                  )}
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
                  />
                  <Text style={styles.fieldLabel}>AREA (OPTIONAL)</Text>
                  <TextInput
                    value={area}
                    onChangeText={setArea}
                    placeholder="Westlands, CBD, Kilimani…"
                    placeholderTextColor={colors.white35}
                    style={styles.input}
                    autoCapitalize="words"
                  />

                  {error ? <Text style={styles.error}>{error}</Text> : null}

                  <View style={{ height: spacing.lg }} />
                  <GradientBtn onPress={handleSubmit} disabled={busy || !canSubmit}>
                    {busy ? 'Sending…' : 'Request early access'}
                  </GradientBtn>
                </View>
              )}
            </View>
          )}
        </GlassCard>
      </FadeUp>

      <FadeUp delay={200} style={styles.legal}>
        <Text style={styles.legalText}>
          We only use your details to contact you about Klokd access. See our{' '}
          <Text onPress={() => navigate('/privacy')} style={styles.legalLink}>Privacy Policy</Text> and{' '}
          <Text onPress={() => navigate('/terms')} style={styles.legalLink}>Terms</Text>. DPA 2019 aligned.
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

  roleList: { gap: 10 },
  roleCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.white10, backgroundColor: colors.white03 },
  roleIcon: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  roleIconText: { fontSize: 18, fontWeight: '900' },
  roleLabel: { color: colors.white, fontSize: 14.5, fontWeight: '900', letterSpacing: -0.3 },
  roleDesc: { color: colors.white55, fontSize: 11.5, marginTop: 3, fontWeight: '500', lineHeight: 16 },
  roleCaret: { color: colors.white35, fontSize: 18, fontWeight: '900', width: 16, textAlign: 'center' as any },

  formBlock: { gap: 10, marginTop: spacing.lg },
  fieldLabel: { color: colors.white45, fontSize: 10, fontWeight: '900', letterSpacing: 0.9, marginBottom: 6, marginTop: 4 },
  input: { backgroundColor: colors.ink, borderColor: colors.white12, borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: 14, color: colors.white, fontSize: 15, fontWeight: '600' },
  error: { color: colors.error, fontSize: 12, fontWeight: '700', marginTop: 8 },

  legal: { marginTop: spacing.xl, paddingHorizontal: spacing.sm },
  legalText: { color: colors.white45, fontSize: 11, lineHeight: 17, textAlign: 'center' },
  legalLink: { color: colors.electric, fontWeight: '700' },
});
