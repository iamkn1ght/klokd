/**
 * Me — profile, reputation, skills, consent and data rights. All real:
 *   GET  /me/worker            profile + reputation
 *   PUT  /me/worker/skills     skills
 *   POST /me/consent           identity + location consent
 *   GET  /me/data              share a copy of your data
 *   POST /me/data-requests     correction / deletion (DPA 2019)
 */
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Share, Switch, TextInput, Linking, Pressable } from 'react-native';
import Constants from 'expo-constants';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Chip, Label, GradientBtn, StatusPill } from '../../components/Primitives';
import { AmbientOrbs, SafeTop, Glass } from '../../components/KlokdLayout';
import { useData } from '../../hooks/useData';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme';
import { day } from '../../lib/format';
import * as Updates from 'expo-updates';
import type { WorkerMe } from './HomeScreen';
import { useTabBarSpace } from '../../components/KlokdTabBar';

type Props = { navigation: NativeStackNavigationProp<any> };

const SKILLS = ['Waiter', 'Barista', 'Bartender', 'Chef', 'Kitchen hand', 'Cashier', 'Cleaner', 'Security', 'Receptionist', 'Usher', 'Stock / warehouse', 'Events'];

export function ProfileScreen({ navigation }: Props) {
  const tabSpace = useTabBarSpace();
  const me = useData<WorkerMe>('/me/worker');
  const requests = useData<{ id: string; type: string; status: string; resolution: string | null; createdAt: string }[]>('/me/data-requests');
  const { put, post, get } = useApi();
  const { logout } = useAuth();
  const [skills, setSkills] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [reqType, setReqType] = useState<'RECTIFICATION' | 'DELETION' | null>(null);
  const [reqText, setReqText] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');

  useEffect(() => {
    if (me.data) setSkills(me.data.skills);
  }, [me.data]);

  const m = me.data;
  const dirty = !!m && skills.slice().sort().join() !== m.skills.slice().sort().join();

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    setSaving(true);
    setMsg(null);
    try {
      await fn();
      setMsg({ ok: true, text: ok });
      await Promise.all([me.reload(), requests.reload()]);
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message ?? 'Something went wrong.' });
    }
    setSaving(false);
  };

  const shareData = async () => {
    try {
      const data = await get('/me/data');
      await Share.share({ title: 'My Klokd data', message: JSON.stringify(data, null, 2) });
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message ?? 'Couldn’t export your data.' });
    }
  };

  return (
    <View style={styles.screen}>
      <AmbientOrbs intensity="subtle" />
      <SafeTop />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: tabSpace }}>
        {me.status === 'loading' && <ActivityIndicator color={colors.electric} style={{ marginTop: 40 }} />}
        {me.status === 'error' && (
          <>
            <Text style={styles.err}>{me.error}</Text>
            <TouchableOpacity style={styles.signOut} onPress={logout}>
              <Text style={styles.signOutText}>Sign out</Text>
            </TouchableOpacity>
          </>
        )}
        {m && (
          <>
            {editingName ? (
              <Glass style={styles.card}>
                <Label color={colors.white55}>Your name</Label>
                <TextInput value={first} onChangeText={setFirst} placeholder="First name" placeholderTextColor={colors.white35} autoCapitalize="words" style={[styles.input, { minHeight: 0, marginTop: 8 }]} />
                <TextInput value={last} onChangeText={setLast} placeholder="Last name" placeholderTextColor={colors.white35} autoCapitalize="words" style={[styles.input, { minHeight: 0 }]} />
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                  <GradientBtn
                    size="sm"
                    disabled={saving || first.trim().length < 2 || last.trim().length < 2}
                    onPress={() => act(() => put('/identity/workers/profile', { firstName: first.trim(), lastName: last.trim() }), 'Name saved.').then(() => setEditingName(false))}
                  >
                    Save
                  </GradientBtn>
                  <TouchableOpacity onPress={() => setEditingName(false)}><Text style={styles.link}>Cancel</Text></TouchableOpacity>
                </View>
              </Glass>
            ) : (
              <View style={styles.nameRow}>
                <Text style={styles.h1} numberOfLines={1}>{m.firstName} {m.lastName}</Text>
                {m.verificationStatus !== 'APPROVED' && (
                  <TouchableOpacity
                    onPress={() => { setFirst(m.firstName); setLast(m.lastName === '—' ? '' : m.lastName); setEditingName(true); }}
                    accessibilityLabel="Edit your name"
                    hitSlop={10}
                  >
                    <Text style={styles.edit}>Edit</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            <Text style={styles.meta}>
              On Klokd since {new Date(m.memberSince).toLocaleDateString('en-KE', { month: 'long', year: 'numeric' })}
              {m.verificationStatus === 'APPROVED' ? ' · name from your ID check' : ''}
            </Text>
            {msg && <Text style={[styles.msg, { color: msg.ok ? colors.electric : colors.warning }]}>{msg.text}</Text>}

            <Glass style={styles.card}>
              <Label color={colors.white55}>Reputation</Label>
              <View style={styles.stats}>
                <Stat k={String(m.completedShifts)} l="shifts done" />
                <Stat k={m.showUpRate != null ? `${Math.round(m.showUpRate)}%` : '—'} l="show-up" />
                <Stat k={m.rating != null ? `★ ${m.rating.toFixed(1)}` : '—'} l={`${m.ratingCount} reviews`} />
              </View>
              <Text style={styles.small}>Your rating shows to businesses after 3 reviews.</Text>
            </Glass>

            <Glass style={styles.card}>
              <View style={styles.cardHead}>
                <Label color={colors.white55}>ID verification</Label>
                <StatusPill tone={m.verificationStatus === 'APPROVED' ? 'mint' : 'warn'}>{m.verificationStatus === 'APPROVED' ? 'Verified' : 'To do'}</StatusPill>
              </View>
              {m.verificationStatus === 'APPROVED' ? (
                <Text style={styles.p}>Verified with the government register (IPRS) through Identiti.</Text>
              ) : (
                <>
                  <Text style={styles.p}>Businesses only pick verified workers.</Text>
                  <GradientBtn size="sm" onPress={() => navigation.navigate('VerifyIDMain', { fromMain: true })}>Verify my ID</GradientBtn>
                </>
              )}
            </Glass>

            <Glass style={styles.card}>
              <Label color={colors.white55}>Skills</Label>
              <View style={styles.chips}>
                {[...new Set([...SKILLS, ...m.skills])].map(k => (
                  <Chip key={k} active={skills.includes(k)} onPress={() => setSkills(s => (s.includes(k) ? s.filter(x => x !== k) : [...s, k]))}>{k}</Chip>
                ))}
              </View>
              {dirty && <GradientBtn size="sm" disabled={saving} onPress={() => act(() => put('/me/worker/skills', { skills }), 'Skills saved.')}>Save skills</GradientBtn>}
            </Glass>

            <Glass style={styles.card}>
              <Label color={colors.white55}>Consent</Label>
              <Toggle
                title="Identity checks"
                detail="Lets Identiti check your ID with the government register."
                value={m.consent.identity}
                onChange={v => act(() => post('/me/consent', { identity: v, location: m.consent.location }), 'Consent updated.')}
              />
              <Toggle
                title="Location at check-in and clock-out"
                detail="Read once when you tap “I’ve arrived” and “Clock out”, never in between."
                value={m.consent.location}
                onChange={v => act(() => post('/me/consent', { identity: m.consent.identity, location: v }), 'Consent updated.')}
              />
            </Glass>

            <Glass style={styles.card}>
              <Label color={colors.white55}>Your data</Label>
              <Text style={styles.p}>You can see, correct and ask us to delete what Klokd holds about you.</Text>
              <TouchableOpacity onPress={shareData}><Text style={styles.link}>Get a copy of my data</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setReqType('RECTIFICATION')}><Text style={styles.link}>Ask for a correction</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setReqType('DELETION')}><Text style={[styles.link, { color: colors.warning }]}>Ask to delete my account</Text></TouchableOpacity>
              {reqType && (
                <View style={{ marginTop: 10, gap: 8 }}>
                  <TextInput
                    value={reqText}
                    onChangeText={setReqText}
                    placeholder={reqType === 'DELETION' ? 'Anything we should know? (optional)' : 'What should we correct?'}
                    placeholderTextColor={colors.white35}
                    multiline
                    style={styles.input}
                  />
                  {reqType === 'DELETION' && <Text style={styles.small}>Pay and contract records are kept for 7 years by law; everything else is deleted.</Text>}
                  <GradientBtn
                    size="sm"
                    disabled={saving || (reqType === 'RECTIFICATION' && reqText.trim().length < 5)}
                    onPress={() => act(() => post('/me/data-requests', { type: reqType, details: reqText.trim() || undefined }), 'Request sent. We respond within 30 days.').then(() => { setReqType(null); setReqText(''); })}
                  >
                    Send request
                  </GradientBtn>
                </View>
              )}
              {(requests.data ?? []).map(r => (
                <Text key={r.id} style={styles.small}>
                  {r.type === 'DELETION' ? 'Deletion' : 'Correction'} · {day(r.createdAt)} · {r.status.toLowerCase()}{r.resolution ? ` — ${r.resolution}` : ''}
                </Text>
              ))}
            </Glass>

            <Text style={styles.groupLabel}>SUPPORT</Text>
            <Glass style={styles.group}>
              <Row label="Help & support" detail="support@klokd.co.ke" onPress={() => Linking.openURL('mailto:support@klokd.co.ke?subject=Klokd%20worker%20app')} />
              <Row label="Report a problem with a shift" detail="From the shift’s page" onPress={() => navigation.navigate('Shifts')} last />
            </Glass>

            <Text style={styles.groupLabel}>LEGAL</Text>
            <Glass style={styles.group}>
              <Row label="Terms of service" onPress={() => Linking.openURL('https://klokd.co.ke/#/terms')} />
              <Row label="Privacy policy" onPress={() => Linking.openURL('https://klokd.co.ke/#/privacy')} last />
            </Glass>

            <Glass style={[styles.group, { marginTop: 22 }]}>
              <Row label="Sign out" danger onPress={logout} last />
            </Glass>
          </>
        )}
        <View style={styles.about}>
          <Text style={styles.aboutName}>Klokd</Text>
          <Text style={styles.version}>Version {Constants.expoConfig?.version ?? '1.0.0'} · {versionLabel()}</Text>
          <Text style={styles.version}>© {new Date().getFullYear()} Klokd · Kirimon Market Ventures</Text>
        </View>
      </ScrollView>
    </View>
  );
}

