import { API_CONFIG } from '../config/api';
import { useAuthStore } from '../stores/auth.store';
import {
  AddressLocation,
  ApiResponse,
  SubcityInfo,
  PublicDriverInfo,
  TripFareBreakdown,
  RideBooking,
  VehicleCategory,
  VehicleOption,
  CreateOnDemandRideParams,
} from '../types';
import { mockVehicleOptions, mockDriver } from '../mocks';

export interface CreateBookingParams {
  driverId: string;
  subcityId: string;
  pickupLocation: string;
  pickupLatitude: number;
  pickupLongitude: number;
  destinationLocation: string;
  destinationLatitude: number;
  destinationLongitude: number;
  passengerContactPhone: string;
  additionalInstructions?: string;
  vehicleCategory?: VehicleCategory;
}

// Gondar City Key Locations
export const GONDAR_LOCATIONS: AddressLocation[] = [
  {
    id: 'loc_maraki_uog',
    title: 'University of Gondar — Maraki Campus',
    subtitle: 'Main Gate, Maraki Subcity, Gondar',
    address: 'Maraki Campus, University of Gondar, Gondar',
    coordinates: { latitude: 12.6074, longitude: 37.4589 },
    city: 'Gondar',
  },
  {
    id: 'loc_fasil_ghebbi',
    title: 'Fasil Ghebbi (Royal Enclosure)',
    subtitle: 'UNESCO World Heritage Site, Piasa',
    address: 'Castles of Gondar, Piasa Subcity, Gondar',
    coordinates: { latitude: 12.608, longitude: 37.469 },
    city: 'Gondar',
  },
  {
    id: 'loc_azezo_airport',
    title: 'Atse Tewodros Airport (GDQ)',
    subtitle: 'Azezo Terminal, Azezo Subcity',
    address: 'Atse Tewodros Airport, Azezo, Gondar',
    coordinates: { latitude: 12.5222, longitude: 37.4328 },
    city: 'Gondar',
  },
  {
    id: 'loc_goha_hotel',
    title: 'Goha Hotel Viewpoint',
    subtitle: 'Hilltop Panoramic Overlook',
    address: 'Goha Hill, Gondar',
    coordinates: { latitude: 12.618, longitude: 37.472 },
    city: 'Gondar',
  },
  {
    id: 'loc_arada_market',
    title: 'Arada Central Market',
    subtitle: 'Commercial Trade Center, Arada',
    address: 'Arada Square, Arada Subcity, Gondar',
    coordinates: { latitude: 12.607, longitude: 37.468 },
    city: 'Gondar',
  },
  {
    id: 'loc_poly_college',
    title: 'Polytechnic College / Azezo Road',
    subtitle: 'Poly Subcity Junction',
    address: 'Poly Junction, Azezo Road, Gondar',
    coordinates: { latitude: 12.585, longitude: 37.442 },
    city: 'Gondar',
  },
];

