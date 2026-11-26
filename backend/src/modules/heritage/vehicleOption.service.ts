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

  /**
   * Retrieve real registered fleet vehicles eligible for heritage tours on a given date and passenger count.
   */
  async listAvailableFleetVehicles(params: { date?: string; passengers?: number } = {}) {
    const passengers = Math.max(1, Number(params.passengers) || 1);
    try {
      const vehicles = await prisma.vehicle.findMany({
        where: {
          isActive: true,
          status: { in: ['ACTIVE', 'AVAILABLE'] },
          verificationStatus: 'VERIFIED',
          seatingCapacity: { gte: passengers },
        },
        orderBy: [{ seatingCapacity: 'asc' }, { vehicleModel: 'asc' }],
      });

      let bookedVehicleIds = new Set<string>();
      if (params.date) {
        const targetDate = new Date(params.date);
        const bookings = await prisma.heritageTourBooking.findMany({
          where: {
            scheduledDate: targetDate,
            assignedVehicleId: { not: null },
            bookingStatus: {
              in: ['CONFIRMED', 'REQUESTED', 'PENDING', 'GUIDE_ASSIGNED', 'VEHICLE_ASSIGNED', 'IN_PROGRESS'],
            },
          },
          select: { assignedVehicleId: true },
        });
        bookedVehicleIds = new Set(
          bookings.map((b) => b.assignedVehicleId).filter((v): v is string => Boolean(v))
        );
      }

      return vehicles
        .filter((v) => !bookedVehicleIds.has(v.id))
        .map((v) => ({
          id: v.id,
          make: v.make,
          vehicleModel: v.vehicleModel,
          vehicleType: v.vehicleType,
          plateNumber: v.plateNumber,
          seatingCapacity: v.seatingCapacity,
          vehicleColor: v.vehicleColor,
          year: v.manufacturingYear,
          imageUrl: v.imageUrl || null,
          isAvailable: true,
        }));
    } catch {
      return [];
    }
  }

  /**
   * Transactional validation of a registered Fleet Vehicle for heritage tour assignment.
   * Prevents disabled vehicles, insufficient capacity, maintenance conflicts, and double-booking on the same date.
   */
  async validateFleetVehicleEligibility(
    tx: any,
    params: {
      vehicleId: string;
      scheduledDate: Date;
      totalPassengers: number;
      excludeBookingId?: string;
    }
  ) {
    const { vehicleId, scheduledDate, totalPassengers, excludeBookingId } = params;
    const vehicle = await tx.vehicle.findUnique({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      throw new Error('VEHICLE_NOT_FOUND: Selected fleet vehicle does not exist.');
    }
    if (vehicle.status === 'UNDER_MAINTENANCE') {
      throw new Error(`VEHICLE_UNDER_MAINTENANCE: Vehicle '${vehicle.vehicleModel}' is currently under maintenance.`);
    }
    if (!vehicle.isActive || !['ACTIVE', 'AVAILABLE'].includes(vehicle.status) || vehicle.verificationStatus !== 'VERIFIED') {
      throw new Error(`VEHICLE_INACTIVE: Vehicle '${vehicle.vehicleModel}' is currently inactive or unavailable.`);
    }
    if (vehicle.seatingCapacity < totalPassengers) {
      throw new Error(
        `VEHICLE_CAPACITY_EXCEEDED: Vehicle '${vehicle.vehicleModel}' seats ${vehicle.seatingCapacity} passengers, but ${totalPassengers} were requested.`
      );
    }

    const conflicting = await tx.heritageTourBooking.findFirst({
      where: {
        assignedVehicleId: vehicleId,
        scheduledDate,
        ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
        bookingStatus: {
          in: ['CONFIRMED', 'REQUESTED', 'PENDING', 'GUIDE_ASSIGNED', 'VEHICLE_ASSIGNED', 'IN_PROGRESS'],
        },
      },
      select: { id: true, bookingReference: true },
    });

    if (conflicting) {
      throw new Error(
        `VEHICLE_SCHEDULING_CONFLICT: Vehicle '${vehicle.vehicleModel}' is already reserved on this date (${conflicting.bookingReference}).`
      );
    }

    return vehicle;
  }
}

export const heritageTourVehicleOptionService = new HeritageTourVehicleOptionService();
