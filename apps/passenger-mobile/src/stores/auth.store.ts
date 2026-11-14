import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  PassengerProfile,
  ApiResponse,
  AuthSessionData,
  InitiateAuthData,
  VerifyRegistrationOtpData,
  VerifyRecoveryOtpData,
} from '../types';
import { mockPassenger } from '../mocks';
import { SecureStorageUtil } from '../utils/secureStorage';
import { AuthService } from '../services/auth.service';
import { TelegramAuthService } from '../services/telegramAuth.service';
import { RegistrationMethod } from '../services/registrationAuth.service';
import { RecoveryMethod } from '../services/passwordRecovery.service';
import { BiometricAuthService } from '../services/biometricAuth.service';
import { useSettingsStore } from './settings.store';
import { API_CONFIG } from '../config/api';

const REMEMBERED_EMAIL_KEY = '@kings_taxi_remembered_email';
const AUTH_TOKEN_KEY = 'kings_taxi_session_jwt';
const REFRESH_TOKEN_KEY = 'kings_taxi_session_refresh_token';
const AUTH_USER_KEY = 'kings_taxi_session_user';

// Mutex promise to prevent concurrent refresh requests from colliding or double-consuming rotating tokens
let activeRefreshPromise: Promise<boolean> | null = null;

const logoutCleanups: Array<() => void> = [];
export const registerLogoutCleanup = (fn: () => void) => {
  logoutCleanups.push(fn);
};

export interface AuthActionResult {
  success: boolean;
  error?: string;
  code?: string;
}

export interface RecoveryStateData {
  sessionId: string;
  recoveryToken: string | null;
  identifier: string;
  method: RecoveryMethod;
  fullName?: string;
  maskedIdentifier?: string;
}

interface AuthState {
  user: PassengerProfile | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  rememberedEmail: string;
  isEmailRemembered: boolean;
  recoveryState: RecoveryStateData | null;

  setRecoveryState: (state: RecoveryStateData | null) => void;
  clearRecoveryState: () => void;

  login: (identifier: string, password: string) => Promise<AuthActionResult>;
  loginWithEmail: (
    email: string,
    password: string,
    remember?: boolean
  ) => Promise<AuthActionResult>;
  loginWithTelegram: () => Promise<boolean>;
  register: (payload: {
    fullName: string;
    email: string;
    phone: string;
    password?: string;
  }) => Promise<boolean>;
  initiateRegistration: (
    method: RegistrationMethod,
    identifier: string,
    fullName: string
  ) => Promise<ApiResponse<InitiateAuthData>>;
  resendRegistrationOtp: (
    sessionId: string
  ) => Promise<
    ApiResponse<{
      success: boolean;
      resendCooldownSeconds: number;
      devOtp?: string;
    }>
  >;
  verifyRegistrationOtp: (
    sessionId: string,
    code: string
  ) => Promise<ApiResponse<VerifyRegistrationOtpData>>;
  completeRegistrationWithPassword: (
    sessionId: string,
    registrationToken: string,
    password: string
  ) => Promise<ApiResponse<AuthSessionData>>;
  verifyOtp: (code: string) => Promise<boolean>;
  initiatePasswordRecovery: (
    method: RecoveryMethod,
    identifier: string
  ) => Promise<ApiResponse<InitiateAuthData>>;
  resendRecoveryOtp: (
    sessionId: string
  ) => Promise<
    ApiResponse<{
      success: boolean;
      resendCooldownSeconds: number;
      devOtp?: string;
    }>
  >;
  verifyRecoveryOtp: (
    sessionId: string,
    code: string
  ) => Promise<ApiResponse<VerifyRecoveryOtpData>>;
  resetPassword: (
    sessionId: string,
    recoveryToken: string,
    newPassword: string
  ) => Promise<ApiResponse<{ message: string }>>;
  refreshSession: () => Promise<boolean>;
  checkSessionValidity: () => Promise<boolean>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  updateProfile: (updates: Partial<PassengerProfile>) => void;
  loadInitialAuth: () => Promise<void>;
  setRememberedEmail: (email: string, remember: boolean) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: API_CONFIG.isMockAuth ? mockPassenger : null,
  token: API_CONFIG.isMockAuth ? 'mock_jwt_token_kings_78912' : null,
  refreshToken: API_CONFIG.isMockAuth ? 'mock_rt_token_kings_78912' : null,
  isAuthenticated: API_CONFIG.isMockAuth,
  isLoading: false,
  error: null,
  rememberedEmail: '',
  isEmailRemembered: false,
  recoveryState: null,

  clearError: () => set({ error: null }),
  setRecoveryState: (state) => set({ recoveryState: state }),
  clearRecoveryState: () => set({ recoveryState: null }),

