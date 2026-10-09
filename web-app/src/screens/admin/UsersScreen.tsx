/**
 * Users (admin) — GET /admin/workers and /admin/employers, paged. Deactivate
 * or reactivate an account (PATCH /admin/users/:userId/status, audited).
 * Phone numbers are shown masked; full records come from a data request.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { GlassCard } from '../../components/KlokdLayout';
import { StatusPill, GhostBtn } from '../../components/Primitives';
import { Chip, Notice } from '../../components/Form';
import { ErrorState, EmptyState } from '../../components/States';
import { useApiData, useApiAction } from '../../hooks/useApiData';
import { colors, spacing } from '../../theme';
import { day } from '../../lib/format';

interface Paged<T> { total: number; page: number; totalPages: number; workers?: T[]; employers?: T[] }
interface W { id: string; userId: string; firstName: string; lastName: string; verificationStatus: string; totalShifts: number; showUpRate: number | null; ratingAggregate: number | null; createdAt: string; user: { phone: string; isActive: boolean } }
interface E { id: string; userId: string; businessName: string; kraPin: string | null; wibaPolicyRef: string | null; totalShifts: number; createdAt: string; user: { phone: string; isActive: boolean } }

const mask = (p: string) => (p.length > 6 ? `${p.slice(0, 6)}•••${p.slice(-3)}` : p);

export function UsersScreen() {
  const [kind, setKind] = useState<'workers' | 'employers'>('workers');
  const [page, setPage] = useState(1);
  const q = useApiData<Paged<W | E>>(`/admin/${kind}?page=${page}&limit=25`);
  const act = useApiAction();
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  const setActive = async (userId: string, isActive: boolean) => {
    setMsg(null);
    try {
      await act(`/admin/users/${userId}/status`, { isActive }, 'PATCH');
      setMsg({ tone: 'ok', text: isActive ? 'Account reactivated.' : 'Account deactivated. They can’t sign in until reactivated.' });
      q.reload();
    } catch (e: any) {
      setMsg({ tone: 'err', text: e.message });
    }
  };

  const rows = (q.data?.[kind] ?? []) as (W | E)[];
  return (
    <View style={{ gap: spacing.md }}>
      <View style={styles.chips}>
        <Chip active={kind === 'workers'} onPress={() => { setKind('workers'); setPage(1); }}>Workers</Chip>
        <Chip active={kind === 'employers'} onPress={() => { setKind('employers'); setPage(1); }}>Businesses</Chip>
        {q.data && <Text style={styles.count}>{q.data.total} total</Text>}
      </View>
      {msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
      {q.status === 'loading' && <View style={{ paddingVertical: 60, alignItems: 'center' }}><ActivityIndicator color={colors.electric} /></View>}
      {q.status === 'error' && <ErrorState title="Couldn’t load users." detail={q.error ?? undefined} onRetry={q.reload} />}
      {q.status === 'ready' && rows.length === 0 && <EmptyState title="No one here yet." />}
      {rows.length > 0 && (
        <GlassCard padding={spacing.sm}>
          {rows.map(r => {
            const isW = kind === 'workers';
            const w = r as W;
            const e = r as E;
            return (
              <View key={r.id} style={styles.row}>
                <View style={{ flex: 1, minWidth: 220 }}>
                  <Text style={styles.name}>{isW ? `${w.firstName} ${w.lastName}` : e.businessName}</Text>
                  <Text style={styles.meta}>
                    {mask(r.user.phone)} · joined {day(r.createdAt)} · {r.totalShifts} shifts
                    {isW && w.showUpRate != null ? ` · ${Math.round(w.showUpRate)}% show-up` : ''}
                    {isW && w.ratingAggregate != null ? ` · ★ ${w.ratingAggregate.toFixed(1)}` : ''}
                  </Text>
                </View>
                {isW ? (
                  <StatusPill tone={w.verificationStatus === 'APPROVED' ? 'mint' : 'warn'}>{w.verificationStatus === 'APPROVED' ? 'ID verified' : 'not verified'}</StatusPill>
                ) : (
                  <StatusPill tone={e.kraPin && e.wibaPolicyRef ? 'mint' : 'warn'}>{e.kraPin && e.wibaPolicyRef ? 'can post' : 'not verified'}</StatusPill>
                )}
                {!r.user.isActive && <StatusPill tone="err">deactivated</StatusPill>}
                <GhostBtn size="sm" tone={r.user.isActive ? 'danger' : 'default'} onPress={() => setActive(r.userId, !r.user.isActive)}>
                  {r.user.isActive ? 'Deactivate' : 'Reactivate'}
                </GhostBtn>
              </View>
            );
          })}
        </GlassCard>
      )}
      {q.data && q.data.totalPages > 1 && (
        <View style={styles.pager}>
          <GhostBtn size="sm" onPress={() => setPage(p => Math.max(1, p - 1))}>← Newer</GhostBtn>
          <Text style={styles.meta}>Page {q.data.page} of {q.data.totalPages}</Text>
          <GhostBtn size="sm" onPress={() => setPage(p => Math.min(q.data!.totalPages, p + 1))}>Older →</GhostBtn>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' },
  count: { color: colors.white55, fontSize: 12.5, marginLeft: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.white06, flexWrap: 'wrap' },
  name: { color: colors.white, fontSize: 14, fontWeight: '800' },
  meta: { color: colors.white55, fontSize: 12, marginTop: 2 },
  pager: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});
