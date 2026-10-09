/**
 * Web auth + persona state. Every session is real.
 *
 *   Workers and employers: phone + one-time code against the octopus-api
 *   (Identiti → Todoku rails). The server's stored role is authoritative.
 *
 *   Staff (admin console): phone on the ADMIN_PHONES list + the Klokd staff
 *   access key (POST /auth/staff/login). Codes can't authenticate staff while
 *   SMS is unavailable and the API echoes them.
 *
 * The session (JWT + refresh token) persists in localStorage so a refresh
 * keeps you signed in; a dead token is refreshed once, then dropped.
 */
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

export type Persona = 'worker' | 'employer' | 'admin';

export interface Account {
  id: string;
  phone: string | null;
  name: string;
  initials: string;
  roles: Persona[];
}

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthState {
  account: Account | null;
  persona: Persona | null;
  /** access token for authenticated API calls */
  accessToken: string | null;
  /** brief boot window while the stored session is restored */
  isLoading: boolean;
  requestOtp: (phone: string, profile?: RequestOtpProfile) => Promise<RequestOtpResult>;
  /** Resolves with the persona the SERVER says this account holds. */
  verifyOtp: (
    phone: string,
    challengeId: string,
    code: string,
    persona: Persona
  ) => Promise<{ isNewUser: boolean; actualPersona: Persona }>;
  staffSignIn: (phone: string, accessKey: string) => Promise<void>;
  /** Re-read the display name after a profile change. */
  refreshAccount: () => Promise<void>;
  signOut: () => void;
}

export interface RequestOtpProfile {
  nameFirst: string;
  nameLast: string;
  dpaConsent: boolean;
  kycConsent: boolean;
}

interface RequestOtpResult {
  challengeId: string;
  /** Echoed by the API while SMS delivery is unavailable. */
  sandboxOtp?: string;
}

const Ctx = createContext<AuthState | null>(null);

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

const personaFor = (role: MeResponse['role']): Persona =>
  role === 'EMPLOYER' ? 'employer' : role === 'ADMIN' ? 'admin' : 'worker';

function phoneLabel(phone: string): string {
  let d = phone.replace(/[\s-()+]/g, '');
  if (d.startsWith('0')) d = '254' + d.slice(1);
  return `+${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}

function initialsFor(name: string, fallback = 'K'): string {
  const parts = name.trim().split(/\s+/).filter(p => /[A-Za-z]/.test(p));
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return fallback;
}

function accountFrom(me: MeResponse): Account {
  const name = me.profileName ?? (me.role === 'ADMIN' ? 'Klokd staff' : phoneLabel(me.phone));
  return { id: me.id, phone: me.phone, name, initials: initialsFor(name, me.phone.slice(-2)), roles: [personaFor(me.role)] };
}

function persist(account: Account | null, persona: Persona | null, tokens?: SessionTokens | null) {
  try {
    if (!account || !persona) {
      [TOKEN_KEY, REFRESH_KEY, ACCOUNT_KEY, PERSONA_KEY].forEach(k => localStorage.removeItem(k));
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
    const result = await api<{ accessToken: string }>('/auth/refresh', { method: 'POST', body: { refreshToken } });
    localStorage.setItem(TOKEN_KEY, result.accessToken);
    return result.accessToken;
  } catch {
    return null;
  }
}

async function probeToken(token: string): Promise<MeResponse | null> {
  try {
    return await api<MeResponse>('/auth/me', { token });
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
        const token = localStorage.getItem(TOKEN_KEY);
        if (token) {
          let me = await probeToken(token);
          let fresh: string | null = token;
          if (!me) {
            fresh = await tryRefresh();
            me = fresh ? await probeToken(fresh) : null;
          }
          if (cancelled) return;
          if (me && fresh) {
            const acc = accountFrom(me);
            const p = personaFor(me.role);
            setAccessToken(fresh);
            setAccount(acc);
            setPersona(p);
            persist(acc, p);
            setIsLoading(false);
            return;
          }
          persist(null, null);
        } else {
          // Sessions from older builds (demo accounts) have no token — drop them.
          persist(null, null);
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

  const value = useMemo<AuthState>(() => {
    const establish = async (tokens: SessionTokens) => {
      const me = await api<MeResponse>('/auth/me', { token: tokens.accessToken });
      const acc = accountFrom(me);
      const p = personaFor(me.role);
      setAccount(acc);
      setPersona(p);
      setAccessToken(tokens.accessToken);
      persist(acc, p, tokens);
      return p;
    };
    return {
      account,
      persona,
      accessToken,
      isLoading,
      requestOtp: async (phone, profile) => {
        const result = await api<{ challengeId: string; sandboxOtp?: string }>('/auth/otp/request', {
          method: 'POST',
          body: { phone, profile },
        });
        return { challengeId: result.challengeId, sandboxOtp: result.sandboxOtp };
      },
      verifyOtp: async (phone, challengeId, code, picked) => {
        const role = picked === 'employer' ? 'EMPLOYER' : 'WORKER';
        const result = await api<{ accessToken: string; refreshToken: string; isNewUser: boolean }>('/auth/otp/verify', {
          method: 'POST',
          body: { phone, challengeId, code, role },
        });
        const actualPersona = await establish({ accessToken: result.accessToken, refreshToken: result.refreshToken });
        return { isNewUser: result.isNewUser, actualPersona };
      },
      staffSignIn: async (phone, accessKey) => {
        const result = await api<{ accessToken: string; refreshToken: string }>('/auth/staff/login', {
          method: 'POST',
          body: { phone, accessKey },
        });
        await establish(result);
      },
      refreshAccount: async () => {
        if (!accessToken) return;
        const me = await probeToken(accessToken);
        if (!me) return;
        const acc = accountFrom(me);
        setAccount(acc);
        persist(acc, personaFor(me.role));
      },
      signOut: () => {
        const refreshToken = (() => {
          try {
            return localStorage.getItem(REFRESH_KEY);
          } catch {
            return null;
          }
        })();
        if (refreshToken && accessToken) {
          void api('/auth/logout', { method: 'POST', body: { refreshToken }, token: accessToken }).catch(() => undefined);
        }
        setAccount(null);
        setPersona(null);
        setAccessToken(null);
        persist(null, null);
      },
    };
  }, [account, persona, accessToken, isLoading]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside <AuthProvider>');
  return v;
}
