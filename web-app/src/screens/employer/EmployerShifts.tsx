/**
 * Employer Shifts (web) — three REAL surfaces under #/employer/shifts:
 *
 *   #/employer/shifts        list of posted shifts         GET  /shifts/mine
 *   #/employer/shifts/new    post a shift                  POST /shifts
 *   #/employer/shifts/:id    detail + applicants + select  GET  /shifts/:id
 *                                                          GET  /shifts/:id/applicants
 *                                                          POST /shifts/:id/confirm
 *
 * One shift = one worker (the API assigns a single workerId on confirm).
 * Posting is gated on business verification — mirrored from the server's
 * gate via useEmployerProfile().canPostShifts.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { GlassCard, FadeUp } from '../../components/KlokdLayout';
import { Eyebrow, GradientBtn, GhostBtn, StatusPill, Avatar } from '../../components/Primitives';
import { Field, Chip, Notice } from '../../components/Form';
import { ShiftCardSkeleton, ErrorState, EmptyState } from '../../components/States';
import { useAuth } from '../../context/AuthContext';
import { useEmployerShifts, EmployerShift } from '../../hooks/useEmployerShifts';
import { useEmployerProfile } from '../../hooks/useEmployerProfile';
import { api } from '../../services/api';
import { navigate, Link } from '../../navigation/router';
import { AttendancePanel } from './AttendancePanel';
import { colors, spacing, radius } from '../../theme';

export const SHIFT_STATE_TONE: Record<string, 'mint' | 'warn' | 'err' | 'neutral'> = {
  POSTED: 'warn',
  CONFIRMED: 'mint',
  ACCEPTED: 'mint',
  ACTIVE: 'mint',
  COMPLETED: 'mint',
  DISPUTED: 'err',
  PAID: 'mint',
  CANCELLED: 'neutral',
};

export const SHIFT_STATE_LABEL: Record<string, string> = {
  POSTED: 'open',
  CONFIRMED: 'worker picked',
  ACCEPTED: 'worker confirmed',
  ACTIVE: 'on shift',
  COMPLETED: 'done',
  DISPUTED: 'disputed',
  PAID: 'paid',
  CANCELLED: 'cancelled',
};

export function shiftWhen(startIso: string, endIso: string): string {
  const s = new Date(startIso);
  const e = new Date(endIso);
  const day = s.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const t = (d: Date) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${day} · ${t(s)}–${t(e)}`;
}

export function EmployerShifts({ sub }: { sub?: string }) {
  if (sub === 'new') return <PostShift />;
  if (sub) return <ShiftDetail id={sub} />;
  return <ShiftList />;
}

// ─── List ─────────────────────────────────────────────────

function ShiftList() {
  const { shifts, status, error, retry } = useEmployerShifts();
  const { profile } = useEmployerProfile();
  const live = status === 'live' || status === 'demo';

  return (
    <View>
      <View style={styles.head}>
        <View style={{ flex: 1, minWidth: 240 }}>
          <Eyebrow color={colors.volt}>SHIFTS</Eyebrow>
          <Text style={styles.h1}>Post, fill, manage.</Text>
        </View>
        {status !== 'demo' && <GradientBtn onPress={() => navigate('/employer/shifts/new')}>Post a shift</GradientBtn>}
      </View>

      {profile && !profile.canPostShifts && <VerifyBanner />}

      {status === 'loading' && (
        <View style={styles.list}>
          {[0, 1, 2].map(i => (
            <GlassCard key={i} padding={spacing.lg}>
              <ShiftCardSkeleton />
            </GlassCard>
          ))}
        </View>
      )}
      {status === 'error' && <ErrorState title="Couldn’t load your shifts." detail={error ?? undefined} onRetry={retry} />}
      {status === 'empty' && (
        <EmptyState
          title="No shifts posted yet."
          detail="Post your first shift and verified workers nearby can apply straight away."
        />
      )}
      {live && (
        <View style={styles.list}>
          {shifts!.map((s, i) => (
            <FadeUp key={s.id} delay={i * 40}>
              <ShiftRow s={s} demo={status === 'demo'} />
            </FadeUp>
          ))}
        </View>
      )}
      {status === 'demo' && (
        <Text style={styles.demoNote}>Demo session · sample rows. Sign in with your business number to post real shifts.</Text>
      )}
    </View>
  );
}

function ShiftRow({ s, demo }: { s: EmployerShift; demo: boolean }) {
  const body = (
    <View style={styles.row}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.rowTop}>
          <Text style={styles.rowRole} numberOfLines={1}>{s.role}</Text>
          <StatusPill tone={SHIFT_STATE_TONE[s.status] ?? 'neutral'}>{SHIFT_STATE_LABEL[s.status] ?? s.status.toLowerCase()}</StatusPill>
        </View>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {demo ? s.startTime : shiftWhen(s.startTime, s.endTime)} · {s.locationName ?? 'Nairobi'}
        </Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.rowPay}>KES {s.rateKes.toLocaleString()}</Text>
        <Text style={styles.rowApps}>
          {s.applications} applicant{s.applications === 1 ? '' : 's'}
        </Text>
      </View>
    </View>
  );
  if (demo) return <GlassCard padding={spacing.lg}>{body}</GlassCard>;
  return (
    <Link to={`/employer/shifts/${s.id}`} style={styles.rowLink} hoverStyle={styles.rowLinkHover}>
      {body}
    </Link>
  );
}

function VerifyBanner() {
  return (
    <View style={styles.banner}>
      <View style={{ flex: 1, minWidth: 220 }}>
        <Text style={styles.bannerH}>Verify your business to start posting.</Text>
        <Text style={styles.bannerP}>Add your KRA PIN and WIBA policy. It takes a couple of minutes.</Text>
      </View>
      <GhostBtn size="sm" onPress={() => navigate('/employer/verify')}>Verify business</GhostBtn>
    </View>
  );
}

// ─── Post a shift ─────────────────────────────────────────

// Matches the minimum-wage sectors the compliance engine knows.
const ROLES = ['Waiter', 'Barista', 'Bartender', 'Chef', 'Cashier', 'Cleaner', 'Security', 'Receptionist'];

const AREAS = [
  { name: 'Westlands', lat: -1.2636, lng: 36.8036 },
  { name: 'CBD', lat: -1.2864, lng: 36.8172 },
  { name: 'Kilimani', lat: -1.2864, lng: 36.783 },
  { name: 'Lavington', lat: -1.2783, lng: 36.77 },
  { name: 'Kileleshwa', lat: -1.2722, lng: 36.78 },
  { name: 'Parklands', lat: -1.258, lng: 36.812 },
  { name: 'Hurlingham', lat: -1.295, lng: 36.795 },
  { name: 'Karen', lat: -1.3197, lng: 36.7112 },
];

const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;

function nextDays(n: number): { key: string; label: string; date: Date }[] {
  const out = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  for (let i = 0; i < n; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' });
    out.push({ key: d.toISOString().slice(0, 10), label, date: d });
  }
  return out;
}

function atTime(day: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(day);
  d.setHours(h, m, 0, 0);
  return d;
}

function PostShift() {
  const { accessToken, account } = useAuth();
  const { profile, status: profileStatus } = useEmployerProfile();
  const demo = !accessToken || !!account?.demo;
  const days = useMemo(() => nextDays(7), []);

  const [role, setRole] = useState('Waiter');
  const [otherRole, setOtherRole] = useState('');
  const [dayKey, setDayKey] = useState(days[0].key);
  const [start, setStart] = useState('17:00');
  const [end, setEnd] = useState('22:00');
  const [area, setArea] = useState(AREAS[0].name);
  const [pay, setPay] = useState('1800');
  const [notes, setNotes] = useState('');
  const [posting, setPosting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const roleValue = role === 'Other' ? otherRole.trim() : role;
  const day = days.find(d => d.key === dayKey)!.date;
  const timesValid = TIME_RE.test(start) && TIME_RE.test(end);
  const startAt = timesValid ? atTime(day, start) : null;
  let endAt = timesValid ? atTime(day, end) : null;
  // End at or before start means the shift runs past midnight.
  if (startAt && endAt && endAt <= startAt) endAt = new Date(endAt.getTime() + 24 * 3600_000);
  const hours = startAt && endAt ? (endAt.getTime() - startAt.getTime()) / 3600_000 : 0;
  const payNum = Number(pay.replace(/[^\d]/g, ''));
  const startsInPast = !!startAt && startAt.getTime() < Date.now();

  const problems: string[] = [];
  if (!roleValue) problems.push('Pick a role.');
  if (!timesValid) problems.push('Times use 24-hour HH:MM, e.g. 17:00.');
  else if (hours > 12) problems.push('Shifts can be at most 12 hours.');
  else if (startsInPast) problems.push('That start time has already passed.');
  if (!payNum || payNum < 100) problems.push('Enter the pay for the shift in KES.');
  const valid = problems.length === 0;

  const submit = async () => {
    if (!valid || posting) return;
    const a = AREAS.find(x => x.name === area)!;
    setPosting(true);
    setErr(null);
    try {
      const shift = await api<{ id: string }>('/shifts', {
        method: 'POST',
        token: accessToken!,
        body: {
          role: roleValue,
          description: notes.trim() || undefined,
          date: day.toISOString(),
          startTime: startAt!.toISOString(),
          endTime: endAt!.toISOString(),
          rateKes: payNum,
          locationLat: a.lat,
          locationLng: a.lng,
          locationName: a.name,
        },
      });
      navigate(`/employer/shifts/${shift.id}`, { replace: true });
    } catch (e: any) {
      setErr(e.message);
      setPosting(false);
    }
  };

  const gated = !demo && profileStatus === 'live' && profile && !profile.canPostShifts;

  return (
    <View style={styles.formWrap}>
      <BackLink />
      <Eyebrow color={colors.volt}>NEW SHIFT</Eyebrow>
      <Text style={styles.h1}>Post a shift.</Text>
      <Text style={styles.p}>Verified workers near the venue see it as soon as you post. You pick who works it.</Text>

      {demo && <Notice>Demo session · you can explore the form, but posting needs a signed-in business account.</Notice>}
      {gated && <VerifyBanner />}

      <GlassCard padding={spacing.xl} style={{ marginTop: spacing.lg }}>
        <Text style={styles.section}>Role</Text>
        <View style={styles.chips}>
          {[...ROLES, 'Other'].map(r => (
            <Chip key={r} active={role === r} onPress={() => setRole(r)}>{r}</Chip>
          ))}
        </View>
        {role === 'Other' && (
          <Field label="Role name" value={otherRole} onChangeText={setOtherRole} placeholder="e.g. Usher" style={{ marginTop: spacing.md, marginBottom: 0 }} />
        )}

        <Text style={[styles.section, styles.sectionGap]}>When</Text>
        <View style={styles.chips}>
          {days.map(d => (
            <Chip key={d.key} active={dayKey === d.key} onPress={() => setDayKey(d.key)}>{d.label}</Chip>
          ))}
        </View>
        <View style={[styles.row2, { marginTop: spacing.md }]}>
          <Field label="Start" value={start} onChangeText={setStart} placeholder="17:00" maxLength={5} style={styles.timeField} />
          <Field label="End" value={end} onChangeText={setEnd} placeholder="22:00" maxLength={5} style={styles.timeField} />
          <View style={styles.hoursBox}>
            <Text style={styles.hoursK}>{hours > 0 ? `${+hours.toFixed(2)}h` : '—'}</Text>
            <Text style={styles.hoursL}>{endAt && startAt && endAt.getDate() !== startAt.getDate() ? 'ends next day' : 'length'}</Text>
          </View>
        </View>

        <Text style={styles.section}>Area</Text>
        <View style={styles.chips}>
          {AREAS.map(a => (
            <Chip key={a.name} active={area === a.name} onPress={() => setArea(a.name)}>{a.name}</Chip>
          ))}
        </View>
        <Text style={styles.hint}>Workers see the area, and the venue address once you pick them.</Text>

        <View style={[styles.row2, styles.sectionGap]}>
          <Field
            label="Pay for the shift (KES)"
            value={pay}
            onChangeText={setPay}
            keyboardType="number-pad"
            placeholder="1800"
            style={styles.flex}
            hint={payNum && hours > 0 ? `≈ KES ${Math.round(payNum / hours).toLocaleString()} an hour` : undefined}
          />
        </View>
        <Field
          label="Notes for workers (optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Dress code, who to ask for, what to bring"
          multiline
          style={{ marginBottom: 0 }}
        />
      </GlassCard>

      <View style={styles.submitBar}>
        <View style={{ flex: 1, minWidth: 220 }}>
          <Text style={styles.sumLine}>
            {roleValue || 'Role'} · {days.find(d => d.key === dayKey)!.label} {start}–{end} · {area}
          </Text>
          <Text style={styles.sumPay}>KES {payNum ? payNum.toLocaleString() : '—'} · 1 worker</Text>
          {!valid && <Text style={styles.problem}>{problems[0]}</Text>}
        </View>
        <GradientBtn onPress={submit} disabled={!valid || posting || demo || !!gated}>
          {posting ? 'Posting…' : 'Post shift'}
        </GradientBtn>
      </View>
      {err ? <Notice tone="err">{err}</Notice> : null}
    </View>
  );
}

// ─── Detail + applicants ──────────────────────────────────

interface ShiftDetailData {
  id: string;
  role: string;
  description: string | null;
  startTime: string;
  endTime: string;
  rateKes: number;
  locationName: string | null;
  status: string;
  workerId: string | null;
  worker: { firstName: string; lastName: string; showUpRate: number | null; ratingAggregate: number | null; ratingCount: number } | null;
}

interface Applicant {
  applicationId: string;
  worker: {
    id: string;
    firstName: string;
    lastName: string;
    showUpRate: number | null;
    ratingAggregate: number | null;
    ratingCount: number | null;
    totalShifts: number;
    skills: string[];
    verificationStatus: string;
    showRating: boolean;
  };
}

function ShiftDetail({ id }: { id: string }) {
  const { accessToken, account } = useAuth();
  const demo = !accessToken || !!account?.demo;
  const [shift, setShift] = useState<ShiftDetailData | null>(null);
  const [applicants, setApplicants] = useState<Applicant[] | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => setAttempt(n => n + 1), []);

  useEffect(() => {
    if (demo) return;
    let cancelled = false;
    (async () => {
      try {
        const s = await api<ShiftDetailData>(`/shifts/${id}`, { token: accessToken! });
        const a = s.status === 'POSTED' ? await api<Applicant[]>(`/shifts/${id}/applicants`, { token: accessToken! }) : [];
        if (cancelled) return;
        setShift(s);
        setApplicants(a);
        setStatus('ready');
      } catch (e: any) {
        if (cancelled) return;
        setError(e.message);
        setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, accessToken, demo, attempt]);

  if (demo) {
    return (
      <View style={styles.formWrap}>
        <BackLink />
        <EmptyState title="Sign in to see applicants." detail="Demo sessions only show sample shifts." />
      </View>
    );
  }
  if (status === 'loading') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.electric} />
      </View>
    );
  }
  if (status === 'error' || !shift) {
    return (
      <View style={styles.formWrap}>
        <BackLink />
        <ErrorState title="Couldn’t load this shift." detail={error ?? undefined} onRetry={reload} />
      </View>
    );
  }

  return (
    <View style={styles.formWrap}>
      <BackLink />
      <View style={styles.head}>
        <View style={{ flex: 1, minWidth: 240 }}>
          <Eyebrow color={colors.volt}>SHIFT</Eyebrow>
          <Text style={styles.h1}>{shift.role}</Text>
          <Text style={styles.p}>
            {shiftWhen(shift.startTime, shift.endTime)} · {shift.locationName ?? 'Nairobi'} · KES {shift.rateKes.toLocaleString()}
          </Text>
        </View>
        <StatusPill tone={SHIFT_STATE_TONE[shift.status] ?? 'neutral'}>{SHIFT_STATE_LABEL[shift.status] ?? shift.status.toLowerCase()}</StatusPill>
      </View>
      {shift.description ? <Text style={styles.notes}>{shift.description}</Text> : null}

      {shift.status === 'POSTED' ? (
        <Applicants shiftId={shift.id} applicants={applicants ?? []} onConfirmed={reload} />
      ) : shift.worker ? (
        <>
        <GlassCard padding={spacing.xl} style={{ marginTop: spacing.lg }}>
          <Eyebrow>YOUR WORKER</Eyebrow>
          <View style={styles.appRow}>
            <Avatar initials={initials(shift.worker.firstName, shift.worker.lastName)} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={styles.appName}>
                {shift.worker.firstName} {shift.worker.lastName.charAt(0)}.
              </Text>
              <Text style={styles.appMeta}>
                {shift.status === 'CONFIRMED'
                  ? 'Picked · waiting for them to confirm'
                  : SHIFT_STATE_LABEL[shift.status] ?? shift.status.toLowerCase()}
              </Text>
            </View>
          </View>
        </GlassCard>
        {shift.status !== 'CANCELLED' && (
          <AttendancePanel shiftId={shift.id} workerFirstName={shift.worker.firstName} onChanged={reload} />
        )}
        </>
      ) : null}
    </View>
  );
}

function initials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

function Applicants({ shiftId, applicants, onConfirmed }: { shiftId: string; applicants: Applicant[]; onConfirmed: () => void }) {
  const { accessToken } = useAuth();
  const [picking, setPicking] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const confirm = async (workerId: string) => {
    setSaving(true);
    setErr(null);
    try {
      const res = await api<{ section37?: { message?: string } }>(`/shifts/${shiftId}/confirm`, {
        method: 'POST',
        token: accessToken!,
        body: { workerId },
      });
      if (res?.section37?.message) setWarning(res.section37.message);
      onConfirmed();
    } catch (e: any) {
      setErr(e.message);
      setSaving(false);
    }
  };

  return (
    <View style={{ marginTop: spacing.xl }}>
      <Eyebrow>APPLICANTS</Eyebrow>
      <Text style={styles.h2}>
        {applicants.length === 0 ? 'No applicants yet.' : `${applicants.length} worker${applicants.length === 1 ? '' : 's'} applied.`}
      </Text>
      {warning ? <Notice>{warning}</Notice> : null}
      {err ? <Notice tone="err">{err}</Notice> : null}
      {applicants.length === 0 ? (
        <EmptyState
          title="Waiting for applications."
          detail="The shift is live to verified workers nearby. Applications appear here as they come in."
        />
      ) : (
        <View style={styles.list}>
          {applicants.map(({ applicationId, worker: w }) => (
            <GlassCard key={applicationId} padding={spacing.lg}>
              <View style={styles.appRow}>
                <Avatar initials={initials(w.firstName, w.lastName)} size={44} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.appName}>
                    {w.firstName} {w.lastName}
                  </Text>
                  <Text style={styles.appMeta} numberOfLines={1}>
                    {[
                      w.verificationStatus === 'APPROVED' ? 'ID verified' : null,
                      `${w.totalShifts} shift${w.totalShifts === 1 ? '' : 's'} on Klokd`,
                      w.showRating && w.ratingAggregate != null ? `★ ${w.ratingAggregate.toFixed(1)}` : 'new · not yet rated',
                      w.showUpRate != null && w.totalShifts > 0 ? `${Math.round(w.showUpRate)}% show-up` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                  {w.skills.length > 0 && (
                    <Text style={styles.appSkills} numberOfLines={1}>{w.skills.join(', ')}</Text>
                  )}
                </View>
                {picking === w.id ? (
                  <View style={styles.confirmBox}>
                    <GradientBtn size="sm" onPress={() => confirm(w.id)} disabled={saving}>
                      {saving ? 'Confirming…' : `Pick ${w.firstName}`}
                    </GradientBtn>
                    <GhostBtn size="sm" onPress={() => setPicking(null)}>Cancel</GhostBtn>
                  </View>
                ) : (
                  <GhostBtn size="sm" onPress={() => setPicking(w.id)}>Select</GhostBtn>
                )}
              </View>
            </GlassCard>
          ))}
          <Text style={styles.hint}>Picking a worker closes the shift to other applicants and lets them know.</Text>
        </View>
      )}
    </View>
  );
}

function BackLink() {
  return (
    <Link to="/employer/shifts" style={styles.back} hoverStyle={styles.backHover}>
      <Text style={styles.backText}>← All shifts</Text>
    </Link>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.md, flexWrap: 'wrap', marginBottom: spacing.lg },
  h1: { color: colors.white, fontSize: 26, fontWeight: '900', letterSpacing: -1, marginTop: 8 },
  h2: { color: colors.white, fontSize: 19, fontWeight: '900', letterSpacing: -0.6, marginTop: 6, marginBottom: spacing.md },
  p: { color: colors.white60, fontSize: 14, lineHeight: 21, marginTop: 6, maxWidth: 560 },
  loading: { paddingVertical: 80, alignItems: 'center' },
  list: { gap: spacing.sm },

  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowRole: { color: colors.white, fontSize: 16, fontWeight: '900', letterSpacing: -0.4, flexShrink: 1 },
  rowMeta: { color: colors.white55, fontSize: 12.5, fontWeight: '600', marginTop: 4 },
  rowRight: { alignItems: 'flex-end' },
  rowPay: { color: colors.electric, fontSize: 15, fontWeight: '900', letterSpacing: -0.3 },
  rowApps: { color: colors.white50, fontSize: 11.5, fontWeight: '700', marginTop: 3 },
  rowLink: {
    padding: spacing.lg,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.white10,
    backgroundColor: 'rgba(255,255,255,0.045)',
    textDecorationLine: 'none',
  } as any,
  rowLinkHover: { borderColor: 'rgba(0,229,160,0.45)', backgroundColor: 'rgba(255,255,255,0.07)' },

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.warnAlpha['25'],
    backgroundColor: colors.warnAlpha['12'],
    marginBottom: spacing.lg,
  },
  bannerH: { color: colors.white, fontSize: 14.5, fontWeight: '900', letterSpacing: -0.3 },
  bannerP: { color: colors.white70, fontSize: 12.5, marginTop: 3 },

  formWrap: { maxWidth: 760 },
  section: { color: colors.white45, fontSize: 10, fontWeight: '900', letterSpacing: 0.9, marginBottom: 10, textTransform: 'uppercase' },
  sectionGap: { marginTop: spacing.xl },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  row2: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.md, alignItems: 'flex-start' },
  flex: { flex: 1, minWidth: 200 },
  timeField: { flex: 1, minWidth: 110 },
  hoursBox: {
    minWidth: 96,
    marginTop: 20,
    paddingVertical: 9,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.voltAlpha['10'],
    borderWidth: 1,
    borderColor: colors.voltAlpha['18'],
    alignItems: 'center',
  },
  hoursK: { color: colors.volt, fontSize: 15, fontWeight: '900' },
  hoursL: { color: colors.white55, fontSize: 9.5, fontWeight: '800', marginTop: 1 },
  hint: { color: colors.white50, fontSize: 11.5, marginTop: 8, lineHeight: 16 },

  submitBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    flexWrap: 'wrap',
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.white10,
    backgroundColor: colors.white03,
  },
  sumLine: { color: colors.white75, fontSize: 13, fontWeight: '700' },
  sumPay: { color: colors.white, fontSize: 18, fontWeight: '900', letterSpacing: -0.5, marginTop: 4 },
  problem: { color: colors.warning, fontSize: 12, fontWeight: '700', marginTop: 6 },

  notes: { color: colors.white70, fontSize: 13.5, lineHeight: 20, marginBottom: spacing.md, maxWidth: 600 },
  appRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap', marginTop: spacing.xs },
  appName: { color: colors.white, fontSize: 15, fontWeight: '900', letterSpacing: -0.3 },
  appMeta: { color: colors.white60, fontSize: 12, fontWeight: '600', marginTop: 3 },
  appSkills: { color: colors.white50, fontSize: 11.5, marginTop: 3 },
  confirmBox: { flexDirection: 'row', gap: 6 },

  back: { alignSelf: 'flex-start', paddingVertical: 6, marginBottom: spacing.md, textDecorationLine: 'none' } as any,
  backHover: { opacity: 0.8 },
  backText: { color: colors.white60, fontSize: 13, fontWeight: '700' },

  demoNote: { color: colors.white55, fontSize: 11.5, fontWeight: '600', textAlign: 'center', marginTop: spacing.md },
});
