/**
 * Home — your ledger + shifts near you. All real:
 *   GET /me/worker            ledger (shifts, show-up, rating, this month)
 *   GET /shifts/available     open shifts near your phone's location
 *   GET /me/shifts            offers waiting for your answer
 *   GET /me/notifications     unread count on the bell
 */
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { StatusPill, Label, VLine, GradientBtn } from '../../components/Primitives';
import { AmbientOrbs, SafeTop, FadeUp } from '../../components/KlokdLayout';
import { Icons } from '../../components/Icons';
import { useData } from '../../hooks/useData';
import { colors } from '../../theme';
import { kes, when, greeting, day } from '../../lib/format';

type Props = { navigation: NativeStackNavigationProp<any> };

export interface WorkerMe {
  firstName: string;
  lastName: string;
  verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  skills: string[];
  consent: { identity: boolean; location: boolean; at: string | null };
  showUpRate: number | null;
  rating: number | null;
  ratingCount: number;
  completedShifts: number;
  upcomingShifts: number;
  monthEarningsKes: number;
  monthShifts: number;
  paymentsLive: boolean;
  phone: string | null;
  memberSince: string;
}

interface FeedShift {
  id: string;
  role: string;
  startTime: string;
  endTime: string;
  rateKes: number;
  locationName: string | null;
  distanceMeters?: number;
  employer: { businessName: string; ratingAggregate: number | null; totalShifts: number } | null;
}

const CBD = { lat: -1.2864, lng: 36.8172 };

function Stat({ n, l, color, star }: { n: string; l: string; color: string; star?: boolean }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
        <Text style={{ fontSize: 18, fontWeight: '900', color, letterSpacing: -0.36 }}>{n}</Text>
        {star && <Icons.star color={color} size={11} />}
      </View>
      <Text style={{ fontSize: 9.5, color: colors.white55, letterSpacing: 0.76, textTransform: 'uppercase', marginTop: 3 }}>{l}</Text>
    </View>
  );
}

