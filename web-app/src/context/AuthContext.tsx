/**
 * Web auth + persona state.
 *
 * Sign-in is REAL: phone + OTP against the octopus-api (Identiti → Todoku
 * rails, per v3). The API returns a JWT + refresh token; the session is
 * persisted in localStorage so a refresh keeps you signed in. Role
 * (WORKER/EMPLOYER) is chosen at verify time — the API sets it on first
 * verify and updates it on later verifies that pass a role.
 *
 * Persona mapping: 'worker' | 'employer' map 1:1 to WORKER / EMPLOYER.
 * 'admin' is a staff view gated to @klokd.co.ke emails — there is no ADMIN
 * login on the API's OTP endpoint (it validates WORKER|EMPLOYER only), so
 * staff pick an @klokd.co.ke email, sign in through the demo path, and land
 * in the admin console. Admin data screens show sandbox data — the real
 * admin API exists but requires an ADMIN-role JWT this flow can't mint yet.
 *
 * DEMO FALLBACK: if the API is unreachable (offline demo, rail outage), the
 * signIn falls back to a clearly-labelled demo account so the whole surface
 * stays explorable. Every real call carries the token; demo sessions get the
 * same UI with sample data.
 */
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

export type Persona = 'worker' | 'employer' | 'admin';

export interface Account {
  id: string;
  email: string | null;
  phone: string | null;
  name: string;
  initials: string;
  roles: Persona[];
  /** true when created through the demo fallback (no backend session) */
  demo: boolean;
}

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthState {
  account: Account | null;
  persona: Persona | null;
  /** access token for authenticated API calls (null in demo sessions) */
  accessToken: string | null;
  /** brief boot window while the stored session is restored */
  isLoading: boolean;
  signIn: (email: string, persona: Persona) => Promise<void>;
  requestOtp: (phone: string, profile?: RequestOtpProfile) => Promise<RequestOtpResult>;
  /** Resolves with the persona the SERVER says this account holds. */
  verifyOtp: (
    phone: string,
    challengeId: string,
    code: string,
    persona: Persona
  ) => Promise<{ isNewUser: boolean; actualPersona: Persona }>;
  signOut: () => void;
  switchPersona: (p: Persona) => void;
  canPickAdmin: (email: string) => boolean;
}

export interface RequestOtpProfile {
  nameFirst: string;
  nameLast: string;
  dpaConsent: boolean;
  kycConsent: boolean;
}

interface RequestOtpResult {
  challengeId: string;
  /** Echoed by the API in sandbox mode for testing convenience. */
  sandboxOtp?: string;
}

const Ctx = createContext<AuthState | null>(null);

const ADMIN_DOMAIN = '@klokd.co.ke';

interface MeResponse {
  id: string;
  phone: string;
  role: 'WORKER' | 'EMPLOYER' | 'ADMIN';
  kycTier: number;
  profileName: string | null;
  verificationStatus: string | null;
}

const TOKEN_KEY = 'klokd_access_token';
const REFRESH_KEY = 'klokd_refresh_token';
const ACCOUNT_KEY = 'klokd_account';
const PERSONA_KEY = 'klokd_persona';

