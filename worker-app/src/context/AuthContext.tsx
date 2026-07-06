import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storage } from '../services/storage';
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

interface RequestOtpProfile {
  nameFirst: string;
  nameLast: string;
  dpaConsent: boolean;
  kycConsent: boolean;
}

interface RequestOtpResult {
  challengeId: string;
  /** Echoed by the API in dev mode for testing convenience. */
  sandboxOtp?: string;
}

interface AuthContextType extends AuthState {
  requestOtp: (phone: string, profile?: RequestOtpProfile) => Promise<RequestOtpResult>;
  verifyOtp: (phone: string, challengeId: string, code: string) => Promise<{ isNewUser: boolean }>;
  /** Marks onboarding finished — flips isNewUser so the root navigator swaps to Main. */
  completeOnboarding: () => void;
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
      const token = await storage.getItem(TOKEN_KEY);
      const userJson = await storage.getItem(USER_KEY);

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

  const requestOtp = async (phone: string, profile?: RequestOtpProfile): Promise<RequestOtpResult> => {
    const result = await api<{ challengeId: string; sandboxOtp?: string }>('/auth/otp/request', {
      method: 'POST',
      body: { phone, profile },
    });
    return { challengeId: result.challengeId, sandboxOtp: result.sandboxOtp };
  };

  const verifyOtp = async (phone: string, challengeId: string, code: string) => {
    const result = await api<{
      accessToken: string;
      refreshToken: string;
      isNewUser: boolean;
    }>('/auth/otp/verify', {
      method: 'POST',
      body: { phone, challengeId, code, role: 'WORKER' },
    });

    const user: User = {
      userId: '', // Set from JWT decode or profile fetch
      role: 'WORKER',
      phone,
      isNewUser: result.isNewUser,
    };

    await storage.setItem(TOKEN_KEY, result.accessToken);
    await storage.setItem(REFRESH_KEY, result.refreshToken);
    await storage.setItem(USER_KEY, JSON.stringify(user));

    setState(prev => ({
      ...prev,
      isAuthenticated: true,
      isNewUser: result.isNewUser,
      accessToken: result.accessToken,
      user,
    }));

    return { isNewUser: result.isNewUser };
  };

  const completeOnboarding = () => {
    setState(prev => ({ ...prev, isNewUser: false }));
  };

  const logout = async () => {
    try {
      const refreshToken = await storage.getItem(REFRESH_KEY);
      if (refreshToken && state.accessToken) {
        await api('/auth/logout', {
          method: 'POST',
          body: { refreshToken },
          token: state.accessToken,
        }).catch(() => {}); // Don't block logout on API failure
      }
    } finally {
      await storage.deleteItem(TOKEN_KEY);
      await storage.deleteItem(REFRESH_KEY);
      await storage.deleteItem(USER_KEY);
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
    return storage.getItem(TOKEN_KEY);
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
      completeOnboarding,
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
