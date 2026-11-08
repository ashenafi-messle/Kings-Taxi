import { Platform } from 'react-native';

/**
 * Kings Taxi Passenger Mobile - Central API Configuration & Network Layer
 *
 * Configures communication with the Kings Taxi Central Backend.
 * Supports local development (Android emulator 10.0.2.2, iOS localhost, LAN IP)
 * and production deployment.
 */

// Default backend port matching backend/.env PORT=5000
const DEFAULT_PORT = 5000;
const DEFAULT_PREFIX = '/api/v1';

function resolveDefaultBaseUrl(): string {
  // If explicitly specified in environment
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/+$/, '');
  }

  // Android Emulator maps host localhost to 10.0.2.2
  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${DEFAULT_PORT}${DEFAULT_PREFIX}`;
  }

  // iOS Simulator & Web & default
  return `http://127.0.0.1:${DEFAULT_PORT}${DEFAULT_PREFIX}`;
}

let currentBaseUrl: string = resolveDefaultBaseUrl();

// Explicit mock flag: true only if explicitly requested; otherwise false (real API mode)
let isMockAuthEnabled: boolean =
  process.env.EXPO_PUBLIC_USE_MOCK_AUTH === 'true' ||
  process.env.EXPO_PUBLIC_DATA_SOURCE === 'mock';

export const API_CONFIG = {
  get baseUrl(): string {
    return currentBaseUrl;
  },

  setBaseUrl(url: string): void {
    currentBaseUrl = url.replace(/\/+$/, '');
  },

  get isMockAuth(): boolean {
    return isMockAuthEnabled;
  },

  setMockAuth(enabled: boolean): void {
    isMockAuthEnabled = enabled;
  },

  endpoints: {
    // Auth routes
    login: '/auth/login',
    registerInitiate: '/auth/register/initiate',
    registerResendOtp: '/auth/register/resend-otp',
    registerVerifyOtp: '/auth/register/verify-otp',
    registerComplete: '/auth/register/complete',
    recoveryInitiate: '/auth/recovery/initiate',
    recoveryResendOtp: '/auth/recovery/resend-otp',
    recoveryVerifyOtp: '/auth/recovery/verify-otp',
    recoveryReset: '/auth/recovery/reset',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    me: '/auth/me',
    telegramVerify: '/auth/telegram/verify',
    status: '/auth/status',
  },
};
