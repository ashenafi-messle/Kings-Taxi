import { prisma } from '../../core/database/prisma';
import { logger } from '../../core/logging/logger';
import { AppError } from '../../core/errors/appError';
import {
  AccountStatus,
  ActorType,
  BookingStatus,
  PaymentStatus,
  Prisma,
} from '@prisma/client';

export interface ListPassengersParams {
  search?: string;
  accountStatus?: string;
  isVerified?: string | boolean;
  city?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UpdatePassengerStatusDto {
  status: AccountStatus;
  reason?: string;
}

export class AdminPassengerService {
  /**
   * Retrieves a paginated list of passengers with search, filters, and lifetime activity metrics
   */
  async listPassengers(params: ListPassengersParams = {}) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.PassengerWhereInput = {};

    // Search by name, email, phone, or ID
    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      where.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phoneNumber: { contains: q, mode: 'insensitive' } },
      ];
      // Check if search matches UUID
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q)) {
        where.OR.push({ id: q });
      }
    }

    // Filter by account status
    if (params.accountStatus && params.accountStatus !== 'ALL') {
      where.accountStatus = params.accountStatus as AccountStatus;
    }

    // Filter by verification status
    if (params.isVerified !== undefined && params.isVerified !== 'ALL') {
      where.isVerified = params.isVerified === true || params.isVerified === 'true';
    }

    // Filter by city
    if (params.city && params.city !== 'ALL') {
      where.city = { contains: params.city.trim(), mode: 'insensitive' };
    }

    // Filter by registration date range
    if (params.fromDate || params.toDate) {
      where.createdAt = {};
      if (params.fromDate) {
        where.createdAt.gte = new Date(params.fromDate);
      }
      if (params.toDate) {
        const to = new Date(params.toDate);
        to.setHours(23, 59, 59, 999);
        where.createdAt.lte = to;
      }
    }

    // Determine sorting
    const orderBy: Prisma.PassengerOrderByWithRelationInput = {};
    const sortField = params.sortBy || 'createdAt';
    const sortDirection = params.sortOrder === 'asc' ? 'asc' : 'desc';

    if (sortField === 'fullName') {
      orderBy.fullName = sortDirection;
    } else if (sortField === 'updatedAt') {
      orderBy.updatedAt = sortDirection;
    } else {
      orderBy.createdAt = sortDirection;
    }

    const [total, passengers] = await Promise.all([
      prisma.passenger.count({ where }),
      prisma.passenger.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          fullName: true,
          email: true,
          phoneNumber: true,
          profileImage: true,
          isVerified: true,
          accountStatus: true,
          city: true,
          language: true,
          emergencyContactName: true,
          emergencyContactPhone: true,
          suspensionReason: true,
          suspendedAt: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              bookings: true,
              payments: { where: { paymentStatus: PaymentStatus.SUCCESS } },
              hotelBookings: true,
              heritageTourBookings: true,
            },
          },
          bookings: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              createdAt: true,
            },
          },
          payments: {
            where: { paymentStatus: PaymentStatus.SUCCESS },
            select: {
              amount: true,
            },
          },
        },
      }),
    ]);

    const items = passengers.map((p) => {
      const totalSpentETB = p.payments.reduce((sum, pay) => sum + Number(pay.amount || 0), 0);
      const totalRides = p._count.bookings;
      const lastTripAt = p.bookings[0]?.createdAt ? p.bookings[0].createdAt.toISOString() : undefined;

      // Extract passengerId display token from uuid or prefix
      const passengerIdDisplay = `PAX-${p.id.slice(0, 8).toUpperCase()}`;

      return {
        id: p.id,
        passengerId: passengerIdDisplay,
        fullName: p.fullName,
        email: p.email || '',
        phone: p.phoneNumber || '',
        phoneNumber: p.phoneNumber || '',
        avatarUrl: p.profileImage || undefined,
        profileImage: p.profileImage || undefined,
        accountStatus: p.accountStatus,
        isVerified: p.isVerified,
        isEmailVerified: p.isVerified && !!p.email,
        isPhoneVerified: p.isVerified && !!p.phoneNumber,
        registeredCity: p.city,
        city: p.city,
        language: p.language,
        totalRides,
        totalTripsTaken: totalRides,
        completedRides: totalRides,
        totalSpentETB,
        hotelBookingsCount: p._count.hotelBookings,
        heritageBookingsCount: p._count.heritageTourBookings,
        rating: 5.0,
        lastTripAt,
        lastActiveAt: lastTripAt || p.updatedAt.toISOString(),
        suspensionReason: p.suspensionReason || undefined,
        suspendedAt: p.suspendedAt ? p.suspendedAt.toISOString() : undefined,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      };
    });

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Retrieves dashboard statistics derived from real PostgreSQL records
   */
  async getPassengerStatistics() {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const startOfYear = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);

    const [
      totalPassengers,
      activePassengers,
      suspendedPassengers,
      pendingVerification,
      verifiedPassengers,
      newRegistrationsToday,
      newRegistrationsThisMonth,
      newRegistrationsThisYear,
    ] = await Promise.all([
      prisma.passenger.count(),
      prisma.passenger.count({ where: { accountStatus: AccountStatus.ACTIVE } }),
      prisma.passenger.count({ where: { accountStatus: AccountStatus.SUSPENDED } }),
      prisma.passenger.count({ where: { accountStatus: AccountStatus.PENDING_VERIFICATION } }),
      prisma.passenger.count({ where: { isVerified: true } }),
      prisma.passenger.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.passenger.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.passenger.count({ where: { createdAt: { gte: startOfYear } } }),
    ]);

    return {
      totalPassengers,
      activePassengers,
      suspendedPassengers,
      pendingVerification,
      verifiedPassengers,
      newRegistrationsToday,
      newRegistrationsThisMonth,
      newRegistrationsThisYear,
    };
  }

  /**
   * Retrieves comprehensive 360-degree passenger profile with lifetime statistics
   */
  async getPassengerById(passengerId: string) {
    const passenger = await prisma.passenger.findUnique({
      where: { id: passengerId },
      include: {
        _count: {
          select: {
            bookings: true,
            payments: true,
            hotelBookings: true,
            heritageTourBookings: true,
            loungeReservations: true,
            supportTickets: true,
          },
        },
        bookings: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            trip: true,
            driver: {
              select: {
                id: true,
                fullName: true,
                phoneNumber: true,
              },
            },
            vehicle: {
              select: {
                id: true,
                plateNumber: true,
                make: true,
                vehicleModel: true,
              },
            },
            payment: true,
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!passenger) {
      throw new AppError('Passenger not found', 404, 'PASSENGER_NOT_FOUND');
    }

    // Compute ride statistics
    const [completedBookings, cancelledBookings] = await Promise.all([
      prisma.booking.count({
        where: {
          passengerId,
          bookingStatus: BookingStatus.TRIP_COMPLETED,
        },
      }),
      prisma.booking.count({
        where: {
          passengerId,
          bookingStatus: BookingStatus.CANCELLED,
        },
      }),
    ]);

    // Compute total spend
    const paymentAggregations = await prisma.payment.aggregate({
      where: {
        passengerId,
        paymentStatus: PaymentStatus.SUCCESS,
      },
      _sum: {
        amount: true,
      },
      _count: true,
    });

    const totalSpentETB = Number(paymentAggregations._sum.amount || 0);
    const totalRides = passenger._count.bookings;
    const cancellationRate = totalRides > 0 ? (cancelledBookings / totalRides) * 100 : 0;
    const passengerIdDisplay = `PAX-${passenger.id.slice(0, 8).toUpperCase()}`;

    return {
      id: passenger.id,
      passengerId: passengerIdDisplay,
      fullName: passenger.fullName,
      email: passenger.email || '',
      phone: passenger.phoneNumber || '',
      phoneNumber: passenger.phoneNumber || '',
      avatarUrl: passenger.profileImage || undefined,
      profileImage: passenger.profileImage || undefined,
      accountStatus: passenger.accountStatus,
      isVerified: passenger.isVerified,
      isEmailVerified: passenger.isVerified && !!passenger.email,
      isPhoneVerified: passenger.isVerified && !!passenger.phoneNumber,
      registeredCity: passenger.city,
      city: passenger.city,
      language: passenger.language,
      emergencyContactName: passenger.emergencyContactName || undefined,
      emergencyContactPhone: passenger.emergencyContactPhone || undefined,
      suspensionReason: passenger.suspensionReason || undefined,
      suspendedAt: passenger.suspendedAt ? passenger.suspendedAt.toISOString() : undefined,
      createdAt: passenger.createdAt.toISOString(),
      updatedAt: passenger.updatedAt.toISOString(),

      // Lifetime Statistics
      statistics: {
        totalRides,
        completedRides: completedBookings,
        cancelledRides: cancelledBookings,
        cancellationRate: Math.round(cancellationRate * 10) / 10,
        hotelBookingsCount: passenger._count.hotelBookings,
        heritageBookingsCount: passenger._count.heritageTourBookings,
        loungeReservationsCount: passenger._count.loungeReservations,
        supportTicketsCount: passenger._count.supportTickets,
        totalSpentETB,
        successfulPaymentsCount: paymentAggregations._count,
        rating: 5.0,
      },

      // Recent Records Preview
      recentRides: passenger.bookings.map((b) => ({
        id: b.id,
        bookingReference: b.bookingReference,
        pickupLocation: b.pickupLocation,
        destinationLocation: b.destinationLocation,
        fare: b.finalFare ? Number(b.finalFare) : Number(b.estimatedFare),
        currency: b.currency,
        status: b.bookingStatus,
        driverName: b.driver?.fullName || 'Not assigned',
        driverPhone: b.driver?.phoneNumber || '',
        vehiclePlate: b.vehicle?.plateNumber || '',
        vehicleModel: b.vehicle ? `${b.vehicle.make} ${b.vehicle.vehicleModel}` : '',
        createdAt: b.createdAt.toISOString(),
      })),
      recentPayments: passenger.payments.map((p) => ({
        id: p.id,
        transactionReference: p.transactionReference,
        amount: Number(p.amount),
        currency: p.currency,
        paymentMethod: p.paymentMethod,
        paymentStatus: p.paymentStatus,
        createdAt: p.createdAt.toISOString(),
      })),
      auditHistory: passenger.auditLogs.map((a) => ({
        id: a.id,
        action: a.action,
        actorType: a.actorType,
        actorId: a.actorId,
        metadata: a.metadata,
        createdAt: a.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Retrieves paginated ride hailing history for a specific passenger
   */
  async getPassengerRides(passengerId: string, params: { page?: number; limit?: number; status?: string } = {}) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 10));
    const skip = (page - 1) * limit;

    // Verify passenger existence
    const passenger = await prisma.passenger.findUnique({
      where: { id: passengerId },
      select: { id: true },
    });
    if (!passenger) {
      throw new AppError('Passenger not found', 404, 'PASSENGER_NOT_FOUND');
    }

    const where: Prisma.BookingWhereInput = {
      passengerId,
    };

    if (params.status && params.status !== 'ALL') {
      where.bookingStatus = params.status as BookingStatus;
    }

    const [total, bookings] = await Promise.all([
      prisma.booking.count({ where }),
      prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          trip: true,
          driver: {
            select: {
              id: true,
              fullName: true,
              phoneNumber: true,
              rating: true,
            },
          },
          vehicle: {
            select: {
              id: true,
              plateNumber: true,
              make: true,
              vehicleModel: true,
              vehicleType: true,
              categoryName: true,
            },
          },
          payment: {
            select: {
              id: true,
              transactionReference: true,
              paymentMethod: true,
              paymentStatus: true,
              amount: true,
              paidAt: true,
            },
          },
        },
      }),
    ]);

    const items = bookings.map((b) => ({
      id: b.id,
      bookingReference: b.bookingReference,
      serviceType: b.serviceType,
      bookingStatus: b.bookingStatus,
      pickupLocation: b.pickupLocation,
      destinationLocation: b.destinationLocation,
      pickupLatitude: b.pickupLatitude,
      pickupLongitude: b.pickupLongitude,
      destinationLatitude: b.destinationLatitude,
      destinationLongitude: b.destinationLongitude,
      estimatedDistanceMeters: b.estimatedDistanceMeters,
      estimatedDurationSeconds: b.estimatedDurationSeconds,
      distanceKm: b.estimatedDistanceMeters ? Math.round((b.estimatedDistanceMeters / 1000) * 10) / 10 : null,
      fare: b.finalFare ? Number(b.finalFare) : Number(b.estimatedFare),
      currency: b.currency,
      acceptedAt: b.acceptedAt ? b.acceptedAt.toISOString() : null,
      startedAt: b.startedAt ? b.startedAt.toISOString() : null,
      completedAt: b.trip?.completedAt ? b.trip.completedAt.toISOString() : null,
      createdAt: b.createdAt.toISOString(),
      driver: b.driver
        ? {
            id: b.driver.id,
            name: b.driver.fullName,
            phone: b.driver.phoneNumber,
            rating: Number(b.driver.rating || 5.0),
          }
        : null,
      vehicle: b.vehicle
        ? {
            id: b.vehicle.id,
            plateNumber: b.vehicle.plateNumber,
            model: `${b.vehicle.make} ${b.vehicle.vehicleModel}`,
            category: b.vehicle.categoryName || b.vehicle.vehicleType,
          }
        : null,
      payment: b.payment
        ? {
            id: b.payment.id,
            transactionReference: b.payment.transactionReference,
            paymentMethod: b.payment.paymentMethod,
            paymentStatus: b.payment.paymentStatus,
            amount: Number(b.payment.amount),
            paidAt: b.payment.paidAt ? b.payment.paidAt.toISOString() : null,
          }
        : null,
    }));

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Retrieves unified cross-service bookings (Hotel, Heritage, Lounge, and Rides) for a passenger
   */
  async getPassengerBookings(passengerId: string, params: { page?: number; limit?: number; type?: string } = {}) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 10));

    const passenger = await prisma.passenger.findUnique({
      where: { id: passengerId },
      select: { id: true },
    });
    if (!passenger) {
      throw new AppError('Passenger not found', 404, 'PASSENGER_NOT_FOUND');
    }

    const typeFilter = params.type || 'ALL';

    const [hotelBookings, heritageBookings, rideBookings] = await Promise.all([
      typeFilter === 'ALL' || typeFilter === 'HOTEL'
        ? prisma.hotelBooking.findMany({
            where: { passengerId },
            include: {
              hotel: { select: { id: true, name: true, city: true, address: true } },
              payment: true,
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
          })
        : Promise.resolve([]),
      typeFilter === 'ALL' || typeFilter === 'HERITAGE'
        ? prisma.heritageTourBooking.findMany({
            where: { passengerId },
            include: {
              package: { select: { id: true, name: true } },
              payment: true,
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
          })
        : Promise.resolve([]),
      typeFilter === 'ALL' || typeFilter === 'RIDE'
        ? prisma.booking.findMany({
            where: { passengerId },
            include: {
              driver: { select: { fullName: true } },
              vehicle: { select: { plateNumber: true, make: true, vehicleModel: true } },
              payment: true,
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
          })
        : Promise.resolve([]),
    ]);

    const unifiedItems: Array<{
      id: string;
      reference: string;
      type: 'HOTEL' | 'HERITAGE' | 'RIDE';
      title: string;
      subtitle: string;
      status: string;
      amount: number;
      currency: string;
      paymentStatus: string;
      date: string;
    }> = [];

    for (const h of hotelBookings) {
      unifiedItems.push({
        id: h.id,
        reference: h.bookingReference,
        type: 'HOTEL',
        title: h.hotel.name,
        subtitle: `Hotel Stay • Check-in: ${h.checkInDate.toISOString().split('T')[0]}`,
        status: h.bookingStatus,
        amount: Number(h.grandTotal),
        currency: h.currency,
        paymentStatus: h.paymentStatus,
        date: h.createdAt.toISOString(),
      });
    }

    for (const t of heritageBookings) {
      unifiedItems.push({
        id: t.id,
        reference: t.bookingReference,
        type: 'HERITAGE',
        title: t.package?.name || 'Heritage Tour',
        subtitle: `Tour Date: ${t.scheduledDate.toISOString().split('T')[0]} • ${t.adults + t.children} guests`,
        status: t.bookingStatus,
        amount: Number(t.totalAmount),
        currency: t.currency,
        paymentStatus: t.paymentStatus,
        date: t.createdAt.toISOString(),
      });
    }

    for (const r of rideBookings) {
      unifiedItems.push({
        id: r.id,
        reference: r.bookingReference,
        type: 'RIDE',
        title: `${r.pickupLocation} → ${r.destinationLocation}`,
        subtitle: r.driver ? `Driver: ${r.driver.fullName} (${r.vehicle?.plateNumber || ''})` : 'Ride Hailing',
        status: r.bookingStatus,
        amount: Number(r.finalFare || r.estimatedFare),
        currency: r.currency,
        paymentStatus: r.payment?.paymentStatus || 'PENDING',
        date: r.createdAt.toISOString(),
      });
    }

    // Sort combined records descending by date
    unifiedItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const total = unifiedItems.length;
    const skip = (page - 1) * limit;
    const paginatedItems = unifiedItems.slice(skip, skip + limit);
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items: paginatedItems,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Retrieves paginated payment ledger records for a passenger
   */
  async getPassengerPayments(passengerId: string, params: { page?: number; limit?: number; status?: string } = {}) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 10));
    const skip = (page - 1) * limit;

    const passenger = await prisma.passenger.findUnique({
      where: { id: passengerId },
      select: { id: true },
    });
    if (!passenger) {
      throw new AppError('Passenger not found', 404, 'PASSENGER_NOT_FOUND');
    }

    const where: Prisma.PaymentWhereInput = {
      passengerId,
    };

    if (params.status && params.status !== 'ALL') {
      where.paymentStatus = params.status as PaymentStatus;
    }

    const [total, payments] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          booking: {
            select: {
              bookingReference: true,
              pickupLocation: true,
              destinationLocation: true,
            },
          },
          hotelBooking: {
            select: {
              bookingReference: true,
              hotel: { select: { name: true } },
            },
          },
          heritageTourBooking: {
            select: {
              bookingReference: true,
              package: { select: { name: true } },
            },
          },
        },
      }),
    ]);

    const items = payments.map((p) => {
      let relatedItem = 'General Ride Payment';
      if (p.booking) {
        relatedItem = `Ride: ${p.booking.pickupLocation} → ${p.booking.destinationLocation} (${p.booking.bookingReference})`;
      } else if (p.hotelBooking) {
        relatedItem = `Hotel: ${p.hotelBooking.hotel?.name || 'Hotel'} (${p.hotelBooking.bookingReference})`;
      } else if (p.heritageTourBooking) {
        relatedItem = `Tour: ${p.heritageTourBooking.package?.name || 'Heritage Tour'} (${p.heritageTourBooking.bookingReference})`;
      }

      return {
        id: p.id,
        transactionReference: p.transactionReference,
        gatewayReference: p.gatewayReference || null,
        paymentType: p.paymentType,
        paymentMethod: p.paymentMethod,
        paymentStatus: p.paymentStatus,
        amount: Number(p.amount),
        currency: p.currency,
        relatedItem,
        paidAt: p.paidAt ? p.paidAt.toISOString() : null,
        createdAt: p.createdAt.toISOString(),
      };
    });

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Updates passenger account status (ACTIVE, SUSPENDED, PENDING_VERIFICATION)
   * Enforces suspension reason, revokes active refresh tokens, and writes audit history
   */
  async updatePassengerStatus(
    passengerId: string,
    dto: UpdatePassengerStatusDto,
    adminIdentifier: string,
    reqMeta?: { ipAddress?: string; userAgent?: string }
  ) {
    const passenger = await prisma.passenger.findUnique({
      where: { id: passengerId },
    });
    if (!passenger) {
      throw new AppError('Passenger not found', 404, 'PASSENGER_NOT_FOUND');
    }

    const { status: newStatus, reason } = dto;

    const allowedStatuses: AccountStatus[] = [
      AccountStatus.ACTIVE,
      AccountStatus.SUSPENDED,
      AccountStatus.PENDING_VERIFICATION,
    ];

    if (!allowedStatuses.includes(newStatus)) {
      throw new AppError(
        `Invalid status '${newStatus}'. Allowed values: ACTIVE, SUSPENDED, PENDING_VERIFICATION`,
        400,
        'INVALID_STATUS'
      );
    }

    if (newStatus === AccountStatus.SUSPENDED && (!reason || !reason.trim())) {
      throw new AppError('A valid reason is required to suspend a passenger account.', 400, 'SUSPENSION_REASON_REQUIRED');
    }

    const oldStatus = passenger.accountStatus;

    await prisma.$transaction(async (tx) => {
      const updateData: Prisma.PassengerUpdateInput = {
        accountStatus: newStatus,
      };

      if (newStatus === AccountStatus.SUSPENDED) {
        updateData.suspensionReason = reason?.trim() || 'Suspended by Administrator';
        updateData.suspendedAt = new Date();
      } else if (newStatus === AccountStatus.ACTIVE) {
        updateData.suspensionReason = null;
        updateData.suspendedAt = null;
      }

      await tx.passenger.update({
        where: { id: passengerId },
        data: updateData,
      });

      // If suspended: invalidate all active sessions and refresh tokens immediately
      if (newStatus === AccountStatus.SUSPENDED) {
        await tx.refreshToken.updateMany({
          where: {
            OR: [
              { passengerId: passengerId, isRevoked: false },
              { userId: passengerId, isRevoked: false },
            ],
          },
          data: {
            isRevoked: true,
            revokedAt: new Date(),
          },
        });
      }

      // Record administrative audit log
      await tx.auditLog.create({
        data: {
          actorId: adminIdentifier,
          actorType: ActorType.ADMIN,
          action: 'PASSENGER_STATUS_CHANGE',
          entityType: 'PASSENGER',
          entityId: passengerId,
          passengerId: passengerId,
          ipAddress: reqMeta?.ipAddress || null,
          userAgent: reqMeta?.userAgent ? reqMeta.userAgent.slice(0, 512) : null,
          metadata: {
            fromStatus: oldStatus,
            toStatus: newStatus,
            reason: reason?.trim() || null,
            adminIdentifier,
            timestamp: new Date().toISOString(),
          },
        },
      });
    });

    logger.info(
      { passengerId, from: oldStatus, to: newStatus, admin: adminIdentifier },
      '[AdminPassengerService] Passenger account status updated'
    );

    return this.getPassengerById(passengerId);
  }
}

export const adminPassengerService = new AdminPassengerService();
