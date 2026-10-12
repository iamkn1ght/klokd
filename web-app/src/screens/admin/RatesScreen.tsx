/**
 * Statutory rates (admin) — GET /admin/compliance/rates. Every rate the pay
 * engine uses, its built-in default and whether staff changed it.
 * Edit with PUT /compliance/config/:key (validated server-side), put back to
 * the default with DELETE /admin/compliance/config/:key, and see who changed
 * what with GET /admin/compliance/config/:key/history. All audited.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { GlassCard } from '../../components/KlokdLayout';
import { Eyebrow, StatusPill, GradientBtn, GhostBtn } from '../../components/Primitives';
import { Field, Chip, Notice } from '../../components/Form';
import { ErrorState } from '../../components/States';
import { useApiData, useApiAction } from '../../hooks/useApiData';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { colors, spacing } from '../../theme';
import { ago } from '../../lib/format';

type Band = { min: number; max: number | null; rate: number };
type Kind = 'percent' | 'kes' | 'boolean' | 'bands';

interface Rate {
  key: string;
  label: string;
  kind: Kind;
  group: string;
  value: unknown;
  defaultValue: unknown;
  overridden: boolean;
  updatedAt: string | null;
}

interface HistoryRow {
  id: string;
  action: string;
  createdAt: string;
  metadata: string | null;
}

const GROUPS = ['PAYE', 'NSSF', 'SHIF', 'Housing levy', 'Other'];
const num = (n: number) => n.toLocaleString('en-KE');

function show(kind: Kind, v: unknown): string {
  if (kind === 'percent') return `${v}%`;
  if (kind === 'kes') return `KES ${num(Number(v))}`;
  if (kind === 'boolean') return v ? 'On' : 'Off';
  const bands = (v as Band[]) ?? [];
  return bands.map(b => `${b.rate}% ${b.max == null ? `above ${num(b.min - 1)}` : `${num(b.min)}–${num(b.max)}`}`).join(' · ');
}

function showStored(raw: unknown): string {
  if (raw == null) return 'default';
  try {
    const v = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return typeof v === 'object' ? JSON.stringify(v) : String(v);
  } catch {
    return String(raw);
  }
}

export function RatesScreen() {
  const q = useApiData<Rate[]>('/admin/compliance/rates');
  if (q.status === 'loading') return <View style={styles.loading}><ActivityIndicator color={colors.electric} /></View>;
  if (q.status === 'error') return <ErrorState title="Couldn’t load the rates." detail={q.error ?? undefined} onRetry={q.reload} />;
  const rates = q.data!;
  return (
    <View style={{ gap: spacing.xl, maxWidth: 900 }}>
      <Notice>
        These rates calculate every worker’s deductions. Confirm each one with a tax professional before real payouts. The NSSF limits in particular may predate the February 2026 change.
      </Notice>
      {GROUPS.map(g => {
        const rows = rates.filter(r => r.group === g);
        if (rows.length === 0) return null;
        return (
          <View key={g} style={{ gap: spacing.sm }}>
            <Eyebrow>{g.toUpperCase()}</Eyebrow>
            <GlassCard padding={spacing.sm}>
              {rows.map((r, i) => (
                <RateRow key={r.key} r={r} last={i === rows.length - 1} onChanged={q.reload} />
              ))}
            </GlassCard>
          </View>
        );
      })}
    </View>
  );
}

function RateRow({ r, last, onChanged }: { r: Rate; last: boolean; onChanged: () => void }) {
  const act = useApiAction();
  const { accessToken } = useAuth();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const [flag, setFlag] = useState(false);
  const [bands, setBands] = useState<{ min: string; max: string; rate: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryRow[] | null>(null);

  const open = () => {
    setErr(null);
    if (r.kind === 'boolean') setFlag(!!r.value);
    else if (r.kind === 'bands') setBands((r.value as Band[]).map(b => ({ min: String(b.min), max: b.max == null ? '' : String(b.max), rate: String(b.rate) })));
    else setText(String(r.value));
    setEditing(true);
  };

  const parsed = (): unknown => {
    if (r.kind === 'boolean') return flag;
    if (r.kind === 'bands') {
      return bands.map(b => ({ min: Number(b.min), max: b.max.trim() === '' ? null : Number(b.max), rate: Number(b.rate) }));
    }
    return Number(text);
  };

  const save = async () => {
    setBusy(true);
    setErr(null);
    try {
      await act(`/compliance/config/${r.key}`, { value: parsed() }, 'PUT');
      setEditing(false);
      setHistory(null);
      onChanged();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    setBusy(true);
    setErr(null);
    try {
      await api(`/admin/compliance/config/${r.key}`, { method: 'DELETE', token: accessToken! });
      setEditing(false);
      setHistory(null);
      onChanged();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleHistory = async () => {
    if (history) return setHistory(null);
    try {
      setHistory(await api<HistoryRow[]>(`/admin/compliance/config/${r.key}/history`, { token: accessToken! }));
    } catch (e: any) {
      setErr(e.message);
    }
  };

  return (
    <View style={[styles.row, !last && styles.rowLine]}>
      <View style={styles.rowTop}>
        <View style={{ flex: 1, minWidth: 220 }}>
          <Text style={styles.label}>{r.label}</Text>
          <Text style={styles.value}>{show(r.kind, r.value)}</Text>
          {r.overridden && (
            <Text style={styles.sub}>
              Default {show(r.kind, r.defaultValue)}{r.updatedAt ? ` · changed ${ago(r.updatedAt)}` : ''}
            </Text>
          )}
        </View>
        <View style={styles.rowActions}>
          <StatusPill tone={r.overridden ? 'warn' : 'neutral'}>{r.overridden ? 'changed' : 'default'}</StatusPill>
          {!editing && <GhostBtn size="sm" onPress={open}>Edit</GhostBtn>}
          <GhostBtn size="sm" onPress={toggleHistory}>{history ? 'Hide history' : 'History'}</GhostBtn>
        </View>
      </View>

      {editing && (
        <View style={styles.editor}>
          {r.kind === 'boolean' && (
            <View style={styles.chips}>
              <Chip active={flag} onPress={() => setFlag(true)}>On</Chip>
              <Chip active={!flag} onPress={() => setFlag(false)}>Off</Chip>
            </View>
          )}
          {(r.kind === 'percent' || r.kind === 'kes') && (
            <Field
              label={r.kind === 'percent' ? 'Rate (%)' : 'Amount (KES)'}
              value={text}
              onChangeText={setText}
              keyboardType="decimal-pad"
              style={{ maxWidth: 240 }}
            />
          )}
          {r.kind === 'bands' && (
            <View style={{ gap: spacing.sm }}>
              {bands.map((b, i) => (
                <View key={i} style={styles.bandRow}>
                  <Field label="From (KES)" value={b.min} keyboardType="number-pad" onChangeText={v => setBands(bs => bs.map((x, j) => (j === i ? { ...x, min: v } : x)))} style={styles.bandField} />
                  <Field label="To (KES)" value={b.max} placeholder="no limit" keyboardType="number-pad" onChangeText={v => setBands(bs => bs.map((x, j) => (j === i ? { ...x, max: v } : x)))} style={styles.bandField} />
                  <Field label="Rate (%)" value={b.rate} keyboardType="decimal-pad" onChangeText={v => setBands(bs => bs.map((x, j) => (j === i ? { ...x, rate: v } : x)))} style={styles.bandField} />
                  {bands.length > 1 && <GhostBtn size="sm" tone="danger" onPress={() => setBands(bs => bs.filter((_, j) => j !== i))}>Remove</GhostBtn>}
                </View>
              ))}
              <View style={{ flexDirection: 'row' }}>
                <GhostBtn size="sm" onPress={() => setBands(bs => [...bs, { min: '', max: '', rate: '' }])}>Add band</GhostBtn>
              </View>
              <Text style={styles.sub}>Leave “To” empty on the top band for no upper limit.</Text>
            </View>
          )}
          {err ? <Notice tone="err">{err}</Notice> : null}
          <View style={styles.editActions}>
            <GradientBtn size="sm" disabled={busy} onPress={save}>{busy ? 'Saving…' : 'Save'}</GradientBtn>
            <GhostBtn size="sm" onPress={() => setEditing(false)}>Cancel</GhostBtn>
            {r.overridden && <GhostBtn size="sm" tone="danger" disabled={busy} onPress={reset}>Reset to default</GhostBtn>}
          </View>
        </View>
      )}

      {!editing && err ? <Notice tone="err">{err}</Notice> : null}

      {history && (
        <View style={styles.history}>
          {history.length === 0 ? (
            <Text style={styles.sub}>Never changed. Using the built-in default.</Text>
          ) : (
            history.map(h => {
              const m = (() => { try { return JSON.parse(h.metadata ?? '{}'); } catch { return {}; } })();
              return (
                <Text key={h.id} style={styles.sub}>
                  {ago(h.createdAt)} · {h.action === 'compliance_config.reset' ? 'reset to default' : `${showStored(m.previousValue)} → ${showStored(m.newValue)}`}
                </Text>
              );
            })
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { paddingVertical: 60, alignItems: 'center' },
  row: { padding: spacing.md, gap: spacing.sm },
  rowLine: { borderBottomWidth: 1, borderBottomColor: colors.white06 },
  rowTop: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.md },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  label: { color: colors.white60, fontSize: 12.5 },
  value: { color: colors.white, fontSize: 15, fontWeight: '800', marginTop: 2 },
  sub: { color: colors.white50, fontSize: 12, marginTop: 2 },
  editor: { gap: spacing.sm, paddingTop: spacing.sm },
  chips: { flexDirection: 'row', gap: 6 },
  bandRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: spacing.sm },
  bandField: { width: 140 },
  editActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  history: { gap: 2, paddingTop: spacing.xs },
});
