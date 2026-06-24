/**
 * Disputes — worker / employer claims awaiting admin call.
 *
 * Disputes don't auto-resolve. An admin reads the evidence, hears both
 * sides, and either releases or holds the escrowed amount.
 */
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { GlassCard, FadeUp } from '../../components/KlokdLayout';
import { Eyebrow, StatusPill, Avatar, GradientBtn, GhostBtn, Tone } from '../../components/Primitives';
import { colors, spacing, radius } from '../../theme';

type State = 'new' | 'review' | 'awaiting' | 'resolved';

interface Dispute {
  id: string;
  shift: string;
  venue: string;
  claimant: 'worker' | 'employer';
  worker: { name: string; initials: string };
  employer: { name: string; initials: string };
  claim: string;
  amount: number;
  state: State;
  opened: string;
  ageH: number;
  evidence: number;
}

const DISPUTES: Dispute[] = [
  { id: 'dsp-2841', shift: 'sft-9921', venue: 'Java · Sarit', claimant: 'employer', worker: { name: 'Brian Otieno', initials: 'BO' }, employer: { name: 'Java Sarit', initials: 'JS' }, claim: 'Worker left 2.5h before clock-out time. Employer wants partial release only.', amount: 950, state: 'new', opened: '6 min ago', ageH: 0.1, evidence: 4 },
  { id: 'dsp-2840', shift: 'sft-9918', venue: 'Brew Bistro · Westlands', claimant: 'worker', worker: { name: 'Akinyi Mwende', initials: 'AM' }, employer: { name: 'Brew Bistro', initials: 'BB' }, claim: 'Hours logged correctly, employer refusing to release escrow citing “late arrival”.', amount: 1800, state: 'review', opened: '2 h ago', ageH: 2, evidence: 6 },
  { id: 'dsp-2838', shift: 'sft-9904', venue: 'Sarova Stanley · CBD', claimant: 'worker', worker: { name: 'Faith Wambui', initials: 'FW' }, employer: { name: 'Sarova Stanley', initials: 'SS' }, claim: 'No M-Pesa received despite confirmation screen.', amount: 1450, state: 'awaiting', opened: '8 h ago', ageH: 8, evidence: 3 },
];

const STATE_TONE: Record<State, Tone> = { new: 'err', review: 'warn', awaiting: 'volt', resolved: 'mint' };
const STATE_LABEL: Record<State, string> = { new: 'NEW', review: 'IN REVIEW', awaiting: 'AWAITING WORKER', resolved: 'RESOLVED' };

