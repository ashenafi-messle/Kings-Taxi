import { prisma } from '../../core/database/prisma';
import {
  BookingStatus,
  TripStatus,
  TrackingSessionStatus,
  LocationValidationStatus,
  DestinationRevisionStatus,
  DriverAvailabilityStatus,
  ActorType,
  VehicleType,
} from '@prisma/client';
import { fareService } from '../fares/fare.service';
import { logger } from '../../core/logging/logger';

export interface LocationSampleInput {
  sampleId?: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  speed?: number | null;
  heading?: number | null;
  altitude?: number | null;
  deviceTimestamp: string | Date;
  sequenceNumber?: number;
}

export class TripService {
  /**
   * Driver starts journey when passenger enters vehicle.
   * Locks authoritative fare snapshot, creates GPS tracking session, updates ride status.
   */
  async startJourney(
    rideId: string,
    driverId: string,
    initialLocation: { latitude: number; longitude: number; accuracy?: number }
  ) {
    const booking = await prisma.booking.findUnique({
      where: { id: rideId },
      include: {
        vehicle: true,
        trip: true,
        trackingSession: true,
      },
    });

    if (!booking) {
      throw new Error('RIDE_NOT_FOUND: Ride does not exist');
    }

    if (booking.driverId !== driverId) {
      throw new Error('UNAUTHORIZED_DRIVER: You are not assigned to this ride');
    }

    if (booking.bookingStatus === BookingStatus.TRIP_STARTED) {
      // Idempotent: return existing active ride
      return booking;
    }

    if (booking.bookingStatus !== BookingStatus.REQUESTED && booking.bookingStatus !== BookingStatus.DRIVER_ASSIGNED) {
      throw new Error(`CANNOT_START: Cannot start ride in status ${booking.bookingStatus}`);
    }

    const vehicleType = booking.vehicle?.vehicleType || VehicleType.STANDARD_SEDAN;
    const rates = await fareService.getActiveFareConfig(vehicleType);

    const startedAt = new Date();

    return prisma.$transaction(async (tx) => {
      // 1. Lock immutable TripFareSnapshot
      await tx.tripFareSnapshot.upsert({
        where: { bookingId: booking.id },
        update: {},
        create: {
          bookingId: booking.id,
          pricingVersion: 'v1-gondar',
          baseFare: rates.baseFare,
          perKilometreRate: rates.perKilometreRate,
          perMinuteRate: rates.perMinuteRate,
          minimumFare: rates.minimumFare,
          currency: rates.currency,
          calculationMethod: 'STANDARD_GPS_HAVERSINE',
        },
      });

      // 2. Create GPS tracking session
      const session = await tx.tripTrackingSession.upsert({
        where: { bookingId: booking.id },
        update: {
          status: TrackingSessionStatus.ACTIVE,
          trackingQuality: 'GOOD',
          startedAt,
          lastValidLocationAt: startedAt,
          lastLatitude: initialLocation.latitude,
          lastLongitude: initialLocation.longitude,
        },
        create: {
          bookingId: booking.id,
          driverId,
          status: TrackingSessionStatus.ACTIVE,
          trackingQuality: 'GOOD',
          startedAt,
          officialDistanceMeters: 0,
          lastValidLocationAt: startedAt,
          lastLatitude: initialLocation.latitude,
          lastLongitude: initialLocation.longitude,
          totalSamplesCount: 1,
          validSamplesCount: 1,
        },
      });

      // 3. Save initial location sample
      await tx.tripLocationSample.create({
        data: {
          trackingSessionId: session.id,
          latitude: initialLocation.latitude,
          longitude: initialLocation.longitude,
          accuracy: initialLocation.accuracy ?? 5.0,
          deviceTimestamp: startedAt,
          sequenceNumber: 1,
          validationStatus: LocationValidationStatus.VALID,
          distanceFromPrevMeters: 0,
        },
      });

      // 4. Update Booking and Trip states
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          bookingStatus: BookingStatus.TRIP_STARTED,
          startedAt,
        },
      });

      await tx.trip.update({
        where: { bookingId: booking.id },
        data: {
          tripStatus: TripStatus.IN_TRANSIT,
          startedAt,
        },
      });

      // 5. Update driver availability to ON_TRIP
      await tx.driver.update({
        where: { id: driverId },
        data: {
          availabilityStatus: DriverAvailabilityStatus.ON_TRIP,
          currentLatitude: initialLocation.latitude,
          currentLongitude: initialLocation.longitude,
          lastLocationUpdate: startedAt,
        },
      });

