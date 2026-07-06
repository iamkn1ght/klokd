/**
 * Worker Welcome — same design backbone as the v5 employer Welcome (locked
 * 23 Jun 2026). Uses KlokdLayout primitives so the visual language stays
 * unified across both apps: ambient electric orbs, dot-grid texture, glass
 * cards, motion (520ms ease-out-quart), premium hover states.
 *
 * Worker-side content: find shifts → apply → clock in → get paid by M-Pesa.
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { ScrollView } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Logo, GradientBtn, Eyebrow, Label } from '../../components/Primitives';
import { KlokdScreen, FadeUp, GlassCard, HoverCard, LiveDot, AmbientOrbs, PressScale, EASE } from '../../components/KlokdLayout';
import { colors, spacing, radius } from '../../theme';

type Props = { navigation: NativeStackNavigationProp<any> };

// ─── Data ─────────────────────────────────────────────────

const METRICS = [
  { k: '16,412', l: 'shifts paid', delta: '+342 this week' },
  { k: '94.2%', l: 'show-up rate', delta: 'across 2,847 workers' },
  { k: 'KES 1,823', l: 'avg pay / shift', delta: '+6% YoY' },
  { k: '18 min', l: 'clock-out → M-Pesa', delta: 'median' },
];

const TRUST_BADGES = [
  { i: 'mpesa', t: 'M-Pesa Instant Payout' },
  { i: 'shield', t: 'Escrowed Before You Start' },
  { i: 'star', t: 'Build Your Reputation' },
];

const STEPS = [
  { n: '01', t: 'Set up once', s: 'National ID + selfie. Verified for life.', i: 'check' },
  { n: '02', t: 'Apply to shifts', s: 'Nearby, in your skill, at your rate.', i: 'pin' },
  { n: '03', t: 'Clock in', s: 'GPS-confirmed at the venue.', i: 'edit' },
  { n: '04', t: 'Get paid', s: 'M-Pesa within 18 minutes of clock-out.', i: 'mpesa' },
];

const FEATURES = [
  { i: 'check', t: 'Verified worker badge', s: 'Every employer sees the same trusted badge.' },
  { i: 'mpesa', t: 'Direct M-Pesa', s: 'No middleman. Your phone, your KES.' },
  { i: 'shield', t: 'Escrow before you arrive', s: 'Wage ringfenced before you leave home.' },
  { i: 'star', t: 'Reputation that travels', s: 'Your rating works across every employer.' },
  { i: 'doc', t: 'PAYE, NSSF, SHIF auto-calc', s: 'Your payslip, ready every month.' },
  { i: 'users', t: 'Repeat-employer invites', s: 'Show up well, get invited back with one tap.' },
];

const COMPARISON = [
  { topic: 'Finding shifts', old: 'WhatsApp groups · friends-of-friends', klokd: 'Live feed · sorted by distance + pay' },
  { topic: 'Getting paid', old: 'Cash at end of shift · sometimes', klokd: 'M-Pesa · 18 min from clock-out · always' },
  { topic: 'Verification', old: 'Show your ID every time', klokd: 'Verified once · trusted everywhere' },
  { topic: 'Disputes', old: 'No recourse · lose the money', klokd: 'Logged · evidence-backed · admin-resolved' },
  { topic: 'PAYE / NSSF / SHIF', old: 'Confusing · often skipped', klokd: 'Auto-calculated · payslips ready' },
];

const MEGA_STATS = [
  { k: 'KES 38M+', l: 'Paid out via M-Pesa escrow' },
  { k: '16,412', l: 'Shifts completed' },
  { k: '94.2%', l: 'Worker show-up rate' },
  { k: '2,847', l: 'Verified workers in pool' },
];

const QUOTES = [
  {
    body: "Got my first shift the same day I joined. KES 800 in my M-Pesa before I got home.",
    name: 'Akinyi M.',
    role: 'Server · CBD',
    metric: 'KES 18K / mo',
    featured: true,
  },
  { body: "No more chasing the manager. The money just comes.", name: 'Brian O.', role: 'Event Steward · KICC', metric: '5⭐ · 42 shifts' },
  { body: "Verified once. Three employers know me by name now.", name: 'Joseph K.', role: 'Kitchen prep · Westlands', metric: '94% repeat' },
];

const ACTIVITY = [
  { ic: '✓', t: 'KES 800 in your M-Pesa', sub: 'Sarova Stanley · 2 min ago' },
  { ic: '✓', t: 'Clock-in confirmed', sub: 'Norfolk · GPS verified' },
  { ic: '↑', t: 'New 5⭐ rating', sub: 'From Mama Wanjiku' },
  { ic: '✓', t: 'Repeat invite', sub: 'Westlands · Sat 8pm' },
];

// ─── Inline icons (subset; mirrors employer Welcome's library) ─

function FeatIcon({ name, size = 18 }: { name: string; size?: number }) {
  const c = colors.electric;
  const sw = 1.7;
  const props = { stroke: c, strokeWidth: sw, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (name === 'check') return (
    <Svg width={size} height={size} viewBox="0 0 18 18">
      <Circle cx="9" cy="9" r="7" {...props} />
      <Path d="M5.5 9l2.5 2.5 5-5" {...props} />
    </Svg>
  );
  if (name === 'shield') return (
    <Svg width={size} height={size} viewBox="0 0 18 18">
      <Path d="M9 2l6 2v5c0 4-3 6-6 7-3-1-6-3-6-7V4l6-2z" {...props} />
      <Path d="M6.5 9l2 2 3.5-4" {...props} />
    </Svg>
  );
  if (name === 'pin') return (
    <Svg width={size} height={size} viewBox="0 0 18 18">
      <Path d="M9 16s-5-4.5-5-9a5 5 0 0 1 10 0c0 4.5-5 9-5 9z" {...props} />
      <Circle cx="9" cy="7" r="2" {...props} />
    </Svg>
  );
  if (name === 'mpesa') return (
    <Svg width={size} height={size} viewBox="0 0 18 18">
      <Path d="M2.5 6h13M5.5 10.5h2M9.5 10.5h2" {...props} />
      <Path d="M2.5 4h13v9h-13z" {...props} />
    </Svg>
  );
  if (name === 'star') return (
    <Svg width={size} height={size} viewBox="0 0 18 18">
      <Path d="M9 2.5l1.9 4 4.4.6-3.2 3.1.8 4.4L9 12.5l-3.9 2 .8-4.4-3.2-3.1 4.4-.6L9 2.5z" {...props} />
    </Svg>
  );
  if (name === 'edit') return (
    <Svg width={size} height={size} viewBox="0 0 18 18">
      <Path d="M3 13l9-9 2 2-9 9H3v-2zM11 4l2 2" {...props} />
    </Svg>
  );
  if (name === 'doc') return (
    <Svg width={size} height={size} viewBox="0 0 18 18">
      <Path d="M4 2h7l3 3v11H4z" {...props} />
      <Path d="M11 2v3h3M6 9h6M6 12h6M6 6h2" {...props} />
    </Svg>
  );
  if (name === 'users') return (
    <Svg width={size} height={size} viewBox="0 0 18 18">
      <Circle cx="6" cy="6" r="2.5" {...props} />
      <Path d="M2 14c.5-2.5 2-4 4-4s3.5 1.5 4 4M12 11c1.7 0 3 1 3.5 3" {...props} />
      <Circle cx="12.5" cy="6.5" r="2" {...props} />
    </Svg>
  );
  return null;
}

// ─── Mobile welcome (native) ──────────────────────────────
//
// Phones get a purpose-built single-viewport welcome: hero pitch up top,
// swipeable proof metrics mid-screen, primary CTA pinned in the thumb
// zone. None of the desktop marketing sections — that page lives on web.

const M_METRICS = [
  { k: '16,412', l: 'shifts paid' },
  { k: '18 min', l: 'clock-out → M-Pesa' },
  { k: 'KES 1,823', l: 'avg pay / shift' },
  { k: '94.2%', l: 'show-up rate' },
];

function MobileWelcome({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={m.root}>
      <AmbientOrbs />

      {/* Top bar */}
      <FadeUp delay={0} style={[m.top, { paddingTop: insets.top + 14 }]}>
        <Logo size={30} />
        <View style={m.forBadge}>
          <Text style={m.forBadgeText}>FOR WORKERS</Text>
        </View>
      </FadeUp>

      <View style={m.heroSpace} />

      {/* Hero */}
      <View style={m.hero}>
        <FadeUp delay={90}>
          <View style={m.livePill}>
            <LiveDot />
            <Text style={m.livePillText}>284 SHIFTS OPEN IN NAIROBI</Text>
          </View>
        </FadeUp>

        <FadeUp delay={160}>
          <Text style={m.h1}>
            Find a shift.{'\n'}
            <Text style={m.h1Accent}>Get paid by{'\n'}clock-out.</Text>
          </Text>
        </FadeUp>

        <FadeUp delay={240}>
          <Text style={m.sub}>
            Verified once, trusted by every employer. M-Pesa lands within
            18 minutes of clock-out — no chasing.
          </Text>
        </FadeUp>
      </View>

      {/* Proof metrics — swipeable */}
      <FadeUp delay={320}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={m.metricsRow}
          decelerationRate="fast"
          snapToInterval={148}
        >
          {M_METRICS.map((s, i) => (
            <View key={i} style={m.metric}>
              <Text style={m.metricK}>{s.k}</Text>
              <Text style={m.metricL}>{s.l}</Text>
            </View>
          ))}
        </ScrollView>
      </FadeUp>

      {/* Trust strip */}
      <FadeUp delay={390} style={m.trustRow}>
        <View style={m.avatars}>
          {['#0FBD83', '#00E5A0', '#88E364', '#BCFF4E'].map((c, i) => (
            <View key={i} style={[m.avatar, { backgroundColor: c, marginLeft: i === 0 ? 0 : -9, zIndex: 4 - i }]} />
          ))}
        </View>
        <Text style={m.trustText}>2,847 verified workers already earning</Text>
      </FadeUp>

      {/* CTA block — thumb zone */}
      <FadeUp delay={460} style={[m.ctaBlock, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <GradientBtn onPress={() => navigation.navigate('RailsLogin')}>Find shifts</GradientBtn>
        <PressScale onPress={() => navigation.navigate('RailsLogin')} style={m.signInBtn}>
          <Text style={m.signInText}>
            Already verified? <Text style={m.signInAccent}>Sign in</Text>
          </Text>
        </PressScale>
      </FadeUp>
    </View>
  );
}

