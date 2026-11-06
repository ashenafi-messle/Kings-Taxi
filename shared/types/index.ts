/**
 * Kings Taxi Platform — Shared Domain Types
 */

export type Currency = 'ETB' | 'USD';

export type UserRole = 'passenger' | 'driver' | 'admin' | 'superadmin';

export type ServiceCategory = 'rides' | 'hotels' | 'heritage' | 'tours';

export type SupportedLanguage = 'am' | 'en' | 'ti' | 'om';

export type BookingServiceType =
  | 'RIDE_HAILING'
  | 'HOTEL_TRANSPORT'
  | 'HERITAGE_TOUR'
  | 'FULL_CONTRACT';

export type BookingStatus =
  | 'DRAFT'
  | 'REQUESTED'
  | 'SEARCHING_DRIVER'
  | 'DRIVER_ASSIGNED'
  | 'DRIVER_ARRIVING'
  | 'DRIVER_ARRIVED'
  | 'TRIP_STARTED'
  | 'TRIP_COMPLETED'
  | 'CANCELLED';

export type OtpChannel = 'EMAIL' | 'TELEGRAM' | 'SMS';

export type OtpPurpose =
  | 'REGISTRATION'
  | 'LOGIN'
  | 'PASSWORD_RESET'
  | 'IDENTITY_VERIFICATION'
  | 'CHANGE_PHONE'
  | 'CHANGE_EMAIL';

export interface StandardApiResponse<T = any> {
  success: boolean;
  data: T | null;
  error: {
    code: string;
    message: string;
    details?: any;
  } | null;
  meta: {
    timestamp: string;
    requestId: string;
    version?: string;
  };
}

