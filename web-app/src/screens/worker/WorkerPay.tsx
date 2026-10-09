/**
 * Worker Pay (web) — GET /me/earnings. Per-month totals and every shift's
 * breakdown (gross, PAYE, NSSF, SHIF, housing levy, net) with its approval and
 * payout state. Large payouts that need the worker's confirmation (Identiti
 * step-up OTP) are answered here.
 */
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { GlassCard } from '../../components/KlokdLayout';
import { Eyebrow, StatusPill, GradientBtn, Tone } from '../../components/Primitives';
import { Notice } from '../../components/Form';
import { ErrorState, EmptyState } from '../../components/States';
import { useApiData, useApiAction } from '../../hooks/useApiData';
import { navigate } from '../../navigation/router';
import { colors, spacing, radius, typography } from '../../theme';
import { kes, day, hm, monthLabel, time } from '../../lib/format';

interface Earnings {
  paymentsLive: boolean;
  months: { month: string; shifts: number; grossKes: number; deductionsKes: number; netKes: number; paidKes: number }[];
  shifts: {
    shiftId: string;
    role: string;
    venue: string;
    area: string | null;
    date: string;
    workedMinutes: number;
    grossKes: number;
    payeKes: number;
    nssfKes: number;
    shifKes: number;
    ahlKes: number;
    netKes: number;
    status: string;
    approveBy: string;
    paidAt: string | null;
    payment: { id: string; status: string; mpesaRef: string | null; needsConfirmation: boolean } | null;
  }[];
}

const STATE: Record<string, { label: string; tone: Tone }> = {
  AWAITING_APPROVAL: { label: 'venue checking', tone: 'warn' },
  APPROVED: { label: 'approved', tone: 'mint' },
  PAID: { label: 'paid', tone: 'mint' },
  DISPUTED: { label: 'on hold', tone: 'err' },
  VOID: { label: 'not payable', tone: 'neutral' },
};

