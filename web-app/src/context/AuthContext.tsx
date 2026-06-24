/**
 * Web auth + persona state.
 *
 * Routing model: a single user can hold multiple roles (e.g. an operator
 * who also has a worker test account), so we keep `account` and `persona`
 * separate. `persona` is the active workspace they're looking at.
 *
 * Admin persona is gated: only emails ending in @klokd.co.ke can pick it,
 * and the card is hidden from the picker for everyone else.
 */
import React, { createContext, useContext, useMemo, useState } from 'react';

export type Persona = 'worker' | 'employer' | 'admin';

export interface Account {
  id: string;
  email: string;
  name: string;
  initials: string;
  // roles a real backend would attach; we infer for demo
  roles: Persona[];
}

interface AuthState {
  account: Account | null;
  persona: Persona | null;
  signIn: (email: string, persona: Persona) => Promise<void>;
  signOut: () => void;
  switchPersona: (p: Persona) => void;
  canPickAdmin: (email: string) => boolean;
}

const Ctx = createContext<AuthState | null>(null);

const ADMIN_DOMAIN = '@klokd.co.ke';

function deriveAccount(email: string, picked: Persona): Account {
  const local = email.split('@')[0] || email;
  const parts = local.replace(/[._-]+/g, ' ').split(/\s+/).filter(Boolean);
  const name = parts.map(p => p[0]?.toUpperCase() + p.slice(1)).join(' ') || 'User';
  const initials = (parts[0]?.[0] ?? 'U').toUpperCase() + (parts[1]?.[0] ?? '').toUpperCase();
  const isStaff = email.toLowerCase().endsWith(ADMIN_DOMAIN);
  const roles: Persona[] = isStaff
    ? ['admin', 'worker', 'employer']
    : picked === 'employer'
      ? ['employer']
      : ['worker'];
  return { id: 'acc-' + Math.abs(hash(email)), email, name, initials, roles };
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return h;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [persona, setPersona] = useState<Persona | null>(null);

  const value = useMemo<AuthState>(
    () => ({
      account,
      persona,
      signIn: async (email, picked) => {
        const acc = deriveAccount(email, picked);
        if (picked === 'admin' && !acc.roles.includes('admin')) {
          throw new Error(`Admin requires a ${ADMIN_DOMAIN} email.`);
        }
        setAccount(acc);
        setPersona(picked);
      },
      signOut: () => {
        setAccount(null);
        setPersona(null);
      },
      switchPersona: p => {
        if (!account?.roles.includes(p)) return;
        setPersona(p);
      },
      canPickAdmin: email => email.toLowerCase().endsWith(ADMIN_DOMAIN),
    }),
    [account, persona],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside <AuthProvider>');
  return v;
}
