/**
 * Settings (employer) — the business's account page: who's signed in,
 * verification status, notifications, support, legal, sign out, and the
 * app version (quote it when reporting a problem). iOS grouped-list layout.
 *
 *   GET /identity/employers/profile   business name, KRA PIN, WIBA state
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking, TouchableOpacity } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { AmbientOrbs, SafeTop, Glass } from '../../components/KlokdLayout';
import { Icons } from '../../components/Icons';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../hooks/useData';
import { colors } from '../../theme';
import type { EmployerProfile } from './DashboardScreen';

type Props = { navigation: NativeStackNavigationProp<any> };

function updateLabel(): string {
  try {
    return Updates.updateId ? `update ${Updates.updateId.slice(0, 8)}` : 'development build';
  } catch {
    return 'update unknown';
  }
}

function Row({ label, detail, onPress, danger, last }: { label: string; detail?: string; onPress: () => void; danger?: boolean; last?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, !last && styles.rowLine, pressed && { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
      <Text style={[styles.rowLabel, danger && styles.danger]}>{label}</Text>
      {!danger && (
        <View style={styles.rowRight}>
          {detail ? <Text style={styles.rowDetail} numberOfLines={1}>{detail}</Text> : null}
          <Text style={styles.chev}>›</Text>
        </View>
      )}
    </Pressable>
  );
}

export function SettingsScreen({ navigation }: Props) {
  const { logout, businessName } = useAuth();
  const profile = useData<EmployerProfile>('/identity/employers/profile');
  const p = profile.data;
  const verified = !!p?.canPostShifts;
  const verifyDetail = !p
    ? ''
    : verified
      ? 'Verified'
      : !p.kraPinMasked
        ? 'Add KRA PIN'
        : p.wiba.status === 'expired'
          ? 'Renew WIBA'
          : 'Declare WIBA';

  return (
    <View style={styles.screen}>
      <AmbientOrbs intensity="subtle" />
      <SafeTop />
      <View style={styles.top}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12} accessibilityLabel="Back" style={styles.back}>
          <Icons.back color={colors.white} size={18} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 4, paddingBottom: 48 }}>
        <Text style={styles.h1}>Settings</Text>

        <Glass style={styles.account}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(p?.businessName ?? businessName ?? 'K').trim().slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.biz} numberOfLines={1}>{p?.businessName ?? businessName ?? 'Your business'}</Text>
            <Text style={[styles.status, { color: verified ? colors.volt : colors.warning }]}>
              {p ? (verified ? 'Verified · can post shifts' : 'Not verified yet') : ' '}
            </Text>
          </View>
        </Glass>

        <Text style={styles.groupLabel}>BUSINESS</Text>
        <Glass style={styles.group}>
          <Row label="Business verification" detail={verifyDetail} onPress={() => navigation.navigate('Verify')} />
          <Row label="Notifications" onPress={() => navigation.navigate('Notifications')} last />
        </Glass>

        <Text style={styles.groupLabel}>SUPPORT</Text>
        <Glass style={styles.group}>
          <Row label="Help & support" detail="support@klokd.co.ke" onPress={() => Linking.openURL('mailto:support@klokd.co.ke?subject=Klokd%20for%20Business')} last />
        </Glass>

        <Text style={styles.groupLabel}>LEGAL</Text>
        <Glass style={styles.group}>
          <Row label="Terms of service" onPress={() => Linking.openURL('https://klokd.co.ke/#/terms')} />
          <Row label="Privacy policy" onPress={() => Linking.openURL('https://klokd.co.ke/#/privacy')} last />
        </Glass>

        <Glass style={[styles.group, { marginTop: 22 }]}>
          <Row label="Sign out" danger onPress={logout} last />
        </Glass>

        <View style={styles.about}>
          <Text style={styles.aboutName}>Klokd for Business</Text>
          <Text style={styles.version}>Version {Constants.expoConfig?.version ?? '1.0.0'} · {updateLabel()}</Text>
          <Text style={styles.version}>© {new Date().getFullYear()} Klokd · Kirimon Market Ventures</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  top: { paddingHorizontal: 16, paddingTop: 4, height: 48, justifyContent: 'center' },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  h1: { color: colors.white, fontSize: 32, fontWeight: '900', letterSpacing: -1, marginBottom: 16 },
  account: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 20 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(188,255,78,0.16)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.volt, fontSize: 22, fontWeight: '900' },
  biz: { color: colors.white, fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  status: { fontSize: 13, fontWeight: '700', marginTop: 3 },
  groupLabel: { color: colors.white45, fontSize: 12, fontWeight: '700', letterSpacing: 0.6, marginTop: 22, marginBottom: 8, marginLeft: 16 },
  group: { borderRadius: 16 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 50, paddingHorizontal: 16 },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.12)' },
  rowLabel: { color: colors.white, fontSize: 16 },
  danger: { color: colors.error, textAlign: 'center', flex: 1 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1, marginLeft: 12 },
  rowDetail: { color: colors.white45, fontSize: 14, flexShrink: 1 },
  chev: { color: colors.white35, fontSize: 22, marginTop: -2 },
  about: { alignItems: 'center', marginTop: 28, gap: 3 },
  aboutName: { color: colors.white60, fontSize: 13, fontWeight: '800' },
  version: { color: colors.white35, fontSize: 11.5, textAlign: 'center' },
});
