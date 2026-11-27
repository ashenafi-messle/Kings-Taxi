export type DriverVerificationStatus = 'VERIFIED' | 'PENDING' | 'SUSPENDED';

export type DriverLanguage = 'en' | 'am' | 'om' | 'ti';

export type RideCategory = 'PENDING' | 'CONFIRMED' | 'HISTORY';

/**
 * Single consistent ride lifecycle state model:
 * - PENDING: Incoming ride request awaiting driver to start trip
 * - CONFIRMED: Pre-scheduled/confirmed ride awaiting scheduled window (not started here)
 * - IN_PROGRESS: Currently active trip (at most one at a time)
 * - AWAITING_PAYMENT: Trip ended, waiting for checkout payment reference submission
 * - PAYMENT_PENDING_VERIFICATION: Payment reference submitted (simulated pending review)
 * - COMPLETED: Finished ride in history
 * - CANCELLED: Cancelled ride in history
 */
export type RideStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'AWAITING_PAYMENT'
  | 'PAYMENT_PENDING_VERIFICATION'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'EXPIRED';

export type PaymentVerificationStatus = 'UNSUBMITTED' | 'PENDING_VERIFICATION';

export interface DriverVehicle {
  make: string;
  model: string;
  year: number;
  color: string;
  plateNumber: string;
  serviceTier: string;
}

export interface DriverLicense {
  licenseNumber: string;
  expiryDate: string;
  issuingAuthority: string;
}

export interface DriverProfile {
  id: string;
  driverCode: string;
  fullName: string;
  email: string;
  phone: string;
  avatarUrl: string;
  city: string;
  verificationStatus: DriverVerificationStatus;
  rating: number;
  totalTrips: number;
  acceptanceRate: number;
  vehicle: DriverVehicle;
  license: DriverLicense;
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface RideItem {
  id: string;
  referenceCode: string;
  passengerName: string;
  passengerPhone: string;
  passengerAvatar: string;
  pickupLocation: string;
  destination: string;
  pickupCoords?: GeoPoint;
  destinationCoords?: GeoPoint;
  requestedService: string;
  subcityName?: string | null;
  expiresAt?: string | null;
  requestDate: string;
  requestTime: string;
  estimatedDistanceKm: number;
  estimatedDurationMin: number;
  estimatedPriceETB: number;
  status: RideStatus;
  notes?: string;
  actualDistanceKm?: number;
  actualDurationMin?: number;
  finalFareETB?: number;
  paymentReference?: string;
  paymentInstitution?: string;
  paymentVerificationStatus?: PaymentVerificationStatus;
  completedAt?: string;
}

export interface ActiveTripSession {
  rideId: string;
  startedAtMs: number;
  elapsedSeconds: number;
  simulatedDistanceKm: number;
  currentProgressPct: number;
  isSimulating: boolean;
}

export interface MockTariffConfig {
  baseFareETB: number;
  perKmETB: number;
  perMinuteETB: number;
}

export interface FareBreakdown {
  baseFareETB: number;
  distanceKm: number;
  distanceFareETB: number;
  durationMin: number;
  timeFareETB: number;
  totalFareETB: number;
}

export interface FinancialInstitutionPlaceholder {
  id: string;
  name: string;
  accountTitle: string;
  accountNumberPlaceholder: string;
  channelType: 'MOBILE_MONEY' | 'BANK';
}

export interface AuthSession {
  isAuthenticated: boolean;
  driverId: string | null;
  identifierUsed: string | null;
  authenticatedAt: string | null;
}
