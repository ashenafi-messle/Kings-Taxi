/**
 * Kings Taxi - Central Authentication API Service
 *
 * Implements real network communication with Kings Taxi Central Backend
 * supporting:
 * - Login (POST /api/v1/auth/login)
 * - Registration Lifecycle (initiate, resend, verify, complete)
 * - Password Recovery Lifecycle (initiate, resend, verify, reset)
 * - Rotating Refresh Tokens (POST /api/v1/auth/refresh)
 * - Session Logout (POST /api/v1/auth/logout)
 * - Authenticated Identity Inspection (GET /api/v1/auth/me)
 * - Telegram Handshake Verification (POST /api/v1/auth/telegram/verify)
 *
 * Honors API_CONFIG.isMockAuth:
 * - When real mode is active: NEVER silently replaces failed calls with mock data.
 * - When mock mode is explicitly configured: preserves local offline development engine.
 */

import { Platform } from 'react-native';
import { API_CONFIG, apiFetch } from '../config/api';
import {
  ApiResponse,
  PassengerProfile,
  AuthSessionData,
  InitiateAuthData,
  VerifyRegistrationOtpData,
  VerifyRecoveryOtpData,
} from '../types';
import { mockPassenger } from '../mocks';
import { RegistrationAuthService } from './registrationAuth.service';
import { PasswordRecoveryService } from './passwordRecovery.service';

function getClientPlatform(): 'ANDROID' | 'IOS' | 'WEB' | 'UNKNOWN' {
  if (Platform.OS === 'android') return 'ANDROID';
  if (Platform.OS === 'ios') return 'IOS';
  if (Platform.OS === 'web') return 'WEB';
  return 'UNKNOWN';
}

async function executeApiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  accessToken?: string | null
): Promise<ApiResponse<T>> {
  return apiFetch<T>(endpoint, options, accessToken);
}

export class AuthService {
  // ----------------------------------------------------------------------------
  // Login
  // ----------------------------------------------------------------------------

  static async login(
    identifier: string,
    passwordAttempt: string,
    deviceId?: string,
    platform: 'ANDROID' | 'IOS' | 'WEB' | 'UNKNOWN' = getClientPlatform()
  ): Promise<ApiResponse<AuthSessionData>> {
    const cleanIdentifier = identifier.trim().toLowerCase();

    // Offline mock branch
    if (API_CONFIG.isMockAuth) {
      const registered = await RegistrationAuthService.findAccountByIdentifier(cleanIdentifier);
      if (registered && passwordAttempt) {
        const verified = await RegistrationAuthService.verifyAccountCredentials(
          cleanIdentifier,
          passwordAttempt
        );
        if (!verified) {
          return {
            success: false,
            data: {} as any,
            error: 'Invalid email/phone or password',
          };
        }
      }

      let profile: PassengerProfile;
      if (registered) {
        profile = {
          id: registered.id,
          fullName: registered.fullName,
          email: registered.email || cleanIdentifier,
          phone: registered.phone || cleanIdentifier,
          rating: 5.0,
          totalTrips: 0,
          defaultPaymentMethod: 'telebirr',
          preferredLanguage: 'en',
        };
      } else {
        const isEmail = cleanIdentifier.includes('@');
        profile = {
          ...mockPassenger,
          phone: isEmail ? mockPassenger.phone : cleanIdentifier,
          email: isEmail ? cleanIdentifier : mockPassenger.email,
        };
      }

      return {
        success: true,
        data: {
          token: `mock_jwt_session_${Date.now()}`,
          refreshToken: `mock_rt_${Date.now()}`,
          user: profile,
        },
      };
    }

    // Real API call
    return await executeApiRequest<AuthSessionData>(API_CONFIG.endpoints.login, {
      method: 'POST',
      body: JSON.stringify({
        identifier: cleanIdentifier,
        password: passwordAttempt,
        deviceId,
        platform,
      }),
    });
  }

  // ----------------------------------------------------------------------------
  // Registration Lifecycle
  // ----------------------------------------------------------------------------

  static async initiateRegistration(
    method: 'email' | 'telegram',
    identifier: string,
    fullName: string
  ): Promise<ApiResponse<InitiateAuthData>> {
    const cleanIdentifier = identifier.trim().toLowerCase();
    const cleanFullName = fullName.trim();

    if (API_CONFIG.isMockAuth) {
      return (await RegistrationAuthService.initiateRegistration(
        method,
        cleanIdentifier,
        cleanFullName
      )) as any;
    }

    return await executeApiRequest<InitiateAuthData>(
      API_CONFIG.endpoints.registerInitiate,
      {
        method: 'POST',
        body: JSON.stringify({
          method,
          identifier: cleanIdentifier,
          fullName: cleanFullName,
        }),
      }
    );
  }

  static async resendRegistrationOtp(
    sessionId: string
  ): Promise<ApiResponse<{ success: boolean; resendCooldownSeconds: number; devOtp?: string }>> {
    if (API_CONFIG.isMockAuth) {
      return (await RegistrationAuthService.resendOtp(sessionId)) as any;
    }

    return await executeApiRequest(API_CONFIG.endpoints.registerResendOtp, {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    });
  }

