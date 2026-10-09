/**
 * Team — GET /employer/team. Everyone who has finished a shift for you; "Book
 * again" offers a new shift straight to them.
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusPill, GradientBtn } from '../../components/Primitives';
import { AmbientOrbs, SafeTop } from '../../components/KlokdLayout';
import { useData } from '../../hooks/useData';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme';
import { day } from '../../lib/format';

type Props = { navigation: NativeStackNavigationProp<any> };

interface Member { workerId: string; name: string; initials: string; shiftsHere: number; lastWorked: string; roles: string[]; yourRating: number | null; showUpRate: number | null; totalShifts: number; verified: boolean; trusted: boolean }

export function TeamScreen({ navigation }: Props) {
  const q = useData<Member[]>('/employer/team');
  const { logout } = useAuth();
  return (
    <View style={styles.screen}>
      <AmbientOrbs intensity="subtle" />
      <SafeTop />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 30, gap: 12 }}>
        <Text style={styles.h1}>Team</Text>
        <Text style={styles.p}>People who’ve worked for you. Book someone again and the shift goes straight to them.</Text>
        {q.status === 'loading' && <ActivityIndicator color={colors.volt} style={{ marginTop: 30 }} />}
        {q.status === 'error' && <Text style={styles.err}>{q.error}</Text>}
        {q.status === 'ready' && q.data!.length === 0 && <Text style={styles.empty}>Workers appear here after their first finished shift with you.</Text>}
        {(q.data ?? []).map(m => (
          <View key={m.workerId} style={styles.card}>
            <View style={styles.top}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{m.initials}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{m.name}</Text>
                <Text style={styles.meta}>{m.roles.join(', ')}</Text>
              </View>
              {m.trusted && <StatusPill tone="mint">Regular</StatusPill>}
            </View>
            <Text style={styles.meta}>
              {m.shiftsHere} shift{m.shiftsHere === 1 ? '' : 's'} here · last {day(m.lastWorked)}
              {m.yourRating != null ? ` · you rated ★ ${m.yourRating}` : ''}
              {m.showUpRate != null ? ` · ${Math.round(m.showUpRate)}% show-up` : ''}
            </Text>
            <GradientBtn size="sm" disabled={!m.verified} onPress={() => navigation.navigate('PostShift', { inviteWorkerId: m.workerId, inviteName: m.name })}>Book again</GradientBtn>
          </View>
        ))}
        <TouchableOpacity style={styles.signOut} onPress={logout}><Text style={styles.signOutText}>Sign out</Text></TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  h1: { fontSize: 28, fontWeight: '900', color: colors.white, letterSpacing: -0.9, marginTop: 8 },
  p: { color: colors.white65, fontSize: 13, lineHeight: 19 },
  err: { color: colors.warning },
  empty: { color: colors.white60, fontSize: 13, textAlign: 'center', marginTop: 20 },
  card: { padding: 16, borderRadius: 18, backgroundColor: colors.white03, borderWidth: 1, borderColor: colors.white08, gap: 10 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.volt, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.ink, fontWeight: '900' },
  name: { fontSize: 15, fontWeight: '900', color: colors.white },
  meta: { fontSize: 12, color: colors.white60, marginTop: 2 },
  signOut: { marginTop: 20, padding: 14, alignItems: 'center', borderRadius: 14, borderWidth: 1, borderColor: colors.white12 },
  signOutText: { color: colors.white75, fontWeight: '800' },
});
