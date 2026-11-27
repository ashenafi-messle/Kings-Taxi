import { Platform } from 'react-native';

export const PRODUCTION_API_URL = 'https://kings-taxi.onrender.com/api/v1';

export function resolveApiBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }

  if (process.env.EXPO_PUBLIC_USE_LOCAL_API === 'true') {
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:5000/api/v1';
    }
    return 'http://127.0.0.1:5000/api/v1';
  }

  return PRODUCTION_API_URL;
}

export function resolveSocketUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_SOCKET_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/+$/, '');
  }
  return resolveApiBaseUrl().replace(/\/api\/v1\/?$/, '');
}

export const DRIVER_API_ENDPOINTS = {
  login: '/auth/driver/login',
  refresh: '/auth/driver/refresh',
  logout: '/auth/driver/logout',
  me: '/auth/driver/me',
  forgotPassword: '/auth/driver/forgot-password',
  verifyResetOtp: '/auth/driver/verify-reset-otp',
  resetPassword: '/auth/driver/reset-password',
  availabilityMe: '/drivers/availability/me',
  availabilityOnline: '/drivers/availability/online',
  availabilityOffline: '/drivers/availability/offline',
  pendingRequests: '/rides/requests/driver/pending',
  currentRequest: '/rides/requests/driver/current',
  requestHistory: '/rides/requests/driver/history',
  acceptRequest: (id: string) => `/rides/requests/${id}/accept`,
  rejectRequest: (id: string) => `/rides/requests/${id}/reject`,
} as const;
