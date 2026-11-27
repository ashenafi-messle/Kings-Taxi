import crypto from 'crypto';
import {
  AccountStatus,
  ActorType,
  BookingServiceType,
  BookingStatus,
  CancellationActor,
  DriverAvailabilityStatus,
  DriverVerificationStatus,
  TripStatus,
} from '@prisma/client';
import { prisma } from '../../core/database/prisma';
import { AppError } from '../../core/errors/appError';
import { logger } from '../../core/logging/logger';
import { normalizeEthiopianPhone } from '../../utils/phone';
import {
  ACTIVE_RIDE_BOOKING_STATUSES,
  emitAvailabilityChanged,
  emitToDriver,
  emitToPassenger,
  isDriverSocketActive,
} from '../realtime/rideSocket';
import { STALE_DRIVER_HEARTBEAT_MS } from '../drivers/driver.service';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const RIDE_REQUEST_TTL_SECONDS = Math.max(
  30,
  Number(process.env.RIDE_REQUEST_TTL_SECONDS) || 90
);

export interface CreateRideRequestInput {
  driverId: string;
  subcityId: string;
  contactPhone: string;
  pickupLocation?: string;
  destinationLocation?: string;
  pickupLatitude?: number;
  pickupLongitude?: number;
  destinationLatitude?: number;
  destinationLongitude?: number;
  additionalInstructions?: string;
}

export class RideRequestService {
  private formatRequestDto(booking: any) {
    return {
      id: booking.id,
      bookingReference: booking.bookingReference,
      status: booking.bookingStatus,
      passengerId: booking.passengerId,
      driverId: booking.driverId,
      subcityId: booking.subcityId,
      subcityName: booking.subcity?.name || null,
      passengerName: booking.passenger?.fullName || 'Passenger',
      passengerAvatar: booking.passenger?.profileImage || null,
      passengerContactPhone: booking.passengerContactPhone,
      driverName: booking.driver?.fullName || null,
      driverAvatar: booking.driver?.profileImage || null,
      driverRating: booking.driver?.rating ?? null,
      vehicle: booking.vehicle
        ? {
            plateNumber: booking.vehicle.plateNumber,
            make: booking.vehicle.make,
            model: booking.vehicle.vehicleModel,
            color: booking.vehicle.vehicleColor,
            vehicleType: booking.vehicle.vehicleType,
          }
        : null,
      pickupLocation: booking.pickupLocation,
      destinationLocation: booking.destinationLocation,
      additionalInstructions: booking.additionalInstructions || null,
      createdAt: booking.createdAt.toISOString(),
      expiresAt: booking.expiresAt ? booking.expiresAt.toISOString() : null,
      acceptedAt: booking.acceptedAt ? booking.acceptedAt.toISOString() : null,
      rejectedAt: booking.rejectedAt ? booking.rejectedAt.toISOString() : null,
      cancelledAt: booking.cancelledAt ? booking.cancelledAt.toISOString() : null,
      cancellationReason: booking.cancellationReason || null,
      rejectionReason: booking.rejectionReason || null,
    };
  }

  private async releaseDriverIfEligibleTx(tx: any, driverId: string): Promise<string | null> {
    const otherActive = await tx.booking.count({
      where: {
        driverId,
        bookingStatus: { in: ACTIVE_RIDE_BOOKING_STATUSES },
      },
    });
    if (otherActive > 0) return null;

    const driver = await tx.driver.findFirst({
      where: { id: driverId, deletedAt: null },
      select: {
        id: true,
        accountStatus: true,
        verificationStatus: true,
        availabilityStatus: true,
        isSocketConnected: true,
        lastHeartbeatAt: true,
      },
    });

    if (
      !driver ||
      driver.accountStatus !== AccountStatus.ACTIVE ||
      driver.verificationStatus !== DriverVerificationStatus.APPROVED ||
      driver.availabilityStatus === DriverAvailabilityStatus.OFFLINE
    ) {
      return null;
    }

    const staleCutoff = Date.now() - STALE_DRIVER_HEARTBEAT_MS;
    const isHealthy =
      driver.isSocketConnected ||
      isDriverSocketActive(driver.id) ||
      (driver.lastHeartbeatAt && driver.lastHeartbeatAt.getTime() >= staleCutoff);

    const nextStatus = isHealthy
      ? DriverAvailabilityStatus.AVAILABLE
      : DriverAvailabilityStatus.OFFLINE;

    await tx.driver.update({
      where: { id: driver.id },
      data: { availabilityStatus: nextStatus },
    });

    return nextStatus;
  }

