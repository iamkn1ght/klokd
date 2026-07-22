/**
 * Verify ID screen — National ID details for IPRS verification.
 *
 * Identiti KYC is a data lookup against the national register, NOT a document
 * upload — we collect typed fields (national ID, names, date of birth) and no
 * image ever leaves the device. That is what makes AD-K02 trivially true here:
 * with no photos in flight there is nothing to accidentally persist.
 */
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientBtn, Eyebrow, StepProgress } from '../../components/Primitives';
import { AmbientOrbs, FadeUp, SafeTop, PressScale } from '../../components/KlokdLayout';
import { Icons } from '../../components/Icons';
import { useApi } from '../../hooks/useApi';
import { colors } from '../../theme';

type Props = { navigation: NativeStackNavigationProp<any> };

function OnbHeader({ step, onBack }: { step: number; onBack?: () => void }) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <PressScale onPress={onBack} scaleTo={0.92} style={styles.backBtn}>
          <Icons.back color={colors.white} size={14} />
        </PressScale>
      ) : <View style={{ width: 34 }} />}
      <View style={{ flex: 1 }}>
        <StepProgress step={step} total={5} />
      </View>
      <View style={{ width: 34 }} />
    </View>
  );
}

function Field({
  label, value, onChange, placeholder, keyboardType, maxLength, autoCapitalize, error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'number-pad';
  maxLength?: number;
  autoCapitalize?: 'none' | 'words';
  error?: string | null;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.white30}
        keyboardType={keyboardType ?? 'default'}
        maxLength={maxLength}
        autoCapitalize={autoCapitalize ?? 'words'}
        autoCorrect={false}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          styles.input,
          focused && styles.inputFocused,
          !!error && styles.inputError,
        ]}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

const ID_RE = /^[0-9]{7,9}$/;
const DOB_RE = /^\d{4}-\d{2}-\d{2}$/;

