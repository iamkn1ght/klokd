/**
 * Klokd unified landing — one page, both audiences (workers + employers).
 *
 * The page leads with the marketplace promise, then splits into two
 * side-by-side panels so each audience sees their own pitch without
 * scrolling past the other one's copy.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { KlokdScreen, FadeUp, GlassCard, HoverCard, LiveDot } from '../../components/KlokdLayout';
import { Logo, GradientBtn, Eyebrow } from '../../components/Primitives';
import { colors, spacing, radius } from '../../theme';

const WORKER_WINS = [
  'Verified once · trusted by every employer',
  'M-Pesa within 18 min of clock-out',
  'PAYE / NSSF / SHIF auto-calculated',
];

const EMPLOYER_WINS = [
  'Vetted workers · 94.2% show-up rate',
  'M-Pesa escrow released on clock-out',
  'KRA compliant · payslips automatic',
];

const MEGA = [
  { k: 'KES 38M+', l: 'Paid out via escrow' },
  { k: '16,412', l: 'Shifts completed' },
  { k: '2,847', l: 'Verified workers' },
  { k: '47', l: 'Active employers' },
];

export function LandingScreen({ onSignIn }: { onSignIn: () => void }) {
  return (
    <KlokdScreen>
      {/* ─── Top bar ─── */}
      <FadeUp delay={0} style={styles.topRow}>
        <Logo size={36} />
        <View style={styles.topNav}>
          <Pressable style={({ hovered }: any) => [styles.navItem, hovered && styles.navItemHover]}>
            <Text style={styles.navText}>How it works</Text>
          </Pressable>
          <Pressable style={({ hovered }: any) => [styles.navItem, hovered && styles.navItemHover]}>
            <Text style={styles.navText}>Pricing</Text>
          </Pressable>
          <Pressable style={({ hovered }: any) => [styles.navItem, hovered && styles.navItemHover]}>
            <Text style={styles.navText}>About</Text>
          </Pressable>
          <Pressable
            onPress={onSignIn}
            style={({ hovered }: any) => [
              styles.signInTop,
              hovered && { backgroundColor: colors.white08, borderColor: colors.white25 },
            ]}
          >
            <Text style={styles.signInTopText}>Sign in →</Text>
          </Pressable>
        </View>
      </FadeUp>

      {/* ─── Hero ─── */}
      <View style={styles.hero}>
        <FadeUp delay={80}>
          <View style={styles.eyebrowPill}>
            <LiveDot />
            <Text style={styles.eyebrowPillText}>LIVE IN NAIROBI · 284 SHIFTS OPEN RIGHT NOW</Text>
          </View>
        </FadeUp>

        <FadeUp delay={140}>
          <Text style={styles.h1}>
            The shift you{'\n'}
            <Text style={styles.h1Accent}>can trust.</Text>
          </Text>
        </FadeUp>

        <FadeUp delay={220}>
          <Text style={styles.subhead}>
            Klokd is Kenya’s vetted hospitality marketplace. Workers verified once,
            paid by M-Pesa within minutes. Employers fund an escrow, pick a vetted
            worker, release on clock-out — KRA-compliant by default.
          </Text>
        </FadeUp>

        <FadeUp delay={300} style={styles.heroCtas}>
          <View style={{ minWidth: 180 }}>
            <GradientBtn onPress={onSignIn}>Get started</GradientBtn>
          </View>
          <HoverCard
            onPress={onSignIn}
            style={styles.ghostBtn}
            hoverStyle={{ borderColor: colors.electric, backgroundColor: 'rgba(0,229,160,0.06)' }}
          >
            <Text style={styles.ghostBtnText}>See live demo →</Text>
          </HoverCard>
        </FadeUp>
      </View>

      {/* ─── Audience split ─── */}
      <View style={styles.audienceRow}>
        <FadeUp delay={380} style={styles.audienceWrap}>
          <GlassCard interactive style={styles.audience} onPress={onSignIn}>
            <View style={styles.audienceBadge}>
              <Text style={styles.audienceBadgeText}>FOR WORKERS</Text>
            </View>
            <Text style={styles.audienceH}>Find a shift.{'\n'}Get paid by clock-out.</Text>
            <Text style={styles.audienceP}>
              Verified once, you’re trusted by every employer on Klokd. Nearby
              shifts ranked by pay and distance. The money lands in your M-Pesa
              before you’re home.
            </Text>
            <View style={styles.winsList}>
              {WORKER_WINS.map((w, i) => (
                <View key={i} style={styles.winRow}>
                  <View style={styles.winDot} />
                  <Text style={styles.winText}>{w}</Text>
                </View>
              ))}
            </View>
            <View style={styles.audienceCta}>
              <Text style={styles.audienceCtaText}>Sign up as a worker →</Text>
            </View>
          </GlassCard>
        </FadeUp>

        <FadeUp delay={440} style={styles.audienceWrap}>
          <GlassCard interactive style={styles.audience} onPress={onSignIn}>
            <View style={[styles.audienceBadge, styles.audienceBadgeVolt]}>
              <Text style={styles.audienceBadgeTextVolt}>FOR EMPLOYERS</Text>
            </View>
            <Text style={styles.audienceH}>Hire the shift.{'\n'}Not the headache.</Text>
            <Text style={styles.audienceP}>
              Post a shift, fund the escrow, pick from a list of verified workers
              filtered to your venue. Release on clock-out. PAYE / NSSF / SHIF
              calculated and remitted automatically.
            </Text>
            <View style={styles.winsList}>
              {EMPLOYER_WINS.map((w, i) => (
                <View key={i} style={styles.winRow}>
                  <View style={[styles.winDot, { backgroundColor: colors.volt }]} />
                  <Text style={styles.winText}>{w}</Text>
                </View>
              ))}
            </View>
            <View style={styles.audienceCta}>
              <Text style={styles.audienceCtaText}>Sign up as an employer →</Text>
            </View>
          </GlassCard>
        </FadeUp>
      </View>

      {/* ─── Mega stats ─── */}
      <FadeUp delay={580}>
        <GlassCard variant="electric" style={styles.megaWrap}>
          {MEGA.map((m, i) => (
            <View key={i} style={[styles.megaStat, i > 0 && styles.megaStatDivider]}>
              <Text style={styles.megaK}>{m.k}</Text>
              <Text style={styles.megaL}>{m.l}</Text>
            </View>
          ))}
        </GlassCard>
      </FadeUp>

      {/* ─── Trust strip / footer ─── */}
      <FadeUp delay={680} style={styles.footer}>
        <View style={styles.footerLeft}>
          <Logo size={26} />
          <Text style={styles.footerTagline}>A Kipkiren Teknolojia company · Nairobi, Kenya</Text>
        </View>
        <View style={styles.footerBadges}>
          {['ODPC registered', 'KRA verified', 'NSSF compliant'].map((b, i) => (
            <View key={i} style={styles.footerBadge}>
              <Text style={styles.footerBadgeText}>{b}</Text>
            </View>
          ))}
        </View>
      </FadeUp>
    </KlokdScreen>
  );
}

