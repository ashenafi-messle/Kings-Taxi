import { AddressLocation, LocationCoordinates } from './common.types';

export type RideStatus =
  | 'DRAFT'
  | 'REQUESTED'
  | 'WAITING_FOR_DRIVER'
  | 'DRIVER_APPROVED'
  | 'DRIVER_ASSIGNED'
  | 'VEHICLE_SELECTED'
  | 'SEARCHING_DRIVER'
  | 'DRIVER_ARRIVING'
  | 'DRIVER_ARRIVED'
  | 'IN_PROGRESS'
  | 'TRIP_STARTED'
  | 'TRIP_COMPLETED'
  | 'AWAITING_PAYMENT'
  | 'CANCELLED'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_COMPLETED'
  | 'PAYMENT_FAILED';

export type VehicleCategory = 'economy' | 'comfort' | 'minibus' | 'vip';

export interface VehicleOption {
  id: VehicleCategory;
  name: string;
  description: string;
  capacity: number;
  baseFare: number;
  ratePerKm: number;
  ratePerMin: number;
  estimatedPrice: number;
  etaMinutes: number;
  iconName: string;
}

export interface DriverInfo {
  id: string;
  name: string;
  phone: string;
  rating: number;
  totalTrips: number;
  photoUrl: string;
  vehicleMake: string;
  vehicleModel: string;
  vehiclePlate: string;
  vehicleColor: string;
  currentLocation?: LocationCoordinates;
  bearing?: number;
}

export interface RideBooking {
  id: string;
  bookingReference?: string;
  status: RideStatus;
  subcityId?: string;
  subcityName?: string;
  passengerContactPhone?: string;
  additionalInstructions?: string;
  pickup?: AddressLocation;
  destination?: AddressLocation;
  vehicleCategory?: VehicleCategory;
  estimatedPrice?: number;
  finalPrice?: number;
  distanceKm: number;
  estimatedDurationMins: number;
  driver?: DriverInfo;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  paymentMethod?: string;
  cancellationReason?: string;
  officialDistanceMeters?: number;
  officialDurationSeconds?: number;
  fareBreakdown?: TripFareBreakdown;
}

export interface CreateOnDemandRideParams {
  subcityId: string;
  subcityName?: string;
  passengerContactPhone: string;
  additionalInstructions?: string;
  approximateLatitude?: number;
  approximateLongitude?: number;
  preferredDriverId?: string;
}

export interface SubcityInfo {
  id: string;
  name: string;
  slug: string;
  city: string;
  centerLatitude: number;
  centerLongitude: number;
  radiusKm: number;
}

export interface PublicDriverInfo {
  id: string;
  fullName: string;
  profileImage: string | null;
  rating: number;
  totalTrips: number;
  availabilityStatus: 'AVAILABLE' | 'ONLINE' | 'BUSY' | 'ON_TRIP' | 'OFFLINE';
  vehicle: {
    plateNumber: string;
    vehicleModel: string;
    vehicleColor: string;
    vehicleType: string;
    seatingCapacity: number;
  } | null;
  subcities: Array<{ id: string; name: string; slug: string; isPrimary: boolean }>;
}

export interface TripFareBreakdown {
  baseFare: number;
  perKilometreRate: number;
  perMinuteRate: number;
  minimumFare: number;
  distanceMeters: number;
  distanceKm: number;
  durationSeconds: number;
  durationMinutes: number;
  distanceFare: number;
  timeFare: number;
  totalFare: number;
  currency: string;
}

export interface TripTrackingSessionInfo {
  id: string;
  status: 'ACTIVE' | 'PAUSED' | 'INTERRUPTED' | 'COMPLETED' | 'ABORTED';
  trackingQuality: 'GOOD' | 'DEGRADED' | 'INTERRUPTED';
  officialDistanceMeters: number;
  estimatedDistanceMeters?: number;
  lastValidLocationAt?: string;
  lastLatitude?: number;
  lastLongitude?: number;
  interruptionCount: number;
}

export interface RideDestinationRevisionInfo {
  id: string;
  revisionNumber: number;
  previousDestination: string;
  newDestination: string;
  newLatitude: number;
  newLongitude: number;
  distanceTravelledAtRevisionMeters: number;
  remainingEstimatedDistanceMeters: number;
  previousEstimatedFare: number;
  revisedEstimatedFare: number;
  status: 'PENDING' | 'ACCEPTED_BY_DRIVER' | 'REJECTED_BY_DRIVER' | 'CANCELLED';
  requestedAt: string;
  respondedAt?: string;
}