export function VerifyIDScreen({ navigation }: Props) {
  const { post } = useApi();
  const [nationalId, setNationalId] = useState('');
  const [nameFirst, setNameFirst] = useState('');
  const [nameLast, setNameLast] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const idOk = ID_RE.test(nationalId);
  const dobOk = DOB_RE.test(dateOfBirth);
  const ready = idOk && dobOk && nameFirst.trim().length > 0 && nameLast.trim().length > 0;

  const handleContinue = async () => {
    setLoading(true);
    setSubmitError(null);
    try {
      await post('/identity/workers/verify-id', {
        nationalId,
        nameFirst: nameFirst.trim(),
        nameLast: nameLast.trim(),
        dateOfBirth,
      });
      setLoading(false);
      navigation.navigate('Skills');
    } catch (e) {
      setLoading(false);
      setSubmitError((e as Error).message || 'Verification failed. Check your details and try again.');
    }
  };

  return (
    <View style={styles.screen}>
      <AmbientOrbs intensity="subtle" />
      <SafeTop />
      <OnbHeader step={2} onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={20}
      >
        <FadeUp delay={0} style={styles.titleBlock}>
          <Eyebrow color={colors.white40} style={{ marginBottom: 8 }}>Step 3 of 5 · ID verification</Eyebrow>
          <Text style={styles.h2}>Get your Verified badge.</Text>
          <Text style={styles.sub}>
            We check your National ID against the government register. Takes a few seconds —
            no photos needed.
          </Text>
        </FadeUp>

        {/* Badge preview */}
        <FadeUp delay={120} style={styles.badgeRow}>
          <LinearGradient
            colors={[colors.electricAlpha['15'], colors.voltAlpha['10']]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.badge}
          >
            <LinearGradient
              colors={[colors.electric, colors.volt]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.badgeIcon}
            >
              <Icons.shield color={colors.ink} size={12} />
            </LinearGradient>
            <Text style={styles.badgeText}>VERIFIED WORKER · unlocks all shifts</Text>
          </LinearGradient>
        </FadeUp>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <FadeUp delay={200}>
            <Field
              label="NATIONAL ID NUMBER"
              value={nationalId}
              onChange={t => setNationalId(t.replace(/[^0-9]/g, ''))}
              placeholder="12345678"
              keyboardType="number-pad"
              maxLength={9}
              autoCapitalize="none"
              error={nationalId.length > 0 && !idOk ? '7-9 digits' : null}
            />
          </FadeUp>

          <FadeUp delay={260}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Field label="FIRST NAME" value={nameFirst} onChange={setNameFirst} placeholder="Akinyi" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="LAST NAME" value={nameLast} onChange={setNameLast} placeholder="Mwende" />
              </View>
            </View>
          </FadeUp>

          <FadeUp delay={320}>
            <Field
              label="DATE OF BIRTH"
              value={dateOfBirth}
              onChange={t => {
                // Auto-format to YYYY-MM-DD as the user types digits.
                const d = t.replace(/[^0-9]/g, '').slice(0, 8);
                const parts = [d.slice(0, 4), d.slice(4, 6), d.slice(6, 8)].filter(Boolean);
                setDateOfBirth(parts.join('-'));
              }}
              placeholder="1995-01-01"
              keyboardType="number-pad"
              maxLength={10}
              autoCapitalize="none"
              error={dateOfBirth.length > 0 && !dobOk ? 'Use YYYY-MM-DD' : null}
            />
          </FadeUp>

          <FadeUp delay={380} style={styles.matchNote}>
            <Icons.check color={colors.electric} size={12} />
            <Text style={styles.matchText}>
              Enter your names exactly as they appear on your National ID.
            </Text>
          </FadeUp>

          <FadeUp delay={440} style={styles.privacyNote}>
            <Icons.lock color={colors.white45} size={12} />
            <Text style={styles.privacyText}>
              Klokd never sees or stores your ID document. Verification runs at Identiti against
              the national register; we keep only the result.
            </Text>
          </FadeUp>

          {submitError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{submitError}</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <GradientBtn disabled={!ready || loading} onPress={handleContinue}>
            {loading ? 'Verifying…' : ready ? 'Verify my ID' : 'Fill in your ID details'}
          </GradientBtn>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  header: { paddingHorizontal: 18, paddingTop: 12, flexDirection: 'row', alignItems: 'center', gap: 14 },
  backBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 0.5, borderColor: colors.white12, backgroundColor: colors.white04, alignItems: 'center', justifyContent: 'center' },
  titleBlock: { paddingHorizontal: 22, paddingTop: 20 },
  h2: { fontSize: 25, fontWeight: '900', letterSpacing: -0.8, lineHeight: 29, color: colors.white, marginBottom: 8 },
  sub: { fontSize: 13.5, color: colors.white50, lineHeight: 20 },

  badgeRow: { paddingHorizontal: 22, paddingVertical: 16, alignItems: 'center' },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 8, paddingLeft: 10,
    borderRadius: 999, borderWidth: 1, borderColor: colors.electricAlpha['35'],
  },
  badgeIcon: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 11.5, fontWeight: '700', color: colors.electric, letterSpacing: 0.22 },

  scrollContent: { paddingHorizontal: 22, paddingBottom: 20 },

  fieldLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1.0, color: colors.white45, marginBottom: 7 },
  input: {
    backgroundColor: colors.white04,
    borderWidth: 1, borderColor: colors.white10,
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 52,
    color: colors.white,
    fontSize: 16, fontWeight: '600',
  },
  inputFocused: { borderColor: colors.electricAlpha['40'], backgroundColor: colors.white06 },
  inputError: { borderColor: 'rgba(255,107,107,0.45)' },
  fieldError: { color: colors.error, fontSize: 11, fontWeight: '600', marginTop: 5 },

  matchNote: {
    flexDirection: 'row', gap: 8, alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12,
    backgroundColor: 'rgba(0,229,160,0.05)',
    borderWidth: 1, borderColor: 'rgba(0,229,160,0.20)',
    marginTop: 2,
  },
  matchText: { flex: 1, fontSize: 11.5, color: colors.white70, lineHeight: 16.5 },

  privacyNote: {
    flexDirection: 'row', gap: 8,
    marginTop: 12, padding: 12, borderRadius: 12,
    backgroundColor: colors.white02,
    borderWidth: 1, borderColor: colors.white05,
  },
  privacyText: { flex: 1, fontSize: 10.5, color: colors.white45, lineHeight: 16.3 },

  errorBox: {
    marginTop: 14, padding: 12, borderRadius: 12,
    backgroundColor: 'rgba(255,107,107,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,107,107,0.30)',
  },
  errorText: { color: colors.error, fontSize: 12.5, fontWeight: '600', lineHeight: 18 },

  footer: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 20, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.white06 },
});
