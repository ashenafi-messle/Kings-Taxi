import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import jwt from 'jsonwebtoken';
import { env } from '../../src/config/env';
import { prisma } from '../../src/core/database/prisma';

describe('Ride Booking, Telematics & Dynamic Fare Integration Tests', () => {
  let passengerToken: string;
  let driverToken: string;
  let testPassengerId: string;
  let testDriverId: string;
  let testSubcityId: string;
  let activeRideId: string;
  let revisionId: string;

  beforeAll(async () => {
    // 1. Fetch a seeded subcity
    const subcity = await prisma.subcity.findFirst({
      where: { slug: 'maraki' },
    });
    expect(subcity).not.toBeNull();
    testSubcityId = subcity!.id;

    // 2. Fetch a seeded driver assigned to this subcity
    const driver = await prisma.driver.findFirst({
      where: {
        subcities: { some: { subcityId: testSubcityId } },
      },
    });
    expect(driver).not.toBeNull();
    testDriverId = driver!.id;

    // 3. Fetch or create a test passenger
    let passenger = await prisma.passenger.findFirst();
    if (!passenger) {
      passenger = await prisma.passenger.create({
        data: {
          fullName: 'Abebe Bikila',
          phoneNumber: '+251911998877',
          email: 'abebe.test@kingstaxi.et',
          passwordHash: 'dummy_hash',
          isVerified: true,
          city: 'Gondar',
        },
      });
    }
    testPassengerId = passenger.id;

    // 4. Create JWT auth tokens
    passengerToken = jwt.sign(
      { sub: testPassengerId, role: 'PASSENGER', phone: passenger.phoneNumber },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '1h' }
    );

    driverToken = jwt.sign(
      { sub: testDriverId, role: 'DRIVER', phone: driver!.phoneNumber },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '1h' }
    );
  });

  describe('1. Subcity Discovery', () => {
    it('GET /api/v1/passengers/subcities should return list of active Gondar subcities', async () => {
      const res = await request(app).get('/api/v1/passengers/subcities');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const maraki = res.body.data.find((s: any) => s.slug === 'maraki');
      expect(maraki).toBeDefined();
      expect(maraki.name).toBe('Maraki');
      expect(maraki.centerLatitude).toBeDefined();
      expect(maraki.centerLongitude).toBeDefined();
    });
  });

  describe('2. Driver Discovery & Public Profile Protection', () => {
    it('GET /api/v1/passengers/drivers?subcityId= should return eligible drivers and enforce privacy', async () => {
      const res = await request(app)
        .get(`/api/v1/passengers/drivers?subcityId=${testSubcityId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const driver = res.body.data[0];
      // Public fields must exist
      expect(driver.id).toBeDefined();
      expect(driver.fullName).toBeDefined();
      expect(driver.rating).toBeDefined();
      expect(driver.availabilityStatus).toBe('AVAILABLE');
      expect(driver.vehicle).toBeDefined();
      expect(driver.vehicle.plateNumber).toBeDefined();
      expect(driver.vehicle.vehicleModel).toBeDefined();

      // Privacy verification: PII must NEVER leak
      expect(driver.phoneNumber).toBeUndefined();
      expect(driver.email).toBeUndefined();
      expect(driver.passwordHash).toBeUndefined();
      expect(driver.verificationDocuments).toBeUndefined();
    });
  });

  describe('3. Fare Estimation', () => {
    it('POST /api/v1/passengers/rides/estimate should return calculated fare breakdown', async () => {
      const res = await request(app)
        .post('/api/v1/passengers/rides/estimate')
        .send({
          pickupLatitude: 12.6074,
          pickupLongitude: 37.4589,
          destinationLatitude: 12.6080,
          destinationLongitude: 37.4640,
          vehicleType: 'STANDARD_SEDAN',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.baseFare).toBeDefined();
      expect(res.body.data.distanceKm).toBeGreaterThan(0);
      expect(res.body.data.totalFare).toBeGreaterThanOrEqual(res.body.data.minimumFare);
      expect(res.body.data.currency).toBe('ETB');
    });
  });

  describe('4. Passenger Ride Request Creation', () => {
    it('should reject ride creation with invalid phone number', async () => {
      const res = await request(app)
        .post('/api/v1/passengers/rides')
        .set('Authorization', `Bearer ${passengerToken}`)
        .send({
          driverId: testDriverId,
          subcityId: testSubcityId,
          pickupLocation: 'Maraki Campus Gate 1',
          pickupLatitude: 12.6074,
          pickupLongitude: 37.4589,
          destinationLocation: 'Fasil Ghebbi, Piasa',
          destinationLatitude: 12.608,
          destinationLongitude: 37.464,
          passengerContactPhone: 'invalid_phone_123',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should successfully create ride request with valid data', async () => {
      const res = await request(app)
        .post('/api/v1/passengers/rides')
        .set('Authorization', `Bearer ${passengerToken}`)
        .send({
          driverId: testDriverId,
          subcityId: testSubcityId,
          pickupLocation: 'Maraki Campus Gate 1',
          pickupLatitude: 12.6074,
          pickupLongitude: 37.4589,
          destinationLocation: 'Fasil Ghebbi, Piasa',
          destinationLatitude: 12.608,
          destinationLongitude: 37.464,
          passengerContactPhone: '0911223344',
          additionalInstructions: 'Waiting by the main student gate',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.bookingReference).toMatch(/^KT-/);
      expect(res.body.data.bookingStatus).toBe('REQUESTED');
      expect(res.body.data.passengerContactPhone).toBe('+251911223344');

      activeRideId = res.body.data.id;
    });

    it('GET /api/v1/passengers/rides/:id should return live ride details', async () => {
      const res = await request(app)
        .get(`/api/v1/passengers/rides/${activeRideId}`)
        .set('Authorization', `Bearer ${passengerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(activeRideId);
      expect(res.body.data.driver.fullName).toBeDefined();
      expect(res.body.data.vehicle.plateNumber).toBeDefined();
    });
  });

  describe('5. Journey Lifecycle: Start, GPS Telematics & Tracking', () => {
    it('POST /api/v1/trips/:rideId/start should begin journey and lock pricing snapshot', async () => {
      const res = await request(app)
        .post(`/api/v1/trips/${activeRideId}/start`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          latitude: 12.6074,
          longitude: 37.4589,
          accuracy: 5.0,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.bookingStatus).toBe('TRIP_STARTED');
      expect(res.body.data.trackingSession).toBeDefined();
      expect(res.body.data.trackingSession.status).toBe('ACTIVE');
      expect(res.body.data.fareSnapshot).toBeDefined();
      expect(res.body.data.fareSnapshot.baseFare).toBeDefined();
    });

    it('POST /api/v1/trips/:rideId/location should ingest valid GPS samples and accumulate distance', async () => {
      const now = Date.now();
      const samples = [
        {
          latitude: 12.6075,
          longitude: 37.4592,
          accuracy: 6.0,
          speed: 8.5,
          deviceTimestamp: new Date(now + 2000).toISOString(),
        },
        {
          latitude: 12.6078,
          longitude: 37.4601,
          accuracy: 5.5,
          speed: 10.2,
          deviceTimestamp: new Date(now + 12000).toISOString(),
        },
      ];

      const res = await request(app)
        .post(`/api/v1/trips/${activeRideId}/location`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ samples });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.validCount).toBe(2);
      expect(res.body.data.totalOfficialDistanceMeters).toBeGreaterThan(0);
      expect(res.body.data.trackingQuality).toBe('GOOD');
    });
  });

  describe('6. Mid-Journey Destination Change', () => {
    it('POST /api/v1/trips/:rideId/change-destination should calculate revised fare proposal', async () => {
      const res = await request(app)
        .post(`/api/v1/trips/${activeRideId}/change-destination`)
        .set('Authorization', `Bearer ${passengerToken}`)
        .send({
          newDestination: 'Goha Hotel Viewpoint, Gondar',
          newLatitude: 12.618,
          newLongitude: 37.472,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.revision).toBeDefined();
      expect(res.body.data.revision.status).toBe('PENDING');
      expect(res.body.data.fareBreakdown.totalFare).toBeGreaterThan(0);

      revisionId = res.body.data.revision.id;
    });

    it('POST /api/v1/trips/:rideId/destination-change/respond should accept proposal and update ride', async () => {
      const res = await request(app)
        .post(`/api/v1/trips/${activeRideId}/destination-change/respond`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          revisionId,
          approve: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ACCEPTED_BY_DRIVER');

      // Verify booking updated destination
      const booking = await prisma.booking.findUnique({
        where: { id: activeRideId },
      });
      expect(booking!.destinationLocation).toBe('Goha Hotel Viewpoint, Gondar');
    });
  });

  describe('7. Journey Completion & Authoritative Fare Finalization', () => {
    it('POST /api/v1/trips/:rideId/complete should finalize journey with deterministic fare receipt', async () => {
      const res = await request(app)
        .post(`/api/v1/trips/${activeRideId}/complete`)
        .set('Authorization', `Bearer ${driverToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.booking.bookingStatus).toBe('TRIP_COMPLETED');
      expect(res.body.data.fareBreakdown).toBeDefined();
      expect(res.body.data.fareBreakdown.totalFare).toBeGreaterThan(0);

      // Verify driver returned to AVAILABLE
      const driver = await prisma.driver.findUnique({
        where: { id: testDriverId },
      });
      expect(driver!.availabilityStatus).toBe('AVAILABLE');
    });

    it('GET /api/v1/trips/:rideId/receipt should return finalized receipt', async () => {
      const res = await request(app)
        .get(`/api/v1/trips/${activeRideId}/receipt`)
        .set('Authorization', `Bearer ${passengerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.bookingStatus).toBe('TRIP_COMPLETED');
      expect(res.body.data.fareSnapshot.finalFare).toBeDefined();
    });
  });
});
