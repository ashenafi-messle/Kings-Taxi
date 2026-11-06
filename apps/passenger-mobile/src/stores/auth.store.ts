import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PassengerProfile, ApiResponse } from '../types';
import { mockPassenger } from '../mocks';
import { SecureStorageUtil } from '../utils/secureStorage';
import { TelegramAuthService } from '../services/telegramAuth.service';
import {
  RegistrationAuthService,
  RegistrationMethod,
} from '../services/registrationAuth.service';
import {
  PasswordRecoveryService,
  RecoveryMethod,
} from '../services/passwordRecovery.service';

const REMEMBERED_EMAIL_KEY = '@kings_taxi_remembered_email';
const AUTH_TOKEN_KEY = 'kings_taxi_session_jwt';
const AUTH_USER_KEY = 'kings_taxi_session_user';

interface AuthState {
  user: PassengerProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  rememberedEmail: string;
  isEmailRemembered: boolean;

  login: (identifier: string, password?: string) => Promise<boolean>;
  loginWithEmail: (email: string, password?: string, remember?: boolean) => Promise<boolean>;
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
  ) => Promise<
    ApiResponse<{
      sessionId: string;
      method: RegistrationMethod;
      maskedIdentifier: string;
      expiresInSeconds: number;
      resendCooldownSeconds: number;
      devOtp?: string;
    }>
  >;
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
  ) => Promise<
    ApiResponse<{
      registrationToken: string;
      fullName: string;
      method: RegistrationMethod;
      identifier: string;
    }>
  >;
  completeRegistrationWithPassword: (
    sessionId: string,
    registrationToken: string,
    password: string
  ) => Promise<ApiResponse<{ token: string; user: PassengerProfile }>>;
  verifyOtp: (code: string) => Promise<boolean>;
  initiatePasswordRecovery: (
    method: RecoveryMethod,
    identifier: string
  ) => Promise<ApiResponse<any>>;
  resendRecoveryOtp: (sessionId: string) => Promise<ApiResponse<any>>;
  verifyRecoveryOtp: (sessionId: string, code: string) => Promise<ApiResponse<any>>;
  resetPassword: (
    sessionId: string,
    recoveryToken: string,
    newPassword: string
  ) => Promise<ApiResponse<any>>;
  checkSessionValidity: () => Promise<boolean>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<PassengerProfile>) => void;
  loadInitialAuth: () => Promise<void>;
  setRememberedEmail: (email: string, remember: boolean) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: mockPassenger,
  token: 'mock_jwt_token_kings_78912',
  isAuthenticated: true, // Default active for immediate developer access & preview
  isLoading: false,
  rememberedEmail: '',
  isEmailRemembered: false,

  loadInitialAuth: async () => {
    try {
      // 1. Load remembered email
      const savedEmail = await AsyncStorage.getItem(REMEMBERED_EMAIL_KEY);
      if (savedEmail) {
        set({ rememberedEmail: savedEmail, isEmailRemembered: true });
      }

      // 2. Load secure session token
      const storedToken = await SecureStorageUtil.getItem(AUTH_TOKEN_KEY);
      const storedUserJson = await SecureStorageUtil.getItem(AUTH_USER_KEY);

      if (storedToken && storedUserJson) {
        const user = JSON.parse(storedUserJson);
        set({
          token: storedToken,
          user,
          isAuthenticated: true,
        });
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

  login: async (identifier: string, password?: string) => {
    set({ isLoading: true });
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Check if account exists in registered accounts database
    const registered = await RegistrationAuthService.findAccountByIdentifier(identifier);
    if (registered && password) {
      const verified = await RegistrationAuthService.verifyAccountCredentials(identifier, password);
      if (!verified) {
        set({ isLoading: false });
        return false;
      }
    }

    let updatedUser: PassengerProfile;
    if (registered) {
      updatedUser = {
        id: registered.id,
        fullName: registered.fullName,
        email: registered.email || identifier,
        phone: registered.phone || identifier,
        rating: 5.0,
        totalTrips: 0,
        defaultPaymentMethod: 'telebirr',
        preferredLanguage: 'en',
      };
    } else {
      const isEmail = identifier.includes('@');
      updatedUser = {
        ...mockPassenger,
        phone: isEmail ? mockPassenger.phone : identifier,
        email: isEmail ? identifier : mockPassenger.email,
      };
    }

    const token = `jwt_kt_session_${Date.now()}`;
    await SecureStorageUtil.setItem(AUTH_TOKEN_KEY, token);
    await SecureStorageUtil.setItem(AUTH_USER_KEY, JSON.stringify(updatedUser));

    set({
      user: updatedUser,
      token,
      isAuthenticated: true,
      isLoading: false,
    });
    return true;
  },

  loginWithEmail: async (email: string, password?: string, remember = false) => {
    set({ isLoading: true });
    await new Promise((resolve) => setTimeout(resolve, 500));

    await get().setRememberedEmail(email, remember);

    const registered = await RegistrationAuthService.findAccountByIdentifier(email);
    if (registered && password) {
      const verified = await RegistrationAuthService.verifyAccountCredentials(email, password);
      if (!verified) {
        set({ isLoading: false });
        return false;
      }
    }

    let updatedUser: PassengerProfile;

    if (registered) {
      updatedUser = {
        id: registered.id,
        fullName: registered.fullName,
        email: registered.email || email,
        phone: registered.phone || mockPassenger.phone,
        rating: 5.0,
        totalTrips: 0,
        defaultPaymentMethod: 'telebirr',
        preferredLanguage: 'en',
      };
    } else {
      updatedUser = {
        ...mockPassenger,
        email,
      };
    }

    const token = `jwt_kt_email_${Date.now().toString(36)}`;
    await SecureStorageUtil.setItem(AUTH_TOKEN_KEY, token);
    await SecureStorageUtil.setItem(AUTH_USER_KEY, JSON.stringify(updatedUser));

    set({
      user: updatedUser,
      token,
      isAuthenticated: true,
      isLoading: false,
    });
    return true;
  },

  loginWithTelegram: async () => {
    set({ isLoading: true });
    try {
      const challenge = TelegramAuthService.generateChallenge();
      await TelegramAuthService.initiateTelegramAuth(challenge);

      const verifyRes = await TelegramAuthService.verifySession(challenge);
      if (verifyRes.success && verifyRes.data) {
        const { token, user } = verifyRes.data;
        await SecureStorageUtil.setItem(AUTH_TOKEN_KEY, token);
        await SecureStorageUtil.setItem(AUTH_USER_KEY, JSON.stringify(user));

        set({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
        });
        return true;
      }
    } catch (err) {
      console.warn('Telegram auth error:', err);
    }
    set({ isLoading: false });
    return false;
  },

  initiateRegistration: async (method, identifier, fullName) => {
    set({ isLoading: true });
    try {
      const res = await RegistrationAuthService.initiateRegistration(method, identifier, fullName);
      set({ isLoading: false });
      return res;
    } catch (err: any) {
      set({ isLoading: false });
      return {
        success: false,
        data: {} as any,
        error: err.message || 'Failed to initiate registration',
      };
    }
  },

  resendRegistrationOtp: async (sessionId) => {
    return await RegistrationAuthService.resendOtp(sessionId);
  },

  verifyRegistrationOtp: async (sessionId, code) => {
    set({ isLoading: true });
    try {
      const res = await RegistrationAuthService.verifyOtp(sessionId, code);
      set({ isLoading: false });
      return res;
    } catch (err: any) {
      set({ isLoading: false });
      return {
        success: false,
        data: {} as any,
        error: err.message || 'Failed to verify code',
      };
    }
  },

  completeRegistrationWithPassword: async (sessionId, registrationToken, password) => {
    set({ isLoading: true });
    try {
      const res = await RegistrationAuthService.setPasswordAndComplete(
        sessionId,
        registrationToken,
        password
      );
      if (res.success && res.data) {
        const { token, user } = res.data;
        await SecureStorageUtil.setItem(AUTH_TOKEN_KEY, token);
        await SecureStorageUtil.setItem(AUTH_USER_KEY, JSON.stringify(user));
        set({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
      return res;
    } catch (err: any) {
      set({ isLoading: false });
      return {
        success: false,
        data: {} as any,
        error: err.message || 'Failed to save password',
      };
    }
  },

  register: async (payload: {
    fullName: string;
    email: string;
    phone: string;
    password?: string;
  }) => {
    set({ isLoading: true });
    await new Promise((resolve) => setTimeout(resolve, 600));

    const newUser: PassengerProfile = {
      id: `usr_${Date.now().toString(36)}`,
      fullName: payload.fullName,
      phone: payload.phone,
      email: payload.email,
      rating: 5.0,
      totalTrips: 0,
      defaultPaymentMethod: 'telebirr',
      preferredLanguage: 'en',
    };

    const token = `jwt_kt_reg_${Date.now().toString(36)}`;
    await SecureStorageUtil.setItem(AUTH_TOKEN_KEY, token);
    await SecureStorageUtil.setItem(AUTH_USER_KEY, JSON.stringify(newUser));

    set({
      user: newUser,
      token,
      isAuthenticated: true,
      isLoading: false,
    });
    return true;
  },

  verifyOtp: async (code: string) => {
    set({ isLoading: true });
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (code.length >= 4) {
      set({
        user: mockPassenger,
        token: 'mock_jwt_token_kings_78912',
        isAuthenticated: true,
        isLoading: false,
      });
      return true;
    }
    set({ isLoading: false });
    return false;
  },

  initiatePasswordRecovery: async (method, identifier) => {
    set({ isLoading: true });
    try {
      const res = await PasswordRecoveryService.initiateRecovery(method, identifier);
      set({ isLoading: false });
      return res;
    } catch (err: any) {
      set({ isLoading: false });
      return {
        success: false,
        data: {} as any,
        error: err.message || 'Failed to initiate password recovery',
      };
    }
  },

  resendRecoveryOtp: async (sessionId) => {
    return await PasswordRecoveryService.resendOtp(sessionId);
  },

  verifyRecoveryOtp: async (sessionId, code) => {
    set({ isLoading: true });
    try {
      const res = await PasswordRecoveryService.verifyRecoveryOtp(sessionId, code);
      set({ isLoading: false });
      return res;
    } catch (err: any) {
      set({ isLoading: false });
      return {
        success: false,
        data: {} as any,
        error: err.message || 'Failed to verify recovery code',
      };
    }
  },

  resetPassword: async (sessionId, recoveryToken, newPassword) => {
    set({ isLoading: true });
    try {
      const res = await PasswordRecoveryService.setNewPasswordAndReset(
        sessionId,
        recoveryToken,
        newPassword
      );
      set({ isLoading: false });
      return res;
    } catch (err: any) {
      set({ isLoading: false });
      return {
        success: false,
        data: {} as any,
        error: err.message || 'Failed to reset password',
      };
    }
  },

  checkSessionValidity: async () => {
    try {
      const storedToken = await SecureStorageUtil.getItem(AUTH_TOKEN_KEY);
      if (!storedToken) {
        set({ isAuthenticated: false, token: null });
        return false;
      }
      return true;
    } catch {
      set({ isAuthenticated: false, token: null });
      return false;
    }
  },

  logout: async () => {
    await SecureStorageUtil.removeItem(AUTH_TOKEN_KEY);
    await SecureStorageUtil.removeItem(AUTH_USER_KEY);
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  updateProfile: (updates: Partial<PassengerProfile>) => {
    set((state) => {
      const updated = state.user ? { ...state.user, ...updates } : null;
      if (updated) {
        SecureStorageUtil.setItem(AUTH_USER_KEY, JSON.stringify(updated));
      }
      return { user: updated };
    });
  },
}));
