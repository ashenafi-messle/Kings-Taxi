/**
 * Transportation, Live GPS Ride Monitoring & Ride History Type Definitions
 */

export type RideStatus = 
  | 'REQUESTED'
  | 'DRIVER_ASSIGNED'
  | 'DRIVER_APPROACHING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export interface LocationCoordinate {
  latitude: number;
  longitude: number;
  title?: string;
  subtitle?: string;
  address?: string;
  timestamp?: string;
}

export interface RouteWaypoint extends LocationCoordinate {
  speedKmh?: number;
  heading?: number;
}

export interface Ride {
  id: string;
  rideReference: string; // e.g. "KT-RD-78912"
  
  // Passenger Info
  passengerId: string;
  passengerName: string;
  passengerPhone: string;
  passengerAvatar?: string;
  
  // Driver Info
  driverId: string;
  driverName: string;
  driverPhone: string;
  driverAvatar?: string;
  driverRating: number;
  
  // Vehicle Info
  vehicleId: string;
  vehiclePlate: string;
  vehicleModel: string;
  vehicleColor: string;
  vehicleCategory: string;
  
  // Locations & GPS Coordinates
  pickupLocation: LocationCoordinate;
  destinationLocation: LocationCoordinate;
  currentDriverLocation: LocationCoordinate;
  recordedRoute: RouteWaypoint[]; // GPS points recorded
  
  // Timestamps & Duration
  startTime: string;
  endTime?: string;
  durationMinutes: number;
  distanceKm: number;
  
  // Pricing & Payment
  estimatedFareETB: number;
  finalFareETB: number;
  fareETB?: number;
  paymentMethod: 'TELEBIRR' | 'CBE_BIRR' | 'CASH' | 'IN_APP_WALLET';
  paymentStatus: 'PAID' | 'PENDING' | 'REFUNDED' | 'FAILED';
  
  // Status & Telemetry
  status: RideStatus;
  statusLabel: string;
  lastGpsUpdate: string;
  currentSpeedKmh?: number;
  estimatedRemainingMinutes?: number;
  
  // Demo metadata
  isDemonstrationData: boolean;
  
  createdAt: string;
  updatedAt: string;
}

export interface RideFilterParams {
  search?: string;
  status?: string;
  driverId?: string;
  passengerId?: string;
  city?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}


export type Trip = Ride;
