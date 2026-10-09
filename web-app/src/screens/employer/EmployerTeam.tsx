/**
 * Employer Team (web) — GET /employer/team. Everyone who has worked a shift
 * for you, most-booked first. "Book again" posts a shift offered straight to
 * that worker (#/employer/shifts/new?invite=<workerId>).
 */
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { GlassCard, FadeUp } from '../../components/KlokdLayout';
import { Eyebrow, Avatar, GradientBtn, StatusPill } from '../../components/Primitives';
import { ErrorState, EmptyState } from '../../components/States';
import { useApiData } from '../../hooks/useApiData';
import { navigate } from '../../navigation/router';
import { colors, spacing } from '../../theme';
import { day } from '../../lib/format';

interface Member {
  workerId: string;
  name: string;
  initials: string;
  shiftsHere: number;
  lastWorked: string;
  roles: string[];
  yourRating: number | null;
  rating: number | null;
  showUpRate: number | null;
  totalShifts: number;
  verified: boolean;
  trusted: boolean;
}

export function EmployerTeam() {
  const q = useApiData<Member[]>('/employer/team');
  if (q.status === 'loading') return <View style={styles.loading}><ActivityIndicator color={colors.electric} /></View>;
  if (q.status === 'error') return <ErrorState title="Couldn’t load your team." detail={q.error ?? undefined} onRetry={q.reload} />;
  const team = q.data!;
  return (
    <View style={{ gap: spacing.xl }}>
      <View>
        <Eyebrow color={colors.volt}>TEAM</Eyebrow>
        <Text style={styles.h1}>People who’ve worked for you.</Text>
        <Text style={styles.p}>Book someone again and the shift goes straight to them; nobody else sees it unless they decline.</Text>
      </View>
      {team.length === 0 ? (
        <EmptyState title="No one yet." detail="Workers appear here after their first finished shift with you." />
      ) : (
        <View style={styles.grid}>
          {team.map((m, i) => (
            <FadeUp key={m.workerId} delay={Math.min(i, 8) * 40} style={styles.cell}>
              <GlassCard padding={spacing.lg}>
                <View style={styles.top}>
                  <Avatar initials={m.initials} size={42} tone="volt" />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.name}>{m.name}</Text>
                    <Text style={styles.meta}>{m.roles.join(', ')}</Text>
                  </View>
                  {m.trusted && <StatusPill tone="mint">regular</StatusPill>}
                </View>
                <View style={styles.stats}>
                  <Stat k={String(m.shiftsHere)} l="shifts here" />
                  <Stat k={m.yourRating != null ? `★ ${m.yourRating}` : '—'} l="your rating" />
                  <Stat k={m.showUpRate != null ? `${Math.round(m.showUpRate)}%` : '—'} l="show-up" />
                </View>
                <Text style={styles.meta}>Last worked {day(m.lastWorked)} · {m.totalShifts} shifts on Klokd</Text>
                <View style={{ flexDirection: 'row', marginTop: spacing.md }}>
                  <GradientBtn size="sm" disabled={!m.verified} onPress={() => navigate(`/employer/shifts/new?invite=${m.workerId}`)}>
                    Book again
                  </GradientBtn>
                </View>
              </GlassCard>
            </FadeUp>
          ))}
        </View>
      )}
    </View>
  );
}

function Stat({ k, l }: { k: string; l: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.statK}>{k}</Text>
      <Text style={styles.statL}>{l}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { paddingVertical: 80, alignItems: 'center' },
  h1: { color: colors.white, fontSize: 26, fontWeight: '900', letterSpacing: -1, marginTop: 8 },
  p: { color: colors.white60, fontSize: 13.5, lineHeight: 20, marginTop: 6, maxWidth: 560 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  cell: { flex: 1, minWidth: 260, maxWidth: 420 },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  name: { color: colors.white, fontSize: 15.5, fontWeight: '900' },
  meta: { color: colors.white55, fontSize: 12, marginTop: 3 },
  stats: { flexDirection: 'row', marginVertical: spacing.md, paddingVertical: spacing.sm, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.white06 },
  statK: { color: colors.white, fontSize: 16, fontWeight: '900' },
  statL: { color: colors.white50, fontSize: 10.5, fontWeight: '800', textTransform: 'uppercase', marginTop: 2 },
});
