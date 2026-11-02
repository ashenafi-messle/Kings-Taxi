import { AddressLocation, LocationCoordinates } from './common.types';

export type RideStatus =
  | 'DRAFT'
  | 'REQUESTED'
  | 'SEARCHING_DRIVER'
  | 'DRIVER_ASSIGNED'
  | 'DRIVER_ARRIVING'
  | 'DRIVER_ARRIVED'
  | 'TRIP_STARTED'
  | 'TRIP_COMPLETED'
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
  status: RideStatus;
  pickup: AddressLocation;
  destination: AddressLocation;
  vehicleCategory: VehicleCategory;
  estimatedPrice: number;
  finalPrice?: number;
  distanceKm: number;
  estimatedDurationMins: number;
  driver?: DriverInfo;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  paymentMethod?: string;
  cancellationReason?: string;
}
