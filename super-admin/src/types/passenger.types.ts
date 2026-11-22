/**
 * Passenger Entity & Customer Management Type Definitions
 */

export type PassengerAccountStatus =
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'PENDING_VERIFICATION'
  | 'DELETED'
  | 'UNVERIFIED'
  | 'FLAGGED';

export interface Passenger {
  id: string;
  passengerId: string; // e.g. "PAX-8930"
  fullName: string;
  email: string;
  phone: string;
  phoneNumber?: string;
  avatarUrl?: string;
  profileImage?: string;
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
  isVerified?: boolean;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  registeredCity?: string;
  city?: string;
  language?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  suspensionReason?: string;
  suspendedAt?: string;
  lastActiveAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PassengerStatistics {
  totalPassengers: number;
  activePassengers: number;
  suspendedPassengers: number;
  pendingVerification: number;
  verifiedPassengers: number;
  newRegistrationsToday: number;
  newRegistrationsThisMonth: number;
  newRegistrationsThisYear: number;
}

export interface PassengerRideItem {
  id: string;
  bookingReference: string;
  serviceType: string;
  bookingStatus: string;
  pickupLocation: string;
  destinationLocation: string;
  pickupLatitude?: number;
  pickupLongitude?: number;
  destinationLatitude?: number;
  destinationLongitude?: number;
  distanceKm?: number | null;
  fare: number;
  currency: string;
  acceptedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  driver?: {
    id: string;
    name: string;
    phone: string;
    rating: number;
  } | null;
  vehicle?: {
    id: string;
    plateNumber: string;
    model: string;
    category?: string;
  } | null;
  payment?: {
    id: string;
    transactionReference: string;
    paymentMethod: string;
    paymentStatus: string;
    amount: number;
    paidAt?: string | null;
  } | null;
}

export interface PassengerBookingItem {
  id: string;
  reference: string;
  type: 'HOTEL' | 'HERITAGE' | 'RIDE';
  title: string;
  subtitle: string;
  status: string;
  amount: number;
  currency: string;
  paymentStatus: string;
  date: string;
}

export interface PassengerPaymentItem {
  id: string;
  transactionReference: string;
  gatewayReference?: string | null;
  paymentType: string;
  paymentMethod: string;
  paymentStatus: string;
  amount: number;
  currency: string;
  relatedItem: string;
  paidAt?: string | null;
  createdAt: string;
}

export interface PassengerDetail extends Passenger {
  statistics: {
    totalRides: number;
    completedRides: number;
    cancelledRides: number;
    cancellationRate: number;
    hotelBookingsCount: number;
    heritageBookingsCount: number;
    loungeReservationsCount: number;
    supportTicketsCount: number;
    totalSpentETB: number;
    successfulPaymentsCount: number;
    rating: number;
  };
  recentRides: Array<{
    id: string;
    bookingReference: string;
    pickupLocation: string;
    destinationLocation: string;
    fare: number;
    currency: string;
    status: string;
    driverName: string;
    driverPhone: string;
    vehiclePlate: string;
    vehicleModel: string;
    createdAt: string;
  }>;
  recentPayments: Array<{
    id: string;
    transactionReference: string;
    amount: number;
    currency: string;
    paymentMethod: string;
    paymentStatus: string;
    createdAt: string;
  }>;
  auditHistory: Array<{
    id: string;
    action: string;
    actorType: string;
    actorId?: string | null;
    metadata?: any;
    createdAt: string;
  }>;
}

export interface PassengerFilterParams {
  search?: string;
  accountStatus?: string;
  isVerified?: string | boolean;
  city?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