export function DisputesScreen() {
  const [selected, setSelected] = useState<string>(DISPUTES[0].id);
  const detail = DISPUTES.find(d => d.id === selected) ?? DISPUTES[0];

  return (
    <View>
      {/* Top KPIs */}
      <View style={styles.kpiRow}>
        {[
          { k: '3', l: 'Open disputes', t: 'err' as Tone },
          { k: 'KES 4,200', l: 'In dispute escrow', t: 'warn' as Tone },
          { k: '1h 42m', l: 'Median resolution', t: 'mint' as Tone },
          { k: '94.8%', l: 'In favour of worker', t: 'mint' as Tone },
        ].map((s, i) => (
          <FadeUp key={i} delay={i * 60} style={styles.kpiWrap}>
            <GlassCard style={styles.kpi}>
              <Text style={styles.kpiK}>{s.k}</Text>
              <Text style={styles.kpiL}>{s.l}</Text>
            </GlassCard>
          </FadeUp>
        ))}
      </View>

      <View style={styles.splitRow}>
        {/* List */}
        <FadeUp delay={240} style={styles.listCol}>
          <View style={styles.sectionHead}>
            <Eyebrow>OPEN QUEUE</Eyebrow>
            <Text style={styles.sectionTitle}>Sorted by age</Text>
          </View>
          {DISPUTES.map((d, i) => {
            const active = d.id === selected;
            return (
              <Pressable key={d.id} onPress={() => setSelected(d.id)}>
                <GlassCard
                  interactive
                  style={[styles.disputeCard, active && styles.disputeCardActive] as any}
                >
                  <View style={styles.disputeTop}>
                    <View style={styles.disputeId}>
                      <Text style={styles.disputeIdText}>{d.id}</Text>
                    </View>
                    <StatusPill tone={STATE_TONE[d.state]}>{STATE_LABEL[d.state]}</StatusPill>
                    <View style={{ flex: 1 }} />
                    <Text style={styles.disputeAmount}>KES {d.amount.toLocaleString()}</Text>
                  </View>
                  <Text style={styles.disputeClaim}>{d.claim}</Text>
                  <View style={styles.disputeFooter}>
                    <View style={styles.disputeParties}>
                      <View style={styles.party}>
                        <Avatar initials={d.worker.initials} size={22} tone="electric" />
                        <Text style={styles.partyName}>{d.worker.name}</Text>
                      </View>
                      <Text style={styles.vs}>vs</Text>
                      <View style={styles.party}>
                        <Avatar initials={d.employer.initials} size={22} tone="volt" />
                        <Text style={styles.partyName}>{d.employer.name}</Text>
                      </View>
                    </View>
                    <Text style={styles.disputeMeta}>{d.shift} · {d.venue} · {d.opened}</Text>
                  </View>
                </GlassCard>
              </Pressable>
            );
          })}
        </FadeUp>

        {/* Detail */}
        <FadeUp delay={320} style={styles.detailCol}>
          <GlassCard variant="raised">
            <View style={styles.detailHead}>
              <View>
                <Text style={styles.detailId}>{detail.id}</Text>
                <Text style={styles.detailVenue}>{detail.venue}</Text>
              </View>
              <StatusPill tone={STATE_TONE[detail.state]}>{STATE_LABEL[detail.state]}</StatusPill>
            </View>

            <View style={styles.detailBlock}>
              <Eyebrow color={colors.white45}>CLAIM ({detail.claimant})</Eyebrow>
              <Text style={styles.detailClaim}>{detail.claim}</Text>
            </View>

            <View style={styles.detailBlock}>
              <Eyebrow color={colors.white45}>PARTIES</Eyebrow>
              <View style={styles.partiesGrid}>
                <View style={styles.partyCard}>
                  <Avatar initials={detail.worker.initials} size={34} tone="electric" />
                  <View>
                    <Text style={styles.partyCardName}>{detail.worker.name}</Text>
                    <Text style={styles.partyCardRole}>Worker</Text>
                  </View>
                </View>
                <View style={styles.partyCard}>
                  <Avatar initials={detail.employer.initials} size={34} tone="volt" />
                  <View>
                    <Text style={styles.partyCardName}>{detail.employer.name}</Text>
                    <Text style={styles.partyCardRole}>Employer</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.escrowBox}>
              <View style={{ flex: 1 }}>
                <Text style={styles.escrowLabel}>HELD IN ESCROW</Text>
                <Text style={styles.escrowAmount}>KES {detail.amount.toLocaleString()}</Text>
              </View>
              <View style={styles.escrowMeta}>
                <Text style={styles.escrowMetaLabel}>Shift</Text>
                <Text style={styles.escrowMetaValue}>{detail.shift}</Text>
              </View>
              <View style={styles.escrowMeta}>
                <Text style={styles.escrowMetaLabel}>Evidence</Text>
                <Text style={styles.escrowMetaValue}>{detail.evidence} items</Text>
              </View>
            </View>

            <View style={styles.actionsRow}>
              <View style={{ flex: 1 }}>
                <GradientBtn>Release to worker</GradientBtn>
              </View>
              <GhostBtn>Split 50 / 50</GhostBtn>
              <GhostBtn tone="danger">Refund employer</GhostBtn>
            </View>
          </GlassCard>
        </FadeUp>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.xl },
  kpiWrap: { flex: 1, minWidth: 200 },
  kpi: { padding: spacing.lg },
  kpiK: { color: colors.white, fontSize: 26, fontWeight: '900', letterSpacing: -1 },
  kpiL: { color: colors.white55, fontSize: 11.5, fontWeight: '700', letterSpacing: 0.3, textTransform: 'uppercase', marginTop: 4 },

  splitRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, alignItems: 'flex-start' },
  listCol: { flex: 1.4, minWidth: 420, gap: spacing.md },
  detailCol: { flex: 1, minWidth: 320 },

  sectionHead: { marginBottom: spacing.sm },
  sectionTitle: { color: colors.white, fontSize: 18, fontWeight: '800', letterSpacing: -0.5, marginTop: 4 },

  disputeCard: { padding: spacing.lg },
  disputeCardActive: { borderColor: 'rgba(0,229,160,0.4)', backgroundColor: 'rgba(0,229,160,0.05)' },
  disputeTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  disputeId: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5, backgroundColor: colors.white06 },
  disputeIdText: { color: colors.white75, fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  disputeAmount: { color: colors.white, fontSize: 14, fontWeight: '900', letterSpacing: -0.3 },
  disputeClaim: { color: colors.white75, fontSize: 13, lineHeight: 18.5, marginBottom: spacing.md },
  disputeFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.white06 },
  disputeParties: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  party: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  partyName: { color: colors.white75, fontSize: 12, fontWeight: '700' },
  vs: { color: colors.white35, fontSize: 11, fontWeight: '800' },
  disputeMeta: { color: colors.white45, fontSize: 11, fontWeight: '500' },

  detailHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.white06 },
  detailId: { color: colors.white, fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  detailVenue: { color: colors.white55, fontSize: 12, fontWeight: '600', marginTop: 2 },
  detailBlock: { marginBottom: spacing.lg },
  detailClaim: { color: colors.white85, fontSize: 13.5, lineHeight: 19.5, marginTop: 8 },

  partiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: 8 },
  partyCard: { flex: 1, minWidth: 140, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.white03, borderWidth: 1, borderColor: colors.white06 },
  partyCardName: { color: colors.white, fontSize: 12.5, fontWeight: '800' },
  partyCardRole: { color: colors.white50, fontSize: 10.5, marginTop: 1, fontWeight: '600' },

  escrowBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, padding: spacing.md, borderRadius: radius.lg, backgroundColor: 'rgba(0,229,160,0.05)', borderWidth: 1, borderColor: 'rgba(0,229,160,0.25)', marginBottom: spacing.lg, flexWrap: 'wrap' },
  escrowLabel: { color: colors.electric, fontSize: 10, fontWeight: '900', letterSpacing: 0.9 },
  escrowAmount: { color: colors.white, fontSize: 22, fontWeight: '900', letterSpacing: -0.8, marginTop: 4 },
  escrowMeta: {},
  escrowMetaLabel: { color: colors.white45, fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  escrowMetaValue: { color: colors.white, fontSize: 12.5, fontWeight: '700', marginTop: 3 },

  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
