import React, { useState } from 'react';
import { AdminShell, AdminRoute } from '../components/AdminShell';
import { OverviewScreen } from '../screens/main/OverviewScreen';
import { VerificationScreen } from '../screens/main/VerificationScreen';
import { DisputesScreen } from '../screens/main/DisputesScreen';
import { PaymentsScreen } from '../screens/main/PaymentsScreen';
import { AuditScreen } from '../screens/main/AuditScreen';
import { UsersScreen } from '../screens/main/UsersScreen';

const TITLES: Record<AdminRoute, { title: string; subtitle: string }> = {
  overview: { title: 'Operations overview', subtitle: 'Live rail health, queue depth, escrow & today’s movement.' },
  verification: { title: 'Verification queue', subtitle: 'KYC escalations awaiting manual review (Silvia’s desk).' },
  disputes: { title: 'Disputes', subtitle: 'Worker / employer claims that need an admin call.' },
  payments: { title: 'Payments & escrow', subtitle: 'Live escrow positions, failed payouts, reconciliation.' },
  audit: { title: 'Audit log', subtitle: 'Hakken-signed append-only audit trail. Filter by actor, entity, action.' },
  users: { title: 'Users', subtitle: 'Workers, employers, operators. Search and drill into any record.' },
};

export function RootNavigator() {
  const [route, setRoute] = useState<AdminRoute>('overview');

  const { title, subtitle } = TITLES[route];

  return (
    <AdminShell route={route} onRouteChange={setRoute} pageTitle={title} pageSubtitle={subtitle}>
      {route === 'overview' && <OverviewScreen />}
      {route === 'verification' && <VerificationScreen />}
      {route === 'disputes' && <DisputesScreen />}
      {route === 'payments' && <PaymentsScreen />}
      {route === 'audit' && <AuditScreen />}
      {route === 'users' && <UsersScreen />}
    </AdminShell>
  );
}
