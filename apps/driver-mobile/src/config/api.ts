import { Platform } from 'react-native';

export const PRODUCTION_API_URL = 'https://kings-taxi.onrender.com/api/v1';

export function resolveApiBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }

  const isProd =
    process.env.NODE_ENV === 'production' ||
    process.env.EXPO_PUBLIC_ENVIRONMENT === 'production';

  if (isProd) {
    return PRODUCTION_API_URL;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000/api/v1';
  }

  return 'http://127.0.0.1:5000/api/v1';
}

export const DRIVER_API_ENDPOINTS = {
  login: '/auth/driver/login',
  refresh: '/auth/driver/refresh',
  logout: '/auth/driver/logout',
  me: '/auth/driver/me',
  forgotPassword: '/auth/driver/forgot-password',
  verifyResetOtp: '/auth/driver/verify-reset-otp',
  resetPassword: '/auth/driver/reset-password',
} as const;
