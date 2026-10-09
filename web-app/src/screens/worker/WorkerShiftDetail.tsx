/**
 * Worker shift page (web) — #/worker/shifts/:id. Everything a worker does
 * with one shift, from applying to rating it:
 *
 *   POSTED     apply · withdraw
 *   CONFIRMED  read the contract · "I'll be there" (accept) · decline
 *   ACCEPTED   check in at the venue (browser location, once) → start PIN
 *              · can't make it (before arriving)
 *   ACTIVE     timer from the server's start time · clock out
 *   after      pay breakdown · rate the venue · report a problem
 */
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { GlassCard } from '../../components/KlokdLayout';
import { Eyebrow, GradientBtn, GhostBtn, StatusPill } from '../../components/Primitives';
import { Notice } from '../../components/Form';
import { ErrorState } from '../../components/States';
import { RateShift, ReportProblem, ContractText } from '../../components/ShiftParts';
import { useApiData, useApiAction } from '../../hooks/useApiData';
import { Link } from '../../navigation/router';
import { colors, spacing, radius, typography } from '../../theme';
import { kes, longDay, time, hours, hm } from '../../lib/format';

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

interface WorkerAttendance {
  shift: { status: string; arrivedAt: string | null; clockInAt: string | null; clockOutAt: string | null };
  pinAttemptsLeft: number;
  settlement: { status: string; grossKes: number; netKes: number; deductionsKes: number; approveBy: string; workedMinutes: number } | null;
}

