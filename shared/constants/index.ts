/**
 * Kings Taxi Platform — Shared System Constants
 */

export const APP_NAME = 'Kings Taxi';
export const DEFAULT_CURRENCY = 'ETB';
export const INITIAL_SERVICE_CITY = 'Gondar';
export const SUPPORTED_LOCALES = ['am', 'en', 'ti', 'om'] as const;

export const API_VERSION = 'v1';
export const API_PREFIX = '/api/v1';

export const GONDAR_DEFAULT_COORDINATES = {
  latitude: 12.6074,
  longitude: 37.4521,
  city: 'Gondar',
} as const;

export const OTP_EXPIRY_MINUTES = 5;
export const OTP_MAX_ATTEMPTS = 3;
export const OTP_RESEND_COOLDOWN_SECONDS = 60;