export function HomeScreen({ navigation }: Props) {
  const [where, setWhere] = useState<{ lat: number; lng: number; mine: boolean }>({ ...CBD, mine: false });
  const me = useData<WorkerMe>('/me/worker');
  const feed = useData<FeedShift[]>(`/shifts/available?lat=${where.lat}&lng=${where.lng}&radiusKm=25`, { pollMs: 60_000 });
  const mine = useData<{ offers: { id: string }[]; applied: { shift: { id: string } }[] }>('/me/shifts');
  const inbox = useData<{ unread: number }>('/me/notifications', { pollMs: 30_000 });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setWhere({ lat: loc.coords.latitude, lng: loc.coords.longitude, mine: true });
      } catch {
        /* stay on the city-wide feed */
      }
    })();
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([me.reload(), feed.reload(), mine.reload(), inbox.reload()]);
    setRefreshing(false);
  };

  const m = me.data;
  const applied = new Set((mine.data?.applied ?? []).map(a => a.shift.id));
  const offers = mine.data?.offers.length ?? 0;

  return (
    <View style={styles.screen}>
      <AmbientOrbs intensity="subtle" />
      <SafeTop />
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.electric} />}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.date}>{day(new Date())}</Text>
            <Text style={styles.greeting} numberOfLines={1}>{greeting()}{m ? `, ${m.firstName}` : ''}</Text>
          </View>
          <TouchableOpacity style={styles.bellBtn} onPress={() => navigation.navigate('Notifications')} accessibilityLabel="Notifications">
            <Icons.bell color={colors.white} size={16} />
            {(inbox.data?.unread ?? 0) > 0 && <View style={styles.bellDot} />}
          </TouchableOpacity>
        </View>

        <FadeUp delay={60} style={{ paddingHorizontal: 20, paddingTop: 14 }}>
          <View style={styles.ledger}>
            <View style={styles.ledgerHead}>
              <Label color={colors.white55}>This month · {m ? kes(m.monthEarningsKes) : '—'}</Label>
              {m?.verificationStatus === 'APPROVED' ? <Text style={styles.verified}>ID VERIFIED</Text> : null}
            </View>
            <View style={{ flexDirection: 'row' }}>
              <Stat n={m ? String(m.completedShifts) : '—'} l="shifts done" color={colors.white} />
              <VLine />
              <Stat n={m?.showUpRate != null ? `${Math.round(m.showUpRate)}%` : '—'} l="show-up" color={colors.electric} />
              <VLine />
              <Stat n={m?.rating != null ? m.rating.toFixed(1) : '—'} l={m && m.ratingCount < 3 ? `rating ${m.ratingCount}/3` : 'rating'} color={colors.volt} star={m?.rating != null} />
            </View>
            {m && !m.paymentsLive && (
              <Text style={styles.ledgerNote}>M-Pesa payouts start when Klokd payments go live. Your pay is tracked in the Pay tab.</Text>
            )}
          </View>
        </FadeUp>

        {m && m.verificationStatus !== 'APPROVED' && (
          <View style={styles.banner}>
            <Text style={styles.bannerH}>Verify your ID to apply for shifts</Text>
            <Text style={styles.bannerP}>Your ID number is checked with the government register through Identiti. It takes a minute.</Text>
            <GradientBtn size="sm" onPress={() => navigation.navigate('VerifyIDMain', { fromMain: true })}>Verify my ID</GradientBtn>
          </View>
        )}
        {offers > 0 && (
          <TouchableOpacity style={[styles.banner, styles.offerBanner]} onPress={() => navigation.navigate('Shifts')}>
            <Text style={styles.offerText}>{offers} shift{offers === 1 ? '' : 's'} waiting for your answer →</Text>
          </TouchableOpacity>
        )}

        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Label color={colors.white60}>Shifts near you · {feed.data?.length ?? 0}</Label>
            <Text style={{ fontSize: 10.5, color: colors.white55 }}>{where.mine ? 'Within 25 km of you' : 'Within 25 km of the CBD'}</Text>
          </View>

          {feed.status === 'loading' && <ActivityIndicator color={colors.electric} style={{ marginTop: 24 }} />}
          {feed.status === 'error' && (
            <View style={styles.empty}>
              <Text style={styles.emptyH}>Couldn’t load shifts</Text>
              <Text style={styles.emptyP}>{feed.error}</Text>
              <TouchableOpacity onPress={feed.reload}><Text style={styles.retry}>Try again</Text></TouchableOpacity>
            </View>
          )}
          {feed.status === 'ready' && feed.data!.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyH}>No open shifts nearby right now</Text>
              <Text style={styles.emptyP}>New shifts appear the moment a business posts them. Pull down to refresh.</Text>
            </View>
          )}
          <View style={{ gap: 10 }}>
            {(feed.data ?? []).map((s, i) => (
              <FadeUp key={s.id} delay={100 + Math.min(i, 5) * 60}>
                <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('ShiftDetail', { id: s.id })} style={styles.card}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <Text style={styles.role}>{s.role}</Text>
                        {applied.has(s.id) && <StatusPill tone="mint">Applied</StatusPill>}
                      </View>
                      <Text style={styles.venue}>{s.employer?.businessName ?? 'Venue'} · {s.locationName ?? 'Nairobi'}</Text>
                      <Text style={styles.meta}>
                        {when(s.startTime, s.endTime)}
                        {s.distanceMeters != null ? ` · ${(s.distanceMeters / 1000).toFixed(1)} km` : ''}
                      </Text>
                    </View>
                    <Text style={styles.pay}>{kes(s.rateKes)}</Text>
                  </View>
                </TouchableOpacity>
              </FadeUp>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  headerRow: { paddingHorizontal: 20, paddingTop: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  date: { fontSize: 12.5, color: colors.white55, marginBottom: 3, fontWeight: '600' },
  greeting: { fontSize: 26, fontWeight: '900', letterSpacing: -0.9, color: colors.white },
  bellBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white05, borderWidth: 0.5, borderColor: colors.white08, alignItems: 'center', justifyContent: 'center' },
  bellDot: { position: 'absolute', top: 8, right: 9, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.electric, borderWidth: 1.5, borderColor: colors.ink },
  ledger: { borderRadius: 18, padding: 16, backgroundColor: colors.white03, borderWidth: 1, borderColor: colors.white06 },
  ledgerHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  verified: { fontSize: 10, color: colors.electric, fontWeight: '800', letterSpacing: 0.6 },
  ledgerNote: { fontSize: 11, color: colors.white55, marginTop: 12, lineHeight: 16 },
  banner: { marginHorizontal: 20, marginTop: 14, padding: 14, borderRadius: 16, backgroundColor: 'rgba(255,179,71,0.10)', borderWidth: 1, borderColor: 'rgba(255,179,71,0.28)', gap: 8 },
  bannerH: { fontSize: 14, fontWeight: '900', color: colors.white },
  bannerP: { fontSize: 12, color: colors.white70, lineHeight: 17 },
  offerBanner: { backgroundColor: colors.electricAlpha['08'], borderColor: colors.electricAlpha['35'] },
  offerText: { color: colors.electric, fontSize: 13.5, fontWeight: '900' },
  card: { borderRadius: 16, padding: 14, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: colors.white08 },
  role: { fontSize: 15, fontWeight: '800', color: colors.white, letterSpacing: -0.28 },
  venue: { fontSize: 12, color: colors.white70, marginBottom: 3 },
  meta: { fontSize: 11, color: colors.white55 },
  pay: { fontSize: 17, fontWeight: '900', color: colors.electric, letterSpacing: -0.34 },
  empty: { padding: 18, borderRadius: 16, borderWidth: 1, borderColor: colors.white08, backgroundColor: colors.white03, alignItems: 'center' },
  emptyH: { color: colors.white, fontSize: 14, fontWeight: '800' },
  emptyP: { color: colors.white60, fontSize: 12, textAlign: 'center', marginTop: 4, lineHeight: 17 },
  retry: { color: colors.electric, fontSize: 13, fontWeight: '800', marginTop: 10 },
});
