export interface PassengerProfile {
  id: string;
  phone?: string | null;
  fullName: string;
  email?: string | null;
  avatarUrl?: string;
  emergencyContact?: string;
  defaultPaymentMethod?: string;
  preferredLanguage?: 'en' | 'am' | 'om';
  rating?: number;
  totalTrips?: number;
}

export interface AuthTokens {
  token: string;
  refreshToken: string;
}

export interface AuthSessionData {
  token: string;
  refreshToken: string;
  user: PassengerProfile;
}

export interface InitiateAuthData {
  sessionId: string;
  method: 'email' | 'telegram';
  maskedIdentifier: string;
  fullName?: string;
  expiresInSeconds: number;
  resendCooldownSeconds: number;
  telegramBotUrl?: string;
  devOtp?: string;
}

export interface VerifyRegistrationOtpData {
  registrationToken: string;
  fullName: string;
  method: 'email' | 'telegram';
  identifier: string;
}

export interface VerifyRecoveryOtpData {
  recoveryToken: string;
  fullName: string;
  method: 'email' | 'telegram';
  identifier: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: PassengerProfile | null;
  token: string | null;
  refreshToken: string | null;
}

export interface LoginCredentials {
  identifier: string;
  password?: string;
  deviceId?: string;
  platform?: 'ANDROID' | 'IOS' | 'WEB' | 'UNKNOWN';
}

export interface RegisterPayload {
  fullName: string;
  phone?: string;
  email?: string;
  password?: string;
}
