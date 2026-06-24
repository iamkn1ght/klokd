/**
 * Verification — KYC escalation queue (Silvia's desk).
 *
 * Identiti auto-passes the clean ones; anything that fails liveness, BRS
 * mismatch, or repeat-submission heuristics lands here for manual review.
 */
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { GlassCard, FadeUp } from '../../components/KlokdLayout';
import { Eyebrow, StatusPill, Avatar, GradientBtn, GhostBtn, Tone } from '../../components/Primitives';
import { colors, spacing, radius } from '../../theme';

type Filter = 'all' | 'worker' | 'employer' | 'stale';

interface Entry {
  id: string;
  type: 'worker' | 'employer';
  name: string;
  initials: string;
  submitted: string;
  reason: string;
  kycTier: 'tier1' | 'tier2' | 'pending';
  severity: 'low' | 'med' | 'high';
  ageMin: number;
  evidence: string[];
}

const QUEUE: Entry[] = [
  { id: 'idn-9921', type: 'worker', name: 'Akinyi Mwende', initials: 'AM', submitted: '2 min ago', reason: 'Liveness check failed twice', kycTier: 'pending', severity: 'high', ageMin: 2, evidence: ['ID front', 'ID back', 'Selfie ×3'] },
  { id: 'idn-9920', type: 'employer', name: 'Mama Wanjiku Hospitality', initials: 'MW', submitted: '14 min ago', reason: 'KRA PIN format invalid · A00 prefix', kycTier: 'pending', severity: 'med', ageMin: 14, evidence: ['BRS cert', 'KRA letter'] },
  { id: 'idn-9919', type: 'worker', name: 'Brian Otieno', initials: 'BO', submitted: '38 min ago', reason: 'ID number mismatch on resubmission', kycTier: 'tier1', severity: 'med', ageMin: 38, evidence: ['ID front (v1)', 'ID front (v2)', 'Selfie'] },
  { id: 'idn-9917', type: 'worker', name: 'Joseph Kamau', initials: 'JK', submitted: '1 h ago', reason: 'Document quality below threshold', kycTier: 'pending', severity: 'low', ageMin: 62, evidence: ['ID front', 'ID back', 'Selfie'] },
  { id: 'idn-9914', type: 'employer', name: 'Brew Bistro Limited', initials: 'BB', submitted: '3 h ago', reason: 'Director mismatch with BRS', kycTier: 'tier1', severity: 'med', ageMin: 184, evidence: ['BRS cert', 'CR12'] },
  { id: 'idn-9908', type: 'worker', name: 'Faith Wambui', initials: 'FW', submitted: '8 h ago', reason: 'Same selfie as account idn-7102', kycTier: 'pending', severity: 'high', ageMin: 491, evidence: ['Selfie', 'Selfie match'] },
  { id: 'idn-9905', type: 'worker', name: 'Peter Maina', initials: 'PM', submitted: '14 h ago', reason: 'Selfie shows another person’s ID', kycTier: 'pending', severity: 'high', ageMin: 842, evidence: ['ID front', 'Selfie'] },
  { id: 'idn-9899', type: 'employer', name: 'Java Sarit', initials: 'JS', submitted: '26 h ago', reason: 'BRS cert older than 90 days', kycTier: 'tier1', severity: 'low', ageMin: 1567, evidence: ['BRS cert'] },
];

const SLA_MIN = 240;

function FilterChip({ label, count, active, onPress }: { label: string; count?: number; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ hovered }: any) => [
        styles.chip,
        active && styles.chipActive,
        hovered && !active && { backgroundColor: colors.white06 },
      ]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
      {count != null && <Text style={[styles.chipCount, active && styles.chipCountActive]}>{count}</Text>}
    </Pressable>
  );
}

function SevPill({ s }: { s: Entry['severity'] }) {
  const tone: Tone = s === 'high' ? 'err' : s === 'med' ? 'warn' : 'neutral';
  return <StatusPill tone={tone}>{s}</StatusPill>;
}

