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
import { View, Text, Pressable, ScrollView, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { AmbientOrbs } from './KlokdLayout';
import { Logo, Avatar } from './Primitives';
import { useAuth } from '../context/AuthContext';
import { NotificationBell } from './NotificationBell';
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
  onSignOut,
  children,
}: {
  persona: 'Worker' | 'Employer';
  accent: string;
  nav: ShellNavItem<K>[];
  active: K;
  onChange: (k: K) => void;
  onSignOut?: () => void;
  children: React.ReactNode;
}) {
  const { account } = useAuth();
  const { width } = useWindowDimensions();
  // <760px: phone — stacked header, icon-ish tabs, condensed account chip.
  const mobile = width < 760;

  return (
    <View style={styles.root}>
      <AmbientOrbs intensity="subtle" />

      <View style={styles.topbar}>
        <View style={[styles.topbarInner, mobile && styles.topbarInnerMobile]}>
          <View style={[styles.topbarLeft, mobile && styles.topbarLeftMobile]}>
            <View style={styles.brandRow}>
              <Logo size={28} subtitle={mobile ? undefined : persona.toLowerCase()} />
              {mobile && (
                <Text style={styles.brandPersona}>· {persona.toLowerCase()}</Text>
              )}
            </View>
            {!mobile && <View style={styles.divider} />}
            <View style={[styles.tabs, mobile && styles.tabsMobile]}>
              {nav.map(item => {
                const isActive = item.key === active;
                return (
                  <Pressable
                    key={item.key}
                    onPress={() => onChange(item.key)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: isActive }}
                    style={({ hovered }: any) => [
                      styles.tab,
                      mobile && styles.tabMobile,
                      hovered && !isActive && styles.tabHover,
                      isActive && { ...styles.tabActive, borderBottomColor: accent },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        mobile && styles.tabTextMobile,
                        isActive && { color: colors.white },
                      ]}
                      numberOfLines={1}
                    >
                      {item.label}
                    </Text>
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

          <View style={[styles.topbarRight, mobile && styles.topbarRightMobile]}>
            <NotificationBell />
            {account ? (
              <View style={[styles.accountChip, mobile && styles.accountChipMobile]}>
                <Avatar initials={account.initials} size={32} tone={persona === 'Worker' ? 'electric' : 'volt'} />
                {!mobile && (
                  <View>
                    <Text style={styles.accountName}>{account.name}</Text>
                    <Text style={styles.accountEmail}>{account.phone ?? ''}</Text>
                  </View>
                )}
              </View>
            ) : null}
            {onSignOut && (
              <Pressable
                onPress={onSignOut}
                accessibilityRole="button"
                style={({ hovered }: any) => [styles.switch, hovered && { backgroundColor: colors.white08, borderColor: colors.white25 }]}
              >
                <Text style={styles.switchText}>Sign out</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollInner} bounces={false}>
        <View style={[styles.maxWidth, mobile && styles.maxWidthMobile]}>{children}</View>
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
  topbarInnerMobile: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, flexWrap: 'wrap', gap: spacing.sm },
  topbarLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, flex: 1, minWidth: 0 },
  topbarLeftMobile: { flex: 1, flexBasis: '100%', justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  brandPersona: { color: colors.white60, fontSize: 13, fontWeight: '700' },
  divider: { width: 1, height: 22, backgroundColor: colors.white10 },
  tabs: { flexDirection: 'row', alignItems: 'center', gap: 2, flexShrink: 1 },
  tabsMobile: { flexWrap: 'wrap', gap: 0 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 8, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabMobile: { paddingHorizontal: 10, paddingVertical: 10 },
  tabTextMobile: { fontSize: 12.5 },
  tabHover: { backgroundColor: colors.white06 },
  tabActive: { backgroundColor: 'transparent', borderRadius: 0 },
  tabText: { color: colors.white55, fontSize: 13.5, fontWeight: '700', letterSpacing: -0.2 },
  tabBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999, minWidth: 18, alignItems: 'center' },
  tabBadgeText: { color: colors.ink, fontSize: 10, fontWeight: '900' },

  topbarRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  topbarRightMobile: { gap: spacing.xs },
  switch: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: colors.white15, backgroundColor: colors.white03 },
  switchText: { color: colors.white75, fontSize: 12, fontWeight: '700', letterSpacing: -0.1 },
  switchIcon: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: colors.white15, backgroundColor: colors.white03, alignItems: 'center', justifyContent: 'center' },
  switchIconText: { color: colors.white75, fontSize: 15, fontWeight: '900' },
  accountChip: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.white03, borderWidth: 1, borderColor: colors.white08 },
  accountChipMobile: { paddingHorizontal: 3, paddingVertical: 3 },
  accountName: { color: colors.white, fontSize: 12.5, fontWeight: '800', letterSpacing: -0.15 },
  accountEmail: { color: colors.white45, fontSize: 10.5, marginTop: 1 },

  scroll: { flex: 1 },
  scrollInner: { paddingBottom: spacing.xxxl + 32 },
  maxWidth: { maxWidth: 1240, width: '100%', alignSelf: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  maxWidthMobile: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
});