function getPosition(): Promise<{ lat: number; lng: number; accuracy: number } | null> {
  return new Promise(resolve => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

export function WorkerShiftDetail({ id }: { id: string }) {
  const shift = useApiData<ShiftInfo>(`/shifts/${id}`);
  const assignedToMe = !!shift.data && shift.data.status !== 'POSTED' && shift.data.workerId != null;
  const att = useApiData<WorkerAttendance>(assignedToMe ? `/attendance/shifts/${id}` : null, { pollMs: 20_000 });
  const pending = useApiData<{ shiftId: string }[]>('/me/ratings/pending');
  const act = useApiAction();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'err' | 'ok' | 'info'; text: string } | null>(null);
  const [pin, setPin] = useState('');
  const [now, setNow] = useState(Date.now());
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const refresh = () => {
    shift.reload();
    att.reload();
    pending.reload();
  };

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      if (ok) setMsg({ tone: 'ok', text: ok });
      refresh();
    } catch (e: any) {
      setMsg({ tone: 'err', text: e.message });
    } finally {
      setBusy(false);
    }
  };

  if (shift.status === 'loading') return <View style={styles.loading}><ActivityIndicator color={colors.electric} /></View>;
  if (shift.status === 'error') {
    return (
      <View style={styles.wrap}>
        <Back />
        <ErrorState title="Couldn’t load this shift." detail={shift.error ?? undefined} onRetry={shift.reload} />
      </View>
    );
  }
  const s = shift.data!;
  const a = att.data;
  const status = a?.shift.status ?? s.status;
  const arrived = !!a?.shift.arrivedAt;
  const startedAt = a?.shift.clockInAt ? new Date(a.shift.clockInAt).getTime() : null;
  const elapsed = startedAt ? Math.max(0, Math.floor(((a?.shift.clockOutAt ? new Date(a.shift.clockOutAt).getTime() : now) - startedAt) / 1000)) : 0;
  const needsRating = (pending.data ?? []).some(p => p.shiftId === s.id);

  const arrive = () =>
    run(async () => {
      const pos = await getPosition();
      if (!pos) throw new Error('Allow location for klokd.co.ke in your browser, then try again. It’s read once, only now.');
      await act(`/attendance/shifts/${s.id}/arrive`, { lat: pos.lat, lng: pos.lng, accuracy: pos.accuracy });
    }, 'You’re checked in. Ask the manager for the start PIN.');

  const clockOut = () =>
    run(async () => {
      const pos = await getPosition();
      await act(`/attendance/shifts/${s.id}/clock-out`, pos ? { lat: pos.lat, lng: pos.lng, accuracy: pos.accuracy } : {});
    }, 'Clocked out. Your pay is below.');

  return (
    <View style={styles.wrap}>
      <Back />
      <View style={styles.head}>
        <View style={{ flex: 1, minWidth: 240 }}>
          <Eyebrow>{s.employer.businessName.toUpperCase()}</Eyebrow>
          <Text style={styles.h1}>{s.role}</Text>
          <Text style={styles.meta}>
            {longDay(s.startTime)} · {time(s.startTime)}–{time(s.endTime)} ({hours(s.startTime, s.endTime)}) · {s.locationName ?? 'Nairobi'}
          </Text>
        </View>
        <Text style={styles.pay}>{kes(s.rateKes)}</Text>
      </View>
      {s.description ? <Text style={styles.notes}>{s.description}</Text> : null}
      {s.employer.ratingAggregate != null && (
        <Text style={styles.small}>Venue rating ★ {s.employer.ratingAggregate.toFixed(1)} · {s.employer.totalShifts} shifts on Klokd</Text>
      )}

      {msg && <Notice tone={msg.tone === 'info' ? undefined : msg.tone}>{msg.text}</Notice>}

      {/* ── Open shift ── */}
      {s.status === 'POSTED' && (
        <GlassCard padding={spacing.xl}>
          {s.myApplication === 'PENDING' ? (
            <>
              <Text style={styles.cardH}>You’ve applied.</Text>
              <Text style={styles.p}>The business picks from applicants. You’ll get a notification if it’s you.</Text>
              <View style={styles.row}>
                <GhostBtn size="sm" onPress={() => run(() => act(`/shifts/${s.id}/withdraw`), 'Application withdrawn.')}>Withdraw application</GhostBtn>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.cardH}>Want this shift?</Text>
              <Text style={styles.p}>Apply and the business can pick you. Pay goes to your M-Pesa after the shift.</Text>
              <View style={styles.row}>
                <GradientBtn disabled={busy} onPress={() => run(() => act(`/shifts/${s.id}/apply`), 'Applied. We’ll let you know if you’re picked.')}>
                  Apply for this shift
                </GradientBtn>
              </View>
            </>
          )}
        </GlassCard>
      )}

      {/* ── Picked: confirm or decline ── */}
      {status === 'CONFIRMED' && (
        <GlassCard variant="electric" padding={spacing.xl}>
          <Text style={styles.cardH}>{s.directOffer ? `${s.employer.businessName} wants you back.` : 'You got the shift.'}</Text>
          <Text style={styles.p}>Read the written particulars, then confirm so they know you’re coming. Confirming accepts the contract.</Text>
          <ContractText shiftId={s.id} />
          <View style={styles.row}>
            <GradientBtn disabled={busy} onPress={() => run(() => act(`/shifts/${s.id}/accept`), 'Confirmed. See you there.')}>I’ll be there</GradientBtn>
            <GhostBtn onPress={() => run(() => act(`/shifts/${s.id}/decline`), 'Declined. The shift has gone back to other workers.')}>Decline</GhostBtn>
          </View>
        </GlassCard>
      )}

      {/* ── Confirmed: check in, then PIN ── */}
      {status === 'ACCEPTED' && (
        <GlassCard variant={arrived ? 'electric' : 'default'} padding={spacing.xl}>
          {!arrived ? (
            <>
              <Text style={styles.cardH}>Check in when you get there.</Text>
              <Text style={styles.p}>
                From an hour before the start, tap below at the venue. Your location is read once to confirm you’re within 500 m. On a phone, the Klokd app works best.
              </Text>
              <View style={styles.row}>
                <GradientBtn disabled={busy} onPress={arrive}>{busy ? 'Checking location…' : 'I’ve arrived'}</GradientBtn>
                {!confirmCancel ? (
                  <GhostBtn size="sm" tone="danger" onPress={() => setConfirmCancel(true)}>I can’t make it</GhostBtn>
                ) : (
                  <GhostBtn size="sm" tone="danger" onPress={() => run(() => act(`/shifts/${s.id}/worker-cancel`), 'Cancelled. The business has been told.')}>
                    Yes, cancel my shift
                  </GhostBtn>
                )}
              </View>
            </>
          ) : (
            <>
              <Text style={styles.cardH}>Ask the manager for the 4-digit start PIN.</Text>
              <Text style={styles.p}>Your pay clock starts when you enter it. {a?.pinAttemptsLeft ?? 5} tries left.</Text>
              <View style={styles.pinRow}>
                <TextInput
                  value={pin}
                  onChangeText={t => setPin(t.replace(/\D/g, '').slice(0, 4))}
                  placeholder="• • • •"
                  placeholderTextColor={colors.white25}
                  keyboardType="number-pad"
                  maxLength={4}
                  accessibilityLabel="Start PIN"
                  style={styles.pin}
                />
                <GradientBtn
                  disabled={busy || pin.length !== 4}
                  onPress={() => run(async () => {
                    try {
                      await act(`/attendance/shifts/${s.id}/start`, { pin });
                    } finally {
                      setPin('');
                    }
                  }, 'Shift started.')}
                >
                  Start shift
                </GradientBtn>
              </View>
            </>
          )}
        </GlassCard>
      )}

      {/* ── On shift ── */}
      {status === 'ACTIVE' && (
        <GlassCard variant="electric" padding={spacing.xl}>
          <Eyebrow>ON SHIFT</Eyebrow>
          <Text style={styles.timer}>
            {String(Math.floor(elapsed / 3600)).padStart(2, '0')}:{String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}
          </Text>
          <Text style={styles.p}>Started at {a?.shift.clockInAt ? time(a.shift.clockInAt) : '—'}. Clock out when you finish; your location is noted once but never stops you.</Text>
          <View style={styles.row}>
            <GradientBtn disabled={busy} onPress={clockOut}>{busy ? 'Clocking out…' : 'Clock out'}</GradientBtn>
          </View>
        </GlassCard>
      )}

      {/* ── After the shift ── */}
      {a?.settlement && (
        <GlassCard padding={spacing.xl}>
          <View style={styles.payHead}>
            <Eyebrow>YOUR PAY</Eyebrow>
            <StatusPill tone={a.settlement.status === 'DISPUTED' ? 'err' : a.settlement.status === 'AWAITING_APPROVAL' ? 'warn' : 'mint'}>
              {a.settlement.status === 'AWAITING_APPROVAL' ? 'venue checking' : a.settlement.status === 'APPROVED' ? 'approved' : a.settlement.status.toLowerCase()}
            </StatusPill>
          </View>
          <Line k="Hours worked" v={hm(a.settlement.workedMinutes)} />
          <Line k="Shift pay" v={kes(a.settlement.grossKes)} />
          <Line k="Statutory deductions" v={`− ${kes(a.settlement.deductionsKes)}`} />
          <Line k="You receive" v={kes(a.settlement.netKes)} strong />
          <Text style={styles.small}>
            {a.settlement.status === 'AWAITING_APPROVAL' && `The venue has until ${time(a.settlement.approveBy)} to raise a problem; then it’s approved automatically.`}
            {a.settlement.status === 'APPROVED' && 'Approved. It goes to your M-Pesa as soon as Klokd payments (Kipkiren Pay) are live.'}
            {a.settlement.status === 'PAID' && 'Paid to your M-Pesa.'}
            {a.settlement.status === 'DISPUTED' && 'On hold while Klokd reviews a reported problem.'}
          </Text>
        </GlassCard>
      )}
      {needsRating && <RateShift shiftId={s.id} who={s.employer.businessName} onDone={pending.reload} />}
      {['ACTIVE', 'COMPLETED', 'PAID'].includes(status) && (
        <ReportProblem shiftId={s.id} types={['INCOMPLETE_SHIFT', 'PAYMENT_NOT_RECEIVED', 'CONDUCT_ISSUE', 'UNSAFE_CONDITIONS', 'OTHER']} onDone={refresh} />
      )}
      {['ACCEPTED', 'ACTIVE', 'COMPLETED', 'PAID', 'DISPUTED'].includes(status) && <ContractText shiftId={s.id} />}
    </View>
  );
}

