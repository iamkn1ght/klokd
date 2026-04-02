import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientButton } from '../../components/GradientButton';
import { useApi } from '../../hooks/useApi';
import { colors, gradients, typography, spacing, radius } from '../../theme';

type Props = {
  navigation: NativeStackNavigationProp<any>;
  route: { params: { shiftId: string } };
};

export function PaymentConfirmedScreen({ navigation, route }: Props) {
  const { get, post } = useApi();
  const [selectedStars, setSelectedStars] = useState(4);
  const [payment, setPayment] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadPayment();
  }, []);

  const loadPayment = async () => {
    try {
      const data = await get(`/payments/shift/${route.params.shiftId}`);
      setPayment(data);
    } catch {
      // Payment may not exist yet (processing) — show defaults
    }
  };

  const handleSubmitRating = async () => {
    setSubmitting(true);
    try {
      await post('/ratings', { shiftId: route.params.shiftId, stars: selectedStars });
      navigation.popToTop();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  };

  const gross = payment?.grossKes ?? 1800;
  const net = payment?.netKes ?? gross;
  const paye = payment?.payeKes ?? 0;
  const nssf = (payment?.nssfTier1Kes ?? 0) + (payment?.nssfTier2Kes ?? 0);
  const shif = payment?.shifKes ?? 0;

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        {/* Celebration checkmark */}
        <LinearGradient
          colors={[...gradients.cta]}
          style={styles.successGlow}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.checkCircle}>
            <Text style={styles.checkMark}>✓</Text>
          </View>
        </LinearGradient>

        <Text style={styles.paidTitle}>Paid!</Text>
        <Text style={styles.paidAmount}>KES {gross.toLocaleString()}</Text>
        <Text style={styles.paidSub}>Sent to M-Pesa · 0722 ••• •••</Text>

        {/* Shift summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>SHIFT SUMMARY</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Role</Text>
            <Text style={styles.summaryValue}>Waiter</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Hours</Text>
            <Text style={styles.summaryValue}>5 hrs</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Employer</Text>
            <Text style={styles.summaryValue}>The Brew Bistro</Text>
          </View>
        </View>

        {/* Deduction breakdown */}
        <View style={styles.deductionCard}>
          <Text style={styles.summaryLabel}>DEDUCTIONS</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Gross</Text>
            <Text style={styles.summaryValue}>KES 1,800</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>PAYE</Text>
            <Text style={styles.deductionValue}>- KES {paye.toLocaleString()}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>NSSF</Text>
            <Text style={styles.deductionValue}>- KES {nssf.toLocaleString()}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryKey}>SHIF</Text>
            <Text style={styles.deductionValue}>- KES {shif.toLocaleString()}</Text>
          </View>
          <View style={[styles.summaryRow, { marginTop: 4, paddingTop: 6, borderTopWidth: 0.5, borderTopColor: colors.white10 }]}>
            <Text style={[styles.summaryKey, { color: colors.electric, fontWeight: '600' }]}>Net paid</Text>
            <Text style={[styles.summaryValue, { color: colors.electric }]}>KES {net.toLocaleString()}</Text>
          </View>
        </View>

        {/* Rating */}
        <Text style={styles.ratePrompt}>Rate your employer</Text>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map(star => (
            <TouchableOpacity
              key={star}
              style={[styles.starBtn, star <= selectedStars ? styles.starActive : styles.starInactive]}
              onPress={() => setSelectedStars(star)}
            >
              <Text style={[styles.starIcon, star <= selectedStars && { color: colors.volt }]}>★</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <GradientButton
          title={submitting ? 'Submitting...' : 'Submit rating'}
          onPress={handleSubmitRating}
          disabled={submitting}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },

  successGlow: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { color: colors.electric, fontSize: 14, fontWeight: '700' },

  paidTitle: { fontSize: typography.size.h2, fontWeight: '700', color: '#fff', marginBottom: 4, letterSpacing: -0.02 },
  paidAmount: { fontSize: typography.size.display, fontWeight: '700', color: colors.electric, marginBottom: 4, letterSpacing: -0.03 },
  paidSub: { fontSize: 10, color: colors.white50, marginBottom: 18 },

  summaryCard: {
    backgroundColor: colors.white08,
    borderRadius: radius.md,
    padding: 10,
    paddingHorizontal: 14,
    width: '100%',
    marginBottom: 8,
    borderWidth: 0.5,
    borderColor: colors.white10,
  },
  summaryLabel: {
    fontSize: typography.size.nano,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.white42,
    marginBottom: 8,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  summaryKey: { fontSize: 10, color: colors.white60 },
  summaryValue: { fontSize: 10, fontWeight: '600', color: '#fff' },

  deductionCard: {
    backgroundColor: colors.white08,
    borderRadius: radius.md,
    padding: 10,
    paddingHorizontal: 14,
    width: '100%',
    marginBottom: 14,
    borderWidth: 0.5,
    borderColor: colors.white10,
  },
  deductionValue: { fontSize: 10, fontWeight: '500', color: colors.white42 },

  ratePrompt: { fontSize: 10, color: colors.white50, marginBottom: 10 },
  starsRow: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  starBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
  },
  starActive: {
    backgroundColor: 'rgba(188,255,78,0.12)',
    borderColor: 'rgba(188,255,78,0.25)',
  },
  starInactive: {
    backgroundColor: colors.white08,
    borderColor: colors.white10,
  },
  starIcon: { fontSize: 12, color: colors.white25 },

  footer: { padding: spacing.lg, paddingBottom: spacing.xxxl },
});