  static async verifyRegistrationOtp(
    sessionId: string,
    code: string
  ): Promise<ApiResponse<VerifyRegistrationOtpData>> {
    if (API_CONFIG.isMockAuth) {
      return (await RegistrationAuthService.verifyOtp(sessionId, code)) as any;
    }

    return await executeApiRequest<VerifyRegistrationOtpData>(
      API_CONFIG.endpoints.registerVerifyOtp,
      {
        method: 'POST',
        body: JSON.stringify({ sessionId, code: code.trim() }),
      }
    );
  }

  static async completeRegistration(
    sessionId: string,
    registrationToken: string,
    password: string,
    deviceId?: string,
    platform: 'ANDROID' | 'IOS' | 'WEB' | 'UNKNOWN' = getClientPlatform()
  ): Promise<ApiResponse<AuthSessionData>> {
    if (API_CONFIG.isMockAuth) {
      return (await RegistrationAuthService.setPasswordAndComplete(
        sessionId,
        registrationToken,
        password
      )) as any;
    }

    return await executeApiRequest<AuthSessionData>(
      API_CONFIG.endpoints.registerComplete,
      {
        method: 'POST',
        body: JSON.stringify({
          sessionId,
          registrationToken,
          password,
          deviceId,
          platform,
        }),
      }
    );
  }

  // ----------------------------------------------------------------------------
  // Password Recovery Lifecycle
  // ----------------------------------------------------------------------------

  static async initiateRecovery(
    method: 'email' | 'telegram',
    identifier: string
  ): Promise<ApiResponse<InitiateAuthData>> {
    const cleanIdentifier = identifier.trim().toLowerCase();

    if (API_CONFIG.isMockAuth) {
      return (await PasswordRecoveryService.initiateRecovery(method, cleanIdentifier)) as any;
    }

    return await executeApiRequest<InitiateAuthData>(
      API_CONFIG.endpoints.recoveryInitiate,
      {
        method: 'POST',
        body: JSON.stringify({ method, identifier: cleanIdentifier }),
      }
    );
  }

  static async resendRecoveryOtp(
    sessionId: string
  ): Promise<ApiResponse<{ success: boolean; resendCooldownSeconds: number; devOtp?: string }>> {
    if (API_CONFIG.isMockAuth) {
      return (await PasswordRecoveryService.resendOtp(sessionId)) as any;
    }

    return await executeApiRequest(API_CONFIG.endpoints.recoveryResendOtp, {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    });
  }

  static async verifyRecoveryOtp(
    sessionId: string,
    code: string
  ): Promise<ApiResponse<VerifyRecoveryOtpData>> {
    if (API_CONFIG.isMockAuth) {
      return (await PasswordRecoveryService.verifyRecoveryOtp(sessionId, code)) as any;
    }

    return await executeApiRequest<VerifyRecoveryOtpData>(
      API_CONFIG.endpoints.recoveryVerifyOtp,
      {
        method: 'POST',
        body: JSON.stringify({ sessionId, code: code.trim() }),
      }
    );
  }

  static async resetPassword(
    sessionId: string,
    recoveryToken: string,
    newPassword: string
  ): Promise<ApiResponse<{ message: string }>> {
    if (API_CONFIG.isMockAuth) {
      return (await PasswordRecoveryService.setNewPasswordAndReset(
        sessionId,
        recoveryToken,
        newPassword
      )) as any;
    }

    return await executeApiRequest<{ message: string }>(
      API_CONFIG.endpoints.recoveryReset,
      {
        method: 'POST',
        body: JSON.stringify({
          sessionId,
          recoveryToken,
          newPassword,
        }),
      }
    );
  }

  // ----------------------------------------------------------------------------
  // Token Refresh, Identity & Session Termination
  // ----------------------------------------------------------------------------

  static async refreshTokens(
    refreshToken: string
  ): Promise<ApiResponse<{ token: string; refreshToken: string }>> {
    if (API_CONFIG.isMockAuth) {
      return {
        success: true,
        data: {
          token: `mock_refreshed_jwt_${Date.now()}`,
          refreshToken: `mock_refreshed_rt_${Date.now()}`,
        },
      };
    }

    return await executeApiRequest<{ token: string; refreshToken: string }>(
      API_CONFIG.endpoints.refresh,
      {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }
    );
  }

  static async logout(
    refreshToken?: string | null,
    accessToken?: string | null
  ): Promise<ApiResponse<{ success: boolean }>> {
    if (API_CONFIG.isMockAuth) {
      return { success: true, data: { success: true } };
    }

    return await executeApiRequest<{ success: boolean }>(
      API_CONFIG.endpoints.logout,
      {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      },
      accessToken
    );
  }

  static async getCurrentPassenger(
    accessToken: string
  ): Promise<ApiResponse<PassengerProfile>> {
    if (API_CONFIG.isMockAuth) {
      return {
        success: true,
        data: mockPassenger,
      };
    }

    return await executeApiRequest<PassengerProfile>(
      API_CONFIG.endpoints.me,
      { method: 'GET' },
      accessToken
    );
  }

  // ----------------------------------------------------------------------------
  // Telegram Handshake
  // ----------------------------------------------------------------------------

  static async verifyTelegram(
    challenge: string,
    telegramUser: any
  ): Promise<ApiResponse<{ challenge: string; verified: boolean }>> {
    if (API_CONFIG.isMockAuth) {
      return {
        success: true,
        data: { challenge, verified: true },
      };
    }

    return await executeApiRequest<{ challenge: string; verified: boolean }>(
      API_CONFIG.endpoints.telegramVerify,
      {
        method: 'POST',
        body: JSON.stringify({ challenge, telegramUser }),
      }
    );
  }
}
