import { prisma } from '../../core/database/prisma';
import { BookingStatus, TripStatus, DriverAvailabilityStatus, DriverVerificationStatus, ActorType } from '@prisma/client';
import { fareService } from '../fares/fare.service';
import { logger } from '../../core/logging/logger';
import * as crypto from 'crypto';

export interface CreateRideDto {
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
}

export interface EstimateRideDto {
  pickupLatitude: number;
  pickupLongitude: number;
  destinationLatitude: number;
  destinationLongitude: number;
  vehicleType?: any;
}

/**
 * Normalizes and validates Ethiopian phone numbers.
 * Supports: +2519..., +2517..., 09..., 07..., 9..., 7...
 */
export function normalizeEthiopianPhone(phone: string): string | null {
  if (!phone || typeof phone !== 'string') return null;
  const cleaned = phone.replace(/[\s\-()]/g, '');
  const etPhoneRegex = /^(\+251|0)?([97]\d{8})$/;
  const match = cleaned.match(etPhoneRegex);
  if (!match) return null;
  return `+251${match[2]}`;
}

export class BookingService {
  /**
   * Calculate fare estimate for passenger before submitting ride
   */
  async estimate(dto: EstimateRideDto) {
    return fareService.estimateFare(
      dto.pickupLatitude,
      dto.pickupLongitude,
      dto.destinationLatitude,
      dto.destinationLongitude,
      dto.vehicleType
    );
  }

