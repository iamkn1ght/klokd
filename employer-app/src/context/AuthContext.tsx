/**
 * Employer auth — phone + one-time code against the Klokd API (Identiti →
 * Todoku). New numbers send the owner's name and consent once (Identiti
 * requires it at account creation). The server's stored role is the truth:
 * a number registered as a worker can't open the business app.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api } from '../services/api';

interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  accessToken: string | null;
  businessName: string | null;
}

interface RequestOtpProfile {
  nameFirst: string;
  nameLast: string;
  dpaConsent: boolean;
  kycConsent: boolean;
}

interface AuthContextType extends AuthState {
  requestOtp: (phone: string, profile?: RequestOtpProfile) => Promise<{ challengeId: string; sandboxOtp?: string }>;
  verifyOtp: (phone: string, challengeId: string, code: string) => Promise<void>;
  refreshName: () => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);
const TOKEN_KEY = 'klokd_emp_access_token';
const REFRESH_KEY = 'klokd_emp_refresh_token';

interface Me {
  role: 'WORKER' | 'EMPLOYER' | 'ADMIN';
  profileName: string | null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ isLoading: true, isAuthenticated: false, accessToken: null, businessName: null });

  const clear = async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => undefined);
    await SecureStore.deleteItemAsync(REFRESH_KEY).catch(() => undefined);
    setState({ isLoading: false, isAuthenticated: false, accessToken: null, businessName: null });
  };

  // Restore: probe the stored token, refresh it once if it's stale.
  useEffect(() => {
    (async () => {
      try {
        let token = await SecureStore.getItemAsync(TOKEN_KEY);
        if (!token) return clear();
        let me = await api<Me>('/auth/me', { token }).catch(() => null);
        if (!me) {
          const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
          const fresh = refreshToken
            ? await api<{ accessToken: string }>('/auth/refresh', { method: 'POST', body: { refreshToken } }).catch(() => null)
            : null;
          if (fresh) {
            token = fresh.accessToken;
            await SecureStore.setItemAsync(TOKEN_KEY, token);
            me = await api<Me>('/auth/me', { token }).catch(() => null);
          }
        }
        if (!me || me.role !== 'EMPLOYER') return clear();
        setState({ isLoading: false, isAuthenticated: true, accessToken: token, businessName: me.profileName });
      } catch {
        await clear();
      }
    })();
  }, []);

  const requestOtp = async (phone: string, profile?: RequestOtpProfile) => {
    return api<{ challengeId: string; sandboxOtp?: string }>('/auth/otp/request', { method: 'POST', body: { phone, profile } });
  };

  const verifyOtp = async (phone: string, challengeId: string, code: string) => {
    const result = await api<{ accessToken: string; refreshToken: string; role: string }>('/auth/otp/verify', {
      method: 'POST',
      body: { phone, challengeId, code, role: 'EMPLOYER' },
    });
    const me = await api<Me>('/auth/me', { token: result.accessToken });
    if (me.role !== 'EMPLOYER') {
      throw new Error('This number has a Klokd worker account. Use the Klokd worker app, or sign in with your business number.');
    }
    await SecureStore.setItemAsync(TOKEN_KEY, result.accessToken);
    await SecureStore.setItemAsync(REFRESH_KEY, result.refreshToken);
    setState({ isLoading: false, isAuthenticated: true, accessToken: result.accessToken, businessName: me.profileName });
  };

  const refreshName = async () => {
    if (!state.accessToken) return;
    const me = await api<Me>('/auth/me', { token: state.accessToken }).catch(() => null);
    if (me) setState(s => ({ ...s, businessName: me.profileName }));
  };

  const logout = async () => {
    try {
      const rt = await SecureStore.getItemAsync(REFRESH_KEY);
      if (rt && state.accessToken) await api('/auth/logout', { method: 'POST', body: { refreshToken: rt }, token: state.accessToken }).catch(() => undefined);
    } finally {
      await clear();
    }
  };

  const getToken = useCallback(async () => state.accessToken || SecureStore.getItemAsync(TOKEN_KEY), [state.accessToken]);

  return (
    <AuthContext.Provider value={{ ...state, requestOtp, verifyOtp, refreshName, logout, getToken }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
