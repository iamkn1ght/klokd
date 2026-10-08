/**
 * RootNavigator — hash-router driven. Every surface is a URL:
 *
 *   #/                    landing (signed-in users are redirected to their
 *                          workspace default)
 *   #/signin?persona=x    sign-in flow (deep-linkable persona preselect)
 *   #/worker/:tab         worker workspace
 *   #/employer/:tab       employer workspace
 *   #/admin/:route        admin console (staff)
 *
 * Guards (in one effect): signed-out users hitting a protected route are
 * redirected to sign-in (the intended destination is remembered and restored
 * after login); signed-in users on #/ are sent to their workspace; the admin
 * console rejects non-staff sessions. Browser back/forward works everywhere.
 */
import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth, Persona } from '../context/AuthContext';
import { LandingScreen } from '../screens/landing/LandingScreen';
import { SignInScreen } from '../screens/signin/SignInScreen';
import { EarlyAccessScreen } from '../screens/signin/EarlyAccessScreen';
import { EARLY_ACCESS } from '../services/api';
import { LegalScreen } from '../screens/legal/LegalScreen';
import { ConsumerShell, ShellNavItem } from '../components/ConsumerShell';
import { AdminShell, AdminRoute } from '../components/AdminShell';
import { TabErrorBoundary } from '../components/ErrorBoundary';
import { WorkerHome } from '../screens/worker/WorkerHome';
import { WorkerShifts } from '../screens/worker/WorkerShifts';
import { EmployerDashboard } from '../screens/employer/EmployerDashboard';
import { PlaceholderTab } from '../screens/PlaceholderTab';
import { OverviewScreen } from '../screens/admin/OverviewScreen';
import { VerificationScreen } from '../screens/admin/VerificationScreen';
import { DisputesScreen } from '../screens/admin/DisputesScreen';
import { PaymentsScreen } from '../screens/admin/PaymentsScreen';
import { AuditScreen } from '../screens/admin/AuditScreen';
import { UsersScreen } from '../screens/admin/UsersScreen';
import { colors, spacing } from '../theme';
import { useRoute, navigate, defaultRouteFor, Route } from './router';

type WorkerTab = 'home' | 'shifts' | 'pay' | 'profile';
type EmployerTab = 'dashboard' | 'shifts' | 'pay' | 'team';

const WORKER_NAV: ShellNavItem<WorkerTab>[] = [
  { key: 'home', label: 'Home' },
  { key: 'shifts', label: 'My shifts' },
  { key: 'pay', label: 'Pay' },
  { key: 'profile', label: 'Me' },
];

const EMPLOYER_NAV: ShellNavItem<EmployerTab>[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'shifts', label: 'Shifts' },
  { key: 'pay', label: 'Pay & escrow' },
  { key: 'team', label: 'Team' },
];

const ADMIN_TITLES: Record<AdminRoute, { title: string; subtitle: string }> = {
  overview: { title: 'Operations overview', subtitle: 'Live rail health, queue depth, escrow & today’s movement.' },
  verification: { title: 'Verification queue', subtitle: 'KYC escalations awaiting manual review.' },
  disputes: { title: 'Disputes', subtitle: 'Worker / employer claims that need an admin call.' },
  payments: { title: 'Payments & escrow', subtitle: 'Live escrow positions, failed payouts, reconciliation.' },
  audit: { title: 'Audit log', subtitle: 'Hakken-signed append-only audit trail.' },
  users: { title: 'Users', subtitle: 'Workers, employers, operators.' },
};

