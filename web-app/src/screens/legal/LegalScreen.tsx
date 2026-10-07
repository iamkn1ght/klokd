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

export type LegalDoc = 'terms' | 'privacy';

const CONTENT: Record<
  LegalDoc,
  { title: string; updated: string; intro: string; sections: { h: string; p: string }[] }
> = {
  terms: {
    title: 'Terms of Service',
    updated: 'October 2026',
    intro:
      'These terms govern your use of Klokd (klokd.co.ke), operated by Klokd Workplace Solutions Ltd, Nairobi, Kenya. By creating an account you agree to them. Please read them alongside our Privacy Policy.',
    sections: [
      {
        h: '1. What Klokd does',
        p: 'Klokd connects businesses (employers) with vetted casual workers for hospitality shifts. We verify worker identity once through our identity partner, surface nearby shifts, and record when work is agreed and completed. Direct employment relationships arise between employer and worker — Klokd is the marketplace and record-keeper, not the employer of record for shifts booked through the platform.',
      },
      {
        h: '2. Accounts and eligibility',
        p: 'You must be 18 or older and reachable on a Kenyan mobile number. Workers verify identity before applying for shifts. Employers must provide accurate business details and declare a WIBA (work injury) policy before posting shifts. You are responsible for activity on your account.',
      },
      {
        h: '3. Payments and escrow',
        p: 'Klokd is M-Pesa-native: employers fund shifts in advance and workers are paid on completion, with statutory deductions (PAYE, NSSF, SHIF) calculated automatically and remitted as required. Escrow and payout features activate progressively — where a feature is not yet live we label it in the app rather than imply it is working. Shifts completed before a payment feature activates are settled directly between employer and worker.',
      },
      {
        h: '4. Conduct',
        p: 'Show up for shifts you accept, or cancel with reasonable notice. Treat venues, colleagues and equipment with respect. Employers provide a safe workplace and pay the agreed rate. We may suspend accounts for fraud, no-shows, harassment, or attempts to move bookings off-platform to evade accountability.',
      },
      {
        h: '5. Ratings and disputes',
        p: 'Both sides rate each shift. Disputes can be opened after a shift and are reviewed against the shift record (clock-in/out, messages, ratings). Our decisions on disputes are final at this stage of the product.',
      },
      {
        h: '6. Availability',
        p: 'We aim for high availability but the service depends on upstream rails (identity, messaging, payments, discovery). When a rail is down we show it honestly in the product. We may pause features for maintenance or compliance.',
      },
      {
        h: '7. Liability',
        p: 'To the extent permitted by Kenyan law, Klokd is not liable for indirect or consequential losses. Nothing in these terms limits liability that cannot be limited by law. Workers are engaged per shift; WIBA coverage applies as declared by the employer.',
      },
      {
        h: '8. Changes and contact',
        p: 'We may update these terms and will announce material changes in the app before they take effect. Questions: support@klokd.co.ke.',
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    updated: 'October 2026',
    intro:
      'Klokd Workplace Solutions Ltd is a data controller under the Kenya Data Protection Act, 2019 (DPA). This policy explains what we collect, why, who we share it with, and the rights you have. The short version: we collect the minimum needed to verify you once and pay you correctly, and we never sell your data.',
    sections: [
      {
        h: '1. What we collect',
        p: 'Account: your phone number and name. Identity verification is performed by our identity partner (Identiti) — Klokd does not store national ID images or biometrics. Location: a coarse distance calculation to rank shifts near you; we do not store your GPS history. Work record: shifts you post or apply to, clock-in/out events, ratings, and (once payment rails are live) payment records with statutory deductions.',
      },
      {
        h: '2. Why we process it',
        p: 'To verify identity once so any employer can trust it; to show you relevant shifts; to keep an auditable record of work agreed and done; to calculate and remit statutory deductions; to prevent fraud and enforce our Terms; and to comply with Kenyan law (DPA 2019, KRA, NSSF, SHIF, WIBA).',
      },
      {
        h: '3. Who we share it with',
        p: 'Identity data flows through our identity rail (Identiti) — your phone number never crosses to employers or other workers; employers see only your first name, last initial, ratings and verification status. One-time codes are delivered by our messaging rail (Todoku). Shift discovery is published through our discovery rail (Hakken). We do not sell personal data or share it with advertisers.',
      },
      {
        h: '4. How long we keep it',
        p: 'Work and payment records are retained for 7 years (Kenyan tax and employment record requirements). Account data is kept while your account is active. You can request deletion at any time — where retention is legally required we anonymise instead of deleting outright.',
      },
      {
        h: '5. Your rights',
        p: 'Under the DPA 2019 you can ask for a copy of your data, correction of wrong data, deletion where the law allows, and to object to or restrict processing. Email privacy@klokd.co.ke and we will respond within the statutory window. You may also complain to the Office of the Data Protection Commissioner (ODPC).',
      },
      {
        h: '6. Security',
        p: 'Data is encrypted in transit and at rest; access is role-restricted and audit-logged. If a breach ever affects your personal data we will notify you and the ODPC within 72 hours as the law requires.',
      },
      {
        h: '7. Registration status',
        p: 'Klokd is aligned to DPA 2019 requirements and is completing its registration with the ODPC. This policy will be updated as registrations (ODPC, KRA, NSSF, SHIF) complete. Material changes will be announced in the app.',
      },
    ],
  },
};

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
        <Text style={styles.company}>Klokd Workplace Solutions Ltd · Nairobi, Kenya</Text>
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
