/**
 * Shift detail (employer) — one shift end to end. All real:
 *   GET  /shifts/:id                      details
 *   GET  /shifts/:id/applicants           pick from applicants (POSTED)
 *   POST /shifts/:id/confirm              select a worker
 *   GET  /attendance/shifts/:id           start PIN, check-in record, pay due
 *   POST /attendance/shifts/:id/employer-start | no-show | settlement/approve
 *   POST /shifts/:id/cancel · /disputes · /ratings
 *   GET  /shifts/:id/contract
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GradientBtn, IconBtn, StatusPill, Label, Chip } from '../../components/Primitives';
import { AmbientOrbs, SafeTop } from '../../components/KlokdLayout';
import { Icons } from '../../components/Icons';
import { useData } from '../../hooks/useData';
import { useApi } from '../../hooks/useApi';
import { colors, typography } from '../../theme';
import { kes, day, time, hm } from '../../lib/format';
import { SHIFT_PILL } from '../main/ShiftsScreen';

type Props = { navigation: NativeStackNavigationProp<any>; route: { params?: { id?: string } } };

interface ShiftInfo {
  id: string;
  role: string;
  description: string | null;
  startTime: string;
  endTime: string;
  rateKes: number;
  locationName: string | null;
  status: string;
  worker: { firstName: string; lastName: string } | null;
}
interface Applicant {
  applicationId: string;
  worker: { id: string; firstName: string; lastName: string; showUpRate: number | null; ratingAggregate: number | null; totalShifts: number; skills: string[]; verificationStatus: string; showRating: boolean };
}
interface Attendance {
  status: string;
  pin: string | null;
  pinLocked: boolean;
  noShow: boolean;
  late: boolean;
  summary: { arrivedAt: string | null; startedAt: string | null; clockedOutAt: string | null };
  events: { id: string; type: string; at: string; distanceM: number | null; flags: string[] }[];
  settlement: { status: string; workedMinutes: number; scheduledMinutes: number; grossKes: number; netKes: number; platformFeeKes: number; employerTotalKes: number; approveBy: string } | null;
  overrideReasons: string[];
}

const REASON: Record<string, string> = { GPS_FAILED: 'GPS won’t work here', PIN_LOCKED: 'PIN locked', WORKER_PHONE_ISSUE: 'Their phone is dead', OTHER: 'Something else' };
const EVENT: Record<string, string> = { ARRIVED: 'Arrived', STARTED: 'Started with your PIN', OVERRIDE_START: 'You started the shift', PIN_LOCKED: 'PIN locked', CLOCKED_OUT: 'Finished', LATE_WARNING: 'Running late', NO_SHOW: 'Didn’t show up', NO_SHOW_RESOLVED: 'No-show resolved' };

export function ShiftDetailScreen({ navigation, route }: Props) {
  const id = route.params?.id ?? null;
  const shift = useData<ShiftInfo>(id ? `/shifts/${id}` : null, { pollMs: 20_000 });
  const posted = shift.data?.status === 'POSTED';
  const applicants = useData<Applicant[]>(posted ? `/shifts/${id}/applicants` : null);
  const att = useData<Attendance>(shift.data && !posted && shift.data.worker ? `/attendance/shifts/${id}` : null, { pollMs: 15_000 });
  const pending = useData<{ shiftId: string }[]>('/me/ratings/pending');
  const { post, get } = useApi();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [reason, setReason] = useState('GPS_FAILED');
  const [note, setNote] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [stars, setStars] = useState(0);
  const [rated, setRated] = useState(false);
  const [contract, setContract] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [picking, setPicking] = useState<string | null>(null);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      setMsg({ ok: true, text: ok });
      await Promise.all([shift.reload(), applicants.reload(), att.reload(), pending.reload()]);
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message ?? 'Something went wrong.' });
    }
    setBusy(false);
  };

  if (!id) return null;
  const s = shift.data;
  const a = att.data;
  const pill = s ? SHIFT_PILL[s.status] ?? { label: s.status, tone: 'neutral' as const } : null;
  const workerName = s?.worker ? `${s.worker.firstName} ${s.worker.lastName.charAt(0)}.` : '';

  return (
    <View style={styles.screen}>
      <AmbientOrbs intensity="subtle" />
      <SafeTop />
      <View style={styles.header}>
        <IconBtn onPress={() => navigation.goBack()}>
          <Icons.back color={colors.white} size={14} />
        </IconBtn>
        {pill && <StatusPill tone={pill.tone}>{pill.label}</StatusPill>}
        <View style={{ width: 38 }} />
      </View>
      {shift.status === 'loading' && <ActivityIndicator color={colors.volt} style={{ marginTop: 60 }} />}
      {shift.status === 'error' && <Text style={[styles.err, { padding: 20 }]}>{shift.error}</Text>}
      {s && (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 14 }}>
          <View>
            <Text style={styles.h1}>{s.role}</Text>
            <Text style={styles.meta}>{day(s.startTime)} · {time(s.startTime)}–{time(s.endTime)} · {s.locationName ?? 'Nairobi'} · {kes(s.rateKes)}</Text>
            {s.description ? <Text style={styles.notes}>{s.description}</Text> : null}
          </View>
          {msg && <Text style={[styles.msg, { color: msg.ok ? colors.volt : colors.warning }]}>{msg.text}</Text>}

          {posted && (
            <View style={styles.block}>
              <Label color={colors.white60}>Applicants · {applicants.data?.length ?? 0}</Label>
              {applicants.status === 'loading' && <ActivityIndicator color={colors.volt} />}
              {applicants.data?.length === 0 && <Text style={styles.p}>No applicants yet. Verified workers nearby can see this shift now.</Text>}
              {(applicants.data ?? []).map(({ applicationId, worker: w }) => (
                <View key={applicationId} style={styles.applicant}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{w.firstName} {w.lastName}</Text>
                    <Text style={styles.small}>
                      {[w.verificationStatus === 'APPROVED' ? 'ID verified' : null, `${w.totalShifts} shifts`, w.showRating && w.ratingAggregate != null ? `★ ${w.ratingAggregate.toFixed(1)}` : 'new', w.showUpRate != null ? `${Math.round(w.showUpRate)}% show-up` : null].filter(Boolean).join(' · ')}
                    </Text>
                    {w.skills.length > 0 && <Text style={styles.small}>{w.skills.join(', ')}</Text>}
                  </View>
                  {picking === w.id ? (
                    <GradientBtn size="sm" disabled={busy} onPress={() => run(() => post(`/shifts/${id}/confirm`, { workerId: w.id }), `${w.firstName} picked. They’ll confirm in the app.`)}>Confirm</GradientBtn>
                  ) : (
                    <TouchableOpacity onPress={() => setPicking(w.id)} style={styles.pick}><Text style={styles.pickText}>Pick</Text></TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          )}

          {a?.noShow && (
            <View style={[styles.block, styles.alert]}>
              <Text style={styles.blockH}>{workerName} hasn’t shown up</Text>
              <Text style={styles.p}>Wait longer, reopen the shift for your other applicants, or cancel it.</Text>
              <View style={styles.row}>
                <Btn label="Keep waiting" onPress={() => run(() => post(`/attendance/shifts/${id}/no-show`, { action: 'wait' }), 'Okay — we’ll keep the shift with them.')} />
                <Btn label="Find a replacement" strong onPress={() => run(() => post(`/attendance/shifts/${id}/no-show`, { action: 'replace' }), 'Reopened. Pick someone from your applicants.')} />
                <Btn label="Cancel shift" danger onPress={() => run(() => post(`/attendance/shifts/${id}/no-show`, { action: 'cancel' }), 'Shift cancelled.')} />
              </View>
            </View>
          )}
          {a?.late && !a.noShow && <Text style={styles.lateNote}>{workerName} is running late. We’ve reminded them.</Text>}

          {a?.pin && (
            <View style={[styles.block, styles.pinBlock]}>
              <Label color={colors.volt}>Start PIN</Label>
              <Text style={styles.pin}>{a.pin}</Text>
              <Text style={styles.p}>
                {a.summary.arrivedAt ? `${workerName} is here (since ${time(a.summary.arrivedAt)}). Give them this PIN to start.` : `When ${workerName} arrives, give them this PIN to start the shift.`}
              </Text>
              {a.pinLocked && <Text style={styles.err}>The PIN is locked after too many wrong tries. Start the shift yourself below.</Text>}
              {s.status === 'ACCEPTED' && (overrideOpen ? (
                <View style={{ gap: 8 }}>
                  <View style={styles.chips}>
                    {a.overrideReasons.map(r => <Chip key={r} active={reason === r} color={colors.volt} onPress={() => setReason(r)}>{REASON[r] ?? r}</Chip>)}
                  </View>
                  <TextInput value={note} onChangeText={setNote} placeholder={reason === 'OTHER' ? 'What happened?' : 'Note (optional)'} placeholderTextColor={colors.white35} style={styles.input} />
                  <Text style={styles.small}>Starting a shift yourself is logged and reviewed by Klokd. Only do it when {workerName} is with you.</Text>
                  <GradientBtn size="sm" disabled={busy} onPress={() => run(() => post(`/attendance/shifts/${id}/employer-start`, { reason, note: note.trim() || undefined }), 'Shift started.')}>{workerName} is here · start</GradientBtn>
                </View>
              ) : (
                <TouchableOpacity onPress={() => setOverrideOpen(true)}><Text style={styles.link}>Start without PIN</Text></TouchableOpacity>
              ))}
            </View>
          )}

          {s.status === 'ACTIVE' && a?.summary.startedAt && (
            <View style={styles.block}>
              <Text style={styles.blockH}>{workerName} is on shift</Text>
              <Text style={styles.p}>Started at {time(a.summary.startedAt)}. You’ll see it here when they finish.</Text>
            </View>
          )}

          {a?.settlement && (
            <View style={styles.block}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={styles.blockH}>Pay</Text>
                <StatusPill tone={a.settlement.status === 'AWAITING_APPROVAL' ? 'warn' : a.settlement.status === 'DISPUTED' ? 'err' : 'mint'}>
                  {a.settlement.status === 'AWAITING_APPROVAL' ? 'Needs your check' : a.settlement.status.toLowerCase()}
                </StatusPill>
              </View>
              <Line k="Hours worked" v={`${hm(a.settlement.workedMinutes)} of ${hm(a.settlement.scheduledMinutes)}`} />
              <Line k="Shift pay" v={kes(a.settlement.grossKes)} />
              <Line k={`${s.worker?.firstName ?? 'Worker'} receives`} v={kes(a.settlement.netKes)} />
              <Line k="Klokd fee" v={kes(a.settlement.platformFeeKes)} />
              <Line k="Your total" v={kes(a.settlement.employerTotalKes)} strong />
              {a.settlement.status === 'AWAITING_APPROVAL' && (
                <>
                  <Text style={styles.small}>Approves automatically at {time(a.settlement.approveBy)} unless you report a problem.</Text>
                  <GradientBtn size="sm" disabled={busy} onPress={() => run(() => post(`/attendance/shifts/${id}/settlement/approve`), 'Pay approved.')}>Approve pay</GradientBtn>
                  {problem === null ? (
                    <TouchableOpacity onPress={() => setProblem('')}><Text style={[styles.link, { color: colors.warning }]}>Report a problem</Text></TouchableOpacity>
                  ) : (
                    <View style={{ gap: 8 }}>
                      <TextInput value={problem} onChangeText={setProblem} multiline placeholder="What went wrong?" placeholderTextColor={colors.white35} style={[styles.input, { minHeight: 70 }]} />
                      <GradientBtn size="sm" disabled={busy || problem.trim().length < 10} onPress={() => run(() => post('/disputes', { shiftId: id, type: 'INCOMPLETE_SHIFT', description: problem.trim() }), 'Sent to Klokd. Pay is paused while we look into it.')}>Send to Klokd</GradientBtn>
                    </View>
                  )}
                </>
              )}
              {a.settlement.status === 'APPROVED' && <Text style={styles.small}>Approved. The M-Pesa payout goes out once Klokd payments (Kipkiren Pay) are live.</Text>}
            </View>
          )}

          {!rated && (pending.data ?? []).some(p => p.shiftId === id) && (
            <View style={styles.block}>
              <Text style={styles.blockH}>Rate {workerName}</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <TouchableOpacity key={n} onPress={() => setStars(n)}><Text style={{ fontSize: 30, color: n <= stars ? colors.volt : colors.white25 }}>★</Text></TouchableOpacity>
                ))}
              </View>
              <GradientBtn size="sm" disabled={!stars || busy} onPress={() => run(() => post('/ratings', { shiftId: id, stars }), 'Rating sent.').then(() => setRated(true))}>Send rating</GradientBtn>
            </View>
          )}

          {a?.events && a.events.length > 0 && (
            <View style={styles.block}>
              <Label color={colors.white60}>Timeline</Label>
              {a.events.map(e => (
                <View key={e.id} style={styles.event}>
                  <Text style={styles.eventAt}>{time(e.at)}</Text>
                  <Text style={styles.eventT}>{EVENT[e.type] ?? e.type}{e.distanceM != null ? ` · ${e.distanceM} m away` : ''}</Text>
                </View>
              ))}
            </View>
          )}

          {s.worker && (
            <View style={styles.block}>
              {contract ? <Text style={styles.contract}>{contract}</Text> : (
                <TouchableOpacity onPress={async () => { try { setContract((await get<{ body: string }>(`/shifts/${id}/contract`)).body); } catch (e: any) { setMsg({ ok: false, text: e?.message }); } }}>
                  <Text style={styles.link}>Read the written particulars (contract)</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {['POSTED', 'CONFIRMED', 'ACCEPTED'].includes(s.status) && (
            <TouchableOpacity disabled={busy} onPress={() => (confirmCancel ? run(() => post(`/shifts/${id}/cancel`), 'Shift cancelled.') : setConfirmCancel(true))} style={{ padding: 12 }}>
              <Text style={[styles.link, { color: colors.error }]}>{confirmCancel ? 'Tap again to cancel this shift' : 'Cancel this shift'}</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function Btn({ label, onPress, strong, danger }: { label: string; onPress: () => void; strong?: boolean; danger?: boolean }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.btn, strong && { backgroundColor: colors.volt, borderColor: colors.volt }, danger && { borderColor: 'rgba(255,107,107,0.4)' }]}>
      <Text style={[styles.btnText, strong && { color: colors.ink }, danger && { color: colors.error }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Line({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <View style={styles.line}>
      <Text style={styles.lineK}>{k}</Text>
      <Text style={[styles.lineV, strong && { fontWeight: '900', color: colors.volt }]}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  header: { paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  h1: { fontSize: 28, fontWeight: '900', color: colors.white, letterSpacing: -0.9 },
  meta: { fontSize: 13, color: colors.white65, marginTop: 6, lineHeight: 19 },
  notes: { fontSize: 13, color: colors.white75, marginTop: 8, lineHeight: 19 },
  msg: { fontSize: 13, fontWeight: '700' },
  err: { color: colors.warning, fontSize: 13 },
  block: { padding: 16, borderRadius: 18, backgroundColor: colors.white03, borderWidth: 1, borderColor: colors.white08, gap: 10 },
  alert: { backgroundColor: 'rgba(255,107,107,0.06)', borderColor: 'rgba(255,107,107,0.25)' },
  pinBlock: { backgroundColor: colors.voltAlpha['07'], borderColor: colors.voltAlpha['25'] },
  blockH: { fontSize: 16, fontWeight: '900', color: colors.white },
  p: { fontSize: 12.5, color: colors.white65, lineHeight: 18 },
  small: { fontSize: 11.5, color: colors.white55, lineHeight: 16 },
  applicant: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.white06 },
  name: { fontSize: 14.5, fontWeight: '800', color: colors.white },
  pick: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: colors.voltAlpha['25'] },
  pickText: { color: colors.volt, fontWeight: '800' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btn: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: colors.white15 },
  btnText: { color: colors.white, fontWeight: '800', fontSize: 12.5 },
  lateNote: { color: colors.warning, fontSize: 13, fontWeight: '700' },
  pin: { fontSize: 44, fontWeight: '900', color: colors.volt, letterSpacing: 12, fontFamily: typography.mono },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  input: { borderWidth: 1, borderColor: colors.white12, borderRadius: 12, padding: 12, color: colors.white, fontSize: 14, backgroundColor: colors.ink },
  link: { color: colors.volt, fontWeight: '800', fontSize: 13.5, textAlign: 'center' },
  line: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: colors.white06 },
  lineK: { color: colors.white65, fontSize: 13 },
  lineV: { color: colors.white, fontSize: 13, fontWeight: '700' },
  event: { flexDirection: 'row', gap: 10 },
  eventAt: { color: colors.white55, fontSize: 12, fontFamily: typography.mono, width: 44 },
  eventT: { color: colors.white85, fontSize: 13 },
  contract: { color: colors.white75, fontSize: 11.5, lineHeight: 17, fontFamily: typography.mono },
});
