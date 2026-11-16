import {
  API_BASE_URL,
  PRODUCTION_API_URL,
  resolveApiBaseUrl,
  buildApiUrl,
  apiFetch,
  ApiFetchOptions,
  registerAuthHandlers,
} from './apiClient';

export {
  API_BASE_URL,
  PRODUCTION_API_URL,
  resolveApiBaseUrl,
  buildApiUrl,
  apiFetch,
  ApiFetchOptions,
  registerAuthHandlers,
};

/**
 * Kings Taxi Passenger Mobile - Central API Configuration
 *
 * Configures communication with the Kings Taxi Central Backend on Render.
 * Respects local development (Android emulator 10.0.2.2, iOS localhost, LAN IP)
 * and production deployment.
 */

let currentBaseUrl: string = resolveApiBaseUrl();

const isProduction =
  process.env.NODE_ENV === 'production' ||
  process.env.EXPO_PUBLIC_ENVIRONMENT === 'production';

// Explicit mock flag: strictly disabled in production builds;
// allowed in development only when explicitly requested
let isMockAuthEnabled: boolean =
  !isProduction &&
  (process.env.EXPO_PUBLIC_USE_MOCK_AUTH === 'true' ||
    process.env.EXPO_PUBLIC_DATA_SOURCE === 'mock');

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
    if (isProduction) {
      isMockAuthEnabled = false;
    } else {
      isMockAuthEnabled = enabled;
    }
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
    logoutAll: '/auth/logout-all',
    me: '/auth/me',
    telegramVerify: '/auth/telegram/verify',
    status: '/auth/status',

    // Passenger Profile & Security routes
    passengerProfile: '/passenger/profile',
    passengerContactInitiate: '/passenger/profile/change-contact/initiate',
    passengerContactVerify: '/passenger/profile/change-contact/verify',
    passengerUploadSignature: '/passenger/profile-image/upload-signature',
    passengerUploadDirect: '/passenger/profile-image/upload-direct',
    passengerProfileImage: '/passenger/profile-image',
    passengerSecurity: '/passenger/security',
    passengerBiometric: '/passenger/security/biometric',

    // Bookings & Activities
    passengerBookings: '/passengers/bookings',
    passengerRecentActivities: '/passengers/recent-activities',

    // Transportation & Rides
    subcities: '/subcities',
    drivers: '/passengers/drivers',
    estimateRide: '/passengers/rides/estimate',
    rides: '/passengers/rides',

    // Hospitality & Hotels
    hotels: '/hotels',
    featuredHotels: '/hotels/featured',
    hotelQuote: '/hotel-bookings/quote',
    hotelBookings: '/hotel-bookings',
    lounges: '/lounges',
    loungeReservations: '/lounge-reservations',

    // Heritage & Tours
    heritageSites: '/heritage/sites',
    heritagePackages: '/heritage/packages',
    heritageQuotes: '/heritage/quotes',
    heritageBookings: '/heritage/bookings',

    // Support
    supportStatus: '/support/status',
    supportTickets: '/support/tickets',

    // Payments
    paymentStatus: '/payments/status',
    paymentWebhook: '/payments/webhook',
    paymentVerify: '/payments/verify',
  },
};
