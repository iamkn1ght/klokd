/**
 * Worker "Me" (web) — identity, skills, privacy. All real:
 *   GET  /me/worker                 profile + reputation
 *   POST /identity/workers/verify-id  IPRS check through Identiti (no ID images)
 *   PUT  /me/worker/skills          skills
 *   POST /me/consent                identity + location consent
 *   GET  /me/data                   download everything Klokd holds (JSON)
 *   POST /me/data-requests          correction / deletion request (DPA 2019)
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { GlassCard } from '../../components/KlokdLayout';
import { Eyebrow, GradientBtn, GhostBtn, StatusPill } from '../../components/Primitives';
import { Field, Chip, Notice } from '../../components/Form';
import { ErrorState } from '../../components/States';
import { useApiData, useApiAction } from '../../hooks/useApiData';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { colors, spacing, radius } from '../../theme';
import { day, downloadText } from '../../lib/format';
import type { WorkerMe as Me } from './WorkerHome';

const SKILLS = ['Waiter', 'Barista', 'Bartender', 'Chef', 'Kitchen hand', 'Cashier', 'Cleaner', 'Security', 'Receptionist', 'Usher', 'Stock / warehouse', 'Events'];

export function WorkerMe() {
  const me = useApiData<Me>('/me/worker');
  if (me.status === 'loading') return <View style={styles.loading}><ActivityIndicator color={colors.electric} /></View>;
  if (me.status === 'error') return <ErrorState title="Couldn’t load your profile." detail={me.error ?? undefined} onRetry={me.reload} />;
  const m = me.data!;
  return (
    <View style={styles.wrap}>
      <View>
        <Eyebrow>ME</Eyebrow>
        <Text style={styles.h1}>{m.firstName} {m.lastName}</Text>
        <Text style={styles.meta}>{m.phone ?? ''} · on Klokd since {day(m.memberSince)}</Text>
      </View>
      <Reputation m={m} />
      <Verification m={m} onDone={me.reload} />
      <Skills m={m} onDone={me.reload} />
      <Consent m={m} onDone={me.reload} />
      <Privacy />
    </View>
  );
}

function Reputation({ m }: { m: Me }) {
  return (
    <GlassCard padding={spacing.xl}>
      <Eyebrow>YOUR REPUTATION</Eyebrow>
      <View style={styles.stats}>
        <Stat k={String(m.completedShifts)} l="shifts done" />
        <Stat k={m.showUpRate != null ? `${Math.round(m.showUpRate)}%` : '—'} l="show-up rate" />
        <Stat k={m.rating != null ? `★ ${m.rating.toFixed(1)}` : '—'} l={`rating · ${m.ratingCount} review${m.ratingCount === 1 ? '' : 's'}`} />
      </View>
      <Text style={styles.small}>Your rating shows to businesses after 3 reviews. Your show-up rate counts shifts you started against shifts you missed.</Text>
    </GlassCard>
  );
}

function Verification({ m, onDone }: { m: Me; onDone: () => void }) {
  const act = useApiAction();
  const { refreshAccount } = useAuth();
  const [nationalId, setNationalId] = useState('');
  const [first, setFirst] = useState(m.firstName);
  const [last, setLast] = useState(m.lastName === '—' ? '' : m.lastName);
  const [dob, setDob] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const verified = m.verificationStatus === 'APPROVED';

  const idOk = /^\d{7,9}$/.test(nationalId);
  const dobOk = /^\d{4}-\d{2}-\d{2}$/.test(dob);
  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      await act('/identity/workers/verify-id', { nationalId, nameFirst: first.trim(), nameLast: last.trim(), dateOfBirth: dob });
      await refreshAccount();
      onDone();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <GlassCard padding={spacing.xl}>
      <View style={styles.cardHead}>
        <Eyebrow>ID VERIFICATION</Eyebrow>
        <StatusPill tone={verified ? 'mint' : 'warn'}>{verified ? 'verified' : 'to do'}</StatusPill>
      </View>
      {verified ? (
        <Text style={styles.p}>Your National ID is verified with the government register (IPRS) through Identiti. You can apply for shifts.</Text>
      ) : (
        <>
          <Text style={styles.p}>
            Businesses only pick verified workers. Enter your details exactly as on your ID; they’re checked with the government register (IPRS) through Identiti. Klokd never stores your ID number or photos.
          </Text>
          {err ? <Notice tone="err">{err}</Notice> : null}
          <View style={styles.row2}>
            <Field label="First name (as on ID)" value={first} onChangeText={setFirst} style={styles.flex} />
            <Field label="Last name (as on ID)" value={last} onChangeText={setLast} style={styles.flex} />
          </View>
          <View style={styles.row2}>
            <Field label="National ID number" value={nationalId} onChangeText={t => setNationalId(t.replace(/\D/g, '').slice(0, 9))} placeholder="12345678" style={styles.flex} error={nationalId && !idOk ? '7 to 9 digits' : null} />
            <Field label="Date of birth" value={dob} onChangeText={setDob} placeholder="YYYY-MM-DD" maxLength={10} style={styles.flex} error={dob && !dobOk ? 'Use YYYY-MM-DD' : null} />
          </View>
          <View style={{ flexDirection: 'row' }}>
            <GradientBtn disabled={busy || !idOk || !dobOk || !first.trim() || !last.trim()} onPress={submit}>{busy ? 'Checking…' : 'Verify my ID'}</GradientBtn>
          </View>
        </>
      )}
    </GlassCard>
  );
}

function Skills({ m, onDone }: { m: Me; onDone: () => void }) {
  const act = useApiAction();
  const [skills, setSkills] = useState<string[]>(m.skills);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => setSkills(m.skills), [m.skills]);
  const dirty = skills.slice().sort().join() !== m.skills.slice().sort().join();
  const toggle = (k: string) => {
    setSaved(false);
    setSkills(s => (s.includes(k) ? s.filter(x => x !== k) : [...s, k]));
  };
  return (
    <GlassCard padding={spacing.xl}>
      <Eyebrow>SKILLS</Eyebrow>
      <Text style={styles.p}>Businesses see these when you apply.</Text>
      <View style={styles.chips}>
        {[...new Set([...SKILLS, ...m.skills])].map(k => (
          <Chip key={k} active={skills.includes(k)} onPress={() => toggle(k)}>{k}</Chip>
        ))}
      </View>
      <View style={{ flexDirection: 'row', marginTop: spacing.md, alignItems: 'center', gap: spacing.md }}>
        <GradientBtn
          size="sm"
          disabled={!dirty || busy}
          onPress={async () => {
            setBusy(true);
            try {
              await act('/me/worker/skills', { skills }, 'PUT');
              setSaved(true);
              onDone();
            } finally {
              setBusy(false);
            }
          }}
        >
          Save skills
        </GradientBtn>
        {saved && <Text style={styles.ok}>Saved</Text>}
      </View>
    </GlassCard>
  );
}

function Consent({ m, onDone }: { m: Me; onDone: () => void }) {
  const act = useApiAction();
  const [busy, setBusy] = useState(false);
  const set = async (identity: boolean, location: boolean) => {
    setBusy(true);
    try {
      await act('/me/consent', { identity, location });
      onDone();
    } finally {
      setBusy(false);
    }
  };
  return (
    <GlassCard padding={spacing.xl}>
      <Eyebrow>CONSENT</Eyebrow>
      <Toggle
        on={m.consent.identity}
        disabled={busy}
        title="Identity checks"
        detail="Lets Identiti check your ID with the government register. Needed to be picked for shifts."
        onPress={() => set(!m.consent.identity, m.consent.location)}
      />
      <Toggle
        on={m.consent.location}
        disabled={busy}
        title="Location at check-in and clock-out"
        detail="Read once when you tap “I’ve arrived” and “Clock out” — never tracked in between. Needed to check in."
        onPress={() => set(m.consent.identity, !m.consent.location)}
      />
      {m.consent.at && <Text style={styles.small}>Last updated {day(m.consent.at)}.</Text>}
    </GlassCard>
  );
}

function Toggle({ on, title, detail, onPress, disabled }: { on: boolean; title: string; detail: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="switch" accessibilityState={{ checked: on }} style={styles.toggle}>
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleH}>{title}</Text>
        <Text style={styles.small}>{detail}</Text>
      </View>
      <View style={[styles.switch, on && styles.switchOn]}>
        <View style={[styles.knob, on && styles.knobOn]} />
      </View>
    </Pressable>
  );
}

export function Privacy() {
  const { accessToken } = useAuth();
  const act = useApiAction();
  const reqs = useApiData<{ id: string; type: string; status: string; details: string | null; resolution: string | null; createdAt: string }[]>('/me/data-requests');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [mode, setMode] = useState<'none' | 'RECTIFICATION' | 'DELETION'>('none');
  const [details, setDetails] = useState('');

  const exportData = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const data = await api('/me/data', { token: accessToken! });
      downloadText(`klokd-my-data-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2), 'application/json');
      setMsg({ tone: 'ok', text: 'Your data has downloaded as a JSON file.' });
    } catch (e: any) {
      setMsg({ tone: 'err', text: e.message });
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await act('/me/data-requests', { type: mode, details: details.trim() || undefined });
      setMsg({ tone: 'ok', text: 'Request sent. Klokd responds within 30 days, as the Data Protection Act requires.' });
      setMode('none');
      setDetails('');
      reqs.reload();
    } catch (e: any) {
      setMsg({ tone: 'err', text: e.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <GlassCard padding={spacing.xl}>
      <Eyebrow>YOUR DATA</Eyebrow>
      <Text style={styles.p}>Under Kenya’s Data Protection Act you can see, correct and ask us to delete what Klokd holds about you.</Text>
      {msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
      <View style={styles.actions}>
        <GradientBtn size="sm" disabled={busy} onPress={exportData}>Download my data</GradientBtn>
        <GhostBtn size="sm" onPress={() => setMode('RECTIFICATION')}>Ask for a correction</GhostBtn>
        <GhostBtn size="sm" tone="danger" onPress={() => setMode('DELETION')}>Ask to delete my account</GhostBtn>
      </View>
      {mode !== 'none' && (
        <View style={{ marginTop: spacing.md }}>
          <Field
            label={mode === 'DELETION' ? 'Anything we should know? (optional)' : 'What should we correct?'}
            value={details}
            onChangeText={setDetails}
            multiline
            hint={mode === 'DELETION' ? 'Pay and contract records are kept for 7 years by law; everything else is deleted.' : undefined}
          />
          <View style={styles.actions}>
            <GradientBtn size="sm" disabled={busy || (mode === 'RECTIFICATION' && details.trim().length < 5)} onPress={send}>Send request</GradientBtn>
            <GhostBtn size="sm" onPress={() => setMode('none')}>Cancel</GhostBtn>
          </View>
        </View>
      )}
      {(reqs.data?.length ?? 0) > 0 && (
        <View style={{ marginTop: spacing.md }}>
          {reqs.data!.map(r => (
            <Text key={r.id} style={styles.small}>
              {r.type === 'DELETION' ? 'Deletion' : 'Correction'} request · {day(r.createdAt)} · {r.status.toLowerCase()}
              {r.resolution ? ` — ${r.resolution}` : ''}
            </Text>
          ))}
        </View>
      )}
    </GlassCard>
  );
}

function Stat({ k, l }: { k: string; l: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.statK}>{k}</Text>
      <Text style={styles.statL}>{l}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { maxWidth: 760, gap: spacing.lg },
  loading: { paddingVertical: 80, alignItems: 'center' },
  h1: { color: colors.white, fontSize: 28, fontWeight: '900', letterSpacing: -1, marginTop: 6 },
  meta: { color: colors.white60, fontSize: 13, marginTop: 4 },
  stats: { flexDirection: 'row', marginTop: spacing.md },
  statK: { color: colors.white, fontSize: 20, fontWeight: '900' },
  statL: { color: colors.white55, fontSize: 11, fontWeight: '700', marginTop: 2 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  p: { color: colors.white65, fontSize: 13, lineHeight: 19, marginTop: 8, marginBottom: spacing.md },
  small: { color: colors.white50, fontSize: 11.5, lineHeight: 16, marginTop: 4 },
  row2: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.md },
  flex: { flex: 1, minWidth: 200 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  ok: { color: colors.electric, fontSize: 12.5, fontWeight: '800' },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.white06 },
  toggleH: { color: colors.white, fontSize: 14, fontWeight: '800' },
  switch: { width: 42, height: 24, borderRadius: 12, backgroundColor: colors.white15, padding: 3 },
  switchOn: { backgroundColor: colors.electric },
  knob: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.white },
  knobOn: { transform: [{ translateX: 18 }], backgroundColor: colors.ink },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
});
