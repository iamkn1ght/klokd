/**
 * Stub auth context for the admin scaffold. Real auth wiring (Identiti ops
 * login + RBAC roles) comes next; for now we expose a signed-in operator so
 * the screens render against a realistic identity.
 */
import React, { createContext, useContext, useState, useMemo } from 'react';

export type AdminRole = 'super' | 'ops' | 'compliance' | 'finance' | 'support';

export interface Operator {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  initials: string;
}

interface AuthState {
  operator: Operator | null;
  signedIn: boolean;
  signIn: (email: string) => Promise<void>;
  signOut: () => void;
}

const Ctx = createContext<AuthState | null>(null);

const DEMO: Operator = {
  id: 'op-001',
  name: 'Silvia Achieng',
  email: 'silvia@klokd.co.ke',
  role: 'compliance',
  initials: 'SA',
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [operator, setOperator] = useState<Operator | null>(DEMO);

  const value = useMemo<AuthState>(
    () => ({
      operator,
      signedIn: operator !== null,
      signIn: async () => setOperator(DEMO),
      signOut: () => setOperator(null),
    }),
    [operator],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside <AuthProvider>');
  return v;
}