// Which published update this phone is running — quote it when reporting a problem.
function versionLabel(): string {
  try {
    const id = Updates.updateId;
    return id ? `update ${id.slice(0, 8)}` : 'development build';
  } catch {
    return 'update unknown';
  }
}

// iOS-style grouped list row.
function Row({ label, detail, onPress, danger, last }: { label: string; detail?: string; onPress: () => void; danger?: boolean; last?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, !last && styles.rowLine, pressed && { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
      <Text style={[styles.rowLabel, danger && { color: colors.error, textAlign: 'center', flex: 1 }]}>{label}</Text>
      {!danger && (
        <View style={styles.rowRight}>
          {detail ? <Text style={styles.rowDetail} numberOfLines={1}>{detail}</Text> : null}
          <Text style={styles.chev}>›</Text>
        </View>
      )}
    </Pressable>
  );
}

function Toggle({ title, detail, value, onChange }: { title: string; detail: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.toggle}>
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleH}>{title}</Text>
        <Text style={styles.small}>{detail}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.electric, false: colors.white15 }} thumbColor={value ? colors.ink : colors.white} />
    </View>
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
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  edit: { color: colors.electric, fontSize: 15, fontWeight: '700' },
  groupLabel: { color: colors.white45, fontSize: 12, fontWeight: '700', letterSpacing: 0.6, marginTop: 22, marginBottom: 8, marginLeft: 16 },
  group: { borderRadius: 16, paddingVertical: 0, paddingHorizontal: 0 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 50, paddingHorizontal: 16 },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.12)' },
  rowLabel: { color: colors.white, fontSize: 16 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1, marginLeft: 12 },
  rowDetail: { color: colors.white45, fontSize: 14, flexShrink: 1 },
  chev: { color: colors.white35, fontSize: 22, marginTop: -2 },
  about: { alignItems: 'center', marginTop: 28, gap: 3 },
  aboutName: { color: colors.white60, fontSize: 13, fontWeight: '800' },
  version: { color: colors.white35, fontSize: 11.5, textAlign: 'center' },
  screen: { flex: 1, backgroundColor: colors.ink },
  h1: { fontSize: 26, fontWeight: '900', color: colors.white, letterSpacing: -0.9, marginTop: 8 },
  meta: { fontSize: 12.5, color: colors.white60, marginTop: 4 },
  err: { color: colors.warning, marginTop: 20 },
  msg: { fontSize: 13, fontWeight: '700', marginTop: 12 },
  card: { marginTop: 16, padding: 16, borderRadius: 18, gap: 8 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stats: { flexDirection: 'row', marginTop: 6 },
  statK: { fontSize: 18, fontWeight: '900', color: colors.white },
  statL: { fontSize: 10.5, color: colors.white55, marginTop: 2 },
  p: { fontSize: 12.5, color: colors.white65, lineHeight: 18 },
  small: { fontSize: 11.5, color: colors.white55, lineHeight: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 4 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  toggleH: { fontSize: 14, fontWeight: '800', color: colors.white },
  link: { color: colors.electric, fontSize: 13.5, fontWeight: '800', paddingVertical: 6 },
  input: { minHeight: 60, borderWidth: 1, borderColor: colors.white12, borderRadius: 12, padding: 12, color: colors.white, fontSize: 14, backgroundColor: colors.ink },
  signOut: { marginTop: 24, padding: 14, alignItems: 'center', borderRadius: 14, borderWidth: 1, borderColor: colors.white12 },
  signOutText: { color: colors.white75, fontWeight: '800', fontSize: 14 },
});
