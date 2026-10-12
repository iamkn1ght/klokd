/**
 * Breach log (admin) — personal-data breaches and the 72-hour window to
 * notify the ODPC under the Data Protection Act 2019.
 *   GET   /admin/breaches          list with hours remaining
 *   POST  /admin/breach            report a new breach (starts the clock)
 *   PATCH /admin/breaches/:id      ODPC notified · OPEN → CONTAINED → CLOSED · note
 * Every action is audited.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { GlassCard } from '../../components/KlokdLayout';
import { Eyebrow, StatusPill, GradientBtn, GhostBtn, Tone } from '../../components/Primitives';
import { Field, Chip, Notice } from '../../components/Form';
import { ErrorState, EmptyState } from '../../components/States';
import { useApiData, useApiAction } from '../../hooks/useApiData';
import { colors, spacing } from '../../theme';
import { ago, day, time } from '../../lib/format';

type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type Status = 'OPEN' | 'CONTAINED' | 'CLOSED';

interface Breach {
  id: string;
  description: string;
  affectedRecords: number;
  dataTypes: string[];
  severity: Severity;
  reportedAt: string;
  odpcDeadline: string;
  odpcNotified: boolean;
  odpcNotifiedAt?: string;
  status: Status;
  notes?: { at: string; text: string }[];
  hoursRemaining: number;
  isOverdue: boolean;
}

const DATA_TYPES = ['Phone numbers', 'Names', 'ID verification status', 'Location (geohash)', 'Pay records', 'KRA PINs', 'Other'];
const SEVERITY_TONE: Record<Severity, Tone> = { LOW: 'neutral', MEDIUM: 'warn', HIGH: 'err', CRITICAL: 'err' };

export function BreachesScreen() {
  const q = useApiData<Breach[]>('/admin/breaches', { pollMs: 60_000 });
  const [reporting, setReporting] = useState(false);
  // Re-render each minute so countdowns stay current between polls.
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick(n => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  return (
    <View style={{ gap: spacing.lg, maxWidth: 900 }}>
      <View style={{ flexDirection: 'row' }}>
        {!reporting && <GradientBtn size="sm" onPress={() => setReporting(true)}>Report a breach</GradientBtn>}
      </View>
      {reporting && <ReportForm onDone={() => { setReporting(false); q.reload(); }} onCancel={() => setReporting(false)} />}

      {q.status === 'loading' && <View style={styles.loading}><ActivityIndicator color={colors.electric} /></View>}
      {q.status === 'error' && <ErrorState title="Couldn’t load the breach log." detail={q.error ?? undefined} onRetry={q.reload} />}
      {q.status === 'ready' && q.data!.length === 0 && !reporting && (
        <EmptyState title="No breaches recorded." detail="If personal data is exposed, lost or accessed without permission, report it here at once. The ODPC must be told within 72 hours." />
      )}
      {q.status === 'ready' && q.data!.map(b => <BreachCard key={b.id} b={b} onChanged={q.reload} />)}
    </View>
  );
}

function ReportForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const act = useApiAction();
  const [description, setDescription] = useState('');
  const [records, setRecords] = useState('');
  const [types, setTypes] = useState<string[]>([]);
  const [severity, setSeverity] = useState<Severity>('MEDIUM');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const ready = description.trim().length >= 20 && Number(records) > 0 && types.length > 0;

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      await act('/admin/breach', { description: description.trim(), affectedRecords: Math.round(Number(records)), dataTypes: types, severity });
      onDone();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <GlassCard padding={spacing.lg}>
      <Eyebrow color={colors.error}>NEW BREACH</Eyebrow>
      <View style={{ gap: spacing.md, marginTop: spacing.md }}>
        <Field
          label="What happened"
          value={description}
          onChangeText={setDescription}
          multiline
          placeholder="What was exposed, how, when it was found, and what has been done so far."
          hint={description.trim().length < 20 ? 'At least 20 characters.' : undefined}
        />
        <Field label="People affected (approximate)" value={records} onChangeText={setRecords} keyboardType="number-pad" style={{ maxWidth: 260 }} />
        <View style={{ gap: 6 }}>
          <Text style={styles.label}>Data involved</Text>
          <View style={styles.chips}>
            {DATA_TYPES.map(t => (
              <Chip key={t} active={types.includes(t)} onPress={() => setTypes(ts => (ts.includes(t) ? ts.filter(x => x !== t) : [...ts, t]))}>{t}</Chip>
            ))}
          </View>
        </View>
        <View style={{ gap: 6 }}>
          <Text style={styles.label}>Severity</Text>
          <View style={styles.chips}>
            {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as Severity[]).map(s => (
              <Chip key={s} active={severity === s} onPress={() => setSeverity(s)}>{s.toLowerCase()}</Chip>
            ))}
          </View>
        </View>
        <Text style={styles.sub}>Recording it starts the 72-hour ODPC clock from now.</Text>
        {err ? <Notice tone="err">{err}</Notice> : null}
        <View style={styles.actions}>
          <GradientBtn size="sm" disabled={!ready || busy} onPress={submit}>{busy ? 'Recording…' : 'Record breach'}</GradientBtn>
          <GhostBtn size="sm" onPress={onCancel}>Cancel</GhostBtn>
        </View>
      </View>
    </GlassCard>
  );
}

function countdown(b: Breach): { text: string; tone: Tone } {
  if (b.odpcNotified) return { text: `ODPC notified${b.odpcNotifiedAt ? ` ${ago(b.odpcNotifiedAt)}` : ''}`, tone: 'mint' };
  if (b.isOverdue) return { text: 'ODPC deadline passed', tone: 'err' };
  const h = Math.max(0, (new Date(b.odpcDeadline).getTime() - Date.now()) / 3_600_000);
  const whole = Math.floor(h);
  const mins = Math.floor((h - whole) * 60);
  return { text: `${whole}h ${String(mins).padStart(2, '0')}m left to notify the ODPC`, tone: h < 24 ? 'err' : 'warn' };
}

function BreachCard({ b, onChanged }: { b: Breach; onChanged: () => void }) {
  const act = useApiAction();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const c = countdown(b);

  const patch = async (body: Record<string, unknown>) => {
    setBusy(true);
    setErr(null);
    try {
      await act(`/admin/breaches/${b.id}`, body, 'PATCH');
      setNote('');
      onChanged();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <GlassCard padding={spacing.lg}>
      <View style={styles.top}>
        <View style={styles.pills}>
          <StatusPill tone={SEVERITY_TONE[b.severity]}>{b.severity.toLowerCase()}</StatusPill>
          <StatusPill tone={b.status === 'CLOSED' ? 'neutral' : b.status === 'CONTAINED' ? 'mint' : 'warn'}>{b.status.toLowerCase()}</StatusPill>
        </View>
        <StatusPill tone={c.tone}>{c.text}</StatusPill>
      </View>
      <Text style={styles.desc}>{b.description}</Text>
      <Text style={styles.sub}>
        Reported {day(b.reportedAt)} {time(b.reportedAt)} · about {b.affectedRecords.toLocaleString('en-KE')} people · {b.dataTypes.join(', ')}
      </Text>
      {(b.notes ?? []).map((n, i) => (
        <Text key={i} style={styles.note}>{ago(n.at)} · {n.text}</Text>
      ))}

      {b.status !== 'CLOSED' && (
        <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
          <Field label="Add a note" value={note} onChangeText={setNote} multiline placeholder="e.g. Access revoked; affected people informed by SMS." />
          {err ? <Notice tone="err">{err}</Notice> : null}
          <View style={styles.actions}>
            {note.trim().length > 0 && <GhostBtn size="sm" disabled={busy} onPress={() => patch({ note: note.trim() })}>Save note</GhostBtn>}
            {!b.odpcNotified && <GradientBtn size="sm" disabled={busy} onPress={() => patch({ odpcNotified: true })}>ODPC notified</GradientBtn>}
            {b.status === 'OPEN' && <GhostBtn size="sm" disabled={busy} onPress={() => patch({ status: 'CONTAINED' })}>Mark contained</GhostBtn>}
            <GhostBtn size="sm" disabled={busy} onPress={() => patch({ status: 'CLOSED' })}>Close</GhostBtn>
          </View>
        </View>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  loading: { paddingVertical: 60, alignItems: 'center' },
  top: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  pills: { flexDirection: 'row', gap: 6 },
  desc: { color: colors.white, fontSize: 14, lineHeight: 20, marginTop: spacing.md },
  sub: { color: colors.white50, fontSize: 12.5, marginTop: spacing.xs },
  note: { color: colors.white70, fontSize: 12.5, marginTop: spacing.xs },
  label: { color: colors.white60, fontSize: 12.5, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
