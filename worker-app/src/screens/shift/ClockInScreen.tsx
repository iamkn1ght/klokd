import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientButton } from '../../components/GradientButton';
import { colors, gradients, typography, spacing, radius } from '../../theme';

type Props = {
  navigation: NativeStackNavigationProp<any>;
  route: { params: { shiftId: string } };
};

export function ClockInScreen({ navigation, route }: Props) {
  const [status, setStatus] = useState<'checking' | 'ready' | 'too_far' | 'wiba_fail'>('checking');
  const [distance, setDistance] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Simulate GPS check
  useEffect(() => {
    const timer = setTimeout(() => {
      // Simulate: within range
      setDistance(127);
      setStatus('ready');
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Pulse animation for the GPS ring
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const isReady = status === 'ready';

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        {/* GPS ring */}
        <View style={styles.ringContainer}>
          <Animated.View style={[styles.outerRing, { transform: [{ scale: pulseAnim }] }]}>
            <View style={[styles.innerRing, isReady && styles.innerRingReady]}>
              <LinearGradient
                colors={isReady ? [...gradients.cta] : ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                style={styles.centerCircle}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={[styles.centerIcon, isReady && { color: colors.ink }]}>
                  {status === 'checking' ? '📡' : isReady ? '✓' : '✗'}
                </Text>
              </LinearGradient>
            </View>
          </Animated.View>
        </View>

        {/* Status text */}
        <Text style={styles.statusTitle}>
          {status === 'checking' ? 'Checking location...'
            : isReady ? 'You\'re at the venue'
            : 'Too far from venue'}
        </Text>
        <Text style={styles.statusSub}>
          {status === 'checking' ? 'Verifying GPS position'
            : isReady ? `${distance}m away — within 500m range`
            : `${distance}m away — must be within 500m`}
        </Text>

        {/* WIBA gate indicator */}
        <View style={[styles.gateCard, isReady && styles.gateCardReady]}>
          <View style={styles.gateRow}>
            <Text style={[styles.gateIcon, isReady && { color: colors.electric }]}>
              {isReady ? '✓' : '○'}
            </Text>
            <View>
              <Text style={styles.gateTitle}>WIBA Insurance</Text>
              <Text style={styles.gateSub}>
                {isReady ? 'Employer coverage confirmed' : 'Checking employer policy...'}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.gateCard, isReady && styles.gateCardReady]}>
          <View style={styles.gateRow}>
            <Text style={[styles.gateIcon, isReady && { color: colors.electric }]}>
              {isReady ? '✓' : '○'}
            </Text>
            <View>
              <Text style={styles.gateTitle}>GPS Verified</Text>
              <Text style={styles.gateSub}>
                {isReady ? 'Within 500m radius' : 'Acquiring signal...'}
              </Text>
            </View>
          </View>
        </View>

        {/* Offline indicator */}
        <View style={styles.offlineNote}>
          <Text style={styles.offlineText}>
            No signal? Clock-in will sync when you're back online.
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <GradientButton
          title={isReady ? 'Clock in →' : 'Verifying...'}
          onPress={() => navigation.navigate('ActiveShift', { shiftId: route.params.shiftId })}
          disabled={!isReady}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  content: { flex: 1, alignItems: 'center', padding: spacing.xl, paddingTop: 40 },

  ringContainer: { marginBottom: 24 },
  outerRing: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1.5,
    borderColor: colors.electricAlpha['22'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: colors.white10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerRingReady: { borderColor: colors.electricAlpha['40'] },
  centerCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerIcon: { fontSize: 32, color: colors.white50 },

  statusTitle: {
    fontSize: typography.size.h2,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.02,
    marginBottom: 4,
  },
  statusSub: {
    fontSize: typography.size.caption,
    color: colors.white42,
    marginBottom: 28,
  },

  gateCard: {
    width: '100%',
    backgroundColor: colors.white05,
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 0.5,
    borderColor: colors.white10,
    marginBottom: 8,
  },
  gateCardReady: {
    borderColor: colors.electricAlpha['22'],
    backgroundColor: colors.electricAlpha['06'],
  },
  gateRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  gateIcon: { fontSize: 16, color: colors.white30, width: 20, textAlign: 'center' },
  gateTitle: { fontSize: typography.size.body, fontWeight: '600', color: '#fff' },
  gateSub: { fontSize: typography.size.label, color: colors.white38 },

  offlineNote: {
    marginTop: 16,
    paddingHorizontal: 12,
  },
  offlineText: {
    fontSize: typography.size.label,
    color: colors.white25,
    textAlign: 'center',
    lineHeight: 16,
  },

  footer: { padding: spacing.xl, paddingBottom: spacing.xxxl },
});
