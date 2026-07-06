/**
 * Matched Workers — Fill meter + sort chips + worker list + no-show insurance note.
 * Ported 1:1 from claude-design/screens/employer-main.jsx (EmpMatched)
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Chip, Label, IconBtn, GradientBtn } from '../../components/Primitives';
import { AmbientOrbs, SafeTop } from '../../components/KlokdLayout';
import { WorkerCard, Worker } from '../../components/EmployerPrimitives';
import { Icons } from '../../components/Icons';
import { IE } from '../../components/IconsEmployer';
import { colors, gradients } from '../../theme';

type Props = { navigation: NativeStackNavigationProp<any> };

const EMP_WORKERS: Worker[] = [
  { id: 'w1', name: 'Akinyi O.', initials: 'AO', rating: 4.8, shifts: 47, showUp: 94, verified: true, badge: 'Worked here 3× · last Fri', avatarBg: ['#5B4A8A', '#2B1F52'], match: 98 },
  { id: 'w2', name: 'Kevin M.', initials: 'KM', rating: 4.7, shifts: 62, showUp: 96, verified: true, badge: 'Top 5% in Westlands', avatarBg: ['#3B6E5E', '#1B3E34'], match: 94 },
  { id: 'w3', name: 'Njeri W.', initials: 'NW', rating: 4.9, shifts: 31, showUp: 97, verified: true, badge: 'Worked similar venues', avatarBg: ['#8A5B3B', '#4E2E1B'], match: 91 },
  { id: 'w4', name: 'Brian K.', initials: 'BK', rating: 4.6, shifts: 88, showUp: 93, verified: true, badge: 'Available now · 0.9 km', avatarBg: ['#4B4B68', '#24243A'], match: 89 },
  { id: 'w5', name: 'Faith C.', initials: 'FC', rating: 4.8, shifts: 24, showUp: 100, verified: true, badge: 'Perfect show-up record', avatarBg: ['#6B3B5E', '#3B1E36'], match: 87 },
];

export function SelectWorkerScreen({ navigation }: Props) {
  const [accepted, setAccepted] = useState<string[]>([]);
  const need = 3;
  const left = need - accepted.length;
  const filled = accepted.length >= need;

  const accept = (id: string) => setAccepted(a => a.includes(id) ? a : [...a, id]);

  return (
    <View style={styles.screen}>
      <AmbientOrbs intensity="subtle" />
      <SafeTop />
      <View style={styles.header}>
        <IconBtn onPress={() => navigation.goBack()}>
          <Icons.back color={colors.white} size={14} />
        </IconBtn>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>MATCHED WORKERS</Text>
          <Text style={styles.title}>Waiter · tonight</Text>
        </View>
      </View>

      {/* Fill meter */}
      <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
        <LinearGradient
          colors={filled ? [colors.electricAlpha['22'], colors.electricAlpha['04']] : [colors.white03, colors.white03]}
          start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
          style={[
            styles.meterCard,
            { borderColor: filled ? 'rgba(0,229,160,0.4)' : colors.white06 },
          ]}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Label color={colors.white50}>Filling · {accepted.length}/{need}</Label>
            {filled ? (
              <Text style={{ fontSize: 10.5, color: colors.electric, fontWeight: '800', letterSpacing: 0.84 }}>ALL FILLED</Text>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <IE.flash color={colors.volt} size={10} />
                <Text style={{ fontSize: 10.5, color: colors.volt, fontWeight: '700' }}>
                  ~{left === need ? 11 : left * 4} min est.
                </Text>
              </View>
            )}
          </View>
          <View style={styles.meterTrack}>
            <LinearGradient
              colors={[gradients.cta[0], gradients.cta[1]]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ width: `${(accepted.length / need) * 100}%`, height: '100%' }}
            />
          </View>
        </LinearGradient>
      </View>

      {/* Sort chips */}
      <View style={{ paddingHorizontal: 20, paddingTop: 14, flexDirection: 'row', gap: 6 }}>
        <Chip active>Top match</Chip>
        <Chip>Nearest</Chip>
        <Chip>Worked here</Chip>
        <Chip>4.8+★</Chip>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: filled ? 120 : 140 }}>
        <View style={{ gap: 10 }}>
          {EMP_WORKERS.map(w => (
            <WorkerCard
              key={w.id}
              worker={w}
              match={w.match}
              accepted={accepted.includes(w.id)}
              onAccept={() => accept(w.id)}
            />
          ))}
        </View>

        <View style={styles.insuranceNote}>
          <Icons.shield color={colors.white55} size={14} />
          <Text style={styles.insuranceText}>
            Every accept is backed by <Text style={{ color: colors.electric, fontWeight: '700' }}>No-Show Insurance</Text>. If a worker doesn't arrive, we auto-replace within 20 min or refund.
          </Text>
        </View>
      </ScrollView>

      {filled && (
        <View style={styles.footer}>
          <GradientBtn onPress={() => navigation.popToTop()}>Confirm all 3 workers</GradientBtn>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  header: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  eyebrow: { fontSize: 10.5, color: colors.white40, letterSpacing: 1.26, textTransform: 'uppercase', fontWeight: '700' },
  title: { fontSize: 16, fontWeight: '900', letterSpacing: -0.32, color: colors.white },

  meterCard: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, borderWidth: 1 },
  meterTrack: { height: 5, borderRadius: 999, backgroundColor: colors.white08, overflow: 'hidden' },

  insuranceNote: {
    marginTop: 14, paddingHorizontal: 13, paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: colors.white02,
    borderWidth: 1, borderStyle: 'dashed', borderColor: colors.white10,
    flexDirection: 'row', gap: 9, alignItems: 'flex-start',
  },
  insuranceText: { flex: 1, fontSize: 11, color: colors.white60, lineHeight: 15.95 },

  footer: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 22, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.white06 },
});
