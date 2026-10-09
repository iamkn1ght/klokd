/**
 * AttendancePanel — the employer's live view of a picked shift, Uber-style:
 *
 *   Picked → Confirmed → Arrived → Started → Finished → Paid
 *
 *   · Start PIN shown while the worker is on the way / at the door (the
 *     worker types it on their phone to start, like an Uber trip PIN)
 *   · "Start without PIN" fallback with a reason (flagged for Klokd review)
 *   · Late / no-show banner with wait · replace · cancel
 *   · Pay due after clock-out: approve, or report a problem in the window
 *
 * Polls GET /attendance/shifts/:id every 15 s while the shift is live.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GlassCard } from '../../components/KlokdLayout';
import { Eyebrow, GradientBtn, GhostBtn, StatusPill } from '../../components/Primitives';
import { Field, Chip, Notice } from '../../components/Form';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { colors, spacing, radius, typography } from '../../theme';

interface AttendanceEvent {
  id: string;
  type: string;
  method: string;
  at: string;
  distanceM: number | null;
  flags: string[];
  reason: string | null;
}

interface Settlement {
  status: 'AWAITING_APPROVAL' | 'APPROVED' | 'DISPUTED' | 'PAID';
  scheduledMinutes: number;
  workedMinutes: number;
  grossKes: number;
  payeKes: number;
  nssfTier1Kes: number;
  nssfTier2Kes: number;
  shifKes: number;
  ahlKes: number;
  netKes: number;
  platformFeeKes: number;
  employerTotalKes: number;
  approveBy: string;
  approvedBy: string | null;
}

interface AttendanceView {
  status: string;
  pin: string | null;
  pinLocked: boolean;
  noShow: boolean;
  late: boolean;
  summary: { arrivedAt: string | null; startedAt: string | null; clockedOutAt: string | null; flags: string[] };
  events: AttendanceEvent[];
  settlement: Settlement | null;
  overrideReasons: string[];
}

const LIVE = ['CONFIRMED', 'ACCEPTED', 'ACTIVE'];

const REASON_LABEL: Record<string, string> = {
  GPS_FAILED: 'Their GPS won’t work here',
  PIN_LOCKED: 'PIN locked after wrong tries',
  WORKER_PHONE_ISSUE: 'Their phone is dead or broken',
  OTHER: 'Something else',
};

const EVENT_LABEL: Record<string, string> = {
  ARRIVED: 'Arrived at the venue',
  STARTED: 'Started the shift with your PIN',
  OVERRIDE_START: 'You started the shift',
  PIN_LOCKED: 'PIN locked after too many wrong tries',
  CLOCKED_OUT: 'Finished the shift',
  LATE_WARNING: 'Running late · reminder sent',
  NO_SHOW: 'Didn’t show up',
  NO_SHOW_RESOLVED: 'You resolved the no-show',
};

const FLAG_LABEL: Record<string, string> = {
  MOCK_LOCATION: 'location may be faked',
  LATE_START: 'started late',
  EMPLOYER_OVERRIDE: 'started without PIN',
  NO_PIN_LEGACY_APP: 'old app · no PIN',
  CLOCKOUT_OUTSIDE_GEOFENCE: 'left before clocking out',
  EARLY_CLOCKOUT: 'finished early',
  NO_LOCATION: 'no location',
  NO_SHOW: 'no-show',
  PIN_LOCKED: 'PIN locked',
};

const t = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
const hm = (mins: number) => `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`;
const kes = (n: number) => `KES ${n.toLocaleString()}`;

export function AttendancePanel({
  shiftId,
  workerFirstName,
  onChanged,
}: {
  shiftId: string;
  workerFirstName: string;
  onChanged: () => void;
}) {
  const { accessToken } = useAuth();
  const [view, setView] = useState<AttendanceView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionErr, setActionErr] = useState<string | null>(null);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [reason, setReason] = useState('GPS_FAILED');
  const [note, setNote] = useState('');
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeText, setDisputeText] = useState('');

  const lastStatus = React.useRef<string | null>(null);
  const load = useCallback(async () => {
    try {
      const v = await api<AttendanceView>(`/attendance/shifts/${shiftId}`, { token: accessToken! });
      setView(v);
      setError(null);
      // Keep the page header in step when the worker moves the shift on.
      if (lastStatus.current && lastStatus.current !== v.status) onChanged();
      lastStatus.current = v.status;
    } catch (e: any) {
      setError(e.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shiftId, accessToken]);

  useEffect(() => {
    load();
    const live = !view || LIVE.includes(view.status) || view.settlement?.status === 'AWAITING_APPROVAL';
    if (!live) return;
    const timer = setInterval(load, 15_000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, view?.status, view?.settlement?.status]);

  const act = async (path: string, body?: unknown) => {
    setBusy(true);
    setActionErr(null);
    try {
      await api(path, { method: 'POST', token: accessToken!, body });
      setOverrideOpen(false);
      setDisputeOpen(false);
      await load();
      onChanged();
    } catch (e: any) {
      setActionErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (error && !view) return <Notice tone="err">Couldn’t load attendance: {error}</Notice>;
  if (!view) return null;

  const { summary, settlement } = view;
  const steps = [
    { k: 'Picked', done: true, at: null },
    { k: 'Confirmed', done: view.status !== 'CONFIRMED', at: null },
    { k: 'Arrived', done: !!summary.arrivedAt, at: summary.arrivedAt },
    { k: 'Started', done: !!summary.startedAt, at: summary.startedAt },
    { k: 'Finished', done: !!summary.clockedOutAt, at: summary.clockedOutAt },
    { k: 'Paid', done: settlement?.status === 'PAID', at: null },
  ];
  const current = steps.findIndex(s => !s.done);
  const waitingToStart = view.status === 'CONFIRMED' || view.status === 'ACCEPTED';

  return (
    <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
      {/* Trip-style progress */}
      <GlassCard padding={spacing.lg}>
        <View style={styles.steps}>
          {steps.map((s, i) => (
            <View key={s.k} style={styles.step}>
              <View style={[styles.dot, s.done && styles.dotDone, i === current && styles.dotNow]} />
              <Text style={[styles.stepK, s.done && styles.stepKDone, i === current && styles.stepKNow]}>{s.k}</Text>
              {s.at ? <Text style={styles.stepAt}>{t(s.at)}</Text> : null}
            </View>
          ))}
        </View>
      </GlassCard>

      {actionErr ? <Notice tone="err">{actionErr}</Notice> : null}

      {/* No-show / late */}
      {view.noShow && (
        <View style={[styles.alert, styles.alertErr]}>
          <Text style={styles.alertH}>{workerFirstName} hasn’t shown up.</Text>
          <Text style={styles.alertP}>
            Wait a bit longer, reopen the shift to pick someone else from your applicants, or cancel it.
          </Text>
          <View style={styles.row}>
            <GhostBtn size="sm" onPress={() => act(`/attendance/shifts/${shiftId}/no-show`, { action: 'wait' })}>Keep waiting</GhostBtn>
            <GradientBtn size="sm" disabled={busy} onPress={() => act(`/attendance/shifts/${shiftId}/no-show`, { action: 'replace' })}>
              Find a replacement
            </GradientBtn>
            <GhostBtn size="sm" tone="danger" onPress={() => act(`/attendance/shifts/${shiftId}/no-show`, { action: 'cancel' })}>Cancel shift</GhostBtn>
          </View>
        </View>
      )}
      {view.late && !view.noShow && (
        <View style={[styles.alert, styles.alertWarn]}>
          <Text style={styles.alertH}>{workerFirstName} is running late.</Text>
          <Text style={styles.alertP}>We’ve reminded them. If they’re not here 20 minutes after the start, you can find a replacement.</Text>
        </View>
      )}

      {/* Start PIN — the Uber trip-PIN moment */}
      {waitingToStart && view.pin && (
        <GlassCard variant="electric" padding={spacing.xl}>
          <View style={styles.pinRow}>
            <View style={{ flex: 1, minWidth: 220 }}>
              <Eyebrow>START PIN</Eyebrow>
              <Text style={styles.pinH}>
                {summary.arrivedAt
                  ? `${workerFirstName} is here (since ${t(summary.arrivedAt)}). Give them this PIN to start.`
                  : `When ${workerFirstName} arrives, give them this PIN to start the shift.`}
              </Text>
              <Text style={styles.pinP}>
                Their pay clock starts when they enter it. Don’t share it before they’re on site.
              </Text>
            </View>
            <Text style={styles.pin} accessibilityLabel={`Start PIN ${view.pin.split('').join(' ')}`}>
              {view.pin}
            </Text>
          </View>
          {view.pinLocked && (
            <Notice tone="err">The PIN is locked after too many wrong tries. Start the shift yourself below.</Notice>
          )}
          {view.status === 'ACCEPTED' && (
            <View style={{ marginTop: spacing.md }}>
              {!overrideOpen ? (
                <GhostBtn size="sm" onPress={() => setOverrideOpen(true)}>Start without PIN</GhostBtn>
              ) : (
                <View>
                  <Text style={styles.label}>Why can’t they use the PIN?</Text>
                  <View style={styles.chips}>
                    {view.overrideReasons.map(r => (
                      <Chip key={r} active={reason === r} onPress={() => setReason(r)}>{REASON_LABEL[r] ?? r}</Chip>
                    ))}
                  </View>
                  <Field
                    label={reason === 'OTHER' ? 'What happened?' : 'Note (optional)'}
                    value={note}
                    onChangeText={setNote}
                    placeholder="e.g. Basement kitchen, no signal"
                    style={{ marginTop: spacing.md, marginBottom: spacing.sm }}
                  />
                  <Text style={styles.small}>
                    Starting a shift yourself is logged and reviewed by Klokd. Use it only when {workerFirstName} is here with you.
                  </Text>
                  <View style={[styles.row, { marginTop: spacing.md }]}>
                    <GradientBtn size="sm" disabled={busy} onPress={() => act(`/attendance/shifts/${shiftId}/employer-start`, { reason, note: note.trim() || undefined })}>
                      {busy ? 'Starting…' : `${workerFirstName} is here · start shift`}
                    </GradientBtn>
                    <GhostBtn size="sm" onPress={() => setOverrideOpen(false)}>Cancel</GhostBtn>
                  </View>
                </View>
              )}
            </View>
          )}
        </GlassCard>
      )}

      {view.status === 'ACTIVE' && summary.startedAt && (
        <GlassCard padding={spacing.lg}>
          <Eyebrow>ON SHIFT</Eyebrow>
          <Text style={styles.pinH}>
            {workerFirstName} started at {t(summary.startedAt)}. You’ll see it here when they finish.
          </Text>
        </GlassCard>
      )}

      {/* Pay due */}
      {settlement && (
        <GlassCard padding={spacing.xl}>
          <View style={styles.payHead}>
            <Eyebrow>PAY</Eyebrow>
            <StatusPill tone={settlement.status === 'AWAITING_APPROVAL' ? 'warn' : settlement.status === 'DISPUTED' ? 'err' : 'mint'}>
              {settlement.status === 'AWAITING_APPROVAL'
                ? 'needs your check'
                : settlement.status === 'APPROVED'
                  ? settlement.approvedBy === 'auto' ? 'approved automatically' : 'approved'
                  : settlement.status.toLowerCase()}
            </StatusPill>
          </View>
          <Line k="Hours worked" v={`${hm(settlement.workedMinutes)} of ${hm(settlement.scheduledMinutes)} booked`} />
          <Line k="Shift pay" v={kes(settlement.grossKes)} />
          <Line k="Statutory deductions (PAYE, NSSF, SHIF, housing levy)" v={`− ${kes(settlement.grossKes - settlement.netKes)}`} muted />
          <Line k={`${workerFirstName} receives`} v={kes(settlement.netKes)} strong />
          <Line k="Klokd fee" v={kes(settlement.platformFeeKes)} muted />
          <Line k="Your total" v={kes(settlement.employerTotalKes)} strong />

          {settlement.status === 'AWAITING_APPROVAL' && (
            <View style={{ marginTop: spacing.lg }}>
              <Text style={styles.small}>
                Approves automatically at {t(settlement.approveBy)} unless you report a problem.
              </Text>
              {!disputeOpen ? (
                <View style={[styles.row, { marginTop: spacing.md }]}>
                  <GradientBtn size="sm" disabled={busy} onPress={() => act(`/attendance/shifts/${shiftId}/settlement/approve`)}>
                    Approve pay
                  </GradientBtn>
                  <GhostBtn size="sm" tone="danger" onPress={() => setDisputeOpen(true)}>Report a problem</GhostBtn>
                </View>
              ) : (
                <View style={{ marginTop: spacing.md }}>
                  <Field
                    label="What went wrong?"
                    value={disputeText}
                    onChangeText={setDisputeText}
                    multiline
                    placeholder="e.g. Left two hours early without telling anyone"
                    hint="Pay is paused while Klokd looks into it. We reply within 24 hours."
                  />
                  <View style={styles.row}>
                    <GradientBtn
                      size="sm"
                      disabled={busy || disputeText.trim().length < 10}
                      onPress={() => act('/disputes', { shiftId, type: 'INCOMPLETE_SHIFT', description: disputeText.trim() })}
                    >
                      Send to Klokd
                    </GradientBtn>
                    <GhostBtn size="sm" onPress={() => setDisputeOpen(false)}>Cancel</GhostBtn>
                  </View>
                </View>
              )}
            </View>
          )}
          {settlement.status === 'APPROVED' && (
            <Notice>
              Approved. The M-Pesa payout is queued and goes out once Klokd payments (Kipkiren Pay) are live — nothing more to do.
            </Notice>
          )}
          {settlement.status === 'DISPUTED' && <Notice tone="err">Pay is paused while Klokd reviews the problem you reported.</Notice>}
        </GlassCard>
      )}

      {/* Timeline */}
      {view.events.length > 0 && (
        <GlassCard padding={spacing.lg}>
          <Eyebrow>TIMELINE</Eyebrow>
          <View style={{ marginTop: spacing.sm }}>
            {view.events.map(e => (
              <View key={e.id} style={styles.event}>
                <Text style={styles.eventAt}>{t(e.at)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.eventK}>
                    {EVENT_LABEL[e.type] ?? e.type}
                    {e.distanceM != null ? ` · ${e.distanceM} m from venue` : ''}
                  </Text>
                  {e.flags.length > 0 && (
                    <Text style={styles.eventFlags}>{e.flags.map(f => FLAG_LABEL[f] ?? f).join(' · ')}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </GlassCard>
      )}
    </View>
  );
}

function Line({ k, v, strong, muted }: { k: string; v: string; strong?: boolean; muted?: boolean }) {
  return (
    <View style={styles.line}>
      <Text style={[styles.lineK, muted && { color: colors.white50 }]}>{k}</Text>
      <Text style={[styles.lineV, strong && styles.lineVStrong, muted && { color: colors.white60 }]}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  steps: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.md },
  step: { flex: 1, minWidth: 92, alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: colors.white25, backgroundColor: 'transparent' },
  dotDone: { backgroundColor: colors.electric, borderColor: colors.electric },
  dotNow: { borderColor: colors.volt, backgroundColor: colors.voltAlpha['18'] },
  stepK: { color: colors.white50, fontSize: 11.5, fontWeight: '800', marginTop: 6 },
  stepKDone: { color: colors.white85 },
  stepKNow: { color: colors.volt },
  stepAt: { color: colors.white50, fontSize: 10.5, fontWeight: '600', marginTop: 2 },

  alert: { padding: spacing.lg, borderRadius: radius.xl, borderWidth: 1 },
  alertErr: { backgroundColor: colors.errAlpha['06'], borderColor: colors.errAlpha['20'] },
  alertWarn: { backgroundColor: colors.warnAlpha['12'], borderColor: colors.warnAlpha['25'] },
  alertH: { color: colors.white, fontSize: 15, fontWeight: '900', letterSpacing: -0.3 },
  alertP: { color: colors.white70, fontSize: 12.5, lineHeight: 18, marginTop: 4 },
  row: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginTop: spacing.md },

  pinRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, flexWrap: 'wrap' },
  pinH: { color: colors.white, fontSize: 15, fontWeight: '800', lineHeight: 21, marginTop: 6, letterSpacing: -0.2 },
  pinP: { color: colors.white60, fontSize: 12, marginTop: 4, lineHeight: 17 },
  pin: { color: colors.electric, fontSize: 44, fontWeight: '900', letterSpacing: 10, fontFamily: typography.mono },
  label: { color: colors.white45, fontSize: 10, fontWeight: '900', letterSpacing: 0.9, marginBottom: 8, textTransform: 'uppercase' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  small: { color: colors.white55, fontSize: 11.5, lineHeight: 16 },

  payHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.white06 },
  lineK: { color: colors.white70, fontSize: 13, fontWeight: '600', flexShrink: 1 },
  lineV: { color: colors.white, fontSize: 13, fontWeight: '700' },
  lineVStrong: { fontSize: 14.5, fontWeight: '900' },

  event: { flexDirection: 'row', gap: spacing.md, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.white06 },
  eventAt: { color: colors.white50, fontSize: 12, fontWeight: '700', width: 44, fontFamily: typography.mono },
  eventK: { color: colors.white85, fontSize: 13, fontWeight: '700' },
  eventFlags: { color: colors.warning, fontSize: 11.5, fontWeight: '700', marginTop: 2 },
});