  loadInitialAuth: async () => {
    try {
      // 1. Load remembered email from AsyncStorage
      const savedEmail = await AsyncStorage.getItem(REMEMBERED_EMAIL_KEY);
      if (savedEmail) {
        set({ rememberedEmail: savedEmail, isEmailRemembered: true });
      }

      // 2. Load secure session tokens from Expo SecureStore
      const storedToken = await SecureStorageUtil.getItem(AUTH_TOKEN_KEY);
      const storedRefreshToken = await SecureStorageUtil.getItem(REFRESH_TOKEN_KEY);
      const storedUserJson = await SecureStorageUtil.getItem(AUTH_USER_KEY);

      if (storedToken && storedUserJson) {
        try {
          const user = JSON.parse(storedUserJson);
          set({
            token: storedToken,
            refreshToken: storedRefreshToken,
            user,
            isAuthenticated: true,
          });

          // Verify token freshness in background if real backend is active
          if (!API_CONFIG.isMockAuth) {
            AuthService.getCurrentPassenger(storedToken)
              .then((res) => {
                if (res.success && res.data) {
                  set({ user: res.data });
                  SecureStorageUtil.setItem(AUTH_USER_KEY, JSON.stringify(res.data)).catch(() => null);
                } else if (res.error?.includes('expired') || res.error?.includes('UNAUTHORIZED')) {
                  // Attempt silent session refresh
                  get().refreshSession();
                }
              })
              .catch(() => null);
          }
        } catch {
          // Bad JSON in user cache
        }
      }
    } catch (e) {
      console.warn('Failed to restore auth session:', e);
    }
  },

  setRememberedEmail: async (email: string, remember: boolean) => {
    try {
      if (remember && email.trim()) {
        await AsyncStorage.setItem(REMEMBERED_EMAIL_KEY, email.trim());
        set({ rememberedEmail: email.trim(), isEmailRemembered: true });
      } else {
        await AsyncStorage.removeItem(REMEMBERED_EMAIL_KEY);
        set({ rememberedEmail: '', isEmailRemembered: false });
      }
    } catch (e) {
      console.warn('Failed to update remembered email:', e);
    }
  },

  login: async (identifier: string, password: string): Promise<AuthActionResult> => {
    set({ isLoading: true, error: null });
    try {
      const res = await AuthService.login(identifier, password);

      if (res.success && res.data) {
        const { token, refreshToken, user } = res.data;
        await SecureStorageUtil.setItem(AUTH_TOKEN_KEY, token);
        await SecureStorageUtil.setItem(REFRESH_TOKEN_KEY, refreshToken);
        await SecureStorageUtil.setItem(AUTH_USER_KEY, JSON.stringify(user));

        // Prevent cross-account biometric reuse if a different passenger logs in
        try {
          const previousBioUserId = await BiometricAuthService.getBiometricPassengerId();
          if (previousBioUserId && previousBioUserId !== user.id) {
            await BiometricAuthService.clearBiometricSession();
            useSettingsStore.getState().setBiometricLoginEnabled(false);
          }
        } catch {
          // Non-blocking
        }

        // Isolate avatar cache to the authenticated passenger
        if (user.id) {
          if (user.profileImage || user.avatarUrl) {
            await AsyncStorage.setItem(
              `@kings_taxi_local_avatar_${user.id}`,
              (user.profileImage || user.avatarUrl)!
            ).catch(() => null);
          } else {
            await AsyncStorage.removeItem(`@kings_taxi_local_avatar_${user.id}`).catch(() => null);
          }
        }
        await AsyncStorage.removeItem('@kings_taxi_local_avatar').catch(() => null);

        set({
          user,
          token,
          refreshToken,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });

        return { success: true };
      }

      const errMsg = res.error || 'Authentication failed. Please verify your credentials.';
      set({
        isLoading: false,
        error: errMsg,
      });

      return {
        success: false,
        error: errMsg,
      };
    } catch (err: any) {
      const errMsg = err.message || 'Login failed. Please try again.';
      set({ isLoading: false, error: errMsg });
      return { success: false, error: errMsg };
    }
  },

  loginWithEmail: async (
    email: string,
    password: string,
    remember = false
  ): Promise<AuthActionResult> => {
    await get().setRememberedEmail(email, remember);
    return await get().login(email, password);
  },