function Line({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <View style={styles.line}>
      <Text style={styles.lineK}>{k}</Text>
      <Text style={[styles.lineV, strong && { fontSize: 15, fontWeight: '900' }]}>{v}</Text>
    </View>
  );
}

function Back() {
  return (
    <Link to="/worker/shifts" style={styles.back} hoverStyle={{ opacity: 0.8 }}>
      <Text style={styles.backText}>← My shifts</Text>
    </Link>
  );
}

const styles = StyleSheet.create({
  wrap: { maxWidth: 760, gap: spacing.md },
  loading: { paddingVertical: 80, alignItems: 'center' },
  head: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md, flexWrap: 'wrap' },
  h1: { color: colors.white, fontSize: 28, fontWeight: '900', letterSpacing: -1, marginTop: 6 },
  meta: { color: colors.white65, fontSize: 13.5, marginTop: 6, lineHeight: 19 },
  pay: { color: colors.electric, fontSize: 24, fontWeight: '900', letterSpacing: -0.8 },
  notes: { color: colors.white75, fontSize: 13.5, lineHeight: 20 },
  small: { color: colors.white50, fontSize: 12, lineHeight: 17, marginTop: 6 },
  cardH: { color: colors.white, fontSize: 17, fontWeight: '900', letterSpacing: -0.4 },
  p: { color: colors.white65, fontSize: 13, lineHeight: 19, marginTop: 6, marginBottom: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginTop: spacing.md, alignItems: 'center' },
  pinRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', flexWrap: 'wrap' },
  pin: {
    width: 180, textAlign: 'center', fontSize: 30, fontWeight: '900', letterSpacing: 12, color: colors.white,
    fontFamily: typography.mono, paddingVertical: 10, borderRadius: radius.lg, borderWidth: 1.5,
    borderColor: colors.electricAlpha['40'], backgroundColor: colors.ink, outlineStyle: 'none',
  } as any,
  timer: { color: colors.electric, fontSize: 44, fontWeight: '900', letterSpacing: -1, fontFamily: typography.mono, marginTop: 8 },
  payHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  line: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.white06 },
  lineK: { color: colors.white70, fontSize: 13, fontWeight: '600' },
  lineV: { color: colors.white, fontSize: 13, fontWeight: '700' },
  back: { alignSelf: 'flex-start', paddingVertical: 6, textDecorationLine: 'none' } as any,
  backText: { color: colors.white60, fontSize: 13, fontWeight: '700' },
});