      // 6. Audit log
      await tx.auditLog.create({
        data: {
          driverId,
          actorId: driverId,
          actorType: ActorType.DRIVER,
          action: 'JOURNEY_STARTED',
          entityType: 'Booking',
          entityId: booking.id,
          metadata: { initialLocation, startedAt },
        },
      });

      return tx.booking.findUnique({
        where: { id: booking.id },
        include: {
          trackingSession: true,
          fareSnapshot: true,
          trip: true,
        },
      });
    });
  }

  /**
   * Driver sends batch of GPS telematics samples during journey.
   * Filters GPS noise (accuracy > 35m), unreasonable speeds (> 140km/h), and spatial jumps.
   * Atomically computes validated road distance using Haversine formula.
   */
  async ingestLocationSamples(rideId: string, driverId: string, samples: LocationSampleInput[]) {
    if (!samples || samples.length === 0) {
      return { success: true, processedCount: 0 };
    }

    const session = await prisma.tripTrackingSession.findUnique({
      where: { bookingId: rideId },
    });

    if (!session || session.status !== TrackingSessionStatus.ACTIVE) {
      throw new Error('NO_ACTIVE_SESSION: No active tracking session found for this ride');
    }

    if (session.driverId !== driverId) {
      throw new Error('UNAUTHORIZED_DRIVER: You are not the authorized driver for this tracking session');
    }

    // 1. Sort samples chronologically by deviceTimestamp
    const sorted = [...samples].sort(
      (a, b) => new Date(a.deviceTimestamp).getTime() - new Date(b.deviceTimestamp).getTime()
    );

    // 2. Fetch existing sample timestamps to guarantee idempotency and eliminate duplicate submissions
    const timestampsToCheck = sorted.map((s) => new Date(s.deviceTimestamp));
    const existingSamples = await prisma.tripLocationSample.findMany({
      where: {
        trackingSessionId: session.id,
        deviceTimestamp: { in: timestampsToCheck },
      },
      select: { deviceTimestamp: true },
    });

    const existingTimeSet = new Set(
      existingSamples.map((s) => s.deviceTimestamp.getTime())
    );

    // Filter out already ingested samples (idempotent deduplication)
    const freshSamples = sorted.filter(
      (s) => !existingTimeSet.has(new Date(s.deviceTimestamp).getTime())
    );

    if (freshSamples.length === 0) {
      // Completely idempotent duplicate batch — return current session distance cleanly
      return {
        success: true,
        processedCount: 0,
        duplicateCount: samples.length,
        additionalDistanceMeters: 0,
        totalOfficialDistanceMeters: session.officialDistanceMeters,
        trackingQuality: session.trackingQuality,
      };
    }

    let currentLat = session.lastLatitude;
    let currentLon = session.lastLongitude;
    let lastTimestamp = session.lastValidLocationAt?.getTime() || Date.now();
    let additionalDistanceMeters = 0;
    let validCount = 0;
    let sequenceNumber = session.totalSamplesCount;

    const samplesToInsert: any[] = [];

    for (const sample of freshSamples) {
      sequenceNumber += 1;
      const sampleTime = new Date(sample.deviceTimestamp).getTime();
      const dtSeconds = Math.max(1, (sampleTime - lastTimestamp) / 1000);

      let status: LocationValidationStatus = LocationValidationStatus.VALID;
      let stepDistance = 0;

      // 1. Filter forward-clock tampering or implausible future timestamps (> 120s ahead of server)
      const now = Date.now();
      if (sampleTime > now + 120000) {
        status = LocationValidationStatus.REJECTED_SPEED;
      }

      // 2. Filter poor GPS accuracy (> 35 meters)
      if (sample.accuracy > 35.0) {
        status = LocationValidationStatus.REJECTED_ACCURACY;
      }

      // 3. Filter unreasonable speeds (> 38.8 m/s = 140 km/h)
      if (sample.speed !== undefined && sample.speed !== null && sample.speed > 38.8) {
        status = LocationValidationStatus.REJECTED_SPEED;
      }

      // 4. Coordinate Jump & Offline Gap Reconciliation Filter
      if (status === LocationValidationStatus.VALID && currentLat !== null && currentLon !== null) {
        const rawCrowDistance = fareService.calculateHaversineDistanceMeters(
          currentLat,
          currentLon,
          sample.latitude,
          sample.longitude
        );

        const calculatedSpeed = rawCrowDistance / dtSeconds;

        if (dtSeconds > 45.0) {
          // Offline period occurred! Apply approved platform reconciliation policy
          if (dtSeconds <= 600.0 && calculatedSpeed <= 35.0) {
            // Driver was travelling while disconnected: reconcile distance with 1.25 urban road factor
            stepDistance = Math.round(rawCrowDistance * 1.25);
            status = LocationValidationStatus.VALID;
          } else if (calculatedSpeed > 45.0) {
            // Impossible spatial leap detected during disconnection
            status = LocationValidationStatus.REJECTED_JUMP;
            stepDistance = 0;
          } else {
            // Extended gap (> 10 mins): cap distance to direct crow distance
            stepDistance = Math.min(rawCrowDistance, 4000);
          }
        } else {
          // Normal live interval
          if (calculatedSpeed > 45.0) {
            status = LocationValidationStatus.REJECTED_JUMP;
            stepDistance = 0;
          } else {
            stepDistance = rawCrowDistance;
          }
        }
      }

      // If valid, accumulate official distance and advance current position
      if (status === LocationValidationStatus.VALID) {
        additionalDistanceMeters += stepDistance;
        currentLat = sample.latitude;
        currentLon = sample.longitude;
        lastTimestamp = sampleTime;
        validCount += 1;
      }

      samplesToInsert.push({
        trackingSessionId: session.id,
        latitude: sample.latitude,
        longitude: sample.longitude,
        accuracy: sample.accuracy,
        speed: sample.speed ?? null,
        heading: sample.heading ?? null,
        altitude: sample.altitude ?? null,
        deviceTimestamp: new Date(sample.deviceTimestamp),
        sequenceNumber,
        validationStatus: status,
        distanceFromPrevMeters: stepDistance,
      });
    }

    // Determine tracking quality / interruption status
    const now = Date.now();
    const timeSinceLastValidSeconds = (now - lastTimestamp) / 1000;
    const isInterrupted = timeSinceLastValidSeconds > 45.0;
    const trackingQuality = isInterrupted ? 'INTERRUPTED' : 'GOOD';

    // Batch persist samples and update session totals
    await prisma.$transaction([
      prisma.tripLocationSample.createMany({
        data: samplesToInsert,
      }),
      prisma.tripTrackingSession.update({
        where: { id: session.id },
        data: {
          officialDistanceMeters: { increment: Math.round(additionalDistanceMeters) },
          totalSamplesCount: sequenceNumber,
          validSamplesCount: { increment: validCount },
          lastValidLocationAt: currentLat !== null ? new Date(lastTimestamp) : undefined,
          lastLatitude: currentLat,
          lastLongitude: currentLon,
          trackingQuality,
          interruptionCount: isInterrupted ? { increment: 1 } : undefined,
        },
      }),
      prisma.driver.update({
        where: { id: driverId },
        data: {
          currentLatitude: currentLat,
          currentLongitude: currentLon,
          lastLocationUpdate: new Date(),
        },
      }),
    ]);

    return {
      success: true,
      processedCount: freshSamples.length,
      duplicateCount: samples.length - freshSamples.length,
      validCount,
      additionalDistanceMeters: Math.round(additionalDistanceMeters),
      totalOfficialDistanceMeters: session.officialDistanceMeters + Math.round(additionalDistanceMeters),
      trackingQuality,
    };
  }

  /**
   * Passenger requests destination change during active journey.
   * Total Estimated Distance = Validated Distance Already Travelled + Remaining Road Distance.
   * Does NOT double count completed route.
   */
  async requestDestinationChange(
    rideId: string,
    passengerId: string,
    dto: { newDestination: string; newLatitude: number; newLongitude: number }
  ) {
    const booking = await prisma.booking.findUnique({
      where: { id: rideId },
      include: {
        trackingSession: true,
        fareSnapshot: true,
      },
    });

    if (!booking) {
      throw new Error('RIDE_NOT_FOUND: Ride does not exist');
    }

    if (booking.passengerId !== passengerId) {
      throw new Error('FORBIDDEN: You do not have permission to modify this ride');
    }

    if (booking.bookingStatus !== BookingStatus.TRIP_STARTED) {
      throw new Error('CANNOT_CHANGE: Destination can only be revised while the journey is in progress');
    }

    const session = booking.trackingSession;
    const snapshot = booking.fareSnapshot;

    if (!session || !snapshot) {
      throw new Error('INVALID_SESSION: Missing tracking session or fare snapshot for active journey');
    }

    // 1. Distance already travelled (official validated distance)
    const distanceTravelledMeters = session.officialDistanceMeters;

    // 2. Current driver location
    const currentLat = session.lastLatitude ?? booking.pickupLatitude;
    const currentLon = session.lastLongitude ?? booking.pickupLongitude;

    // 3. Estimated remaining distance to new destination (with 1.25 urban road factor)
    const remainingCrowFly = fareService.calculateHaversineDistanceMeters(
      currentLat,
      currentLon,
      dto.newLatitude,
      dto.newLongitude
    );
    const remainingEstimatedMeters = Math.max(300, Math.round(remainingCrowFly * 1.25));

    // 4. Total revised distance = Travelled + Remaining
    const totalRevisedDistanceMeters = distanceTravelledMeters + remainingEstimatedMeters;

    // 5. Estimated total duration
    const remainingMinutes = Math.ceil(remainingEstimatedMeters / 400);
    const elapsedMinutes = Math.round((Date.now() - session.startedAt.getTime()) / 60000);
    const totalDurationSeconds = (elapsedMinutes + remainingMinutes) * 60;

    // 6. Calculate revised estimated fare using saved snapshot rates
    const snapshotRates = {
      baseFare: Number(snapshot.baseFare),
      perKilometreRate: Number(snapshot.perKilometreRate),
      perMinuteRate: Number(snapshot.perMinuteRate),
      minimumFare: Number(snapshot.minimumFare),
      currency: snapshot.currency,
    };

    const revisedFareResult = fareService.computeFare(
      snapshotRates,
      totalRevisedDistanceMeters,
      totalDurationSeconds
    );

    // 7. Get next revision number
    const count = await prisma.rideDestinationRevision.count({
      where: { bookingId: rideId },
    });

    const revision = await prisma.rideDestinationRevision.create({
      data: {
        bookingId: rideId,
        revisionNumber: count + 1,
        previousDestination: booking.destinationLocation,
        previousLatitude: booking.destinationLatitude,
        previousLongitude: booking.destinationLongitude,
        newDestination: dto.newDestination,
        newLatitude: dto.newLatitude,
        newLongitude: dto.newLongitude,
        distanceTravelledAtRevisionMeters: distanceTravelledMeters,
        remainingEstimatedDistanceMeters: remainingEstimatedMeters,
        previousEstimatedFare: booking.estimatedFare,
        revisedEstimatedFare: revisedFareResult.totalFare,
        status: DestinationRevisionStatus.PENDING,
        requestedBy: ActorType.PASSENGER,
      },
    });

    logger.info(
      { rideId, revisionId: revision.id, revisedFare: revisedFareResult.totalFare },
      'Destination revision proposal created'
    );

    return {
      revision,
      fareBreakdown: revisedFareResult,
    };
  }

  /**
   * Driver approves or rejects mid-journey destination change proposal
   */
  async respondToDestinationChange(rideId: string, driverId: string, revisionId: string, approve: boolean) {
    const booking = await prisma.booking.findUnique({
      where: { id: rideId },
      include: { destinationRevisions: { where: { id: revisionId } } },
    });

    if (!booking) {
      throw new Error('RIDE_NOT_FOUND: Ride does not exist');
    }

    if (booking.driverId !== driverId) {
      throw new Error('UNAUTHORIZED_DRIVER: You are not assigned to this ride');
    }

    const revision = booking.destinationRevisions[0];
    if (!revision || revision.status !== DestinationRevisionStatus.PENDING) {
      throw new Error('REVISION_NOT_PENDING: This destination change proposal is no longer pending');
    }

    const respondedAt = new Date();

    if (!approve) {
      return prisma.rideDestinationRevision.update({
        where: { id: revisionId },
        data: {
          status: DestinationRevisionStatus.REJECTED_BY_DRIVER,
          respondedAt,
        },
      });
    }

    // Driver approved: update destination & revised fare on Booking
    return prisma.$transaction(async (tx) => {
      const updatedRevision = await tx.rideDestinationRevision.update({
        where: { id: revisionId },
        data: {
          status: DestinationRevisionStatus.ACCEPTED_BY_DRIVER,
          respondedAt,
        },
      });

      await tx.booking.update({
        where: { id: rideId },
        data: {
          destinationLocation: revision.newDestination,
          destinationLatitude: revision.newLatitude,
          destinationLongitude: revision.newLongitude,
          estimatedFare: revision.revisedEstimatedFare,
          estimatedDistanceMeters:
            revision.distanceTravelledAtRevisionMeters + revision.remainingEstimatedDistanceMeters,
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          driverId,
          actorId: driverId,
          actorType: ActorType.DRIVER,
          action: 'DESTINATION_CHANGE_ACCEPTED',
          entityType: 'Booking',
          entityId: rideId,
          metadata: {
            revisionId,
            newDestination: revision.newDestination,
            revisedFare: revision.revisedEstimatedFare,
          },
        },
      });

      return updatedRevision;
    });
  }

  /**
   * Driver completes journey when destination is reached.
   * Authoritative calculation: duration from server timestamps, distance from validated GPS samples,
   * pricing calculated from locked TripFareSnapshot.
   */
  async completeJourney(rideId: string, driverId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: rideId },
      include: {
        trackingSession: true,
        fareSnapshot: true,
        trip: true,
      },
    });

    if (!booking) {
      throw new Error('RIDE_NOT_FOUND: Ride does not exist');
    }

    if (booking.driverId !== driverId) {
      throw new Error('UNAUTHORIZED_DRIVER: You are not assigned to this ride');
    }

    if (booking.bookingStatus === BookingStatus.TRIP_COMPLETED) {
      // Idempotency: return already completed ride details
      return this.getCompletedRideReceipt(rideId);
    }

    if (booking.bookingStatus !== BookingStatus.TRIP_STARTED) {
      throw new Error(`CANNOT_COMPLETE: Cannot complete a ride with status ${booking.bookingStatus}`);
    }

    const session = booking.trackingSession;
    const snapshot = booking.fareSnapshot;

    if (!session || !snapshot) {
      throw new Error('MISSING_DATA: Active tracking session or pricing snapshot not found');
    }

    const completedAt = new Date();
    const durationSeconds = Math.max(60, Math.round((completedAt.getTime() - session.startedAt.getTime()) / 1000));
    const finalDistanceMeters = session.officialDistanceMeters > 100 ? session.officialDistanceMeters : (booking.estimatedDistanceMeters || 1000);

    const snapshotRates = {
      baseFare: Number(snapshot.baseFare),
      perKilometreRate: Number(snapshot.perKilometreRate),
      perMinuteRate: Number(snapshot.perMinuteRate),
      minimumFare: Number(snapshot.minimumFare),
      currency: snapshot.currency,
    };

    const fareBreakdown = fareService.computeFare(snapshotRates, finalDistanceMeters, durationSeconds);

    return prisma.$transaction(async (tx) => {
      // 1. Finalize Tracking Session
      await tx.tripTrackingSession.update({
        where: { id: session.id },
        data: {
          status: TrackingSessionStatus.COMPLETED,
          endedAt: completedAt,
          officialDistanceMeters: finalDistanceMeters,
        },
      });

      // 2. Finalize TripFareSnapshot
      await tx.tripFareSnapshot.update({
        where: { id: snapshot.id },
        data: {
          actualDistanceMeters: finalDistanceMeters,
          billableDistanceMeters: finalDistanceMeters,
          durationSeconds,
          distanceFare: fareBreakdown.distanceFare,
          timeFare: fareBreakdown.timeFare,
          finalFare: fareBreakdown.totalFare,
          finalizedAt: completedAt,
        },
      });

      // 3. Complete Booking & Trip
      const updatedBooking = await tx.booking.update({
        where: { id: booking.id },
        data: {
          bookingStatus: BookingStatus.TRIP_COMPLETED,
          completedAt,
          finalFare: fareBreakdown.totalFare,
        },
      });

      await tx.trip.update({
        where: { bookingId: booking.id },
        data: {
          tripStatus: TripStatus.COMPLETED,
          completedAt,
          actualDistanceMeters: finalDistanceMeters,
          actualDurationSeconds: durationSeconds,
        },
      });

      // 4. Return Driver to AVAILABLE
      await tx.driver.update({
        where: { id: driverId },
        data: {
          availabilityStatus: DriverAvailabilityStatus.AVAILABLE,
          totalTrips: { increment: 1 },
        },
      });

      // 5. Audit log
      await tx.auditLog.create({
        data: {
          driverId,
          actorId: driverId,
          actorType: ActorType.DRIVER,
          action: 'JOURNEY_COMPLETED',
          entityType: 'Booking',
          entityId: booking.id,
          metadata: {
            finalFare: fareBreakdown.totalFare,
            distanceMeters: finalDistanceMeters,
            durationSeconds,
          },
        },
      });

      return {
        booking: updatedBooking,
        fareBreakdown,
      };
    });
  }

  /**
   * Helper to fetch finalized receipt details
   */
  async getCompletedRideReceipt(rideId: string) {
    return prisma.booking.findUnique({
      where: { id: rideId },
      include: {
        driver: {
          select: {
            id: true,
            fullName: true,
            profileImage: true,
            rating: true,
          },
        },
        vehicle: true,
        fareSnapshot: true,
        trip: true,
        trackingSession: true,
      },
    });
  }
}

export const tripService = new TripService();
