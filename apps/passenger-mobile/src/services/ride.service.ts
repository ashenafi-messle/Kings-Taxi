import { mockDriver, mockLocations, mockVehicleOptions } from '../mocks';
import {
  AddressLocation,
  ApiResponse,
  DriverInfo,
  RideBooking,
  VehicleCategory,
  VehicleOption,
} from '../types';
import { calculateDistanceKm, estimateTravelTimeMinutes } from '../utils/geo';

export class RideService {
  static async getNearbyLocations(): Promise<ApiResponse<AddressLocation[]>> {
    return {
      success: true,
      data: mockLocations,
    };
  }

  static async getVehicleEstimates(
    pickup: AddressLocation,
    destination: AddressLocation
  ): Promise<ApiResponse<VehicleOption[]>> {
    const distanceKm = calculateDistanceKm(pickup.coordinates, destination.coordinates);
    const durationMins = estimateTravelTimeMinutes(distanceKm);

    const vehicles = mockVehicleOptions.map((v) => ({
      ...v,
      estimatedPrice: Math.round(v.baseFare + distanceKm * v.ratePerKm + durationMins * v.ratePerMin),
    }));

    return {
      success: true,
      data: vehicles,
    };
  }

  static async createBooking(
    pickup: AddressLocation,
    destination: AddressLocation,
    category: VehicleCategory
  ): Promise<ApiResponse<RideBooking>> {
    const distanceKm = calculateDistanceKm(pickup.coordinates, destination.coordinates);
    const durationMins = estimateTravelTimeMinutes(distanceKm);
    const vehicle = mockVehicleOptions.find((v) => v.id === category) || mockVehicleOptions[0];

    const booking: RideBooking = {
      id: `ride_${Date.now()}`,
      status: 'SEARCHING_DRIVER',
      pickup,
      destination,
      vehicleCategory: category,
      estimatedPrice: vehicle.estimatedPrice,
      distanceKm,
      estimatedDurationMins: durationMins,
      createdAt: new Date().toISOString(),
    };

    return {
      success: true,
      data: booking,
    };
  }

  static async getDriverTelematics(_rideId: string): Promise<ApiResponse<DriverInfo>> {
    return {
      success: true,
      data: mockDriver,
    };
  }
}
