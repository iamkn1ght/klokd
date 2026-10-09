/**
 * Shift parts shared by the worker and employer web workspaces — all real:
 *   RateShift      POST /ratings
 *   ReportProblem  POST /disputes
 *   ContractText   GET  /shifts/:id/contract (s.9 written particulars)
 */
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { GlassCard } from './KlokdLayout';
import { Eyebrow, GradientBtn, GhostBtn } from './Primitives';
import { Field, Chip, Notice } from './Form';
import { useApiAction, useApiData } from '../hooks/useApiData';
import { colors, spacing, radius, typography } from '../theme';

export function RateShift({ shiftId, who, onDone }: { shiftId: string; who: string; onDone?: () => void }) {
  const act = useApiAction();
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      await act('/ratings', { shiftId, stars, comment: comment.trim() || undefined });
      setDone(true);
      onDone?.();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (done) return <Notice tone="ok">Thanks — your rating is in.</Notice>;
  return (
    <GlassCard padding={spacing.lg}>
      <Eyebrow>RATE THIS SHIFT</Eyebrow>
      <Text style={styles.h}>How was it working with {who}?</Text>
      <View style={styles.stars} accessibilityRole="radiogroup">
        {[1, 2, 3, 4, 5].map(n => (
          <Pressable
            key={n}
            onPress={() => setStars(n)}
            accessibilityRole="radio"
            accessibilityState={{ checked: stars === n }}
            accessibilityLabel={`${n} star${n === 1 ? '' : 's'}`}
          >
            <Text style={[styles.star, n <= stars && styles.starOn]}>★</Text>
          </Pressable>
        ))}
      </View>
      <Field label="Comment (optional)" value={comment} onChangeText={setComment} placeholder="What went well, or what could be better" multiline />
      <Text style={styles.small}>Ratings show on a profile once there are at least 3.</Text>
      {err ? <Notice tone="err">{err}</Notice> : null}
      <View style={{ flexDirection: 'row', marginTop: spacing.sm }}>
        <GradientBtn size="sm" disabled={!stars || busy} onPress={submit}>{busy ? 'Sending…' : 'Send rating'}</GradientBtn>
      </View>
    </GlassCard>
  );
}

const PROBLEM_TYPES: { key: string; label: string }[] = [
  { key: 'INCOMPLETE_SHIFT', label: 'Hours or pay are wrong' },
  { key: 'PAYMENT_NOT_RECEIVED', label: 'Pay not received' },
  { key: 'CONDUCT_ISSUE', label: 'Behaviour on shift' },
  { key: 'UNSAFE_CONDITIONS', label: 'Unsafe conditions' },
  { key: 'NO_SHOW', label: 'Didn’t show up' },
  { key: 'OTHER', label: 'Something else' },
];

export function ReportProblem({
  shiftId,
  types = PROBLEM_TYPES.map(t => t.key),
  onDone,
}: {
  shiftId: string;
  types?: string[];
  onDone?: () => void;
}) {
  const act = useApiAction();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState(types[0]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  if (sent) return <Notice tone="ok">{sent}</Notice>;
  if (!open) {
    return (
      <View style={{ flexDirection: 'row' }}>
        <GhostBtn size="sm" tone="danger" onPress={() => setOpen(true)}>Report a problem</GhostBtn>
      </View>
    );
  }
  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await act<{ id: string }>('/disputes', { shiftId, type, description: text.trim() });
      setSent(`Sent to Klokd (reference ${r.id.slice(0, 8)}). Pay is paused while we look into it; we reply within 24 hours.`);
      onDone?.();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <GlassCard padding={spacing.lg}>
      <Eyebrow color={colors.error}>REPORT A PROBLEM</Eyebrow>
      <View style={[styles.chips, { marginTop: spacing.md }]}>
        {PROBLEM_TYPES.filter(t => types.includes(t.key)).map(t => (
          <Chip key={t.key} active={type === t.key} onPress={() => setType(t.key)}>{t.label}</Chip>
        ))}
      </View>
      <Field
        label="What happened?"
        value={text}
        onChangeText={setText}
        multiline
        placeholder="Give times and details — Klokd reviews the check-in records too."
        style={{ marginTop: spacing.md }}
        hint={text.trim().length < 10 ? 'At least 10 characters.' : undefined}
      />
      {err ? <Notice tone="err">{err}</Notice> : null}
      <View style={styles.row}>
        <GradientBtn size="sm" disabled={busy || text.trim().length < 10} onPress={submit}>{busy ? 'Sending…' : 'Send to Klokd'}</GradientBtn>
        <GhostBtn size="sm" onPress={() => setOpen(false)}>Cancel</GhostBtn>
      </View>
    </GlassCard>
  );
}

interface Contract {
  body: string | null;
  employerAcceptedAt: string | null;
  workerAcceptedAt: string | null;
}

export function ContractText({ shiftId, initiallyOpen = false }: { shiftId: string; initiallyOpen?: boolean }) {
  const [open, setOpen] = useState(initiallyOpen);
  const c = useApiData<Contract>(open ? `/shifts/${shiftId}/contract` : null);
  return (
    <View style={styles.contract}>
      <Pressable onPress={() => setOpen(o => !o)} accessibilityRole="button" style={styles.contractHead}>
        <Text style={styles.contractTitle}>Written particulars (your contract for this shift)</Text>
        <Text style={styles.contractToggle}>{open ? 'Hide' : 'Read'}</Text>
      </Pressable>
      {open && c.status === 'loading' && <Text style={styles.small}>Loading…</Text>}
      {open && c.status === 'error' && <Notice tone="err">{c.error}</Notice>}
      {open && c.data?.body && (
        <>
          <Text style={styles.contractBody} selectable>{c.data.body}</Text>
          <Text style={styles.small}>
            {c.data.workerAcceptedAt
              ? `Accepted by the worker on ${new Date(c.data.workerAcceptedAt).toLocaleString('en-GB')}.`
              : 'The worker accepts this by confirming the shift.'}
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  h: { color: colors.white, fontSize: 15, fontWeight: '800', marginTop: 6 },
  stars: { flexDirection: 'row', gap: 6, marginVertical: spacing.md },
  star: { fontSize: 30, color: colors.white25 },
  starOn: { color: colors.volt },
  small: { color: colors.white50, fontSize: 11.5, lineHeight: 16, marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  contract: { borderWidth: 1, borderColor: colors.white10, borderRadius: radius.lg, padding: spacing.md, backgroundColor: colors.white03 },
  contractHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  contractTitle: { color: colors.white85, fontSize: 13, fontWeight: '800', flex: 1 },
  contractToggle: { color: colors.electric, fontSize: 12.5, fontWeight: '800' },
  contractBody: { color: colors.white75, fontSize: 12, lineHeight: 18, marginTop: spacing.md, fontFamily: typography.mono },
});