async function requestWithAuth<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = useAuthStore.getState().token;
  const url = `${API_CONFIG.baseUrl}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(url, { ...options, headers });
    const json = await res.json().catch(() => null);

    if (!res.ok) {
      return {
        success: false,
        data: null as any,
        error: json?.message || json?.error?.message || (typeof json?.error === 'string' ? json.error : null) || `Request failed with status ${res.status}`,
      };
    }

    return {
      success: true,
      data: json?.data !== undefined ? json.data : json,
      message: json?.message,
    };
  } catch (err: any) {
    return {
      success: false,
      data: null as any,
      error: err.message || 'Network connection failed. Please check your connection.',
    };
  }
}

export class RideService {
  /**
   * Retrieves locations for pickup / destination search
   */
  static async getNearbyLocations(): Promise<ApiResponse<AddressLocation[]>> {
    return {
      success: true,
      data: GONDAR_LOCATIONS,
    };
  }

  /**
   * Fetch active Gondar subcities from backend
   */
  static async getSubcities(): Promise<ApiResponse<SubcityInfo[]>> {
    if (API_CONFIG.isMockAuth) {
      return {
        success: true,
        data: [
          { id: 'sub_maraki', name: 'Maraki', slug: 'maraki', city: 'Gondar', centerLatitude: 12.6074, centerLongitude: 37.4589, radiusKm: 5 },
          { id: 'sub_azezo', name: 'Azezo', slug: 'azezo', city: 'Gondar', centerLatitude: 12.535, centerLongitude: 37.435, radiusKm: 6 },
          { id: 'sub_arada', name: 'Arada', slug: 'arada', city: 'Gondar', centerLatitude: 12.607, centerLongitude: 37.468, radiusKm: 4 },
          { id: 'sub_piasa', name: 'Piasa', slug: 'piasa', city: 'Gondar', centerLatitude: 12.608, centerLongitude: 37.464, radiusKm: 4 },
          { id: 'sub_poly', name: 'Poly', slug: 'poly', city: 'Gondar', centerLatitude: 12.585, centerLongitude: 37.442, radiusKm: 5 },
        ],
      };
    }
    return requestWithAuth<SubcityInfo[]>('/passengers/subcities');
  }

  /**
   * Fetch available drivers assigned to a subcity
   */
  static async getAvailableDrivers(subcityId?: string): Promise<ApiResponse<PublicDriverInfo[]>> {
    if (API_CONFIG.isMockAuth) {
      return {
        success: true,
        data: [
          {
            id: mockDriver.id,
            fullName: mockDriver.name,
            profileImage: mockDriver.photoUrl,
            rating: mockDriver.rating,
            totalTrips: mockDriver.totalTrips,
            availabilityStatus: 'AVAILABLE',
            vehicle: {
              plateNumber: mockDriver.vehiclePlate,
              vehicleModel: `${mockDriver.vehicleMake} ${mockDriver.vehicleModel}`,
              vehicleColor: mockDriver.vehicleColor,
              vehicleType: 'STANDARD_SEDAN',
              seatingCapacity: 4,
            },
            subcities: [{ id: subcityId || 'sub_maraki', name: 'Maraki', slug: 'maraki', isPrimary: true }],
          },
        ],
      };
    }
    const query = subcityId ? `?subcityId=${encodeURIComponent(subcityId)}` : '';
    return requestWithAuth<PublicDriverInfo[]>(`/passengers/drivers${query}`);
  }

  /**
   * Dynamic Fare Estimation from backend
   */
  static async estimateFare(
    pickupLat: number,
    pickupLon: number,
    destLat: number,
    destLon: number,
    vehicleType: string = 'STANDARD_SEDAN'
  ): Promise<ApiResponse<TripFareBreakdown>> {
    if (API_CONFIG.isMockAuth) {
      return {
        success: true,
        data: {
          baseFare: 100,
          perKilometreRate: 25,
          perMinuteRate: 2,
          minimumFare: 50,
          distanceMeters: 4500,
          distanceKm: 4.5,
          durationSeconds: 720,
          durationMinutes: 12,
          distanceFare: 112.5,
          timeFare: 24,
          totalFare: 236.5,
          currency: 'ETB',
        },
      };
    }
    return requestWithAuth<TripFareBreakdown>('/passengers/rides/estimate', {
      method: 'POST',
      body: JSON.stringify({
        pickupLatitude: pickupLat,
        pickupLongitude: pickupLon,
        destinationLatitude: destLat,
        destinationLongitude: destLon,
        vehicleType,
      }),
    });
  }

  /**
   * Vehicle Options estimation (for category picker UI)
   */
  static async getVehicleEstimates(
    pickup: AddressLocation,
    destination: AddressLocation
  ): Promise<ApiResponse<VehicleOption[]>> {
    const estimates = await Promise.all([
      this.estimateFare(pickup.coordinates.latitude, pickup.coordinates.longitude, destination.coordinates.latitude, destination.coordinates.longitude, 'STANDARD_SEDAN'),
      this.estimateFare(pickup.coordinates.latitude, pickup.coordinates.longitude, destination.coordinates.latitude, destination.coordinates.longitude, 'COMFORT_VAN'),
      this.estimateFare(pickup.coordinates.latitude, pickup.coordinates.longitude, destination.coordinates.latitude, destination.coordinates.longitude, 'EXECUTIVE'),
    ]);

    const vehicles: VehicleOption[] = [
      {
        id: 'economy',
        name: 'Kings Economy',
        description: 'Standard Sedan (Corolla / Elantra)',
        capacity: 4,
        baseFare: estimates[0].data?.baseFare || 100,
        ratePerKm: estimates[0].data?.perKilometreRate || 25,
        ratePerMin: estimates[0].data?.perMinuteRate || 2,
        estimatedPrice: estimates[0].data?.totalFare || 150,
        etaMinutes: 4,
        iconName: 'car',
      },
      {
        id: 'comfort',
        name: 'Kings Comfort Van',
        description: 'Spacious Minivan (Toyota HiAce)',
        capacity: 7,
        baseFare: estimates[1].data?.baseFare || 150,
        ratePerKm: estimates[1].data?.perKilometreRate || 35,
        ratePerMin: estimates[1].data?.perMinuteRate || 3,
        estimatedPrice: estimates[1].data?.totalFare || 220,
        etaMinutes: 6,
        iconName: 'truck',
      },
      {
        id: 'vip',
        name: 'Kings Executive VIP',
        description: 'Luxury Sedan (Mercedes E-Class)',
        capacity: 4,
        baseFare: estimates[2].data?.baseFare || 200,
        ratePerKm: estimates[2].data?.perKilometreRate || 45,
        ratePerMin: estimates[2].data?.perMinuteRate || 4,
        estimatedPrice: estimates[2].data?.totalFare || 310,
        etaMinutes: 8,
        iconName: 'shield',
      },
    ];

    return { success: true, data: vehicles };
  }

  /**
   * Request an on-demand ride without requiring pickup or destination input.
   * Uses verified passenger phone, selected subcity, and optional pickup instructions.
   */
  static async requestOnDemandRide(params: CreateOnDemandRideParams): Promise<ApiResponse<RideBooking>> {
    const lat = params.approximateLatitude || 12.6074;
    const lon = params.approximateLongitude || 37.4589;
    const subcityName = params.subcityName || 'Gondar';

    if (API_CONFIG.isMockAuth) {
      const mockBooking: RideBooking = {
        id: `ride_ondemand_${Date.now()}`,
        bookingReference: `KT-${Date.now().toString(36).toUpperCase()}-REQ`,
        status: 'WAITING_FOR_DRIVER',
        subcityId: params.subcityId,
        subcityName,
        passengerContactPhone: params.passengerContactPhone,
        additionalInstructions: params.additionalInstructions,
        pickup: {
          id: 'pickup_subcity_loc',
          title: `${subcityName} Subcity, Gondar`,
          address: `${subcityName} Passenger Pickup Point`,
          coordinates: { latitude: lat, longitude: lon },
          city: 'Gondar',
        },
        destination: {
          id: 'dest_ondemand_loc',
          title: 'On-Demand Journey in Gondar',
          address: 'Destination to be finalized during trip',
          coordinates: { latitude: lat + 0.005, longitude: lon + 0.005 },
          city: 'Gondar',
        },
        vehicleCategory: 'economy',
        distanceKm: 0,
        estimatedDurationMins: 0,
        createdAt: new Date().toISOString(),
      };
      return { success: true, data: mockBooking };
    }

    // Direct driver resolution if preferred, else discover first available driver in subcity
    let driverId = params.preferredDriverId;
    if (!driverId) {
      const driversRes = await this.getAvailableDrivers(params.subcityId);
      if (driversRes.success && driversRes.data && driversRes.data.length > 0) {
        driverId = driversRes.data[0].id;
      }
    }

    // Call backend booking endpoint
    const backendPayload: CreateBookingParams = {
      driverId: driverId || '00000000-0000-0000-0000-000000000000',
      subcityId: params.subcityId,
      pickupLocation: `${subcityName} Subcity, Gondar`,
      pickupLatitude: lat,
      pickupLongitude: lon,
      destinationLocation: 'On-Demand Journey in Gondar',
      destinationLatitude: lat + 0.005,
      destinationLongitude: lon + 0.005,
      passengerContactPhone: params.passengerContactPhone,
      additionalInstructions: params.additionalInstructions,
      vehicleCategory: 'economy',
    };

    const res = await requestWithAuth<any>('/passengers/rides', {
      method: 'POST',
      body: JSON.stringify(backendPayload),
    });

    if (!res.success) {
      return {
        success: false,
        data: null as any,
        error: res.error || 'Failed to submit on-demand ride request',
      };
    }

    const b = res.data;
    const formatted: RideBooking = {
      id: b.id,
      bookingReference: b.bookingReference,
      status: 'WAITING_FOR_DRIVER',
      subcityId: params.subcityId,
      subcityName,
      passengerContactPhone: params.passengerContactPhone,
      additionalInstructions: params.additionalInstructions,
      pickup: {
        id: 'pickup_subcity_loc',
        title: `${subcityName} Subcity, Gondar`,
        address: `${subcityName} Passenger Pickup Point`,
        coordinates: { latitude: lat, longitude: lon },
        city: 'Gondar',
      },
      destination: {
        id: 'dest_ondemand_loc',
        title: 'On-Demand Journey in Gondar',
        address: 'Destination to be finalized during trip',
        coordinates: { latitude: lat + 0.005, longitude: lon + 0.005 },
        city: 'Gondar',
      },
      distanceKm: 0,
      estimatedDurationMins: 0,
      createdAt: b.createdAt || new Date().toISOString(),
    };

    return { success: true, data: formatted };
  }

  /**
   * Select vehicle after driver approves the ride request
   */
  static async selectApprovedVehicle(
    rideId: string,
    vehicleCategory: VehicleCategory
  ): Promise<ApiResponse<any>> {
    if (API_CONFIG.isMockAuth) {
      return { success: true, data: { vehicleCategory } };
    }
    return requestWithAuth<any>(`/passengers/rides/${rideId}/select-vehicle`, {
      method: 'POST',
      body: JSON.stringify({ vehicleCategory }),
    });
  }

  /**
   * Create official Ride Booking against backend API
   */
  static async createBooking(params: CreateBookingParams): Promise<ApiResponse<any>> {
    if (API_CONFIG.isMockAuth) {
      const mockBooking: RideBooking = {
        id: `ride_${Date.now()}`,
        status: 'SEARCHING_DRIVER',
        pickup: GONDAR_LOCATIONS[0],
        destination: GONDAR_LOCATIONS[1],
        vehicleCategory: params.vehicleCategory || 'comfort',
        estimatedPrice: 200,
        distanceKm: 4.5,
        estimatedDurationMins: 12,
        createdAt: new Date().toISOString(),
      };
      return { success: true, data: mockBooking };
    }

    return requestWithAuth<any>('/passengers/rides', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * Fetch live details of a ride (telematics, status, tracking session)
   */
  static async getRideDetails(rideId: string): Promise<ApiResponse<any>> {
    if (API_CONFIG.isMockAuth) {
      return { success: true, data: null };
    }
    return requestWithAuth<any>(`/passengers/rides/${rideId}`);
  }

  /**
   * Fetch passenger ride history
   */
  static async getPassengerRides(page = 1, limit = 20): Promise<ApiResponse<any>> {
    if (API_CONFIG.isMockAuth) {
      return { success: true, data: { rides: [], pagination: { total: 0 } } };
    }
    return requestWithAuth<any>(`/passengers/rides?page=${page}&limit=${limit}`);
  }

  /**
   * Request destination change mid-journey
   */
  static async requestDestinationChange(
    rideId: string,
    newDestination: string,
    newLatitude: number,
    newLongitude: number
  ): Promise<ApiResponse<any>> {
    return requestWithAuth<any>(`/passengers/rides/${rideId}/change-destination`, {
      method: 'POST',
      body: JSON.stringify({ newDestination, newLatitude, newLongitude }),
    });
  }

  /**
   * Cancel ride
   */
  static async cancelRide(rideId: string, reason?: string): Promise<ApiResponse<any>> {
    return requestWithAuth<any>(`/passengers/rides/${rideId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  /**
   * Get finalized receipt
   */
  static async getReceipt(rideId: string): Promise<ApiResponse<any>> {
    return requestWithAuth<any>(`/trips/${rideId}/receipt`);
  }

  /**
   * Record payment for completed ride
   */
  static async recordPayment(
    rideId: string,
    paymentMethod: string,
    transactionReference: string,
    amount: number
  ): Promise<ApiResponse<any>> {
    if (API_CONFIG.isMockAuth) {
      return { success: true, data: { status: 'COMPLETED' } };
    }
    return requestWithAuth<any>(`/passengers/rides/${rideId}/payment`, {
      method: 'POST',
      body: JSON.stringify({ paymentMethod, transactionReference, amount }),
    });
  }
}
