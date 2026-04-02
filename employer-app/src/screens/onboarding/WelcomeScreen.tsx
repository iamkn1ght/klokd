import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LogoMark } from '../../components/LogoMark';
import { GradientButton } from '../../components/GradientButton';
import { colors, typography, spacing, radius } from '../../theme';

type Props = { navigation: NativeStackNavigationProp<any> };

const VALUE_PROPS = [
  { icon: '📋', title: 'Post in 2 minutes', sub: 'Role, time, rate. Verified workers see it immediately.' },
  { icon: '✓', title: 'Verified workers near you', sub: 'ID-checked, rated, sorted by proximity and reliability.' },
  { icon: '💰', title: 'Pay only on completion', sub: 'Funds held securely. Auto-released when the shift is done.' },
];

export function WelcomeScreen({ navigation }: Props) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
      {/* Header */}
      <View style={styles.header}>
        <LogoMark size={30} />
        <View style={styles.badge}>
          <Text style={styles.badgeText}>For Business</Text>
        </View>
      </View>

      {/* Hero card */}
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Your staff,{'\n'}sorted.</Text>
        <Text style={styles.heroSub}>
          Verified casual workers. Ready when you need them. M-Pesa payments on shift completion.
        </Text>
      </View>

      {/* Value props */}
      {VALUE_PROPS.map((vp, i) => (
        <View key={i} style={styles.vpCard}>
          <Text style={styles.vpIcon}>{vp.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.vpTitle}>{vp.title}</Text>
            <Text style={styles.vpSub}>{vp.sub}</Text>
          </View>
        </View>
      ))}

      <View style={{ marginTop: 20 }}>
        <GradientButton title="Set up your account" onPress={() => navigation.navigate('BusinessVerify')} />
      </View>

      <TouchableOpacity style={styles.signInRow}>
        <Text style={styles.signInText}>
          Already set up? <Text style={styles.signInLink}>Sign in</Text>
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.mist },
  scrollContent: { padding: spacing.xl, paddingTop: spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  badge: { backgroundColor: colors.ink, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 },
  badgeText: { fontSize: typography.size.label, fontWeight: '700', color: colors.electric, letterSpacing: 0.2 },
  heroCard: {
    backgroundColor: colors.white, borderRadius: 20, padding: 20, alignItems: 'center',
    borderWidth: 1, borderColor: colors.soft, marginBottom: 16,
  },
  heroTitle: { fontSize: 20, fontWeight: '800', color: colors.ink, letterSpacing: -0.03, textAlign: 'center', lineHeight: 24, marginBottom: 8 },
  heroSub: { fontSize: typography.size.caption, color: colors.mid, textAlign: 'center', lineHeight: 19, maxWidth: 200 },
  vpCard: {
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.soft, borderRadius: radius.lg,
    padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8,
  },
  vpIcon: { fontSize: 24 },
  vpTitle: { fontSize: typography.size.body, fontWeight: '700', color: colors.ink, marginBottom: 2 },
  vpSub: { fontSize: typography.size.label, color: colors.mid, lineHeight: 15 },
  signInRow: { alignItems: 'center', marginTop: spacing.md },
  signInText: { fontSize: 11, color: colors.mid },
  signInLink: { color: colors.ink, fontWeight: '700' },
});