const m = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  top: {
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  forBadge: {
    paddingHorizontal: 12,
    minHeight: 30,
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: 'rgba(188,255,78,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(188,255,78,0.28)',
  },
  forBadgeText: { color: colors.volt, fontSize: 11, fontWeight: '900', letterSpacing: 1.1 },

  heroSpace: { flex: 1 },

  hero: { paddingHorizontal: 24 },
  livePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 10,
    paddingRight: 14,
    minHeight: 32,
    borderRadius: 999,
    backgroundColor: 'rgba(0,229,160,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0,229,160,0.22)',
    marginBottom: 18,
  },
  livePillText: { color: colors.electric, fontSize: 11, fontWeight: '800', letterSpacing: 0.9 },
  h1: { fontSize: 42, fontWeight: '900', letterSpacing: -1.7, lineHeight: 46, color: colors.white, marginBottom: 14 },
  h1Accent: { color: colors.electric },
  sub: { fontSize: 15.5, color: colors.white65, lineHeight: 23, marginBottom: 26, maxWidth: 330 },

  metricsRow: { paddingHorizontal: 24, gap: 10, paddingBottom: 4 },
  metric: {
    width: 138,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: colors.white03,
    borderWidth: 1,
    borderColor: colors.white08,
  },
  metricK: { color: colors.white, fontSize: 19, fontWeight: '900', letterSpacing: -0.6 },
  metricL: { color: colors.white50, fontSize: 11, fontWeight: '600', marginTop: 4, lineHeight: 14 },

  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
    marginTop: 18,
    marginBottom: 20,
  },
  avatars: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 26, height: 26, borderRadius: 999, borderWidth: 2, borderColor: colors.ink },
  trustText: { color: colors.white60, fontSize: 12.5, fontWeight: '600', flex: 1 },

  ctaBlock: { paddingHorizontal: 24, gap: 4 },
  signInBtn: { minHeight: 46, alignItems: 'center', justifyContent: 'center' },
  signInText: { color: colors.white50, fontSize: 14 },
  signInAccent: { color: colors.electric, fontWeight: '800' },
});

