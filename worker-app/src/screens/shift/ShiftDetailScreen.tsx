/**
 * Shift detail — one shift, from applying to rating it. All real:
 *   GET  /shifts/:id                  details + your application state
 *   GET  /attendance/shifts/:id       your check-in record + pay (once assigned)
 *   GET  /shifts/:id/contract         written particulars (s.9)
 *   POST /shifts/:id/apply|withdraw|accept|decline|worker-cancel
 *   POST /ratings                     rate the venue after the shift
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GradientBtn, IconBtn, StatusPill, Label } from '../../components/Primitives';
import { AmbientOrbs, SafeTop } from '../../components/KlokdLayout';
import { Icons } from '../../components/Icons';
import { useData } from '../../hooks/useData';
import { useApi } from '../../hooks/useApi';
import { colors, typography } from '../../theme';
import { kes, day, time, hm } from '../../lib/format';

type Props = { navigation: NativeStackNavigationProp<any>; route: { params?: { id?: string; shift?: { id: string } } } };

interface ShiftInfo {
  id: string;
  role: string;
  description: string | null;
  startTime: string;
  endTime: string;
  rateKes: number;
  locationName: string | null;
  status: string;
  workerId: string | null;
  directOffer: boolean;
  myApplication: string | null;
  employer: { businessName: string; ratingAggregate: number | null; totalShifts: number };
}

interface Attendance {
  shift: { status: string; arrivedAt: string | null; clockInAt: string | null };
  settlement: { status: string; grossKes: number; netKes: number; deductionsKes: number; approveBy: string; workedMinutes: number } | null;
}

export function ShiftDetailScreen({ navigation, route }: Props) {
  const id = route.params?.id ?? route.params?.shift?.id ?? null;
  const shift = useData<ShiftInfo>(id ? `/shifts/${id}` : null);
  const assigned = !!shift.data && shift.data.status !== 'POSTED' && !!shift.data.workerId;
  const att = useData<Attendance>(assigned ? `/attendance/shifts/${id}` : null);
  const pending = useData<{ shiftId: string }[]>('/me/ratings/pending');
  const { post } = useApi();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [contract, setContract] = useState<string | null>(null);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [rated, setRated] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const { get } = useApi();

  const run = async (fn: () => Promise<unknown>, ok: string, after?: () => void) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      setMsg({ ok: true, text: ok });
      await Promise.all([shift.reload(), att.reload(), pending.reload()]);
      after?.();
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message ?? 'Something went wrong.' });
    }
    setBusy(false);
  };

  const loadContract = async () => {
    try {
      const c = await get<{ body: string }>(`/shifts/${id}/contract`);
      setContract(c.body);
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message ?? 'Couldn’t load the contract.' });
    }
  };

  if (!id) return null;
  const s = shift.data;
  const status = att.data?.shift.status ?? s?.status;
  const settlement = att.data?.settlement;
  const needsRating = !rated && (pending.data ?? []).some(p => p.shiftId === id);

  return (
    <View style={styles.screen}>
      <AmbientOrbs intensity="subtle" />
      <SafeTop />
      <View style={styles.header}>
        <IconBtn onPress={() => navigation.goBack()}>
          <Icons.back color={colors.white} size={14} />
        </IconBtn>
        {s && <StatusPill tone={status === 'CONFIRMED' ? 'warn' : status === 'CANCELLED' ? 'neutral' : 'mint'}>{label(status!)}</StatusPill>}
        <View style={{ width: 38 }} />
      </View>

      {shift.status === 'loading' && <ActivityIndicator color={colors.electric} style={{ marginTop: 60 }} />}
      {shift.status === 'error' && (
        <View style={styles.pad}>
          <Text style={styles.h1}>Couldn’t load this shift</Text>
          <Text style={styles.p}>{shift.error}</Text>
          <TouchableOpacity onPress={shift.reload}><Text style={styles.link}>Try again</Text></TouchableOpacity>
        </View>
      )}

      {s && (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
          <Label color={colors.electric}>{s.employer.businessName}</Label>
          <Text style={styles.h1}>{s.role}</Text>
          <Text style={styles.pay}>{kes(s.rateKes)}</Text>
          <View style={styles.facts}>
            <Fact icon={<Icons.calendar color={colors.white70} size={14} />} text={`${day(s.startTime)} · ${time(s.startTime)}–${time(s.endTime)}`} />
            <Fact icon={<Icons.pin color={colors.white70} size={14} />} text={s.locationName ?? 'Nairobi'} />
            {s.employer.ratingAggregate != null && <Fact icon={<Icons.star color={colors.volt} size={12} />} text={`${s.employer.ratingAggregate.toFixed(1)} venue rating · ${s.employer.totalShifts} shifts`} />}
          </View>
          {s.description ? <Text style={styles.notes}>{s.description}</Text> : null}

          {msg && <Text style={[styles.msg, { color: msg.ok ? colors.electric : colors.warning }]}>{msg.text}</Text>}

          {status === 'POSTED' && (
            <View style={styles.block}>
              {s.myApplication === 'PENDING' ? (
                <>
                  <Text style={styles.blockH}>You’ve applied</Text>
                  <Text style={styles.p}>The business picks from applicants. You’ll get a notification if it’s you.</Text>
                  <TouchableOpacity disabled={busy} onPress={() => run(() => post(`/shifts/${id}/withdraw`), 'Application withdrawn.')}>
                    <Text style={styles.link}>Withdraw my application</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.blockH}>Want this shift?</Text>
                  <Text style={styles.p}>Apply and the business can pick you. Pay goes to your M-Pesa after the shift.</Text>
                  <GradientBtn disabled={busy} onPress={() => run(() => post(`/shifts/${id}/apply`), 'Applied. We’ll let you know if you’re picked.')}>
                    {busy ? 'Applying…' : 'Apply for this shift'}
                  </GradientBtn>
                </>
              )}
            </View>
          )}

          {status === 'CONFIRMED' && (
            <View style={[styles.block, styles.blockHi]}>
              <Text style={styles.blockH}>{s.directOffer ? `${s.employer.businessName} wants you back` : 'You got the shift'}</Text>
              <Text style={styles.p}>Confirm so they know you’re coming. Confirming accepts the written particulars below.</Text>
              {contract ? <Text style={styles.contract}>{contract}</Text> : (
                <TouchableOpacity onPress={loadContract}><Text style={styles.link}>Read the contract</Text></TouchableOpacity>
              )}
              <View style={{ height: 12 }} />
              <GradientBtn disabled={busy} onPress={() => run(() => post(`/shifts/${id}/accept`), 'Confirmed. See you there.')}>I’ll be there</GradientBtn>
              <TouchableOpacity disabled={busy} onPress={() => run(() => post(`/shifts/${id}/decline`), 'Declined. It’s gone back to other workers.')} style={{ marginTop: 14 }}>
                <Text style={[styles.link, { color: colors.white70 }]}>Decline</Text>
              </TouchableOpacity>
            </View>
          )}

          {status === 'ACCEPTED' && (
            <View style={[styles.block, styles.blockHi]}>
              <Text style={styles.blockH}>{att.data?.shift.arrivedAt ? 'Checked in — get the start PIN' : 'You’re confirmed'}</Text>
              <Text style={styles.p}>Check in from an hour before the start, at the venue. The manager gives you a 4-digit PIN to start.</Text>
              <GradientBtn onPress={() => navigation.navigate('ClockIn', { shift: { id } })}>{att.data?.shift.arrivedAt ? 'Enter start PIN' : 'Check in at the venue'}</GradientBtn>
              {!att.data?.shift.arrivedAt && (
                <TouchableOpacity
                  disabled={busy}
                  style={{ marginTop: 14 }}
                  onPress={() => (confirmCancel ? run(() => post(`/shifts/${id}/worker-cancel`), 'Cancelled. The business has been told.') : setConfirmCancel(true))}
                >
                  <Text style={[styles.link, { color: colors.warning }]}>{confirmCancel ? 'Tap again to cancel my shift' : 'I can’t make it'}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {status === 'ACTIVE' && (
            <View style={[styles.block, styles.blockHi]}>
              <Text style={styles.blockH}>You’re on shift</Text>
              <GradientBtn onPress={() => navigation.navigate('ActiveShift', { shift: { id } })}>Open the shift timer</GradientBtn>
            </View>
          )}

          {settlement && (
            <View style={styles.block}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.blockH}>Your pay</Text>
                <StatusPill tone={settlement.status === 'DISPUTED' ? 'err' : settlement.status === 'AWAITING_APPROVAL' ? 'warn' : 'mint'}>
                  {settlement.status === 'AWAITING_APPROVAL' ? 'venue checking' : settlement.status.toLowerCase()}
                </StatusPill>
              </View>
              <Line k="Hours worked" v={hm(settlement.workedMinutes)} />
              <Line k="Shift pay" v={kes(settlement.grossKes)} />
              <Line k="Statutory deductions" v={`− ${kes(settlement.deductionsKes)}`} />
              <Line k="You receive" v={kes(settlement.netKes)} strong />
              <Text style={styles.small}>
                {settlement.status === 'AWAITING_APPROVAL' && `Approved automatically at ${time(settlement.approveBy)} unless the venue reports a problem.`}
                {settlement.status === 'APPROVED' && 'Approved. Sent to your M-Pesa once Klokd payments are live.'}
                {settlement.status === 'PAID' && 'Paid to your M-Pesa.'}
                {settlement.status === 'DISPUTED' && 'On hold while Klokd reviews a reported problem.'}
              </Text>
            </View>
          )}

          {needsRating && (
            <View style={styles.block}>
              <Text style={styles.blockH}>Rate {s.employer.businessName}</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginVertical: 10 }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <TouchableOpacity key={n} onPress={() => setStars(n)} accessibilityLabel={`${n} stars`}>
                    <Text style={{ fontSize: 32, color: n <= stars ? colors.volt : colors.white25 }}>★</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput value={comment} onChangeText={setComment} placeholder="Comment (optional)" placeholderTextColor={colors.white35} style={styles.input} multiline />
              <View style={{ height: 10 }} />
              <GradientBtn size="md" disabled={!stars || busy} onPress={() => run(() => post('/ratings', { shiftId: id, stars, comment: comment.trim() || undefined }), 'Thanks — your rating is in.', () => setRated(true))}>
                Send rating
              </GradientBtn>
            </View>
          )}

          {['ACTIVE', 'COMPLETED', 'PAID'].includes(status ?? '') && (
            <TouchableOpacity style={styles.dispute} onPress={() => navigation.navigate('ReportProblem', { id })}>
              <Icons.dispute color={colors.warning} size={13} />
              <Text style={styles.disputeText}>Something’s wrong with this shift</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function label(status: string) {
  return ({ POSTED: 'OPEN', CONFIRMED: 'NEEDS YOUR ANSWER', ACCEPTED: 'CONFIRMED', ACTIVE: 'ON SHIFT', COMPLETED: 'DONE', PAID: 'PAID', DISPUTED: 'UNDER REVIEW', CANCELLED: 'CANCELLED' } as Record<string, string>)[status] ?? status;
}

function Fact({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      {icon}
      <Text style={{ color: colors.white75, fontSize: 13 }}>{text}</Text>
    </View>
  );
}

function Line({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <View style={styles.line}>
      <Text style={styles.lineK}>{k}</Text>
      <Text style={[styles.lineV, strong && { color: colors.electric, fontWeight: '900' }]}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  header: { paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pad: { padding: 20 },
  h1: { fontSize: 28, fontWeight: '900', color: colors.white, letterSpacing: -0.9, marginTop: 6 },
  pay: { fontSize: 22, fontWeight: '900', color: colors.electric, marginTop: 4 },
  facts: { gap: 8, marginTop: 14 },
  notes: { color: colors.white75, fontSize: 13, lineHeight: 19, marginTop: 14 },
  msg: { fontSize: 13, fontWeight: '700', marginTop: 16 },
  block: { marginTop: 18, padding: 16, borderRadius: 18, backgroundColor: colors.white03, borderWidth: 1, borderColor: colors.white08 },
  blockHi: { backgroundColor: colors.electricAlpha['06'], borderColor: colors.electricAlpha['25'] },
  blockH: { fontSize: 16, fontWeight: '900', color: colors.white },
  p: { fontSize: 12.5, color: colors.white65, lineHeight: 18, marginTop: 6, marginBottom: 12 },
  link: { color: colors.electric, fontSize: 13.5, fontWeight: '800', textAlign: 'center' },
  contract: { color: colors.white75, fontSize: 11.5, lineHeight: 17, fontFamily: typography.mono, padding: 12, borderRadius: 12, backgroundColor: colors.ink, borderWidth: 1, borderColor: colors.white08 },
  line: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.white06 },
  lineK: { color: colors.white65, fontSize: 13 },
  lineV: { color: colors.white, fontSize: 13, fontWeight: '700' },
  small: { color: colors.white55, fontSize: 11.5, lineHeight: 16, marginTop: 8 },
  input: { minHeight: 60, borderWidth: 1, borderColor: colors.white12, borderRadius: 12, padding: 12, color: colors.white, fontSize: 14, backgroundColor: colors.ink },
  dispute: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 22, padding: 12 },
  disputeText: { fontSize: 12.5, color: colors.warning, fontWeight: '700' },
});
