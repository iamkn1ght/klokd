import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api } from '../services/api';

interface User {
  userId: string;
  role: 'WORKER' | 'EMPLOYER';
  phone: string;
  isNewUser: boolean;
}

interface WorkerProfile {
  id: string;
  firstName: string;
  lastName: string;
  verificationStatus: string;
  skills: string;
  showUpRate: number | null;
  ratingAggregate: number | null;
  ratingCount: number;
  totalShifts: number;
}

interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  isNewUser: boolean;
  accessToken: string | null;
  user: User | null;
  profile: WorkerProfile | null;
}

interface AuthContextType extends AuthState {
  requestOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, code: string) => Promise<{ isNewUser: boolean }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = 'klokd_access_token';
const REFRESH_KEY = 'klokd_refresh_token';
const USER_KEY = 'klokd_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isLoading: true,
    isAuthenticated: false,
    isNewUser: false,
    accessToken: null,
    user: null,
    profile: null,
  });

  // Load stored auth on mount
  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const userJson = await SecureStore.getItemAsync(USER_KEY);

      if (token && userJson) {
        const user = JSON.parse(userJson) as User;
        setState(prev => ({
          ...prev,
          isLoading: false,
          isAuthenticated: true,
          accessToken: token,
          user,
          isNewUser: false,
        }));
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    } catch {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const requestOtp = async (phone: string) => {
    await api('/auth/otp/request', { method: 'POST', body: { phone } });
  };

  const verifyOtp = async (phone: string, code: string) => {
    const result = await api<{
      accessToken: string;
      refreshToken: string;
      isNewUser: boolean;
    }>('/auth/otp/verify', {
      method: 'POST',
      body: { phone, code, role: 'WORKER' },
    });

    const user: User = {
      userId: '', // Set from JWT decode or profile fetch
      role: 'WORKER',
      phone,
      isNewUser: result.isNewUser,
    };

    await SecureStore.setItemAsync(TOKEN_KEY, result.accessToken);
    await SecureStore.setItemAsync(REFRESH_KEY, result.refreshToken);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));

    setState(prev => ({
      ...prev,
      isAuthenticated: true,
      isNewUser: result.isNewUser,
      accessToken: result.accessToken,
      user,
    }));

    return { isNewUser: result.isNewUser };
  };

  const logout = async () => {
    try {
      const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
      if (refreshToken && state.accessToken) {
        await api('/auth/logout', {
          method: 'POST',
          body: { refreshToken },
          token: state.accessToken,
        }).catch(() => {}); // Don't block logout on API failure
      }
    } finally {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
      setState({
        isLoading: false,
        isAuthenticated: false,
        isNewUser: false,
        accessToken: null,
        user: null,
        profile: null,
      });
    }
  };

  const getToken = useCallback(async (): Promise<string | null> => {
    if (state.accessToken) return state.accessToken;
    return SecureStore.getItemAsync(TOKEN_KEY);
  }, [state.accessToken]);

  const refreshProfile = async () => {
    // Will be called after onboarding to fetch worker profile
    // For now a stub — wired in next step
  };

  return (
    <AuthContext.Provider value={{
      ...state,
      requestOtp,
      verifyOtp,
      logout,
      refreshProfile,
      getToken,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be inside AuthProvider');
  return context;
}
