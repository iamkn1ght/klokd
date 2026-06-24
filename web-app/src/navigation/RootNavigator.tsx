/**
 * RootNavigator — single state machine that routes the entire unified web:
 *
 *     unauthed    ─ landing ─→ signin ─→ (workspace + auth) ─→ authed
 *                       ↑                                          │
 *                       └─────── sign out / switch workspace ←────┘
 *
 * Persona-specific shells (ConsumerShell for worker/employer, AdminShell
 * for admin) host the tab content. Switch workspace returns to the persona
 * picker without clearing the auth account, so the user can hop between
 * workspaces they already have access to.
 */
import React, { useState } from 'react';
import { useAuth, Persona } from '../context/AuthContext';
import { LandingScreen } from '../screens/landing/LandingScreen';
import { SignInScreen } from '../screens/signin/SignInScreen';
import { ConsumerShell, ShellNavItem } from '../components/ConsumerShell';
import { AdminShell, AdminRoute } from '../components/AdminShell';
import { WorkerHome } from '../screens/worker/WorkerHome';
import { EmployerDashboard } from '../screens/employer/EmployerDashboard';
import { PlaceholderTab } from '../screens/PlaceholderTab';
import { OverviewScreen } from '../screens/admin/OverviewScreen';
import { VerificationScreen } from '../screens/admin/VerificationScreen';
import { DisputesScreen } from '../screens/admin/DisputesScreen';
import { PaymentsScreen } from '../screens/admin/PaymentsScreen';
import { AuditScreen } from '../screens/admin/AuditScreen';
import { UsersScreen } from '../screens/admin/UsersScreen';
import { colors } from '../theme';

type Screen = 'landing' | 'signin' | 'workspace';

type WorkerTab = 'home' | 'shifts' | 'pay' | 'profile';
type EmployerTab = 'dashboard' | 'shifts' | 'pay' | 'team';

const WORKER_NAV: ShellNavItem<WorkerTab>[] = [
  { key: 'home', label: 'Home' },
  { key: 'shifts', label: 'My shifts', badge: 2 },
  { key: 'pay', label: 'Pay' },
  { key: 'profile', label: 'Me' },
];

const EMPLOYER_NAV: ShellNavItem<EmployerTab>[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'shifts', label: 'Shifts', badge: 3 },
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
  const { account, persona, signOut, switchPersona } = useAuth();
  const [screen, setScreen] = useState<Screen>('landing');
  const [workerTab, setWorkerTab] = useState<WorkerTab>('home');
  const [employerTab, setEmployerTab] = useState<EmployerTab>('dashboard');
  const [adminTab, setAdminTab] = useState<AdminRoute>('overview');

  const goSignIn = () => setScreen('signin');
  const goLanding = () => {
    signOut();
    setScreen('landing');
  };
  const goSwitchWorkspace = () => setScreen('signin');

  // After auth, drop into the workspace state.
  React.useEffect(() => {
    if (account && persona) setScreen('workspace');
  }, [account, persona]);

  if (screen === 'landing' || !account || !persona) {
    if (screen === 'signin') return <SignInScreen onBackToLanding={() => setScreen('landing')} />;
    return <LandingScreen onSignIn={goSignIn} />;
  }

  // ─── Worker workspace ───
  if (persona === 'worker') {
    return (
      <ConsumerShell
        persona="Worker"
        accent={colors.electric}
        nav={WORKER_NAV}
        active={workerTab}
        onChange={setWorkerTab}
        onSwitchWorkspace={goSwitchWorkspace}
      >
        {workerTab === 'home' && <WorkerHome />}
        {workerTab === 'shifts' && (
          <PlaceholderTab
            eyebrow="MY SHIFTS"
            title="Your upcoming, active, and history shifts."
            summary="Track shifts you've applied to, the ones you're cleared on, and the full history with payouts and ratings."
            bullets={[
              'Upcoming · 2 shifts confirmed this week',
              'Active · GPS clock-in with live timer + accruing earnings',
              'History · every shift with payslip + dispute trail',
            ]}
            nativeUrl="Open Klokd Worker on iOS / Android · or localhost:8091"
          />
        )}
        {workerTab === 'pay' && (
          <PlaceholderTab
            eyebrow="PAY"
            title="Your statutory ledger."
            summary="See gross earnings, PAYE/NSSF/SHIF breakdown, AHL toggle, and downloadable monthly payslip."
            bullets={[
              'Gross · KES 84,210 this month',
              'PAYE · NSSF · SHIF auto-calculated and remitted',
              'Recent payouts with M-Pesa receipt numbers',
            ]}
            nativeUrl="Open Klokd Worker on iOS / Android · or localhost:8091"
          />
        )}
        {workerTab === 'profile' && (
          <PlaceholderTab
            eyebrow="ME"
            title="Identity, reputation, and privacy."
            summary="Verified once, your KYC works everywhere. Edit skills, certificates, M-Pesa number, and consent."
            bullets={[
              'Skills on file · Waiter, Barista, Bartender',
              'Certificates · Food handlers (2025)',
              'Privacy · what employers can see vs cannot',
            ]}
            nativeUrl="Open Klokd Worker on iOS / Android · or localhost:8091"
          />
        )}
      </ConsumerShell>
    );
  }

  // ─── Employer workspace ───
  if (persona === 'employer') {
    return (
      <ConsumerShell
        persona="Employer"
        accent={colors.volt}
        nav={EMPLOYER_NAV}
        active={employerTab}
        onChange={setEmployerTab}
        onSwitchWorkspace={goSwitchWorkspace}
      >
        {employerTab === 'dashboard' && <EmployerDashboard />}
        {employerTab === 'shifts' && (
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
        {employerTab === 'pay' && (
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
        {employerTab === 'team' && (
          <PlaceholderTab
            eyebrow="TEAM"
            title="Your trusted pool."
            summary="Workers who've worked your venue, sorted by trust score. Invite back with one tap."
            bullets={[
              'Trusted · 12 workers worked 3+ shifts here',
              'Recent · workers from your last 30 days',
              'Invited · pending direct invitations',
            ]}
            nativeUrl="Open Klokd Employer on iOS / Android · or localhost:8092"
          />
        )}
      </ConsumerShell>
    );
  }

  // ─── Admin workspace ───
  if (persona === 'admin') {
    const { title, subtitle } = ADMIN_TITLES[adminTab];
    return (
      <AdminShell
        route={adminTab}
        onRouteChange={setAdminTab}
        pageTitle={title}
        pageSubtitle={subtitle}
        onSwitchWorkspace={goSwitchWorkspace}
      >
        {adminTab === 'overview' && <OverviewScreen />}
        {adminTab === 'verification' && <VerificationScreen />}
        {adminTab === 'disputes' && <DisputesScreen />}
        {adminTab === 'payments' && <PaymentsScreen />}
        {adminTab === 'audit' && <AuditScreen />}
        {adminTab === 'users' && <UsersScreen />}
      </AdminShell>
    );
  }

  // Fallback (shouldn't reach here).
  return <LandingScreen onSignIn={goSignIn} />;
}
