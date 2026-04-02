import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GradientButton } from '../../components/GradientButton';
import { colors, typography, spacing, radius } from '../../theme';

type Props = {
  navigation: NativeStackNavigationProp<any>;
  route: { params: { shiftId: string } };
};

export function ActiveShiftScreen({ navigation, route }: Props) {
  const [elapsed, setElapsed] = useState(0);

  // Live timer
  useEffect(() => {
    const timer = setInterval(() => setElapsed(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = Math.floor(elapsed / 3600);
  const mins = Math.floor((elapsed % 3600) / 60);
  const secs = elapsed % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        {/* Live badge */}
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>SHIFT ACTIVE</Text>
        </View>

        {/* Timer */}
        <Text style={styles.timer}>{pad(hours)}:{pad(mins)}:{pad(secs)}</Text>
        <Text style={styles.timerLabel}>Time on shift</Text>

        {/* Shift info */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Role</Text>
            <Text style={styles.infoValue}>Waiter</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Venue</Text>
            <Text style={styles.infoValue}>The Brew Bistro</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Scheduled</Text>
            <Text style={styles.infoValue}>5pm – 10pm</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>You earn</Text>
            <Text style={[styles.infoValue, { color: colors.electric }]}>KES 1,800</Text>
          </View>
        </View>

        {/* Emergency contact */}
        <TouchableOpacity style={styles.emergencyCard}>
          <Text style={styles.emergencyIcon}>🆘</Text>
          <View>
            <Text style={styles.emergencyTitle}>Emergency or unsafe conditions?</Text>
            <Text style={styles.emergencySub}>Tap here to report an issue immediately</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <GradientButton
          title="Clock out"
          onPress={() => navigation.navigate('PaymentConfirmed', { shiftId: route.params.shiftId })}
        />
        <Text style={styles.footerHint}>
          Payment will be sent within 30 minutes of clock-out
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  content: { flex: 1, alignItems: 'center', padding: spacing.xl, paddingTop: 40 },

  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.electricAlpha['10'],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 24,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.electric,
  },
  liveText: {
    fontSize: typography.size.micro,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: colors.electric,
  },

  timer: {
    fontSize: 48,
    fontWeight: '200',
    color: '#fff',
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
    marginBottom: 4,
  },
  timerLabel: {
    fontSize: typography.size.caption,
    color: colors.white42,
    marginBottom: 28,
  },

  infoCard: {
    width: '100%',
    backgroundColor: colors.white08,
    borderRadius: radius.md,
    padding: 14,
    borderWidth: 0.5,
    borderColor: colors.white10,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  infoLabel: { fontSize: 10, color: colors.white60 },
  infoValue: { fontSize: 10, fontWeight: '600', color: '#fff' },
  infoDivider: { height: 0.5, backgroundColor: colors.white10 },

  emergencyCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,107,107,0.08)',
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(255,107,107,0.2)',
  },
  emergencyIcon: { fontSize: 20 },
  emergencyTitle: { fontSize: typography.size.body, fontWeight: '600', color: colors.error },
  emergencySub: { fontSize: typography.size.label, color: colors.white38 },

  footer: { padding: spacing.xl, paddingBottom: spacing.xxxl, alignItems: 'center' },
  footerHint: {
    fontSize: typography.size.label,
    color: colors.white25,
    marginTop: 10,
    textAlign: 'center',
  },
});