export function VerificationScreen() {
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<string>(QUEUE[0].id);

  const filtered = QUEUE.filter(e => {
    if (filter === 'all') return true;
    if (filter === 'stale') return e.ageMin > SLA_MIN;
    return e.type === filter;
  });

  const detail = QUEUE.find(e => e.id === selected) ?? QUEUE[0];

  const counts = {
    all: QUEUE.length,
    worker: QUEUE.filter(e => e.type === 'worker').length,
    employer: QUEUE.filter(e => e.type === 'employer').length,
    stale: QUEUE.filter(e => e.ageMin > SLA_MIN).length,
  };

  return (
    <View>
      {/* Filter bar */}
      <FadeUp delay={0} style={styles.filterRow}>
        <FilterChip label="All" count={counts.all} active={filter === 'all'} onPress={() => setFilter('all')} />
        <FilterChip label="Workers" count={counts.worker} active={filter === 'worker'} onPress={() => setFilter('worker')} />
        <FilterChip label="Employers" count={counts.employer} active={filter === 'employer'} onPress={() => setFilter('employer')} />
        <FilterChip label="Stale > 4h" count={counts.stale} active={filter === 'stale'} onPress={() => setFilter('stale')} />
        <View style={{ flex: 1 }} />
        <View style={styles.slaPill}>
          <View style={[styles.slaDot, counts.stale > 0 && { backgroundColor: colors.warning }]} />
          <Text style={styles.slaText}>SLA · 4 h · {counts.stale} over</Text>
        </View>
      </FadeUp>

      <View style={styles.splitRow}>
        {/* List */}
        <FadeUp delay={120} style={styles.listCol}>
          <GlassCard padding={0}>
            <View style={styles.tableHead}>
              <Text style={[styles.thText, { flex: 2 }]}>APPLICANT</Text>
              <Text style={[styles.thText, { width: 90 }]}>TYPE</Text>
              <Text style={[styles.thText, { flex: 1.6 }]}>REASON</Text>
              <Text style={[styles.thText, { width: 70 }]}>SEV</Text>
              <Text style={[styles.thText, { width: 80, textAlign: 'right' }]}>AGE</Text>
            </View>
            {filtered.map((e, i) => {
              const active = e.id === selected;
              const stale = e.ageMin > SLA_MIN;
              return (
                <Pressable
                  key={e.id}
                  onPress={() => setSelected(e.id)}
                  style={({ hovered }: any) => [
                    styles.tr,
                    i < filtered.length - 1 && styles.trBorder,
                    hovered && !active && { backgroundColor: colors.white03 },
                    active && styles.trActive,
                  ]}
                >
                  <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <Avatar initials={e.initials} size={30} tone={e.type === 'worker' ? 'electric' : 'volt'} />
                    <View>
                      <Text style={styles.applicantName}>{e.name}</Text>
                      <Text style={styles.applicantId}>{e.id}</Text>
                    </View>
                  </View>
                  <View style={{ width: 90 }}>
                    <StatusPill tone={e.type === 'worker' ? 'mint' : 'volt'}>{e.type}</StatusPill>
                  </View>
                  <Text style={[styles.reason, { flex: 1.6 }]} numberOfLines={2}>{e.reason}</Text>
                  <View style={{ width: 70 }}>
                    <SevPill s={e.severity} />
                  </View>
                  <Text style={[styles.age, { width: 80, textAlign: 'right' }, stale && { color: colors.warning, fontWeight: '800' }]}>
                    {e.submitted}
                  </Text>
                </Pressable>
              );
            })}
          </GlassCard>
        </FadeUp>

        {/* Detail */}
        <FadeUp delay={200} style={styles.detailCol}>
          <GlassCard variant="raised" style={{ position: 'sticky' as any, top: spacing.xl }}>
            <View style={styles.detailHead}>
              <Avatar initials={detail.initials} size={42} tone={detail.type === 'worker' ? 'electric' : 'volt'} />
              <View style={{ flex: 1 }}>
                <Text style={styles.detailName}>{detail.name}</Text>
                <Text style={styles.detailId}>{detail.id} · {detail.type}</Text>
              </View>
              <SevPill s={detail.severity} />
            </View>

            <View style={styles.detailBlock}>
              <Eyebrow color={colors.white45}>REASON FLAGGED</Eyebrow>
              <Text style={styles.detailReason}>{detail.reason}</Text>
            </View>

            <View style={styles.detailGrid}>
              <View style={styles.detailCell}>
                <Text style={styles.detailCellLabel}>SUBMITTED</Text>
                <Text style={styles.detailCellValue}>{detail.submitted}</Text>
              </View>
              <View style={styles.detailCell}>
                <Text style={styles.detailCellLabel}>KYC TIER</Text>
                <Text style={styles.detailCellValue}>{detail.kycTier}</Text>
              </View>
              <View style={styles.detailCell}>
                <Text style={styles.detailCellLabel}>EVIDENCE</Text>
                <Text style={styles.detailCellValue}>{detail.evidence.length} files</Text>
              </View>
            </View>

            <View style={styles.detailBlock}>
              <Eyebrow color={colors.white45}>EVIDENCE</Eyebrow>
              <View style={styles.evidenceList}>
                {detail.evidence.map((f, i) => (
                  <View key={i} style={styles.evidenceChip}>
                    <View style={styles.evidenceIcon} />
                    <Text style={styles.evidenceName}>{f}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.detailActions}>
              <View style={{ flex: 1 }}>
                <GradientBtn onPress={() => { /* approve */ }}>Approve verification</GradientBtn>
              </View>
              <GhostBtn onPress={() => { /* request more */ }}>Request more</GhostBtn>
              <GhostBtn onPress={() => { /* reject */ }} tone="danger">Reject</GhostBtn>
            </View>
          </GlassCard>
        </FadeUp>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.white08, backgroundColor: colors.white03 },
  chipActive: { borderColor: 'rgba(0,229,160,0.35)', backgroundColor: 'rgba(0,229,160,0.08)' },
  chipText: { color: colors.white75, fontSize: 12.5, fontWeight: '700' },
  chipTextActive: { color: colors.electric },
  chipCount: { color: colors.white45, fontSize: 11, fontWeight: '800', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, backgroundColor: colors.white06 },
  chipCountActive: { color: colors.ink, backgroundColor: colors.electric },

  slaPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.white03, borderWidth: 1, borderColor: colors.white08 },
  slaDot: { width: 6, height: 6, borderRadius: 4, backgroundColor: colors.electric },
  slaText: { color: colors.white60, fontSize: 11.5, fontWeight: '700' },

  splitRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, alignItems: 'flex-start' },
  listCol: { flex: 2, minWidth: 460 },
  detailCol: { flex: 1, minWidth: 320 },

  tableHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.white06 },
  thText: { color: colors.white35, fontSize: 10, fontWeight: '900', letterSpacing: 0.9 },
  tr: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: 12 },
  trBorder: { borderBottomWidth: 1, borderBottomColor: colors.white04 },
  trActive: { backgroundColor: 'rgba(0,229,160,0.05)', borderLeftWidth: 2, borderLeftColor: colors.electric },

  applicantName: { color: colors.white, fontSize: 13, fontWeight: '800', letterSpacing: -0.2 },
  applicantId: { color: colors.white40, fontSize: 10.5, fontWeight: '600', marginTop: 1 },
  reason: { color: colors.white70, fontSize: 12, lineHeight: 16 },
  age: { color: colors.white55, fontSize: 11.5, fontWeight: '600' },

  detailHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  detailName: { color: colors.white, fontSize: 16, fontWeight: '900', letterSpacing: -0.4 },
  detailId: { color: colors.white45, fontSize: 11, fontWeight: '600', marginTop: 2 },

  detailBlock: { marginBottom: spacing.lg },
  detailReason: { color: colors.white85, fontSize: 13.5, lineHeight: 19, marginTop: 8 },

  detailGrid: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg, paddingVertical: spacing.md, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.white06 },
  detailCell: { flex: 1 },
  detailCellLabel: { color: colors.white35, fontSize: 9.5, fontWeight: '900', letterSpacing: 0.8 },
  detailCellValue: { color: colors.white, fontSize: 13, fontWeight: '800', marginTop: 4 },

  evidenceList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  evidenceChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, backgroundColor: colors.white03, borderWidth: 1, borderColor: colors.white06 },
  evidenceIcon: { width: 14, height: 14, borderRadius: 3, backgroundColor: colors.white15 },
  evidenceName: { color: colors.white75, fontSize: 11.5, fontWeight: '700' },

  detailActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
});
