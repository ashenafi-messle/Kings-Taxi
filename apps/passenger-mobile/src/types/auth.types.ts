export interface PassengerProfile {
  id: string;
  phone: string;
  fullName: string;
  email?: string;
  avatarUrl?: string;
  emergencyContact?: string;
  defaultPaymentMethod?: string;
  preferredLanguage?: 'en' | 'am' | 'om';
  rating?: number;
  totalTrips?: number;
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: PassengerProfile | null;
  token: string | null;
}

export interface LoginCredentials {
  phone: string;
  password?: string;
}

export interface RegisterPayload {
  fullName: string;
  phone: string;
  email?: string;
  password?: string;
}
