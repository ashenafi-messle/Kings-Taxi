import { VehicleType } from '@prisma/client';
import { prisma } from '../../core/database/prisma';

export interface TourVehicleOptionFallback {
  id: string;
  vehicleType: VehicleType;
  displayName: string;
  seatingCapacity: number;
  luggageCapacity: number;
  baseRate: number;
  perHourRate: number;
  isActive: boolean;
  features: string[];
  displayOrder: number;
}

export const FALLBACK_VEHICLE_OPTIONS: TourVehicleOptionFallback[] = [
  {
    id: 'b1a2b3c4-d5e6-4f8a-9b0c-1d2e3f4a5b6c',
    vehicleType: 'STANDARD_SEDAN',
    displayName: 'Standard Sedan (Toyota Corolla or equivalent)',
    seatingCapacity: 4,
    luggageCapacity: 2,
    baseRate: 1800,
    perHourRate: 250,
    isActive: true,
    features: ['Air Conditioning', 'Chauffeured Driver', 'Complimentary Bottled Water'],
    displayOrder: 1,
  },
  {
    id: 'b2b3c4d5-e6f7-4a9b-8c1d-2e3f4a5b6c7d',
    vehicleType: 'EXECUTIVE',
    displayName: 'Executive Comfort Sedan (Toyota Camry or equivalent)',
    seatingCapacity: 4,
    luggageCapacity: 3,
    baseRate: 2400,
    perHourRate: 300,
    isActive: true,
    features: ['Extra Legroom', 'Climate Control', 'Phone Charging USB', 'Chauffeured Driver'],
    displayOrder: 2,
  },
  {
    id: 'b3c4d5e6-f7a8-4b0c-9d2e-3f4a5b6c7d8e',
    vehicleType: 'MINIVAN_TOUR',
    displayName: 'Tour Minivan (Toyota HiAce Sightseer)',
    seatingCapacity: 7,
    luggageCapacity: 6,
    baseRate: 3200,
    perHourRate: 400,
    isActive: true,
    features: ['High Roof Visibility', 'Large Windows for Sightseeing', 'PA System', 'Full AC'],
    displayOrder: 3,
  },
  {
    id: 'b4d5e6f7-a8b9-4c1d-8e3f-4a5b6c7d8e9f',
    vehicleType: 'COMFORT_VAN',
    displayName: 'Comfort Coaster Van (14-20 Passenger Van)',
    seatingCapacity: 14,
    luggageCapacity: 10,
    baseRate: 4500,
    perHourRate: 550,
    isActive: true,
    features: ['Large Group Capacity', 'Dual Air Conditioning', 'Luggage Bay', 'PA Microphone'],
    displayOrder: 4,
  },
];

export class HeritageTourVehicleOptionService {
  /**
   * List active vehicle options
   */
  async listVehicleOptions() {
    try {
      const options = await prisma.heritageTourVehicleOption.findMany({
        where: { isActive: true },
        orderBy: { displayOrder: 'asc' },
      });
      if (options.length > 0) return options;
    } catch {
      // Database offline or empty
    }

    return FALLBACK_VEHICLE_OPTIONS.filter((o) => o.isActive);
  }

  /**
   * Get vehicle option by ID
   */
  async getVehicleOptionById(id: string) {
    try {
      const option = await prisma.heritageTourVehicleOption.findUnique({
        where: { id },
      });
      if (option) return option;
    } catch {
      // Database offline
    }

    return FALLBACK_VEHICLE_OPTIONS.find((o) => o.id === id) || null;
  }

  /**
   * Validate that vehicle capacity accommodates passenger count
   */
  validateVehicleCapacity(
    option: { seatingCapacity: number; displayName: string },
    passengerCount: number
  ): { valid: boolean; error?: string } {
    if (passengerCount > option.seatingCapacity) {
      return {
        valid: false,
        error: `Selected vehicle (${option.displayName}) seats up to ${option.seatingCapacity} passengers, but ${passengerCount} passengers were requested. Please select a larger vehicle (e.g. Minivan).`,
      };
    }
    return { valid: true };
  }

  /**
   * Super Admin: Create Vehicle Option
   */
  async adminCreateVehicleOption(data: any) {
    return prisma.heritageTourVehicleOption.create({
      data,
    });
  }

  /**
   * Super Admin: Update Vehicle Option
   */
  async adminUpdateVehicleOption(id: string, data: any) {
    return prisma.heritageTourVehicleOption.update({
      where: { id },
      data,
    });
  }
}

export const heritageTourVehicleOptionService = new HeritageTourVehicleOptionService();
