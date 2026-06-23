/**
 * M-Pesa setup screen — Large number display + 30-min guarantee + numpad.
 * Ported 1:1 from claude-design/screens/onboarding.jsx
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GradientBtn, Eyebrow, Label, StepProgress } from '../../components/Primitives';
import { AmbientOrbs, FadeUp } from '../../components/KlokdLayout';
import { Icons } from '../../components/Icons';
import { useApi } from '../../hooks/useApi';
import { colors, typography } from '../../theme';

type Props = { navigation: NativeStackNavigationProp<any> };

function formatPhone(p: string): string {
  if (p.length <= 4) return p;
  if (p.length <= 7) return p.slice(0, 4) + ' ' + p.slice(4);
  return p.slice(0, 4) + ' ' + p.slice(4, 7) + ' ' + p.slice(7);
}

function isValidKenyanPhone(p: string): boolean {
  if (p.length !== 10 || !p.startsWith('0')) return false;
  const prefix = p.slice(0, 4);
  const safPrefixes = [
    '0700','0701','0702','0703','0704','0705','0706','0707','0708','0709',
    '0710','0711','0712','0713','0714','0715','0716','0717','0718','0719',
    '0720','0721','0722','0723','0724','0725','0726','0727','0728','0729',
    '0740','0741','0742','0743','0744','0745','0746','0747','0748','0749',
    '0790','0791','0792','0793','0794','0795','0796','0797','0798','0799',
    '0110','0111','0112','0113','0114','0115',
  ];
  return safPrefixes.includes(prefix);
}

const KEYS = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

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
  const { put } = useApi();
  const [num, setNum] = useState('');
  const [loading, setLoading] = useState(false);

  const ready = isValidKenyanPhone(num);
  const formatted = num.length ? formatPhone(num) : '';

  const onKey = (k: string) => {
    if (k === '⌫') setNum(n => n.slice(0, -1));
    else if (k && num.length < 10) setNum(n => n + k);
  };

  const handleDone = async () => {
    setLoading(true);
    try {
      await put('/identity/workers/mpesa', { mpesaNumber: num });
    } catch {}
    setLoading(false);
    navigation.getParent()?.navigate('Main');
  };

  return (
    <View style={styles.screen}>
      <AmbientOrbs intensity="subtle" />
      <OnbHeader step={4} onBack={() => navigation.goBack()} />

      <FadeUp delay={0} style={styles.titleBlock}>
        <Eyebrow color={colors.white40} style={{ marginBottom: 8 }}>Step 5 of 5 · Get paid</Eyebrow>
        <Text style={styles.h2}>Where should we send your money?</Text>
        <Text style={styles.sub}>Your M-Pesa number. Money lands within 30 minutes of every clock-out.</Text>
      </FadeUp>

      <View style={styles.content}>
        {/* Number display */}
        <FadeUp delay={120} style={styles.numDisplay}>
          <Label color={colors.electric} style={{ marginBottom: 6, letterSpacing: 1.54 }}>Safaricom M-Pesa</Label>
          <Text style={styles.bigNumber}>
            {formatted || <Text style={{ color: 'rgba(255,255,255,0.2)' }}>0722 000 000</Text>}
          </Text>
          <Text style={styles.numCounter}>{num.length}/10 digits</Text>
        </FadeUp>

        {/* Guarantee strip */}
        <FadeUp delay={220} style={styles.guarantee}>
          <Icons.mpesa color={colors.electric} size={14} />
          <View style={{ flex: 1 }}>
            <Text style={styles.guaranteeTitle}>30-minute guarantee</Text>
            <Text style={styles.guaranteeSub}>KES lands here after every clock-out.</Text>
          </View>
        </FadeUp>

        {/* Numpad */}
        <View style={styles.numpad}>
          {KEYS.map((k, i) => {
            if (k === '') return <View key={i} style={styles.numKeyEmpty} />;
            const isDel = k === '⌫';
            return (
              <TouchableOpacity
                key={i}
                onPress={() => onKey(k)}
                activeOpacity={0.6}
                style={[
                  styles.numKey,
                  isDel
                    ? { borderColor: 'rgba(255,107,107,0.2)', backgroundColor: 'rgba(255,107,107,0.06)' }
                    : { borderColor: 'rgba(255,255,255,0.07)', backgroundColor: colors.white04 },
                ]}
              >
                <Text style={[styles.numKeyText, { color: isDel ? colors.error : colors.white }]}>{k}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.footer}>
        <GradientBtn disabled={!ready || loading} onPress={handleDone}>
          {ready ? (loading ? 'Saving…' : "I'm ready to work") : 'Enter 10 digits to finish'}
        </GradientBtn>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  header: { paddingHorizontal: 18, paddingTop: 12, flexDirection: 'row', alignItems: 'center', gap: 14 },
  backBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 0.5, borderColor: colors.white12, backgroundColor: colors.white04, alignItems: 'center', justifyContent: 'center' },
  titleBlock: { paddingHorizontal: 22, paddingTop: 20 },
  h2: { fontSize: 22, fontWeight: '900', letterSpacing: -0.66, lineHeight: 24, color: colors.white, marginBottom: 8 },
  sub: { fontSize: 12, color: colors.white50, lineHeight: 18.6 },

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
  numCounter: { fontSize: 10, color: colors.white40, marginTop: 4 },

  guarantee: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 9,
    borderRadius: 11,
    backgroundColor: colors.white03,
    borderWidth: 1, borderColor: colors.white06,
    marginBottom: 14,
  },
  guaranteeTitle: { fontSize: 11, color: colors.white, fontWeight: '600' },
  guaranteeSub: { fontSize: 9.5, color: colors.white45 },

  numpad: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  numKey: {
    width: '31.7%',
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 0.5,
    alignItems: 'center',
  },
  numKeyEmpty: { width: '31.7%' },
  numKeyText: { fontSize: 17, fontWeight: '600' },

  footer: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 20, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.white06 },
});
