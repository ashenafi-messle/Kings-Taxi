import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPrismaClient } = vi.hoisted(() => {
  const mock: any = {
    passenger: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    booking: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    payment: {
      findMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    },
    hotelBooking: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    heritageTourBooking: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    refreshToken: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  };
  mock.$transaction = vi.fn((cb: any) => cb(mock));
  return { mockPrismaClient: mock };
});

vi.mock('../../src/core/database/prisma', () => ({
  prisma: mockPrismaClient,
  isDbConnectionError: vi.fn(() => false),
  withDbTimeout: vi.fn((p) => p),
}));

import { adminPassengerService } from '../../src/modules/passengers/adminPassenger.service';
import { AuthService } from '../../src/modules/auth/auth.service';
import { AccountStatus } from '@prisma/client';

const authService = new AuthService();

describe('Admin Passenger Management Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockPassengerRecord = {
    id: 'f87a82b4-5c91-4cf5-b1a9-9831d10e5271',
    fullName: 'Abebe Bikila',
    email: 'abebe.bikila@kings-taxi.com',
    phoneNumber: '+251911223344',
    profileImage: 'https://res.cloudinary.com/kings/image/upload/v1/pax-1.jpg',
    isVerified: true,
    accountStatus: AccountStatus.ACTIVE,
    city: 'Gondar',
    language: 'EN',
    emergencyContactName: 'Almaz Ayana',
    emergencyContactPhone: '+251911998877',
    suspensionReason: null,
    suspendedAt: null,
    createdAt: new Date('2026-01-15T10:00:00Z'),
    updatedAt: new Date('2026-02-01T12:00:00Z'),
    _count: {
      bookings: 12,
      payments: 10,
      hotelBookings: 2,
      heritageTourBookings: 1,
    },
    bookings: [
      {
        createdAt: new Date('2026-02-01T12:00:00Z'),
      },
    ],
    payments: [
      { amount: 150 },
      { amount: 250 },
    ],
  };

  it('1. retrieves paginated passenger list with search, status filtering and spend calculation', async () => {
    mockPrismaClient.passenger.count.mockResolvedValueOnce(1);
    mockPrismaClient.passenger.findMany.mockResolvedValueOnce([mockPassengerRecord]);

    const result = await adminPassengerService.listPassengers({
      search: 'Abebe',
      accountStatus: 'ACTIVE',
      page: 1,
      limit: 10,
    });

    expect(result).toBeDefined();
    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].fullName).toBe('Abebe Bikila');
    expect(result.items[0].passengerId).toBe('PAX-F87A82B4');
    expect(result.items[0].totalSpentETB).toBe(400);
    expect(result.items[0].accountStatus).toBe(AccountStatus.ACTIVE);
    expect(mockPrismaClient.passenger.findMany).toHaveBeenCalledTimes(1);
  });

  it('2. filters passengers by phone number and registration date range', async () => {
    mockPrismaClient.passenger.count.mockResolvedValueOnce(1);
    mockPrismaClient.passenger.findMany.mockResolvedValueOnce([mockPassengerRecord]);

    const result = await adminPassengerService.listPassengers({
      search: '+251911223344',
      fromDate: '2026-01-01',
      toDate: '2026-02-28',
    });

    expect(result.items[0].phone).toBe('+251911223344');
    expect(mockPrismaClient.passenger.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: expect.any(Object),
        }),
      })
    );
  });

  it('3. calculates dashboard statistics from PostgreSQL counts', async () => {
    mockPrismaClient.passenger.count
      .mockResolvedValueOnce(100) // total
      .mockResolvedValueOnce(85)  // active
      .mockResolvedValueOnce(5)   // suspended
      .mockResolvedValueOnce(10)  // pending
      .mockResolvedValueOnce(70)  // verified
      .mockResolvedValueOnce(4)   // today
      .mockResolvedValueOnce(25)  // month
      .mockResolvedValueOnce(100); // year

    const stats = await adminPassengerService.getPassengerStatistics();

    expect(stats.totalPassengers).toBe(100);
    expect(stats.activePassengers).toBe(85);
    expect(stats.suspendedPassengers).toBe(5);
    expect(stats.verifiedPassengers).toBe(70);
    expect(stats.newRegistrationsToday).toBe(4);
  });

  it('4. retrieves comprehensive 360-degree passenger profile with lifetime statistics', async () => {
    mockPrismaClient.passenger.findUnique.mockResolvedValueOnce({
      ...mockPassengerRecord,
      bookings: [
        {
          id: 'book-1',
          bookingReference: 'KT-RIDE-001',
          pickupLocation: 'Piazza, Gondar',
          destinationLocation: 'Fasil Ghebbi Gate',
          estimatedFare: 150,
          finalFare: 150,
          currency: 'ETB',
          bookingStatus: 'COMPLETED',
          createdAt: new Date(),
          driver: { id: 'd-1', fullName: 'Kassahun Driver', phoneNumber: '+251918001122' },
          vehicle: { id: 'v-1', plateNumber: '3-A42159-ET', make: 'Toyota', vehicleModel: 'Corolla' },
          payment: { amount: 150, paymentStatus: 'SUCCESS' },
        },
      ],
      payments: [
        {
          id: 'pay-1',
          transactionReference: 'TX-987654',
          amount: 150,
          currency: 'ETB',
          paymentMethod: 'TELEBIRR',
          paymentStatus: 'SUCCESS',
          createdAt: new Date(),
        },
      ],
      auditLogs: [
        {
          id: 'aud-1',
          action: 'PASSENGER_STATUS_CHANGE',
          actorType: 'ADMIN',
          actorId: 'admin@kings-taxi.com',
          metadata: { reason: 'Initial activation' },
          createdAt: new Date(),
        },
      ],
    });

    mockPrismaClient.booking.count
      .mockResolvedValueOnce(10) // completed
      .mockResolvedValueOnce(2);  // cancelled

    mockPrismaClient.payment.aggregate.mockResolvedValueOnce({
      _sum: { amount: 3500 },
      _count: 10,
    });

    const profile = await adminPassengerService.getPassengerById('f87a82b4-5c91-4cf5-b1a9-9831d10e5271');

    expect(profile).toBeDefined();
    expect(profile.fullName).toBe('Abebe Bikila');
    expect(profile.statistics.totalRides).toBe(12);
    expect(profile.statistics.completedRides).toBe(10);
    expect(profile.statistics.cancelledRides).toBe(2);
    expect(profile.statistics.totalSpentETB).toBe(3500);
    expect(profile.recentRides).toHaveLength(1);
    expect(profile.recentPayments).toHaveLength(1);
    expect(profile.auditHistory).toHaveLength(1);
  });

  it('5. retrieves paginated passenger ride history', async () => {
    mockPrismaClient.passenger.findUnique.mockResolvedValueOnce({ id: 'f87a82b4-5c91-4cf5-b1a9-9831d10e5271' });
    mockPrismaClient.booking.count.mockResolvedValueOnce(1);
    mockPrismaClient.booking.findMany.mockResolvedValueOnce([
      {
        id: 'book-1',
        bookingReference: 'KT-RIDE-001',
        serviceType: 'RIDE_HAILING',
        bookingStatus: 'COMPLETED',
        pickupLocation: 'Maraki Campus',
        destinationLocation: 'Gondar Airport',
        estimatedDistanceMeters: 14500,
        estimatedDurationSeconds: 1500,
        estimatedFare: 450,
        finalFare: 450,
        currency: 'ETB',
        acceptedAt: new Date(),
        startedAt: new Date(),
        trip: { completedAt: new Date() },
        createdAt: new Date(),
        driver: { id: 'd-1', fullName: 'Solomon', phoneNumber: '+251911', rating: 4.9 },
        vehicle: { id: 'v-1', plateNumber: '3-B12345-ET', make: 'Toyota', vehicleModel: 'Prado', categoryName: 'Tourism 4WD' },
        payment: { id: 'p-1', transactionReference: 'TX-1', paymentMethod: 'CASH', paymentStatus: 'SUCCESS', amount: 450, paidAt: new Date() },
      },
    ]);

    const rides = await adminPassengerService.getPassengerRides('f87a82b4-5c91-4cf5-b1a9-9831d10e5271');

    expect(rides.total).toBe(1);
    expect(rides.items[0].distanceKm).toBe(14.5);
    expect(rides.items[0].driver?.name).toBe('Solomon');
    expect(rides.items[0].vehicle?.category).toBe('Tourism 4WD');
  });

  it('6. retrieves unified hotel and heritage tour bookings for a passenger', async () => {
    mockPrismaClient.passenger.findUnique.mockResolvedValueOnce({ id: 'f87a82b4-5c91-4cf5-b1a9-9831d10e5271' });

    mockPrismaClient.hotelBooking.findMany.mockResolvedValueOnce([
      {
        id: 'hb-1',
        bookingReference: 'KT-HOTEL-99',
        hotel: { id: 'h-1', name: 'Goha Hotel Gondar', city: 'Gondar', address: 'Hilltop' },
        checkInDate: new Date('2026-03-01'),
        bookingStatus: 'CONFIRMED',
        grandTotal: 2800,
        currency: 'ETB',
        paymentStatus: 'SUCCESS',
        createdAt: new Date('2026-02-15'),
      },
    ]);

    mockPrismaClient.heritageTourBooking.findMany.mockResolvedValueOnce([
      {
        id: 'htb-1',
        bookingReference: 'KT-TOUR-55',
        package: { id: 's-1', name: 'Fasil Ghebbi Castles' },
        scheduledDate: new Date('2026-03-02'),
        adults: 2,
        children: 1,
        bookingStatus: 'UPCOMING',
        totalAmount: 1500,
        currency: 'ETB',
        paymentStatus: 'SUCCESS',
        createdAt: new Date('2026-02-16'),
      },
    ]);

    mockPrismaClient.booking.findMany.mockResolvedValueOnce([]);

    const bookings = await adminPassengerService.getPassengerBookings('f87a82b4-5c91-4cf5-b1a9-9831d10e5271');

    expect(bookings.total).toBe(2);
    expect(bookings.items[0].type).toBe('HERITAGE'); // newer date first
    expect(bookings.items[1].type).toBe('HOTEL');
    expect(bookings.items[1].amount).toBe(2800);
  });

  it('7. retrieves passenger payment ledger records', async () => {
    mockPrismaClient.passenger.findUnique.mockResolvedValueOnce({ id: 'f87a82b4-5c91-4cf5-b1a9-9831d10e5271' });
    mockPrismaClient.payment.count.mockResolvedValueOnce(1);
    mockPrismaClient.payment.findMany.mockResolvedValueOnce([
      {
        id: 'p-uuid-1',
        transactionReference: 'TX-PAY-888',
        gatewayReference: 'CHAPA-REF-1234',
        paymentType: 'TAXI_RIDE',
        paymentMethod: 'TELEBIRR',
        paymentStatus: 'SUCCESS',
        amount: 320,
        currency: 'ETB',
        paidAt: new Date(),
        createdAt: new Date(),
        booking: {
          bookingReference: 'KT-RIDE-001',
          pickupLocation: 'Piazza',
          destinationLocation: 'Airport',
        },
        hotelBooking: null,
        heritageTourBooking: null,
      },
    ]);

    const payments = await adminPassengerService.getPassengerPayments('f87a82b4-5c91-4cf5-b1a9-9831d10e5271');

    expect(payments.total).toBe(1);
    expect(payments.items[0].transactionReference).toBe('TX-PAY-888');
    expect(payments.items[0].relatedItem).toContain('Ride: Piazza → Airport');
  });

  it('8. suspends passenger account with mandatory reason, revokes sessions, and records audit history', async () => {
    mockPrismaClient.passenger.findUnique.mockResolvedValueOnce({
      ...mockPassengerRecord,
      accountStatus: AccountStatus.ACTIVE,
    });

    mockPrismaClient.passenger.update.mockResolvedValueOnce({
      ...mockPassengerRecord,
      accountStatus: AccountStatus.SUSPENDED,
      suspensionReason: 'Suspicious payment dispute activity',
    });

    mockPrismaClient.refreshToken.updateMany.mockResolvedValueOnce({ count: 2 });
    mockPrismaClient.auditLog.create.mockResolvedValueOnce({ id: 'aud-new' });

    // Subsequent findUnique in getPassengerById
    mockPrismaClient.passenger.findUnique.mockResolvedValueOnce({
      ...mockPassengerRecord,
      accountStatus: AccountStatus.SUSPENDED,
      suspensionReason: 'Suspicious payment dispute activity',
      bookings: [],
      payments: [],
      auditLogs: [],
    });
    mockPrismaClient.booking.count.mockResolvedValue(0);
    mockPrismaClient.payment.aggregate.mockResolvedValue({ _sum: { amount: 0 }, _count: 0 });

    const updated = await adminPassengerService.updatePassengerStatus(
      'f87a82b4-5c91-4cf5-b1a9-9831d10e5271',
      {
        status: AccountStatus.SUSPENDED,
        reason: 'Suspicious payment dispute activity',
      },
      'superadmin@kings-taxi.com',
      { ipAddress: '197.156.10.5', userAgent: 'AdminPortal/Chrome' }
    );

    expect(updated.accountStatus).toBe(AccountStatus.SUSPENDED);
    expect(mockPrismaClient.passenger.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'f87a82b4-5c91-4cf5-b1a9-9831d10e5271' },
        data: expect.objectContaining({
          accountStatus: AccountStatus.SUSPENDED,
          suspensionReason: 'Suspicious payment dispute activity',
          suspendedAt: expect.any(Date),
        }),
      })
    );

    // Verifies immediate session invalidation
    expect(mockPrismaClient.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { passengerId: 'f87a82b4-5c91-4cf5-b1a9-9831d10e5271', isRevoked: false },
          ]),
        }),
        data: expect.objectContaining({
          isRevoked: true,
          revokedAt: expect.any(Date),
        }),
      })
    );

    // Verifies audit log creation
    expect(mockPrismaClient.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'PASSENGER_STATUS_CHANGE',
          actorId: 'superadmin@kings-taxi.com',
          actorType: 'ADMIN',
          entityType: 'PASSENGER',
          entityId: 'f87a82b4-5c91-4cf5-b1a9-9831d10e5271',
        }),
      })
    );
  });

  it('9. rejects suspension when reason is omitted with HTTP 400 validation error', async () => {
    mockPrismaClient.passenger.findUnique.mockResolvedValueOnce({
      ...mockPassengerRecord,
      accountStatus: AccountStatus.ACTIVE,
    });

    await expect(
      adminPassengerService.updatePassengerStatus(
        'f87a82b4-5c91-4cf5-b1a9-9831d10e5271',
        { status: AccountStatus.SUSPENDED, reason: '' },
        'admin@kings-taxi.com'
      )
    ).rejects.toMatchObject({
      statusCode: 400,
      code: 'SUSPENSION_REASON_REQUIRED',
    });
  });

  it('10. throws 404 AppError when passenger is not found', async () => {
    mockPrismaClient.passenger.findUnique.mockResolvedValueOnce(null);

    await expect(
      adminPassengerService.getPassengerById('00000000-0000-0000-0000-000000000000')
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'PASSENGER_NOT_FOUND',
    });
  });

  it('11. mobile login compatibility: denies login for suspended passenger with 403 ACCOUNT_SUSPENDED', async () => {
    mockPrismaClient.passenger.findFirst.mockResolvedValueOnce({
      id: 'pax-suspended-1',
      fullName: 'Suspended Passenger',
      email: 'suspended@test.com',
      phoneNumber: '+251911000999',
      passwordHash: 'dummyhash:dummysalt',
      accountStatus: AccountStatus.SUSPENDED,
    });

    await expect(
      authService.login('+251911000999', 'Password123!', 'dev-1', 'ANDROID')
    ).rejects.toMatchObject({
      statusCode: 403,
      code: 'ACCOUNT_SUSPENDED',
    });
  });

  it('12. mobile token refresh compatibility: denies refresh token exchange for suspended passenger', async () => {
    mockPrismaClient.refreshToken.findUnique.mockResolvedValueOnce({
      id: 'rt-1',
      tokenHash: 'somehash',
      isRevoked: false,
      expiresAt: new Date(Date.now() + 100000),
      passenger: {
        id: 'pax-suspended-1',
        accountStatus: AccountStatus.SUSPENDED,
      },
    });

    await expect(authService.refreshTokens('rt_raw_token_test')).rejects.toMatchObject({
      statusCode: 403,
      code: 'ACCOUNT_SUSPENDED',
    });
  });
});
