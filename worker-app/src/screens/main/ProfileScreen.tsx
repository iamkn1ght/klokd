/**
 * Me tab — Profile hero + portable reputation + grouped rows (Account/Privacy/Support).
 * Ported 1:1 from claude-design/screens/main.jsx
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { Label, VLine } from '../../components/Primitives';
import { AmbientOrbs } from '../../components/KlokdLayout';
import { Icons } from '../../components/Icons';
import { colors } from '../../theme';

function Stat({ n, l, color, star }: { n: string; l: string; color: string; star?: boolean }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
        <Text style={{ fontSize: 18, fontWeight: '900', color, letterSpacing: -0.36 }}>{n}</Text>
        {star && <Icons.star color={color} size={11} />}
      </View>
      <Text style={{ fontSize: 9.5, color: colors.white40, letterSpacing: 0.76, textTransform: 'uppercase', marginTop: 3 }}>{l}</Text>
    </View>
  );
}

export function ProfileScreen() {
  const { logout } = useAuth();

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const rows = [
    {
      g: 'Account', items: [
        { k: 'Skills on file', v: 'Waiter, Barista, Bartender' },
        { k: 'Certificates', v: 'Food handlers (2025)' },
        { k: 'Phone & M-Pesa', v: '0722 ••• 500' },
      ]
    },
    {
      g: 'Privacy & Data', items: [
        { k: 'Manage consent', v: 'ID · GPS' },
        { k: 'Download my data', v: 'ZIP within 24 hrs' },
        { k: 'Correct my information', v: '7-day review' },
        { k: 'Delete my account', v: 'Payment records kept 7 yrs (law)', warn: true },
      ]
    },
    {
      g: 'Support', items: [
        { k: 'Help centre', v: '' },
        { k: 'Contact Klokd', v: 'WhatsApp · 9 AM – 9 PM' },
        { k: 'Sign out', v: '', warn: true, action: handleSignOut },
      ]
    },
  ];

  return (
    <View style={styles.screen}>
      <AmbientOrbs intensity="subtle" />
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        {/* Profile hero */}
        <View style={styles.hero}>
          <LinearGradient
            colors={[colors.electric, colors.volt]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>AK</Text>
          </LinearGradient>
          <Text style={styles.name}>Akinyi Koech</Text>
          <Text style={styles.subInfo}>Verified · ID ✓ · M-Pesa ✓</Text>
          <View style={styles.badge}>
            <Icons.shield color={colors.electric} size={11} />
            <Text style={styles.badgeText}>Verified worker</Text>
          </View>
        </View>

        {/* Portable reputation */}
        <View style={{ paddingHorizontal: 20 }}>
          <View style={styles.repCard}>
            <Label style={{ marginBottom: 10 }}>Your reputation · portable</Label>
            <View style={{ flexDirection: 'row' }}>
              <Stat n="94%" l="show-up" color={colors.electric} />
              <VLine />
              <Stat n="4.8" l="rating" color={colors.volt} star />
              <VLine />
              <Stat n="47" l="shifts" color={colors.white} />
            </View>
            <Text style={styles.repNote}>This record belongs to you. It stays with you across every employer on Klokd.</Text>
          </View>
        </View>

        {/* Grouped rows */}
        <View style={{ paddingHorizontal: 20 }}>
          {rows.map((g, gi) => (
            <View key={gi} style={{ marginBottom: 18 }}>
              <Label style={{ marginBottom: 8 }}>{g.g}</Label>
              <View style={styles.rowGroup}>
                {g.items.map((it: any, i) => (
                  <TouchableOpacity
                    key={i}
                    activeOpacity={0.7}
                    onPress={it.action}
                    style={[
                      styles.row,
                      i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.white05 },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12.5, fontWeight: '600', color: it.warn ? colors.warning : colors.white }}>{it.k}</Text>
                      {it.v ? <Text style={styles.rowSub}>{it.v}</Text> : null}
                    </View>
                    <Icons.chevron color={colors.white30} size={12} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
          <Text style={styles.footer}>klokd · v1.0 · beta</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  hero: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14 },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontSize: 26, fontWeight: '900', color: colors.ink, letterSpacing: -0.78 },
  name: { fontSize: 20, fontWeight: '900', letterSpacing: -0.4, color: colors.white },
  subInfo: { fontSize: 11, color: colors.white50, marginTop: 2 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colors.electricAlpha['08'],
    borderWidth: 1, borderColor: colors.electricAlpha['22'],
    marginTop: 10,
  },
  badgeText: { fontSize: 10.5, fontWeight: '700', color: colors.electric, letterSpacing: 0.42, textTransform: 'uppercase' },

  repCard: {
    paddingHorizontal: 16, paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: colors.white03,
    borderWidth: 1, borderColor: colors.white06,
    marginBottom: 14,
  },
  repNote: { marginTop: 10, fontSize: 10.5, color: colors.white40, lineHeight: 15.75 },

  rowGroup: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1, borderColor: colors.white06,
  },
  row: {
    paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.025)',
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  rowSub: { fontSize: 10.5, color: colors.white40, marginTop: 1 },

  footer: { textAlign: 'center', fontSize: 9.5, color: colors.white25, letterSpacing: 0.95, textTransform: 'uppercase', marginTop: 10 },
});
