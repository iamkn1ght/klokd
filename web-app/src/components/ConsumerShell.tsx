/**
 * ConsumerShell — top-nav chrome for worker + employer personas (consumer
 * surfaces, not the admin console). Stripe/Linear top-tab pattern.
 *
 *   ┌───────────────────────────────────────────────────────────────┐
 *   │ Klokd · Worker  Home  Shifts  Pay  Me      Switch ↔  [AM]     │
 *   ├───────────────────────────────────────────────────────────────┤
 *   │                                                               │
 *   │   <children — page content>                                   │
 *   │                                                               │
 *   └───────────────────────────────────────────────────────────────┘
 */
import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Platform } from 'react-native';
import { AmbientOrbs } from './KlokdLayout';
import { Logo, Avatar } from './Primitives';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius } from '../theme';

export interface ShellNavItem<K extends string = string> {
  key: K;
  label: string;
  badge?: number;
}

export function ConsumerShell<K extends string>({
  persona,
  accent,
  nav,
  active,
  onChange,
  onSwitchWorkspace,
  children,
}: {
  persona: 'Worker' | 'Employer';
  accent: string;
  nav: ShellNavItem<K>[];
  active: K;
  onChange: (k: K) => void;
  onSwitchWorkspace?: () => void;
  children: React.ReactNode;
}) {
  const { account } = useAuth();

  return (
    <View style={styles.root}>
      <AmbientOrbs intensity="subtle" />

      <View style={styles.topbar}>
        <View style={styles.topbarInner}>
          <View style={styles.topbarLeft}>
            <Logo size={28} subtitle={persona.toLowerCase()} />
            <View style={styles.divider} />
            <View style={styles.tabs}>
              {nav.map(item => {
                const isActive = item.key === active;
                return (
                  <Pressable
                    key={item.key}
                    onPress={() => onChange(item.key)}
                    style={({ hovered }: any) => [
                      styles.tab,
                      hovered && !isActive && styles.tabHover,
                      isActive && { ...styles.tabActive, borderBottomColor: accent },
                    ]}
                  >
                    <Text style={[styles.tabText, isActive && { color: colors.white }]}>{item.label}</Text>
                    {item.badge ? (
                      <View style={[styles.tabBadge, { backgroundColor: accent }]}>
                        <Text style={styles.tabBadgeText}>{item.badge}</Text>
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.topbarRight}>
            {onSwitchWorkspace && (
              <Pressable
                onPress={onSwitchWorkspace}
                style={({ hovered }: any) => [styles.switch, hovered && { backgroundColor: colors.white08, borderColor: colors.white25 }]}
              >
                <Text style={styles.switchText}>↔ Switch workspace</Text>
              </Pressable>
            )}
            <View style={styles.bellWrap}>
              <Text style={styles.bell}>🔔</Text>
              <View style={[styles.bellDot, { backgroundColor: accent }]} />
            </View>
            {account ? (
              <View style={styles.accountChip}>
                <Avatar initials={account.initials} size={32} tone={persona === 'Worker' ? 'electric' : 'volt'} />
                <View>
                  <Text style={styles.accountName}>{account.name}</Text>
                  <Text style={styles.accountEmail}>{account.email}</Text>
                </View>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollInner} bounces={false}>
        <View style={styles.maxWidth}>{children}</View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  topbar: {
    backgroundColor: 'rgba(10,10,15,0.85)',
    borderBottomWidth: 1,
    borderBottomColor: colors.white06,
    ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(20px)' } as any) : {}),
  },
  topbarInner: {
    maxWidth: 1240,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  topbarLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, flex: 1, minWidth: 0 },
  divider: { width: 1, height: 22, backgroundColor: colors.white10 },
  tabs: { flexDirection: 'row', alignItems: 'center', gap: 2, flexShrink: 1 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 8, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabHover: { backgroundColor: colors.white06 },
  tabActive: { backgroundColor: 'transparent', borderRadius: 0 },
  tabText: { color: colors.white55, fontSize: 13.5, fontWeight: '700', letterSpacing: -0.2 },
  tabBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999, minWidth: 18, alignItems: 'center' },
  tabBadgeText: { color: colors.ink, fontSize: 10, fontWeight: '900' },

  topbarRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  switch: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: colors.white15, backgroundColor: colors.white03 },
  switchText: { color: colors.white75, fontSize: 12, fontWeight: '700', letterSpacing: -0.1 },
  bellWrap: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: colors.white08, backgroundColor: colors.white03, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  bell: { fontSize: 13 },
  bellDot: { position: 'absolute', top: 7, right: 7, width: 7, height: 7, borderRadius: 4, borderWidth: 1.5, borderColor: colors.ink },

  accountChip: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.white03, borderWidth: 1, borderColor: colors.white08 },
  accountName: { color: colors.white, fontSize: 12.5, fontWeight: '800', letterSpacing: -0.15 },
  accountEmail: { color: colors.white45, fontSize: 10.5, marginTop: 1 },

  scroll: { flex: 1 },
  scrollInner: { paddingBottom: spacing.xxxl + 32 },
  maxWidth: { maxWidth: 1240, width: '100%', alignSelf: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
});
