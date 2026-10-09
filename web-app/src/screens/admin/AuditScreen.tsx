/**
 * Audit log (admin) — GET /admin/audit. Newest first, searchable by action,
 * resource or id, with "load older" paging.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TextInput } from 'react-native';
import { GlassCard } from '../../components/KlokdLayout';
import { GhostBtn } from '../../components/Primitives';
import { Notice } from '../../components/Form';
import { EmptyState } from '../../components/States';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { colors, spacing, radius, typography } from '../../theme';

interface Entry {
  id: string;
  at: string;
  actor: string;
  action: string;
  resource: string;
  resourceId: string | null;
  metadata: unknown;
}

export function AuditScreen() {
  const { accessToken } = useAuth();
  const [rows, setRows] = useState<Entry[]>([]);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(true);
  const [more, setMore] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = async (reset: boolean) => {
    setBusy(true);
    setErr(null);
    try {
      const before = !reset && rows.length ? `&before=${encodeURIComponent(rows[rows.length - 1].at)}` : '';
      const page = await api<Entry[]>(`/admin/audit?limit=50${q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ''}${before}`, { token: accessToken! });
      setRows(r => (reset ? page : [...r, ...page]));
      setMore(page.length === 50);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => load(true), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <View style={{ gap: spacing.md }}>
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder="Search actions, e.g. payout, dispute, staff, wiba"
        placeholderTextColor={colors.white35}
        style={styles.search}
        accessibilityLabel="Search the audit log"
      />
      {err ? <Notice tone="err">{err}</Notice> : null}
      {!busy && rows.length === 0 && <EmptyState title="No entries." />}
      {rows.length > 0 && (
        <GlassCard padding={spacing.sm}>
          {rows.map(r => (
            <View key={r.id} style={styles.row}>
              <Text style={styles.at}>{new Date(r.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</Text>
              <View style={{ flex: 1, minWidth: 220 }}>
                <Text style={styles.action}>{r.action}</Text>
                <Text style={styles.meta}>
                  {r.actor} · {r.resource}{r.resourceId ? ` ${r.resourceId.slice(0, 12)}` : ''}
                </Text>
                {r.metadata != null && <Text style={styles.json} numberOfLines={3}>{typeof r.metadata === 'string' ? r.metadata : JSON.stringify(r.metadata)}</Text>}
              </View>
            </View>
          ))}
        </GlassCard>
      )}
      {busy && <View style={{ paddingVertical: 20, alignItems: 'center' }}><ActivityIndicator color={colors.electric} /></View>}
      {!busy && more && rows.length > 0 && (
        <View style={{ flexDirection: 'row' }}>
          <GhostBtn size="sm" onPress={() => load(false)}>Load older</GhostBtn>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  search: { borderWidth: 1, borderColor: colors.white12, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: 11, color: colors.white, fontSize: 14, backgroundColor: colors.ink, maxWidth: 520, outlineStyle: 'none' } as any,
  row: { flexDirection: 'row', gap: spacing.md, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.white06, flexWrap: 'wrap' },
  at: { color: colors.white55, fontSize: 12, fontFamily: typography.mono, width: 140 },
  action: { color: colors.white, fontSize: 13.5, fontWeight: '800', fontFamily: typography.mono },
  meta: { color: colors.white60, fontSize: 12, marginTop: 2 },
  json: { color: colors.white45, fontSize: 11, fontFamily: typography.mono, marginTop: 4 },
});