  /**
   * Create a new ride request with transaction safety, validation, and driver matching
   */
  async createRideRequest(passengerId: string, dto: CreateRideDto) {
    // 1. Validate Ethiopian contact phone
    const normalizedPhone = normalizeEthiopianPhone(dto.passengerContactPhone);
    if (!normalizedPhone) {
      throw new Error('INVALID_PHONE: Please provide a valid Ethiopian mobile phone number (09... or 07...)');
    }

    // 2. Validate GPS coordinates
    const coords = [dto.pickupLatitude, dto.pickupLongitude, dto.destinationLatitude, dto.destinationLongitude];
    if (coords.some((c) => typeof c !== 'number' || isNaN(c))) {
      throw new Error('INVALID_COORDINATES: Pickup and destination coordinates are required and must be numeric');
    }

    if (
      dto.pickupLatitude < -90 ||
      dto.pickupLatitude > 90 ||
      dto.destinationLatitude < -90 ||
      dto.destinationLatitude > 90 ||
      dto.pickupLongitude < -180 ||
      dto.pickupLongitude > 180 ||
      dto.destinationLongitude < -180 ||
      dto.destinationLongitude > 180
    ) {
      throw new Error('INVALID_COORDINATES: Coordinates out of valid geographic range');
    }

    const dist = fareService.calculateHaversineDistanceMeters(
      dto.pickupLatitude,
      dto.pickupLongitude,
      dto.destinationLatitude,
      dto.destinationLongitude
    );
    if (dist < 30) {
      throw new Error('INVALID_ROUTE: Pickup and destination locations cannot be identical');
    }

    // 3. Confirm selected driver exists and is eligible
    const driver = await prisma.driver.findUnique({
      where: { id: dto.driverId },
      include: {
        vehicles: {
          where: { isActive: true, verificationStatus: 'VERIFIED' },
          take: 1,
        },
        subcities: {
          where: { subcityId: dto.subcityId },
        },
      },
    });

    if (!driver) {
      throw new Error('DRIVER_NOT_FOUND: The requested driver was not found');
    }

    if (driver.verificationStatus !== DriverVerificationStatus.APPROVED) {
      throw new Error('DRIVER_NOT_ELIGIBLE: The driver account is currently not verified or eligible');
    }

    if (
      driver.availabilityStatus !== DriverAvailabilityStatus.AVAILABLE &&
      driver.availabilityStatus !== DriverAvailabilityStatus.ONLINE
    ) {
      throw new Error('DRIVER_UNAVAILABLE: The driver is currently busy or offline. Please choose another driver');
    }

    if (driver.subcities.length === 0) {
      throw new Error('DRIVER_NOT_IN_SUBCITY: The selected driver is not assigned to this subcity');
    }

    const vehicle = driver.vehicles[0];
    if (!vehicle) {
      throw new Error('NO_ACTIVE_VEHICLE: Selected driver has no active verified vehicle registered');
    }

    // 4. Calculate Authoritative Fare & Distance Estimate
    const fareEstimate = await fareService.estimateFare(
      dto.pickupLatitude,
      dto.pickupLongitude,
      dto.destinationLatitude,
      dto.destinationLongitude,
      vehicle.vehicleType
    );

    // 5. Generate unique booking reference
    const bookingReference = `KT-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

    // 6. Execute atomic database transaction
    const booking = await prisma.$transaction(async (tx) => {
      // Create Booking record
      const newBooking = await tx.booking.create({
        data: {
          bookingReference,
          passengerId,
          driverId: driver.id,
          vehicleId: vehicle.id,
          subcityId: dto.subcityId,
          passengerContactPhone: normalizedPhone,
          pickupLocation: dto.pickupLocation,
          pickupLatitude: dto.pickupLatitude,
          pickupLongitude: dto.pickupLongitude,
          destinationLocation: dto.destinationLocation,
          destinationLatitude: dto.destinationLatitude,
          destinationLongitude: dto.destinationLongitude,
          estimatedDistanceMeters: fareEstimate.distanceMeters,
          estimatedDurationSeconds: fareEstimate.durationSeconds,
          estimatedFare: fareEstimate.totalFare,
          currency: fareEstimate.currency,
          bookingStatus: BookingStatus.REQUESTED,
          additionalInstructions: dto.additionalInstructions,
        },
      });

      // Create linked Trip record
      await tx.trip.create({
        data: {
          bookingId: newBooking.id,
          driverId: driver.id,
          vehicleId: vehicle.id,
          tripStatus: TripStatus.ACCEPTED,
        },
      });

      // Log Audit Event
      await tx.auditLog.create({
        data: {
          passengerId,
          driverId: driver.id,
          actorId: passengerId,
          actorType: ActorType.PASSENGER,
          action: 'RIDE_REQUESTED',
          entityType: 'Booking',
          entityId: newBooking.id,
          metadata: {
            bookingReference,
            fareEstimate: fareEstimate.totalFare,
            distanceMeters: fareEstimate.distanceMeters,
          },
        },
      });

      return newBooking;
    });

    logger.info(
      { bookingId: booking.id, reference: bookingReference, driverId: driver.id, passengerId },
      'Ride request created successfully'
    );

    return this.getRideById(booking.id, { id: passengerId, role: 'PASSENGER' });
  }

  /**
   * Retrieve single ride by ID with role-based authorization check
   */
  async getRideById(rideId: string, user: { id: string; role: string }) {
    const booking = await prisma.booking.findUnique({
      where: { id: rideId },
      include: {
        driver: {
          select: {
            id: true,
            fullName: true,
            profileImage: true,
            rating: true,
            totalTrips: true,
            availabilityStatus: true,
          },
        },
        vehicle: {
          select: {
            id: true,
            plateNumber: true,
            vehicleModel: true,
            vehicleColor: true,
            vehicleType: true,
            seatingCapacity: true,
          },
        },
        subcity: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        trip: {
          select: {
            id: true,
            tripStatus: true,
            startedAt: true,
            completedAt: true,
            actualDistanceMeters: true,
            actualDurationSeconds: true,
            routePolyline: true,
          },
        },
        trackingSession: {
          select: {
            id: true,
            status: true,
            trackingQuality: true,
            officialDistanceMeters: true,
            estimatedDistanceMeters: true,
            lastValidLocationAt: true,
            lastLatitude: true,
            lastLongitude: true,
            interruptionCount: true,
          },
        },
        fareSnapshot: true,
        destinationRevisions: {
          orderBy: { revisionNumber: 'desc' },
        },
      },
    });

    if (!booking) return null;

    // Check authorization: passenger must own ride, or driver must be assigned, or admin
    if (
      user.role === 'PASSENGER' &&
      booking.passengerId !== user.id
    ) {
      throw new Error('FORBIDDEN: You do not have permission to view this ride');
    }

    if (
      user.role === 'DRIVER' &&
      booking.driverId !== user.id
    ) {
      throw new Error('FORBIDDEN: You are not the driver assigned to this ride');
    }

    return booking;
  }

  /**
   * List passenger rides (history & active)
   */
  async getPassengerRides(passengerId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [rides, total] = await Promise.all([
      prisma.booking.findMany({
        where: { passengerId },
        include: {
          driver: {
            select: {
              id: true,
              fullName: true,
              profileImage: true,
              rating: true,
            },
          },
          vehicle: {
            select: {
              vehicleModel: true,
              plateNumber: true,
              vehicleType: true,
            },
          },
          subcity: {
            select: {
              name: true,
            },
          },
          trip: {
            select: {
              tripStatus: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.booking.count({ where: { passengerId } }),
    ]);

    return {
      rides,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Cancel ride by passenger
   */
  async cancelRide(rideId: string, passengerId: string, reason?: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: rideId },
    });

    if (!booking) {
      throw new Error('RIDE_NOT_FOUND: Ride does not exist');
    }

    if (booking.passengerId !== passengerId) {
      throw new Error('FORBIDDEN: You can only cancel your own ride requests');
    }

    if (
      booking.bookingStatus === BookingStatus.TRIP_STARTED ||
      booking.bookingStatus === BookingStatus.TRIP_COMPLETED ||
      booking.bookingStatus === BookingStatus.CANCELLED
    ) {
      throw new Error(`CANNOT_CANCEL: Cannot cancel a ride with status ${booking.bookingStatus}`);
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id: rideId },
        data: {
          bookingStatus: BookingStatus.CANCELLED,
          cancelledAt: new Date(),
          cancellationReason: reason || 'Cancelled by passenger',
        },
      });

      // Free driver availability
      if (booking.driverId) {
        await tx.driver.update({
          where: { id: booking.driverId },
          data: { availabilityStatus: DriverAvailabilityStatus.AVAILABLE },
        });
      }

      // Log Audit Event
      await tx.auditLog.create({
        data: {
          passengerId,
          actorId: passengerId,
          actorType: ActorType.PASSENGER,
          action: 'RIDE_CANCELLED',
          entityType: 'Booking',
          entityId: rideId,
          metadata: { reason },
        },
      });

      return updated;
    });
  }
}

export const bookingService = new BookingService();

