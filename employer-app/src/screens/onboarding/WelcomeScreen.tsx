/**
 * Welcome (business) — what Klokd does for a venue, then a scroll story:
 * a shift from posting to approved pay, costs itemised, who's coming, and
 * compliance handled. Sections animate as they scroll into view; Get started
 * stays pinned. No invented numbers, logos or testimonials — cost bars are
 * illustrative and say so.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GradientBtn, Eyebrow, Logo } from '../../components/Primitives';
import { AmbientOrbs, FadeUp, SafeTop, PressScale, Glass } from '../../components/KlokdLayout';
import { Reveal, useScrollStory, Story } from '../../components/Story';
import { Icons } from '../../components/Icons';
import { colors } from '../../theme';

type Props = { navigation: NativeStackNavigationProp<any> };

const STEPS = [
  { icon: 'shield' as const, t: 'Verify your business', d: 'Add your KRA PIN and your Work Injury Benefits Act policy once. Then you can post.' },
  { icon: 'calendar' as const, t: 'Post a shift', d: 'Role, day, hours, area and pay. Verified workers nearby can apply straight away.' },
  { icon: 'user' as const, t: 'Pick who works it', d: 'See each applicant’s verification, rating and show-up rate, then pick one.' },
  { icon: 'pin' as const, t: 'Give the PIN, approve the pay', d: 'The worker checks in at your venue; you give them the start PIN. After clock-out you check the hours and pay.' },
];

const JOURNEY = [
  { t: 'Posted', d: 'Klokd checks the pay against the minimum wage before it goes live.' },
  { t: 'Picked', d: 'You choose one verified applicant. The shift contract is generated.' },
  { t: 'Checked in', d: 'They arrive at your venue; you read them the start PIN.' },
  { t: 'Approved', d: 'After clock-out you check the hours. Pay goes to their M-Pesa.' },
];

// Illustrative proportions only — real figures appear on every shift.
const PAY = [
  { t: 'Worker’s shift pay', w: 0.96, tone: 'base' },
  { t: 'Klokd fee (4%)', w: 0.04, tone: 'minus' },
  { t: 'Your total', w: 1, tone: 'net' },
] as const;

export function WelcomeScreen({ navigation }: Props) {
  const story = useScrollStory();
  return (
    <View style={styles.screen}>
      <AmbientOrbs />
      <SafeTop />
      <Animated.ScrollView
        contentContainerStyle={styles.content}
        onScroll={story.onScroll}
        scrollEventThrottle={16}
        onLayout={story.onViewport}
        showsVerticalScrollIndicator={false}
      >
        <FadeUp delay={0}>
          <Logo size={34} />
        </FadeUp>
        <FadeUp delay={80} style={{ marginTop: 36 }}>
          <Eyebrow color={colors.volt}>Klokd for business</Eyebrow>
          <Text style={styles.h1}>Verified staff for your next shift.</Text>
          <Text style={styles.sub}>
            Post hospitality shifts in Nairobi, pick from ID-verified workers, and see every shift’s hours and pay in one place.
          </Text>
        </FadeUp>

        <View style={{ marginTop: 28, gap: 12 }}>
          {STEPS.map((s, i) => {
            const Ico = Icons[s.icon];
            return (
              <FadeUp key={s.t} delay={160 + i * 70}>
                <Glass style={styles.step}>
                  <View style={styles.stepIcon}>
                    <Ico color={colors.volt} size={18} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.stepT}>{s.t}</Text>
                    <Text style={styles.stepD}>{s.d}</Text>
                  </View>
                </Glass>
              </FadeUp>
            );
          })}
        </View>

        <FadeUp delay={520}>
          <Text style={styles.scrollHint}>Scroll to see how hiring works ↓</Text>
        </FadeUp>

        {/* ── The story continues ─────────────────────────── */}

        <Reveal story={story} style={styles.section}>
          <Eyebrow color={colors.volt}>A shift, start to finish</Eyebrow>
          <Text style={styles.h2}>From posting to approved pay.</Text>
        </Reveal>
        <Journey story={story} />

        <Reveal story={story} style={styles.section}>
          <Eyebrow color={colors.volt}>Clear costs</Eyebrow>
          <Text style={styles.h2}>One price per shift.</Text>
          <Text style={styles.p}>You pay the worker’s shift pay plus Klokd’s 4% fee. Statutory deductions are worked out for you and shown on every shift.</Text>
        </Reveal>
        <PayBreakdown story={story} />

        <Reveal story={story} style={styles.section}>
          <Eyebrow color={colors.volt}>Know who’s coming</Eyebrow>
          <Text style={styles.h2}>Verified people, real track records.</Text>
        </Reveal>
        <Reveal story={story} from="left" style={{ marginTop: 14 }}>
          <Glass style={styles.side}>
            <View style={styles.sideIcon}><Icons.id color={colors.volt} size={18} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sideT}>ID-verified</Text>
              <Text style={styles.sideD}>Every applicant’s National ID is checked with the government register before they can apply.</Text>
            </View>
          </Glass>
        </Reveal>
        <Reveal story={story} from="right" style={{ marginTop: 10 }}>
          <Glass style={styles.side}>
            <View style={styles.sideIcon}><Icons.star color={colors.volt} size={18} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sideT}>Show-up rate and ratings</Text>
              <Text style={styles.sideD}>See how often they turn up. Ratings appear after three reviews, so one bad night doesn’t define anyone.</Text>
            </View>
          </Glass>
        </Reveal>

        <Reveal story={story} style={styles.section}>
          <Eyebrow color={colors.volt}>Compliance built in</Eyebrow>
          <Text style={styles.h2}>The paperwork, handled.</Text>
          <View style={{ gap: 10, marginTop: 14 }}>
            {[
              'Minimum wage checked on every shift you post.',
              'A written contract (Employment Act s.9) for every shift.',
              'PAYE, NSSF, SHIF and housing levy worked out per shift, with a monthly CSV.',
            ].map(t => (
              <View key={t} style={styles.bullet}>
                <View style={styles.bulletDot} />
                <Text style={styles.bulletText}>{t}</Text>
              </View>
            ))}
          </View>
        </Reveal>

        <Reveal story={story} style={[styles.section, { alignItems: 'center' }]}>
          <Text style={[styles.h2, { textAlign: 'center' }]}>Ready when you are.</Text>
          <Text style={styles.note}>Klokd is in early access in Nairobi. M-Pesa funding and payouts switch on when Klokd payments (Kipkiren Pay) go live.</Text>
        </Reveal>
      </Animated.ScrollView>

      <View style={styles.footer}>
        <GradientBtn onPress={() => navigation.navigate('SignIn')}>Get started</GradientBtn>
        <PressScale onPress={() => navigation.navigate('SignIn')} style={styles.signIn}>
          <Text style={styles.signInText}>I already have an account</Text>
        </PressScale>
      </View>
    </View>
  );
}

