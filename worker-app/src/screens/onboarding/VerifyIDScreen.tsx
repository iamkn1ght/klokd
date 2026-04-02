import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { ProgressBar } from '../../components/ProgressBar';
import { GradientButton } from '../../components/GradientButton';
import { colors, gradients, typography, spacing, radius } from '../../theme';

type Props = { navigation: NativeStackNavigationProp<any> };

interface UploadItem {
  key: 'front' | 'back' | 'selfie';
  label: string;
  sub: string;
}

const UPLOADS: UploadItem[] = [
  { key: 'front', label: 'National ID — Front', sub: 'Tap to upload' },
  { key: 'back', label: 'National ID — Back', sub: 'Tap to upload' },
  { key: 'selfie', label: 'Quick selfie', sub: 'To match your ID' },
];

export function VerifyIDScreen({ navigation }: Props) {
  const [done, setDone] = useState({ front: false, back: false, selfie: false });
  const count = Object.values(done).filter(Boolean).length;
  const allDone = count === 3;

  const toggle = (key: keyof typeof done) => {
    // In production: launch expo-image-picker here
    setDone(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <ProgressBar currentStep={2} totalSteps={4} onBack={() => navigation.goBack()} />

        {/* Motivation card */}
        <LinearGradient
          colors={['#141428', '#0c1020']}
          style={styles.motivationCard}
        >
          <LinearGradient colors={[...gradients.cta]} style={styles.badgeIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={styles.badgeStar}>★</Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={styles.badgeTitle}>
              Earn your <Text style={{ color: colors.electric }}>Verified ✦</Text> badge
            </Text>
            <Text style={styles.badgeSub}>
              Employers see it on every application. Verified workers get hired first.
            </Text>
          </View>
        </LinearGradient>

        <Text style={styles.sectionH}>Verify your identity</Text>
        <Text style={styles.sectionSub}>We verify everyone so you're always working somewhere safe.</Text>

        {/* Upload zones */}
        <View style={styles.uploadList}>
          {UPLOADS.map(item => {
            const isDone = done[item.key];
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.uploadZone, isDone ? styles.uploadDone : styles.uploadIdle]}
                onPress={() => toggle(item.key)}
                activeOpacity={0.7}
              >
                <View style={[styles.uploadIcon, isDone ? styles.uploadIconDone : styles.uploadIconIdle]}>
                  {isDone ? (
                    <Text style={{ color: colors.electric, fontSize: 17, fontWeight: '700' }}>✓</Text>
                  ) : (
                    <Text style={{ color: colors.white30, fontSize: 14 }}>📄</Text>
                  )}
                </View>
                <View>
                  <Text style={[styles.uploadLabel, isDone && { color: colors.electric }]}>
                    {item.label}
                  </Text>
                  <Text style={styles.uploadSub}>
                    {isDone ? 'Uploaded ✓' : item.sub}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {!allDone && (
          <Text style={styles.footerHint}>Tap each item to simulate upload ({count}/3)</Text>
        )}
        <GradientButton
          title={allDone ? 'Continue →' : `${count} of 3 uploaded`}
          onPress={() => navigation.navigate('Skills')}
          disabled={!allDone}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.xl, paddingBottom: 100 },
  motivationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.electricAlpha['22'],
    padding: 13,
    marginBottom: 18,
  },
  badgeIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeStar: { color: colors.ink, fontSize: 20 },
  badgeTitle: { fontSize: typography.size.body, fontWeight: '700', color: '#fff', marginBottom: 3 },
  badgeSub: { fontSize: typography.size.label, color: colors.white38, lineHeight: 17 },
  sectionH: { fontSize: typography.size.h3, fontWeight: '700', color: '#fff', letterSpacing: -0.02, marginBottom: 4 },
  sectionSub: { fontSize: typography.size.caption, color: colors.white38, lineHeight: 19, marginBottom: 18 },
  uploadList: { gap: 9 },
  uploadZone: {
    borderRadius: radius.lg,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  uploadIdle: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.white10,
    backgroundColor: colors.white05,
  },
  uploadDone: {
    borderWidth: 1.5,
    borderColor: colors.electric,
    backgroundColor: colors.electricAlpha['06'],
  },
  uploadIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadIconIdle: { backgroundColor: colors.white05 },
  uploadIconDone: { backgroundColor: colors.electricAlpha['15'] },
  uploadLabel: { fontSize: typography.size.body, fontWeight: '600', color: '#fff', marginBottom: 2 },
  uploadSub: { fontSize: typography.size.label, color: colors.white30 },
  footer: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  footerHint: { fontSize: 10, color: colors.white25, textAlign: 'center', marginBottom: 10 },
});
