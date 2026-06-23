/**
 * AdminShell — the persistent chrome for the admin app.
 *
 *   ┌─────────┬───────────────────────────────────────┐
 *   │         │  top bar: page title · search · bell  │
 *   │  side   ├───────────────────────────────────────┤
 *   │  rail   │                                       │
 *   │         │   <children — page content>           │
 *   │         │                                       │
 *   └─────────┴───────────────────────────────────────┘
 *
 * On narrow viewports (<900px) the side rail collapses to icons only.
 * Below 600px it would slide off entirely (mobile drill-down) — we currently
 * just shrink; we don't ship a full mobile nav since admin is desktop-first.
 */
import React from 'react';
import { View, Text, Pressable, useWindowDimensions, StyleSheet, ScrollView, Platform } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { AmbientOrbs } from './KlokdLayout';
import { Logo, Avatar, PulseDot } from './Primitives';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius } from '../theme';

export type AdminRoute = 'overview' | 'verification' | 'disputes' | 'payments' | 'audit' | 'users';

interface NavItem {
  key: AdminRoute;
  label: string;
  icon: 'home' | 'shield' | 'flag' | 'cash' | 'doc' | 'users';
  badge?: number;
}

const NAV: NavItem[] = [
  { key: 'overview', label: 'Overview', icon: 'home' },
  { key: 'verification', label: 'Verification', icon: 'shield', badge: 12 },
  { key: 'disputes', label: 'Disputes', icon: 'flag', badge: 3 },
  { key: 'payments', label: 'Payments', icon: 'cash' },
  { key: 'audit', label: 'Audit log', icon: 'doc' },
  { key: 'users', label: 'Users', icon: 'users' },
];

