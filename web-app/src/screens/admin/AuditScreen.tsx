/**
 * Audit — Hakken-signed append-only audit log search.
 *
 * Hakken §A.11 invariant: every audit entry carries a signed JWT envelope.
 * The verification chip in the right pane proves the signature still
 * matches Hakken's public key — drift here means tampering.
 */
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { GlassCard, FadeUp } from '../../components/KlokdLayout';
import { Eyebrow, StatusPill, Avatar, GhostBtn, Tone } from '../../components/Primitives';
import { colors, spacing, radius, typography } from '../../theme';

type Action = 'create' | 'update' | 'release' | 'reject' | 'login' | 'reverse';

interface AuditRow {
  ts: string;
  actor: { type: 'operator' | 'worker' | 'employer' | 'system'; name: string; initials: string };
  action: Action;
  entity: string;
  ref: string;
  ip: string;
  sig: 'ok' | 'pending' | 'fail';
  payload: Record<string, unknown>;
}

const ACTIONS: Record<Action, Tone> = {
  create: 'mint', update: 'volt', release: 'mint', reject: 'err', login: 'neutral', reverse: 'warn',
};

const ROWS: AuditRow[] = [
  { ts: '12:34:18', actor: { type: 'operator', name: 'Silvia A.', initials: 'SA' }, action: 'release', entity: 'escrow_release', ref: 'sft-9921', ip: '102.220.18.4', sig: 'ok', payload: { shift_id: 'sft-9921', amount_kes_minor: 80000, recipient_account: 'idn-7102', method: 'mpesa_b2c', justification: 'worker confirmed clock-out matches GPS' } },
  { ts: '12:34:02', actor: { type: 'system', name: 'helpan-match', initials: 'H' }, action: 'create', entity: 'shift_assignment', ref: 'sft-9922', ip: 'internal', sig: 'ok', payload: { shift_id: 'sft-9922', worker_account: 'idn-7411', score: 0.94, model_version: 'helpan-3.1.2' } },
  { ts: '12:33:51', actor: { type: 'worker', name: 'Brian O.', initials: 'BO' }, action: 'update', entity: 'profile', ref: 'idn-7102', ip: '105.160.31.222', sig: 'ok', payload: { fields_changed: ['mpesa_number'], previous_hash: 'sha256:9a2f…b81', new_hash: 'sha256:c104…43e' } },
  { ts: '12:33:14', actor: { type: 'operator', name: 'Silvia A.', initials: 'SA' }, action: 'reject', entity: 'kyc_submission', ref: 'idn-9918', ip: '102.220.18.4', sig: 'ok', payload: { submission_id: 'idn-9918', reason: 'liveness_mismatch', resubmit_allowed: true } },
  { ts: '12:32:48', actor: { type: 'system', name: 'kp-payout', initials: 'K' }, action: 'release', entity: 'b2c_payout', ref: 'pay-9840', ip: 'internal', sig: 'ok', payload: { mpesa_receipt: 'QAB7X2K1P9', amount_kes_minor: 164000, callback_status: '0' } },
  { ts: '12:31:02', actor: { type: 'employer', name: 'Brew Bistro', initials: 'BB' }, action: 'create', entity: 'shift_post', ref: 'sft-9924', ip: '41.90.4.18', sig: 'ok', payload: { role: 'Waiter', pay_kes_minor: 200000, slots: 3, when: '2026-06-24T17:00:00+03:00' } },
  { ts: '12:30:11', actor: { type: 'operator', name: 'Maina K.', initials: 'MK' }, action: 'reverse', entity: 'escrow_release', ref: 'pay-9821', ip: '102.220.18.6', sig: 'pending', payload: { original_payout: 'pay-9821', reason: 'duplicate_release', approval_required: true } },
  { ts: '12:29:44', actor: { type: 'system', name: 'identiti-kyc', initials: 'I' }, action: 'create', entity: 'verification_pass', ref: 'idn-7411', ip: 'internal', sig: 'ok', payload: { tier: 'tier1', match_score: 0.991, biometric_match: true } },
  { ts: '12:28:30', actor: { type: 'operator', name: 'Silvia A.', initials: 'SA' }, action: 'login', entity: 'session', ref: 'sess-2914', ip: '102.220.18.4', sig: 'ok', payload: { mfa: 'totp', device: 'macOS Safari 18', geo: 'Nairobi' } },
];

function ActionPill({ a }: { a: Action }) {
  return <StatusPill tone={ACTIONS[a]}>{a}</StatusPill>;
}