  /**
   * Transactional passenger ride request creation + atomic driver reservation.
   */
  async createRideRequest(passengerId: string, input: CreateRideRequestInput) {
    if (!UUID_REGEX.test(input.driverId || '') || !UUID_REGEX.test(input.subcityId || '')) {
      throw new AppError('Valid driverId and subcityId are required.', 400, 'VALIDATION_ERROR');
    }

    const phoneRes = normalizeEthiopianPhone(input.contactPhone);
    if (!phoneRes.isValid) {
      throw new AppError(
        'Please provide a valid Ethiopian contact phone number (+251 9XXXXXXXX or 09XXXXXXXX).',
        400,
        'INVALID_PHONE'
      );
    }

    const [passenger, subcity] = await Promise.all([
      prisma.passenger.findFirst({
        where: { id: passengerId, deletedAt: null },
        select: { id: true, fullName: true, accountStatus: true },
      }),
      prisma.subcity.findFirst({
        where: { id: input.subcityId, isActive: true },
      }),
    ]);

    if (!passenger || passenger.accountStatus !== AccountStatus.ACTIVE) {
      throw new AppError('Your passenger account is not eligible to request rides.', 403, 'PASSENGER_NOT_ELIGIBLE');
    }
    if (!subcity) {
      throw new AppError('Selected subcity was not found or is inactive.', 404, 'SUBCITY_NOT_FOUND');
    }

    const existingPassengerActive = await prisma.booking.findFirst({
      where: {
        passengerId,
        bookingStatus: { in: [BookingStatus.REQUESTED, BookingStatus.DRIVER_ASSIGNED] },
      },
      select: { id: true },
    });
    if (existingPassengerActive) {
      throw new AppError(
        'You already have an active ride request. Cancel or complete it before creating another.',
        409,
        'PASSENGER_ACTIVE_REQUEST_EXISTS'
      );
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + RIDE_REQUEST_TTL_SECONDS * 1000);
    const staleCutoff = new Date(now.getTime() - STALE_DRIVER_HEARTBEAT_MS);
    const bookingReference = `KT-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

    const created = await prisma.$transaction(async (tx) => {
      // Atomic conditional reservation on the driver row
      const reserved = await tx.driver.updateMany({
        where: {
          id: input.driverId,
          deletedAt: null,
          accountStatus: AccountStatus.ACTIVE,
          verificationStatus: DriverVerificationStatus.APPROVED,
          availabilityStatus: {
            in: [DriverAvailabilityStatus.AVAILABLE, DriverAvailabilityStatus.ONLINE],
          },
          AND: [
            {
              OR: [
                { primarySubcityId: input.subcityId },
                { subcities: { some: { subcityId: input.subcityId } } },
              ],
            },
            {
              OR: [
                { isSocketConnected: true },
                { lastHeartbeatAt: { gte: staleCutoff } },
              ],
            },
          ],
          assignedBookings: {
            none: {
              bookingStatus: { in: ACTIVE_RIDE_BOOKING_STATUSES },
            },
          },
        },
        data: {
          availabilityStatus: DriverAvailabilityStatus.BUSY,
        },
      });

      if (reserved.count === 0) {
        const driverCheck = await tx.driver.findFirst({
          where: { id: input.driverId, deletedAt: null },
          select: {
            id: true,
            accountStatus: true,
            verificationStatus: true,
            availabilityStatus: true,
          },
        });
        if (!driverCheck) {
          throw new AppError('Selected driver was not found.', 404, 'DRIVER_NOT_FOUND');
        }
        if (
          driverCheck.accountStatus !== AccountStatus.ACTIVE ||
          driverCheck.verificationStatus !== DriverVerificationStatus.APPROVED
        ) {
          throw new AppError('Selected driver is not approved or active.', 409, 'DRIVER_NOT_ELIGIBLE');
        }
        throw new AppError(
          'Selected driver is no longer available. Please choose another driver.',
          409,
          'DRIVER_UNAVAILABLE'
        );
      }

      const vehicle = await tx.vehicle.findFirst({
        where: {
          driverId: input.driverId,
          isActive: true,
          verificationStatus: 'VERIFIED',
        },
        select: { id: true },
      });
      if (!vehicle) {
        throw new AppError('Selected driver has no active verified vehicle.', 400, 'NO_ACTIVE_VEHICLE');
      }

      const booking = await tx.booking.create({
        data: {
          bookingReference,
          passengerId,
          driverId: input.driverId,
          vehicleId: vehicle.id,
          subcityId: subcity.id,
          serviceType: BookingServiceType.RIDE_HAILING,
          bookingStatus: BookingStatus.REQUESTED,
          passengerContactPhone: phoneRes.normalized,
          pickupLocation: (input.pickupLocation || `${subcity.name}, ${subcity.city}`).slice(0, 255),
          destinationLocation: (input.destinationLocation || 'On-Demand Ride').slice(0, 255),
          pickupLatitude: input.pickupLatitude ?? subcity.centerLatitude,
          pickupLongitude: input.pickupLongitude ?? subcity.centerLongitude,
          destinationLatitude: input.destinationLatitude ?? subcity.centerLatitude,
          destinationLongitude: input.destinationLongitude ?? subcity.centerLongitude,
          estimatedFare: 0,
          currency: 'ETB',
          expiresAt,
          additionalInstructions: input.additionalInstructions?.trim().slice(0, 500) || null,
        },
        include: {
          passenger: { select: { id: true, fullName: true, profileImage: true } },
          driver: { select: { id: true, fullName: true, profileImage: true, rating: true } },
          vehicle: { select: { plateNumber: true, make: true, vehicleModel: true, vehicleColor: true, vehicleType: true } },
          subcity: { select: { id: true, name: true, slug: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          passengerId,
          driverId: input.driverId,
          actorId: passengerId,
          actorType: ActorType.PASSENGER,
          action: 'RIDE_REQUEST_CREATED',
          entityType: 'Booking',
          entityId: booking.id,
          metadata: {
            bookingReference,
            subcityId: subcity.id,
            expiresAt: expiresAt.toISOString(),
          },
        },
      });

      return booking;
    });

    const dto = this.formatRequestDto(created);

    // Emit real-time events after commit (non-blocking if socket is offline)
    emitToDriver(input.driverId, 'ride:request:new', dto);
    emitToPassenger(passengerId, 'ride:request:created', dto);
    emitAvailabilityChanged({
      driverId: input.driverId,
      availabilityStatus: DriverAvailabilityStatus.BUSY,
      subcityIds: [subcity.id],
    });

    return dto;
  }

  /**
   * Driver accepts a pending ride request transactionally.
   */
  async acceptRideRequest(driverId: string, requestId: string) {
    if (!UUID_REGEX.test(requestId || '')) {
      throw new AppError('Invalid ride request identifier.', 400, 'VALIDATION_ERROR');
    }

    const now = new Date();
    const updated = await prisma.$transaction(async (tx) => {
      const driver = await tx.driver.findFirst({
        where: { id: driverId, deletedAt: null },
        select: { id: true, accountStatus: true, verificationStatus: true },
      });
      if (
        !driver ||
        driver.accountStatus !== AccountStatus.ACTIVE ||
        driver.verificationStatus !== DriverVerificationStatus.APPROVED
      ) {
        throw new AppError('Driver account is not eligible to accept rides.', 403, 'DRIVER_NOT_ELIGIBLE');
      }

      const existing = await tx.booking.findUnique({
        where: { id: requestId },
        select: { id: true, driverId: true, bookingStatus: true, expiresAt: true, vehicleId: true },
      });
      if (!existing) {
        throw new AppError('Ride request not found.', 404, 'REQUEST_NOT_FOUND');
      }
      if (existing.driverId !== driverId) {
        throw new AppError('You are not authorized to accept this ride request.', 403, 'FORBIDDEN');
      }
      if (existing.bookingStatus === BookingStatus.EXPIRED || (existing.expiresAt && existing.expiresAt <= now)) {
        throw new AppError('This ride request has expired.', 409, 'REQUEST_EXPIRED');
      }
      if (existing.bookingStatus !== BookingStatus.REQUESTED) {
        throw new AppError(
          `Ride request cannot be accepted in status ${existing.bookingStatus}.`,
          409,
          'REQUEST_CONFLICT'
        );
      }

      const res = await tx.booking.updateMany({
        where: {
          id: requestId,
          driverId,
          bookingStatus: BookingStatus.REQUESTED,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        data: {
          bookingStatus: BookingStatus.DRIVER_ASSIGNED,
          acceptedAt: now,
        },
      });

      if (res.count === 0) {
        throw new AppError('Ride request is no longer pending.', 409, 'REQUEST_CONFLICT');
      }

      await tx.driver.update({
        where: { id: driverId },
        data: { availabilityStatus: DriverAvailabilityStatus.BUSY },
      });

      if (existing.vehicleId) {
        await tx.trip.upsert({
          where: { bookingId: requestId },
          create: {
            bookingId: requestId,
            driverId,
            vehicleId: existing.vehicleId,
            tripStatus: TripStatus.ACCEPTED,
          },
          update: {
            tripStatus: TripStatus.ACCEPTED,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          driverId,
          actorId: driverId,
          actorType: ActorType.DRIVER,
          action: 'RIDE_REQUEST_ACCEPTED',
          entityType: 'Booking',
          entityId: requestId,
          metadata: {},
        },
      });

      return tx.booking.findUnique({
        where: { id: requestId },
        include: {
          passenger: { select: { id: true, fullName: true, profileImage: true } },
          driver: { select: { id: true, fullName: true, profileImage: true, rating: true } },
          vehicle: { select: { plateNumber: true, make: true, vehicleModel: true, vehicleColor: true, vehicleType: true } },
          subcity: { select: { id: true, name: true, slug: true } },
        },
      });
    });

    const dto = this.formatRequestDto(updated);
    emitToPassenger(dto.passengerId, 'ride:request:accepted', dto);
    emitToDriver(driverId, 'ride:request:accepted', dto);
    return dto;
  }

  /**
   * Driver rejects a pending ride request and releases reservation if eligible.
   */
  async rejectRideRequest(driverId: string, requestId: string, reason?: string) {
    if (!UUID_REGEX.test(requestId || '')) {
      throw new AppError('Invalid ride request identifier.', 400, 'VALIDATION_ERROR');
    }

    const now = new Date();
    const { booking, nextDriverStatus } = await prisma.$transaction(async (tx) => {
      const existing = await tx.booking.findUnique({
        where: { id: requestId },
        select: { id: true, driverId: true, passengerId: true, bookingStatus: true, subcityId: true },
      });
      if (!existing) {
        throw new AppError('Ride request not found.', 404, 'REQUEST_NOT_FOUND');
      }
      if (existing.driverId !== driverId) {
        throw new AppError('You are not authorized to reject this ride request.', 403, 'FORBIDDEN');
      }
      if (existing.bookingStatus !== BookingStatus.REQUESTED) {
        throw new AppError(
          `Ride request cannot be rejected in status ${existing.bookingStatus}.`,
          409,
          'REQUEST_CONFLICT'
        );
      }

      const res = await tx.booking.updateMany({
        where: { id: requestId, driverId, bookingStatus: BookingStatus.REQUESTED },
        data: {
          bookingStatus: BookingStatus.REJECTED,
          rejectedAt: now,
          rejectionReason: (reason || 'Rejected by driver').slice(0, 255),
        },
      });
      if (res.count === 0) {
        throw new AppError('Ride request is no longer pending.', 409, 'REQUEST_CONFLICT');
      }

      const nextStatus = await this.releaseDriverIfEligibleTx(tx, driverId);

      await tx.auditLog.create({
        data: {
          driverId,
          passengerId: existing.passengerId,
          actorId: driverId,
          actorType: ActorType.DRIVER,
          action: 'RIDE_REQUEST_REJECTED',
          entityType: 'Booking',
          entityId: requestId,
          metadata: { reason: reason || null },
        },
      });

      const full = await tx.booking.findUnique({
        where: { id: requestId },
        include: {
          passenger: { select: { id: true, fullName: true, profileImage: true } },
          driver: { select: { id: true, fullName: true, profileImage: true, rating: true } },
          vehicle: { select: { plateNumber: true, make: true, vehicleModel: true, vehicleColor: true, vehicleType: true } },
          subcity: { select: { id: true, name: true, slug: true } },
        },
      });

      return { booking: full, nextDriverStatus: nextStatus };
    });

    const dto = this.formatRequestDto(booking);
    emitToPassenger(dto.passengerId, 'ride:request:rejected', dto);
    emitToDriver(driverId, 'ride:request:rejected', dto);
    if (nextDriverStatus) {
      emitAvailabilityChanged({
        driverId,
        availabilityStatus: nextDriverStatus,
        subcityIds: dto.subcityId ? [dto.subcityId] : [],
      });
    }
    return dto;
  }

  /**
   * Passenger cancels their own pending or accepted ride request.
   */
  async cancelRideRequest(passengerId: string, requestId: string, reason?: string) {
    if (!UUID_REGEX.test(requestId || '')) {
      throw new AppError('Invalid ride request identifier.', 400, 'VALIDATION_ERROR');
    }

    const now = new Date();
    const { booking, nextDriverStatus } = await prisma.$transaction(async (tx) => {
      const existing = await tx.booking.findUnique({
        where: { id: requestId },
        select: { id: true, passengerId: true, driverId: true, bookingStatus: true },
      });
      if (!existing) {
        throw new AppError('Ride request not found.', 404, 'REQUEST_NOT_FOUND');
      }
      if (existing.passengerId !== passengerId) {
        throw new AppError('You are not authorized to cancel this ride request.', 403, 'FORBIDDEN');
      }
      if (
        existing.bookingStatus !== BookingStatus.REQUESTED &&
        existing.bookingStatus !== BookingStatus.DRIVER_ASSIGNED
      ) {
        throw new AppError(
          `Ride request cannot be cancelled in status ${existing.bookingStatus}.`,
          409,
          'REQUEST_CONFLICT'
        );
      }

      const res = await tx.booking.updateMany({
        where: {
          id: requestId,
          passengerId,
          bookingStatus: { in: [BookingStatus.REQUESTED, BookingStatus.DRIVER_ASSIGNED] },
        },
        data: {
          bookingStatus: BookingStatus.CANCELLED,
          cancelledAt: now,
          cancelledBy: CancellationActor.PASSENGER,
          cancellationReason: (reason || 'Cancelled by passenger').slice(0, 255),
        },
      });
      if (res.count === 0) {
        throw new AppError('Ride request could not be cancelled.', 409, 'REQUEST_CONFLICT');
      }

      let nextStatus: string | null = null;
      if (existing.driverId) {
        nextStatus = await this.releaseDriverIfEligibleTx(tx, existing.driverId);
      }

      await tx.auditLog.create({
        data: {
          passengerId,
          driverId: existing.driverId,
          actorId: passengerId,
          actorType: ActorType.PASSENGER,
          action: 'RIDE_REQUEST_CANCELLED',
          entityType: 'Booking',
          entityId: requestId,
          metadata: { reason: reason || null },
        },
      });

      const full = await tx.booking.findUnique({
        where: { id: requestId },
        include: {
          passenger: { select: { id: true, fullName: true, profileImage: true } },
          driver: { select: { id: true, fullName: true, profileImage: true, rating: true } },
          vehicle: { select: { plateNumber: true, make: true, vehicleModel: true, vehicleColor: true, vehicleType: true } },
          subcity: { select: { id: true, name: true, slug: true } },
        },
      });

      return { booking: full, nextDriverStatus: nextStatus };
    });

    const dto = this.formatRequestDto(booking);
    emitToPassenger(passengerId, 'ride:request:cancelled', dto);
    if (dto.driverId) {
      emitToDriver(dto.driverId, 'ride:request:cancelled', dto);
      if (nextDriverStatus) {
        emitAvailabilityChanged({
          driverId: dto.driverId,
          availabilityStatus: nextDriverStatus,
          subcityIds: dto.subcityId ? [dto.subcityId] : [],
        });
      }
    }
    return dto;
  }

  async getDriverPendingRequests(driverId: string) {
    const now = new Date();
    const list = await prisma.booking.findMany({
      where: {
        driverId,
        bookingStatus: BookingStatus.REQUESTED,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      include: {
        passenger: { select: { id: true, fullName: true, profileImage: true } },
        driver: { select: { id: true, fullName: true, profileImage: true, rating: true } },
        vehicle: { select: { plateNumber: true, make: true, vehicleModel: true, vehicleColor: true, vehicleType: true } },
        subcity: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return list.map((b) => this.formatRequestDto(b));
  }

  async getDriverCurrentRequest(driverId: string) {
    const now = new Date();
    const current = await prisma.booking.findFirst({
      where: {
        driverId,
        OR: [
          {
            bookingStatus: BookingStatus.REQUESTED,
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
          { bookingStatus: BookingStatus.DRIVER_ASSIGNED },
        ],
      },
      include: {
        passenger: { select: { id: true, fullName: true, profileImage: true } },
        driver: { select: { id: true, fullName: true, profileImage: true, rating: true } },
        vehicle: { select: { plateNumber: true, make: true, vehicleModel: true, vehicleColor: true, vehicleType: true } },
        subcity: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return current ? this.formatRequestDto(current) : null;
  }

  async getDriverRequestHistory(driverId: string, page = 1, limit = 20) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));
    const skip = (safePage - 1) * safeLimit;
    const where = {
      driverId,
      bookingStatus: {
        in: [
          BookingStatus.DRIVER_ASSIGNED,
          BookingStatus.TRIP_COMPLETED,
          BookingStatus.CANCELLED,
          BookingStatus.REJECTED,
          BookingStatus.EXPIRED,
        ],
      },
    };

    const [total, rows] = await Promise.all([
      prisma.booking.count({ where }),
      prisma.booking.findMany({
        where,
        include: {
          passenger: { select: { id: true, fullName: true, profileImage: true } },
          driver: { select: { id: true, fullName: true, profileImage: true, rating: true } },
          vehicle: { select: { plateNumber: true, make: true, vehicleModel: true, vehicleColor: true, vehicleType: true } },
          subcity: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
      }),
    ]);

    return {
      items: rows.map((b) => this.formatRequestDto(b)),
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit) || 1,
    };
  }

  async getPassengerCurrentRequest(passengerId: string) {
    const current = await prisma.booking.findFirst({
      where: {
        passengerId,
        bookingStatus: { in: [BookingStatus.REQUESTED, BookingStatus.DRIVER_ASSIGNED] },
      },
      include: {
        passenger: { select: { id: true, fullName: true, profileImage: true } },
        driver: { select: { id: true, fullName: true, profileImage: true, rating: true } },
        vehicle: { select: { plateNumber: true, make: true, vehicleModel: true, vehicleColor: true, vehicleType: true } },
        subcity: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return current ? this.formatRequestDto(current) : null;
  }

  async getPassengerRequestById(passengerId: string, requestId: string) {
    if (!UUID_REGEX.test(requestId || '')) {
      throw new AppError('Invalid ride request identifier.', 400, 'VALIDATION_ERROR');
    }
    const booking = await prisma.booking.findFirst({
      where: { id: requestId, passengerId },
      include: {
        passenger: { select: { id: true, fullName: true, profileImage: true } },
        driver: { select: { id: true, fullName: true, profileImage: true, rating: true } },
        vehicle: { select: { plateNumber: true, make: true, vehicleModel: true, vehicleColor: true, vehicleType: true } },
        subcity: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!booking) {
      throw new AppError('Ride request not found.', 404, 'REQUEST_NOT_FOUND');
    }
    return this.formatRequestDto(booking);
  }

  /**
   * Idempotent batch expiration for pending ride requests past expiresAt.
   */
  async expirePendingRideRequests(): Promise<number> {
    const now = new Date();
    const expiredCandidates = await prisma.booking.findMany({
      where: {
        bookingStatus: BookingStatus.REQUESTED,
        expiresAt: { lte: now },
      },
      select: {
        id: true,
        passengerId: true,
        driverId: true,
        subcityId: true,
      },
      take: 50,
    });

    let expiredCount = 0;
    for (const candidate of expiredCandidates) {
      try {
        const result = await prisma.$transaction(async (tx) => {
          const upd = await tx.booking.updateMany({
            where: {
              id: candidate.id,
              bookingStatus: BookingStatus.REQUESTED,
            },
            data: {
              bookingStatus: BookingStatus.EXPIRED,
            },
          });
          if (upd.count === 0) return null;

          let nextStatus: string | null = null;
          if (candidate.driverId) {
            nextStatus = await this.releaseDriverIfEligibleTx(tx, candidate.driverId);
          }

          await tx.auditLog.create({
            data: {
              passengerId: candidate.passengerId,
              driverId: candidate.driverId,
              actorType: ActorType.SYSTEM,
              action: 'RIDE_REQUEST_EXPIRED',
              entityType: 'Booking',
              entityId: candidate.id,
              metadata: {},
            },
          });

          return { nextStatus };
        });

        if (result) {
          expiredCount++;
          const payload = { id: candidate.id, status: BookingStatus.EXPIRED };
          emitToPassenger(candidate.passengerId, 'ride:request:expired', payload);
          if (candidate.driverId) {
            emitToDriver(candidate.driverId, 'ride:request:expired', payload);
            if (result.nextStatus) {
              emitAvailabilityChanged({
                driverId: candidate.driverId,
                availabilityStatus: result.nextStatus,
                subcityIds: candidate.subcityId ? [candidate.subcityId] : [],
              });
            }
          }
        }
      } catch (err: any) {
        logger.warn({ id: candidate.id, err: err?.message }, '[RideRequestService] Failed expiring request');
      }
    }

    return expiredCount;
  }

  /**
   * Reconciles disconnected/stale drivers back to OFFLINE without cancelling accepted rides.
   */
  async reconcileStaleDrivers(): Promise<number> {
    const staleCutoff = new Date(Date.now() - STALE_DRIVER_HEARTBEAT_MS);
    const staleDrivers = await prisma.driver.findMany({
      where: {
        deletedAt: null,
        availabilityStatus: {
          in: [DriverAvailabilityStatus.AVAILABLE, DriverAvailabilityStatus.ONLINE],
        },
        isSocketConnected: false,
        OR: [{ lastHeartbeatAt: null }, { lastHeartbeatAt: { lt: staleCutoff } }],
        assignedBookings: {
          none: { bookingStatus: { in: ACTIVE_RIDE_BOOKING_STATUSES } },
        },
      },
      select: { id: true },
      take: 50,
    });

    if (staleDrivers.length === 0) return 0;

    const ids = staleDrivers.map((d) => d.id);
    const updated = await prisma.driver.updateMany({
      where: {
        id: { in: ids },
        isSocketConnected: false,
        availabilityStatus: {
          in: [DriverAvailabilityStatus.AVAILABLE, DriverAvailabilityStatus.ONLINE],
        },
      },
      data: {
        availabilityStatus: DriverAvailabilityStatus.OFFLINE,
      },
    });

    for (const id of ids) {
      emitAvailabilityChanged({
        driverId: id,
        availabilityStatus: DriverAvailabilityStatus.OFFLINE,
      });
    }

    return updated.count;
  }
}

export const rideRequestService = new RideRequestService();