export function RootNavigator() {
  const { account, persona, isLoading } = useAuth();
  const route = useRoute();

  // ─── Guards ───
  // One effect owns all redirects; render just follows the URL.
  useEffect(() => {
    if (isLoading) return;
    const authed = !!account && !!persona;

    if (route.name === 'landing' && authed) {
      navigate(defaultRouteFor(persona!), { replace: true });
      return;
    }
    if (route.name === 'worker' || route.name === 'employer' || route.name === 'admin') {
      if (!authed) {
        // Remember the destination so sign-in can restore it.
        try {
          sessionStorage.setItem('klokd_return_to', window.location.hash);
        } catch {
          /* private mode — skip restore */
        }
        navigate('/signin', { replace: true });
        return;
      }
      const surface: Persona = route.name;
      // The workspace surface must match the active persona — deep links into
      // someone else's surface fall back to the user's own workspace. (Admin
      // console additionally requires the staff role.)
      if (persona !== surface || (surface === 'admin' && !account?.roles.includes('admin'))) {
        navigate(defaultRouteFor(persona!), { replace: true });
      }
    }
    if (route.name === 'notfound') {
      navigate(authed ? defaultRouteFor(persona!) : '/', { replace: true });
    }
  }, [route, account, persona, isLoading]);

  // Boot: branded splash while the stored session is restored (avoids the
  // landing flash for returning visitors).
  if (isLoading) return <BootSplash />;

  // ─── Landing ───
  if (route.name === 'landing') {
    return <LandingScreen onSignIn={() => navigate('/signin')} />;
  }

  // ─── Legal (public, sign-out safe) ───
  if (route.name === 'legal') {
    return <LegalScreen doc={route.doc} />;
  }

  // ─── Sign-in ───
  // Early-access builds route every sign-in entry point to the waitlist.
  if (route.name === 'signin' && EARLY_ACCESS) {
    return <EarlyAccessScreen onBackToLanding={() => navigate('/')} initialPersona={route.persona ?? null} />;
  }
  if (route.name === 'signin') {
    return (
      <SignInScreen
        onBackToLanding={() => navigate('/')}
        initialPersona={(route.persona as Persona | null) ?? null}
        onAuthenticated={() => {
          let dest: string | null = null;
          try {
            dest = sessionStorage.getItem('klokd_return_to');
            sessionStorage.removeItem('klokd_return_to');
          } catch {
            /* ignore */
          }
          navigate(dest && dest.startsWith('#/') && dest !== '#/' ? dest.slice(1) : '/', { replace: true });
        }}
      />
    );
  }

  // ─── Workspaces (route guards guarantee persona matches surface) ───
  if (route.name === 'worker' && persona === 'worker') {
    return (
      <ConsumerShell
        persona="Worker"
        accent={colors.electric}
        nav={WORKER_NAV}
        active={route.tab as WorkerTab}
        onChange={tab => navigate(`/worker/${tab}`)}
        onSwitchWorkspace={() => navigate('/signin')}
      >
        <TabErrorBoundary key={route.tab}>
          {route.tab === 'home' && <WorkerHome />}
          {route.tab === 'shifts' && <WorkerShifts />}
          {route.tab === 'pay' && (
            <PlaceholderTab
              eyebrow="PAY"
              title="Your statutory ledger."
              summary="See gross earnings, PAYE/NSSF/SHIF breakdown, AHL toggle, and downloadable monthly payslip."
              bullets={[
                'Gross earnings auto-tracked per completed shift',
                'PAYE · NSSF · SHIF auto-calculated and remitted',
                'Recent payouts with M-Pesa receipt numbers',
              ]}
              nativeUrl="Open Klokd Worker on iOS / Android · or localhost:8091"
            />
          )}
          {route.tab === 'profile' && (
            <PlaceholderTab
              eyebrow="ME"
              title="Identity, reputation, and privacy."
              summary="Verified once, your KYC works everywhere. Edit skills, certificates, M-Pesa number, and consent."
              bullets={[
                'Skills and certificates on file',
                'Identiti KYC tier shared across every employer',
                'Privacy · what employers can see vs cannot',
              ]}
              nativeUrl="Open Klokd Worker on iOS / Android · or localhost:8091"
            />
          )}
        </TabErrorBoundary>
      </ConsumerShell>
    );
  }

  if (route.name === 'employer' && persona === 'employer') {
    return (
      <ConsumerShell
        persona="Employer"
        accent={colors.volt}
        nav={EMPLOYER_NAV}
        active={route.tab as EmployerTab}
        onChange={tab => navigate(`/employer/${tab}`)}
        onSwitchWorkspace={() => navigate('/signin')}
      >
        <TabErrorBoundary key={route.tab}>
          {route.tab === 'dashboard' && <EmployerDashboard />}
          {route.tab === 'shifts' && (
            <PlaceholderTab
              eyebrow="SHIFTS"
              title="Post · fill · manage."
              summary="Post a shift, see applicants, pick the worker, release escrow on clock-out."
              bullets={[
                'Post-a-shift wizard · role · time · market-rate suggester',
                'Applicants filtered to your venue trust pool',
                'Live fill rate by hour · re-broadcast if low',
              ]}
              nativeUrl="Open Klokd Employer on iOS / Android · or localhost:8092"
            />
          )}
          {route.tab === 'pay' && (
            <PlaceholderTab
              eyebrow="PAY & ESCROW"
              title="Fund · release · reconcile."
              summary="Top up escrow via STK push, track releases per worker, export reconciled ledger to CSV."
              bullets={[
                'Escrow meter · top-up via M-Pesa STK',
                'Per-shift release with M-Pesa receipt logged to audit',
                'CSV export for accountant · KRA-ready',
              ]}
              nativeUrl="Open Klokd Employer on iOS / Android · or localhost:8092"
            />
          )}
          {route.tab === 'team' && (
            <PlaceholderTab
              eyebrow="TEAM"
              title="Your trusted pool."
              summary="Workers who've worked your venue, sorted by trust score. Invite back with one tap."
              bullets={[
                'Trusted · workers who worked 3+ shifts here',
                'Recent · workers from your last 30 days',
                'Invited · pending direct invitations',
              ]}
              nativeUrl="Open Klokd Employer on iOS / Android · or localhost:8092"
            />
          )}
        </TabErrorBoundary>
      </ConsumerShell>
    );
  }

  if (route.name === 'admin' && persona === 'admin') {
    const tab = route.tab as AdminRoute;
    const { title, subtitle } = ADMIN_TITLES[tab];
    return (
      <AdminShell
        route={tab}
        onRouteChange={r => navigate(`/admin/${r}`)}
        pageTitle={title}
        pageSubtitle={subtitle}
        onSwitchWorkspace={() => navigate('/signin')}
      >
        <TabErrorBoundary key={tab}>
          {tab === 'overview' && <OverviewScreen />}
          {tab === 'verification' && <VerificationScreen />}
          {tab === 'disputes' && <DisputesScreen />}
          {tab === 'payments' && <PaymentsScreen />}
          {tab === 'audit' && <AuditScreen />}
          {tab === 'users' && <UsersScreen />}
        </TabErrorBoundary>
      </AdminShell>
    );
  }

  // Transient state while a guard redirect is in flight.
  return <BootSplash label="Redirecting…" />;
}

function BootSplash({ label = 'Loading your workspace…' }: { label?: string }) {
  return (
    <View style={styles.boot}>
      <View style={styles.bootMark}>
        <Text style={styles.bootK}>K</Text>
      </View>
      <Text style={styles.bootWord}>Klokd</Text>
      <View style={styles.bootSpin}>
        <ActivityIndicator color={colors.electric} />
      </View>
      <Text style={styles.bootLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  boot: { flex: 1, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  bootMark: { width: 56, height: 56, borderRadius: 15, backgroundColor: colors.electric, alignItems: 'center', justifyContent: 'center' },
  bootK: { color: colors.ink, fontSize: 28, fontWeight: '900' },
  bootWord: { color: colors.white, fontSize: 20, fontWeight: '900', letterSpacing: -0.6, marginTop: spacing.md },
  bootSpin: { height: 28, marginTop: spacing.lg },
  bootLabel: { color: colors.white50, fontSize: 12, fontWeight: '600', marginTop: spacing.xs },
});