  loginWithTelegram: async () => {
    set({ isLoading: true, error: null });
    try {
      const challenge = TelegramAuthService.generateChallenge();
      await TelegramAuthService.initiateTelegramAuth(challenge);

      const verifyRes = await TelegramAuthService.verifySession(challenge);
      if (verifyRes.success && verifyRes.data) {
        const { token, user } = verifyRes.data;
        const refreshToken = (verifyRes.data as any).refreshToken || `rt_tg_${Date.now()}`;
        await SecureStorageUtil.setItem(AUTH_TOKEN_KEY, token);
        await SecureStorageUtil.setItem(REFRESH_TOKEN_KEY, refreshToken);
        await SecureStorageUtil.setItem(AUTH_USER_KEY, JSON.stringify(user));

        set({
          user,
          token,
          refreshToken,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        return true;
      }
    } catch (err: any) {
      set({ error: err.message || 'Telegram authentication failed' });
    }
    set({ isLoading: false });
    return false;
  },

  initiateRegistration: async (method, identifier, fullName) => {
    set({ isLoading: true, error: null });
    try {
      const res = await AuthService.initiateRegistration(method, identifier, fullName);
      set({ isLoading: false });
      return res;
    } catch (err: any) {
      const errMsg = err.message || 'Failed to initiate registration';
      set({ isLoading: false, error: errMsg });
      return {
        success: false,
        data: {} as any,
        error: errMsg,
      };
    }
  },

  resendRegistrationOtp: async (sessionId) => {
    return await AuthService.resendRegistrationOtp(sessionId);
  },

  verifyRegistrationOtp: async (sessionId, code) => {
    set({ isLoading: true, error: null });
    try {
      const res = await AuthService.verifyRegistrationOtp(sessionId, code);
      set({ isLoading: false });
      return res;
    } catch (err: any) {
      const errMsg = err.message || 'Failed to verify code';
      set({ isLoading: false, error: errMsg });
      return {
        success: false,
        data: {} as any,
        error: errMsg,
      };
    }
  },

  completeRegistrationWithPassword: async (sessionId, registrationToken, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await AuthService.completeRegistration(
        sessionId,
        registrationToken,
        password
      );
      if (res.success && res.data) {
        const { token, refreshToken, user } = res.data;
        await SecureStorageUtil.setItem(AUTH_TOKEN_KEY, token);
        await SecureStorageUtil.setItem(REFRESH_TOKEN_KEY, refreshToken);
        await SecureStorageUtil.setItem(AUTH_USER_KEY, JSON.stringify(user));
        set({
          user,
          token,
          refreshToken,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      } else {
        set({ isLoading: false, error: res.error || 'Failed to complete registration' });
      }
      return res;
    } catch (err: any) {
      const errMsg = err.message || 'Failed to complete registration';
      set({ isLoading: false, error: errMsg });
      return {
        success: false,
        data: {} as any,
        error: errMsg,
      };
    }
  },

  register: async (payload: {
    fullName: string;
    email: string;
    phone: string;
    password?: string;
  }) => {
    const method: RegistrationMethod = payload.email ? 'email' : 'telegram';
    const identifier = payload.email || payload.phone;
    const initRes = await get().initiateRegistration(method, identifier, payload.fullName);
    return initRes.success;
  },

  verifyOtp: async (code: string) => {
    set({ isLoading: true });
    await new Promise((resolve) => setTimeout(resolve, 300));
    if (code.length >= 4) {
      set({
        user: mockPassenger,
        token: 'mock_jwt_token_kings_78912',
        refreshToken: 'mock_rt_token_kings_78912',
        isAuthenticated: true,
        isLoading: false,
      });
      return true;
    }
    set({ isLoading: false });
    return false;
  },

  initiatePasswordRecovery: async (method, identifier) => {
    set({ isLoading: true, error: null });
    try {
      const res = await AuthService.initiateRecovery(method, identifier);
      if (res.success && res.data) {
        set({
          recoveryState: {
            sessionId: res.data.sessionId,
            recoveryToken: null,
            identifier,
            method,
            fullName: res.data.fullName,
            maskedIdentifier: res.data.maskedIdentifier,
          },
        });
      }
      set({ isLoading: false });
      return res;
    } catch (err: any) {
      const errMsg = err.message || 'Failed to initiate password recovery';
      set({ isLoading: false, error: errMsg });
      return {
        success: false,
        data: {} as any,
        error: errMsg,
      };
    }
  },

  resendRecoveryOtp: async (sessionId) => {
    return await AuthService.resendRecoveryOtp(sessionId);
  },

  verifyRecoveryOtp: async (sessionId, code) => {
    set({ isLoading: true, error: null });
    try {
      const res = await AuthService.verifyRecoveryOtp(sessionId, code);
      if (res.success && res.data) {
        set((state) => ({
          recoveryState: state.recoveryState
            ? { ...state.recoveryState, recoveryToken: res.data.recoveryToken }
            : {
                sessionId,
                recoveryToken: res.data.recoveryToken,
                identifier: res.data.identifier,
                method: res.data.method as any,
                fullName: res.data.fullName,
              },
        }));
      }
      set({ isLoading: false });
      return res;
    } catch (err: any) {
      const errMsg = err.message || 'Failed to verify recovery code';
      set({ isLoading: false, error: errMsg });
      return {
        success: false,
        data: {} as any,
        error: errMsg,
      };
    }
  },

  resetPassword: async (sessionId, recoveryToken, newPassword) => {
    set({ isLoading: true, error: null });
    try {
      const res = await AuthService.resetPassword(sessionId, recoveryToken, newPassword);
      if (res.success) {
        get().clearRecoveryState();
      }
      set({ isLoading: false });
      return res;
    } catch (err: any) {
      const errMsg = err.message || 'Failed to reset password';
      set({ isLoading: false, error: errMsg });
      return {
        success: false,
        data: {} as any,
        error: errMsg,
      };
    }
  },

  refreshSession: async (): Promise<boolean> => {
    // If a refresh is already in-flight, return the existing promise (concurrency protection)
    if (activeRefreshPromise) {
      return activeRefreshPromise;
    }

    activeRefreshPromise = (async () => {
      try {
        const storedRefreshToken =
          get().refreshToken || (await SecureStorageUtil.getItem(REFRESH_TOKEN_KEY));

        if (!storedRefreshToken) {
          await get().logout();
          return false;
        }

        const res = await AuthService.refreshTokens(storedRefreshToken);

        if (res.success && res.data) {
          const { token, refreshToken } = res.data;
          await SecureStorageUtil.setItem(AUTH_TOKEN_KEY, token);
          await SecureStorageUtil.setItem(REFRESH_TOKEN_KEY, refreshToken);
          set({
            token,
            refreshToken,
            isAuthenticated: true,
          });
          return true;
        } else {
          // Token expired or family revoked
          await get().logout();
          return false;
        }
      } catch (err) {
        console.warn('Session refresh error:', err);
        return false;
      } finally {
        activeRefreshPromise = null;
      }
    })();

    return activeRefreshPromise;
  },

  checkSessionValidity: async () => {
    try {
      const storedToken = await SecureStorageUtil.getItem(AUTH_TOKEN_KEY);
      if (!storedToken) {
        set({ isAuthenticated: false, token: null, refreshToken: null });
        return false;
      }
      return true;
    } catch {
      set({ isAuthenticated: false, token: null, refreshToken: null });
      return false;
    }
  },

  logout: async () => {
    const currentRefreshToken = get().refreshToken;
    const currentAccessToken = get().token;

    try {
      if (currentRefreshToken || currentAccessToken) {
        await AuthService.logout(currentRefreshToken, currentAccessToken).catch(() => null);
      }
    } catch {
      // Ignore network errors on logout
    }

    await SecureStorageUtil.removeItem(AUTH_TOKEN_KEY);
    await SecureStorageUtil.removeItem(REFRESH_TOKEN_KEY);
    await SecureStorageUtil.removeItem(AUTH_USER_KEY);

    // Clear ride history cache to prevent cross-account history leakage
    await AsyncStorage.removeItem('@kings_taxi_ride_history').catch(() => null);

    // Clear passenger-specific avatar cache to guarantee isolation between accounts
    const currentUserId = get().user?.id;
    if (currentUserId) {
      await AsyncStorage.removeItem(`@kings_taxi_local_avatar_${currentUserId}`).catch(() => null);
    }
    await AsyncStorage.removeItem('@kings_taxi_local_avatar').catch(() => null);

    logoutCleanups.forEach((cleanup) => {
      try {
        cleanup();
      } catch {
        // Non-blocking
      }
    });

    // Clean up biometric session
    try {
      await BiometricAuthService.clearBiometricSession();
      useSettingsStore.getState().setBiometricLoginEnabled(false);
    } catch {
      // Non-blocking
    }

    set({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  },

  logoutAll: async () => {
    const currentAccessToken = get().token;
    try {
      if (currentAccessToken) {
        await fetch(`${API_CONFIG.baseUrl}/auth/logout-all`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${currentAccessToken}`,
          },
        }).catch(() => null);
      }
    } catch {
      // Ignore network errors
    }

    await get().logout();
  },

  updateProfile: (updates: Partial<PassengerProfile>) => {
    set((state) => {
      const updated = state.user ? { ...state.user, ...updates } : null;
      if (updated) {
        SecureStorageUtil.setItem(AUTH_USER_KEY, JSON.stringify(updated)).catch(() => null);
        const avatar = updates.profileImage || updates.avatarUrl;
        if (avatar && updated.id) {
          AsyncStorage.setItem(`@kings_taxi_local_avatar_${updated.id}`, avatar).catch(() => null);
        } else if (updates.profileImage === null && updated.id) {
          AsyncStorage.removeItem(`@kings_taxi_local_avatar_${updated.id}`).catch(() => null);
        }
      }
      return { user: updated };
    });
  },
}));
