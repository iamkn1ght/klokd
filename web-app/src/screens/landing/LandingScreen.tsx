/**
 * Klokd landing — one page, both audiences (workers + employers).
 *
 *   Nav (in-page sections only) → Hero (pitch + live product preview) →
 *   Trust strip (where we're onboarding + real waitlist count) →
 *   How it works (worker + employer 3-step flows) → Built-in guarantees →
 *   Closing CTA → Footer.
 *
 * Honesty rules: no partner logos, no invented metrics, no links to pages
 * that don't exist. The phone preview renders the real worker shift-card UI
 * with sample data and says so. The waitlist count only shows once it is
 * big enough to mean something.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { KlokdScreen, FadeUp, GlassCard, LiveDot } from '../../components/KlokdLayout';
import { Logo, GradientBtn } from '../../components/Primitives';
import { colors, spacing, radius } from '../../theme';
import { navigate } from '../../navigation/router';
import { api, EARLY_ACCESS } from '../../services/api';
import { DEMO_SHIFTS } from '../../hooks/demoShifts';

const WAITLIST_MIN_TO_SHOW = 25;
const AREAS = ['Westlands', 'CBD', 'Kilimani'];

type SectionKey = 'how' | 'workers' | 'employers';
const NAV: { key: SectionKey; label: string }[] = [
  { key: 'how', label: 'How it works' },
  { key: 'workers', label: 'For workers' },
  { key: 'employers', label: 'For employers' },
];

const PROOF = [
  { icon: 'shield', title: 'Verified workers', body: 'National ID and selfie checked once, before the first shift.' },
  { icon: 'mpesa', title: 'M-Pesa payouts', body: 'Wages go straight to M-Pesa after clock-out.' },
  { icon: 'doc', title: 'Compliant contracts', body: 'Employment Act s.9 contract for every shift.' },
] as const;

const WORKER_STEPS = [
  { t: 'Verify once', d: 'National ID and a selfie, one time. Every employer on Klokd sees you as verified.' },
  { t: 'Pick a shift', d: 'Nearby shifts with the pay shown up front. Review the contract, then accept.' },
  { t: 'Get paid', d: 'Clock out and the pay goes to your M-Pesa, with a payslip showing every deduction.' },
];

const EMPLOYER_STEPS = [
  { t: 'Verify your business', d: 'KRA PIN and WIBA cover, once. Then you can post.' },
  { t: 'Post and fund', d: 'Role, time and rate in a couple of minutes. Wages are held in escrow before the shift.' },
  { t: 'Pick and release', d: 'Choose from verified applicants. Confirm clock-out and the escrow pays the worker.' },
];

const BUILT_IN = [
  { k: 'Contract', l: 'Generated for every shift, accepted before it starts' },
  { k: 'PAYE · NSSF · SHIF', l: 'Calculated on every payslip' },
  { k: 'Escrow', l: 'Wages funded before the shift, released on clock-out' },
  { k: 'Data', l: 'Built to Kenya’s Data Protection Act 2019' },
];

// ─── Icons ───────────────────────────────────────────────

function Icon({ name, color = colors.electric, size = 22 }: { name: string; color?: string; size?: number }) {
  const p = { stroke: color, strokeWidth: 1.8, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'shield' && (
        <>
          <Path d="M12 3l7 3v5c0 4.5-3 8.3-7 9.5C8 19.3 5 15.5 5 11V6l7-3z" {...p} />
          <Path d="M9 12l2 2 4-4" {...p} />
        </>
      )}
      {name === 'mpesa' && (
        <>
          <Rect x="7" y="2.5" width="10" height="19" rx="2.5" {...p} />
          <Path d="M10 6h4M12 18h.01" {...p} />
          <Path d="M10 12.5l1.5 1.5 3-3" {...p} />
        </>
      )}
      {name === 'doc' && (
        <>
          <Path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z" {...p} />
          <Path d="M14 3v5h5M9 13h6M9 17h4" {...p} />
        </>
      )}
      {name === 'pin' && (
        <>
          <Path d="M12 21s-7-6.2-7-11.5A7 7 0 0112 2.5a7 7 0 017 7C19 14.8 12 21 12 21z" {...p} />
          <Circle cx="12" cy="9.5" r="2.5" {...p} />
        </>
      )}
    </Svg>
  );
}

// ─── Product preview (real worker shift-card UI, sample data) ──

function PhonePreview() {
  const shifts = DEMO_SHIFTS.slice(0, 3);
  return (
    <View style={styles.phoneWrap}>
      <View style={styles.phone}>
        <View style={styles.phoneNotch} />
        <View style={styles.phoneTop}>
          <Text style={styles.phoneHello}>Habari, Akinyi</Text>
          <View style={styles.verifiedPill}>
            <Icon name="shield" size={12} />
            <Text style={styles.verifiedText}>Verified</Text>
          </View>
        </View>

        <View style={styles.phoneStats}>
          {[
            { k: '98%', l: 'Show-up' },
            { k: '★ 4.9', l: 'Rating' },
            { k: '31', l: 'Shifts' },
          ].map((s, i) => (
            <View key={s.l} style={[styles.phoneStat, i > 0 && styles.phoneStatDivider]}>
              <Text style={styles.phoneStatK}>{s.k}</Text>
              <Text style={styles.phoneStatL}>{s.l}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.phoneSection}>SHIFTS NEAR YOU</Text>
        <View style={{ gap: 8 }}>
          {shifts.map(s => (
            <View key={s.id} style={[styles.phoneCard, s.highlighted && styles.phoneCardHot]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.phoneRole}>{s.role}</Text>
                <Text style={styles.phoneVenue} numberOfLines={1}>{s.venue}</Text>
                <Text style={styles.phoneMeta} numberOfLines={1}>{s.date} · {s.dist}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.phonePay}>KES {s.pay.toLocaleString()}</Text>
                <View style={[styles.phoneApply, s.highlighted && styles.phoneApplyHot]}>
                  <Text style={styles.phoneApplyText}>{s.highlighted ? 'Apply →' : 'View'}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.paidToast}>
          <View style={styles.mpesaDot}>
            <Text style={styles.mpesaDotText}>M</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.paidLabel}>PAID TO M-PESA</Text>
            <Text style={styles.paidValue}>KES 1,640 · after deductions</Text>
          </View>
          <Text style={styles.paidCheck}>✓</Text>
        </View>
      </View>
      <Text style={styles.previewCaption}>Klokd worker app · sample shifts</Text>
    </View>
  );
}

// ─── Page ────────────────────────────────────────────────

export function LandingScreen({ onSignIn }: { onSignIn: () => void }) {
  const { width } = useWindowDimensions();
  const mobile = width < 760;
  const wide = width >= 1040;

  const scrollRef = useRef<ScrollView>(null);
  const sectionY = useRef<Partial<Record<SectionKey, number>>>({});
  const scrollTo = (key: SectionKey) => {
    const y = sectionY.current[key];
    if (y != null) scrollRef.current?.scrollTo({ y: Math.max(0, y - 24), animated: true });
  };
  const track = (key: SectionKey) => (e: any) => {
    sectionY.current[key] = e.nativeEvent.layout.y;
  };

  const [waitlist, setWaitlist] = useState<number | null>(null);
  useEffect(() => {
    api<{ count: number }>('/early-access/count')
      .then(r => setWaitlist(r.count))
      .catch(() => setWaitlist(null));
  }, []);

  const primaryLabel = EARLY_ACCESS ? 'Get early access' : 'Get started';
  const workerCta = EARLY_ACCESS ? 'Join as a worker →' : 'Sign up as a worker →';
  const employerCta = EARLY_ACCESS ? 'Join as an employer →' : 'Sign up as an employer →';

  return (
    <KlokdScreen maxWidth={1200} scrollRef={scrollRef}>
      {/* ─── Nav ─── */}
      <FadeUp delay={0} style={[styles.nav, mobile && styles.navMobile]}>
        <Logo size={34} />
        {!mobile && (
          <View style={styles.navLinks}>
            {NAV.map(n => (
              <Pressable
                key={n.key}
                accessibilityRole="link"
                onPress={() => scrollTo(n.key)}
                style={({ hovered }: any) => [styles.navItem, hovered && styles.navItemHover]}
              >
                <Text style={styles.navText}>{n.label}</Text>
              </Pressable>
            ))}
          </View>
        )}
        <Pressable
          onPress={onSignIn}
          style={({ hovered }: any) => [styles.navCta, hovered && styles.navCtaHover]}
        >
          <Text style={styles.navCtaText}>{EARLY_ACCESS ? 'Early access →' : 'Sign in →'}</Text>
        </Pressable>
      </FadeUp>

      {/* ─── Hero ─── */}
      <View style={[styles.hero, !wide && styles.heroStacked]}>
        <View style={[styles.heroLeft, !wide && { maxWidth: undefined }]}>
          <FadeUp delay={80}>
            <View style={styles.eyebrowPill}>
              <LiveDot />
              <Text style={styles.eyebrowPillText}>
                {EARLY_ACCESS ? 'EARLY ACCESS · NAIROBI' : 'NOW IN NAIROBI'}
              </Text>
            </View>
          </FadeUp>

          <FadeUp delay={140}>
            <Text style={[styles.h1, mobile && styles.h1Mobile]}>
              The shift you{'\n'}
              <Text style={styles.h1Accent}>can trust.</Text>
            </Text>
          </FadeUp>

          <FadeUp delay={220}>
            <Text style={[styles.subhead, mobile && styles.subheadMobile]}>
              Klokd is Kenya’s verified hospitality shift marketplace. Workers verify once
              and get paid to M-Pesa. Employers fund wages up front, pick a verified worker
              and release pay on clock-out, with the paperwork handled.
            </Text>
          </FadeUp>

          <FadeUp delay={300} style={styles.heroCtas}>
            <View style={{ minWidth: 190 }}>
              <GradientBtn onPress={onSignIn}>{primaryLabel} →</GradientBtn>
            </View>
            <Pressable
              onPress={() => scrollTo('how')}
              style={({ hovered }: any) => [styles.ghostBtn, hovered && styles.ghostBtnHover]}
            >
              <Text style={styles.ghostBtnText}>How it works</Text>
            </Pressable>
          </FadeUp>

          <FadeUp delay={380} style={[styles.proofRow, mobile && styles.proofRowMobile]}>
            {PROOF.map((p, i) => (
              <View key={p.title} style={[styles.proof, i > 0 && !mobile && styles.proofDivider]}>
                <Icon name={p.icon} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.proofTitle}>{p.title}</Text>
                  <Text style={styles.proofBody}>{p.body}</Text>
                </View>
              </View>
            ))}
          </FadeUp>
        </View>

        <FadeUp delay={260} style={[styles.heroRight, !wide && styles.heroRightStacked]}>
          <PhonePreview />
        </FadeUp>
      </View>

      {/* ─── Trust strip ─── */}
      <FadeUp delay={460}>
        <View style={[styles.strip, mobile && styles.stripMobile]}>
          <View style={styles.stripLeft}>
            <Icon name="pin" size={18} />
            <Text style={styles.stripLabel}>NOW ONBOARDING VENUES IN</Text>
          </View>
          <View style={styles.areaRow}>
            {AREAS.map(a => (
              <View key={a} style={styles.areaChip}>
                <Text style={styles.areaChipText}>{a}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.stripRight}>
            {waitlist != null && waitlist >= WAITLIST_MIN_TO_SHOW
              ? `${waitlist.toLocaleString()} people on the early-access list`
              : 'Built in Nairobi · M-Pesa native'}
          </Text>
        </View>
      </FadeUp>

      {/* ─── How it works ─── */}
      <View onLayout={track('how')} style={styles.section}>
        <FadeUp delay={520}>
          <View style={styles.sectionPill}>
            <Text style={styles.sectionPillText}>HOW IT WORKS</Text>
          </View>
          <Text style={[styles.h2, mobile && styles.h2Mobile]}>
            Built for <Text style={styles.h1Accent}>both sides</Text> of the shift.
          </Text>
          <Text style={styles.sectionSub}>
            Three steps for workers, three for employers. Klokd handles the contract, the
            deductions and the payout in between.
          </Text>
        </FadeUp>

        <View style={[styles.flowRow, !wide && styles.flowRowStacked]}>
          <View onLayout={track('workers')} style={styles.flowWrap}>
            <FadeUp delay={580} style={{ flex: 1 }}>
              <FlowCard
                badge="FOR WORKERS"
                tint={colors.electric}
                title={'Find a shift.\nGet paid after clock-out.'}
                steps={WORKER_STEPS}
                cta={workerCta}
                onPress={() => navigate('/signin?persona=worker')}
              />
            </FadeUp>
          </View>
          <View onLayout={track('employers')} style={styles.flowWrap}>
            <FadeUp delay={640} style={{ flex: 1 }}>
              <FlowCard
                badge="FOR EMPLOYERS"
                tint={colors.volt}
                title={'Hire the shift.\nNot the headache.'}
                steps={EMPLOYER_STEPS}
                cta={employerCta}
                onPress={() => navigate('/signin?persona=employer')}
              />
            </FadeUp>
          </View>
        </View>
      </View>

      {/* ─── Built in ─── */}
      <FadeUp delay={700}>
        <GlassCard variant="electric" style={styles.builtWrap}>
          {BUILT_IN.map((b, i) => (
            <View key={b.k} style={[styles.built, i > 0 && !mobile && styles.builtDivider]}>
              <Text style={styles.builtK}>{b.k}</Text>
              <Text style={styles.builtL}>{b.l}</Text>
            </View>
          ))}
        </GlassCard>
      </FadeUp>

      {/* ─── Closing CTA ─── */}
      <FadeUp delay={760}>
        <View style={[styles.closing, mobile && styles.closingMobile]}>
          <View style={{ flex: 1, minWidth: 260 }}>
            <Text style={[styles.closingH, mobile && styles.closingHMobile]}>
              Be first in when Klokd opens in your area.
            </Text>
            <Text style={styles.closingP}>
              We’re onboarding workers and venues in small groups. Tell us who you are and
              we’ll reach you when your spot opens.
            </Text>
          </View>
          <View style={{ minWidth: 200 }}>
            <GradientBtn onPress={onSignIn}>{primaryLabel} →</GradientBtn>
          </View>
        </View>
      </FadeUp>

      {/* ─── Footer ─── */}
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <Logo size={26} />
          <Text style={styles.footerTagline}>© {new Date().getFullYear()} Klokd · Nairobi, Kenya</Text>
        </View>
        <View style={styles.footerLinks}>
          <Pressable onPress={() => navigate('/terms')} style={({ hovered }: any) => [styles.footerLink, hovered && styles.footerLinkHover]}>
            <Text style={styles.footerLinkText}>Terms</Text>
          </Pressable>
          <Pressable onPress={() => navigate('/privacy')} style={({ hovered }: any) => [styles.footerLink, hovered && styles.footerLinkHover]}>
            <Text style={styles.footerLinkText}>Privacy</Text>
          </Pressable>
        </View>
      </View>
    </KlokdScreen>
  );
}

