import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AccountStatus,
  BookingStatus,
  DriverAvailabilityStatus,
  DriverVerificationStatus,
} from '@prisma/client';

const { mockPrisma, mockAuditRecord, mockIo, mockRoomEmit } = vi.hoisted(() => {
  const roomEmit = vi.fn();
  const io = {
    to: vi.fn(() => ({ emit: roomEmit })),
    emit: vi.fn(),
  };

  const mock: any = {
    driver: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    passenger: {
      findFirst: vi.fn(),
    },
    subcity: {
      findFirst: vi.fn(),
    },
    booking: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    trip: {
      create: vi.fn(),
      upsert: vi.fn(),
    },
    vehicle: {
      findFirst: vi.fn(),
    },
    driverStatusHistory: {
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  };
  mock.$transaction = vi.fn((cb: any) => cb(mock));

  return {
    mockPrisma: mock,
    mockAuditRecord: vi.fn(),
    mockIo: io,
    mockRoomEmit: roomEmit,
  };
});

vi.mock('../../src/core/database/prisma', () => ({
  prisma: mockPrisma,
}));

vi.mock('../../src/core/audit/audit.service', () => ({
  auditService: {
    record: mockAuditRecord,
  },
}));

import { DriverService } from '../../src/modules/drivers/driver.service';
import { RideRequestService } from '../../src/modules/rides/rideRequest.service';
import {
  registerRideSocketConnection,
  setRideSocketServer,
} from '../../src/modules/realtime/rideSocket';

const DRIVER_ID = '11111111-1111-4111-8111-111111111111';
const PASSENGER_ID = '22222222-2222-4222-8222-222222222222';
const SUBCITY_ID = '33333333-3333-4333-8333-333333333333';
const REQUEST_ID = '44444444-4444-4444-8444-444444444444';
const VEHICLE_ID = '55555555-5555-4555-8555-555555555555';

function makeBookingRecord(overrides: Record<string, any> = {}) {
  const now = new Date();
  return {
    id: REQUEST_ID,
    bookingReference: 'KT-TEST-001',
    passengerId: PASSENGER_ID,
    driverId: DRIVER_ID,
    vehicleId: VEHICLE_ID,
    subcityId: SUBCITY_ID,
    bookingStatus: BookingStatus.REQUESTED,
    passengerContactPhone: '+251911223344',
    pickupLocation: 'Maraki Subcity, Gondar',
    destinationLocation: 'On-Demand Journey in Gondar',
    additionalInstructions: 'Near main gate',
    createdAt: now,
    expiresAt: new Date(now.getTime() + 90_000),
    acceptedAt: null,
    rejectedAt: null,
    cancelledAt: null,
    cancellationReason: null,
    rejectionReason: null,
    passenger: { id: PASSENGER_ID, fullName: 'Selamawit Tadesse', profileImage: null },
    driver: { id: DRIVER_ID, fullName: 'Abebe Kebede', profileImage: null, rating: 4.9 },
    vehicle: {
      plateNumber: '3-A12345',
      make: 'Toyota',
      vehicleModel: 'Corolla',
      vehicleColor: 'Silver',
      vehicleType: 'STANDARD_SEDAN',
    },
    subcity: { id: SUBCITY_ID, name: 'Maraki', slug: 'maraki' },
    ...overrides,
  };
}

describe('Real-Time Driver Availability, Subcity Discovery & Ride Request Dispatch', () => {
  const driverService = new DriverService();
  const rideRequestService = new RideRequestService();

  beforeEach(() => {
    vi.clearAllMocks();
    setRideSocketServer(mockIo as any);
  });

  describe('DriverService availability management', () => {
    it('allows an active approved driver with a verified active vehicle to go online', async () => {
      mockPrisma.driver.findFirst.mockResolvedValue({
        id: DRIVER_ID,
        accountStatus: AccountStatus.ACTIVE,
        verificationStatus: DriverVerificationStatus.APPROVED,
        availabilityStatus: DriverAvailabilityStatus.OFFLINE,
        primarySubcityId: SUBCITY_ID,
        subcities: [{ subcityId: SUBCITY_ID }],
        vehicles: [{ id: VEHICLE_ID, isActive: true, verificationStatus: 'APPROVED' }],
        assignedBookings: [],
      });
      mockPrisma.driver.update.mockResolvedValue({
        id: DRIVER_ID,
        availabilityStatus: DriverAvailabilityStatus.AVAILABLE,
        lastHeartbeatAt: new Date(),
        isSocketConnected: true,
      });

      const result = await driverService.goOnline(DRIVER_ID);

      expect(result.availabilityStatus).toBe(DriverAvailabilityStatus.AVAILABLE);
      expect(mockPrisma.driver.update).toHaveBeenCalledTimes(1);
      expect(mockIo.emit).toHaveBeenCalledWith(
        'driver:availability:changed',
        expect.objectContaining({
          driverId: DRIVER_ID,
          availabilityStatus: DriverAvailabilityStatus.AVAILABLE,
        })
      );
    });

    it('rejects unapproved or suspended drivers from going online', async () => {
      mockPrisma.driver.findFirst.mockResolvedValue({
        id: DRIVER_ID,
        accountStatus: AccountStatus.SUSPENDED,
        verificationStatus: DriverVerificationStatus.PENDING,
        availabilityStatus: DriverAvailabilityStatus.OFFLINE,
        primarySubcityId: SUBCITY_ID,
        subcities: [],
        vehicles: [{ id: VEHICLE_ID }],
        assignedBookings: [],
      });

      await expect(driverService.goOnline(DRIVER_ID)).rejects.toThrow(/suspended/i);
    });

    it('transitions driver to OFFLINE while preserving active rides', async () => {
      mockPrisma.driver.findFirst.mockResolvedValue({
        id: DRIVER_ID,
        availabilityStatus: DriverAvailabilityStatus.AVAILABLE,
        primarySubcityId: SUBCITY_ID,
        subcities: [{ subcityId: SUBCITY_ID }],
      });
      mockPrisma.driver.update.mockResolvedValue({
        id: DRIVER_ID,
        fullName: 'Abebe Kebede',
        availabilityStatus: DriverAvailabilityStatus.OFFLINE,
        isSocketConnected: true,
        lastHeartbeatAt: new Date(),
      });

      const result = await driverService.goOffline(DRIVER_ID);
      expect(result.availabilityStatus).toBe(DriverAvailabilityStatus.OFFLINE);
      expect(mockIo.emit).toHaveBeenCalledWith(
        'driver:availability:changed',
        expect.objectContaining({
          driverId: DRIVER_ID,
          availabilityStatus: DriverAvailabilityStatus.OFFLINE,
        })
      );
    });

    it('returns sanitized public fields for available drivers in the requested subcity', async () => {
      mockPrisma.driver.findMany.mockResolvedValue([
        {
          id: DRIVER_ID,
          fullName: 'Abebe Kebede',
          profileImage: null,
          rating: 4.9,
          totalTrips: 42,
          availabilityStatus: DriverAvailabilityStatus.AVAILABLE,
          isSocketConnected: true,
          lastHeartbeatAt: new Date(),
          vehicles: [
            {
              plateNumber: '3-A12345',
              make: 'Toyota',
              vehicleModel: 'Corolla',
              vehicleColor: 'Silver',
              vehicleType: 'STANDARD_SEDAN',
              seatingCapacity: 4,
            },
          ],
          subcities: [
            {
              isPrimary: true,
              subcity: { id: SUBCITY_ID, name: 'Maraki', slug: 'maraki' },
            },
          ],
        },
      ]);

      const drivers = await driverService.getAvailableDriversBySubcity(SUBCITY_ID);

      expect(drivers).toHaveLength(1);
      expect(drivers[0]).toMatchObject({
        id: DRIVER_ID,
        fullName: 'Abebe Kebede',
        availabilityStatus: DriverAvailabilityStatus.AVAILABLE,
      });
      expect((drivers[0] as any).passwordHash).toBeUndefined();
      expect((drivers[0] as any).email).toBeUndefined();
      expect((drivers[0] as any).phoneNumber).toBeUndefined();
    });
  });

  describe('RideRequestService transactional dispatch & lifecycle', () => {
    it('creates a pending ride request atomically and emits to the targeted driver', async () => {
      mockPrisma.passenger.findFirst.mockResolvedValue({
        id: PASSENGER_ID,
        fullName: 'Selamawit Tadesse',
        accountStatus: AccountStatus.ACTIVE,
      });
      mockPrisma.subcity.findFirst.mockResolvedValue({
        id: SUBCITY_ID,
        name: 'Maraki',
        centerLatitude: 12.6074,
        centerLongitude: 37.4589,
      });
      mockPrisma.booking.findFirst.mockResolvedValue(null);
      mockPrisma.driver.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.vehicle.findFirst.mockResolvedValue({ id: VEHICLE_ID });
      mockPrisma.driver.findUnique = vi.fn().mockResolvedValue({
        id: DRIVER_ID,
        vehicles: [{ id: VEHICLE_ID }],
      });
      mockPrisma.booking.create.mockResolvedValue(makeBookingRecord());
      mockPrisma.auditLog.create.mockResolvedValue({});

      const dto = await rideRequestService.createRideRequest(PASSENGER_ID, {
        driverId: DRIVER_ID,
        subcityId: SUBCITY_ID,
        contactPhone: '0911223344',
        additionalInstructions: 'Near main gate',
      });

      expect(dto.id).toBe(REQUEST_ID);
      expect(dto.status).toBe(BookingStatus.REQUESTED);
      expect(mockPrisma.driver.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { availabilityStatus: DriverAvailabilityStatus.BUSY },
        })
      );
      expect(mockIo.to).toHaveBeenCalledWith(`driver:${DRIVER_ID}`);
      expect(mockRoomEmit).toHaveBeenCalledWith(
        'ride:request:new',
        expect.objectContaining({ id: REQUEST_ID })
      );
    });

    it('rejects concurrent or unavailable driver reservation with 409', async () => {
      mockPrisma.passenger.findFirst.mockResolvedValue({
        id: PASSENGER_ID,
        fullName: 'Selamawit Tadesse',
        accountStatus: AccountStatus.ACTIVE,
      });
      mockPrisma.subcity.findFirst.mockResolvedValue({
        id: SUBCITY_ID,
        name: 'Maraki',
        centerLatitude: 12.6074,
        centerLongitude: 37.4589,
      });
      mockPrisma.booking.findFirst.mockResolvedValue(null);
      mockPrisma.driver.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.driver.findFirst.mockResolvedValue({
        id: DRIVER_ID,
        accountStatus: AccountStatus.ACTIVE,
        verificationStatus: DriverVerificationStatus.APPROVED,
        availabilityStatus: DriverAvailabilityStatus.BUSY,
      });

      await expect(
        rideRequestService.createRideRequest(PASSENGER_ID, {
          driverId: DRIVER_ID,
          subcityId: SUBCITY_ID,
          contactPhone: '0911223344',
        })
      ).rejects.toThrow(/no longer available/i);
    });

    it('allows the assigned driver to accept a pending request and notifies the passenger', async () => {
      mockPrisma.driver.findFirst.mockResolvedValue({
        id: DRIVER_ID,
        accountStatus: AccountStatus.ACTIVE,
        verificationStatus: DriverVerificationStatus.APPROVED,
      });
      mockPrisma.booking.findUnique
        .mockResolvedValueOnce({
          id: REQUEST_ID,
          driverId: DRIVER_ID,
          passengerId: PASSENGER_ID,
          vehicleId: VEHICLE_ID,
          bookingStatus: BookingStatus.REQUESTED,
          expiresAt: new Date(Date.now() + 60_000),
          subcityId: SUBCITY_ID,
        })
        .mockResolvedValueOnce(
          makeBookingRecord({
            bookingStatus: BookingStatus.DRIVER_ASSIGNED,
            acceptedAt: new Date(),
          })
        );
      mockPrisma.booking.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.trip.upsert.mockResolvedValue({ id: 'trip-1' });
      mockPrisma.auditLog.create.mockResolvedValue({});

      const dto = await rideRequestService.acceptRideRequest(DRIVER_ID, REQUEST_ID);

      expect(dto.status).toBe(BookingStatus.DRIVER_ASSIGNED);
      expect(mockPrisma.trip.upsert).toHaveBeenCalledTimes(1);
      expect(mockIo.to).toHaveBeenCalledWith(`passenger:${PASSENGER_ID}`);
      expect(mockRoomEmit).toHaveBeenCalledWith(
        'ride:request:accepted',
        expect.objectContaining({ id: REQUEST_ID, status: BookingStatus.DRIVER_ASSIGNED })
      );
    });

    it('forbids another driver from accepting someone else’s ride request', async () => {
      mockPrisma.driver.findFirst.mockResolvedValue({
        id: '99999999-9999-4999-8999-999999999999',
        accountStatus: AccountStatus.ACTIVE,
        verificationStatus: DriverVerificationStatus.APPROVED,
      });
      mockPrisma.booking.findUnique.mockResolvedValue({
        id: REQUEST_ID,
        driverId: DRIVER_ID,
        passengerId: PASSENGER_ID,
        bookingStatus: BookingStatus.REQUESTED,
        expiresAt: new Date(Date.now() + 60_000),
      });

      await expect(
        rideRequestService.acceptRideRequest('99999999-9999-4999-8999-999999999999', REQUEST_ID)
      ).rejects.toThrow(/not authorized/i);
    });

    it('releases the driver back to AVAILABLE when rejecting a request', async () => {
      mockPrisma.booking.findUnique
        .mockResolvedValueOnce({
          id: REQUEST_ID,
          driverId: DRIVER_ID,
          passengerId: PASSENGER_ID,
          bookingStatus: BookingStatus.REQUESTED,
        })
        .mockResolvedValueOnce(
          makeBookingRecord({
            bookingStatus: BookingStatus.REJECTED,
            rejectedAt: new Date(),
            rejectionReason: 'Too far',
          })
        );
      mockPrisma.booking.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.booking.count.mockResolvedValue(0);
      mockPrisma.driver.findFirst.mockResolvedValue({
        id: DRIVER_ID,
        accountStatus: AccountStatus.ACTIVE,
        verificationStatus: DriverVerificationStatus.APPROVED,
        availabilityStatus: DriverAvailabilityStatus.BUSY,
        isSocketConnected: true,
        lastHeartbeatAt: new Date(),
      });
      mockPrisma.driver.update.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      const dto = await rideRequestService.rejectRideRequest(DRIVER_ID, REQUEST_ID, 'Too far');

      expect(dto.status).toBe(BookingStatus.REJECTED);
      expect(mockPrisma.driver.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: DRIVER_ID },
          data: { availabilityStatus: DriverAvailabilityStatus.AVAILABLE },
        })
      );
      expect(mockIo.to).toHaveBeenCalledWith(`passenger:${PASSENGER_ID}`);
      expect(mockRoomEmit).toHaveBeenCalledWith(
        'ride:request:rejected',
        expect.objectContaining({ id: REQUEST_ID })
      );
    });

    it('allows the owning passenger to cancel and releases the driver', async () => {
      mockPrisma.booking.findUnique
        .mockResolvedValueOnce({
          id: REQUEST_ID,
          passengerId: PASSENGER_ID,
          driverId: DRIVER_ID,
          bookingStatus: BookingStatus.REQUESTED,
        })
        .mockResolvedValueOnce(
          makeBookingRecord({
            bookingStatus: BookingStatus.CANCELLED,
            cancelledAt: new Date(),
            cancellationReason: 'Changed plans',
          })
        );
      mockPrisma.booking.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.booking.count.mockResolvedValue(0);
      mockPrisma.driver.findFirst.mockResolvedValue({
        id: DRIVER_ID,
        accountStatus: AccountStatus.ACTIVE,
        verificationStatus: DriverVerificationStatus.APPROVED,
        availabilityStatus: DriverAvailabilityStatus.BUSY,
        isSocketConnected: true,
        lastHeartbeatAt: new Date(),
      });
      mockPrisma.driver.update.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      const dto = await rideRequestService.cancelRideRequest(
        PASSENGER_ID,
        REQUEST_ID,
        'Changed plans'
      );

      expect(dto.status).toBe(BookingStatus.CANCELLED);
      expect(mockIo.to).toHaveBeenCalledWith(`driver:${DRIVER_ID}`);
      expect(mockRoomEmit).toHaveBeenCalledWith(
        'ride:request:cancelled',
        expect.objectContaining({ id: REQUEST_ID })
      );
    });

    it('expires timed-out pending ride requests and releases the driver', async () => {
      mockPrisma.booking.findMany.mockResolvedValue([
        {
          id: REQUEST_ID,
          passengerId: PASSENGER_ID,
          driverId: DRIVER_ID,
          subcityId: SUBCITY_ID,
        },
      ]);
      mockPrisma.booking.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.booking.count.mockResolvedValue(0);
      mockPrisma.driver.findFirst.mockResolvedValue({
        id: DRIVER_ID,
        accountStatus: AccountStatus.ACTIVE,
        verificationStatus: DriverVerificationStatus.APPROVED,
        availabilityStatus: DriverAvailabilityStatus.BUSY,
        isSocketConnected: true,
        lastHeartbeatAt: new Date(),
      });
      mockPrisma.driver.update.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      const expiredCount = await rideRequestService.expirePendingRideRequests();

      expect(expiredCount).toBe(1);
      expect(mockIo.to).toHaveBeenCalledWith(`passenger:${PASSENGER_ID}`);
      expect(mockIo.to).toHaveBeenCalledWith(`driver:${DRIVER_ID}`);
      expect(mockRoomEmit).toHaveBeenCalledWith(
        'ride:request:expired',
        expect.objectContaining({ id: REQUEST_ID, status: BookingStatus.EXPIRED })
      );
    });

    it('reconciles stale disconnected drivers back to OFFLINE', async () => {
      mockPrisma.driver.findMany.mockResolvedValue([{ id: DRIVER_ID }]);
      mockPrisma.driver.updateMany.mockResolvedValue({ count: 1 });

      const count = await rideRequestService.reconcileStaleDrivers();

      expect(count).toBe(1);
      expect(mockIo.emit).toHaveBeenCalledWith(
        'driver:availability:changed',
        expect.objectContaining({
          driverId: DRIVER_ID,
          availabilityStatus: DriverAvailabilityStatus.OFFLINE,
        })
      );
    });
  });

  describe('Socket.IO room isolation & reconnect sync', () => {
    it('joins passenger socket exclusively to passenger room', async () => {
      const socket: any = {
        id: 'sock-pass-1',
        join: vi.fn(),
        emit: vi.fn(),
        on: vi.fn(),
      };

      await registerRideSocketConnection(socket, {
        sub: PASSENGER_ID,
        role: 'PASSENGER',
      } as any);

      expect(socket.join).toHaveBeenCalledTimes(1);
      expect(socket.join).toHaveBeenCalledWith(`passenger:${PASSENGER_ID}`);
    });

    it('joins driver socket to driver room and emits session reconnect snapshot', async () => {
      const socket: any = {
        id: 'sock-drv-1',
        join: vi.fn(),
        emit: vi.fn(),
        on: vi.fn(),
      };
      mockPrisma.driver.update.mockResolvedValue({});
      mockPrisma.driver.findFirst.mockResolvedValue({
        id: DRIVER_ID,
        availabilityStatus: DriverAvailabilityStatus.AVAILABLE,
        accountStatus: AccountStatus.ACTIVE,
        verificationStatus: DriverVerificationStatus.APPROVED,
      });
      mockPrisma.booking.findFirst.mockResolvedValue(null);

      await registerRideSocketConnection(socket, {
        sub: DRIVER_ID,
        role: 'DRIVER',
      } as any);

      expect(socket.join).toHaveBeenCalledWith(`driver:${DRIVER_ID}`);
      expect(socket.emit).toHaveBeenCalledWith(
        'driver:session:reconnected',
        expect.objectContaining({
          availabilityStatus: DriverAvailabilityStatus.AVAILABLE,
          activeRequest: null,
        })
      );
    });
  });
});
