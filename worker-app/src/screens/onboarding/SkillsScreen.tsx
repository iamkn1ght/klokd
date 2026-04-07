import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProgressBar } from '../../components/ProgressBar';
import { GradientButton } from '../../components/GradientButton';
import { useApi } from '../../hooks/useApi';
import { colors, typography, spacing, radius } from '../../theme';

type Props = { navigation: NativeStackNavigationProp<any> };

const ROLES = ['Waiter', 'Barista', 'Chef', 'Cashier', 'Security', 'Cleaner', 'Receptionist', 'Bartender'];

export function SkillsScreen({ navigation }: Props) {
  const { put } = useApi();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showCert, setShowCert] = useState(false);
  const [certDone, setCertDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggleSkill = (role: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(role) ? next.delete(role) : next.add(role);
      return next;
    });
  };

  const handleContinue = async () => {
    setLoading(true);
    try {
      await put('/identity/workers/profile', {
        firstName: 'User', // In production: captured from earlier input or ID verification
        lastName: 'Name',
        skills: Array.from(selected),
      });
      navigation.navigate('Consent');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save skills');
    } finally {
      setLoading(false);
    }
  };

  const hasSelection = selected.size > 0;

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <ProgressBar currentStep={3} totalSteps={4} onBack={() => navigation.goBack()} />

        <Text style={styles.sectionH}>What do you do?</Text>
        <Text style={styles.sectionSub}>Select all roles that apply. You'll only see matching shifts.</Text>

        <View style={styles.chipWrap}>
          {ROLES.map(role => {
            const isOn = selected.has(role);
            return (
              <TouchableOpacity key={role} style={[styles.chip, isOn ? styles.chipOn : styles.chipOff]}
                onPress={() => toggleSkill(role)} activeOpacity={0.7}>
                <Text style={[styles.chipText, isOn ? styles.chipTextOn : styles.chipTextOff]}>
                  {isOn ? '✓ ' : ''}{role}
                </Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity style={[styles.chip, styles.chipMore]}>
            <Text style={styles.chipMoreText}>+ More</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.certToggle} onPress={() => setShowCert(!showCert)} activeOpacity={0.7}>
          <View>
            <Text style={styles.certTitle}>Got a certificate?</Text>
            <Text style={styles.certSub}>Food handler · First aid · Health & safety</Text>
          </View>
          <View style={styles.certPlusBtn}><Text style={styles.certPlusText}>{showCert ? '−' : '+'}</Text></View>
        </TouchableOpacity>

        {showCert && (
          <TouchableOpacity style={[styles.certUpload, certDone && styles.certUploadDone]}
            onPress={() => setCertDone(!certDone)} activeOpacity={0.7}>
            <View style={[styles.certIcon, certDone && styles.certIconDone]}>
              <Text style={{ color: certDone ? colors.electric : colors.white25, fontSize: 16 }}>{certDone ? '✓' : '📄'}</Text>
            </View>
            <View>
              <Text style={[styles.certLabel, certDone && { color: colors.electric }]}>{certDone ? 'Certificate added ✓' : 'Upload certificate'}</Text>
              <Text style={styles.certFileSub}>PDF or photo · Max 5MB</Text>
            </View>
          </TouchableOpacity>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <GradientButton
          title={loading ? 'Saving...' : hasSelection ? `Continue with ${selected.size} skill${selected.size > 1 ? 's' : ''} →` : 'Select at least one role'}
          onPress={handleContinue} disabled={!hasSelection || loading} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.xl, paddingBottom: 100 },
  sectionH: { fontSize: typography.size.h3, fontWeight: '700', color: '#fff', letterSpacing: -0.02, marginBottom: 4 },
  sectionSub: { fontSize: typography.size.caption, color: colors.white38, lineHeight: 19, marginBottom: 20 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 999 },
  chipOff: { borderWidth: 1.5, borderColor: colors.white10, backgroundColor: colors.white05 },
  chipOn: { borderWidth: 1.5, borderColor: colors.electric, backgroundColor: colors.electricAlpha['13'] },
  chipText: { fontSize: 12.5 },
  chipTextOff: { color: colors.white42, fontWeight: '400' },
  chipTextOn: { color: colors.electric, fontWeight: '700' },
  chipMore: { borderWidth: 1.5,  borderColor: colors.white10, backgroundColor: 'transparent' },
  chipMoreText: { color: colors.white25, fontSize: 12.5 },
  certToggle: { backgroundColor: colors.white05, borderWidth: 0.5, borderColor: colors.white10, borderRadius: radius.lg, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  certTitle: { fontSize: typography.size.body, fontWeight: '600', color: '#fff', marginBottom: 2 },
  certSub: { fontSize: typography.size.label, color: colors.white30 },
  certPlusBtn: { width: 22, height: 22, borderRadius: 11, borderWidth: 0.5, borderColor: colors.white12, alignItems: 'center', justifyContent: 'center' },
  certPlusText: { color: colors.white38, fontSize: 13 },
  certUpload: { borderWidth: 1.5,  borderColor: colors.white10, borderRadius: radius.lg, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  certUploadDone: { borderColor: colors.electric, backgroundColor: colors.electricAlpha['06'] },
  certIcon: { width: 36, height: 36, borderRadius: 8, backgroundColor: colors.white05, alignItems: 'center', justifyContent: 'center' },
  certIconDone: { backgroundColor: colors.electricAlpha['15'] },
  certLabel: { fontSize: typography.size.body, fontWeight: '600', color: '#fff', marginBottom: 2 },
  certFileSub: { fontSize: typography.size.label, color: colors.white30 },
  footer: { padding: spacing.xl, paddingBottom: spacing.xxxl },
});
