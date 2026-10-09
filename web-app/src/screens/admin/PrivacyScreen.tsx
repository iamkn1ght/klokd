/**
 * Data requests (admin) — GET /admin/data-requests. Correction and deletion
 * requests under the Data Protection Act, each with its 30-day deadline.
 * Resolve with PATCH /admin/data-requests/:id (the person is notified);
 * pull a full copy of someone's data with GET /admin/dpa/access/:userId.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { GlassCard } from '../../components/KlokdLayout';
import { Eyebrow, StatusPill, GradientBtn, GhostBtn } from '../../components/Primitives';
import { Field, Notice } from '../../components/Form';
import { ErrorState, EmptyState } from '../../components/States';
import { useApiData, useApiAction } from '../../hooks/useApiData';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { colors, spacing } from '../../theme';
import { day, downloadText } from '../../lib/format';

interface Req {
  id: string;
  userId: string;
  who: string;
  type: 'RECTIFICATION' | 'DELETION' | 'ACCESS';
  details: string | null;
  status: 'OPEN' | 'DONE' | 'REJECTED';
  resolution: string | null;
  createdAt: string;
  dueBy: string;
}

export function PrivacyScreen() {
  const q = useApiData<Req[]>('/admin/data-requests', { pollMs: 120_000 });
  if (q.status === 'loading') return <View style={styles.loading}><ActivityIndicator color={colors.electric} /></View>;
  if (q.status === 'error') return <ErrorState title="Couldn’t load data requests." detail={q.error ?? undefined} onRetry={q.reload} />;
  const rows = q.data!;
  if (rows.length === 0) return <EmptyState title="No data requests." detail="Workers and businesses ask for corrections or deletion from their Me page." />;
  return (
    <View style={{ gap: spacing.md, maxWidth: 860 }}>
      {rows.map(r => (
        <RequestCard key={r.id} r={r} onDone={q.reload} />
      ))}
    </View>
  );
}

function RequestCard({ r, onDone }: { r: Req; onDone: () => void }) {
  const act = useApiAction();
  const { accessToken } = useAuth();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const overdue = r.status === 'OPEN' && new Date(r.dueBy).getTime() < Date.now();
  const daysLeft = Math.ceil((new Date(r.dueBy).getTime() - Date.now()) / 86_400_000);

  const resolve = async (status: 'DONE' | 'REJECTED') => {
    setBusy(true);
    setErr(null);
    try {
      await act(`/admin/data-requests/${r.id}`, { status, resolution: note.trim() }, 'PATCH');
      onDone();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const exportUser = async () => {
    try {
      const data = await api(`/admin/dpa/access/${r.userId}`, { token: accessToken! });
      downloadText(`klokd-dsr-${r.userId.slice(0, 8)}.json`, JSON.stringify(data, null, 2), 'application/json');
    } catch (e: any) {
      setErr(e.message);
    }
  };

  return (
    <GlassCard padding={spacing.lg}>
      <View style={styles.top}>
        <View style={{ flex: 1, minWidth: 200 }}>
          <Eyebrow color={r.type === 'DELETION' ? colors.error : colors.electric}>{r.type === 'DELETION' ? 'DELETION' : 'CORRECTION'}</Eyebrow>
          <Text style={styles.who}>{r.who}</Text>
          <Text style={styles.meta}>Asked {day(r.createdAt)}</Text>
        </View>
        {r.status === 'OPEN' ? (
          <StatusPill tone={overdue ? 'err' : daysLeft <= 7 ? 'warn' : 'neutral'}>{overdue ? 'overdue' : `${daysLeft} days left`}</StatusPill>
        ) : (
          <StatusPill tone={r.status === 'DONE' ? 'mint' : 'neutral'}>{r.status.toLowerCase()}</StatusPill>
        )}
      </View>
      {r.details ? <Text style={styles.details}>{r.details}</Text> : null}
      {r.status !== 'OPEN' ? (
        <Text style={styles.meta}>Answer sent: {r.resolution}</Text>
      ) : (
        <>
          <Field label="Answer to send" value={note} onChangeText={setNote} multiline placeholder={r.type === 'DELETION' ? 'e.g. Your account is deleted. Pay records are kept 7 years as the law requires.' : 'e.g. We corrected your surname.'} />
          {err ? <Notice tone="err">{err}</Notice> : null}
          <View style={styles.actions}>
            <GradientBtn size="sm" disabled={busy || note.trim().length < 5} onPress={() => resolve('DONE')}>Mark done</GradientBtn>
            <GhostBtn size="sm" tone="danger" onPress={() => note.trim().length >= 5 && resolve('REJECTED')}>Decline</GhostBtn>
            <GhostBtn size="sm" onPress={exportUser}>Download their data</GhostBtn>
          </View>
        </>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  loading: { paddingVertical: 80, alignItems: 'center' },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, flexWrap: 'wrap' },
  who: { color: colors.white, fontSize: 16, fontWeight: '900', marginTop: 6 },
  meta: { color: colors.white55, fontSize: 12, marginTop: 4 },
  details: { color: colors.white75, fontSize: 13, lineHeight: 19, marginVertical: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
});
