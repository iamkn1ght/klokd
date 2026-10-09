/**
 * Pay — GET /me/earnings. This month's take-home, every shift's breakdown
 * (PAYE, NSSF, SHIF, housing levy) and where its payout stands. Large
 * payouts that need confirming take the Identiti OTP here.
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import { StatusPill, Label, GradientBtn } from '../../components/Primitives';
import { AmbientOrbs, SafeTop } from '../../components/KlokdLayout';
import { useData } from '../../hooks/useData';
import { useApi } from '../../hooks/useApi';
import { colors, typography } from '../../theme';
import { kes, day, hm, monthLabel, time } from '../../lib/format';

interface Earnings {
  paymentsLive: boolean;
  months: { month: string; shifts: number; grossKes: number; deductionsKes: number; netKes: number; paidKes: number }[];
  shifts: {
    shiftId: string;
    role: string;
    venue: string;
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

const STATE: Record<string, { label: string; tone: 'mint' | 'warn' | 'err' | 'neutral' }> = {
  AWAITING_APPROVAL: { label: 'Venue checking', tone: 'warn' },
  APPROVED: { label: 'Approved', tone: 'mint' },
  PAID: { label: 'Paid', tone: 'mint' },
  DISPUTED: { label: 'On hold', tone: 'err' },
  VOID: { label: 'Not payable', tone: 'neutral' },
};

export function PayScreen() {
  const q = useData<Earnings>('/me/earnings', { pollMs: 60_000 });
  const [open, setOpen] = useState<string | null>(null);
  const d = q.data;
  const month = d?.months[0];

  return (
    <View style={styles.screen}>
      <AmbientOrbs intensity="subtle" />
      <SafeTop />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 30 }}>
        <Text style={styles.h1}>Pay</Text>
        {q.status === 'loading' && <ActivityIndicator color={colors.electric} style={{ marginTop: 40 }} />}
        {q.status === 'error' && <Text style={styles.err}>{q.error}</Text>}
        {d && (
          <>
            <View style={styles.hero}>
              <Label color={colors.white55}>{month ? `Take-home · ${monthLabel(month.month)}` : 'Take-home this month'}</Label>
              <Text style={styles.big}>{kes(month?.netKes ?? 0)}</Text>
              <Text style={styles.heroSub}>
                {month ? `${month.shifts} shift${month.shifts === 1 ? '' : 's'} · ${kes(month.deductionsKes)} statutory deductions` : 'Your pay appears here when you clock out.'}
              </Text>
            </View>
            {!d.paymentsLive && (
              <Text style={styles.note}>
                M-Pesa payouts through Klokd start when our payment partner (Kipkiren Pay) goes live. Approved pay is recorded here and paid out in order once it switches on.
              </Text>
            )}
            <View style={{ gap: 10, marginTop: 18 }}>
              {d.shifts.length === 0 && <Text style={styles.empty}>No pay yet. Finish a shift and it appears here.</Text>}
              {d.shifts.map(s => {
                const st = STATE[s.status] ?? { label: s.status, tone: 'neutral' as const };
                const isOpen = open === s.shiftId;
                return (
                  <TouchableOpacity key={s.shiftId} activeOpacity={0.9} onPress={() => setOpen(isOpen ? null : s.shiftId)} style={styles.row}>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.title}>{s.role} · {s.venue}</Text>
                        <Text style={styles.meta}>{day(s.date)} · {hm(s.workedMinutes)} worked</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 5 }}>
                        <Text style={styles.net}>{kes(s.netKes)}</Text>
                        <StatusPill tone={st.tone}>{st.label}</StatusPill>
                      </View>
                    </View>
                    {isOpen && (
                      <View style={{ marginTop: 10 }}>
                        <Line k="Shift pay" v={kes(s.grossKes)} />
                        <Line k="PAYE" v={`− ${kes(s.payeKes)}`} />
                        <Line k="NSSF" v={`− ${kes(s.nssfKes)}`} />
                        <Line k="SHIF" v={`− ${kes(s.shifKes)}`} />
                        <Line k="Housing levy" v={`− ${kes(s.ahlKes)}`} />
                        <Line k="You receive" v={kes(s.netKes)} />
                        <Text style={styles.meta}>
                          {s.status === 'AWAITING_APPROVAL' && `Approved automatically at ${time(s.approveBy)} unless the venue reports a problem.`}
                          {s.status === 'APPROVED' && 'Approved; queued for M-Pesa payout.'}
                          {s.status === 'PAID' && `Paid${s.payment?.mpesaRef ? ` · M-Pesa ref ${s.payment.mpesaRef}` : ''}.`}
                          {s.status === 'DISPUTED' && 'On hold while Klokd reviews a reported problem.'}
                        </Text>
                        {s.payment?.needsConfirmation && <ConfirmPayout paymentId={s.payment.id} onDone={q.reload} />}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function ConfirmPayout({ paymentId, onDone }: { paymentId: string; onDone: () => void }) {
  const { post } = useApi();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <View style={styles.confirm}>
      <Text style={styles.title}>Confirm this payout</Text>
      <Text style={styles.meta}>Large payouts need the one-time code sent to your phone.</Text>
      <TextInput value={code} onChangeText={t => setCode(t.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" placeholder="6-digit code" placeholderTextColor={colors.white35} style={styles.code} />
      <GradientBtn size="sm" disabled={busy || code.length !== 6} onPress={async () => {
        setBusy(true);
        setErr(null);
        try {
          await post(`/payments/${paymentId}/step-up`, { code });
          onDone();
        } catch (e: any) {
          setErr(e?.message ?? 'Couldn’t confirm.');
        }
        setBusy(false);
      }}>Confirm payout</GradientBtn>
      {err ? <Text style={styles.err}>{err}</Text> : null}
    </View>
  );
}

function Line({ k, v }: { k: string; v: string }) {
  return (
    <View style={styles.line}>
      <Text style={styles.lineK}>{k}</Text>
      <Text style={styles.lineV}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  h1: { fontSize: 28, fontWeight: '900', color: colors.white, letterSpacing: -0.9, marginTop: 8 },
  err: { color: colors.warning, marginTop: 10 },
  hero: { marginTop: 16, padding: 18, borderRadius: 18, backgroundColor: colors.electricAlpha['06'], borderWidth: 1, borderColor: colors.electricAlpha['25'] },
  big: { fontSize: 34, fontWeight: '900', color: colors.white, letterSpacing: -1.2, marginTop: 6 },
  heroSub: { fontSize: 12, color: colors.white65, marginTop: 4 },
  note: { fontSize: 12, color: colors.white60, lineHeight: 17, marginTop: 12 },
  empty: { color: colors.white60, fontSize: 13, textAlign: 'center', marginTop: 20 },
  row: { padding: 14, borderRadius: 16, backgroundColor: colors.white03, borderWidth: 1, borderColor: colors.white08 },
  title: { fontSize: 14, fontWeight: '800', color: colors.white },
  meta: { fontSize: 11.5, color: colors.white55, marginTop: 3, lineHeight: 16 },
  net: { fontSize: 15, fontWeight: '900', color: colors.white },
  line: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  lineK: { color: colors.white65, fontSize: 12.5 },
  lineV: { color: colors.white, fontSize: 12.5, fontWeight: '700' },
  confirm: { marginTop: 12, padding: 12, borderRadius: 12, backgroundColor: 'rgba(255,179,71,0.10)', gap: 8 },
  code: { borderWidth: 1, borderColor: colors.white15, borderRadius: 10, padding: 10, color: colors.white, fontFamily: typography.mono, fontSize: 16 },
});