const styles = StyleSheet.create({
  topRow: {
    paddingTop: spacing.xxl + 4,
    paddingBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.white06,
    marginBottom: spacing.xxxl,
  },
  topNav: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  navItem: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  navItemHover: { backgroundColor: colors.white06 },
  navText: { color: colors.white75, fontSize: 14, fontWeight: '700', letterSpacing: -0.2 },
  signInTop: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.white15, backgroundColor: colors.white03, marginLeft: spacing.sm },
  signInTopText: { color: colors.white, fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },

  hero: { paddingTop: spacing.xxxl, paddingBottom: spacing.xxxl, alignItems: 'flex-start' },
  eyebrowPill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 8, paddingRight: 14, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(0,229,160,0.08)', borderWidth: 1, borderColor: 'rgba(0,229,160,0.22)', marginBottom: spacing.lg },
  eyebrowPillText: { color: colors.electric, fontSize: 11, fontWeight: '900', letterSpacing: 1.0 },
  h1: { fontSize: 64, fontWeight: '900', letterSpacing: -2.8, lineHeight: 66, color: colors.white, marginBottom: spacing.lg, maxWidth: 860 },
  h1Accent: { color: colors.electric },
  subhead: { fontSize: 17, color: colors.white65, lineHeight: 25, marginBottom: spacing.xl, maxWidth: 620 },
  heroCtas: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, alignItems: 'center' },
  ghostBtn: { paddingVertical: 16, paddingHorizontal: 22, borderRadius: 14, borderWidth: 1, borderColor: colors.white15, backgroundColor: colors.white03 },
  ghostBtnText: { color: colors.white, fontSize: 14, fontWeight: '700', letterSpacing: -0.15 },

  audienceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, marginBottom: spacing.xxxl },
  audienceWrap: { flex: 1, minWidth: 340 },
  audience: { padding: spacing.xxl, minHeight: 360, justifyContent: 'space-between' },
  audienceBadge: { alignSelf: 'flex-start', paddingHorizontal: 11, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(0,229,160,0.10)', borderWidth: 1, borderColor: 'rgba(0,229,160,0.28)', marginBottom: spacing.lg },
  audienceBadgeVolt: { backgroundColor: 'rgba(188,255,78,0.10)', borderColor: 'rgba(188,255,78,0.28)' },
  audienceBadgeText: { color: colors.electric, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  audienceBadgeTextVolt: { color: colors.volt, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  audienceH: { fontSize: 28, fontWeight: '900', letterSpacing: -1.2, lineHeight: 32, color: colors.white, marginBottom: spacing.md },
  audienceP: { fontSize: 14, color: colors.white65, lineHeight: 20, marginBottom: spacing.lg },
  winsList: { gap: 8, marginBottom: spacing.lg },
  winRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  winDot: { width: 6, height: 6, borderRadius: 4, backgroundColor: colors.electric },
  winText: { color: colors.white85, fontSize: 13, fontWeight: '600', letterSpacing: -0.15 },
  audienceCta: { paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.white06 },
  audienceCtaText: { color: colors.electric, fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },

  megaWrap: { flexDirection: 'row', flexWrap: 'wrap', padding: spacing.xxl, gap: spacing.lg, marginBottom: spacing.xxxl },
  megaStat: { flex: 1, minWidth: 180, paddingHorizontal: spacing.md, alignItems: 'center' },
  megaStatDivider: { borderLeftWidth: 1, borderLeftColor: colors.white08 },
  megaK: { fontSize: 40, fontWeight: '900', letterSpacing: -1.6, color: colors.white, textAlign: 'center', lineHeight: 44 },
  megaL: { color: colors.white60, fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: 8 },

  footer: { paddingTop: spacing.xl, borderTopWidth: 1, borderTopColor: colors.white06, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  footerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
  footerTagline: { color: colors.white50, fontSize: 12, fontWeight: '600' },
  footerBadges: { flexDirection: 'row', gap: 6 },
  footerBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: colors.white10, backgroundColor: colors.white03 },
  footerBadgeText: { color: colors.white70, fontSize: 10.5, fontWeight: '800', letterSpacing: 0.4 },
});