export function WorkerPay() {
  const q = useApiData<Earnings>('/me/earnings', { pollMs: 60_000 });
  const [open, setOpen] = useState<string | null>(null);

  if (q.status === 'loading') return <View style={styles.loading}><ActivityIndicator color={colors.electric} /></View>;
  if (q.status === 'error') return <ErrorState title="Couldn’t load your pay." detail={q.error ?? undefined} onRetry={q.reload} />;
  const d = q.data!;
  const thisMonth = d.months[0];

  return (
    <View style={{ gap: spacing.xl, maxWidth: 860 }}>
      <View>
        <Eyebrow>PAY</Eyebrow>
        <Text style={styles.h1}>Every shilling, shift by shift.</Text>
      </View>
      {!d.paymentsLive && (
        <Notice>
          M-Pesa payouts through Klokd start when our payment partner (Kipkiren Pay) goes live. Until then your approved pay is recorded here and paid out in order once it switches on.
        </Notice>
      )}

      <View style={styles.tiles}>
        <Tile k={kes(thisMonth?.netKes ?? 0)} l={thisMonth ? `take-home · ${monthLabel(thisMonth.month)}` : 'take-home this month'} />
        <Tile k={kes(thisMonth?.deductionsKes ?? 0)} l="statutory deductions" />
        <Tile k={kes(d.months.reduce((n, m) => n + m.paidKes, 0))} l="paid to M-Pesa, all time" />
      </View>

      {d.shifts.length === 0 ? (
        <EmptyState title="No pay yet." detail="Your pay appears here the moment you clock out of a shift." />
      ) : (
        <GlassCard padding={spacing.sm}>
          {d.shifts.map(s => {
            const st = STATE[s.status] ?? { label: s.status.toLowerCase(), tone: 'neutral' as Tone };
            const isOpen = open === s.shiftId;
            return (
              <View key={s.shiftId} style={styles.item}>
                <Pressable onPress={() => setOpen(isOpen ? null : s.shiftId)} style={styles.itemHead} accessibilityRole="button" accessibilityState={{ expanded: isOpen }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.itemTitle}>{s.role} · {s.venue}</Text>
                    <Text style={styles.itemMeta}>{day(s.date)} · {hm(s.workedMinutes)} worked</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={styles.net}>{kes(s.netKes)}</Text>
                    <StatusPill tone={st.tone}>{st.label}</StatusPill>
                  </View>
                </Pressable>
                {isOpen && (
                  <View style={styles.breakdown}>
                    <Line k="Shift pay" v={kes(s.grossKes)} />
                    <Line k="PAYE" v={`− ${kes(s.payeKes)}`} />
                    <Line k="NSSF" v={`− ${kes(s.nssfKes)}`} />
                    <Line k="SHIF" v={`− ${kes(s.shifKes)}`} />
                    <Line k="Housing levy" v={`− ${kes(s.ahlKes)}`} />
                    <Line k="You receive" v={kes(s.netKes)} strong />
                    <Text style={styles.small}>
                      {s.status === 'AWAITING_APPROVAL' && `Approves automatically at ${time(s.approveBy)} unless the venue reports a problem.`}
                      {s.status === 'APPROVED' && (d.paymentsLive ? 'Approved; the payout is on its way.' : 'Approved; queued for M-Pesa payout.')}
                      {s.status === 'PAID' && `Paid${s.paidAt ? ` on ${day(s.paidAt)}` : ''}${s.payment?.mpesaRef ? ` · M-Pesa ref ${s.payment.mpesaRef}` : ''}.`}
                      {s.status === 'DISPUTED' && 'On hold while Klokd reviews a reported problem.'}
                    </Text>
                    {s.payment?.needsConfirmation && <ConfirmPayout paymentId={s.payment.id} onDone={q.reload} />}
                    <Pressable onPress={() => navigate(`/worker/shifts/${s.shiftId}`)}>
                      <Text style={styles.link}>Open shift →</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })}
        </GlassCard>
      )}

      {d.months.length > 1 && (
        <View>
          <Text style={styles.groupH}>By month</Text>
          <GlassCard padding={spacing.sm}>
            {d.months.map(m => (
              <View key={m.month} style={styles.monthRow}>
                <Text style={styles.monthK}>{monthLabel(m.month)}</Text>
                <Text style={styles.monthV}>{m.shifts} shifts · {kes(m.grossKes)} gross · {kes(m.netKes)} take-home</Text>
              </View>
            ))}
          </GlassCard>
        </View>
      )}
    </View>
  );
}

function ConfirmPayout({ paymentId, onDone }: { paymentId: string; onDone: () => void }) {
  const act = useApiAction();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <View style={styles.confirm}>
      <Text style={styles.itemTitle}>Confirm this payout</Text>
      <Text style={styles.small}>Large payouts need a one-time code sent to your phone.</Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, alignItems: 'center' }}>
        <TextInput
          value={code}
          onChangeText={t => setCode(t.replace(/\D/g, '').slice(0, 6))}
          placeholder="6-digit code"
          placeholderTextColor={colors.white35}
          style={styles.code}
          accessibilityLabel="Payout confirmation code"
        />
        <GradientBtn
          size="sm"
          disabled={busy || code.length !== 6}
          onPress={async () => {
            setBusy(true);
            setErr(null);
            try {
              await act(`/payments/${paymentId}/step-up`, { code });
              onDone();
            } catch (e: any) {
              setErr(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          Confirm
        </GradientBtn>
      </View>
      {err ? <Notice tone="err">{err}</Notice> : null}
    </View>
  );
}

function Tile({ k, l }: { k: string; l: string }) {
  return (
    <GlassCard padding={spacing.lg} style={{ flex: 1, minWidth: 200 }}>
      <Text style={styles.tileK}>{k}</Text>
      <Text style={styles.tileL}>{l}</Text>
    </GlassCard>
  );
}

function Line({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <View style={styles.line}>
      <Text style={styles.lineK}>{k}</Text>
      <Text style={[styles.lineV, strong && { fontWeight: '900', color: colors.electric }]}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { paddingVertical: 80, alignItems: 'center' },
  h1: { color: colors.white, fontSize: 26, fontWeight: '900', letterSpacing: -1, marginTop: 8 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tileK: { color: colors.white, fontSize: 22, fontWeight: '900', letterSpacing: -0.8 },
  tileL: { color: colors.white55, fontSize: 11.5, fontWeight: '700', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.3 },
  item: { borderBottomWidth: 1, borderBottomColor: colors.white06 },
  itemHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  itemTitle: { color: colors.white, fontSize: 14, fontWeight: '800' },
  itemMeta: { color: colors.white55, fontSize: 12, marginTop: 2 },
  net: { color: colors.white, fontSize: 15, fontWeight: '900', fontVariant: ['tabular-nums'] },
  breakdown: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  line: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  lineK: { color: colors.white65, fontSize: 12.5 },
  lineV: { color: colors.white, fontSize: 12.5, fontWeight: '700', fontVariant: ['tabular-nums'] },
  small: { color: colors.white50, fontSize: 11.5, lineHeight: 16, marginTop: 6 },
  link: { color: colors.electric, fontSize: 12.5, fontWeight: '800', marginTop: spacing.sm },
  confirm: { marginTop: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.warnAlpha['25'], backgroundColor: colors.warnAlpha['12'] },
  code: { width: 140, borderWidth: 1, borderColor: colors.white15, borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 8, color: colors.white, fontFamily: typography.mono, fontSize: 15, backgroundColor: colors.ink, outlineStyle: 'none' } as any,
  groupH: { color: colors.white60, fontSize: 11, fontWeight: '900', letterSpacing: 0.9, textTransform: 'uppercase', marginBottom: spacing.sm },
  monthRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, padding: spacing.md, flexWrap: 'wrap' },
  monthK: { color: colors.white, fontSize: 13.5, fontWeight: '800' },
  monthV: { color: colors.white65, fontSize: 12.5 },
});
