/**
 * Post Shift — Role chips + When + Workers stepper + Pay (market band) + Flash-fill toggle + Sticky cost summary.
 * Ported 1:1 from claude-design/screens/employer-main.jsx (EmpPostShift)
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GradientBtn, Chip, Label, IconBtn } from '../../components/Primitives';
import { Stepper, MoneyLine } from '../../components/EmployerPrimitives';
import { Icons } from '../../components/Icons';
import { IE } from '../../components/IconsEmployer';
import { useApi } from '../../hooks/useApi';
import { colors, typography } from '../../theme';

type Props = { navigation: NativeStackNavigationProp<any> };

const ROLES = ['Waiter', 'Barista', 'Bartender', 'Cashier', 'Kitchen', 'Cleaner'];
const DATES = ['Tonight', 'Tomorrow', 'Fri', 'Sat', 'Sun', 'Pick'];
const PAY_PRESETS = [1600, 1800, 2000, 2200];

export function PostShiftScreen({ navigation }: Props) {
  const { post } = useApi();
  const [role, setRole] = useState('Waiter');
  const [date, setDate] = useState('Tonight');
  const [workers, setWorkers] = useState(3);
  const [pay, setPay] = useState(1800);
  const [urgent, setUrgent] = useState(false);
  const [posting, setPosting] = useState(false);

  const hours = 5;
  const subtotal = pay * workers;
  const fee = Math.round(subtotal * 0.04);
  const total = subtotal + fee;
  const rateMin = 1500, rateMax = 2200;

  const handlePost = async () => {
    setPosting(true);
    try {
      const now = new Date();
      const start = new Date(now); start.setHours(17, 0, 0, 0);
      const end = new Date(now); end.setHours(22, 0, 0, 0);
      const shift = await post<any>('/shifts', {
        role, date: now.toISOString(),
        startTime: start.toISOString(), endTime: end.toISOString(),
        rateKes: pay,
        locationLat: -1.2636, locationLng: 36.8036, locationName: 'Westlands',
      });
      navigation.navigate('SelectWorker', { shiftId: shift?.id });
    } catch {
      navigation.navigate('SelectWorker', {});
    }
    setPosting(false);
  };

  // Position dot on band
  const dotPct = ((pay - rateMin) / (rateMax - rateMin)) * 100;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <IconBtn onPress={() => navigation.goBack()}>
          <Icons.back color={colors.white} size={14} />
        </IconBtn>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrowSm}>NEW SHIFT</Text>
          <Text style={styles.title}>Post a shift</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 200 }}>
        {/* Role */}
        <View style={{ marginBottom: 18 }}>
          <Text style={styles.fieldLabel}>Role</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {ROLES.map(r => (
              <Chip key={r} active={role === r} onPress={() => setRole(r)}>{r}</Chip>
            ))}
          </View>
        </View>

        {/* When */}
        <View style={{ marginBottom: 18 }}>
          <Text style={styles.fieldLabel}>When</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {DATES.map(d => (
              <Chip key={d} active={date === d} onPress={() => setDate(d)}>{d}</Chip>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={[styles.timeBox, { flex: 1 }]}>
              <Text style={styles.timeLabel}>Start</Text>
              <Text style={styles.timeValue}>17:00</Text>
            </View>
            <View style={[styles.timeBox, { flex: 1 }]}>
              <Text style={styles.timeLabel}>End</Text>
              <Text style={styles.timeValue}>22:00</Text>
            </View>
            <View style={styles.hoursBox}>
              <Text style={styles.hoursText}>{hours}h</Text>
            </View>
          </View>
        </View>

        {/* Workers */}
        <View style={styles.workersBox}>
          <Text style={[styles.fieldLabel, { marginBottom: 10 }]}>Workers needed</Text>
          <Stepper value={workers} onChange={setWorkers} min={1} max={20} suffix={workers === 1 ? 'worker' : 'workers'} />
        </View>

        {/* Pay */}
        <View style={{ marginBottom: 18 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={styles.fieldLabel}>Pay per worker</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <IE.trend color={colors.electric} size={10} />
              <Text style={{ fontSize: 10, color: colors.electric, fontWeight: '700' }}>Market band</Text>
            </View>
          </View>
          <View style={styles.payCard}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 14 }}>
              <Text style={styles.payKES}>KES</Text>
              <Text style={styles.payAmount}>{pay.toLocaleString()}</Text>
              <Text style={styles.payHourly}>{Math.round(pay / hours)}/h</Text>
            </View>

            {/* Rate band */}
            <View style={styles.bandContainer}>
              <View style={styles.bandTrack} />
              <View style={styles.bandSweet} />
              <View style={[styles.bandDot, { left: `${Math.max(0, Math.min(100, dotPct))}%` }]} />
              <Text style={[styles.bandLabel, { left: 0 }]}>KES {rateMin}</Text>
              <Text style={[styles.bandLabel, { right: 0 }]}>KES {rateMax}</Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
              {PAY_PRESETS.map(p => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setPay(p)}
                  activeOpacity={0.7}
                  style={[
                    styles.payPreset,
                    pay === p
                      ? { borderWidth: 1.5, borderColor: colors.electric, backgroundColor: 'rgba(0,229,160,0.08)' }
                      : { borderWidth: 1, borderColor: colors.white08 },
                  ]}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: pay === p ? colors.electric : colors.white65 }}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start', marginTop: 10 }}>
              <Icons.shield color={colors.volt} size={11} />
              <Text style={styles.expect}>
                At <Text style={{ color: colors.electric, fontWeight: '700' }}>KES {pay}</Text>, expect ~<Text style={{ color: colors.white, fontWeight: '700' }}>11 min</Text> to fill with verified workers.
              </Text>
            </View>
          </View>
        </View>

        {/* Urgent toggle */}
        <TouchableOpacity
          onPress={() => setUrgent(!urgent)}
          activeOpacity={0.7}
          style={[
            styles.urgentBtn,
            urgent
              ? { borderWidth: 1.5, borderColor: colors.volt, backgroundColor: colors.voltAlpha['22'] }
              : { borderWidth: 1, borderColor: colors.white08, backgroundColor: colors.white02 },
          ]}
        >
          <View style={[styles.urgentIcon, { backgroundColor: urgent ? colors.voltAlpha['22'] : colors.white04 }]}>
            <IE.flash color={urgent ? colors.volt : colors.white50} size={14} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.urgentTitle}>Flash-fill · push to top workers first</Text>
            <Text style={styles.urgentSub}>+KES 40/worker · fills 3× faster</Text>
          </View>
          <View style={[styles.switchTrack, { backgroundColor: urgent ? colors.volt : colors.white10 }]}>
            <View style={[styles.switchThumb, { backgroundColor: urgent ? colors.ink : colors.white, transform: [{ translateX: urgent ? 14 : 0 }] }]} />
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* Sticky summary */}
      <View style={styles.stickyFooter}>
        <View style={styles.costSummary}>
          <MoneyLine label={`${workers} × KES ${pay}`} value={`KES ${subtotal.toLocaleString()}`} />
          <MoneyLine label="Klokd service fee · 4%" value={`KES ${fee.toLocaleString()}`} muted />
          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.white08, marginVertical: 4 }} />
          <MoneyLine label="Held in escrow" value={`KES ${total.toLocaleString()}`} bold big tone="mint" />
        </View>
        <GradientBtn onPress={handlePost} disabled={posting}>
          {posting ? 'Posting…' : `Post shift · hold KES ${total.toLocaleString()}`}
        </GradientBtn>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  header: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  eyebrowSm: { fontSize: 10.5, color: colors.white40, letterSpacing: 1.26, textTransform: 'uppercase', fontWeight: '700' },
  title: { fontSize: 16, fontWeight: '900', letterSpacing: -0.32, color: colors.white },

  fieldLabel: { fontSize: 10, color: colors.white55, letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: '700', marginBottom: 8 },

  timeBox: { paddingHorizontal: 13, paddingVertical: 11, borderRadius: 12, backgroundColor: colors.white04, borderWidth: 1, borderColor: colors.white08 },
  timeLabel: { fontSize: 9.5, color: colors.white40, letterSpacing: 1, textTransform: 'uppercase', fontWeight: '700' },
  timeValue: { fontSize: 16, fontWeight: '800', color: colors.white, fontFamily: typography.mono, marginTop: 2 },
  hoursBox: { paddingHorizontal: 13, paddingVertical: 11, borderRadius: 12, backgroundColor: colors.voltAlpha['07'], borderWidth: 1, borderColor: 'rgba(188,255,78,0.2)', justifyContent: 'center' },
  hoursText: { fontSize: 13, fontWeight: '900', color: colors.volt, fontFamily: typography.mono },

  workersBox: { marginBottom: 18, padding: 14, borderRadius: 14, backgroundColor: colors.white02, borderWidth: 0.5, borderColor: colors.white06 },

  payCard: { padding: 14, borderRadius: 14, backgroundColor: colors.white02, borderWidth: 1, borderColor: colors.white06 },
  payKES: { fontSize: 12, color: colors.white50, fontWeight: '700' },
  payAmount: { fontSize: 32, fontWeight: '900', color: colors.white, letterSpacing: -1.28, fontFamily: typography.mono },
  payHourly: { fontSize: 12, color: colors.white45, marginLeft: 'auto' },
  bandContainer: { position: 'relative', height: 32, marginBottom: 6 },
  bandTrack: { position: 'absolute', left: 0, right: 0, top: 14, height: 4, borderRadius: 999, backgroundColor: colors.white06 },
  bandSweet: { position: 'absolute', left: '20%', right: '15%', top: 14, height: 4, borderRadius: 999, backgroundColor: colors.electricAlpha['33'] },
  bandDot: { position: 'absolute', top: 9, width: 14, height: 14, borderRadius: 7, backgroundColor: colors.electric, borderWidth: 3, borderColor: colors.ink, marginLeft: -7 },
  bandLabel: { position: 'absolute', top: 0, fontSize: 9.5, color: colors.white40, fontFamily: typography.mono },

  payPreset: { flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center' },
  expect: { fontSize: 10.5, color: colors.white50, lineHeight: 15.2, flex: 1 },

  urgentBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 12,
  },
  urgentIcon: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  urgentTitle: { fontSize: 12.5, fontWeight: '800', color: colors.white },
  urgentSub: { fontSize: 10.5, color: colors.white55 },
  switchTrack: { width: 32, height: 18, borderRadius: 999, padding: 2 },
  switchThumb: { width: 14, height: 14, borderRadius: 7 },

  stickyFooter: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 22, backgroundColor: colors.ink, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.white06 },
  costSummary: {
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.white04,
    borderWidth: 0.5, borderColor: colors.white08,
    marginBottom: 10,
  },
});