function FlowCard({
  badge,
  tint,
  title,
  steps,
  cta,
  onPress,
}: {
  badge: string;
  tint: string;
  title: string;
  steps: { t: string; d: string }[];
  cta: string;
  onPress: () => void;
}) {
  return (
    <GlassCard interactive style={styles.flow} onPress={onPress}>
      <View style={[styles.flowBadge, { backgroundColor: tint + '1A', borderColor: tint + '47' }]}>
        <Text style={[styles.flowBadgeText, { color: tint }]}>{badge}</Text>
      </View>
      <Text style={styles.flowH}>{title}</Text>
      <View style={styles.steps}>
        {steps.map((s, i) => (
          <View key={s.t} style={styles.step}>
            <View style={styles.stepRail}>
              <View style={[styles.stepNum, { borderColor: tint + '66', backgroundColor: tint + '14' }]}>
                <Text style={[styles.stepNumText, { color: tint }]}>{i + 1}</Text>
              </View>
              {i < steps.length - 1 && <View style={styles.stepLine} />}
            </View>
            <View style={styles.stepBody}>
              <Text style={styles.stepT}>{s.t}</Text>
              <Text style={styles.stepD}>{s.d}</Text>
            </View>
          </View>
        ))}
      </View>
      <View style={styles.flowCta}>
        <Text style={[styles.flowCtaText, { color: tint }]}>{cta}</Text>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  // Nav
  nav: {
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.white06,
  },
  navMobile: { paddingHorizontal: spacing.xs },
  navLinks: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  navItem: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  navItemHover: { backgroundColor: colors.white06 },
  navText: { color: colors.white75, fontSize: 14, fontWeight: '700', letterSpacing: -0.2 },
  navCta: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(0,229,160,0.45)', backgroundColor: 'rgba(0,229,160,0.08)' },
  navCtaHover: { backgroundColor: 'rgba(0,229,160,0.16)', borderColor: colors.electric },
  navCtaText: { color: colors.white, fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },

  // Hero
  hero: { flexDirection: 'row', alignItems: 'center', gap: 48, paddingTop: 64, paddingBottom: 56 },
  heroStacked: { flexDirection: 'column', alignItems: 'stretch', paddingTop: 40, gap: 40 },
  heroLeft: { flex: 1.25, maxWidth: 660 },
  heroRight: { flex: 1, alignItems: 'center' },
  heroRightStacked: { alignItems: 'center' },
  eyebrowPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 9, paddingRight: 14, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(0,229,160,0.08)', borderWidth: 1, borderColor: 'rgba(0,229,160,0.22)', marginBottom: spacing.xl },
  eyebrowPillText: { color: colors.electric, fontSize: 11, fontWeight: '900', letterSpacing: 1.1 },
  h1: { fontSize: 72, fontWeight: '900', letterSpacing: -3.2, lineHeight: 74, color: colors.white, marginBottom: spacing.xl },
  h1Mobile: { fontSize: 46, letterSpacing: -2, lineHeight: 50 },
  h1Accent: { color: colors.electric },
  subhead: { fontSize: 18, color: colors.white65, lineHeight: 27, marginBottom: spacing.xxl, maxWidth: 580 },
  subheadMobile: { fontSize: 16, lineHeight: 24 },
  heroCtas: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, alignItems: 'center' },
  ghostBtn: { paddingVertical: 14, paddingHorizontal: 22, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.white15, backgroundColor: colors.white03 },
  ghostBtnHover: { backgroundColor: colors.white06, borderColor: colors.white25 },
  ghostBtnText: { color: colors.white, fontSize: 14.5, fontWeight: '700', letterSpacing: -0.15 },

  proofRow: { flexDirection: 'row', marginTop: 40, gap: spacing.lg },
  proofRowMobile: { flexDirection: 'column', gap: spacing.lg },
  proof: { flex: 1, flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  proofDivider: { borderLeftWidth: 1, borderLeftColor: colors.white08, paddingLeft: spacing.lg },
  proofTitle: { color: colors.white, fontSize: 13.5, fontWeight: '800', letterSpacing: -0.2 },
  proofBody: { color: colors.white55, fontSize: 12, lineHeight: 17, marginTop: 3, fontWeight: '500' },

  // Phone preview
  phoneWrap: { alignItems: 'center' },
  phone: {
    width: 320,
    padding: 16,
    paddingTop: 30,
    borderRadius: 44,
    borderWidth: 1,
    borderColor: colors.white15,
    backgroundColor: '#0D0D14',
    shadowColor: '#00E5A0',
    shadowOpacity: 0.14,
    shadowRadius: 60,
    shadowOffset: { width: 0, height: 20 },
  },
  phoneNotch: { position: 'absolute', top: 10, alignSelf: 'center', width: 90, height: 22, borderRadius: 12, backgroundColor: '#000' },
  phoneTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginBottom: 14 },
  phoneHello: { color: colors.white, fontSize: 19, fontWeight: '900', letterSpacing: -0.6 },
  verifiedPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(0,229,160,0.10)', borderWidth: 1, borderColor: 'rgba(0,229,160,0.30)' },
  verifiedText: { color: colors.electric, fontSize: 10.5, fontWeight: '800' },
  phoneStats: { flexDirection: 'row', paddingVertical: 12, borderRadius: radius.lg, backgroundColor: colors.white04, borderWidth: 1, borderColor: colors.white08, marginBottom: 16 },
  phoneStat: { flex: 1, alignItems: 'center' },
  phoneStatDivider: { borderLeftWidth: 1, borderLeftColor: colors.white08 },
  phoneStatK: { color: colors.white, fontSize: 15, fontWeight: '900', letterSpacing: -0.4 },
  phoneStatL: { color: colors.white50, fontSize: 10, fontWeight: '700', marginTop: 2 },
  phoneSection: { color: colors.white45, fontSize: 9.5, fontWeight: '900', letterSpacing: 1, marginBottom: 8 },
  phoneCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.lg, backgroundColor: colors.white03, borderWidth: 1, borderColor: colors.white08 },
  phoneCardHot: { borderColor: 'rgba(0,229,160,0.45)', backgroundColor: 'rgba(0,229,160,0.06)' },
  phoneRole: { color: colors.white, fontSize: 13.5, fontWeight: '900', letterSpacing: -0.3 },
  phoneVenue: { color: colors.white70, fontSize: 11.5, fontWeight: '700', marginTop: 1 },
  phoneMeta: { color: colors.white50, fontSize: 10.5, fontWeight: '600', marginTop: 3 },
  phonePay: { color: colors.white, fontSize: 14, fontWeight: '900', letterSpacing: -0.3 },
  phoneApply: { marginTop: 6, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 7, borderWidth: 1, borderColor: colors.white15 },
  phoneApplyHot: { borderColor: colors.electric, backgroundColor: 'rgba(0,229,160,0.16)' },
  phoneApplyText: { color: colors.electric, fontSize: 10.5, fontWeight: '800' },
  paidToast: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, padding: 12, borderRadius: radius.lg, backgroundColor: 'rgba(0,229,160,0.08)', borderWidth: 1, borderColor: 'rgba(0,229,160,0.30)' },
  mpesaDot: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#00A859', alignItems: 'center', justifyContent: 'center' },
  mpesaDotText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  paidLabel: { color: colors.electric, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  paidValue: { color: colors.white, fontSize: 12.5, fontWeight: '800', marginTop: 2 },
  paidCheck: { color: colors.electric, fontSize: 16, fontWeight: '900' },
  previewCaption: { color: colors.white45, fontSize: 11, fontWeight: '700', marginTop: 14, letterSpacing: 0.2 },

  // Trust strip
  strip: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.lg, paddingVertical: 18, paddingHorizontal: spacing.xxl, borderRadius: radius.xxl, borderWidth: 1, borderColor: colors.white10, backgroundColor: colors.white03 },
  stripMobile: { paddingHorizontal: spacing.lg, gap: spacing.md },
  stripLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stripLabel: { color: colors.white60, fontSize: 11, fontWeight: '900', letterSpacing: 1.1 },
  areaRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  areaChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(0,229,160,0.30)', backgroundColor: 'rgba(0,229,160,0.06)' },
  areaChipText: { color: colors.white, fontSize: 13, fontWeight: '800', letterSpacing: -0.2 },
  stripRight: { marginLeft: 'auto' as any, color: colors.white60, fontSize: 12.5, fontWeight: '700' },

  // Sections
  section: { paddingTop: 88 },
  sectionPill: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(0,229,160,0.30)', marginBottom: spacing.lg },
  sectionPillText: { color: colors.electric, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  h2: { fontSize: 44, fontWeight: '900', letterSpacing: -1.8, lineHeight: 48, color: colors.white, maxWidth: 720 },
  h2Mobile: { fontSize: 32, letterSpacing: -1.2, lineHeight: 36 },
  sectionSub: { color: colors.white60, fontSize: 16, lineHeight: 24, marginTop: spacing.md, maxWidth: 560 },

  flowRow: { flexDirection: 'row', gap: spacing.xl, marginTop: 40 },
  flowRowStacked: { flexDirection: 'column' },
  flowWrap: { flex: 1 },
  flow: { padding: 32, height: '100%' as any },
  flowBadge: { alignSelf: 'flex-start', paddingHorizontal: 11, paddingVertical: 5, borderRadius: 999, borderWidth: 1, marginBottom: spacing.xl },
  flowBadgeText: { fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  flowH: { fontSize: 28, fontWeight: '900', letterSpacing: -1.1, lineHeight: 32, color: colors.white, marginBottom: spacing.xxl },
  steps: { marginBottom: spacing.xl },
  step: { flexDirection: 'row', gap: spacing.lg },
  stepRail: { alignItems: 'center', width: 30 },
  stepNum: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontSize: 13, fontWeight: '900' },
  stepLine: { width: 1, flex: 1, minHeight: 18, backgroundColor: colors.white10, marginVertical: 4 },
  stepBody: { flex: 1, paddingBottom: spacing.xl },
  stepT: { color: colors.white, fontSize: 16, fontWeight: '800', letterSpacing: -0.3, marginTop: 4 },
  stepD: { color: colors.white60, fontSize: 13.5, lineHeight: 20, marginTop: 4 },
  flowCta: { paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.white06 },
  flowCtaText: { fontSize: 14.5, fontWeight: '800', letterSpacing: -0.2 },

  // Built in
  builtWrap: { flexDirection: 'row', flexWrap: 'wrap', padding: spacing.xxl, rowGap: spacing.xl, marginTop: 72 },
  built: { flex: 1, minWidth: 200, paddingHorizontal: spacing.lg },
  builtDivider: { borderLeftWidth: 1, borderLeftColor: colors.white08 },
  builtK: { color: colors.white, fontSize: 20, fontWeight: '900', letterSpacing: -0.6 },
  builtL: { color: colors.white60, fontSize: 12.5, lineHeight: 18, marginTop: 6, fontWeight: '600' },

  // Closing CTA
  closing: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xxl, marginTop: 72, marginBottom: 72, padding: 40, borderRadius: radius.huge, borderWidth: 1, borderColor: 'rgba(0,229,160,0.28)', backgroundColor: 'rgba(0,229,160,0.06)' },
  closingMobile: { padding: spacing.xxl },
  closingH: { color: colors.white, fontSize: 32, fontWeight: '900', letterSpacing: -1.2, lineHeight: 36 },
  closingHMobile: { fontSize: 26, lineHeight: 30 },
  closingP: { color: colors.white65, fontSize: 15, lineHeight: 22, marginTop: spacing.sm, maxWidth: 560 },

  // Footer
  footer: { paddingTop: spacing.xl, paddingBottom: spacing.xxl, borderTopWidth: 1, borderTopColor: colors.white06, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  footerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
  footerTagline: { color: colors.white50, fontSize: 12, fontWeight: '600' },
  footerLinks: { flexDirection: 'row', gap: 6 },
  footerLink: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  footerLinkHover: { backgroundColor: colors.white06 },
  footerLinkText: { color: colors.white70, fontSize: 12.5, fontWeight: '700' },
});
