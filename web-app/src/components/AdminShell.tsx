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
import { api } from '../services/api';
import { colors, spacing, radius } from '../theme';

export type AdminRoute = 'overview' | 'verification' | 'attendance' | 'disputes' | 'payments' | 'privacy' | 'audit' | 'users';

interface NavItem {
  key: AdminRoute;
  label: string;
  icon: 'home' | 'shield' | 'clock' | 'flag' | 'cash' | 'doc' | 'users';
  badge?: number;
}

const NAV: NavItem[] = [
  { key: 'overview', label: 'Overview', icon: 'home' },
  { key: 'verification', label: 'Verification', icon: 'shield' },
  { key: 'attendance', label: 'Attendance', icon: 'clock' },
  { key: 'disputes', label: 'Disputes', icon: 'flag' },
  { key: 'payments', label: 'Payments', icon: 'cash' },
  { key: 'privacy', label: 'Data requests', icon: 'shield' },
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
    case 'clock':
      return (
        <Svg width={size} height={size} viewBox="0 0 20 20">
          <Path d="M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14z" {...p} />
          <Path d="M10 6.5V10l2.5 2" {...p} />
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
  onSignOut,
  children,
}: {
  route: AdminRoute;
  onRouteChange: (r: AdminRoute) => void;
  pageTitle: string;
  pageSubtitle?: string;
  pageAction?: React.ReactNode;
  onSignOut?: () => void;
  children: React.ReactNode;
}) {
  const { width } = useWindowDimensions();
  const { account, accessToken } = useAuth();
  // Live queue sizes on the rail (no hard-coded counts).
  const [badges, setBadges] = React.useState<Partial<Record<AdminRoute, number>>>({});
  React.useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    const load = () =>
      api<{ openDisputes: number; flaggedAttendance: number; openDataRequests: number; workers: number; verifiedWorkers: number }>('/admin/stats', { token: accessToken })
        .then(s => {
          if (cancelled) return;
          setBadges({
            disputes: s.openDisputes,
            attendance: s.flaggedAttendance,
            privacy: s.openDataRequests,
            verification: s.workers - s.verifiedWorkers,
          });
        })
        .catch(() => undefined);
    load();
    const t = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [accessToken]);
  const badgeFor = (k: AdminRoute) => badges[k] || 0;
  const [menuOpen, setMenuOpen] = React.useState(false);
  // <900px: phone — side rail becomes a slide-over drawer behind a hamburger.
  const mobile = width < 900;
  const compact = !mobile && width < 1080;
  const railWidth = compact ? 72 : 232;

  return (
    <View style={styles.root}>
      <AmbientOrbs />

      {/* ─── Mobile drawer ─── */}
      {mobile && menuOpen && (
        <Pressable
          accessibilityLabel="Close menu"
          onPress={() => setMenuOpen(false)}
          style={styles.drawerScrim}
        >
          <Pressable style={[styles.drawer, { width: 264 }]} onPress={undefined}>
            <View style={styles.drawerHead}>
              <Logo size={26} />
              <Pressable onPress={() => setMenuOpen(false)} hitSlop={12}>
                <Text style={styles.drawerClose}>✕</Text>
              </Pressable>
            </View>
            <View style={styles.railSection}>
              {NAV.map(item => {
                const active = item.key === route;
                return (
                  <Pressable
                    key={item.key}
                    onPress={() => {
                      onRouteChange(item.key);
                      setMenuOpen(false);
                    }}
                    style={[styles.railItem, active && styles.railItemActive]}
                  >
                    <View style={[styles.railIconWrap, active && styles.railIconWrapActive]}>
                      <NavIcon name={item.icon} color={active ? colors.electric : colors.white60} />
                    </View>
                    <Text style={[styles.railItemText, active && styles.railItemTextActive]}>{item.label}</Text>
                    {badgeFor(item.key) ? (
                      <View style={styles.railBadge}>
                        <Text style={styles.railBadgeText}>{badgeFor(item.key)}</Text>
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
            <View style={{ flex: 1 }} />
            {account ? (
              <View style={styles.opCard}>
                <Avatar initials={account.initials} size={36} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.opName}>{account.name}</Text>
                  <Text style={styles.opRole}>ADMIN</Text>
                </View>
              </View>
            ) : null}
            {onSignOut ? (
              <Pressable
                onPress={() => {
                  setMenuOpen(false);
                  onSignOut();
                }}
                style={styles.switchBtn}
              >
                <Text style={styles.switchBtnText}>Sign out</Text>
              </Pressable>
            ) : null}
          </Pressable>
        </Pressable>
      )}

      {/* ─── Side rail (desktop) ─── */}
      {!mobile && (
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
                {!compact && badgeFor(item.key) ? (
                  <View style={styles.railBadge}>
                    <Text style={styles.railBadgeText}>{badgeFor(item.key)}</Text>
                  </View>
                ) : null}
                {compact && badgeFor(item.key) ? <View style={styles.railBadgeDot} /> : null}
              </Pressable>
            );
          })}
        </View>

        <View style={{ flex: 1 }} />

        <View style={styles.railOperator}>
          {account ? (
            compact ? (
              <Avatar initials={account.initials} size={36} />
            ) : (
              <View style={styles.opCard}>
                <Avatar initials={account.initials} size={36} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.opName}>{account.name}</Text>
                  <Text style={styles.opRole}>ADMIN</Text>
                </View>
                <View style={styles.opDot}>
                  <PulseDot size={6} />
                </View>
              </View>
            )
          ) : null}
          {!compact && onSignOut ? (
            <Pressable
              onPress={onSignOut}
              style={({ hovered }: any) => [styles.switchBtn, hovered && { backgroundColor: colors.white08 }]}
            >
              <Text style={styles.switchBtnText}>Sign out</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
      )}

      {/* ─── Main column ─── */}
      <View style={styles.main}>
        <View style={[styles.topbar, mobile && styles.topbarMobile]}>
          {mobile && (
            <Pressable
              onPress={() => setMenuOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Open menu"
              style={({ hovered }: any) => [styles.burger, hovered && { backgroundColor: colors.white10 }]}
            >
              <Svg width={18} height={18} viewBox="0 0 20 20">
                <Path d="M3 5h14M3 10h14M3 15h14" stroke={colors.white85} strokeWidth="1.8" strokeLinecap="round" />
              </Svg>
            </Pressable>
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={styles.topbarTitleRow}>
              <Text style={[styles.topbarTitle, mobile && styles.topbarTitleMobile]} numberOfLines={1}>{pageTitle}</Text>
            </View>
            {pageSubtitle && !mobile && <Text style={styles.topbarSubtitle}>{pageSubtitle}</Text>}
          </View>
          {!mobile && (
            <View style={styles.topbarRight}>
              {pageAction}
            </View>
          )}
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollInner, mobile && styles.scrollInnerMobile]} bounces={false}>
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
  switchBtn: { marginTop: spacing.sm, paddingVertical: 9, paddingHorizontal: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.white08, alignItems: 'center' },
  switchBtnText: { color: colors.white75, fontSize: 12, fontWeight: '700', letterSpacing: -0.1 },

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
  topbarMobile: { paddingHorizontal: spacing.md, paddingTop: spacing.md, gap: spacing.sm },
  burger: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, borderColor: colors.white12, backgroundColor: colors.white03, alignItems: 'center', justifyContent: 'center' },
  topbarTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  topbarTitleMobile: { fontSize: 17, letterSpacing: -0.5, flexShrink: 1 },
  topbarTitle: { color: colors.white, fontSize: 22, fontWeight: '900', letterSpacing: -0.8 },
  topbarSubtitle: { color: colors.white50, fontSize: 12.5, marginTop: 4, fontWeight: '500' },
  envChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(255,179,71,0.08)', borderWidth: 1, borderColor: 'rgba(255,179,71,0.28)' },
  envChipText: { color: colors.warning, fontSize: 10, fontWeight: '900', letterSpacing: 0.9 },

  topbarRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },

  searchText: { color: colors.white45, fontSize: 12.5, fontWeight: '500', flex: 1 },

  scroll: { flex: 1 },
  scrollInner: { padding: spacing.xl, paddingBottom: spacing.xxxl + 24 },
  scrollInnerMobile: { padding: spacing.md, paddingBottom: spacing.xxxl + 24 },

  // Mobile drawer
  drawerScrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 40, flexDirection: 'row' },
  drawer: { backgroundColor: '#101018', borderRightWidth: 1, borderRightColor: colors.white10, paddingTop: spacing.xl, paddingBottom: spacing.lg, paddingHorizontal: spacing.md, height: '100%' as any },
  drawerHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xs, marginBottom: spacing.xxl },
  drawerClose: { color: colors.white60, fontSize: 16, fontWeight: '900' },
});
