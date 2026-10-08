/**
 * M-Pesa setup screen — confirms payouts go to the worker's verified sign-in
 * number. Klokd never stores an M-Pesa number (Identiti holds the verified
 * phone, Kipkiren Pay will hold the payout destination), so this step only
 * shows the number and explains it; there is nothing to save.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GradientBtn, Eyebrow, Label, StepProgress } from '../../components/Primitives';
import { AmbientOrbs, FadeUp, SafeTop } from '../../components/KlokdLayout';
import { Icons } from '../../components/Icons';
import { useAuth } from '../../context/AuthContext';
import { colors, typography } from '../../theme';

type Props = { navigation: NativeStackNavigationProp<any> };

/** +254722400500 / 254722400500 / 0722400500 → "0722 400 500". */
function displayPhone(raw: string | undefined): string | null {
  if (!raw) return null;
  let d = raw.replace(/[^\d]/g, '');
  if (d.startsWith('254')) d = '0' + d.slice(3);
  if (d.length !== 10) return raw;
  return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
}

function OnbHeader({ step, onBack }: { step: number; onBack?: () => void }) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Icons.back color={colors.white} size={14} />
        </TouchableOpacity>
      ) : <View style={{ width: 34 }} />}
      <View style={{ flex: 1 }}>
        <StepProgress step={step} total={5} />
      </View>
      <View style={{ width: 34 }} />
    </View>
  );
}

export function MpesaSetupScreen({ navigation }: Props) {
  const { user, completeOnboarding } = useAuth();
  const phone = displayPhone(user?.phone);

  return (
    <View style={styles.screen}>
      <AmbientOrbs intensity="subtle" />
      <SafeTop />
      <OnbHeader step={4} onBack={() => navigation.goBack()} />

      <FadeUp delay={0} style={styles.titleBlock}>
        <Eyebrow color={colors.white40} style={{ marginBottom: 8 }}>Step 5 of 5 · Get paid</Eyebrow>
        <Text style={styles.h2}>Your pay goes to this number.</Text>
        <Text style={styles.sub}>
          Klokd pays to the M-Pesa account on the number you signed in with. It was verified by SMS, so nobody else can redirect your money.
        </Text>
      </FadeUp>

      <View style={styles.content}>
        <FadeUp delay={120} style={styles.numDisplay}>
          <Label color={colors.electric} style={{ marginBottom: 6, letterSpacing: 1.54 }}>Verified · M-Pesa payouts</Label>
          <Text style={styles.bigNumber}>{phone ?? 'Your sign-in number'}</Text>
          <View style={styles.verifiedRow}>
            <Icons.mpesa color={colors.electric} size={13} />
            <Text style={styles.verifiedText}>Confirmed by SMS when you signed in</Text>
          </View>
        </FadeUp>

        <FadeUp delay={220} style={styles.note}>
          <Text style={styles.noteTitle}>Make sure M-Pesa is active on this line</Text>
          <Text style={styles.noteSub}>
            Pay is sent after each clock-out, with a payslip showing every deduction.
          </Text>
        </FadeUp>

        <FadeUp delay={300} style={styles.note}>
          <Text style={styles.noteTitle}>Want pay on a different number?</Text>
          <Text style={styles.noteSub}>
            Sign in with that number instead. Payouts always follow your verified sign-in number.
          </Text>
        </FadeUp>
      </View>

      <View style={styles.footer}>
        <GradientBtn onPress={completeOnboarding}>I'm ready to work</GradientBtn>
      </View>
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

  content: { flex: 1, paddingHorizontal: 22, paddingTop: 20 },

  numDisplay: {
    paddingHorizontal: 16, paddingVertical: 18,
    borderRadius: 16,
    backgroundColor: 'rgba(0,229,160,0.04)',
    borderWidth: 1, borderColor: 'rgba(0,229,160,0.18)',
    marginBottom: 12,
    alignItems: 'center',
  },
  bigNumber: {
    fontSize: 26,
    fontWeight: '700',
    fontFamily: typography.mono,
    letterSpacing: 0.52,
    color: colors.white,
    minHeight: 34,
    textAlign: 'center',
  },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  verifiedText: { fontSize: 11.5, color: colors.white60, fontWeight: '600' },

  note: {
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.white03,
    borderWidth: 1, borderColor: colors.white06,
    marginBottom: 10,
  },
  noteTitle: { fontSize: 13, color: colors.white, fontWeight: '700' },
  noteSub: { fontSize: 12, color: colors.white50, lineHeight: 17, marginTop: 3 },

  footer: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 20, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.white06 },
});
