/**
 * Shifts tab — 3-section tabs (upcoming/active/history) with status pills.
 * Ported 1:1 from claude-design/screens/main.jsx
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { StatusPill } from '../../components/Primitives';
import { Icons } from '../../components/Icons';
import { colors, typography } from '../../theme';

type Section = 'upcoming' | 'active' | 'history';
type StatusKey = 'paid' | 'confirmed' | 'live' | 'disputed';

const toneMap: Record<StatusKey, 'mint' | 'volt' | 'warn'> = {
  paid: 'mint', confirmed: 'volt', live: 'mint', disputed: 'warn',
};
const labelMap: Record<StatusKey, string> = {
  paid: 'Paid', confirmed: 'Confirmed', live: 'Live', disputed: 'Disputed',
};

function HistRow({ role, venue, when, amount, status }: { role: string; venue: string; when: string; amount: string; status: StatusKey }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <Text style={styles.role}>{role}</Text>
          <StatusPill tone={toneMap[status]}>{labelMap[status]}</StatusPill>
        </View>
        <Text style={styles.venue}>{venue}</Text>
        <Text style={styles.when}>{when}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.amount}>{amount}</Text>
        <Text style={styles.kes}>KES</Text>
      </View>
    </View>
  );
}

export function ShiftsScreen() {
  const [section, setSection] = useState<Section>('upcoming');

  return (
    <View style={styles.screen}>
      <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
        <Text style={styles.title}>Your shifts</Text>
        <View style={styles.tabs}>
          {(['upcoming', 'active', 'history'] as Section[]).map(s => (
            <TouchableOpacity
              key={s}
              onPress={() => setSection(s)}
              activeOpacity={0.7}
              style={[
                styles.tab,
                section === s ? { backgroundColor: colors.ink, borderColor: colors.electricAlpha['25'] } : { borderColor: 'transparent' },
              ]}
            >
              <Text style={[styles.tabText, { color: section === s ? colors.electric : colors.white50 }]}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}>
        {section === 'upcoming' && (
          <>
            <HistRow role="Waiter" venue="Brew Bistro · Westlands" when="Tonight · 5 PM" amount="1,800" status="confirmed" />
            <HistRow role="Barista" venue="Java House · Sarit" when="Tomorrow · 7 AM" amount="2,100" status="confirmed" />
          </>
        )}
        {section === 'active' && (
          <HistRow role="Waiter" venue="Brew Bistro · Westlands" when="In progress · 02:23" amount="684" status="live" />
        )}
        {section === 'history' && (
          <>
            <HistRow role="Barista" venue="Java House · Sarit" when="2 Apr · 7 AM – 2 PM" amount="1,915" status="paid" />
            <HistRow role="Waiter" venue="Artcaffe · Westgate" when="31 Mar · 5 – 10 PM" amount="1,642" status="paid" />
            <HistRow role="Cashier" venue="Naivas · Kilimani" when="28 Mar · 9 AM – 5 PM" amount="1,460" status="paid" />
            <HistRow role="Waiter" venue="Brew Bistro · Kilimani" when="25 Mar · 6 – 11 PM" amount="2,006" status="paid" />
            <HistRow role="Dishwasher" venue="Pronto · CBD" when="22 Mar · 4 – 10 PM" amount="1,368" status="disputed" />
            <View style={styles.note}>
              <Icons.lock color={colors.white35} size={11} />
              <Text style={styles.noteText}>Records kept 7 years per Kenyan law.</Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  title: { fontSize: 22, fontWeight: '900', letterSpacing: -0.66, color: colors.white, marginBottom: 12 },
  tabs: {
    flexDirection: 'row', gap: 6,
    backgroundColor: colors.white04,
    padding: 3, borderRadius: 12,
    marginBottom: 16,
  },
  tab: {
    flex: 1, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1,
    alignItems: 'center',
  },
  tabText: { fontSize: 11.5, fontWeight: '700', letterSpacing: 0.21 },

  row: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderWidth: 1, borderColor: colors.white06,
    marginBottom: 8,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  role: { fontSize: 13, fontWeight: '700', color: colors.white },
  venue: { fontSize: 10.5, color: colors.white50, marginBottom: 1 },
  when: { fontSize: 10, color: colors.white40 },
  amount: { fontSize: 14, fontWeight: '900', color: colors.white, fontFamily: typography.mono, letterSpacing: -0.28 },
  kes: { fontSize: 9, color: colors.white35, letterSpacing: 0.45 },

  note: {
    marginTop: 16, paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.white02,
    borderWidth: 1, borderColor: colors.white04,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  noteText: { fontSize: 10, color: colors.white35, lineHeight: 14.5 },
});
