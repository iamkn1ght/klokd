/**
 * Active shift — live timer (server start time) + progress + pay due + clock-out.
 * Visuals from claude-design/screens/main.jsx.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientBtn, IconBtn, StatusPill, Label } from '../../components/Primitives';
import { AmbientOrbs, SafeTop } from '../../components/KlokdLayout';
import { Icons } from '../../components/Icons';
import * as Location from 'expo-location';
import { useApi } from '../../hooks/useApi';
import { colors, typography } from '../../theme';

type Props = {
  navigation: NativeStackNavigationProp<any>;
  route?: { params?: { shift?: any } };
};

interface WorkerAttendance {
  shift: {
    id: string;
    role: string;
    venue: string;
    area: string | null;
    startTime: string;
    endTime: string;
    rateKes: number;
    status: string;
    clockInAt: string | null;
    clockOutAt: string | null;
  };
  settlement: {
    status: string;
    grossKes: number;
    netKes: number;
    deductionsKes: number;
    approveBy: string;
    workedMinutes: number;
  } | null;
}

const clock = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });

/**
 * Active shift — live timer from the SERVER's start time, progress through
 * the booked hours, and clock-out. Clock-out reads location once (recorded,
 * never blocks), then shows the pay due and when it's approved.
 */
export function ActiveShiftScreen({ navigation, route }: Props) {
  const shiftId: string | undefined = route?.params?.shift?.id;
  const { get, post } = useApi();
  const [view, setView] = useState<WorkerAttendance | null>(null);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    if (!shiftId) return;
    try {
      setView(await get<WorkerAttendance>(`/attendance/shifts/${shiftId}`));
    } catch (e: any) {
      setMessage(e?.message ?? 'Couldn’t load the shift.');
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shiftId]);

  const s = view?.shift;
  const startedAt = s?.clockInAt ? new Date(s.clockInAt).getTime() : null;
  const finished = s?.status !== 'ACTIVE' && !!s?.clockOutAt;
  const elapsed = startedAt ? Math.max(0, Math.floor(((finished ? new Date(s!.clockOutAt!).getTime() : now) - startedAt) / 1000)) : 0;
  const hrs = String(Math.floor(elapsed / 3600)).padStart(2, '0');
  const mns = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
  const scs = String(elapsed % 60).padStart(2, '0');
  const booked = s ? (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 1000 : 1;
  const progress = Math.min(1, elapsed / Math.max(booked, 1));

  const handleClockOut = async () => {
    setBusy(true);
    setMessage(null);
    let body: Record<string, unknown> = {};
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        body = { lat: loc.coords.latitude, lng: loc.coords.longitude, accuracy: loc.coords.accuracy ?? undefined, mocked: (loc as any).mocked === true };
      }
    } catch {
      // Location is evidence only — clock-out never waits on it.
    }
    try {
      await post(`/attendance/shifts/${shiftId}/clock-out`, body);
      await load();
    } catch (e: any) {
      setMessage(e?.message ?? 'Couldn’t clock you out. Try again.');
    }
    setBusy(false);
  };

  return (
    <View style={styles.screen}>
      <AmbientOrbs intensity="subtle" />
      <SafeTop />
      <View style={styles.header}>
        <IconBtn onPress={() => navigation.goBack()}>
          <Icons.back color={colors.white} size={14} />
        </IconBtn>
        <StatusPill tone="mint">{finished ? '✓ DONE' : '● LIVE'}</StatusPill>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}>
        <View style={styles.timerBlock}>
          <Label color={colors.white40} style={{ marginBottom: 10 }}>
            {s?.clockInAt ? `Started at ${clock(s.clockInAt)}${finished && s.clockOutAt ? ` · finished ${clock(s.clockOutAt)}` : ''}` : 'Loading…'}
          </Label>
          <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
            <Text style={[styles.timer, { color: colors.electric }]}>{hrs}</Text>
            <Text style={styles.timer}>:{mns}:</Text>
            <Text style={[styles.timer, { color: colors.white50 }]}>{scs}</Text>
          </View>
          <Text style={styles.timerSub}>{s ? `${s.role} · ${s.venue}` : ' '}</Text>
        </View>

        {s && (
          <View style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={styles.progLabel}>{clock(s.startTime)} · in</Text>
              <Text style={styles.progLabel}>{clock(s.endTime)} · out</Text>
            </View>
            <View style={styles.progTrack}>
              <LinearGradient
                colors={[colors.electric, colors.volt]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ width: `${Math.round(progress * 100)}%`, height: '100%', borderRadius: 999 }}
              />
            </View>
          </View>
        )}

        {s && (
          <View style={styles.earningsCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Label>{view?.settlement ? 'You’ll receive' : 'Shift pay'}</Label>
              {!finished && <Text style={{ fontSize: 10, color: colors.electric }}>● On shift</Text>}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
              <Text style={styles.earningsKES}>KES {(view?.settlement?.netKes ?? s.rateKes).toLocaleString()}</Text>
              {view?.settlement ? <Text style={styles.earningsOf}>after KES {view.settlement.deductionsKes.toLocaleString()} statutory deductions</Text> : null}
            </View>
            <Text style={styles.earningsSub}>
              {!view?.settlement && 'Your pay is worked out when you clock out.'}
              {view?.settlement?.status === 'AWAITING_APPROVAL' && `The venue checks your hours — approved automatically by ${clock(view.settlement.approveBy)}.`}
              {view?.settlement?.status === 'APPROVED' && 'Approved. Sent to your M-Pesa once Klokd payments go live.'}
              {view?.settlement?.status === 'DISPUTED' && 'On hold — the venue reported a problem. Klokd will contact you.'}
              {view?.settlement?.status === 'PAID' && 'Paid to your M-Pesa.'}
            </Text>
          </View>
        )}

        {message ? <Text style={styles.message}>{message}</Text> : null}

        <TouchableOpacity style={styles.disputeBtn} activeOpacity={0.7} onPress={() => shiftId && navigation.navigate('ReportProblem', { id: shiftId })}>
          <Icons.dispute color={colors.warning} size={13} />
          <Text style={styles.disputeText}>Something's wrong with this shift</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.footer}>
        {finished ? (
          <GradientBtn onPress={() => navigation.popToTop()}>Done</GradientBtn>
        ) : (
          <GradientBtn disabled={busy || !s} onPress={handleClockOut}>{busy ? 'Clocking out…' : 'Clock out'}</GradientBtn>
        )}
        <Text style={styles.footerNote}>
          {finished ? 'We’ll let you know when it’s approved.' : 'Your location is checked once when you clock out.'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  message: { fontSize: 12.5, color: colors.warning, textAlign: 'center', fontWeight: '600', marginBottom: 12 },
  header: { paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  timerBlock: { alignItems: 'center', paddingVertical: 18 },
  timer: { fontSize: 56, fontWeight: '900', fontFamily: typography.mono, letterSpacing: -1.68, color: colors.white, lineHeight: 56 },
  timerSub: { fontSize: 11, color: colors.white40, marginTop: 6 },

  progLabel: { fontSize: 10, color: colors.white45 },
  progTrack: { height: 5, borderRadius: 999, backgroundColor: colors.white06, overflow: 'hidden' },

  earningsCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderWidth: 1, borderColor: colors.white06,
    marginBottom: 12,
  },
  earningsKES: { fontSize: 28, fontWeight: '900', color: colors.white, fontFamily: typography.mono, letterSpacing: -0.84 },
  earningsOf: { fontSize: 12, color: colors.white40 },
  earningsSub: { fontSize: 10.5, color: colors.white45, marginTop: 6 },

  empRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderWidth: 1, borderColor: colors.white06,
    marginBottom: 12,
  },
  empAvatar: { width: 34, height: 34, borderRadius: 9, backgroundColor: colors.white05, alignItems: 'center', justifyContent: 'center' },
  empInitials: { fontSize: 11, fontWeight: '900', color: colors.white },
  empTitle: { fontSize: 12.5, fontWeight: '700', color: colors.white },
  empSub: { fontSize: 10.5, color: colors.white50 },
  waBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: 'rgba(0,229,160,0.1)', borderWidth: 1, borderColor: 'rgba(0,229,160,0.25)' },
  waText: { fontSize: 11, fontWeight: '700', color: colors.electric },

  disputeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    paddingVertical: 10, borderRadius: 11,
    borderWidth: 1, borderColor: 'rgba(255,179,71,0.25)',
    backgroundColor: 'transparent',
  },
  disputeText: { fontSize: 11.5, color: colors.warning, fontWeight: '600' },

  footer: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 18, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.white06, alignItems: 'center' },
  footerNote: { fontSize: 10, color: colors.white40, marginTop: 8 },
});
