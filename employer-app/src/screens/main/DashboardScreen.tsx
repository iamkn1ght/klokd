/**
 * Dashboard — all real:
 *   GET /employer/overview            pay committed, spend, show-up, approvals
 *   GET /identity/employers/profile   verification banner
 *   GET /attendance/feed              live activity at your venues
 *   GET /me/notifications             unread count
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GradientBtn, Label } from '../../components/Primitives';
import { AmbientOrbs, SafeTop, FadeUp } from '../../components/KlokdLayout';
import { Icons } from '../../components/Icons';
import { useData } from '../../hooks/useData';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme';
import { kes, time, greeting, day } from '../../lib/format';

type Props = { navigation: NativeStackNavigationProp<any> };

export interface EmployerProfile {
  businessName: string;
  contactPerson: string | null;
  kraPinMasked: string | null;
  wiba: { status: 'missing' | 'expired' | 'confirmed'; insurer: string | null; policyRef: string | null; expiresAt: string | null };
  canPostShifts: boolean;
}

interface Overview {
  shiftsThisWeek: number;
  openShifts: number;
  committedKes: number;
  committedShifts: number;
  spentThisWeekKes: number;
  awaitingApproval: number;
  showUpRate: number | null;
  paymentsLive: boolean;
}

interface FeedItem { id: string; type: string; at: string; shiftId: string; role: string; worker: string | null }

const FEED: Record<string, (w: string) => string> = {
  ARRIVED: w => `${w} arrived`,
  STARTED: w => `${w} started the shift`,
  OVERRIDE_START: w => `You started ${w}’s shift without a PIN`,
  PIN_LOCKED: w => `${w} got locked out of the PIN`,
  CLOCKED_OUT: w => `${w} finished · approve pay`,
  LATE_WARNING: w => `${w} is running late`,
  NO_SHOW: w => `${w} hasn’t shown up`,
  NO_SHOW_RESOLVED: () => 'No-show resolved',
};

export function DashboardScreen({ navigation }: Props) {
  const { businessName } = useAuth();
  const ov = useData<Overview>('/employer/overview', { pollMs: 60_000 });
  const profile = useData<EmployerProfile>('/identity/employers/profile');
  const feed = useData<FeedItem[]>('/attendance/feed', { pollMs: 20_000 });
  const inbox = useData<{ unread: number }>('/me/notifications', { pollMs: 30_000 });
  const [refreshing, setRefreshing] = useState(false);
  const o = ov.data;
  const p = profile.data;

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([ov.reload(), profile.reload(), feed.reload(), inbox.reload()]);
    setRefreshing(false);
  };

  return (
    <View style={styles.screen}>
      <AmbientOrbs intensity="subtle" />
      <SafeTop />
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.volt} />}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.date}>{day(new Date())}</Text>
            <Text style={styles.greeting} numberOfLines={1}>{greeting()}</Text>
            <Text style={styles.biz} numberOfLines={1}>{p?.businessName ?? businessName ?? ''}</Text>
          </View>
          <TouchableOpacity style={styles.bell} onPress={() => navigation.navigate('Notifications')} accessibilityLabel="Notifications">
            <Icons.bell color={colors.white} size={16} />
            {(inbox.data?.unread ?? 0) > 0 && <View style={styles.bellDot} />}
          </TouchableOpacity>
        </View>

        {p && !p.canPostShifts && (
          <View style={styles.banner}>
            <Text style={styles.bannerH}>Verify your business to post shifts</Text>
            <Text style={styles.bannerP}>
              {!p.kraPinMasked ? 'Add your KRA PIN' : 'KRA PIN on file'} · {p.wiba.status === 'confirmed' ? 'WIBA on file' : p.wiba.status === 'expired' ? 'renew your WIBA policy' : 'declare your WIBA policy'}
            </Text>
            <GradientBtn size="sm" onPress={() => navigation.navigate('Verify')}>Verify business</GradientBtn>
          </View>
        )}

        <FadeUp delay={40} style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <View style={styles.hero}>
            <Label color={colors.volt}>Pay committed</Label>
            <Text style={styles.big}>{o ? kes(o.committedKes) : '—'}</Text>
            <Text style={styles.heroSub}>{o ? `${o.committedShifts} upcoming or open shift${o.committedShifts === 1 ? '' : 's'}, incl. 4% Klokd fee` : ''}</Text>
            {o && o.awaitingApproval > 0 && (
              <TouchableOpacity onPress={() => navigation.navigate('Pay')}>
                <Text style={styles.approve}>{o.awaitingApproval} shift{o.awaitingApproval === 1 ? '' : 's'} to approve →</Text>
              </TouchableOpacity>
            )}
            {o && !o.paymentsLive && <Text style={styles.heroNote}>M-Pesa funding switches on when Klokd payments go live; until then pay is tracked and approved here.</Text>}
          </View>
        </FadeUp>

        <View style={styles.tiles}>
          <Tile k={o ? String(o.shiftsThisWeek) : '—'} l="shifts this week" />
          <Tile k={o ? kes(o.spentThisWeekKes) : '—'} l="spent this week" />
          <Tile k={o?.showUpRate != null ? `${o.showUpRate}%` : '—'} l="show-up rate" />
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
          <GradientBtn disabled={!p?.canPostShifts} onPress={() => navigation.navigate('PostShift')}>Post a shift</GradientBtn>
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <Label color={colors.white60}>Live activity</Label>
          <View style={{ marginTop: 10, gap: 8 }}>
            {(feed.data ?? []).length === 0 && <Text style={styles.empty}>Workers arriving, starting and finishing show up here as it happens.</Text>}
            {(feed.data ?? []).map(e => {
              const alert = ['NO_SHOW', 'PIN_LOCKED', 'LATE_WARNING'].includes(e.type);
              return (
                <TouchableOpacity key={e.id} style={styles.feedRow} onPress={() => navigation.navigate('ShiftDetail', { id: e.shiftId })}>
                  <View style={[styles.dot, { backgroundColor: alert ? colors.warning : colors.electric }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.feedText}>{(FEED[e.type] ?? (() => e.type))(e.worker ?? 'Your worker')}</Text>
                    <Text style={styles.feedMeta}>{e.role}</Text>
                  </View>
                  <Text style={styles.feedAt}>{time(e.at)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function Tile({ k, l }: { k: string; l: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileK} numberOfLines={1} adjustsFontSizeToFit>{k}</Text>
      <Text style={styles.tileL}>{l}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  headerRow: { paddingHorizontal: 20, paddingTop: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  date: { fontSize: 12.5, color: colors.white55, fontWeight: '600' },
  greeting: { fontSize: 26, fontWeight: '900', color: colors.white, letterSpacing: -0.9, marginTop: 2 },
  biz: { fontSize: 13, color: colors.volt, fontWeight: '800', marginTop: 2 },
  bell: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white05, alignItems: 'center', justifyContent: 'center' },
  bellDot: { position: 'absolute', top: 8, right: 9, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.volt, borderWidth: 1.5, borderColor: colors.ink },
  banner: { marginHorizontal: 20, marginTop: 14, padding: 14, borderRadius: 16, backgroundColor: 'rgba(255,179,71,0.10)', borderWidth: 1, borderColor: 'rgba(255,179,71,0.28)', gap: 8 },
  bannerH: { fontSize: 14, fontWeight: '900', color: colors.white },
  bannerP: { fontSize: 12, color: colors.white70 },
  hero: { padding: 18, borderRadius: 18, backgroundColor: colors.voltAlpha['07'], borderWidth: 1, borderColor: colors.voltAlpha['25'] },
  big: { fontSize: 32, fontWeight: '900', color: colors.white, letterSpacing: -1.1, marginTop: 6 },
  heroSub: { fontSize: 12, color: colors.white65, marginTop: 3 },
  heroNote: { fontSize: 11.5, color: colors.white55, marginTop: 10, lineHeight: 16 },
  approve: { color: colors.warning, fontSize: 13, fontWeight: '800', marginTop: 10 },
  tiles: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginTop: 12, marginBottom: 12 },
  tile: { flex: 1, padding: 12, borderRadius: 14, backgroundColor: colors.white03, borderWidth: 1, borderColor: colors.white08 },
  tileK: { fontSize: 16, fontWeight: '900', color: colors.white },
  tileL: { fontSize: 10, color: colors.white55, marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.4 },
  empty: { color: colors.white55, fontSize: 12.5, lineHeight: 18 },
  feedRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, backgroundColor: colors.white03 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  feedText: { color: colors.white, fontSize: 13.5, fontWeight: '700' },
  feedMeta: { color: colors.white55, fontSize: 11.5, marginTop: 2 },
  feedAt: { color: colors.white55, fontSize: 12, fontWeight: '700' },
});
