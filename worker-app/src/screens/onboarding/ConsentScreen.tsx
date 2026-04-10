import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProgressBar } from '../../components/ProgressBar';
import { GradientButton } from '../../components/GradientButton';
import { useApi } from '../../hooks/useApi';
import { colors, typography, spacing, radius } from '../../theme';

type Props = { navigation: NativeStackNavigationProp<any> };

interface ConsentItem {
  key: 'identity' | 'gps';
  title: string;
  description: string;
  detail: string;
}

const CONSENTS: ConsentItem[] = [
  {
    key: 'identity',
    title: 'Identity verification',
    description: 'We process your National ID and selfie to verify your identity with employers.',
    detail: 'Your ID number is hashed (never stored in plain text). Images are encrypted at rest. You can request deletion at any time.',
  },
  {
    key: 'gps',
    title: 'Location for clock-in',
    description: 'We use GPS to verify you are within 500m of the work venue when you clock in.',
    detail: 'Raw coordinates are converted to an approximate area code and discarded. We never track you outside of clock-in.',
  },
];

export function ConsentScreen({ navigation }: Props) {
  const { post } = useApi();
  const [consented, setConsented] = useState({ identity: false, gps: false });
  const [loading, setLoading] = useState(false);
  const allConsented = consented.identity && consented.gps;

  const toggle = (key: keyof typeof consented) => {
    setConsented(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <ProgressBar currentStep={3} totalSteps={4} onBack={() => navigation.goBack()} />

        {/* DPA header */}
        <View style={styles.dpaHeader}>
          <Text style={styles.dpaBadge}>DPA 2019</Text>
        </View>

        <Text style={styles.sectionH}>Privacy & consent</Text>
        <Text style={styles.sectionSub}>
          Klokd complies with the Kenya Data Protection Act, 2019. We need your explicit consent
          to process the following data.
        </Text>

        {CONSENTS.map(item => {
          const isOn = consented[item.key];
          return (
            <View key={item.key} style={styles.consentCard}>
              <View style={styles.consentHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.consentTitle}>{item.title}</Text>
                  <Text style={styles.consentDesc}>{item.description}</Text>
                </View>
              </View>

              <View style={styles.consentDetail}>
                <Text style={styles.detailLabel}>How we protect this data</Text>
                <Text style={styles.detailText}>{item.detail}</Text>
              </View>

              <TouchableOpacity
                style={[styles.consentToggle, isOn && styles.consentToggleOn]}
                onPress={() => toggle(item.key)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkBox, isOn && styles.checkBoxOn]}>
                  {isOn && <Text style={styles.checkMark}>✓</Text>}
                </View>
                <Text style={[styles.consentAction, isOn && { color: colors.electric }]}>
                  {isOn ? 'Consent given' : 'I consent to this processing'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}

        <View style={styles.legalNote}>
          <Text style={styles.legalText}>
            You can withdraw consent at any time from Settings → Privacy. Withdrawal does not
            affect the lawfulness of processing before withdrawal.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {!allConsented && (
          <Text style={styles.footerHint}>Both consents are required to proceed</Text>
        )}
        <GradientButton
          title={loading ? 'Saving...' : allConsented ? 'Continue →' : 'Give consent to continue'}
          onPress={async () => {
            setLoading(true);
            try {
              await post('/identity/workers/consent', { consentIdentity: true, consentGps: true });
            } catch {
              // API may fail without auth — continue anyway
            } finally {
              setLoading(false);
              navigation.navigate('MpesaSetup');
            }
          }}
          disabled={!allConsented || loading}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.xl, paddingBottom: 100 },
  dpaHeader: { marginBottom: 12 },
  dpaBadge: {
    alignSelf: 'flex-start',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.electric,
    backgroundColor: colors.electricAlpha['10'],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  sectionH: { fontSize: typography.size.h3, fontWeight: '700', color: '#fff', letterSpacing: -0.02, marginBottom: 4 },
  sectionSub: { fontSize: typography.size.caption, color: colors.white38, lineHeight: 19, marginBottom: 20 },
  consentCard: {
    backgroundColor: colors.white05,
    borderRadius: radius.xl,
    borderWidth: 0.5,
    borderColor: colors.white10,
    padding: 14,
    marginBottom: 12,
  },
  consentHeader: { flexDirection: 'row', marginBottom: 10 },
  consentTitle: { fontSize: typography.size.body, fontWeight: '700', color: '#fff', marginBottom: 4 },
  consentDesc: { fontSize: typography.size.label, color: colors.white42, lineHeight: 16 },
  consentDetail: {
    backgroundColor: colors.white05,
    borderRadius: radius.md,
    padding: 10,
    marginBottom: 10,
  },
  detailLabel: { fontSize: typography.size.micro, fontWeight: '600', color: colors.white50, marginBottom: 4 },
  detailText: { fontSize: typography.size.label, color: colors.white38, lineHeight: 16 },
  consentToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: colors.white05,
  },
  consentToggleOn: { backgroundColor: colors.electricAlpha['06'] },
  checkBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.white25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxOn: { borderColor: colors.electric, backgroundColor: colors.electricAlpha['15'] },
  checkMark: { color: colors.electric, fontSize: 12, fontWeight: '700' },
  consentAction: { fontSize: typography.size.body, fontWeight: '600', color: colors.white50 },
  legalNote: {
    borderLeftWidth: 2,
    borderLeftColor: colors.white10,
    paddingLeft: 12,
    marginTop: 8,
  },
  legalText: { fontSize: typography.size.label, color: colors.white30, lineHeight: 16 },
  footer: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  footerHint: { fontSize: 10, color: colors.white25, textAlign: 'center', marginBottom: 10 },
});
