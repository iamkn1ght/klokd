import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api } from '../services/api';

interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  isNewUser: boolean;
  accessToken: string | null;
}

interface AuthContextType extends AuthState {
  requestOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, code: string) => Promise<{ isNewUser: boolean }>;
  logout: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);
const TOKEN_KEY = 'klokd_emp_access_token';
const REFRESH_KEY = 'klokd_emp_refresh_token';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ isLoading: true, isAuthenticated: false, isNewUser: false, accessToken: null });

  useEffect(() => {
    SecureStore.getItemAsync(TOKEN_KEY).then(token => {
      setState(prev => ({ ...prev, isLoading: false, isAuthenticated: !!token, accessToken: token }));
    }).catch(() => setState(prev => ({ ...prev, isLoading: false })));
  }, []);

  const requestOtp = async (phone: string) => {
    await api('/auth/otp/request', { method: 'POST', body: { phone } });
  };

  const verifyOtp = async (phone: string, code: string) => {
    const result = await api<{ accessToken: string; refreshToken: string; isNewUser: boolean }>(
      '/auth/otp/verify', { method: 'POST', body: { phone, code, role: 'EMPLOYER' } }
    );
    await SecureStore.setItemAsync(TOKEN_KEY, result.accessToken);
    await SecureStore.setItemAsync(REFRESH_KEY, result.refreshToken);
    setState(prev => ({ ...prev, isAuthenticated: true, isNewUser: result.isNewUser, accessToken: result.accessToken }));
    return { isNewUser: result.isNewUser };
  };

  const logout = async () => {
    try {
      const rt = await SecureStore.getItemAsync(REFRESH_KEY);
      if (rt && state.accessToken) await api('/auth/logout', { method: 'POST', body: { refreshToken: rt }, token: state.accessToken }).catch(() => {});
    } finally {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_KEY);
      setState({ isLoading: false, isAuthenticated: false, isNewUser: false, accessToken: null });
    }
  };

  const getToken = useCallback(async () => state.accessToken || SecureStore.getItemAsync(TOKEN_KEY), [state.accessToken]);

  return <AuthContext.Provider value={{ ...state, requestOtp, verifyOtp, logout, getToken }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
