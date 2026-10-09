/**
 * Verification (admin) — GET /admin/verification.
 *   Workers whose ID check (IPRS via Identiti) hasn't passed, with a manual
 *   override for cases Identiti can't resolve (PATCH
 *   /identity/admin/workers/:id/verification, audited).
 *   Businesses missing a KRA PIN or a current WIBA policy (can't post).
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { GlassCard } from '../../components/KlokdLayout';
import { Eyebrow, StatusPill, GhostBtn } from '../../components/Primitives';
import { Notice } from '../../components/Form';
import { ErrorState, EmptyState } from '../../components/States';
import { useApiData, useApiAction } from '../../hooks/useApiData';
import { colors, spacing } from '../../theme';
import { day } from '../../lib/format';

interface Queue {
  workers: { workerId: string; userId: string; name: string; status: string; kycTier: number; hasIdentiti: boolean; joined: string; active: boolean }[];
  employers: { employerId: string; userId: string; businessName: string; hasKraPin: boolean; wiba: string; joined: string }[];
}

export function VerificationScreen() {
  const q = useApiData<Queue>('/admin/verification');
  const act = useApiAction();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  if (q.status === 'loading') return <View style={styles.loading}><ActivityIndicator color={colors.electric} /></View>;
  if (q.status === 'error') return <ErrorState title="Couldn’t load the verification queue." detail={q.error ?? undefined} onRetry={q.reload} />;
  const d = q.data!;

  const decide = async (workerId: string, status: 'APPROVED' | 'REJECTED') => {
    setBusy(workerId);
    setMsg(null);
    try {
      await act(`/identity/admin/workers/${workerId}/verification`, { status }, 'PATCH');
      setMsg({ tone: 'ok', text: status === 'APPROVED' ? 'Worker approved manually. Logged in the audit trail.' : 'Worker marked as rejected.' });
      q.reload();
    } catch (e: any) {
      setMsg({ tone: 'err', text: e.message });
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={{ gap: spacing.xxl }}>
      {msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
      <View>
        <Eyebrow>WORKERS NOT VERIFIED · {d.workers.length}</Eyebrow>
        <Text style={styles.p}>
          Workers verify themselves in the app by IPRS lookup. Override only after checking the person’s ID yourself — every override is audited.
        </Text>
        {d.workers.length === 0 ? (
          <EmptyState title="Every worker is verified." />
        ) : (
          <GlassCard padding={spacing.sm}>
            {d.workers.map(w => (
              <View key={w.workerId} style={styles.row}>
                <View style={{ flex: 1, minWidth: 200 }}>
                  <Text style={styles.name}>{w.name}</Text>
                  <Text style={styles.meta}>
                    Joined {day(w.joined)} · KYC tier {w.kycTier}
                    {w.hasIdentiti ? '' : ' · no Identiti account'}
                    {w.active ? '' : ' · deactivated'}
                  </Text>
                </View>
                <StatusPill tone={w.status === 'REJECTED' ? 'err' : 'warn'}>{w.status.toLowerCase()}</StatusPill>
                <View style={styles.actions}>
                  <GhostBtn size="sm" onPress={() => decide(w.workerId, 'APPROVED')}>{busy === w.workerId ? '…' : 'Approve'}</GhostBtn>
                  {w.status !== 'REJECTED' && <GhostBtn size="sm" tone="danger" onPress={() => decide(w.workerId, 'REJECTED')}>Reject</GhostBtn>}
                </View>
              </View>
            ))}
          </GlassCard>
        )}
      </View>

      <View>
        <Eyebrow>BUSINESSES THAT CAN’T POST YET · {d.employers.length}</Eyebrow>
        <Text style={styles.p}>They verify themselves on the website (KRA PIN + WIBA policy). Listed so you can follow up.</Text>
        {d.employers.length === 0 ? (
          <EmptyState title="Every business can post." />
        ) : (
          <GlassCard padding={spacing.sm}>
            {d.employers.map(e => (
              <View key={e.employerId} style={styles.row}>
                <View style={{ flex: 1, minWidth: 200 }}>
                  <Text style={styles.name}>{e.businessName}</Text>
                  <Text style={styles.meta}>Joined {day(e.joined)}</Text>
                </View>
                <StatusPill tone={e.hasKraPin ? 'mint' : 'warn'}>{e.hasKraPin ? 'KRA PIN ✓' : 'no KRA PIN'}</StatusPill>
                <StatusPill tone={e.wiba === 'confirmed' ? 'mint' : e.wiba === 'expired' ? 'err' : 'warn'}>WIBA {e.wiba}</StatusPill>
              </View>
            ))}
          </GlassCard>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { paddingVertical: 80, alignItems: 'center' },
  p: { color: colors.white60, fontSize: 12.5, lineHeight: 18, marginTop: 4, marginBottom: spacing.md, maxWidth: 640 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.white06, flexWrap: 'wrap' },
  name: { color: colors.white, fontSize: 14, fontWeight: '800' },
  meta: { color: colors.white55, fontSize: 12, marginTop: 2 },
  actions: { flexDirection: 'row', gap: spacing.sm },
});
