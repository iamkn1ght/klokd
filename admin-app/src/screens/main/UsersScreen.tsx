/**
 * Users — directory across all three personas (workers, employers, operators).
 *
 * Click into any row to see the full account_uuid record. The record never
 * shows raw PII — only derived attributes Identiti exposes to consumers.
 */
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { GlassCard, FadeUp } from '../../components/KlokdLayout';
import { Eyebrow, StatusPill, Avatar, GhostBtn, Sparkline, Tone } from '../../components/Primitives';
import { colors, spacing, radius } from '../../theme';

type Tab = 'workers' | 'employers' | 'operators';

interface UserRow {
  id: string;
  name: string;
  initials: string;
  meta: string;
  joined: string;
  rating?: number;
  shifts?: number;
  earned?: number;
  state: 'active' | 'paused' | 'suspended' | 'pending';
  spark?: number[];
}

const WORKERS: UserRow[] = [
  { id: 'idn-7102', name: 'Akinyi Mwende', initials: 'AM', meta: 'Waiter · Westlands', joined: 'Mar 2026', rating: 4.92, shifts: 23, earned: 41_840, state: 'active', spark: [1, 2, 3, 5, 4, 6, 8, 10, 12, 14, 16, 18] },
  { id: 'idn-7411', name: 'Brian Otieno', initials: 'BO', meta: 'Steward · CBD', joined: 'Feb 2026', rating: 4.78, shifts: 42, earned: 73_400, state: 'active', spark: [2, 3, 5, 8, 10, 13, 16, 18, 22, 26, 30, 34] },
  { id: 'idn-7388', name: 'Faith Wambui', initials: 'FW', meta: 'Cleaner · Kilimani', joined: 'Apr 2026', rating: 4.55, shifts: 11, earned: 18_600, state: 'paused', spark: [1, 2, 3, 4, 4, 4, 5, 5, 5, 4, 3, 2] },
  { id: 'idn-7290', name: 'Joseph Kamau', initials: 'JK', meta: 'Bartender · Westlands', joined: 'Jan 2026', rating: 4.86, shifts: 67, earned: 124_300, state: 'active', spark: [4, 6, 9, 12, 16, 19, 24, 28, 32, 38, 44, 51] },
  { id: 'idn-7102', name: 'Peter Maina', initials: 'PM', meta: 'Kitchen prep · Karen', joined: 'Apr 2026', rating: 4.20, shifts: 8, earned: 11_200, state: 'suspended', spark: [1, 2, 3, 3, 4, 3, 2, 2, 1, 1, 1, 1] },
];

const EMPLOYERS: UserRow[] = [
  { id: 'emp-0021', name: 'Brew Bistro Limited', initials: 'BB', meta: 'Hospitality · 4 venues', joined: 'Dec 2025', shifts: 312, state: 'active', spark: [10, 14, 18, 22, 28, 34, 41, 48, 55, 62, 68, 72] },
  { id: 'emp-0014', name: 'Sarova Stanley', initials: 'SS', meta: 'Hotel · CBD', joined: 'Nov 2025', shifts: 198, state: 'active', spark: [8, 10, 14, 18, 24, 29, 33, 37, 40, 44, 47, 50] },
  { id: 'emp-0008', name: 'Java House (group)', initials: 'JH', meta: 'F&B · 19 venues', joined: 'Oct 2025', shifts: 412, state: 'active', spark: [12, 18, 26, 33, 42, 50, 58, 64, 70, 76, 82, 88] },
  { id: 'emp-0044', name: 'Mama Wanjiku Hospitality', initials: 'MW', meta: 'Catering · Westlands', joined: 'Today', shifts: 0, state: 'pending', spark: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
];

const OPERATORS: UserRow[] = [
  { id: 'op-001', name: 'Silvia Achieng', initials: 'SA', meta: 'Compliance · Lead', joined: 'Sep 2025', state: 'active' },
  { id: 'op-002', name: 'Maina Kariuki', initials: 'MK', meta: 'Engineering · On-call', joined: 'Sep 2025', state: 'active' },
  { id: 'op-003', name: 'Wanjiku Njoroge', initials: 'WN', meta: 'Support · Tier 1', joined: 'Feb 2026', state: 'active' },
];

const STATE_TONE: Record<UserRow['state'], Tone> = { active: 'mint', paused: 'warn', suspended: 'err', pending: 'volt' };

function TabBtn({ label, active, count, onPress }: { label: string; active: boolean; count: number; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ hovered }: any) => [
        styles.tab,
        active && styles.tabActive,
        hovered && !active && { backgroundColor: colors.white06 },
      ]}
    >
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
      <Text style={[styles.tabCount, active && styles.tabCountActive]}>{count}</Text>
    </Pressable>
  );
}

