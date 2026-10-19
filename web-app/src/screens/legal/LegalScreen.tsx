/**
 * Legal — Terms of Service + Privacy Policy.
 *
 * A single document screen for #/terms and #/privacy. The copy is honest
 * about what Klokd does today (matching + escrow rails pending) and what it
 * must do under the Data Protection Act 2019. Before public launch these
 * pages need a lawyer's pass — flagged inline where that's true.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { KlokdScreen, FadeUp, GlassCard } from '../../components/KlokdLayout';
import { Logo, Eyebrow } from '../../components/Primitives';
import { colors, spacing } from '../../theme';
import { navigate } from '../../navigation/router';
import { LEGAL as CONTENT, type LegalDoc } from '../../content/legal';

export type { LegalDoc };

export function LegalScreen({ doc }: { doc: LegalDoc }) {
  const c = CONTENT[doc];
  const other: LegalDoc = doc === 'terms' ? 'privacy' : 'terms';

  return (
    <KlokdScreen maxWidth={760}>
      {/* Top bar */}
      <View style={styles.topRow}>
        <Pressable onPress={() => navigate('/')}>
          <Logo size={28} />
        </Pressable>
        <Pressable
          onPress={() => navigate(`/${other}`)}
          style={({ hovered }: any) => [styles.switchLink, hovered && { opacity: 0.7 }]}
        >
          <Text style={styles.switchLinkText}>
            {other === 'terms' ? 'Read Terms instead →' : 'Read Privacy Policy instead →'}
          </Text>
        </Pressable>
      </View>

      <FadeUp delay={60}>
        <Eyebrow color={colors.electric}>LAST UPDATED · {c.updated.toUpperCase()}</Eyebrow>
        <Text style={styles.h1}>{c.title}</Text>
        <Text style={styles.intro}>{c.intro}</Text>
      </FadeUp>

      <View style={styles.sections}>
        {c.sections.map((s, i) => (
          <FadeUp key={i} delay={120 + i * 40}>
            <GlassCard padding={spacing.xl} style={styles.sectionCard}>
              <Text style={styles.sectionH}>{s.h}</Text>
              <Text style={styles.sectionP}>{s.p}</Text>
            </GlassCard>
          </FadeUp>
        ))}
      </View>

      <FadeUp delay={400} style={styles.footer}>
        <Pressable onPress={() => navigate('/')} style={({ hovered }: any) => [styles.backHome, hovered && { opacity: 0.7 }]}>
          <Text style={styles.backHomeText}>← Back to klokd.co.ke</Text>
        </Pressable>
        <Text style={styles.company}>Klokd · Nairobi, Kenya</Text>
      </FadeUp>
    </KlokdScreen>
  );
}

const styles = StyleSheet.create({
  topRow: {
    paddingTop: spacing.xxl + 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLink: { paddingHorizontal: 12, paddingVertical: 8 },
  switchLinkText: { color: colors.electric, fontSize: 13, fontWeight: '800' },

  h1: { color: colors.white, fontSize: 40, fontWeight: '900', letterSpacing: -1.8, marginTop: spacing.sm },
  intro: { color: colors.white65, fontSize: 14.5, lineHeight: 22, marginTop: spacing.md, marginBottom: spacing.xl },

  sections: { gap: spacing.md },
  sectionCard: {},
  sectionH: { color: colors.white, fontSize: 15.5, fontWeight: '900', letterSpacing: -0.3, marginBottom: 6 },
  sectionP: { color: colors.white70, fontSize: 13, lineHeight: 20, fontWeight: '500' },

  footer: { paddingTop: spacing.xxl, paddingBottom: spacing.xxxl, gap: spacing.md },
  backHome: { alignSelf: 'flex-start' },
  backHomeText: { color: colors.electric, fontSize: 13.5, fontWeight: '800' },
  company: { color: colors.white45, fontSize: 11.5, fontWeight: '600' },
});
