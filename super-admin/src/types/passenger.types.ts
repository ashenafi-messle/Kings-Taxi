/**
 * Passenger Entity & Customer Management Type Definitions
 */

export type PassengerAccountStatus = 'ACTIVE' | 'SUSPENDED' | 'UNVERIFIED' | 'FLAGGED';

export interface Passenger {
  id: string;
  passengerId: string; // e.g. "PAX-8930"
  fullName: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  telegramUsername?: string;
  accountStatus: PassengerAccountStatus;
  
  // Trip & Booking Statistics
  totalRides: number;
  totalTripsTaken?: number;
  lastTripAt?: string;
  completedRides: number;
  totalSpentETB: number;
  hotelBookingsCount: number;
  heritageBookingsCount: number;
  rating: number; // e.g. 4.95
  
  // Account Information
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  registeredCity?: string;
  lastActiveAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PassengerFilterParams {
  search?: string;
  accountStatus?: string;
  city?: string;
  page?: number;
  limit?: number;
}

