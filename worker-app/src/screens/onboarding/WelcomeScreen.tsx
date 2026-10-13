/**
 * Welcome — what Klokd is, then a scroll story that continues below it:
 * a shift from tap to M-Pesa, pay itemised, verification on both sides, and
 * the worker's data rights. Sections animate as they scroll into view; Get
 * started stays pinned. No invented numbers, testimonials or activity —
 * pay bars are illustrative and say so.
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
  { icon: 'id' as const, t: 'Verify once', d: 'Your National ID is checked with the government register through Identiti. Businesses see a verified badge, never your ID.' },
  { icon: 'calendar' as const, t: 'Pick up shifts nearby', d: 'Hospitality shifts posted by verified Nairobi businesses with a KRA PIN and work-injury cover.' },
  { icon: 'pin' as const, t: 'Check in, get the PIN, start', d: 'Tap “I’ve arrived” at the venue, enter the manager’s 4-digit PIN, and your shift starts.' },
  { icon: 'wallet' as const, t: 'See every shilling', d: 'Pay, PAYE, NSSF, SHIF and housing levy shown per shift. M-Pesa payouts switch on when Klokd payments go live.' },
];

const JOURNEY = [
  { t: 'Applied', d: 'You see the take-home pay before you apply.' },
  { t: 'Picked', d: 'The business picks you and the shift contract is ready.' },
  { t: 'Checked in', d: 'At the venue: “I’ve arrived”, then the manager’s PIN.' },
  { t: 'Paid', d: 'Clock out. Pay is approved and sent to your M-Pesa.' },
];

// Illustrative proportions only — real figures appear on every shift.
const PAY = [
  { t: 'Shift pay', w: 1, tone: 'base' },
  { t: 'PAYE', w: 0.08, tone: 'minus' },
  { t: 'NSSF', w: 0.06, tone: 'minus' },
  { t: 'SHIF', w: 0.0275, tone: 'minus' },
  { t: 'To your M-Pesa', w: 0.83, tone: 'net' },
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
          <Eyebrow>Klokd · for workers</Eyebrow>
          <Text style={styles.h1}>Verified shifts. Clear pay.</Text>
          <Text style={styles.sub}>
            Find hospitality shifts near you in Nairobi, check in with your phone, and see exactly what you’re paid after statutory deductions.
          </Text>
        </FadeUp>

        <View style={{ marginTop: 28, gap: 12 }}>
          {STEPS.map((s, i) => {
            const Ico = Icons[s.icon];
            return (
              <FadeUp key={s.t} delay={160 + i * 70}>
                <Glass style={styles.step}>
                  <View style={styles.stepIcon}>
                    <Ico color={colors.electric} size={18} />
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
          <Text style={styles.scrollHint}>Scroll to see how a shift works ↓</Text>
        </FadeUp>

        {/* ── The story continues ─────────────────────────── */}

        <Reveal story={story} style={styles.section}>
          <Eyebrow>Your shift, start to finish</Eyebrow>
          <Text style={styles.h2}>From one tap to your M-Pesa.</Text>
        </Reveal>
        <Journey story={story} />

        <Reveal story={story} style={styles.section}>
          <Eyebrow>See every shilling</Eyebrow>
          <Text style={styles.h2}>Every deduction, itemised.</Text>
          <Text style={styles.p}>Before you apply, you see what you take home. After the shift, each deduction is listed. Nothing hidden.</Text>
        </Reveal>
        <PayBreakdown story={story} />

        <Reveal story={story} style={styles.section}>
          <Eyebrow>Verified on both sides</Eyebrow>
          <Text style={styles.h2}>You know who you’re working for.</Text>
        </Reveal>
        <Reveal story={story} from="left" style={{ marginTop: 14 }}>
          <Glass style={styles.side}>
            <View style={styles.sideIcon}><Icons.id color={colors.electric} size={18} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sideT}>You</Text>
              <Text style={styles.sideD}>ID checked with the government register. Businesses see the badge, never the document.</Text>
            </View>
          </Glass>
        </Reveal>
        <Reveal story={story} from="right" style={{ marginTop: 10 }}>
          <Glass style={styles.side}>
            <View style={styles.sideIcon}><Icons.shield color={colors.electric} size={18} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sideT}>The business</Text>
              <Text style={styles.sideD}>KRA PIN and work-injury (WIBA) cover on file before they can post a shift.</Text>
            </View>
          </Glass>
        </Reveal>

        <Reveal story={story} style={styles.section}>
          <Eyebrow>Your data, your say</Eyebrow>
          <Text style={styles.h2}>Private by default.</Text>
          <View style={{ gap: 10, marginTop: 14 }}>
            {[
              'Your location is read once at check-in and clock-out. Never tracked.',
              'Download everything Klokd holds about you, any time.',
              'Ask for a correction or to delete your account from the app.',
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
          <Text style={styles.note}>Klokd is in early access in Nairobi. Your data is handled under Kenya’s Data Protection Act 2019.</Text>
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
          <Text style={styles.journeyRole}>Waiter · evening shift</Text>
          <Text style={styles.journeyTag}>Verified business</Text>
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
                    r.tone === 'net' && { backgroundColor: colors.electric },
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
  h1: { fontSize: 34, fontWeight: '900', color: colors.white, letterSpacing: -1.4, marginTop: 10, lineHeight: 38 },
  h2: { fontSize: 26, fontWeight: '900', color: colors.white, letterSpacing: -0.9, marginTop: 8, lineHeight: 30 },
  sub: { fontSize: 15, color: colors.white70, lineHeight: 22, marginTop: 12 },
  p: { fontSize: 14.5, color: colors.white65, lineHeight: 21, marginTop: 10 },
  step: { flexDirection: 'row', gap: 14, padding: 14, borderRadius: 18 },
  stepIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.electricAlpha['10'], alignItems: 'center', justifyContent: 'center' },
  stepT: { fontSize: 15, fontWeight: '900', color: colors.white },
  stepD: { fontSize: 12.5, color: colors.white65, lineHeight: 18, marginTop: 3 },
  scrollHint: { color: colors.white45, fontSize: 12.5, textAlign: 'center', marginTop: 26 },
  section: { marginTop: 56 },
  journey: { padding: 18, borderRadius: 22 },
  journeyHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 10 },
  journeyRole: { color: colors.white, fontSize: 16, fontWeight: '800', flexShrink: 1 },
  journeyTag: { color: colors.electric, fontSize: 11, fontWeight: '800', backgroundColor: colors.electricAlpha['10'], paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },
  stage: { flexDirection: 'row', gap: 14 },
  stageRail: { width: 18, alignItems: 'center' },
  stageDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' },
  stageDotOn: { backgroundColor: colors.electric, borderRadius: 9 },
  stageLine: { width: 2, flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: 3 },
  stageLineOn: { width: 2, backgroundColor: colors.electric },
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
  sideIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.electricAlpha['10'], alignItems: 'center', justifyContent: 'center' },
  sideT: { color: colors.white, fontSize: 15, fontWeight: '900' },
  sideD: { color: colors.white65, fontSize: 13, lineHeight: 18, marginTop: 3 },
  bullet: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  bulletDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.electric, marginTop: 8 },
  bulletText: { flex: 1, color: colors.white75, fontSize: 14.5, lineHeight: 21 },
  note: { fontSize: 12, color: colors.white55, lineHeight: 18, marginTop: 12, textAlign: 'center' },
  footer: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 24, gap: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.1)' },
  signIn: { alignItems: 'center', paddingVertical: 12 },
  signInText: { color: colors.white75, fontSize: 14, fontWeight: '700' },
});
