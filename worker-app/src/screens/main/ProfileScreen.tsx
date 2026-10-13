/**
 * Me — the worker's account, iOS grouped style.
 *
 *   GET  /me/worker              profile, verification, skills, consent, reputation
 *   PUT  /me/worker/skills       replace skills
 *   POST /me/consent             identity / location consent (audited)
 *   PUT  /identity/workers/profile   name (only before ID verification)
 *   GET  /me/data                download everything Klokd holds
 *   GET/POST /me/data-requests   corrections and deletion (30-day replies)
 *
 * Once ID-verified the name comes from the ID check, so changing it is a
 * correction request that staff apply from the console.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Share, Switch, TextInput, Linking, Pressable } from 'react-native';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientBtn } from '../../components/Primitives';
import { AmbientOrbs, SafeTop, Glass } from '../../components/KlokdLayout';
import { useData } from '../../hooks/useData';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme';
import { day } from '../../lib/format';
import type { WorkerMe } from './HomeScreen';
import { useTabBarSpace } from '../../components/KlokdTabBar';

type Props = { navigation: NativeStackNavigationProp<any> };
type Sheet = null | 'name' | 'nameCorrection' | 'correction' | 'deletion';

const SKILLS = ['Waiter', 'Barista', 'Bartender', 'Chef', 'Kitchen hand', 'Cashier', 'Cleaner', 'Security', 'Receptionist', 'Usher', 'Stock / warehouse', 'Events'];

const initials = (f: string, l: string) => `${(f || '?').trim()[0] ?? ''}${l && l !== '—' ? l.trim()[0] : ''}`.toUpperCase();

function versionLabel(): string {
  try {
    const id = Updates.updateId;
    return id ? `update ${id.slice(0, 8)}` : 'development build';
  } catch {
    return 'update unknown';
  }
}

export function ProfileScreen({ navigation }: Props) {
  const tabSpace = useTabBarSpace();
  const me = useData<WorkerMe>('/me/worker');
  const requests = useData<{ id: string; type: string; status: string; resolution: string | null; createdAt: string }[]>('/me/data-requests');
  const { put, post, get } = useApi();
  const { logout } = useAuth();
  const [skills, setSkills] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (me.data) setSkills(me.data.skills);
  }, [me.data]);

  const m = me.data;
  const verified = m?.verificationStatus === 'APPROVED';
  // An old onboarding build saved everyone as "User Name"; let them fix it.
  const placeholderName = m?.firstName === 'User' && m?.lastName === 'Name';
  const canEditName = !verified || placeholderName;
  const dirty = !!m && skills.slice().sort().join() !== m.skills.slice().sort().join();

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    setSaving(true);
    setMsg(null);
    try {
      await fn();
      setMsg({ ok: true, text: ok });
      setSheet(null);
      setNote('');
      await Promise.all([me.reload(), requests.reload()]);
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message ?? 'Something went wrong.' });
    }
    setSaving(false);
  };

  const openName = (kind: 'name' | 'nameCorrection') => {
    if (!m) return;
    setFirst(m.firstName);
    setLast(m.lastName === '—' ? '' : m.lastName);
    setMsg(null);
    setSheet(kind);
  };

  const shareData = async () => {
    try {
      const data = await get('/me/data');
      await Share.share({ title: 'My Klokd data', message: JSON.stringify(data, null, 2) });
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message ?? 'Couldn’t export your data.' });
    }
  };

  const nameOk = first.trim().length >= 2 && last.trim().length >= 2;

  return (
    <View style={styles.screen}>
      <AmbientOrbs intensity="subtle" />
      <SafeTop />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: tabSpace }}>
        <Text style={styles.largeTitle}>Me</Text>

        {me.status === 'loading' && <ActivityIndicator color={colors.electric} style={{ marginTop: 40 }} />}
        {me.status === 'error' && (
          <>
            <Text style={styles.err}>{me.error}</Text>
            <Glass style={[styles.group, { marginTop: 16 }]}>
              <Row label="Sign out" danger onPress={logout} last />
            </Glass>
          </>
        )}

        {m && (
          <>
            {/* ── Profile ─────────────────────────────── */}
            <Glass style={styles.profile}>
              <LinearGradient colors={[colors.electric, colors.volt]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatarRing}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials(m.firstName, m.lastName)}</Text>
                </View>
              </LinearGradient>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.name} numberOfLines={1}>{m.firstName} {m.lastName === '—' ? '' : m.lastName}</Text>
                <View style={styles.badgeRow}>
                  <View style={[styles.badge, verified ? styles.badgeOk : styles.badgeTodo]}>
                    <Text style={[styles.badgeText, { color: verified ? colors.electric : colors.warning }]}>{verified ? '✓ ID verified' : 'Not verified'}</Text>
                  </View>
                  <Text style={styles.since}>Since {new Date(m.memberSince).toLocaleDateString('en-KE', { month: 'short', year: 'numeric' })}</Text>
                </View>
                <TouchableOpacity onPress={() => openName(canEditName ? 'name' : 'nameCorrection')} hitSlop={8} style={{ alignSelf: 'flex-start' }}>
                  <Text style={[styles.nameLink, placeholderName && { color: colors.electric }]}>
                    {placeholderName ? 'Add your real name' : canEditName ? 'Edit name' : 'Name wrong? Ask for a correction'}
                  </Text>
                </TouchableOpacity>
              </View>
            </Glass>

            {msg && <Text style={[styles.msg, { color: msg.ok ? colors.electric : colors.warning }]}>{msg.text}</Text>}

            {(sheet === 'name' || sheet === 'nameCorrection') && (
              <Glass style={styles.sheet}>
                <Text style={styles.sheetTitle}>{sheet === 'name' ? 'Your name' : 'Correct your name'}</Text>
                <Text style={styles.sheetSub}>
                  {sheet === 'name'
                    ? 'Use your name as it appears on your National ID.'
                    : 'Your name comes from your ID check, so Klokd staff make the change. You’ll get a reply within 30 days, usually much sooner.'}
                </Text>
                <TextInput value={first} onChangeText={setFirst} placeholder="First name" placeholderTextColor={colors.white35} autoCapitalize="words" style={styles.input} />
                <TextInput value={last} onChangeText={setLast} placeholder="Last name" placeholderTextColor={colors.white35} autoCapitalize="words" style={styles.input} />
                <View style={styles.sheetActions}>
                  <View style={{ flex: 1 }}>
                    <GradientBtn
                      size="sm"
                      disabled={saving || !nameOk}
                      onPress={() =>
                        sheet === 'name'
                          ? act(() => put('/identity/workers/profile', { firstName: first.trim(), lastName: last.trim() }), 'Name saved.')
                          : act(
                              () => post('/me/data-requests', { type: 'RECTIFICATION', details: `Name correction: please change my name to ${first.trim()} ${last.trim()}.` }),
                              'Correction requested. We’ll let you know when it’s done.'
                            )
                      }
                    >
                      {sheet === 'name' ? 'Save' : 'Send request'}
                    </GradientBtn>
                  </View>
                  <TouchableOpacity onPress={() => setSheet(null)} style={styles.cancel}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
                </View>
              </Glass>
            )}

            {/* ── Reputation ──────────────────────────── */}
            <View style={styles.tiles}>
              <Tile k={String(m.completedShifts)} l="Shifts done" />
              <Tile k={m.showUpRate != null ? `${Math.round(m.showUpRate)}%` : '—'} l="Show-up" />
              <Tile k={m.rating != null ? `★ ${m.rating.toFixed(1)}` : '—'} l={m.ratingCount === 1 ? '1 review' : `${m.ratingCount} reviews`} />
            </View>
            <Text style={styles.footnote}>Your rating shows to businesses after 3 reviews.</Text>

            {!verified && (
              <Glass style={styles.verify} tone="electric">
                <Text style={styles.verifyH}>Verify your ID to apply for shifts</Text>
                <Text style={styles.verifyP}>Businesses only pick verified workers. It takes about a minute.</Text>
                <GradientBtn size="sm" onPress={() => navigation.navigate('VerifyIDMain', { fromMain: true })}>Verify my ID</GradientBtn>
              </Glass>
            )}

            {/* ── Skills ──────────────────────────────── */}
            <Text style={styles.groupLabel}>SKILLS</Text>
            <Glass style={styles.skills}>
              <View style={styles.chips}>
                {[...new Set([...SKILLS, ...m.skills])].map(k => {
                  const on = skills.includes(k);
                  return (
                    <Pressable
                      key={k}
                      onPress={() => setSkills(s => (s.includes(k) ? s.filter(x => x !== k) : [...s, k]))}
                      style={[styles.chip, on && styles.chipOn]}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                    >
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>{on ? `✓ ${k}` : k}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {dirty && (
                <View style={{ marginTop: 12 }}>
                  <GradientBtn size="sm" disabled={saving} onPress={() => act(() => put('/me/worker/skills', { skills }), 'Skills saved.')}>Save skills</GradientBtn>
                </View>
              )}
            </Glass>
            <Text style={styles.footnote}>Businesses see these when you apply.</Text>

            {/* ── Privacy ─────────────────────────────── */}
            <Text style={styles.groupLabel}>PRIVACY</Text>
            <Glass style={styles.group}>
              <SwitchRow
                title="Identity checks"
                detail="Lets Identiti check your ID with the government register."
                value={m.consent.identity}
                onChange={v => act(() => post('/me/consent', { identity: v, location: m.consent.location }), 'Consent updated.')}
              />
              <SwitchRow
                title="Location at check-in"
                detail="Read once when you tap “I’ve arrived” and “Clock out”. Never in between."
                value={m.consent.location}
                onChange={v => act(() => post('/me/consent', { identity: m.consent.identity, location: v }), 'Consent updated.')}
                last
              />
            </Glass>

            {/* ── Your data ───────────────────────────── */}
            <Text style={styles.groupLabel}>YOUR DATA</Text>
            <Glass style={styles.group}>
              <Row label="Download my data" onPress={shareData} />
              <Row label="Ask for a correction" onPress={() => { setNote(''); setSheet('correction'); }} />
              <Row label="Delete my account" warn onPress={() => { setNote(''); setSheet('deletion'); }} last />
            </Glass>
            {(sheet === 'correction' || sheet === 'deletion') && (
              <Glass style={styles.sheet}>
                <Text style={styles.sheetTitle}>{sheet === 'deletion' ? 'Delete my account' : 'Ask for a correction'}</Text>
                <Text style={styles.sheetSub}>
                  {sheet === 'deletion'
                    ? 'Pay and contract records are kept for 7 years by law. Everything else is deleted.'
                    : 'Tell us what’s wrong and what it should say.'}
                </Text>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder={sheet === 'deletion' ? 'Anything we should know? (optional)' : 'What should we correct?'}
                  placeholderTextColor={colors.white35}
                  multiline
                  style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
                />
                <View style={styles.sheetActions}>
                  <View style={{ flex: 1 }}>
                    <GradientBtn
                      size="sm"
                      disabled={saving || (sheet === 'correction' && note.trim().length < 5)}
                      onPress={() =>
                        act(
                          () => post('/me/data-requests', { type: sheet === 'deletion' ? 'DELETION' : 'RECTIFICATION', details: note.trim() || undefined }),
                          'Request sent. We reply within 30 days.'
                        )
                      }
                    >
                      Send request
                    </GradientBtn>
                  </View>
                  <TouchableOpacity onPress={() => setSheet(null)} style={styles.cancel}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
                </View>
              </Glass>
            )}
            {(requests.data ?? []).length > 0 && (
              <View style={{ marginTop: 8, gap: 4, paddingHorizontal: 16 }}>
                {(requests.data ?? []).map(r => (
                  <Text key={r.id} style={styles.footnoteLeft}>
                    {r.type === 'DELETION' ? 'Deletion' : 'Correction'} · {day(r.createdAt)} · {r.status.toLowerCase()}{r.resolution ? ` — ${r.resolution}` : ''}
                  </Text>
                ))}
              </View>
            )}

            {/* ── Support, legal, sign out ───────────── */}
            <Text style={styles.groupLabel}>SUPPORT</Text>
            <Glass style={styles.group}>
              <Row label="Help & support" detail="support@klokd.co.ke" onPress={() => Linking.openURL('mailto:support@klokd.co.ke?subject=Klokd%20worker%20app')} />
              <Row label="Report a problem with a shift" detail="From the shift" onPress={() => navigation.navigate('Shifts')} last />
            </Glass>

            <Text style={styles.groupLabel}>LEGAL</Text>
            <Glass style={styles.group}>
              <Row label="Terms of service" onPress={() => Linking.openURL('https://klokd.co.ke/#/terms')} />
              <Row label="Privacy policy" onPress={() => Linking.openURL('https://klokd.co.ke/#/privacy')} last />
            </Glass>

            <Glass style={[styles.group, { marginTop: 24 }]}>
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

function Tile({ k, l }: { k: string; l: string }) {
  return (
    <Glass style={styles.tile}>
      <Text style={styles.tileK}>{k}</Text>
      <Text style={styles.tileL}>{l}</Text>
    </Glass>
  );
}

function Row({ label, detail, onPress, danger, warn, last }: { label: string; detail?: string; onPress: () => void; danger?: boolean; warn?: boolean; last?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, !last && styles.rowLine, pressed && { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
      <Text style={[styles.rowLabel, warn && { color: colors.warning }, danger && styles.rowDanger]}>{label}</Text>
      {!danger && (
        <View style={styles.rowRight}>
          {detail ? <Text style={styles.rowDetail} numberOfLines={1}>{detail}</Text> : null}
          <Text style={styles.chev}>›</Text>
        </View>
      )}
    </Pressable>
  );
}

function SwitchRow({ title, detail, value, onChange, last }: { title: string; detail: string; value: boolean; onChange: (v: boolean) => void; last?: boolean }) {
  return (
    <View style={[styles.switchRow, !last && styles.rowLine]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{title}</Text>
        <Text style={styles.rowSub}>{detail}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.electric, false: 'rgba(120,120,128,0.32)' }} thumbColor="#FFFFFF" ios_backgroundColor="rgba(120,120,128,0.32)" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  largeTitle: { color: colors.white, fontSize: 34, fontWeight: '900', letterSpacing: -1.1, marginBottom: 14 },
  err: { color: colors.warning, marginTop: 20 },
  msg: { fontSize: 13.5, fontWeight: '700', marginTop: 12, marginHorizontal: 4 },

  profile: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 18, borderRadius: 24 },
  avatarRing: { width: 68, height: 68, borderRadius: 34, padding: 2.5 },
  avatar: { flex: 1, borderRadius: 32, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.white, fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  name: { color: colors.white, fontSize: 22, fontWeight: '900', letterSpacing: -0.6 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  badgeOk: { backgroundColor: 'rgba(0,229,160,0.14)' },
  badgeTodo: { backgroundColor: 'rgba(255,179,71,0.14)' },
  badgeText: { fontSize: 12, fontWeight: '800' },
  since: { color: colors.white50, fontSize: 12.5 },
  nameLink: { color: colors.white60, fontSize: 13, fontWeight: '600', marginTop: 8, textDecorationLine: 'underline' },

  sheet: { marginTop: 12, padding: 16, borderRadius: 20, gap: 10 },
  sheetTitle: { color: colors.white, fontSize: 17, fontWeight: '800' },
  sheetSub: { color: colors.white60, fontSize: 13, lineHeight: 18 },
  sheetActions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 2 },
  cancel: { paddingHorizontal: 8, paddingVertical: 10 },
  cancelText: { color: colors.white70, fontSize: 15, fontWeight: '600' },
  input: { borderWidth: StyleSheet.hairlineWidth * 2, borderColor: 'rgba(255,255,255,0.16)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: colors.white, fontSize: 16, backgroundColor: 'rgba(0,0,0,0.25)' },

  tiles: { flexDirection: 'row', gap: 10, marginTop: 14 },
  tile: { flex: 1, paddingVertical: 14, paddingHorizontal: 12, borderRadius: 18, alignItems: 'center' },
  tileK: { color: colors.white, fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  tileL: { color: colors.white55, fontSize: 12, marginTop: 3 },
  footnote: { color: colors.white45, fontSize: 12.5, marginTop: 8, marginHorizontal: 16 },
  footnoteLeft: { color: colors.white45, fontSize: 12.5 },

  verify: { marginTop: 16, padding: 16, borderRadius: 20, gap: 8 },
  verifyH: { color: colors.white, fontSize: 16, fontWeight: '800' },
  verifyP: { color: colors.white65, fontSize: 13, lineHeight: 18, marginBottom: 4 },

  groupLabel: { color: colors.white45, fontSize: 12, fontWeight: '700', letterSpacing: 0.6, marginTop: 26, marginBottom: 8, marginLeft: 16 },
  group: { borderRadius: 16 },
  skills: { padding: 14, borderRadius: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 13, height: 34, borderRadius: 17, justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: StyleSheet.hairlineWidth * 2, borderColor: 'rgba(255,255,255,0.12)' },
  chipOn: { backgroundColor: 'rgba(0,229,160,0.16)', borderColor: 'rgba(0,229,160,0.55)' },
  chipText: { color: colors.white75, fontSize: 14, fontWeight: '600' },
  chipTextOn: { color: colors.electric, fontWeight: '800' },

  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 50, paddingHorizontal: 16 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.12)' },
  rowLabel: { color: colors.white, fontSize: 16 },
  rowSub: { color: colors.white50, fontSize: 12.5, lineHeight: 17, marginTop: 2 },
  rowDanger: { color: colors.error, textAlign: 'center', flex: 1 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1, marginLeft: 12 },
  rowDetail: { color: colors.white45, fontSize: 14, flexShrink: 1 },
  chev: { color: colors.white35, fontSize: 22, marginTop: -2 },

  about: { alignItems: 'center', marginTop: 28, gap: 3 },
  aboutName: { color: colors.white60, fontSize: 13, fontWeight: '800' },
  version: { color: colors.white35, fontSize: 11.5, textAlign: 'center' },
});
