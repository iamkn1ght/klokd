/**
 * Employer Team tab — Trusted pool + Recent + Invited segments.
 * Ported 1:1 from claude-design/screens/employer-tabs.jsx (EmpTeamTab)
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Chip } from '../../components/Primitives';
import { AmbientOrbs, SafeTop } from '../../components/KlokdLayout';
import { StatTile, Worker } from '../../components/EmployerPrimitives';
import { Icons } from '../../components/Icons';
import { IE } from '../../components/IconsEmployer';
import { colors, gradients } from '../../theme';

type Tab = 'trusted' | 'recent' | 'invited';

const EMP_WORKERS: Worker[] = [
  { id: 'w1', name: 'Akinyi O.', initials: 'AO', rating: 4.8, shifts: 47, showUp: 94, verified: true, badge: 'Regular · 12 shifts', avatarBg: ['#5B4A8A', '#2B1F52'] },
  { id: 'w2', name: 'Kevin M.', initials: 'KM', rating: 4.7, shifts: 62, showUp: 96, verified: true, badge: 'Top performer', avatarBg: ['#3B6E5E', '#1B3E34'] },
  { id: 'w3', name: 'Njeri W.', initials: 'NW', rating: 4.9, shifts: 31, showUp: 97, verified: true, badge: 'Lead · 8 shifts', avatarBg: ['#8A5B3B', '#4E2E1B'] },
  { id: 'w4', name: 'Brian K.', initials: 'BK', rating: 4.6, shifts: 88, showUp: 93, verified: true, avatarBg: ['#4B4B68', '#24243A'] },
  { id: 'w5', name: 'Faith C.', initials: 'FC', rating: 4.8, shifts: 24, showUp: 100, verified: true, avatarBg: ['#6B3B5E', '#3B1E36'] },
];

export function TeamScreen() {
  const [tab, setTab] = useState<Tab>('trusted');
  const trusted = EMP_WORKERS.slice(0, 3);
  const recent = EMP_WORKERS.slice(3);

  return (
    <View style={styles.screen}>
      <AmbientOrbs intensity="subtle" />
      <SafeTop />
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <Text style={styles.title}>Team</Text>
          <Text style={styles.sub}>Your trusted pool & history</Text>
        </View>

        {/* Quick stats */}
        <View style={{ paddingHorizontal: 20, paddingTop: 14, flexDirection: 'row', gap: 6 }}>
          <StatTile label="Trusted" value="12" tone="mint" compact />
          <StatTile label="Worked · 30d" value="34" tone="neutral" compact />
          <StatTile label="Avg rating" value="4.7" tone="volt" compact icon={<Icons.star color={colors.volt} size={10} />} />
        </View>

        {/* Segments */}
        <View style={{ paddingHorizontal: 20, paddingTop: 14, flexDirection: 'row', gap: 6 }}>
          {([['trusted', 'Trusted · 12'], ['recent', 'Recent · 34'], ['invited', 'Invited · 3']] as const).map(([k, l]) => (
            <Chip key={k} active={tab === k} onPress={() => setTab(k)}>{l}</Chip>
          ))}
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          {tab === 'trusted' && (
            <>
              <View style={{ gap: 10 }}>
                {trusted.map(w => (
                  <View key={w.id} style={styles.row}>
                    <View style={{ position: 'relative' }}>
                      <LinearGradient
                        colors={(w.avatarBg || ['#3b3b48', '#24242e']) as [string, string]}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        style={styles.avatar}
                      >
                        <Text style={styles.initials}>{w.initials}</Text>
                      </LinearGradient>
                      <View style={styles.starBadge}>
                        <Icons.star color={colors.ink} size={8} />
                      </View>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{w.name}</Text>
                      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={styles.starMeta}>★ {w.rating}</Text>
                        <Text style={styles.metaSep}>·</Text>
                        <Text style={styles.metaText}>{w.badge}</Text>
                      </View>
                    </View>
                    <TouchableOpacity style={styles.inviteBtn} activeOpacity={0.7}>
                      <Text style={styles.inviteText}>Invite</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              <LinearGradient
                colors={[colors.voltAlpha['10'], 'rgba(188,255,78,0)']}
                start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                style={styles.ctaCard}
              >
                <View style={styles.ctaIcon}>
                  <IE.flash color={colors.volt} size={16} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ctaTitle}>Invite your trusted team first</Text>
                  <Text style={styles.ctaSub}>They see your shift before the open pool</Text>
                </View>
                <TouchableOpacity activeOpacity={0.85}>
                  <LinearGradient colors={[gradients.cta[0], gradients.cta[1]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tryBtn}>
                    <Text style={styles.tryText}>Try it</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </LinearGradient>
            </>
          )}

          {tab === 'recent' && (
            <View style={{ gap: 10 }}>
              {recent.map(w => (
                <View key={w.id} style={styles.row}>
                  <LinearGradient
                    colors={(w.avatarBg || ['#3b3b48', '#24242e']) as [string, string]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={styles.avatar}
                  >
                    <Text style={styles.initials}>{w.initials}</Text>
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{w.name}</Text>
                    <Text style={styles.metaText}>Last worked · 28 Mar · {w.showUp}% show-up</Text>
                  </View>
                  <TouchableOpacity style={styles.trustBtn} activeOpacity={0.7}>
                    <Icons.star color={colors.volt} size={10} />
                    <Text style={styles.trustText}>Trust</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {tab === 'invited' && (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <IE.users color={colors.white50} size={20} />
              </View>
              <Text style={styles.emptyTitle}>3 invites pending</Text>
              <Text style={styles.emptyText}>Workers you invited to your trusted pool. They'll appear here until they accept.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  title: { fontSize: 20, fontWeight: '900', letterSpacing: -0.6, color: colors.white },
  sub: { fontSize: 11, color: colors.white50, marginTop: 2 },

  row: {
    paddingHorizontal: 13, paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderWidth: 1, borderColor: colors.white06,
    flexDirection: 'row', alignItems: 'center', gap: 11,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  initials: { color: colors.white, fontWeight: '800', fontSize: 13 },
  starBadge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: colors.volt,
    borderWidth: 1.5, borderColor: colors.ink,
    alignItems: 'center', justifyContent: 'center',
  },
  name: { fontSize: 13, fontWeight: '800', color: colors.white },
  starMeta: { fontSize: 10.5, color: colors.volt, fontWeight: '700' },
  metaSep: { fontSize: 10.5, color: colors.white30 },
  metaText: { fontSize: 10.5, color: colors.white50 },

  inviteBtn: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: colors.white10, backgroundColor: colors.white04 },
  inviteText: { fontSize: 10.5, fontWeight: '700', color: colors.white },
  trustBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(188,255,78,0.33)', backgroundColor: colors.voltAlpha['12'] },
  trustText: { fontSize: 10.5, fontWeight: '700', color: colors.volt },

  ctaCard: {
    marginTop: 16,
    paddingHorizontal: 14, paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(188,255,78,0.2)',
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  ctaIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(188,255,78,0.13)', alignItems: 'center', justifyContent: 'center' },
  ctaTitle: { fontSize: 12.5, fontWeight: '800', color: colors.white },
  ctaSub: { fontSize: 10.5, color: colors.white55 },
  tryBtn: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 10 },
  tryText: { fontSize: 11, fontWeight: '800', color: colors.ink },

  emptyState: { paddingVertical: 32, paddingHorizontal: 20, alignItems: 'center' },
  emptyIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.white04, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 13, color: colors.white, fontWeight: '700', marginBottom: 4 },
  emptyText: { fontSize: 11, color: colors.white50, lineHeight: 16.5, textAlign: 'center' },
});