function NavIcon({ name, color, size = 18 }: { name: NavItem['icon']; color: string; size?: number }) {
  const p = { stroke: color, strokeWidth: 1.7, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (name) {
    case 'home':
      return (
        <Svg width={size} height={size} viewBox="0 0 20 20">
          <Path d="M3 10l7-6 7 6v7a1 1 0 0 1-1 1h-4v-5H8v5H4a1 1 0 0 1-1-1z" {...p} />
        </Svg>
      );
    case 'shield':
      return (
        <Svg width={size} height={size} viewBox="0 0 20 20">
          <Path d="M10 2l7 2v6c0 4.5-3.5 7-7 8-3.5-1-7-3.5-7-8V4z" {...p} />
          <Path d="M7 10l2 2 4-5" {...p} />
        </Svg>
      );
    case 'flag':
      return (
        <Svg width={size} height={size} viewBox="0 0 20 20">
          <Path d="M4 3v15M4 4h11l-2 4 2 4H4" {...p} />
        </Svg>
      );
    case 'cash':
      return (
        <Svg width={size} height={size} viewBox="0 0 20 20">
          <Path d="M3 5h14v10H3z" {...p} />
          <Circle cx="10" cy="10" r="2.4" {...p} />
          <Path d="M5 8v4M15 8v4" {...p} />
        </Svg>
      );
    case 'doc':
      return (
        <Svg width={size} height={size} viewBox="0 0 20 20">
          <Path d="M4 2h8l4 4v12H4z" {...p} />
          <Path d="M12 2v4h4M7 10h6M7 13h6M7 7h2" {...p} />
        </Svg>
      );
    case 'users':
      return (
        <Svg width={size} height={size} viewBox="0 0 20 20">
          <Circle cx="7" cy="7" r="2.6" {...p} />
          <Path d="M2 16c.6-3 2.4-4.5 5-4.5s4.4 1.5 5 4.5M13 12c2 0 3.5 1.2 4.2 3.5" {...p} />
          <Circle cx="14" cy="7.5" r="2.2" {...p} />
        </Svg>
      );
  }
}

export function AdminShell({
  route,
  onRouteChange,
  pageTitle,
  pageSubtitle,
  pageAction,
  children,
}: {
  route: AdminRoute;
  onRouteChange: (r: AdminRoute) => void;
  pageTitle: string;
  pageSubtitle?: string;
  pageAction?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { width } = useWindowDimensions();
  const { operator } = useAuth();
  const compact = width < 1080;
  const railWidth = compact ? 72 : 232;

  return (
    <View style={styles.root}>
      <AmbientOrbs />

      {/* ─── Side rail ─── */}
      <View style={[styles.rail, { width: railWidth }]}>
        <View style={styles.railTop}>
          {compact ? (
            <View style={styles.railLogoCompact}>
              <Text style={styles.railLogoCompactText}>K</Text>
            </View>
          ) : (
            <Logo size={26} />
          )}
        </View>

        <View style={styles.railSection}>
          {!compact && <Text style={styles.railSectionLabel}>WORKSPACE</Text>}
          {NAV.map(item => {
            const active = item.key === route;
            return (
              <Pressable
                key={item.key}
                onPress={() => onRouteChange(item.key)}
                style={({ hovered }: any) => [
                  styles.railItem,
                  compact && styles.railItemCompact,
                  active && styles.railItemActive,
                  hovered && !active && styles.railItemHover,
                ]}
              >
                <View style={[styles.railIconWrap, active && styles.railIconWrapActive]}>
                  <NavIcon name={item.icon} color={active ? colors.electric : colors.white60} />
                </View>
                {!compact && (
                  <Text style={[styles.railItemText, active && styles.railItemTextActive]}>
                    {item.label}
                  </Text>
                )}
                {!compact && item.badge ? (
                  <View style={styles.railBadge}>
                    <Text style={styles.railBadgeText}>{item.badge}</Text>
                  </View>
                ) : null}
                {compact && item.badge ? <View style={styles.railBadgeDot} /> : null}
              </Pressable>
            );
          })}
        </View>

        <View style={{ flex: 1 }} />

        <View style={styles.railOperator}>
          {operator ? (
            compact ? (
              <Avatar initials={operator.initials} size={36} />
            ) : (
              <View style={styles.opCard}>
                <Avatar initials={operator.initials} size={36} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.opName}>{operator.name}</Text>
                  <Text style={styles.opRole}>{operator.role.toUpperCase()}</Text>
                </View>
                <View style={styles.opDot}>
                  <PulseDot size={6} />
                </View>
              </View>
            )
          ) : null}
        </View>
      </View>

      {/* ─── Main column ─── */}
      <View style={styles.main}>
        <View style={styles.topbar}>
          <View style={{ flex: 1 }}>
            <View style={styles.topbarTitleRow}>
              <Text style={styles.topbarTitle}>{pageTitle}</Text>
              <View style={styles.envChip}>
                <PulseDot size={6} color={colors.warning} />
                <Text style={styles.envChipText}>SANDBOX</Text>
              </View>
            </View>
            {pageSubtitle && <Text style={styles.topbarSubtitle}>{pageSubtitle}</Text>}
          </View>
          <View style={styles.topbarRight}>
            <View style={styles.searchBox}>
              <Svg width={14} height={14} viewBox="0 0 16 16">
                <Circle cx="7" cy="7" r="5" stroke={colors.white45} strokeWidth="1.6" fill="none" />
                <Path d="M11 11l3 3" stroke={colors.white45} strokeWidth="1.6" strokeLinecap="round" />
              </Svg>
              <Text style={styles.searchText}>Search workers, shifts, audit IDs…</Text>
              <View style={styles.kbd}><Text style={styles.kbdText}>⌘K</Text></View>
            </View>
            {pageAction}
          </View>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollInner} bounces={false}>
          {children}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink, flexDirection: 'row' },

  // Rail
  rail: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    borderRightWidth: 1,
    borderRightColor: colors.white06,
    backgroundColor: 'rgba(10,10,15,0.6)',
    ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(20px)' } as any) : {}),
  },
  railTop: { paddingHorizontal: spacing.xs, marginBottom: spacing.xxl },
  railLogoCompact: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.electric, alignItems: 'center', justifyContent: 'center' },
  railLogoCompactText: { color: colors.ink, fontSize: 18, fontWeight: '900' },

  railSection: { gap: 2 },
  railSectionLabel: { color: colors.white35, fontSize: 10, fontWeight: '900', letterSpacing: 1.2, paddingHorizontal: spacing.sm, marginBottom: spacing.sm },
  railItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm, paddingVertical: 9, borderRadius: 10, position: 'relative' },
  railItemCompact: { justifyContent: 'center', paddingHorizontal: 0 },
  railItemHover: { backgroundColor: colors.white04 },
  railItemActive: { backgroundColor: 'rgba(0,229,160,0.08)' },
  railIconWrap: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  railIconWrapActive: { backgroundColor: 'rgba(0,229,160,0.10)' },
  railItemText: { color: colors.white75, fontSize: 13.5, fontWeight: '700', letterSpacing: -0.2, flex: 1 },
  railItemTextActive: { color: colors.white },
  railBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, backgroundColor: colors.electric, minWidth: 22, alignItems: 'center' },
  railBadgeText: { color: colors.ink, fontSize: 10, fontWeight: '900' },
  railBadgeDot: { position: 'absolute', top: 6, right: 14, width: 6, height: 6, borderRadius: 3, backgroundColor: colors.electric },

  railOperator: { paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.white06 },
  opCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.lg, backgroundColor: colors.white03, borderWidth: 1, borderColor: colors.white06 },
  opName: { color: colors.white, fontSize: 12.5, fontWeight: '800', letterSpacing: -0.2 },
  opRole: { color: colors.white45, fontSize: 9.5, fontWeight: '700', letterSpacing: 0.6, marginTop: 1 },
  opDot: { width: 12, height: 12, alignItems: 'center', justifyContent: 'center' },

  // Main
  main: { flex: 1 },
  topbar: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.white06,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  topbarTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  topbarTitle: { color: colors.white, fontSize: 22, fontWeight: '900', letterSpacing: -0.8 },
  topbarSubtitle: { color: colors.white50, fontSize: 12.5, marginTop: 4, fontWeight: '500' },
  envChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(255,179,71,0.08)', borderWidth: 1, borderColor: 'rgba(255,179,71,0.28)' },
  envChipText: { color: colors.warning, fontSize: 10, fontWeight: '900', letterSpacing: 0.9 },

  topbarRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: 12, paddingVertical: 9, borderRadius: radius.lg, backgroundColor: colors.white03, borderWidth: 1, borderColor: colors.white08, minWidth: 320 },
  searchText: { color: colors.white45, fontSize: 12.5, fontWeight: '500', flex: 1 },
  kbd: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, backgroundColor: colors.white06, borderWidth: 1, borderColor: colors.white10 },
  kbdText: { color: colors.white60, fontSize: 10, fontWeight: '700' },

  scroll: { flex: 1 },
  scrollInner: { padding: spacing.xl, paddingBottom: spacing.xxxl + 24 },
});
