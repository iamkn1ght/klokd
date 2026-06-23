/**
 * Employer Business Verify — KRA PIN + industry + cert upload + verified badge promise.
 * Ported 1:1 from claude-design/screens/employer-onboarding.jsx (EmpVerify)
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GradientBtn, Chip, Eyebrow, StepProgress } from '../../components/Primitives';
import { EmpInput } from '../../components/EmployerPrimitives';
import { AmbientOrbs, FadeUp } from '../../components/KlokdLayout';
import { Icons } from '../../components/Icons';
import { IE } from '../../components/IconsEmployer';
import { colors } from '../../theme';

type Props = { navigation: NativeStackNavigationProp<any> };

const INDUSTRIES = ['Hospitality', 'Retail', 'Events', 'Cleaning', 'Logistics', 'Other'];

function EmpOnbHeader({ step, onBack }: { step: number; onBack?: () => void }) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Icons.back color={colors.white} size={14} />
        </TouchableOpacity>
      ) : <View style={{ width: 34 }} />}
      <View style={{ flex: 1 }}>
        <StepProgress step={step} total={3} />
      </View>
      <View style={{ width: 34 }} />
    </View>
  );
}

export function BusinessVerifyScreen({ navigation }: Props) {
  const [bizName, setBizName] = useState('The Brew Bistro');
  const [kra, setKra] = useState('A0045-2398X');
  const [industry, setIndustry] = useState('Hospitality');
  const [docUploaded, setDoc] = useState(false);

  return (
    <View style={styles.screen}>
      <AmbientOrbs intensity="subtle" />
      <EmpOnbHeader step={0} onBack={() => navigation.goBack()} />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 22, paddingBottom: 120 }}>
        <FadeUp delay={0}>
          <Eyebrow color={colors.volt} style={{ marginBottom: 10 }}>STEP 01 · BUSINESS</Eyebrow>
          <Text style={styles.h1}>Verify your business</Text>
          <Text style={styles.sub}>We check KRA PIN against the Business Registration Service. Takes ~30 seconds.</Text>
        </FadeUp>

        <FadeUp delay={120}>
          <EmpInput label="Business name" value={bizName} onChangeText={setBizName} />
          <EmpInput label="KRA PIN" value={kra} onChangeText={setKra} prefix="KE" hint="Encrypted & only used for verification. We never share it." />
        </FadeUp>

        <FadeUp delay={220} style={{ marginBottom: 16 }}>
          <Text style={styles.industryLabel}>Industry</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {INDUSTRIES.map(ind => (
              <Chip key={ind} active={industry === ind} onPress={() => setIndustry(ind)}>{ind}</Chip>
            ))}
          </View>
        </FadeUp>

        {/* Upload cert */}
        <FadeUp delay={320}>
          <TouchableOpacity
            onPress={() => setDoc(true)}
            activeOpacity={0.7}
            style={[
              styles.uploadBox,
              docUploaded
                ? { borderWidth: 1, borderColor: 'rgba(0,229,160,0.33)', backgroundColor: 'rgba(0,229,160,0.03)' }
                : { borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.white15, backgroundColor: colors.white02 },
            ]}
          >
            {!docUploaded ? (
              <>
                <View style={styles.uploadIcon}>
                  <Icons.upload color={colors.white55} size={16} />
                </View>
                <Text style={styles.uploadTitle}>Upload business cert</Text>
                <Text style={styles.uploadSub}>PDF, JPG or PNG · up to 10 MB</Text>
              </>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
                <View style={styles.uploadCheckIcon}>
                  <Icons.check color={colors.electric} size={14} />
                </View>
                <View>
                  <Text style={styles.uploadTitle}>BRS-cert-2024.pdf</Text>
                  <Text style={styles.uploadMatch}>Uploaded · matching KRA…</Text>
                </View>
              </View>
            )}
          </TouchableOpacity>
        </FadeUp>

        {/* Badge promise */}
        <FadeUp delay={420} style={styles.badgePromise}>
          <Icons.shield color={colors.volt} size={14} />
          <Text style={styles.badgeText}>
            Once verified, your venue gets a <Text style={{ color: colors.volt, fontWeight: '700' }}>green badge</Text> — workers see this before accepting any shift.
          </Text>
        </FadeUp>
      </ScrollView>

      <View style={styles.footer}>
        <GradientBtn disabled={!docUploaded} onPress={() => navigation.navigate('EscrowSetup')}>
          {docUploaded ? 'Continue' : 'Upload your cert to continue'}
        </GradientBtn>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  header: { paddingHorizontal: 18, paddingTop: 12, flexDirection: 'row', alignItems: 'center', gap: 14 },
  backBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 0.5, borderColor: colors.white12, backgroundColor: colors.white04, alignItems: 'center', justifyContent: 'center' },

  h1: { fontSize: 26, fontWeight: '900', letterSpacing: -1.04, lineHeight: 28.6, color: colors.white, marginBottom: 8 },
  sub: { fontSize: 13, color: colors.white55, lineHeight: 19.5, marginBottom: 22 },

  industryLabel: { fontSize: 10, color: colors.white55, letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: '700', marginBottom: 8 },

  uploadBox: { marginTop: 18, padding: 14, borderRadius: 14, alignItems: 'center' },
  uploadIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.white04, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  uploadTitle: { fontSize: 12.5, fontWeight: '700', color: colors.white, marginBottom: 3 },
  uploadSub: { fontSize: 11, color: colors.white45 },
  uploadCheckIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,229,160,0.13)', alignItems: 'center', justifyContent: 'center' },
  uploadMatch: { fontSize: 10.5, color: colors.electric, fontWeight: '600' },

  badgePromise: {
    marginTop: 18, paddingHorizontal: 13, paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: 'rgba(188,255,78,0.05)',
    borderWidth: 1, borderColor: colors.voltAlpha['22'],
    flexDirection: 'row', gap: 9, alignItems: 'flex-start',
  },
  badgeText: { flex: 1, fontSize: 11, color: colors.white70, lineHeight: 15.95 },

  footer: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 24 },
});