// ─── Screen ───────────────────────────────────────────────

export function WelcomeScreen({ navigation }: Props) {
  if (Platform.OS !== 'web') {
    return <MobileWelcome navigation={navigation} />;
  }
  return <DesktopWelcome navigation={navigation} />;
}

function DesktopWelcome({ navigation }: Props) {
  // Sticky CTA — appears past hero
  const [stickyVisible, setStickyVisible] = useState(false);
  const stickyAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(stickyAnim, {
      toValue: stickyVisible ? 1 : 0,
      duration: 280,
      easing: EASE,
      useNativeDriver: true,
    }).start();
  }, [stickyVisible, stickyAnim]);

  // Cycling activity feed
  const [activityIdx, setActivityIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActivityIdx(i => (i + 1) % ACTIVITY.length), 2800);
    return () => clearInterval(t);
  }, []);
  const visibleActivity = [
    ACTIVITY[activityIdx],
    ACTIVITY[(activityIdx + 1) % ACTIVITY.length],
    ACTIVITY[(activityIdx + 2) % ACTIVITY.length],
  ];

  return (
    <View style={{ flex: 1 }}>
      {/* ─── Sticky scroll CTA ─── */}
      {Platform.OS === 'web' && (
        <Animated.View
          pointerEvents={stickyVisible ? 'auto' : 'none'}
          style={[
            styles.stickyBar,
            {
              opacity: stickyAnim,
              transform: [
                {
                  translateY: stickyAnim.interpolate({ inputRange: [0, 1], outputRange: [-50, 0] }),
                },
              ],
            },
          ]}
        >
          <View style={styles.stickyInner}>
            <View style={styles.stickyLeft}>
              <Logo size={26} />
              <View style={styles.stickyDivider} />
              <Text style={styles.stickyStatus}>
                <Text style={{ color: colors.electric }}>●</Text> 284 shifts open in Nairobi right now
              </Text>
            </View>
            <View style={styles.stickyRight}>
              <View style={{ minWidth: 140 }}>
                <GradientBtn onPress={() => navigation.navigate('RailsLogin')}>Find shifts</GradientBtn>
              </View>
            </View>
          </View>
        </Animated.View>
      )}

      <KlokdScreen
        scrollViewProps={{
          scrollEventThrottle: 16,
          onScroll: (e) => {
            const y = e.nativeEvent.contentOffset.y;
            const next = y > 520;
            if (next !== stickyVisible) setStickyVisible(next);
          },
        }}
      >
        {/* ─── Top bar ─── */}
        <FadeUp delay={0} style={styles.topRow}>
          <View style={styles.brandLeft}>
            <Logo size={40} />
            <View style={styles.forWorkerBadge}>
              <Text style={styles.forWorkerText}>FOR WORKERS</Text>
            </View>
          </View>
          <View style={styles.topNav}>
            <Pressable style={({ hovered }: any) => [styles.navItem, hovered && styles.navItemHover]}>
              <Text style={styles.navText}>How it works</Text>
            </Pressable>
            <Pressable style={({ hovered }: any) => [styles.navItem, hovered && styles.navItemHover]}>
              <Text style={styles.navText}>For employers</Text>
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate('RailsLogin')}
              style={({ hovered }: any) => [
                styles.signInTopPress,
                hovered && { backgroundColor: colors.white08, borderColor: colors.white25 },
              ]}
            >
              <Text style={styles.signInTop}>Sign in →</Text>
            </Pressable>
          </View>
        </FadeUp>

        {/* ─── HERO ─── */}
        <View style={styles.hero}>
          <View style={styles.heroLeft}>
            <FadeUp delay={80}>
              <View style={styles.eyebrowPill}>
                <LiveDot />
                <Text style={styles.eyebrowPillText}>284 SHIFTS OPEN IN NAIROBI NOW</Text>
              </View>
            </FadeUp>

            <FadeUp delay={140}>
              <Text style={styles.h1}>
                Find a shift.{'\n'}
                <Text style={styles.h1Accent}>Get paid by clock-out.</Text>
              </Text>
            </FadeUp>

            <FadeUp delay={220}>
              <Text style={styles.subhead}>
                Verified once. Nearby shifts sorted by pay + distance. M-Pesa lands
                within 18 minutes of clock-out — no chasing, no WhatsApp.
              </Text>
            </FadeUp>

            <FadeUp delay={300} style={styles.ctaRow}>
              <View style={styles.primaryCtaWrap}>
                <GradientBtn onPress={() => navigation.navigate('RailsLogin')}>
                  Find shifts
                </GradientBtn>
              </View>
              <HoverCard
                style={styles.ghostBtn}
                hoverStyle={styles.ghostBtnHover}
              >
                <Text style={styles.ghostBtnText}>See how it works  →</Text>
              </HoverCard>
            </FadeUp>

            <FadeUp delay={380} style={styles.trustRow}>
              <View style={styles.avatarStack}>
                {['#0FBD83', '#00E5A0', '#88E364', '#BCFF4E'].map((c, i) => (
                  <View key={i} style={[styles.avatarStackItem, { backgroundColor: c, marginLeft: i === 0 ? 0 : -8, zIndex: 4 - i }]} />
                ))}
              </View>
              <Text style={styles.trustText}>2,847 verified workers already earning</Text>
            </FadeUp>

            <FadeUp delay={440} style={styles.trustBadgesRow}>
              {TRUST_BADGES.map((b, i) => (
                <View key={i} style={styles.trustBadge}>
                  <View style={styles.trustBadgeIcon}>
                    <FeatIcon name={b.i} size={13} />
                  </View>
                  <Text style={styles.trustBadgeText}>{b.t}</Text>
                </View>
              ))}
            </FadeUp>
          </View>

          {/* ─── Phone-shaped mockup (worker is mobile-first) ─── */}
          <FadeUp delay={260} style={styles.mockupWrap}>
            <View style={styles.mockupShadow} />
            <View style={styles.mockupBackCard} />

            {Platform.OS === 'web' && (
              <View style={styles.activityFeed} pointerEvents="none">
                {visibleActivity.map((a, i) => (
                  <Animated.View
                    key={`${activityIdx}-${i}`}
                    style={[
                      styles.activityToast,
                      {
                        opacity: i === 0 ? 1 : i === 1 ? 0.7 : 0.35,
                        transform: [{ translateX: -i * 6 }, { translateY: -i * 4 }],
                        zIndex: 10 - i,
                      },
                    ]}
                  >
                    <View style={styles.activityIcon}>
                      <Text style={styles.activityIconText}>{a.ic}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.activityTitle}>{a.t}</Text>
                      <Text style={styles.activitySub}>{a.sub}</Text>
                    </View>
                  </Animated.View>
                ))}
              </View>
            )}

            <View style={styles.mockup}>
              <View style={styles.appBar}>
                <View style={styles.appBarLeft}>
                  <View style={styles.appBarLogo}><Text style={styles.appBarLogoText}>K</Text></View>
                  <View>
                    <Text style={styles.appBarTitle}>Akinyi M.</Text>
                    <Text style={styles.appBarSub}>5⭐ · CBD · KES 18K this month</Text>
                  </View>
                </View>
                <View style={styles.bellWrap}>
                  <Svg width={18} height={18} viewBox="0 0 18 18">
                    <Path d="M9 2.2c-2.5 0-4.5 2-4.5 4.5v2.6L3 11.4h12l-1.5-2.1V6.7c0-2.5-2-4.5-4.5-4.5zM7.2 13.2c0 1 .8 1.8 1.8 1.8s1.8-.8 1.8-1.8" stroke={colors.white75} strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                  <View style={styles.bellDot} />
                </View>
              </View>

              <View style={styles.mockupBody}>
                <View style={styles.mockHeadRow}>
                  <View>
                    <Text style={styles.mockEyebrow}>Tonight · 11 Jun</Text>
                    <Text style={styles.mockTitle}>Shifts near you</Text>
                  </View>
                  <View style={styles.mockBadge}>
                    <LiveDot />
                    <Text style={styles.mockBadgeText}>12 NEW</Text>
                  </View>
                </View>

                {[
                  { role: 'Server', venue: 'Sarova Stanley · CBD', rate: 'KES 800', dist: '1.2 km', state: 'new' },
                  { role: 'Kitchen prep', venue: 'Java · Westlands', rate: 'KES 950', dist: '4.8 km', state: 'applied' },
                  { role: 'Event steward', venue: 'KICC · Sat 8pm', rate: 'KES 1,200', dist: '2.4 km', state: 'invited' },
                ].map((shift, i) => (
                  <View key={i} style={styles.mockCard}>
                    <View style={styles.shiftPinWrap}>
                      <FeatIcon name="pin" size={14} />
                      <Text style={styles.shiftPinText}>{shift.dist}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.mockCardTitle}>{shift.role}</Text>
                      <Text style={styles.mockCardSub}>{shift.venue}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.mockRate}>{shift.rate}</Text>
                      <View style={[
                        styles.statePill,
                        shift.state === 'applied' && styles.statePillActive,
                        shift.state === 'invited' && styles.statePillActive,
                      ]}>
                        <Text style={[
                          styles.stateText,
                          (shift.state === 'applied' || shift.state === 'invited') && { color: colors.electric },
                        ]}>
                          {shift.state === 'new' ? 'Apply' : shift.state === 'applied' ? 'Applied' : 'Invited'}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}

                <View style={styles.mockFooter}>
                  <View style={styles.mpesaCard}>
                    <View style={styles.mpesaIcon}><Text style={styles.mpesaIconText}>M</Text></View>
                    <View>
                      <Text style={styles.mockFooterLabel}>Last payout</Text>
                      <Text style={styles.mockFooterValue}>KES 800 · 18 min</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.mockFooterLabel}>Earned this month</Text>
                    <Text style={styles.mockFooterValue}>KES 18,400</Text>
                  </View>
                </View>
              </View>
            </View>
          </FadeUp>
        </View>

        {/* ─── Metrics strip ─── */}
        <FadeUp delay={460}>
          <GlassCard style={styles.metricsWrap}>
            {METRICS.map((m, i) => (
              <View key={i} style={[styles.metric, i > 0 && styles.metricDivider]}>
                <Text style={styles.metricK}>{m.k}</Text>
                <Text style={styles.metricL}>{m.l}</Text>
                <View style={styles.metricDeltaRow}>
                  <Text style={styles.metricArrow}>↑</Text>
                  <Text style={styles.metricDelta}>{m.delta}</Text>
                </View>
              </View>
            ))}
          </GlassCard>
        </FadeUp>

        {/* ─── How it works ─── */}
        <View style={styles.howWrap}>
          <FadeUp delay={580}>
            <Eyebrow color={colors.electric} style={{ marginBottom: spacing.sm }}>HOW IT WORKS</Eyebrow>
            <Text style={styles.h2}>From verified to paid, in four steps.</Text>
            <Text style={[styles.subhead, { marginTop: spacing.sm, maxWidth: 600 }]}>
              One verification covers every employer. Show up well, build your rating, get invited back.
            </Text>
          </FadeUp>
          <View style={styles.stepsFlow}>
            {STEPS.map((step, i) => (
              <React.Fragment key={i}>
                <FadeUp delay={640 + i * 90} style={styles.stepCol}>
                  <GlassCard interactive style={styles.stepCard}>
                    <View style={styles.stepHeader}>
                      <View style={styles.stepIcon}>
                        <FeatIcon name={step.i} size={16} />
                      </View>
                      <Text style={styles.stepNum}>{step.n}</Text>
                    </View>
                    <Text style={styles.stepTitle}>{step.t}</Text>
                    <Text style={styles.stepSub}>{step.s}</Text>
                  </GlassCard>
                </FadeUp>
                {i < STEPS.length - 1 && (
                  <View style={styles.connector}>
                    <Svg width="100%" height="2">
                      <Path d="M0 1 L9999 1" stroke={colors.white12} strokeWidth="1.5" strokeDasharray="4 4" />
                    </Svg>
                  </View>
                )}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* ─── Built for Nairobi (worker side) ─── */}
        <View style={styles.builtWrap}>
          <FadeUp delay={1040}>
            <Eyebrow color={colors.electric} style={{ marginBottom: spacing.sm }}>BUILT FOR YOU</Eyebrow>
            <Text style={styles.h2}>Designed so the money lands. Every shift.</Text>
          </FadeUp>
          <View style={styles.featureGrid}>
            {FEATURES.map((f, i) => (
              <FadeUp key={i} delay={1100 + i * 50} style={styles.featureWrap}>
                <GlassCard interactive style={styles.feature}>
                  <View style={styles.featureIcon}>
                    <FeatIcon name={f.i} size={18} />
                  </View>
                  <Text style={styles.featureTitle}>{f.t}</Text>
                  <Text style={styles.featureSub}>{f.s}</Text>
                </GlassCard>
              </FadeUp>
            ))}
          </View>
        </View>

        {/* ─── Comparison ─── */}
        <View style={styles.compWrap}>
          <FadeUp delay={1380}>
            <Eyebrow color={colors.electric} style={{ marginBottom: spacing.sm }}>WHY KLOKD WINS</Eyebrow>
            <Text style={styles.h2}>What changes when you stop chasing WhatsApp.</Text>
          </FadeUp>
          <FadeUp delay={1440}>
            <GlassCard style={styles.compTable} padding={0}>
              <View style={styles.compHead}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.compHeadLabel}>BEFORE</Text>
                  <Text style={styles.compHeadTitle}>How you used to find shifts</Text>
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text style={[styles.compHeadLabel, { color: colors.electric }]}>WITH KLOKD</Text>
                  <Text style={[styles.compHeadTitle, { color: colors.electric }]}>What you get</Text>
                </View>
              </View>
              {COMPARISON.map((row, i) => (
                <View key={i} style={styles.compRow}>
                  <View style={styles.compTopic}>
                    <Text style={styles.compTopicText}>{row.topic}</Text>
                  </View>
                  <View style={styles.compCells}>
                    <View style={styles.compOld}>
                      <Text style={styles.compOldText}>{row.old}</Text>
                    </View>
                    <View style={styles.compNew}>
                      <View style={styles.compCheck}>
                        <Svg width={10} height={10} viewBox="0 0 10 10">
                          <Path d="M2 5l2 2 4-4" stroke={colors.electric} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </Svg>
                      </View>
                      <Text style={styles.compNewText}>{row.klokd}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </GlassCard>
          </FadeUp>
        </View>

        {/* ─── Testimonials ─── */}
        <View style={styles.quotesWrap}>
          <FadeUp delay={1500}>
            <Eyebrow color={colors.electric} style={{ marginBottom: spacing.sm }}>WHAT WORKERS SAY</Eyebrow>
            <Text style={styles.h2}>The pool is already 2,847 strong.</Text>
          </FadeUp>
          <View style={styles.quotesGrid}>
            {QUOTES.map((q, i) => (
              <FadeUp key={i} delay={1560 + i * 80} style={[styles.quoteWrap, q.featured && styles.quoteWrapFeatured]}>
                <GlassCard
                  variant={q.featured ? 'electric' : 'default'}
                  style={{ height: '100%' }}
                >
                  <Text style={styles.quoteMark}>"</Text>
                  <Text style={[styles.quoteBody, q.featured && styles.quoteBodyFeatured]}>{q.body}</Text>
                  <View style={styles.quoteAttr}>
                    <View style={styles.quoteAvatar}>
                      <Text style={styles.quoteAvatarText}>{q.name.split(' ').map(p => p[0]).join('')}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.quoteName}>{q.name}</Text>
                      <Text style={styles.quoteRole}>{q.role}</Text>
                    </View>
                    <View style={styles.quoteMetric}>
                      <Text style={styles.quoteMetricText}>{q.metric}</Text>
                    </View>
                  </View>
                </GlassCard>
              </FadeUp>
            ))}
          </View>
        </View>

        {/* ─── Mega stats ─── */}
        <FadeUp delay={1740}>
          <GlassCard variant="electric" style={styles.megaStatsWrap}>
            {MEGA_STATS.map((m, i) => (
              <View key={i} style={[styles.megaStat, i > 0 && styles.megaStatDivider]}>
                <Text style={styles.megaStatK}>{m.k}</Text>
                <Text style={styles.megaStatL}>{m.l}</Text>
              </View>
            ))}
          </GlassCard>
        </FadeUp>

        {/* ─── Final CTA ─── */}
        <FadeUp delay={1820}>
          <GlassCard style={styles.finalCtaBlock}>
            <Text style={styles.finalH}>
              Verify once.{'\n'}
              <Text style={styles.h1Accent}>Earn forever.</Text>
            </Text>
            <Text style={[styles.subhead, { marginTop: spacing.md, textAlign: 'center', alignSelf: 'center' }]}>
              No fee. No subscription. The platform makes its money from employers, not from you.
            </Text>
            <View style={styles.finalCtaRow}>
              <View style={{ minWidth: 220, maxWidth: 280 }}>
                <GradientBtn onPress={() => navigation.navigate('RailsLogin')}>Find shifts</GradientBtn>
              </View>
              <Pressable
                onPress={() => navigation.navigate('RailsLogin')}
                style={({ hovered }: any) => [styles.signInPress, hovered && { opacity: 0.65 }]}
              >
                <Text style={styles.signIn}>
                  Already verified? <Text style={styles.signInAccent}>Sign in →</Text>
                </Text>
              </Pressable>
            </View>
          </GlassCard>
        </FadeUp>

        {/* ─── Footer ─── */}
        <View style={styles.footer}>
          <View style={styles.footerTop}>
            <View style={styles.footerBrand}>
              <Logo size={28} />
              <Text style={styles.footerTagline}>The shift you can trust.</Text>
              <View style={styles.footerStatus}>
                <LiveDot />
                <Text style={styles.footerStatusText}>2,847 workers earning tonight</Text>
              </View>
              <View style={styles.complianceRow}>
                <View style={styles.compBadge}><Text style={styles.compBadgeText}>ODPC</Text></View>
                <View style={styles.compBadge}><Text style={styles.compBadgeText}>KRA</Text></View>
                <View style={styles.compBadge}><Text style={styles.compBadgeText}>NSSF</Text></View>
              </View>
            </View>

            <View style={styles.footerCol}>
              <Text style={styles.footerColLabel}>WORKERS</Text>
              <Text style={styles.footerLink}>How it works</Text>
              <Text style={styles.footerLink}>Pay calculator</Text>
              <Text style={styles.footerLink}>Build your rating</Text>
              <Text style={styles.footerLink}>Klokd Health</Text>
            </View>
            <View style={styles.footerCol}>
              <Text style={styles.footerColLabel}>SUPPORT</Text>
              <Text style={styles.footerLink}>Help center</Text>
              <Text style={styles.footerLink}>Report an issue</Text>
              <Text style={styles.footerLink}>Worker safety</Text>
              <Text style={styles.footerLink}>Status</Text>
            </View>
            <View style={styles.footerCol}>
              <Text style={styles.footerColLabel}>COMPANY</Text>
              <Text style={styles.footerLink}>For employers</Text>
              <Text style={styles.footerLink}>About</Text>
              <Text style={styles.footerLink}>Privacy</Text>
              <Text style={styles.footerLink}>Terms</Text>
            </View>
          </View>

          <View style={styles.footerBase}>
            <Text style={styles.footerCopy}>© 2026 Klokd Workplace Solutions Ltd · A Kipkiren Teknolojia company</Text>
            <View style={styles.footerLocale}>
              <Text style={styles.footerLocaleText}>KSh · KE · English</Text>
            </View>
          </View>
        </View>
      </KlokdScreen>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────

const styles = StyleSheet.create({
  // Sticky bar
  stickyBar: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: 'rgba(10,10,15,0.85)',
    borderBottomWidth: 1,
    borderBottomColor: colors.white06,
    ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(20px)' } as any) : {}),
  },
  stickyInner: {
    maxWidth: 1180,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: spacing.xl,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  stickyLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  stickyDivider: { width: 1, height: 22, backgroundColor: colors.white10 },
  stickyStatus: { color: colors.white65, fontSize: 12.5, fontWeight: '600' },
  stickyRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },

  // Top bar
  topRow: {
    paddingTop: spacing.xxl + 4,
    paddingBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xxxl,
    borderBottomWidth: 1,
    borderBottomColor: colors.white06,
  },
  brandLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  forWorkerBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(188,255,78,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(188,255,78,0.28)',
  },
  forWorkerText: { color: colors.volt, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  topNav: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  navItem: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  navItemHover: { backgroundColor: colors.white06 },
  navText: { color: colors.white75, fontSize: 14.5, fontWeight: '700', letterSpacing: -0.2 },
  signInTopPress: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.white15,
    backgroundColor: colors.white03,
    marginLeft: spacing.sm,
  },
  signInTop: { color: colors.white, fontSize: 14.5, fontWeight: '800', letterSpacing: -0.2 },

  // Hero
  hero: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xxxl, alignItems: 'center', marginTop: spacing.lg },
  heroLeft: { flex: 1, minWidth: 320 },
  eyebrowPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 8,
    paddingRight: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0,229,160,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0,229,160,0.22)',
    marginBottom: spacing.lg,
  },
  eyebrowPillText: { color: colors.electric, fontSize: 11, fontWeight: '800', letterSpacing: 1.0 },
  h1: { fontSize: 52, fontWeight: '900', letterSpacing: -2.2, lineHeight: 54, color: colors.white, marginBottom: spacing.lg },
  h1Accent: { color: colors.electric },
  subhead: { fontSize: 16, color: colors.white65, lineHeight: 22.4, marginBottom: spacing.xl, maxWidth: 480 },
  ctaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, alignItems: 'center', marginBottom: spacing.lg },
  primaryCtaWrap: { flex: 1, minWidth: 180 },
  ghostBtn: { paddingVertical: 16, paddingHorizontal: 22, borderRadius: 14, borderWidth: 1, borderColor: colors.white15, backgroundColor: colors.white03 },
  ghostBtnHover: { borderColor: colors.electric, backgroundColor: 'rgba(0,229,160,0.06)' },
  ghostBtnText: { color: colors.white, fontSize: 14, fontWeight: '700', letterSpacing: -0.15 },
  trustRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  avatarStack: { flexDirection: 'row', alignItems: 'center' },
  avatarStackItem: { width: 24, height: 24, borderRadius: 999, borderWidth: 2, borderColor: colors.ink },
  trustText: { color: colors.white60, fontSize: 12.5, fontWeight: '600' },
  trustBadgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg },
  trustBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: colors.white10, backgroundColor: colors.white03 },
  trustBadgeIcon: { width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  trustBadgeText: { color: colors.white75, fontSize: 11.5, fontWeight: '700', letterSpacing: -0.1 },

  // Mockup
  mockupWrap: { flex: 1, minWidth: 320, maxWidth: 510, position: 'relative' },
  mockupShadow: {
    position: 'absolute', top: 30, left: 30, right: -10, height: '92%',
    backgroundColor: 'rgba(0,229,160,0.18)', borderRadius: radius.xxl + 4,
    filter: Platform.OS === 'web' ? ('blur(60px)' as any) : undefined,
  } as any,
  mockupBackCard: {
    position: 'absolute', top: 22, left: 22, right: -10, bottom: -8,
    backgroundColor: '#0B0B14', borderRadius: radius.xxl, borderWidth: 1, borderColor: colors.white06, opacity: 0.6,
  },
  mockup: {
    borderRadius: radius.xxl, borderWidth: 1, borderColor: colors.white12,
    backgroundColor: '#0F0F18', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 28 }, shadowOpacity: 0.55, shadowRadius: 60, elevation: 14,
  },
  appBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.white08, backgroundColor: 'rgba(255,255,255,0.02)',
  },
  appBarLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  appBarLogo: { width: 32, height: 32, borderRadius: 9, backgroundColor: colors.electric, alignItems: 'center', justifyContent: 'center' },
  appBarLogoText: { color: colors.ink, fontSize: 17, fontWeight: '900', letterSpacing: -0.5 },
  appBarTitle: { color: colors.white, fontSize: 14, fontWeight: '800', letterSpacing: -0.3 },
  appBarSub: { color: colors.white50, fontSize: 11, marginTop: 1 },
  bellWrap: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  bellDot: { position: 'absolute', top: 6, right: 5, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.electric, borderWidth: 1.5, borderColor: '#0F0F18' },
  mockupBody: { padding: spacing.lg },
  mockHeadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: spacing.md },
  mockEyebrow: { color: colors.white50, fontSize: 11, fontWeight: '600', marginBottom: 4 },
  mockTitle: { color: colors.white, fontSize: 18, fontWeight: '800', letterSpacing: -0.4 },
  mockBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: 'rgba(0,229,160,0.10)' },
  mockBadgeText: { color: colors.electric, fontSize: 9.5, fontWeight: '800', letterSpacing: 0.8 },
  mockCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.white03, borderWidth: 1, borderColor: colors.white06, marginBottom: spacing.sm, gap: spacing.md },
  shiftPinWrap: { alignItems: 'center', justifyContent: 'center', gap: 3, width: 42 },
  shiftPinText: { color: colors.white60, fontSize: 10, fontWeight: '700' },
  mockCardTitle: { color: colors.white, fontSize: 14, fontWeight: '700', letterSpacing: -0.2 },
  mockCardSub: { color: colors.white70, fontSize: 12, marginTop: 2 },
  mockRate: { color: colors.white, fontSize: 14, fontWeight: '800' },
  statePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: colors.white15, backgroundColor: colors.white03, marginTop: 5 },
  statePillActive: { borderColor: 'rgba(0,229,160,0.30)', backgroundColor: 'rgba(0,229,160,0.10)' },
  stateText: { color: colors.white70, fontSize: 10.5, fontWeight: '700' },
  mockFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.white06 },
  mpesaCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  mpesaIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#00A859', alignItems: 'center', justifyContent: 'center' },
  mpesaIconText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  mockFooterLabel: { color: colors.white50, fontSize: 10.5, fontWeight: '600' },
  mockFooterValue: { color: colors.white, fontSize: 15, fontWeight: '800', marginTop: 2 },

  // Floating activity feed
  activityFeed: { position: 'absolute', bottom: -16, left: -24, zIndex: 10, width: 280 },
  activityToast: {
    position: 'relative', flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: 10, borderRadius: 12, backgroundColor: 'rgba(15,15,24,0.95)', borderWidth: 1, borderColor: colors.white10, marginBottom: 6,
    ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(12px)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' } as any) : {}),
  },
  activityIcon: { width: 26, height: 26, borderRadius: 999, backgroundColor: 'rgba(0,229,160,0.12)', borderWidth: 1, borderColor: 'rgba(0,229,160,0.30)', alignItems: 'center', justifyContent: 'center' },
  activityIconText: { color: colors.electric, fontSize: 12, fontWeight: '900' },
  activityTitle: { color: colors.white, fontSize: 12, fontWeight: '700', letterSpacing: -0.1 },
  activitySub: { color: colors.white50, fontSize: 10.5, marginTop: 1 },

  // Metrics
  metricsWrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.xxxl + spacing.lg, padding: spacing.xl },
  metric: { flex: 1, minWidth: 180, paddingHorizontal: spacing.md },
  metricDivider: { borderLeftWidth: 1, borderLeftColor: colors.white06 },
  metricK: { fontSize: 36, fontWeight: '900', letterSpacing: -1.4, color: colors.white, lineHeight: 38 },
  metricL: { color: colors.white50, fontSize: 11, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 6 },
  metricDeltaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: spacing.md },
  metricArrow: { color: colors.electric, fontSize: 12, fontWeight: '900' },
  metricDelta: { color: colors.electric, fontSize: 11.5, fontWeight: '700' },

  // How it works
  howWrap: { marginTop: spacing.xxxl + 24 },
  h2: { fontSize: 32, fontWeight: '900', letterSpacing: -1.2, lineHeight: 35, color: colors.white, marginBottom: spacing.md },
  stepsFlow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', marginTop: spacing.xxl, gap: 0 },
  stepCol: { flex: 1, minWidth: 200 },
  stepCard: { minHeight: 168 },
  stepHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  stepIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(0,229,160,0.10)', borderWidth: 1, borderColor: 'rgba(0,229,160,0.22)', alignItems: 'center', justifyContent: 'center' },
  stepNum: { color: colors.white25, fontSize: 13, fontWeight: '900', letterSpacing: 0.8 },
  stepTitle: { color: colors.white, fontSize: 17, fontWeight: '800', letterSpacing: -0.4, lineHeight: 20 },
  stepSub: { color: colors.white55, fontSize: 13, marginTop: 6, lineHeight: 18.5 },
  connector: { width: 32, alignSelf: 'center', justifyContent: 'center', overflow: 'hidden' },

  // Built for you
  builtWrap: { marginTop: spacing.xxxl + 24 },
  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.xl },
  featureWrap: { flex: 1, minWidth: 270, maxWidth: '33%' },
  feature: { minHeight: 158 },
  featureIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(0,229,160,0.10)', borderWidth: 1, borderColor: 'rgba(0,229,160,0.22)', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  featureTitle: { color: colors.white, fontSize: 16, fontWeight: '800', letterSpacing: -0.35 },
  featureSub: { color: colors.white55, fontSize: 13, marginTop: 6, lineHeight: 18.5 },

  // Comparison
  compWrap: { marginTop: spacing.xxxl + 24 },
  compTable: { marginTop: spacing.xl, overflow: 'hidden' },
  compHead: { flexDirection: 'row', paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.white08 },
  compHeadLabel: { color: colors.white40, fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginBottom: 4 },
  compHeadTitle: { color: colors.white, fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  compRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.white06, alignItems: 'center', flexWrap: 'wrap', gap: spacing.md },
  compTopic: { minWidth: 160, flex: 0.5 },
  compTopicText: { color: colors.white45, fontSize: 11.5, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' },
  compCells: { flex: 1, flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  compOld: { flex: 1 },
  compOldText: { color: colors.white45, fontSize: 14, textDecorationLine: 'line-through' as any },
  compNew: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, justifyContent: 'flex-end' },
  compCheck: { width: 20, height: 20, borderRadius: 999, backgroundColor: 'rgba(0,229,160,0.10)', borderWidth: 1, borderColor: 'rgba(0,229,160,0.32)', alignItems: 'center', justifyContent: 'center' },
  compNewText: { color: colors.white, fontSize: 14, fontWeight: '700', letterSpacing: -0.2, textAlign: 'right' as any },

  // Testimonials
  quotesWrap: { marginTop: spacing.xxxl + 24 },
  quotesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.xl },
  quoteWrap: { flex: 1, minWidth: 280 },
  quoteWrapFeatured: { flex: 1.6, minWidth: 320 },
  quoteMark: { color: colors.electric, fontSize: 38, fontWeight: '900', lineHeight: 32, marginBottom: spacing.xs },
  quoteBody: { color: colors.white85, fontSize: 14.5, lineHeight: 20.3, fontWeight: '500', letterSpacing: -0.2, marginBottom: spacing.lg },
  quoteBodyFeatured: { fontSize: 18, lineHeight: 25.2 },
  quoteAttr: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  quoteAvatar: { width: 32, height: 32, borderRadius: 999, backgroundColor: colors.electric, alignItems: 'center', justifyContent: 'center' },
  quoteAvatarText: { color: colors.ink, fontWeight: '900', fontSize: 11 },
  quoteName: { color: colors.white, fontSize: 12.5, fontWeight: '800' },
  quoteRole: { color: colors.white50, fontSize: 11, marginTop: 1 },
  quoteMetric: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: colors.white06, borderWidth: 1, borderColor: colors.white10 },
  quoteMetricText: { color: colors.white85, fontSize: 10.5, fontWeight: '800', letterSpacing: 0.2 },

  // Mega stats
  megaStatsWrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.xxxl + 24, padding: spacing.xxl, gap: spacing.lg },
  megaStat: { flex: 1, minWidth: 180, paddingHorizontal: spacing.md, alignItems: 'center' },
  megaStatDivider: { borderLeftWidth: 1, borderLeftColor: colors.white08 },
  megaStatK: { fontSize: 44, fontWeight: '900', letterSpacing: -1.8, color: colors.white, textAlign: 'center', lineHeight: 48 },
  megaStatL: { color: colors.white60, fontSize: 12.5, fontWeight: '600', letterSpacing: -0.1, textAlign: 'center', marginTop: 8, lineHeight: 17 },

  // Final CTA
  finalCtaBlock: { marginTop: spacing.xxxl + 16, padding: spacing.xxxl, alignItems: 'center' },
  finalH: { fontSize: 40, fontWeight: '900', letterSpacing: -1.6, lineHeight: 42, color: colors.white, textAlign: 'center' },
  finalCtaRow: { marginTop: spacing.xl, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, alignItems: 'center', justifyContent: 'center' },
  signInPress: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  signIn: { fontSize: 13, color: colors.white50 },
  signInAccent: { color: colors.electric, fontWeight: '700' },

  // Footer
  footer: { marginTop: spacing.xxxl + 8, paddingTop: spacing.xl, borderTopWidth: 1, borderTopColor: colors.white06 },
  footerTop: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xl, alignItems: 'flex-start' },
  footerBrand: { flex: 1.4, minWidth: 220 },
  footerTagline: { color: colors.white50, fontSize: 12.5, marginTop: spacing.sm, marginBottom: spacing.lg },
  footerStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.md },
  footerStatusText: { color: colors.white60, fontSize: 11.5, fontWeight: '600' },
  complianceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  compBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: colors.white10, backgroundColor: colors.white03 },
  compBadgeText: { color: colors.white70, fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  footerCol: { minWidth: 140 },
  footerColLabel: { color: colors.white40, fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginBottom: spacing.md },
  footerLink: { color: colors.white70, fontSize: 13, marginBottom: spacing.sm },
  footerBase: { marginTop: spacing.xl, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.white06, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  footerCopy: { color: colors.white30, fontSize: 11 },
  footerLocale: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.white10, backgroundColor: colors.white03 },
  footerLocaleText: { color: colors.white60, fontSize: 11.5, fontWeight: '600' },
});