function SigChip({ s }: { s: AuditRow['sig'] }) {
  if (s === 'ok') return (
    <View style={[styles.sig, styles.sigOk]}>
      <Text style={styles.sigText}>✓ Hakken-signed</Text>
    </View>
  );
  if (s === 'pending') return (
    <View style={[styles.sig, styles.sigPending]}>
      <Text style={[styles.sigText, { color: colors.warning }]}>… pending second sig</Text>
    </View>
  );
  return (
    <View style={[styles.sig, styles.sigFail]}>
      <Text style={[styles.sigText, { color: colors.error }]}>✕ signature drift</Text>
    </View>
  );
}

export function AuditScreen() {
  const [selected, setSelected] = useState<string>(ROWS[0].ref);
  const detail = ROWS.find(r => r.ref === selected) ?? ROWS[0];

  return (
    <View>
      {/* Filter / search bar */}
      <FadeUp delay={0} style={styles.filterBar}>
        {['Actor: any', 'Action: any', 'Entity: any', 'Range: last 1h', 'Sig: ok'].map((f, i) => (
          <View key={i} style={styles.filter}>
            <Text style={styles.filterText}>{f}</Text>
            <Text style={styles.filterCaret}>▾</Text>
          </View>
        ))}
        <View style={{ flex: 1 }} />
        <View style={styles.streamPill}>
          <View style={styles.streamDot} />
          <Text style={styles.streamText}>STREAMING · 1,402 events / min</Text>
        </View>
      </FadeUp>

      <View style={styles.splitRow}>
        {/* Audit table */}
        <FadeUp delay={120} style={{ flex: 2, minWidth: 520 }}>
          <GlassCard padding={0}>
            <View style={styles.thead}>
              <Text style={[styles.thText, { width: 78 }]}>TIME</Text>
              <Text style={[styles.thText, { flex: 1.4 }]}>ACTOR</Text>
              <Text style={[styles.thText, { width: 100 }]}>ACTION</Text>
              <Text style={[styles.thText, { flex: 1.2 }]}>ENTITY · REF</Text>
              <Text style={[styles.thText, { width: 120 }]}>SIG</Text>
            </View>
            {ROWS.map((r, i) => {
              const active = r.ref === selected;
              return (
                <Pressable
                  key={i}
                  onPress={() => setSelected(r.ref)}
                  style={({ hovered }: any) => [
                    styles.tr,
                    i < ROWS.length - 1 && styles.trBorder,
                    hovered && !active && { backgroundColor: colors.white03 },
                    active && styles.trActive,
                  ]}
                >
                  <Text style={[styles.trTime, { width: 78 }]}>{r.ts}</Text>
                  <View style={{ flex: 1.4, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <Avatar
                      initials={r.actor.initials}
                      size={26}
                      tone={r.actor.type === 'operator' ? 'electric' : r.actor.type === 'employer' ? 'volt' : 'mid'}
                    />
                    <View>
                      <Text style={styles.actorName}>{r.actor.name}</Text>
                      <Text style={styles.actorType}>{r.actor.type}</Text>
                    </View>
                  </View>
                  <View style={{ width: 100 }}><ActionPill a={r.action} /></View>
                  <View style={{ flex: 1.2 }}>
                    <Text style={styles.entity}>{r.entity}</Text>
                    <Text style={styles.ref}>{r.ref}</Text>
                  </View>
                  <View style={{ width: 120 }}><SigChip s={r.sig} /></View>
                </Pressable>
              );
            })}
          </GlassCard>
        </FadeUp>

        {/* Detail */}
        <FadeUp delay={200} style={{ flex: 1, minWidth: 320 }}>
          <GlassCard variant="raised">
            <Text style={styles.detailH}>Audit entry</Text>
            <Text style={styles.detailRef}>{detail.ref}</Text>

            <View style={styles.metaGrid}>
              <View style={styles.metaCell}>
                <Text style={styles.metaLabel}>TIME</Text>
                <Text style={styles.metaValue}>2026-06-24 {detail.ts} EAT</Text>
              </View>
              <View style={styles.metaCell}>
                <Text style={styles.metaLabel}>ACTOR</Text>
                <Text style={styles.metaValue}>{detail.actor.name} · {detail.actor.type}</Text>
              </View>
              <View style={styles.metaCell}>
                <Text style={styles.metaLabel}>SOURCE IP</Text>
                <Text style={[styles.metaValue, { fontFamily: typography.mono }]}>{detail.ip}</Text>
              </View>
              <View style={styles.metaCell}>
                <Text style={styles.metaLabel}>ACTION</Text>
                <ActionPill a={detail.action} />
              </View>
            </View>

            <View style={{ marginTop: spacing.md }}>
              <Eyebrow color={colors.white45}>SIGNATURE</Eyebrow>
              <View style={{ height: 6 }} />
              <SigChip s={detail.sig} />
              <Text style={styles.sigNote}>
                Verified against Hakken public key · k1y/v2 · last rotated 2026-06-12
              </Text>
            </View>

            <View style={{ marginTop: spacing.md }}>
              <Eyebrow color={colors.white45}>PAYLOAD</Eyebrow>
              <ScrollView style={styles.payloadBox} horizontal>
                <Text style={styles.payloadText}>{JSON.stringify(detail.payload, null, 2)}</Text>
              </ScrollView>
            </View>

            <View style={styles.actions}>
              <GhostBtn size="sm">Copy ID</GhostBtn>
              <GhostBtn size="sm">Open related</GhostBtn>
              <GhostBtn size="sm">Export JSONL</GhostBtn>
            </View>
          </GlassCard>
        </FadeUp>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  filterBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg, flexWrap: 'wrap' },
  filter: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.white03, borderWidth: 1, borderColor: colors.white08 },
  filterText: { color: colors.white75, fontSize: 12, fontWeight: '700', letterSpacing: -0.1 },
  filterCaret: { color: colors.white45, fontSize: 9 },

  streamPill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: 'rgba(0,229,160,0.06)', borderWidth: 1, borderColor: 'rgba(0,229,160,0.25)' },
  streamDot: { width: 6, height: 6, borderRadius: 4, backgroundColor: colors.electric },
  streamText: { color: colors.electric, fontSize: 10.5, fontWeight: '900', letterSpacing: 0.8 },

  splitRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, alignItems: 'flex-start' },

  thead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.white06 },
  thText: { color: colors.white35, fontSize: 10, fontWeight: '900', letterSpacing: 0.9 },
  tr: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: 11 },
  trBorder: { borderBottomWidth: 1, borderBottomColor: colors.white04 },
  trActive: { backgroundColor: 'rgba(0,229,160,0.05)', borderLeftWidth: 2, borderLeftColor: colors.electric },
  trTime: { color: colors.white55, fontSize: 11.5, fontFamily: typography.mono, fontWeight: '700' },
  actorName: { color: colors.white, fontSize: 12.5, fontWeight: '800' },
  actorType: { color: colors.white40, fontSize: 10, fontWeight: '700', marginTop: 1, textTransform: 'uppercase', letterSpacing: 0.4 },
  entity: { color: colors.white85, fontSize: 12, fontWeight: '700' },
  ref: { color: colors.white45, fontSize: 10.5, fontFamily: typography.mono, marginTop: 2 },

  sig: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  sigOk: { backgroundColor: 'rgba(0,229,160,0.08)', borderWidth: 1, borderColor: 'rgba(0,229,160,0.28)' },
  sigPending: { backgroundColor: 'rgba(255,179,71,0.08)', borderWidth: 1, borderColor: 'rgba(255,179,71,0.28)' },
  sigFail: { backgroundColor: 'rgba(255,107,107,0.08)', borderWidth: 1, borderColor: 'rgba(255,107,107,0.28)' },
  sigText: { color: colors.electric, fontSize: 10.5, fontWeight: '800' },

  detailH: { color: colors.white55, fontSize: 11, fontWeight: '800', letterSpacing: 0.9, textTransform: 'uppercase' },
  detailRef: { color: colors.white, fontSize: 20, fontWeight: '900', letterSpacing: -0.7, fontFamily: typography.mono, marginTop: 4, marginBottom: spacing.md },

  metaGrid: { gap: spacing.sm, paddingVertical: spacing.md, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.white06 },
  metaCell: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metaLabel: { color: colors.white45, fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  metaValue: { color: colors.white, fontSize: 12, fontWeight: '700' },

  sigNote: { color: colors.white45, fontSize: 10.5, marginTop: 6 },

  payloadBox: { marginTop: 8, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.ink, borderWidth: 1, borderColor: colors.white08, maxHeight: 220 },
  payloadText: { color: colors.white75, fontSize: 11, fontFamily: typography.mono, lineHeight: 16 },

  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, flexWrap: 'wrap' },
});
