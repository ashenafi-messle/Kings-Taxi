export interface PassengerProfile {
  id: string;
  phone?: string | null;
  phoneNumber?: string | null;
  fullName: string;
  email?: string | null;
  avatarUrl?: string;
  profileImage?: string | null;
  profileImagePublicId?: string | null;
  emergencyContact?: string;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  city?: string | null;
  language?: string | null;
  defaultPaymentMethod?: string;
  preferredLanguage?: 'en' | 'am' | 'om';
  rating?: number;
  totalTrips?: number;
  biometricEnabled?: boolean;
}

export interface CloudinarySignatureData {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
  publicId: string;
  fullPublicId?: string;
  transformation: string;
  uploadUrl: string;
  uploadPreset?: string;
  simulated?: boolean;
}

export interface UpdatePassengerProfileDto {
  fullName?: string;
  city?: string;
  language?: string;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
}

export interface InitiateContactChangeDto {
  type: 'email' | 'phone';
  newContact: string;
}

export interface VerifyContactChangeDto {
  sessionId: string;
  code: string;
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
  telegramChatLinked?: boolean;
  telegramChatRequired?: boolean;
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
