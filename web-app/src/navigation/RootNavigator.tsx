/**
 * RootNavigator — hash-router driven. Every surface is a URL:
 *
 *   #/                    landing (signed-in users go to their workspace)
 *   #/signin?persona=x    sign-in (early-access builds show the waitlist,
 *                          except staff sign-in for the operations console)
 *   #/worker/:tab[/:id]   worker workspace
 *   #/employer/:tab[/:id] employer workspace
 *   #/admin/:route        operations console (staff)
 *
 * Guards (one effect): signed-out users hitting a protected route go to
 * sign-in (the destination is restored after login); signed-in users on #/
 * go to their workspace; a workspace only opens for the matching role.
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
import { WorkerPay } from '../screens/worker/WorkerPay';
import { WorkerMe } from '../screens/worker/WorkerMe';
import { EmployerDashboard } from '../screens/employer/EmployerDashboard';
import { EmployerShifts } from '../screens/employer/EmployerShifts';
import { EmployerVerify } from '../screens/employer/EmployerVerify';
import { EmployerPay } from '../screens/employer/EmployerPay';
import { EmployerTeam } from '../screens/employer/EmployerTeam';
import { OverviewScreen } from '../screens/admin/OverviewScreen';
import { VerificationScreen } from '../screens/admin/VerificationScreen';
import { AttendanceReviewScreen } from '../screens/admin/AttendanceReviewScreen';
import { DisputesScreen } from '../screens/admin/DisputesScreen';
import { PaymentsScreen } from '../screens/admin/PaymentsScreen';
import { PrivacyScreen } from '../screens/admin/PrivacyScreen';
import { AuditScreen } from '../screens/admin/AuditScreen';
import { UsersScreen } from '../screens/admin/UsersScreen';
import { colors, spacing } from '../theme';
import { useRoute, navigate, defaultRouteFor } from './router';

type WorkerTab = 'home' | 'shifts' | 'pay' | 'profile';
type EmployerTab = 'dashboard' | 'shifts' | 'pay' | 'team' | 'verify';

const WORKER_NAV: ShellNavItem<WorkerTab>[] = [
  { key: 'home', label: 'Home' },
  { key: 'shifts', label: 'My shifts' },
  { key: 'pay', label: 'Pay' },
  { key: 'profile', label: 'Me' },
];

const EMPLOYER_NAV: ShellNavItem<EmployerTab>[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'shifts', label: 'Shifts' },
  { key: 'pay', label: 'Pay & billing' },
  { key: 'team', label: 'Team' },
];

const ADMIN_TITLES: Record<AdminRoute, { title: string; subtitle: string }> = {
  overview: { title: 'Operations overview', subtitle: 'Live partner health, queues and money moving through Klokd.' },
  verification: { title: 'Verification', subtitle: 'Workers who haven’t passed ID checks and businesses missing KRA PIN or WIBA.' },
  attendance: { title: 'Attendance', subtitle: 'Flagged check-ins and employers who start shifts without the PIN.' },
  disputes: { title: 'Disputes', subtitle: 'Problems reported by workers and businesses that need a decision.' },
  payments: { title: 'Pay & payouts', subtitle: 'Every shift’s pay, from approval to M-Pesa.' },
  privacy: { title: 'Data requests', subtitle: 'Correction and deletion requests under the Data Protection Act (30-day deadline).' },
  audit: { title: 'Audit log', subtitle: 'Append-only record of sensitive actions.' },
  users: { title: 'Users', subtitle: 'Workers and businesses on Klokd.' },
};

export function RootNavigator() {
  const { account, persona, isLoading, signOut } = useAuth();
  const route = useRoute();

  // ─── Guards ───
  useEffect(() => {
    if (isLoading) return;
    const authed = !!account && !!persona;

    if (route.name === 'landing' && authed) {
      navigate(defaultRouteFor(persona!), { replace: true });
      return;
    }
    if (route.name === 'worker' || route.name === 'employer' || route.name === 'admin') {
      if (!authed) {
        try {
          sessionStorage.setItem('klokd_return_to', window.location.hash);
        } catch {
          /* private mode — skip restore */
        }
        navigate(route.name === 'admin' ? '/signin?persona=admin' : '/signin', { replace: true });
        return;
      }
      const surface: Persona = route.name;
      if (persona !== surface) {
        navigate(defaultRouteFor(persona!), { replace: true });
      }
    }
    if (route.name === 'notfound') {
      navigate(authed ? defaultRouteFor(persona!) : '/', { replace: true });
    }
  }, [route, account, persona, isLoading]);

  if (isLoading) return <BootSplash />;

  const handleSignOut = () => {
    signOut();
    navigate('/', { replace: true });
  };

  if (route.name === 'landing') return <LandingScreen onSignIn={() => navigate('/signin')} />;
  if (route.name === 'legal') return <LegalScreen doc={route.doc} />;

  // Early-access builds route public sign-in to the waitlist; staff sign-in
  // for the operations console always stays available.
  if (route.name === 'signin' && EARLY_ACCESS && route.persona !== 'admin') {
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

  if (route.name === 'worker' && persona === 'worker') {
    return (
      <ConsumerShell
        persona="Worker"
        accent={colors.electric}
        nav={WORKER_NAV}
        active={route.tab as WorkerTab}
        onChange={tab => navigate(`/worker/${tab}`)}
        onSignOut={handleSignOut}
      >
        <TabErrorBoundary key={`${route.tab}/${route.sub ?? ''}`}>
          {route.tab === 'home' && <WorkerHome />}
          {route.tab === 'shifts' && <WorkerShifts sub={route.sub} />}
          {route.tab === 'pay' && <WorkerPay />}
          {route.tab === 'profile' && <WorkerMe />}
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
        onSignOut={handleSignOut}
      >
        <TabErrorBoundary key={`${route.tab}/${route.sub ?? ''}`}>
          {route.tab === 'dashboard' && <EmployerDashboard />}
          {route.tab === 'shifts' && <EmployerShifts sub={route.sub} invite={route.invite ?? null} />}
          {route.tab === 'verify' && <EmployerVerify />}
          {route.tab === 'pay' && <EmployerPay />}
          {route.tab === 'team' && <EmployerTeam />}
        </TabErrorBoundary>
      </ConsumerShell>
    );
  }

  if (route.name === 'admin' && persona === 'admin') {
    const tab = route.tab as AdminRoute;
    const { title, subtitle } = ADMIN_TITLES[tab];
    return (
      <AdminShell route={tab} onRouteChange={r => navigate(`/admin/${r}`)} pageTitle={title} pageSubtitle={subtitle} onSignOut={handleSignOut}>
        <TabErrorBoundary key={tab}>
          {tab === 'overview' && <OverviewScreen />}
          {tab === 'verification' && <VerificationScreen />}
          {tab === 'attendance' && <AttendanceReviewScreen />}
          {tab === 'disputes' && <DisputesScreen />}
          {tab === 'payments' && <PaymentsScreen />}
          {tab === 'privacy' && <PrivacyScreen />}
          {tab === 'audit' && <AuditScreen />}
          {tab === 'users' && <UsersScreen />}
        </TabErrorBoundary>
      </AdminShell>
    );
  }

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