export function UsersScreen() {
  const [tab, setTab] = useState<Tab>('workers');
  const rows = tab === 'workers' ? WORKERS : tab === 'employers' ? EMPLOYERS : OPERATORS;

  return (
    <View>
      <FadeUp delay={0} style={styles.tabsRow}>
        <TabBtn label="Workers" count={WORKERS.length} active={tab === 'workers'} onPress={() => setTab('workers')} />
        <TabBtn label="Employers" count={EMPLOYERS.length} active={tab === 'employers'} onPress={() => setTab('employers')} />
        <TabBtn label="Operators" count={OPERATORS.length} active={tab === 'operators'} onPress={() => setTab('operators')} />
        <View style={{ flex: 1 }} />
        <View style={styles.searchBox}>
          <Text style={styles.searchText}>Type a name, phone, KRA, account_uuid…</Text>
        </View>
        <GhostBtn size="sm">Export CSV</GhostBtn>
      </FadeUp>

      <View style={styles.grid}>
        {rows.map((r, i) => (
          <FadeUp key={r.id + i} delay={80 + i * 50} style={styles.cardWrap}>
            <GlassCard interactive style={styles.card}>
              <View style={styles.cardHead}>
                <Avatar
                  initials={r.initials}
                  size={42}
                  tone={tab === 'workers' ? 'electric' : tab === 'employers' ? 'volt' : 'mid'}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName}>{r.name}</Text>
                  <Text style={styles.cardMeta}>{r.meta}</Text>
                </View>
                <StatusPill tone={STATE_TONE[r.state]}>{r.state}</StatusPill>
              </View>

              <View style={styles.cardBody}>
                <View style={styles.cardId}>
                  <Text style={styles.cardIdLabel}>ACCOUNT</Text>
                  <Text style={styles.cardIdValue}>{r.id}</Text>
                </View>
                <Text style={styles.cardJoined}>Joined {r.joined}</Text>
              </View>

              <View style={styles.cardStats}>
                {r.rating != null && (
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>{r.rating.toFixed(2)}</Text>
                    <Text style={styles.statLabel}>RATING</Text>
                  </View>
                )}
                {r.shifts != null && (
                  <View style={styles.stat}>
                    <Text style={styles.statValue}>{r.shifts}</Text>
                    <Text style={styles.statLabel}>SHIFTS</Text>
                  </View>
                )}
                {r.earned != null && (
                  <View style={[styles.stat, { flex: 1.4 }]}>
                    <Text style={styles.statValue}>KES {r.earned.toLocaleString()}</Text>
                    <Text style={styles.statLabel}>LIFETIME</Text>
                  </View>
                )}
                {r.spark && (
                  <View style={[styles.stat, { alignItems: 'flex-end' }]}>
                    <Sparkline values={r.spark} color={colors.electric} width={72} />
                    <Text style={[styles.statLabel, { marginTop: 4 }]}>30d</Text>
                  </View>
                )}
              </View>
            </GlassCard>
          </FadeUp>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg, flexWrap: 'wrap' },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: colors.white08, backgroundColor: colors.white03 },
  tabActive: { borderColor: 'rgba(0,229,160,0.35)', backgroundColor: 'rgba(0,229,160,0.08)' },
  tabText: { color: colors.white75, fontSize: 13, fontWeight: '800', letterSpacing: -0.15 },
  tabTextActive: { color: colors.electric },
  tabCount: { color: colors.white45, fontSize: 11, fontWeight: '800', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, backgroundColor: colors.white06 },
  tabCountActive: { color: colors.ink, backgroundColor: colors.electric },

  searchBox: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, backgroundColor: colors.white03, borderWidth: 1, borderColor: colors.white08, minWidth: 280 },
  searchText: { color: colors.white45, fontSize: 12, fontWeight: '500' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  cardWrap: { flex: 1, minWidth: 320 },
  card: { padding: spacing.lg },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  cardName: { color: colors.white, fontSize: 14, fontWeight: '900', letterSpacing: -0.3 },
  cardMeta: { color: colors.white55, fontSize: 11.5, marginTop: 2, fontWeight: '600' },

  cardBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.white06 },
  cardId: {},
  cardIdLabel: { color: colors.white35, fontSize: 9.5, fontWeight: '900', letterSpacing: 0.8 },
  cardIdValue: { color: colors.white, fontSize: 12, fontWeight: '800', marginTop: 3 },
  cardJoined: { color: colors.white45, fontSize: 11, fontWeight: '600' },

  cardStats: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  stat: { flex: 1 },
  statValue: { color: colors.white, fontSize: 14, fontWeight: '900', letterSpacing: -0.3 },
  statLabel: { color: colors.white40, fontSize: 9.5, fontWeight: '800', letterSpacing: 0.7, marginTop: 3 },
});
