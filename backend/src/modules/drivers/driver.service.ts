import { prisma } from '../../core/database/prisma';
import {
  AccountStatus,
  ActorType,
  BookingStatus,
  DriverAvailabilityStatus,
  DriverVerificationStatus,
  VehicleType,
} from '@prisma/client';
import { AppError } from '../../core/errors/appError';
import { auditService } from '../../core/audit/audit.service';
import {
  ACTIVE_RIDE_BOOKING_STATUSES,
  emitAvailabilityChanged,
  isDriverSocketActive,
} from '../realtime/rideSocket';

export const STALE_DRIVER_HEARTBEAT_MS = 90_000;

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
   * Passenger Driver Discovery: Retrieves eligible, online, healthy-connection,
   * unreserved drivers for a subcity. Strips all private contact & auth fields.
   */
  async getAvailableDriversBySubcity(subcityId?: string, limit = 30): Promise<PublicDriverDto[]> {
    const staleCutoff = new Date(Date.now() - STALE_DRIVER_HEARTBEAT_MS);
    const safeLimit = Math.min(50, Math.max(1, Number(limit) || 30));

    const whereClause: any = {
      deletedAt: null,
      accountStatus: AccountStatus.ACTIVE,
      verificationStatus: DriverVerificationStatus.APPROVED,
      availabilityStatus: {
        in: [DriverAvailabilityStatus.AVAILABLE, DriverAvailabilityStatus.ONLINE],
      },
      vehicles: {
        some: {
          isActive: true,
          verificationStatus: { not: 'REJECTED' },
          status: { in: ['AVAILABLE', 'ACTIVE', 'ASSIGNED'] },
        },
      },
      assignedBookings: {
        none: {
          bookingStatus: { in: ACTIVE_RIDE_BOOKING_STATUSES },
        },
      },
      OR: [
        { isSocketConnected: true },
        { lastHeartbeatAt: { gte: staleCutoff } },
      ],
    };

    if (subcityId) {
      whereClause.AND = [
        {
          OR: [
            { primarySubcityId: subcityId },
            { subcities: { some: { subcityId } } },
          ],
        },
      ];
    }

    const drivers = await prisma.driver.findMany({
      where: whereClause,
      select: {
        id: true,
        fullName: true,
        profileImage: true,
        rating: true,
        totalTrips: true,
        availabilityStatus: true,
        vehicles: {
          where: { isActive: true, verificationStatus: { not: 'REJECTED' } },
          select: {
            plateNumber: true,
            vehicleModel: true,
            vehicleColor: true,
            vehicleType: true,
            seatingCapacity: true,
          },
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
      take: safeLimit,
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
    const driver = await prisma.driver.findFirst({
      where: {
        id: driverId,
        deletedAt: null,
        accountStatus: AccountStatus.ACTIVE,
        verificationStatus: DriverVerificationStatus.APPROVED,
      },
      select: {
        id: true,
        fullName: true,
        profileImage: true,
        rating: true,
        totalTrips: true,
        availabilityStatus: true,
        vehicles: {
          where: { isActive: true, verificationStatus: { not: 'REJECTED' } },
          select: {
            plateNumber: true,
            vehicleModel: true,
            vehicleColor: true,
            vehicleType: true,
            seatingCapacity: true,
          },
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

    if (!driver) {
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
   * Authoritative Driver Go-Online transition.
   */
  async goOnline(driverId: string) {
    const now = new Date();
    const result = await prisma.$transaction(async (tx) => {
      const driver = await tx.driver.findFirst({
        where: { id: driverId, deletedAt: null },
        include: {
          vehicles: {
            where: {
              isActive: true,
              verificationStatus: { not: 'REJECTED' },
              status: { in: ['AVAILABLE', 'ACTIVE', 'ASSIGNED'] },
            },
            take: 1,
          },
          vehicleAssignments: {
            where: {
              isActive: true,
              vehicle: {
                isActive: true,
                verificationStatus: { not: 'REJECTED' },
                status: { in: ['AVAILABLE', 'ACTIVE', 'ASSIGNED'] },
              },
            },
            include: { vehicle: true },
            take: 1,
          },
          subcities: { select: { subcityId: true } },
          assignedBookings: {
            where: { bookingStatus: { in: ACTIVE_RIDE_BOOKING_STATUSES } },
            take: 1,
          },
        },
      });

      if (!driver) {
        throw new AppError('Driver account not found.', 404, 'DRIVER_NOT_FOUND');
      }
      if (driver.accountStatus === AccountStatus.SUSPENDED || driver.verificationStatus === DriverVerificationStatus.SUSPENDED) {
        throw new AppError('Your driver account is suspended.', 403, 'ACCOUNT_SUSPENDED');
      }
      if (driver.accountStatus !== AccountStatus.ACTIVE || driver.verificationStatus !== DriverVerificationStatus.APPROVED) {
        throw new AppError('Your driver account must be approved and active before going online.', 403, 'DRIVER_NOT_ELIGIBLE');
      }
      if (!driver.vehicles.length && !driver.vehicleAssignments.length) {
        throw new AppError('An active verified vehicle assignment is required before going online.', 400, 'NO_ACTIVE_VEHICLE');
      }
      if (!driver.primarySubcityId && !driver.subcities.length) {
        throw new AppError('No operating subcity assigned. Contact administration.', 400, 'NO_SUBCITY_ASSIGNED');
      }
      if (driver.assignedBookings.length > 0) {
        throw new AppError(
          'Cannot go available while you have an active or pending ride request.',
          409,
          'ACTIVE_RIDE_CONFLICT'
        );
      }

      const updated = await tx.driver.update({
        where: { id: driver.id },
        data: {
          availabilityStatus: DriverAvailabilityStatus.AVAILABLE,
          lastHeartbeatAt: now,
          ...(isDriverSocketActive(driver.id) ? { isSocketConnected: true } : {}),
        },
        select: {
          id: true,
          fullName: true,
          availabilityStatus: true,
          isSocketConnected: true,
          lastHeartbeatAt: true,
        },
      });

      await tx.driverStatusHistory.create({
        data: {
          driverId: driver.id,
          statusType: 'AVAILABILITY',
          fromStatus: driver.availabilityStatus,
          toStatus: DriverAvailabilityStatus.AVAILABLE,
          reason: 'Driver switched online',
          changedBy: driver.id,
        },
      });

      const subcityIds = Array.from(
        new Set([
          ...(driver.primarySubcityId ? [driver.primarySubcityId] : []),
          ...driver.subcities.map((s) => s.subcityId),
        ])
      );

      return { updated, subcityIds };
    });

    await auditService.record({
      actorId: driverId,
      actorType: ActorType.DRIVER,
      action: 'DRIVER_WENT_ONLINE',
      entityType: 'DRIVER',
      entityId: driverId,
      metadata: { subcityIds: result.subcityIds },
    });

    emitAvailabilityChanged({
      driverId,
      availabilityStatus: result.updated.availabilityStatus,
      subcityIds: result.subcityIds,
    });

    return result.updated;
  }

  /**
   * Authoritative Driver Go-Offline transition (preserves accepted/active rides).
   */
  async goOffline(driverId: string) {
    const result = await prisma.$transaction(async (tx) => {
      const driver = await tx.driver.findFirst({
        where: { id: driverId, deletedAt: null },
        include: {
          subcities: { select: { subcityId: true } },
        },
      });

      if (!driver) {
        throw new AppError('Driver account not found.', 404, 'DRIVER_NOT_FOUND');
      }

      const updated = await tx.driver.update({
        where: { id: driver.id },
        data: {
          availabilityStatus: DriverAvailabilityStatus.OFFLINE,
        },
        select: {
          id: true,
          fullName: true,
          availabilityStatus: true,
          isSocketConnected: true,
          lastHeartbeatAt: true,
        },
      });

      await tx.driverStatusHistory.create({
        data: {
          driverId: driver.id,
          statusType: 'AVAILABILITY',
          fromStatus: driver.availabilityStatus,
          toStatus: DriverAvailabilityStatus.OFFLINE,
          reason: 'Driver switched offline',
          changedBy: driver.id,
        },
      });

      const subcityIds = Array.from(
        new Set([
          ...(driver.primarySubcityId ? [driver.primarySubcityId] : []),
          ...driver.subcities.map((s) => s.subcityId),
        ])
      );

      return { updated, subcityIds };
    });

    await auditService.record({
      actorId: driverId,
      actorType: ActorType.DRIVER,
      action: 'DRIVER_WENT_OFFLINE',
      entityType: 'DRIVER',
      entityId: driverId,
      metadata: {},
    });

    emitAvailabilityChanged({
      driverId,
      availabilityStatus: result.updated.availabilityStatus,
      subcityIds: result.subcityIds,
    });

    return result.updated;
  }

  async getMyAvailability(driverId: string) {
    const driver = await prisma.driver.findFirst({
      where: { id: driverId, deletedAt: null },
      select: {
        id: true,
        fullName: true,
        availabilityStatus: true,
        accountStatus: true,
        verificationStatus: true,
        isSocketConnected: true,
        lastHeartbeatAt: true,
        primarySubcity: { select: { id: true, name: true, slug: true, city: true } },
        subcities: {
          include: { subcity: { select: { id: true, name: true, slug: true, city: true } } },
        },
        assignedBookings: {
          where: { bookingStatus: { in: [BookingStatus.REQUESTED, BookingStatus.DRIVER_ASSIGNED] } },
          select: { id: true, bookingReference: true, bookingStatus: true, expiresAt: true },
          take: 1,
        },
      },
    });

    if (!driver) {
      throw new AppError('Driver account not found.', 404, 'DRIVER_NOT_FOUND');
    }

    return {
      id: driver.id,
      availabilityStatus: driver.availabilityStatus,
      isOnline:
        driver.availabilityStatus === DriverAvailabilityStatus.AVAILABLE ||
        driver.availabilityStatus === DriverAvailabilityStatus.ONLINE,
      isSocketConnected: driver.isSocketConnected || isDriverSocketActive(driver.id),
      lastHeartbeatAt: driver.lastHeartbeatAt ? driver.lastHeartbeatAt.toISOString() : null,
      primarySubcity: driver.primarySubcity,
      subcities: driver.subcities.map((s) => ({ ...s.subcity, isPrimary: s.isPrimary })),
      activeRequest: driver.assignedBookings[0] || null,
    };
  }

  /**
   * Update driver availability status (Backwards-compatible wrapper)
   */
  async updateAvailability(driverId: string, status: DriverAvailabilityStatus) {
    if (status === DriverAvailabilityStatus.AVAILABLE || status === DriverAvailabilityStatus.ONLINE) {
      return this.goOnline(driverId);
    }
    if (status === DriverAvailabilityStatus.OFFLINE) {
      return this.goOffline(driverId);
    }
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
  async updateLocation(driverId: string, lat: number, lon: number) {
    return prisma.driver.update({
      where: { id: driverId },
      data: {
        currentLatitude: lat,
        currentLongitude: lon,
        lastLocationUpdate: new Date(),
        lastHeartbeatAt: new Date(),
      },
      select: {
        id: true,
        currentLatitude: true,
        currentLongitude: true,
      },
    });
  }
}

export const driverService = new DriverService();