function deriveName(phoneOrEmail: string): { name: string; initials: string } {
  // "grace.wanjiru@x.com" → Grace Wanjiru · "0722400500" → +254 722 400 500
  if (phoneOrEmail.includes('@')) {
    const local = phoneOrEmail.split('@')[0] || 'User';
    const parts = local.replace(/[._-]+/g, ' ').split(/\s+/).filter(Boolean);
    const name = parts.map(p => p[0]?.toUpperCase() + p.slice(1)).join(' ') || 'User';
    const initials = (parts[0]?.[0] ?? 'U').toUpperCase() + (parts[1]?.[0] ?? '').toUpperCase();
    return { name, initials };
  }
  // Normalise the way the API does: 07… → 2547…, then format for display.
  let digits = phoneOrEmail.replace(/[\s-()]/g, '');
  if (digits.startsWith('0')) digits = '254' + digits.slice(1);
  if (!digits.startsWith('+')) digits = '+' + digits;
  const d = digits.replace('+', '');
  const initials = d.slice(-2) || 'K';
  const name = `+${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
  return { name, initials };
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return h;
}

function persist(account: Account | null, persona: Persona | null, tokens?: SessionTokens | null) {
  try {
    if (!account || !persona) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
      localStorage.removeItem(ACCOUNT_KEY);
      localStorage.removeItem(PERSONA_KEY);
      return;
    }
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
    localStorage.setItem(PERSONA_KEY, persona);
    if (tokens) {
      localStorage.setItem(TOKEN_KEY, tokens.accessToken);
      localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
    }
  } catch {
    // storage unavailable (private mode) — session just won't survive refresh
  }
}

async function tryRefresh(): Promise<string | null> {
  try {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (!refreshToken) return null;
    const result = await api<{ accessToken: string }>('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
    });
    localStorage.setItem(TOKEN_KEY, result.accessToken);
    return result.accessToken;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [persona, setPersona] = useState<Persona | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore the stored session on boot.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const accountJson = localStorage.getItem(ACCOUNT_KEY);
        const storedPersona = localStorage.getItem(PERSONA_KEY) as Persona | null;
        const token = localStorage.getItem(TOKEN_KEY);
        if (accountJson && storedPersona) {
          const acc = JSON.parse(accountJson) as Account;
          if (!acc.demo && token) {
            // Probe the token; refresh once if stale.
            let me = await probeToken(token).catch(() => null);
            let fresh: string | null = token;
            if (!me) {
              fresh = await tryRefresh();
              me = fresh ? await probeToken(fresh).catch(() => null) : null;
            }
            if (cancelled) return;
            if (me && fresh) {
              // Hydrate the real profile name (fixes phone-derived "00"
              // avatars) and trust the server's role.
              const name = me.profileName ?? acc.name;
              const serverPersona: Persona =
                me.role === 'EMPLOYER' ? 'employer' : me.role === 'ADMIN' ? 'admin' : 'worker';
              const updated: Account = {
                ...acc,
                name,
                initials: initialsFor(name, acc.initials),
                roles: acc.roles.includes('admin')
                  ? acc.roles
                  : [serverPersona],
              };
              setAccessToken(fresh);
              setAccount(updated);
              setPersona(serverPersona === storedPersona || updated.roles.includes(storedPersona) ? storedPersona : serverPersona);
              persist(updated, storedPersona);
              setIsLoading(false);
              return;
            }
            // Token dead and refresh failed → fall through to signed-out.
            persist(null, null);
          } else {
            setAccount(acc);
            setPersona(storedPersona);
            setIsLoading(false);
            return;
          }
        }
      } catch {
        // corrupt storage — start clean
      }
      if (!cancelled) setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      account,
      persona,
      accessToken,
      isLoading,
      signIn: async (email, picked) => {
        // Demo/staff path: admin has no OTP endpoint, so staff sign in by email.
        // Also used as the offline fallback when the API is unreachable.
        const { name, initials } = deriveName(email);
        const isStaff = email.toLowerCase().endsWith(ADMIN_DOMAIN);
        const acc: Account = {
          id: 'acc-' + Math.abs(hash(email)),
          email,
          phone: null,
          name,
          initials,
          roles: isStaff ? ['admin', 'worker', 'employer'] : picked === 'employer' ? ['employer'] : ['worker'],
          demo: true,
        };
        if (picked === 'admin' && !isStaff) {
          throw new Error(`Admin requires a ${ADMIN_DOMAIN} email.`);
        }
        setAccount(acc);
        setPersona(picked);
        setAccessToken(null);
        persist(acc, picked);
      },
      requestOtp: async (phone, profile) => {
        const result = await api<{ challengeId: string; sandboxOtp?: string }>('/auth/otp/request', {
          method: 'POST',
          body: { phone, profile },
        });
        return { challengeId: result.challengeId, sandboxOtp: result.sandboxOtp };
      },
      verifyOtp: async (phone, challengeId, code, picked) => {
        const role = picked === 'employer' ? 'EMPLOYER' : 'WORKER';
        const result = await api<{
          accessToken: string;
          refreshToken: string;
          isNewUser: boolean;
          role: 'WORKER' | 'EMPLOYER';
        }>('/auth/otp/verify', {
          method: 'POST',
          body: { phone, challengeId, code, role },
        });

        // The server's stored role is authoritative. A returning WORKER who
        // taps "I hire workers" keeps their WORKER account — the API no
        // longer flips roles on re-verify, so we reflect what it says.
        const serverPersona: Persona = result.role === 'EMPLOYER' ? 'employer' : 'worker';
        const { name, initials } = deriveName(phone);
        const acc: Account = {
          id: phone,
          email: null,
          phone,
          name,
          initials,
          roles: [serverPersona],
          demo: false,
        };
        setAccount(acc);
        setPersona(serverPersona);
        setAccessToken(result.accessToken);
        persist(acc, serverPersona, { accessToken: result.accessToken, refreshToken: result.refreshToken });
        // Opportunistically hydrate the profile name without blocking the
        // handoff — next boot will have it from the restore path anyway.
        void api<MeResponse>('/auth/me', { token: result.accessToken })
          .then(me => {
            if (!me.profileName) return;
            const named: Account = {
              ...acc,
              name: me.profileName,
              initials: initialsFor(me.profileName, initials),
            };
            setAccount(named);
            persist(named, serverPersona, {
              accessToken: result.accessToken,
              refreshToken: result.refreshToken,
            });
          })
          .catch(() => undefined);
        return { isNewUser: result.isNewUser, actualPersona: serverPersona };
      },
      signOut: () => {
        setAccount(null);
        setPersona(null);
        setAccessToken(null);
        persist(null, null);
      },
      switchPersona: p => {
        if (!account?.roles.includes(p)) return;
        setPersona(p);
        persist(account, p, accessToken ? { accessToken, refreshToken: localStorage.getItem(REFRESH_KEY) || '' } : null);
      },
      canPickAdmin: email => email.toLowerCase().endsWith(ADMIN_DOMAIN),
    }),
    [account, persona, accessToken, isLoading],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function initialsFor(name: string, fallback: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return fallback;
}

async function probeToken(token: string): Promise<MeResponse | null> {
  // /auth/me is the canonical session probe: 200 proves the JWT, the payload
  // refreshes our view of the role (server-authoritative) and the display
  // name (worker/employer profile beats phone-derived).
  try {
    return await api<MeResponse>('/auth/me', { token });
  } catch {
    return null;
  }
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside <AuthProvider>');
  return v;
}
