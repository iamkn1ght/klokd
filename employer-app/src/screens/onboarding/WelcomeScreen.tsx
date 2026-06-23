/**
 * Employer Welcome — v4 (depth + texture pass per design standards 23 Jun 2026).
 *
 * What changed vs v3:
 * - SVG dot-grid background behind hero adds texture
 * - Multiple ambient gradient orbs (subtle, single accent)
 * - Layered shadows on mockup + stacked secondary card behind
 * - Big designed metrics with sparklines + trend indicators
 * - "How it works" reworked as a connected horizontal flow w/ dashed connectors
 * - New section: "Built for Kenya" 6-card feature grid w/ icons
 * - Trusted-by row uses varied wordmark treatment, not identical pills
 * - Triple-testimonial layout with depth + asymmetric weighting
 * - Footer with compliance badges
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import Svg, {
  Defs,
  Pattern,
  Rect,
  Circle,
  Path,
  Polyline,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Logo, GradientBtn, Eyebrow, Label } from '../../components/Primitives';
import { colors, spacing, radius } from '../../theme';

type Props = { navigation: NativeStackNavigationProp<any> };

// ─── Data ─────────────────────────────────────────────────

const METRICS = [
  { k: '11 min', l: 'avg fill time', delta: '-2.3 min', positive: true, spark: [12, 10, 11, 9, 11, 10, 8, 11] },
  { k: '284', l: 'shifts open now', delta: '+18 today', positive: true, spark: [240, 250, 260, 270, 265, 275, 280, 284] },
  { k: '2,847', l: 'verified workers', delta: '+34 this week', positive: true, spark: [2750, 2780, 2800, 2810, 2825, 2835, 2842, 2847] },
  { k: '96.1%', l: 'show-up rate', delta: '+0.8%', positive: true, spark: [94, 94.5, 95.1, 95.4, 95.6, 95.8, 96.0, 96.1] },
];

const SECTORS = [
  { name: 'Sarova', weight: '900', italic: false },
  { name: 'NORFOLK', weight: '800', italic: false },
  { name: 'java', weight: '600', italic: true },
  { name: 'NAIVAS', weight: '900', italic: false },
  { name: 'Carrefour', weight: '700', italic: false },
  { name: 'KICC', weight: '800', italic: false },
  { name: 'artcaffe', weight: '500', italic: true },
];

const STEPS = [
  { n: '01', t: 'Post the shift', s: 'Pay rate, hours, role.\n60 seconds.', i: 'edit' as const },
  { n: '02', t: 'Workers apply', s: 'National ID-verified,\nratings shown.', i: 'users' as const },
  { n: '03', t: 'Fund escrow', s: 'M-Pesa ringfences\nthe wage.', i: 'shield' as const },
  { n: '04', t: 'Auto-payout', s: 'GPS-confirmed,\nyou approve release.', i: 'check' as const },
];

const FEATURES = [
  { i: 'shield' as const, t: 'M-Pesa escrow', s: 'KES held until clock-out. Never lose money to a no-show.' },
  { i: 'check' as const, t: 'National ID verified', s: 'Every worker IPRS-confirmed before they appear.' },
  { i: 'pin' as const, t: 'GPS clock-in', s: '500m radius lock. Confirms they arrived before payment.' },
  { i: 'doc' as const, t: 'WIBA + Employment Act', s: 'Compliance gates built in. Insurance on every shift.' },
  { i: 'mpesa' as const, t: 'KRA + PAYE auto-calc', s: 'NSSF and SHIF deducted automatically. Statements on demand.' },
  { i: 'star' as const, t: 'Repeat-team builder', s: 'Workers who show up earn a spot. Invite back with one tap.' },
];

const QUOTES = [
  {
    body: 'Filled 12 warehouse shifts in 8 minutes. Used to lose half a day chasing on WhatsApp.',
    name: 'Joseph Mwangi',
    role: 'Ops · Industrial Area logistics',
    metric: '40 shifts / wk',
    featured: true,
  },
  {
    body: 'No more cash floats at the door. Every payout traceable.',
    name: 'Amina Yusuf',
    role: 'GM · Westlands restaurant',
    metric: 'KES 1.2M / mo',
  },
  {
    body: 'Pre-event headcount went from a guess to a confirmed list.',
    name: 'Brian Otieno',
    role: 'Event Producer · KICC',
    metric: '180-strong team',
  },
];

const SLIDES = [
  { kicker: '01 · VERIFIED POOL', head: 'The shift fills before you sleep.', sub: 'Average 11 minutes from post to confirmed.' },
  { kicker: '02 · SAFE ESCROW', head: 'Fund once. Release on clock-out.', sub: 'Your M-Pesa holds the KES until the shift is done.' },
  { kicker: '03 · YOUR TEAM', head: 'Build a trusted pool of regulars.', sub: 'Workers who show up earn a spot.' },
];

const TRUST_BADGES = [
  { i: 'check' as const, t: 'National ID Verified' },
  { i: 'shield' as const, t: 'M-Pesa Escrow Protected' },
  { i: 'pin' as const, t: 'GPS Verified Attendance' },
];

const ACTIVITY = [
  { ic: '✓', t: 'Shift filled in 8 minutes', sub: 'Server · Sarova Stanley' },
  { ic: '✓', t: 'Payment released to Akinyi M.', sub: 'KES 800 · just now' },
  { ic: '✓', t: 'New worker verified', sub: 'Brian O. · KMPDC confirmed' },
  { ic: '↑', t: '12 applicants in 2 minutes', sub: 'Event Steward · KICC' },
];

const COMPARISON = [
  { topic: 'How shifts get filled', old: 'WhatsApp groups, voice notes', klokd: 'Instant matching · 11-min avg' },
  { topic: 'Payment method', old: 'Cash at door · risk of theft', klokd: 'M-Pesa escrow · auto-release' },
  { topic: 'Worker verification', old: 'No checks · resumes only', klokd: 'National ID + IPRS confirmed' },
  { topic: 'Attendance', old: 'High no-show rate', klokd: '96.1% confirmed by GPS' },
  { topic: 'Compliance', old: 'PAYE/NSSF/SHIF manual', klokd: 'Auto-calculated · KRA-ready' },
  { topic: 'Disputes', old: 'WhatsApp screenshots', klokd: 'Logged · evidence-backed · admin-resolved' },
];

const MEGA_STATS = [
  { k: 'KES 38M+', l: 'Processed through M-Pesa escrow' },
  { k: '12,000+', l: 'Shifts completed' },
  { k: '96.1%', l: 'Attendance rate' },
  { k: '2,431', l: 'Businesses hiring on Klokd' },
];

// ─── Motion + hover primitives ────────────────────────────

const EASE = Easing.bezier(0.22, 1, 0.36, 1);

function FadeUp({ delay = 0, style, children }: { delay?: number; style?: any; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(18)).current;
  useEffect(() => {
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 520, easing: EASE, useNativeDriver: true }),
        Animated.timing(ty, { toValue: 0, duration: 520, easing: EASE, useNativeDriver: true }),
      ]).start();
    }, delay);
    return () => clearTimeout(t);
  }, [opacity, ty, delay]);
  return <Animated.View style={[style, { opacity, transform: [{ translateY: ty }] }]}>{children}</Animated.View>;
}

function HoverCard({ onPress, children, style, hoverStyle }: { onPress?: () => void; children: React.ReactNode; style?: any; hoverStyle?: any }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ hovered, pressed }: any) => [
        style,
        hovered && hoverStyle,
        pressed && { transform: [{ scale: 0.985 }] },
      ]}
    >
      {children}
    </Pressable>
  );
}

// ─── Inline SVG building blocks ───────────────────────────

function DotGrid({ width = '100%', height = 600, opacity = 0.4 }: { width?: any; height?: number; opacity?: number }) {
  return (
    <Svg width={width} height={height} style={{ opacity }} pointerEvents="none">
      <Defs>
        <Pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse">
          <Circle cx="1" cy="1" r="1" fill={colors.white15} />
        </Pattern>
        <SvgLinearGradient id="dotsFade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#000" stopOpacity="0" />
          <Stop offset="0.6" stopColor="#000" stopOpacity="0.6" />
          <Stop offset="1" stopColor="#000" stopOpacity="1" />
        </SvgLinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#dots)" />
      <Rect width="100%" height="100%" fill="url(#dotsFade)" />
    </Svg>
  );
}

function Sparkline({ values, color = colors.electric, w = 70, h = 22 }: { values: number[]; color?: string; w?: number; h?: number }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <Svg width={w} height={h}>
      <Defs>
        <SvgLinearGradient id={`sparkFill-${w}-${h}-${values[0]}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="0.35" />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </SvgLinearGradient>
      </Defs>
      <Polyline
        points={pts + ` ${w},${h} 0,${h}`}
        fill={`url(#sparkFill-${w}-${h}-${values[0]})`}
        stroke="none"
      />
      <Polyline points={pts} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
  );
}

function FeatureIcon({ name, size = 18 }: { name: string; size?: number }) {
  const c = colors.electric;
  const sw = 1.7;
  const props = { stroke: c, strokeWidth: sw, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const sx = size;
  if (name === 'shield') {
    return (
      <Svg width={sx} height={sx} viewBox="0 0 18 18">
        <Path d="M9 2l6 2v5c0 4-3 6-6 7-3-1-6-3-6-7V4l6-2z" {...props} />
        <Path d="M6.5 9l2 2 3.5-4" {...props} />
      </Svg>
    );
  }
  if (name === 'check') {
    return (
      <Svg width={sx} height={sx} viewBox="0 0 18 18">
        <Circle cx="9" cy="9" r="7" {...props} />
        <Path d="M5.5 9l2.5 2.5 5-5" {...props} />
      </Svg>
    );
  }
  if (name === 'pin') {
    return (
      <Svg width={sx} height={sx} viewBox="0 0 18 18">
        <Path d="M9 16s-5-4.5-5-9a5 5 0 0 1 10 0c0 4.5-5 9-5 9z" {...props} />
        <Circle cx="9" cy="7" r="2" {...props} />
      </Svg>
    );
  }
  if (name === 'doc') {
    return (
      <Svg width={sx} height={sx} viewBox="0 0 18 18">
        <Path d="M4 2h7l3 3v11H4z" {...props} />
        <Path d="M11 2v3h3M6 9h6M6 12h6M6 6h2" {...props} />
      </Svg>
    );
  }
  if (name === 'mpesa') {
    return (
      <Svg width={sx} height={sx} viewBox="0 0 18 18">
        <Rect x="2.5" y="4" width="13" height="9" rx="1.5" {...props} />
        <Path d="M2.5 7h13M5.5 10.5h2M9.5 10.5h2" {...props} />
      </Svg>
    );
  }
  if (name === 'star') {
    return (
      <Svg width={sx} height={sx} viewBox="0 0 18 18">
        <Path d="M9 2.5l1.9 4 4.4.6-3.2 3.1.8 4.4L9 12.5l-3.9 2 .8-4.4-3.2-3.1 4.4-.6L9 2.5z" {...props} />
      </Svg>
    );
  }
  if (name === 'edit') {
    return (
      <Svg width={sx} height={sx} viewBox="0 0 18 18">
        <Path d="M3 13l9-9 2 2-9 9H3v-2zM11 4l2 2" {...props} />
      </Svg>
    );
  }
  if (name === 'users') {
    return (
      <Svg width={sx} height={sx} viewBox="0 0 18 18">
        <Circle cx="6" cy="6" r="2.5" {...props} />
        <Path d="M2 14c.5-2.5 2-4 4-4s3.5 1.5 4 4" {...props} />
        <Circle cx="12.5" cy="6.5" r="2" {...props} />
        <Path d="M12 11c1.7 0 3 1 3.5 3" {...props} />
      </Svg>
    );
  }
  return null;
}

// ─── Screen ───────────────────────────────────────────────

export function WelcomeScreen({ navigation }: Props) {
  const [slide, setSlide] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setSlide(s => (s + 1) % SLIDES.length), 5200);
    return () => clearTimeout(t);
  }, [slide]);
  const s = SLIDES[slide];

  // Pulsing live dot
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.35, duration: 1200, easing: EASE, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1200, easing: EASE, useNativeDriver: true }),
      ])
    ).start();
  }, [pulse]);

  // Sticky CTA — appears after scrolling past hero
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

  // Cycling activity feed (cards in/out)
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
    <View style={styles.screen}>
      {/* ─── Sticky scroll CTA (appears past hero) ─── */}
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
                <Text style={{ color: colors.electric }}>●</Text> 2,431 businesses hiring tonight
              </Text>
            </View>
            <View style={styles.stickyRight}>
              <Pressable style={({ hovered }: any) => [styles.navItem, hovered && styles.navItemHover]}>
                <Text style={styles.navText}>Pricing</Text>
              </Pressable>
              <View style={{ minWidth: 140 }}>
                <GradientBtn onPress={() => navigation.navigate('BusinessVerify')}>
                  Start hiring
                </GradientBtn>
              </View>
            </View>
          </View>
        </Animated.View>
      )}

      {/* ─── Ambient hero atmosphere ─── */}
      {Platform.OS === 'web' && (
        <>
          <View pointerEvents="none" style={styles.dotsLayer}>
            <DotGrid height={780} opacity={0.5} />
          </View>
          <View pointerEvents="none" style={[styles.orb, styles.orbA]}>
            <LinearGradient
              colors={['rgba(0,229,160,0.22)', 'rgba(0,229,160,0)']}
              start={{ x: 0.5, y: 0.5 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </View>
          <View pointerEvents="none" style={[styles.orb, styles.orbB]}>
            <LinearGradient
              colors={['rgba(0,229,160,0.10)', 'rgba(0,229,160,0)']}
              start={{ x: 0.5, y: 0.5 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </View>
        </>
      )}

      <ScrollView
        contentContainerStyle={styles.scroll}
        bounces={false}
        scrollEventThrottle={16}
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          const next = y > 520;
          if (next !== stickyVisible) setStickyVisible(next);
        }}
      >
        <View style={styles.maxWidth}>
          {/* ─── Top bar ─── */}
          <FadeUp delay={0} style={styles.topRow}>
            <View style={styles.brandLeft}>
              <Logo size={40} />
              <View style={styles.forEmpBadge}>
                <Text style={styles.forEmpText}>FOR EMPLOYERS</Text>
              </View>
            </View>
            <View style={styles.topNav}>
              <Pressable style={({ hovered }: any) => [styles.navItem, hovered && styles.navItemHover]}>
                <Text style={styles.navText}>How it works</Text>
              </Pressable>
              <Pressable style={({ hovered }: any) => [styles.navItem, hovered && styles.navItemHover]}>
                <Text style={styles.navText}>Pricing</Text>
              </Pressable>
              <Pressable style={({ hovered }: any) => [styles.navItem, hovered && styles.navItemHover]}>
                <Text style={styles.navText}>For workers</Text>
              </Pressable>
              <Pressable
                onPress={() => navigation.navigate('BusinessVerify')}
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
                  <Animated.View style={[styles.liveDot, { opacity: pulse }]} />
                  <Text style={styles.eyebrowPillText}>284 SHIFTS LIVE IN NAIROBI NOW</Text>
                </View>
              </FadeUp>

              <FadeUp delay={140}>
                <Text style={styles.h1}>
                  Fill shifts in Nairobi{'\n'}
                  <Text style={styles.h1Accent}>in minutes.</Text>
                </Text>
              </FadeUp>

              <FadeUp delay={220}>
                <Text style={styles.subhead}>
                  Hire National ID-verified casual workers and pay securely through
                  M-Pesa escrow. Average fill time: 11 minutes.
                </Text>
              </FadeUp>

              <FadeUp delay={300} style={styles.ctaRow}>
                <View style={styles.primaryCtaWrap}>
                  <GradientBtn onPress={() => navigation.navigate('BusinessVerify')}>
                    Start hiring
                  </GradientBtn>
                </View>
                <HoverCard style={styles.ghostBtn} hoverStyle={styles.ghostBtnHover}>
                  <Text style={styles.ghostBtnText}>See how it works  →</Text>
                </HoverCard>
              </FadeUp>

              <FadeUp delay={380} style={styles.trustRow}>
                <View style={styles.avatarStack}>
                  {['#0FBD83', '#00E5A0', '#88E364', '#BCFF4E'].map((c, i) => (
                    <View key={i} style={[styles.avatarStackItem, { backgroundColor: c, marginLeft: i === 0 ? 0 : -8, zIndex: 4 - i }]} />
                  ))}
                </View>
                <Text style={styles.trustText}>2,431 businesses already hiring</Text>
              </FadeUp>

              {/* Trust badges row */}
              <FadeUp delay={440} style={styles.trustBadgesRow}>
                {TRUST_BADGES.map((b, i) => (
                  <View key={i} style={styles.trustBadge}>
                    <View style={styles.trustBadgeIcon}>
                      <FeatureIcon name={b.i} size={13} />
                    </View>
                    <Text style={styles.trustBadgeText}>{b.t}</Text>
                  </View>
                ))}
              </FadeUp>
            </View>

            {/* ─── Dashboard mockup w/ depth + floating activity feed ─── */}
            <FadeUp delay={260} style={styles.mockupWrap}>
              {/* Back-card silhouette behind main mockup for depth */}
              <View style={styles.mockupShadow} />
              <View style={styles.mockupBackCard} />

              {/* Floating activity feed — bottom-left, rolling */}
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
                {/* App header — Klokd brand, business name, notification bell */}
                <View style={styles.appBar}>
                  <View style={styles.appBarLeft}>
                    <View style={styles.appBarLogo}>
                      <Text style={styles.appBarLogoText}>K</Text>
                    </View>
                    <View>
                      <Text style={styles.appBarTitle}>Sarova Stanley</Text>
                      <Text style={styles.appBarSub}>Front of House · Nairobi</Text>
                    </View>
                  </View>
                  <View style={styles.bellWrap}>
                    <Svg width={18} height={18} viewBox="0 0 18 18">
                      <Path
                        d="M9 2.2c-2.5 0-4.5 2-4.5 4.5v2.6L3 11.4h12l-1.5-2.1V6.7c0-2.5-2-4.5-4.5-4.5zM7.2 13.2c0 1 .8 1.8 1.8 1.8s1.8-.8 1.8-1.8"
                        stroke={colors.white80}
                        strokeWidth="1.4"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </Svg>
                    <View style={styles.bellDot} />
                  </View>
                </View>

                <View style={styles.mockupBody}>
                  <View style={styles.mockHeadRow}>
                    <View>
                      <Text style={styles.mockEyebrow}>Tonight · 11 Jun</Text>
                      <Text style={styles.mockTitle}>Your shifts</Text>
                    </View>
                    <View style={styles.mockBadge}>
                      <Animated.View style={[styles.liveDot, { opacity: pulse }]} />
                      <Text style={styles.mockBadgeText}>3 LIVE</Text>
                    </View>
                  </View>

                  {[
                    {
                      role: 'Server',
                      venue: 'Stanley Hotel · CBD',
                      rate: 'KES 800',
                      state: 'filled',
                      sub: '4 of 4 confirmed',
                      avatar: 'AM',
                      avatarBg: '#7C5CFF',
                      worker: 'Akinyi M.',
                    },
                    {
                      role: 'Kitchen prep',
                      venue: 'Westlands branch',
                      rate: 'KES 950',
                      state: 'filling',
                      sub: '2 of 3 confirmed · 8 applicants',
                      avatar: 'JK',
                      avatarBg: '#FF8E5C',
                      worker: 'Joseph K.',
                    },
                    {
                      role: 'Event steward',
                      venue: 'KICC · Sat 8pm',
                      rate: 'KES 1,200',
                      state: 'open',
                      sub: '14 applicants · 9 min ago',
                      avatar: null,
                      avatarBg: colors.white10,
                      worker: null,
                    },
                  ].map((shift, i) => (
                    <View key={i} style={styles.mockCard}>
                      <View style={styles.shiftAvatar}>
                        {shift.avatar ? (
                          <View style={[styles.shiftAvatarFilled, { backgroundColor: shift.avatarBg }]}>
                            <Text style={styles.shiftAvatarText}>{shift.avatar}</Text>
                          </View>
                        ) : (
                          <View style={styles.shiftAvatarEmpty}>
                            <Svg width={14} height={14} viewBox="0 0 14 14">
                              <Path
                                d="M7 1v12M1 7h12"
                                stroke={colors.white40}
                                strokeWidth="1.6"
                                strokeLinecap="round"
                              />
                            </Svg>
                          </View>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.mockCardTitle}>{shift.role}</Text>
                        <Text style={styles.mockCardSub}>{shift.venue}</Text>
                        <Text style={styles.mockCardMeta}>{shift.sub}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.mockRate}>{shift.rate}</Text>
                        <View
                          style={[
                            styles.statePill,
                            shift.state === 'filled' && styles.statePillFilled,
                            shift.state === 'filling' && styles.statePillFilling,
                          ]}
                        >
                          {shift.state === 'filled' && <View style={styles.statePillCheck} />}
                          <Text
                            style={[
                              styles.stateText,
                              (shift.state === 'filled' || shift.state === 'filling') && { color: colors.electric },
                            ]}
                          >
                            {shift.state === 'filled' ? 'Filled' : shift.state === 'filling' ? 'Filling' : 'Open'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}

                  <View style={styles.mockFooter}>
                    <View style={styles.mpesaCard}>
                      <View style={styles.mpesaIcon}>
                        <Text style={styles.mpesaIconText}>M</Text>
                      </View>
                      <View>
                        <Text style={styles.mockFooterLabel}>M-Pesa escrow held</Text>
                        <Text style={styles.mockFooterValue}>KES 14,400</Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.mockFooterLabel}>Auto-release</Text>
                      <Text style={styles.mockFooterValue}>On clock-out</Text>
                    </View>
                  </View>

                  {/* Live activity stream */}
                  <View style={styles.activityStream}>
                    <Text style={styles.activityStreamLabel}>RECENT ACTIVITY</Text>
                    {[
                      { ic: '✓', t: 'Akinyi M. clocked in', ts: 'just now', tone: 'green' as const },
                      { ic: '✓', t: 'Stanley H. shift confirmed', ts: '2 min ago', tone: 'green' as const },
                      { ic: '↑', t: 'Joseph K. accepted shift', ts: '4 min ago', tone: 'neutral' as const },
                    ].map((row, i) => (
                      <View key={i} style={styles.activityRow}>
                        <Text style={[styles.activityRowIcon, row.tone === 'green' && { color: colors.electric }]}>{row.ic}</Text>
                        <Text style={styles.activityRowText}>{row.t}</Text>
                        <Text style={styles.activityRowTs}>{row.ts}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </FadeUp>
          </View>

          {/* ─── Metrics — big designed numbers + sparklines ─── */}
          <FadeUp delay={460} style={styles.metricsWrap}>
            {METRICS.map((m, i) => (
              <View key={i} style={[styles.metric, i > 0 && styles.metricDivider]}>
                <View style={styles.metricRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.metricK}>{m.k}</Text>
                    <Text style={styles.metricL}>{m.l}</Text>
                  </View>
                  <Sparkline values={m.spark} />
                </View>
                <View style={styles.metricDeltaRow}>
                  <Text style={styles.metricArrow}>↑</Text>
                  <Text style={styles.metricDelta}>{m.delta}</Text>
                </View>
              </View>
            ))}
          </FadeUp>

          {/* ─── Trusted by — varied wordmarks ─── */}
          <FadeUp delay={540}>
            <Label color={colors.white40} style={styles.trustedLabel}>
              TRUSTED BY NAIROBI'S BEST
            </Label>
            <View style={styles.sectorRow}>
              {SECTORS.map((s, i) => (
                <Text
                  key={i}
                  style={[
                    styles.wordmark,
                    { fontWeight: s.weight as any, fontStyle: s.italic ? 'italic' : 'normal' },
                  ]}
                >
                  {s.name}
                </Text>
              ))}
            </View>
          </FadeUp>

          {/* ─── How it works — connected flow ─── */}
          <View style={styles.howWrap}>
            <FadeUp delay={580}>
              <Eyebrow color={colors.electric} style={{ marginBottom: spacing.sm }}>HOW IT WORKS</Eyebrow>
              <Text style={styles.h2}>From posted to paid in four steps.</Text>
              <Text style={[styles.subhead, { marginTop: spacing.sm, maxWidth: 600 }]}>
                One flow. Every gate compliance-checked. No phone calls.
              </Text>
            </FadeUp>
            <View style={styles.stepsFlow}>
              {STEPS.map((step, i) => (
                <React.Fragment key={i}>
                  <FadeUp delay={640 + i * 90} style={styles.stepCol}>
                    <HoverCard style={styles.stepCard} hoverStyle={styles.stepCardHover}>
                      <View style={styles.stepHeader}>
                        <View style={styles.stepIcon}>
                          <FeatureIcon name={step.i} size={16} />
                        </View>
                        <Text style={styles.stepNum}>{step.n}</Text>
                      </View>
                      <Text style={styles.stepTitle}>{step.t}</Text>
                      <Text style={styles.stepSub}>{step.s}</Text>
                    </HoverCard>
                  </FadeUp>
                  {i < STEPS.length - 1 && (
                    <View style={styles.connector}>
                      <Svg width="100%" height="2">
                        <Path
                          d="M0 1 L9999 1"
                          stroke={colors.white12}
                          strokeWidth="1.5"
                          strokeDasharray="4 4"
                        />
                      </Svg>
                    </View>
                  )}
                </React.Fragment>
              ))}
            </View>
          </View>

          {/* ─── Built for Kenya — feature grid ─── */}
          <View style={styles.builtWrap}>
            <FadeUp delay={1040}>
              <Eyebrow color={colors.electric} style={{ marginBottom: spacing.sm }}>BUILT FOR KENYA</Eyebrow>
              <Text style={styles.h2}>Every compliance gate. None of the paperwork.</Text>
            </FadeUp>
            <View style={styles.featureGrid}>
              {FEATURES.map((f, i) => (
                <FadeUp key={i} delay={1100 + i * 50} style={styles.featureWrap}>
                  <HoverCard style={styles.feature} hoverStyle={styles.featureHover}>
                    <View style={styles.featureIcon}>
                      <FeatureIcon name={f.i} size={18} />
                    </View>
                    <Text style={styles.featureTitle}>{f.t}</Text>
                    <Text style={styles.featureSub}>{f.s}</Text>
                  </HoverCard>
                </FadeUp>
              ))}
            </View>
          </View>

          {/* ─── Why Klokd Wins comparison ─── */}
          <View style={styles.compWrap}>
            <FadeUp delay={1380}>
              <Eyebrow color={colors.electric} style={{ marginBottom: spacing.sm }}>WHY KLOKD WINS</Eyebrow>
              <Text style={styles.h2}>What changes when you switch from WhatsApp.</Text>
            </FadeUp>
            <FadeUp delay={1440} style={styles.compTable}>
              <View style={styles.compHead}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.compHeadLabel}>BEFORE</Text>
                  <Text style={styles.compHeadTitle}>Traditional hiring</Text>
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
            </FadeUp>
          </View>

          {/* ─── Triple-quote testimonial block ─── */}
          <View style={styles.quotesWrap}>
            <FadeUp delay={1400}>
              <Eyebrow color={colors.electric} style={{ marginBottom: spacing.sm }}>WHAT EMPLOYERS SAY</Eyebrow>
              <Text style={styles.h2}>The first ones in already trust it.</Text>
            </FadeUp>
            <View style={styles.quotesGrid}>
              {QUOTES.map((q, i) => (
                <FadeUp key={i} delay={1460 + i * 80} style={[styles.quoteWrap, q.featured && styles.quoteWrapFeatured]}>
                  <View style={[styles.quote, q.featured && styles.quoteFeatured]}>
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
                  </View>
                </FadeUp>
              ))}
            </View>
          </View>

          {/* ─── Carousel feature highlight ─── */}
          <FadeUp delay={1700} style={styles.carouselWrap}>
            <Eyebrow color={colors.electric}>{s.kicker}</Eyebrow>
            <Text style={[styles.h2, { marginTop: spacing.sm }]}>{s.head}</Text>
            <Text style={styles.subhead}>{s.sub}</Text>
            <View style={styles.dots}>
              {SLIDES.map((_, i) => (
                <Pressable
                  key={i}
                  onPress={() => setSlide(i)}
                  style={({ hovered }: any) => [
                    {
                      flex: i === slide ? 2 : 1,
                      height: 3,
                      borderRadius: 999,
                      backgroundColor: i === slide ? colors.electric : colors.white12,
                    },
                    hovered && i !== slide && { backgroundColor: colors.white25 },
                  ]}
                />
              ))}
            </View>
          </FadeUp>

          {/* ─── Mega-stats banner ─── */}
          <FadeUp delay={1740} style={styles.megaStatsWrap}>
            {MEGA_STATS.map((m, i) => (
              <View key={i} style={[styles.megaStat, i > 0 && styles.megaStatDivider]}>
                <Text style={styles.megaStatK}>{m.k}</Text>
                <Text style={styles.megaStatL}>{m.l}</Text>
              </View>
            ))}
          </FadeUp>

          {/* ─── Final CTA block ─── */}
          <FadeUp delay={1780} style={styles.finalCtaBlock}>
            <Text style={styles.finalH}>
              Post your first shift.{'\n'}
              <Text style={styles.h1Accent}>It's free.</Text>
            </Text>
            <Text style={[styles.subhead, { marginTop: spacing.md, textAlign: 'center', alignSelf: 'center' }]}>
              No card. No commitment. First 10 shifts on us — only pay when you hire.
            </Text>
            <View style={styles.finalCtaRow}>
              <View style={{ minWidth: 220, maxWidth: 280 }}>
                <GradientBtn onPress={() => navigation.navigate('BusinessVerify')}>
                  Start hiring
                </GradientBtn>
              </View>
              <Pressable
                onPress={() => navigation.navigate('BusinessVerify')}
                style={({ hovered }: any) => [styles.signInPress, hovered && { opacity: 0.65 }]}
              >
                <Text style={styles.signIn}>
                  Already have an account? <Text style={styles.signInAccent}>Sign in →</Text>
                </Text>
              </Pressable>
            </View>
          </FadeUp>

          {/* ─── Enterprise footer ─── */}
          <View style={styles.footer}>
            <View style={styles.footerTop}>
              <View style={styles.footerBrand}>
                <Logo size={28} />
                <Text style={styles.footerTagline}>Casual labour, on-rails.</Text>
                <View style={styles.footerStatus}>
                  <Animated.View style={[styles.liveDot, { opacity: pulse }]} />
                  <Text style={styles.footerStatusText}>All systems operational</Text>
                </View>
                <View style={styles.complianceRow}>
                  <View style={styles.compBadge}><Text style={styles.compBadgeText}>ODPC</Text></View>
                  <View style={styles.compBadge}><Text style={styles.compBadgeText}>KRA</Text></View>
                  <View style={styles.compBadge}><Text style={styles.compBadgeText}>WIBA</Text></View>
                  <View style={styles.compBadge}><Text style={styles.compBadgeText}>NSSF</Text></View>
                </View>
              </View>

              <View style={styles.footerCol}>
                <Text style={styles.footerColLabel}>PRODUCT</Text>
                <Pressable style={({ hovered }: any) => hovered && { opacity: 0.7 }}><Text style={styles.footerLink}>How it works</Text></Pressable>
                <Pressable style={({ hovered }: any) => hovered && { opacity: 0.7 }}><Text style={styles.footerLink}>Pricing</Text></Pressable>
                <Pressable style={({ hovered }: any) => hovered && { opacity: 0.7 }}><Text style={styles.footerLink}>For workers</Text></Pressable>
                <Pressable style={({ hovered }: any) => hovered && { opacity: 0.7 }}><Text style={styles.footerLink}>Klokd Health</Text></Pressable>
                <Pressable style={({ hovered }: any) => hovered && { opacity: 0.7 }}><Text style={styles.footerLink}>What's new</Text></Pressable>
              </View>

              <View style={styles.footerCol}>
                <Text style={styles.footerColLabel}>RESOURCES</Text>
                <Pressable style={({ hovered }: any) => hovered && { opacity: 0.7 }}><Text style={styles.footerLink}>Help center</Text></Pressable>
                <Pressable style={({ hovered }: any) => hovered && { opacity: 0.7 }}><Text style={styles.footerLink}>API docs</Text></Pressable>
                <Pressable style={({ hovered }: any) => hovered && { opacity: 0.7 }}><Text style={styles.footerLink}>Status</Text></Pressable>
                <Pressable style={({ hovered }: any) => hovered && { opacity: 0.7 }}><Text style={styles.footerLink}>Compliance reports</Text></Pressable>
                <Pressable style={({ hovered }: any) => hovered && { opacity: 0.7 }}><Text style={styles.footerLink}>Sample contracts</Text></Pressable>
              </View>

              <View style={styles.footerCol}>
                <Text style={styles.footerColLabel}>TRUST &amp; SECURITY</Text>
                <Pressable style={({ hovered }: any) => hovered && { opacity: 0.7 }}><Text style={styles.footerLink}>Trust center</Text></Pressable>
                <Pressable style={({ hovered }: any) => hovered && { opacity: 0.7 }}><Text style={styles.footerLink}>Security</Text></Pressable>
                <Pressable style={({ hovered }: any) => hovered && { opacity: 0.7 }}><Text style={styles.footerLink}>Privacy policy</Text></Pressable>
                <Pressable style={({ hovered }: any) => hovered && { opacity: 0.7 }}><Text style={styles.footerLink}>Terms of service</Text></Pressable>
                <Pressable style={({ hovered }: any) => hovered && { opacity: 0.7 }}><Text style={styles.footerLink}>DPA 2019</Text></Pressable>
              </View>

              <View style={styles.footerCol}>
                <Text style={styles.footerColLabel}>COMPANY</Text>
                <Pressable style={({ hovered }: any) => hovered && { opacity: 0.7 }}><Text style={styles.footerLink}>About</Text></Pressable>
                <Pressable style={({ hovered }: any) => hovered && { opacity: 0.7 }}><Text style={styles.footerLink}>Customers</Text></Pressable>
                <Pressable style={({ hovered }: any) => hovered && { opacity: 0.7 }}><Text style={styles.footerLink}>Careers</Text></Pressable>
                <Pressable style={({ hovered }: any) => hovered && { opacity: 0.7 }}><Text style={styles.footerLink}>Contact</Text></Pressable>
                <Pressable style={({ hovered }: any) => hovered && { opacity: 0.7 }}><Text style={styles.footerLink}>Press</Text></Pressable>
              </View>
            </View>

            {/* Footer base — copyright + region selector */}
            <View style={styles.footerBase}>
              <Text style={styles.footerCopy}>© 2026 Klokd Workplace Solutions Ltd · A Kipkiren Teknolojia company</Text>
              <View style={styles.footerLocale}>
                <Text style={styles.footerLocaleText}>KSh · KE · English</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },

  // ─── Sticky scroll CTA ─────────────────────────────
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

  // ─── Trust badges in hero ──────────────────────────
  trustBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.white10,
    backgroundColor: colors.white03,
  },
  trustBadgeIcon: { width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  trustBadgeText: { color: colors.white80, fontSize: 11.5, fontWeight: '700', letterSpacing: -0.1 },

  // ─── Floating activity feed (overlaid on mockup) ──
  activityFeed: {
    position: 'absolute',
    bottom: -16,
    left: -24,
    zIndex: 10,
    gap: 0,
    width: 280,
  },
  activityToast: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(15,15,24,0.95)',
    borderWidth: 1,
    borderColor: colors.white10,
    marginBottom: 6,
    ...(Platform.OS === 'web' ? ({ backdropFilter: 'blur(12px)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' } as any) : {}),
  },
  activityIcon: {
    width: 26,
    height: 26,
    borderRadius: 999,
    backgroundColor: 'rgba(0,229,160,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0,229,160,0.30)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityIconText: { color: colors.electric, fontSize: 12, fontWeight: '900' },
  activityTitle: { color: colors.white, fontSize: 12, fontWeight: '700', letterSpacing: -0.1 },
  activitySub: { color: colors.white50, fontSize: 10.5, marginTop: 1 },

  // ─── Mockup live activity stream ──────────────────
  activityStream: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.white06,
    gap: 4,
  },
  activityStreamLabel: { color: colors.white35, fontSize: 9.5, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 2 },
  activityRowIcon: { color: colors.white45, fontSize: 11, fontWeight: '900', width: 14 },
  activityRowText: { color: colors.white80, fontSize: 11.5, flex: 1 },
  activityRowTs: { color: colors.white35, fontSize: 10.5 },

  // ─── Why Klokd Wins comparison ────────────────────
  compWrap: { marginTop: spacing.xxxl + 24 },
  compTable: {
    marginTop: spacing.xl,
    borderRadius: radius.xxl,
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderWidth: 1,
    borderColor: colors.white08,
    overflow: 'hidden',
  },
  compHead: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.white08,
  },
  compHeadLabel: { color: colors.white40, fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginBottom: 4 },
  compHeadTitle: { color: colors.white, fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  compRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.white06,
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  compTopic: { minWidth: 160, flex: 0.5 },
  compTopicText: { color: colors.white45, fontSize: 11.5, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' },
  compCells: { flex: 1, flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  compOld: { flex: 1 },
  compOldText: { color: colors.white45, fontSize: 14, textDecorationLine: 'line-through' as any, textDecorationColor: colors.white25 },
  compNew: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, justifyContent: 'flex-end' },
  compCheck: {
    width: 20,
    height: 20,
    borderRadius: 999,
    backgroundColor: 'rgba(0,229,160,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(0,229,160,0.32)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compNewText: { color: colors.white, fontSize: 14, fontWeight: '700', letterSpacing: -0.2, textAlign: 'right' as any },

  // ─── Mega stats banner ────────────────────────────
  megaStatsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.xxxl + 24,
    padding: spacing.xxl,
    borderRadius: radius.xxl,
    backgroundColor: 'rgba(0,229,160,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(0,229,160,0.18)',
    gap: spacing.lg,
  },
  megaStat: { flex: 1, minWidth: 180, paddingHorizontal: spacing.md, alignItems: 'center' },
  megaStatDivider: { borderLeftWidth: 1, borderLeftColor: colors.white08 },
  megaStatK: {
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: -1.8,
    color: colors.white,
    textAlign: 'center',
    lineHeight: 48,
  },
  megaStatL: {
    color: colors.white60,
    fontSize: 12.5,
    fontWeight: '600',
    letterSpacing: -0.1,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 17,
  },

  // ─── Enterprise footer ────────────────────────────
  footerBrand: { flex: 1.4, minWidth: 220 },
  footerStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md },
  footerStatusText: { color: colors.white60, fontSize: 11.5, fontWeight: '600' },
  footerBase: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.white06,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  footerLocale: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.white10,
    backgroundColor: colors.white03,
  },
  footerLocaleText: { color: colors.white60, fontSize: 11.5, fontWeight: '600' },

  dotsLayer: { position: 'absolute', top: 0, left: 0, right: 0, height: 780, overflow: 'hidden' },
  orb: { position: 'absolute', borderRadius: 999, overflow: 'hidden' },
  orbA: { top: -200, right: -200, width: 760, height: 760 },
  orbB: { top: 200, left: -260, width: 580, height: 580 },

  scroll: { paddingBottom: spacing.xxxl + 32 },
  maxWidth: { width: '100%', maxWidth: 1180, alignSelf: 'center', paddingHorizontal: spacing.xl },

  // Top bar — bolder, more presence
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
  forEmpBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(188,255,78,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(188,255,78,0.28)',
  },
  forEmpText: { color: colors.volt, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  topNav: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  navItem: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  navItemHover: { backgroundColor: colors.white06 },
  navText: { color: colors.white80, fontSize: 14.5, fontWeight: '700', letterSpacing: -0.2 },
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
  hero: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xxxl,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
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
  liveDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.electric },

  h1: {
    fontSize: 52,
    fontWeight: '900',
    letterSpacing: -2.2,
    lineHeight: 54,
    color: colors.white,
    marginBottom: spacing.lg,
  },
  h1Accent: { color: colors.electric },
  subhead: {
    fontSize: 16,
    color: colors.white65,
    lineHeight: 22.4,
    marginBottom: spacing.xl,
    maxWidth: 480,
  },
  ctaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, alignItems: 'center', marginBottom: spacing.lg },
  primaryCtaWrap: { flex: 1, minWidth: 180 },
  ghostBtn: {
    paddingVertical: 16,
    paddingHorizontal: 22,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.white15,
    backgroundColor: colors.white03,
  },
  ghostBtnHover: { borderColor: colors.electric, backgroundColor: 'rgba(0,229,160,0.06)' },
  ghostBtnText: { color: colors.white, fontSize: 14, fontWeight: '700', letterSpacing: -0.15 },
  trustRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  avatarStack: { flexDirection: 'row', alignItems: 'center' },
  avatarStackItem: {
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.ink,
  },
  trustText: { color: colors.white60, fontSize: 12.5, fontWeight: '600' },

  // Mockup w/ depth
  mockupWrap: { flex: 1, minWidth: 320, maxWidth: 510, position: 'relative' },
  mockupShadow: {
    position: 'absolute',
    top: 30,
    left: 30,
    right: -10,
    height: '92%',
    backgroundColor: 'rgba(0,229,160,0.18)',
    borderRadius: radius.xxl + 4,
    filter: Platform.OS === 'web' ? ('blur(60px)' as any) : undefined,
  } as any,
  mockupBackCard: {
    position: 'absolute',
    top: 22,
    left: 22,
    right: -10,
    bottom: -8,
    backgroundColor: '#0B0B14',
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.white06,
    opacity: 0.6,
  },
  mockup: {
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.white12,
    backgroundColor: '#0F0F18',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 28 },
    shadowOpacity: 0.55,
    shadowRadius: 60,
    elevation: 14,
  },
  // App bar (replaces terminal chrome)
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.white08,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  appBarLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  appBarLogo: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: colors.electric,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appBarLogoText: { color: colors.ink, fontSize: 17, fontWeight: '900', letterSpacing: -0.5 },
  appBarTitle: { color: colors.white, fontSize: 14, fontWeight: '800', letterSpacing: -0.3 },
  appBarSub: { color: colors.white50, fontSize: 11, marginTop: 1 },
  bellWrap: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  bellDot: {
    position: 'absolute',
    top: 6,
    right: 5,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.electric,
    borderWidth: 1.5,
    borderColor: '#0F0F18',
  },

  mockupBody: { padding: spacing.lg },
  mockHeadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: spacing.md },
  mockEyebrow: { color: colors.white50, fontSize: 11, fontWeight: '600', marginBottom: 4 },
  mockTitle: { color: colors.white, fontSize: 18, fontWeight: '800', letterSpacing: -0.4 },
  mockBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: 'rgba(0,229,160,0.10)' },
  mockBadgeText: { color: colors.electric, fontSize: 9.5, fontWeight: '800', letterSpacing: 0.8 },

  // Shift row — humanised
  mockCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.white03,
    borderWidth: 1,
    borderColor: colors.white06,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  shiftAvatar: { width: 38, height: 38 },
  shiftAvatarFilled: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shiftAvatarText: { color: colors.white, fontSize: 13, fontWeight: '800', letterSpacing: -0.2 },
  shiftAvatarEmpty: {
    width: 38,
    height: 38,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.white10,
    borderStyle: 'dashed' as any,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockCardTitle: { color: colors.white, fontSize: 14, fontWeight: '700', letterSpacing: -0.2 },
  mockCardSub: { color: colors.white70, fontSize: 12, marginTop: 1 },
  mockCardMeta: { color: colors.white45, fontSize: 11, marginTop: 3 },
  mockRate: { color: colors.white, fontSize: 14, fontWeight: '800' },
  statePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.white15,
    backgroundColor: colors.white03,
    marginTop: 5,
  },
  statePillFilled: { borderColor: 'rgba(0,229,160,0.35)', backgroundColor: 'rgba(0,229,160,0.10)' },
  statePillFilling: { borderColor: 'rgba(0,229,160,0.20)', backgroundColor: 'rgba(0,229,160,0.05)' },
  statePillCheck: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.electric },
  stateText: { color: colors.white70, fontSize: 10.5, fontWeight: '700', letterSpacing: -0.1 },

  // Footer — M-Pesa branded card
  mockFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.white06,
  },
  mpesaCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  mpesaIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#00A859', // Safaricom green
    alignItems: 'center',
    justifyContent: 'center',
  },
  mpesaIconText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  mockFooterLabel: { color: colors.white50, fontSize: 10.5, fontWeight: '600' },
  mockFooterValue: { color: colors.white, fontSize: 15, fontWeight: '800', marginTop: 2 },

  // Metrics
  metricsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.xxxl + spacing.lg,
    padding: spacing.xl,
    borderRadius: radius.xxl,
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderWidth: 1,
    borderColor: colors.white06,
  },
  metric: { flex: 1, minWidth: 180, paddingHorizontal: spacing.md },
  metricDivider: { borderLeftWidth: 1, borderLeftColor: colors.white06 },
  metricRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  metricK: { fontSize: 36, fontWeight: '900', letterSpacing: -1.4, color: colors.white, lineHeight: 38 },
  metricL: { color: colors.white50, fontSize: 11, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 6 },
  metricDeltaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: spacing.md },
  metricArrow: { color: colors.electric, fontSize: 12, fontWeight: '900' },
  metricDelta: { color: colors.electric, fontSize: 11.5, fontWeight: '700' },

  // Trusted by
  trustedLabel: { textAlign: 'center', marginTop: spacing.xxxl + 16 },
  sectorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xxl, justifyContent: 'center', marginTop: spacing.lg, alignItems: 'center' },
  wordmark: { color: colors.white35, fontSize: 22, letterSpacing: -0.5 },

  // How it works
  howWrap: { marginTop: spacing.xxxl + 24 },
  h2: { fontSize: 32, fontWeight: '900', letterSpacing: -1.2, lineHeight: 35, color: colors.white, marginBottom: spacing.md },
  stepsFlow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', marginTop: spacing.xxl, gap: 0 },
  stepCol: { flex: 1, minWidth: 200 },
  stepCard: {
    padding: spacing.lg,
    borderRadius: radius.xxl,
    backgroundColor: colors.white03,
    borderWidth: 1,
    borderColor: colors.white08,
    minHeight: 168,
  },
  stepCardHover: { borderColor: colors.white20, backgroundColor: colors.white06, transform: [{ translateY: -2 }] },
  stepHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(0,229,160,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(0,229,160,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNum: { color: colors.white25, fontSize: 13, fontWeight: '900', letterSpacing: 0.8 },
  stepTitle: { color: colors.white, fontSize: 17, fontWeight: '800', letterSpacing: -0.4, lineHeight: 20 },
  stepSub: { color: colors.white55, fontSize: 13, marginTop: 6, lineHeight: 18.5 },
  connector: { width: 32, alignSelf: 'center', justifyContent: 'center', overflow: 'hidden' },

  // Built for Kenya
  builtWrap: { marginTop: spacing.xxxl + 24 },
  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.xl },
  featureWrap: { flex: 1, minWidth: 270, maxWidth: '33%' },
  feature: { padding: spacing.lg, borderRadius: radius.xxl, backgroundColor: colors.white03, borderWidth: 1, borderColor: colors.white06, minHeight: 158 },
  featureHover: { borderColor: colors.white15, backgroundColor: colors.white06, transform: [{ translateY: -2 }] },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(0,229,160,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(0,229,160,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  featureTitle: { color: colors.white, fontSize: 16, fontWeight: '800', letterSpacing: -0.35 },
  featureSub: { color: colors.white55, fontSize: 13, marginTop: 6, lineHeight: 18.5 },

  // Testimonials
  quotesWrap: { marginTop: spacing.xxxl + 24 },
  quotesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.xl },
  quoteWrap: { flex: 1, minWidth: 280 },
  quoteWrapFeatured: { flex: 1.6, minWidth: 320 },
  quote: { padding: spacing.lg, borderRadius: radius.xxl, backgroundColor: colors.white03, borderWidth: 1, borderColor: colors.white06, height: '100%' },
  quoteFeatured: { backgroundColor: 'rgba(0,229,160,0.05)', borderColor: 'rgba(0,229,160,0.22)' },
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

  // Carousel
  carouselWrap: { marginTop: spacing.xxxl + 24, maxWidth: 720 },
  dots: { flexDirection: 'row', gap: 4, marginTop: spacing.lg, marginBottom: spacing.xl, maxWidth: 240 },

  // Final CTA
  finalCtaBlock: {
    marginTop: spacing.xxxl + 16,
    padding: spacing.xxxl,
    borderRadius: radius.xxl,
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderWidth: 1,
    borderColor: colors.white06,
    alignItems: 'center',
  },
  finalH: {
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: -1.6,
    lineHeight: 42,
    color: colors.white,
    textAlign: 'center',
  },
  finalCtaRow: { marginTop: spacing.xl, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, alignItems: 'center', justifyContent: 'center' },
  signInPress: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  signIn: { fontSize: 13, color: colors.white50 },
  signInAccent: { color: colors.electric, fontWeight: '700' },

  // Footer
  footer: { marginTop: spacing.xxxl + 8, paddingTop: spacing.xl, borderTopWidth: 1, borderTopColor: colors.white06 },
  footerTop: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xl, alignItems: 'flex-start' },
  footerTagline: { color: colors.white50, fontSize: 12.5, marginTop: spacing.sm, marginBottom: spacing.lg },
  footerCopy: { color: colors.white30, fontSize: 11 },
  footerCol: { minWidth: 140 },
  footerColLabel: { color: colors.white40, fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginBottom: spacing.md },
  footerLink: { color: colors.white70, fontSize: 13, marginBottom: spacing.sm },
  complianceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  compBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: colors.white10, backgroundColor: colors.white03 },
  compBadgeText: { color: colors.white70, fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
});