/** A shift card whose stages light up one by one as you scroll past it. */
function Journey({ story }: { story: Story }) {
  const [y, setY] = useState(0);
  const p = story.progress(y + 60, 420);
  return (
    <View onLayout={e => setY(e.nativeEvent.layout.y)} style={{ marginTop: 16 }}>
      <Glass style={styles.journey}>
        <View style={styles.journeyHead}>
          <Text style={styles.journeyRole}>Waiter · Saturday evening</Text>
          <Text style={styles.journeyTag}>Your venue</Text>
        </View>
        {JOURNEY.map((s, i) => {
          const on = p.interpolate({ inputRange: [i / 4, Math.min(1, (i + 0.7) / 4)], outputRange: [0, 1], extrapolate: 'clamp' });
          return (
            <View key={s.t} style={styles.stage}>
              <View style={styles.stageRail}>
                <View style={styles.stageDot}>
                  <Animated.View style={[StyleSheet.absoluteFill, styles.stageDotOn, { opacity: on, transform: [{ scale: on.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] }]} />
                </View>
                {i < JOURNEY.length - 1 && (
                  <View style={styles.stageLine}>
                    <Animated.View style={[styles.stageLineOn, { height: on.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
                  </View>
                )}
              </View>
              <Animated.View style={{ flex: 1, paddingBottom: 16, opacity: on.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }}>
                <Text style={styles.stageT}>{s.t}</Text>
                <Text style={styles.stageD}>{s.d}</Text>
              </Animated.View>
            </View>
          );
        })}
      </Glass>
    </View>
  );
}

/** Pay lines draw in one after another as you scroll. */
function PayBreakdown({ story }: { story: Story }) {
  const [y, setY] = useState(0);
  const p = story.progress(y + 40, 360);
  return (
    <View onLayout={e => setY(e.nativeEvent.layout.y)} style={{ marginTop: 16 }}>
      <Glass style={styles.pay}>
        {PAY.map((r, i) => {
          const on = p.interpolate({ inputRange: [i / PAY.length, (i + 1) / PAY.length], outputRange: [0, 1], extrapolate: 'clamp' });
          return (
            <View key={r.t} style={[styles.payRow, r.tone === 'net' && styles.payNet]}>
              <Text style={[styles.payT, r.tone === 'net' && { color: colors.white, fontWeight: '900' }]}>{r.tone === 'minus' ? `− ${r.t}` : r.t}</Text>
              <View style={styles.payTrack}>
                <Animated.View
                  style={[
                    styles.payBar,
                    r.tone === 'minus' && { backgroundColor: 'rgba(255,255,255,0.35)' },
                    r.tone === 'net' && { backgroundColor: colors.volt },
                    { width: on.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${Math.max(r.w * 100, 3)}%`] }) },
                  ]}
                />
              </View>
            </View>
          );
        })}
        <Text style={styles.payNote}>Illustration. Your real figures are shown on every shift.</Text>
      </Glass>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  content: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 },
  h1: { fontSize: 32, fontWeight: '900', color: colors.white, letterSpacing: -1.3, marginTop: 10, lineHeight: 36 },
  h2: { fontSize: 26, fontWeight: '900', color: colors.white, letterSpacing: -0.9, marginTop: 8, lineHeight: 30 },
  sub: { fontSize: 15, color: colors.white70, lineHeight: 22, marginTop: 12 },
  p: { fontSize: 14.5, color: colors.white65, lineHeight: 21, marginTop: 10 },
  step: { flexDirection: 'row', gap: 14, padding: 14, borderRadius: 18 },
  stepIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.voltAlpha['10'], alignItems: 'center', justifyContent: 'center' },
  stepT: { fontSize: 15, fontWeight: '900', color: colors.white },
  stepD: { fontSize: 12.5, color: colors.white65, lineHeight: 18, marginTop: 3 },
  scrollHint: { color: colors.white45, fontSize: 12.5, textAlign: 'center', marginTop: 26 },
  section: { marginTop: 56 },
  journey: { padding: 18, borderRadius: 22 },
  journeyHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 10 },
  journeyRole: { color: colors.white, fontSize: 16, fontWeight: '800', flexShrink: 1 },
  journeyTag: { color: colors.volt, fontSize: 11, fontWeight: '800', backgroundColor: colors.voltAlpha['10'], paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },
  stage: { flexDirection: 'row', gap: 14 },
  stageRail: { width: 18, alignItems: 'center' },
  stageDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' },
  stageDotOn: { backgroundColor: colors.volt, borderRadius: 9 },
  stageLine: { width: 2, flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: 3 },
  stageLineOn: { width: 2, backgroundColor: colors.volt },
  stageT: { color: colors.white, fontSize: 15, fontWeight: '800' },
  stageD: { color: colors.white60, fontSize: 13, lineHeight: 18, marginTop: 2 },
  pay: { padding: 18, borderRadius: 22, gap: 12 },
  payRow: { gap: 6 },
  payNet: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.18)', paddingTop: 12 },
  payT: { color: colors.white70, fontSize: 13.5, fontWeight: '600' },
  payTrack: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.07)', overflow: 'hidden' },
  payBar: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.8)' },
  payNote: { color: colors.white40, fontSize: 11.5, marginTop: 4 },
  side: { flexDirection: 'row', gap: 14, padding: 16, borderRadius: 20 },
  sideIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.voltAlpha['10'], alignItems: 'center', justifyContent: 'center' },
  sideT: { color: colors.white, fontSize: 15, fontWeight: '900' },
  sideD: { color: colors.white65, fontSize: 13, lineHeight: 18, marginTop: 3 },
  bullet: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  bulletDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.volt, marginTop: 8 },
  bulletText: { flex: 1, color: colors.white75, fontSize: 14.5, lineHeight: 21 },
  note: { fontSize: 12, color: colors.white55, lineHeight: 18, marginTop: 12, textAlign: 'center' },
  footer: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 24, gap: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.1)' },
  signIn: { alignItems: 'center', paddingVertical: 12 },
  signInText: { color: colors.white75, fontSize: 14, fontWeight: '700' },
});
