import { prisma } from '../../core/database/prisma';
import { DriverAvailabilityStatus, DriverVerificationStatus, VehicleType } from '@prisma/client';

export interface PublicVehicleDto {
  plateNumber: string;
  vehicleModel: string;
  vehicleColor: string;
  vehicleType: VehicleType;
  seatingCapacity: number;
}

export interface PublicSubcityDto {
  id: string;
  name: string;
  slug: string;
  isPrimary: boolean;
}

export interface PublicDriverDto {
  id: string;
  fullName: string;
  profileImage: string | null;
  rating: number;
  totalTrips: number;
  availabilityStatus: DriverAvailabilityStatus;
  vehicle: PublicVehicleDto | null;
  subcities: PublicSubcityDto[];
}

export class DriverService {
  /**
   * Passenger Driver Discovery: Retrieves eligible and available drivers for a subcity.
   * Strips all private contact info (phone, email, credentials) before returning.
   */
  async getAvailableDriversBySubcity(subcityId?: string): Promise<PublicDriverDto[]> {
    const whereClause: any = {
      verificationStatus: DriverVerificationStatus.APPROVED,
      availabilityStatus: {
        in: [DriverAvailabilityStatus.AVAILABLE, DriverAvailabilityStatus.ONLINE],
      },
    };

    if (subcityId) {
      whereClause.subcities = {
        some: { subcityId },
      };
    }

    const drivers = await prisma.driver.findMany({
      where: whereClause,
      include: {
        vehicles: {
          where: { isActive: true, verificationStatus: 'VERIFIED' },
          take: 1,
        },
        subcities: {
          include: {
            subcity: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
      orderBy: [{ rating: 'desc' }, { totalTrips: 'desc' }],
      take: 50,
    });

    return drivers.map((d) => ({
      id: d.id,
      fullName: d.fullName,
      profileImage: d.profileImage,
      rating: d.rating,
      totalTrips: d.totalTrips,
      availabilityStatus: d.availabilityStatus,
      vehicle: d.vehicles[0]
        ? {
            plateNumber: d.vehicles[0].plateNumber,
            vehicleModel: d.vehicles[0].vehicleModel,
            vehicleColor: d.vehicles[0].vehicleColor,
            vehicleType: d.vehicles[0].vehicleType,
            seatingCapacity: d.vehicles[0].seatingCapacity,
          }
        : null,
      subcities: d.subcities.map((s) => ({
        id: s.subcity.id,
        name: s.subcity.name,
        slug: s.subcity.slug,
        isPrimary: s.isPrimary,
      })),
    }));
  }

  /**
   * Get public driver profile by driver ID (Safe for passengers)
   */
  async getPublicDriverById(driverId: string): Promise<PublicDriverDto | null> {
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      include: {
        vehicles: {
          where: { isActive: true, verificationStatus: 'VERIFIED' },
          take: 1,
        },
        subcities: {
          include: {
            subcity: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
    });

    if (!driver || driver.verificationStatus !== DriverVerificationStatus.APPROVED) {
      return null;
    }

    return {
      id: driver.id,
      fullName: driver.fullName,
      profileImage: driver.profileImage,
      rating: driver.rating,
      totalTrips: driver.totalTrips,
      availabilityStatus: driver.availabilityStatus,
      vehicle: driver.vehicles[0]
        ? {
            plateNumber: driver.vehicles[0].plateNumber,
            vehicleModel: driver.vehicles[0].vehicleModel,
            vehicleColor: driver.vehicles[0].vehicleColor,
            vehicleType: driver.vehicles[0].vehicleType,
            seatingCapacity: driver.vehicles[0].seatingCapacity,
          }
        : null,
      subcities: driver.subcities.map((s) => ({
        id: s.subcity.id,
        name: s.subcity.name,
        slug: s.subcity.slug,
        isPrimary: s.isPrimary,
      })),
    };
  }

  /**
   * Update driver availability status (Authenticated Driver / Admin)
   */
  async updateAvailability(driverId: string, status: DriverAvailabilityStatus) {
    return prisma.driver.update({
      where: { id: driverId },
      data: { availabilityStatus: status },
      select: {
        id: true,
        fullName: true,
        availabilityStatus: true,
      },
    });
  }

  /**
   * Update driver telematics ping (lat/lon)
   */
  async updateLocation(driverId: string, latitude: number, longitude: number) {
    return prisma.driver.update({
      where: { id: driverId },
      data: {
        currentLatitude: latitude,
        currentLongitude: longitude,
        lastLocationUpdate: new Date(),
      },
      select: {
        id: true,
        currentLatitude: true,
        currentLongitude: true,
        lastLocationUpdate: true,
      },
    });
  }
}

export const driverService = new DriverService();
