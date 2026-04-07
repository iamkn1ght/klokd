import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { ProgressBar } from '../../components/ProgressBar';
import { GradientButton } from '../../components/GradientButton';
import { useApi } from '../../hooks/useApi';
import { colors, gradients, typography, spacing, radius } from '../../theme';

type Props = { navigation: NativeStackNavigationProp<any> };

function formatPhone(p: string): string {
  if (p.length <= 4) return p;
  if (p.length <= 7) return p.slice(0, 4) + ' ' + p.slice(4);
  return p.slice(0, 4) + ' ' + p.slice(4, 7) + ' ' + p.slice(7);
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

export function MpesaSetupScreen({ navigation }: Props) {
  const { put } = useApi();
  const [phone, setPhone] = useState('0722');
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);

  const ready = phone.length === 10;

  const onKeyPress = (key: string) => {
    if (key === '⌫') {
      setPhone(prev => prev.slice(0, -1));
    } else if (key && phone.length < 10) {
      setPhone(prev => prev + key);
    }
  };

  if (confirmed) {
    return (
      <View style={[styles.screen, styles.successScreen]}>
        <LinearGradient
          colors={[gradients.cta[0], gradients.cta[1]]}
          style={styles.successGlow}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.successCheck}>✓</Text>
        </LinearGradient>

        <Text style={styles.successTitle}>You're in.</Text>
        <Text style={styles.successSub}>
          Your Klokd account is active. Open shifts are waiting near you right now.
        </Text>

        <View style={styles.paymentCard}>
          <Text style={styles.paymentLabel}>PAYMENT READY</Text>
          <Text style={styles.paymentNumber}>M-Pesa · {formatPhone(phone)}</Text>
          <Text style={styles.paymentSub}>Paid within 30 min of every clock-out</Text>
        </View>

        <GradientButton
          title="See open shifts →"
          onPress={() => navigation.getParent()?.navigate('Main')}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <ProgressBar currentStep={4} totalSteps={4} onBack={() => navigation.goBack()} />

        <Text style={styles.sectionH}>Where do we send your money?</Text>
        <Text style={styles.sectionSub}>Enter your M-Pesa number. Paid after every shift.</Text>

        {/* Phone display */}
        <View style={[styles.phoneDisplay, ready && styles.phoneDisplayReady]}>
          <Text style={styles.phoneLabel}>M-PESA NUMBER</Text>
          <Text style={[styles.phoneNumber, ready && { color: colors.electric }]}>
            {phone.length > 0 ? formatPhone(phone) : '07__ ___ ___'}
          </Text>
        </View>

        {/* 30-min guarantee strip */}
        <View style={styles.guaranteeStrip}>
          <Text style={styles.guaranteeText}>
            <Text style={styles.guaranteeHighlight}>30-minute guarantee</Text>
            {' — KES lands in '}
            <Text style={{ fontWeight: '700', color: '#fff' }}>
              {ready ? formatPhone(phone) : 'your M-Pesa'}
            </Text>
            {' after every clock-out.'}
          </Text>
        </View>

        {/* Custom numpad */}
        <View style={styles.numpad}>
          {KEYS.map((key, i) => {
            if (key === '') return <View key={i} style={styles.numKeyEmpty} />;
            const isDel = key === '⌫';
            return (
              <TouchableOpacity
                key={i}
                style={[styles.numKey, isDel ? styles.numKeyDel : styles.numKeyNum]}
                onPress={() => onKeyPress(key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.numKeyText, isDel && styles.numKeyDelText]}>{key}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.footer}>
        <GradientButton
          title={loading ? 'Saving...' : ready ? "I'm ready to work →" : 'Enter your M-Pesa number'}
          onPress={async () => {
            setLoading(true);
            try {
              await put('/identity/workers/mpesa', { mpesaNumber: phone });
              setConfirmed(true);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to save M-Pesa number');
            } finally {
              setLoading(false);
            }
          }}
          disabled={!ready || loading}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  content: { flex: 1, padding: spacing.xl },
  successScreen: { alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  sectionH: { fontSize: typography.size.h3, fontWeight: '700', color: '#fff', letterSpacing: -0.02, marginBottom: 4 },
  sectionSub: { fontSize: typography.size.caption, color: colors.white38, lineHeight: 19, marginBottom: 18 },
  phoneDisplay: {
    backgroundColor: colors.white05,
    borderWidth: 1.5,
    borderColor: colors.white10,
    borderRadius: radius.lg,
    paddingHorizontal: 18,
    paddingVertical: 13,
    marginBottom: 12,
  },
  phoneDisplayReady: { borderColor: colors.electric },
  phoneLabel: {
    fontSize: typography.size.micro,
    color: colors.white30,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  phoneNumber: {
    fontSize: 23,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.4,
  },
  guaranteeStrip: {
    backgroundColor: colors.electricAlpha['08'],
    borderLeftWidth: 2,
    borderLeftColor: colors.electric,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  guaranteeText: { fontSize: 11, color: colors.white42, lineHeight: 17 },
  guaranteeHighlight: { color: colors.electric, fontWeight: '600' },
  numpad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  numKey: {
    width: '31%',
    paddingVertical: 13,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  numKeyNum: {
    borderWidth: 0.5,
    borderColor: colors.white08,
    backgroundColor: colors.white05,
  },
  numKeyDel: {
    borderWidth: 0.5,
    borderColor: 'rgba(255,80,80,0.18)',
    backgroundColor: 'rgba(255,80,80,0.07)',
  },
  numKeyEmpty: { width: '31%' },
  numKeyText: { fontSize: 17, fontWeight: '600', color: '#fff' },
  numKeyDelText: { color: colors.error },
  footer: { padding: spacing.xl, paddingBottom: spacing.xxxl },

  // Success state
  successGlow: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successCheck: { color: colors.ink, fontSize: 32, fontWeight: '700' },
  successTitle: {
    fontSize: typography.size.display,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.04,
    marginBottom: 6,
  },
  successSub: {
    fontSize: typography.size.caption,
    color: colors.white42,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 210,
    marginBottom: 30,
  },
  paymentCard: {
    backgroundColor: colors.electricAlpha['08'],
    borderWidth: 1,
    borderColor: colors.electricAlpha['22'],
    borderRadius: radius.xl,
    padding: 14,
    width: '100%',
    marginBottom: 24,
  },
  paymentLabel: {
    fontSize: typography.size.micro,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.electric,
    marginBottom: 7,
  },
  paymentNumber: { fontSize: typography.size.body, fontWeight: '700', color: '#fff', marginBottom: 3 },
  paymentSub: { fontSize: typography.size.label, color: colors.white30 },
});
