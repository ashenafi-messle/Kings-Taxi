import { prisma } from '../../core/database/prisma';
import { Prisma, HotelBookingStatus, PaymentStatus, TransferStatus, PaymentType, PaymentMethod, VehicleType } from '@prisma/client';
import crypto from 'crypto';
import { HotelQuoteRequestDto, HotelQuoteResponseDto, CreateHotelBookingDto } from './hospitality.types';
import {
  validateBookingDates,
  parseCalendarDate,
  formatCalendarDate,
  addCalendarDays,
} from './utils/addisDate';

export class HospitalityBookingService {
  /**
   * Authoritative backend price calculation & quote generation
   */
  async calculateQuote(dto: HotelQuoteRequestDto): Promise<HotelQuoteResponseDto> {
    const { hotelId, roomTypeId, checkInDate: checkInStr, checkOutDate: checkOutStr } = dto;
    const numberOfRooms = Math.max(1, dto.numberOfRooms || 1);
    const adults = Math.max(1, dto.adults || 1);
    const children = Math.max(0, dto.children || 0);
    const totalGuests = adults + children;

    // 1. Validate dates against Africa/Addis_Ababa business calendar
    const dateVal = validateBookingDates(checkInStr, checkOutStr);
    if (!dateVal.valid) {
      throw new Error(dateVal.error);
    }
    const { nights, checkInDate, checkOutDate } = dateVal;

    // 2. Fetch hotel and room type
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { id: true, name: true, city: true, address: true, starRating: true, status: true },
    });
    if (!hotel || hotel.status !== 'PUBLISHED') {
      throw new Error('HOTEL_NOT_FOUND: Published hotel not found');
    }

    const roomType = await prisma.hotelRoomType.findFirst({
      where: { id: roomTypeId, hotelId, status: 'ACTIVE' },
      include: {
        rates: {
          where: {
            status: 'ACTIVE',
            startDate: { lte: checkOutDate },
            endDate: { gte: checkInDate },
          },
        },
      },
    });
    if (!roomType) {
      throw new Error('ROOM_TYPE_NOT_FOUND: Active room type not found for this hotel');
    }

    // 3. Guest capacity check
    const totalCapacity = roomType.maximumGuests * numberOfRooms;
    if (totalGuests > totalCapacity) {
      throw new Error(
        `CAPACITY_EXCEEDED: Selected ${numberOfRooms} room(s) can accommodate at most ${totalCapacity} guests. Requested: ${totalGuests} guests.`
      );
    }

    // 4. Calculate day-by-day room pricing using Decimal arithmetic
    let roomSubtotalDecimal = new Prisma.Decimal(0);
    const nightlyBreakdown: Array<{ date: string; price: number; source: 'SEASONAL_RATE' | 'BASE_PRICE' }> = [];

    for (let i = 0; i < nights; i++) {
      const curDate = addCalendarDays(checkInDate, i);
      const curDateStr = formatCalendarDate(curDate);

      const seasonalRate = roomType.rates.find(
        (r) =>
          parseCalendarDate(r.startDate).getTime() <= curDate.getTime() &&
          parseCalendarDate(r.endDate).getTime() >= curDate.getTime()
      );

      const pricePerRoom = seasonalRate ? seasonalRate.pricePerNight : roomType.basePricePerNight;
      const dayTotalForRooms = pricePerRoom.times(numberOfRooms);
      roomSubtotalDecimal = roomSubtotalDecimal.plus(dayTotalForRooms);

      nightlyBreakdown.push({
        date: curDateStr,
        price: Number(pricePerRoom),
        source: seasonalRate ? 'SEASONAL_RATE' : 'BASE_PRICE',
      });
    }

    // 5. Calculate optional fixed-price Gondar airport transfer
    let transferSubtotalDecimal = new Prisma.Decimal(0);
    let airportTransferInfo: HotelQuoteResponseDto['airportTransfer'] = {
      selected: false,
      fixedPrice: 0,
    };

    if (dto.includeAirportTransfer) {
      const transferRate = await prisma.airportTransferRate.findFirst({
        where: {
          hotelId,
          isActive: true,
          vehicleType: dto.airportTransferVehicleType || undefined,
          effectiveFrom: { lte: checkInDate },
          OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: checkInDate } }],
        },
        orderBy: { fixedPrice: 'asc' },
      });

      if (!transferRate) {
        throw new Error(
          'TRANSFER_RATE_UNAVAILABLE: Fixed airport transfer is not configured for this hotel. Please uncheck airport transfer to proceed.'
        );
      }

      transferSubtotalDecimal = transferRate.fixedPrice;
      airportTransferInfo = {
        selected: true,
        rateId: transferRate.id,
        origin: transferRate.originName,
        destination: transferRate.destinationName,
        vehicleType: transferRate.vehicleType,
        fixedPrice: Number(transferRate.fixedPrice),
      };
    }

    const additionalFeesDecimal = new Prisma.Decimal(0);
    const discountDecimal = new Prisma.Decimal(0);
    const grandTotalDecimal = roomSubtotalDecimal
      .plus(transferSubtotalDecimal)
      .plus(additionalFeesDecimal)
      .minus(discountDecimal);

    const quoteExpiration = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    return {
      hotel: {
        id: hotel.id,
        name: hotel.name,
        city: hotel.city,
        address: hotel.address,
        starRating: hotel.starRating,
      },
      roomType: {
        id: roomType.id,
        name: roomType.name,
        maximumGuests: roomType.maximumGuests,
        basePricePerNight: Number(roomType.basePricePerNight),
      },
      checkInDate: formatCalendarDate(checkInDate),
      checkOutDate: formatCalendarDate(checkOutDate),
      nights,
      numberOfRooms,
      adults,
      children,
      roomSubtotal: Number(roomSubtotalDecimal.toFixed(2)),
      nightlyRateBreakdown: nightlyBreakdown,
      airportTransfer: airportTransferInfo,
      additionalFees: Number(additionalFeesDecimal.toFixed(2)),
      discount: Number(discountDecimal.toFixed(2)),
      grandTotal: Number(grandTotalDecimal.toFixed(2)),
      currency: roomType.currency,
      quoteExpiration,
    };
  }

  /**
   * Create official Hotel Booking with atomic inventory concurrency protection
   */
  async createBooking(passengerId: string, dto: CreateHotelBookingDto) {
    // 1. Authoritative price recalculation on the backend
    const quote = await this.calculateQuote({
      hotelId: dto.hotelId,
      roomTypeId: dto.roomTypeId,
      checkInDate: dto.checkInDate,
      checkOutDate: dto.checkOutDate,
      numberOfRooms: dto.numberOfRooms,
      adults: dto.adults,
      children: dto.children,
      includeAirportTransfer: dto.includeAirportTransfer,
      airportTransferVehicleType: dto.airportTransferVehicleType,
    });

    const checkInDate = parseCalendarDate(quote.checkInDate);
    const checkOutDate = parseCalendarDate(quote.checkOutDate);

    // 2. Atomic Database Transaction to prevent race conditions and overbooking
    return prisma.$transaction(async (tx) => {
      // Re-fetch room type inside transaction
      const roomType = await tx.hotelRoomType.findUnique({
        where: { id: dto.roomTypeId },
      });
      if (!roomType || roomType.status !== 'ACTIVE') {
        throw new Error('ROOM_TYPE_UNAVAILABLE: Room type is not currently active');
      }

      // Check current overlapping booked inventory
      const overlappingBookings = await tx.hotelBooking.findMany({
        where: {
          hotelId: dto.hotelId,
          bookingStatus: { in: [HotelBookingStatus.CONFIRMED, HotelBookingStatus.PENDING] },
          checkInDate: { lt: checkOutDate },
          checkOutDate: { gt: checkInDate },
        },
        include: {
          bookingRooms: {
            where: { roomTypeId: dto.roomTypeId },
          },
        },
      });

      const alreadyBooked = overlappingBookings.reduce(
        (sum, b) => sum + b.bookingRooms.reduce((rSum, br) => rSum + br.quantity, 0),
        0
      );

      const availableInventory = roomType.totalInventory - alreadyBooked;
      if (availableInventory < quote.numberOfRooms) {
        throw new Error(
          `INSUFFICIENT_INVENTORY: Only ${availableInventory} room(s) available for the selected dates. Requested: ${quote.numberOfRooms}.`
        );
      }

      // Generate unique booking reference (KT-HTL-XXXXX)
      const refSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
      const bookingReference = `KT-HTL-${Date.now().toString(36).toUpperCase()}-${refSuffix}`;

      // Create Hotel Booking
      const booking = await tx.hotelBooking.create({
        data: {
          bookingReference,
          passengerId,
          hotelId: dto.hotelId,
          checkInDate,
          checkOutDate,
          adults: quote.adults,
          children: quote.children,
          numberOfRooms: quote.numberOfRooms,
          currency: quote.currency,
          roomSubtotal: new Prisma.Decimal(quote.roomSubtotal),
          transferSubtotal: new Prisma.Decimal(quote.airportTransfer.fixedPrice),
          additionalFees: new Prisma.Decimal(quote.additionalFees),
          discountAmount: new Prisma.Decimal(quote.discount),
          grandTotal: new Prisma.Decimal(quote.grandTotal),
          bookingStatus: HotelBookingStatus.CONFIRMED,
          paymentStatus: PaymentStatus.PENDING,
          specialRequests: dto.specialRequests,
          priceSnapshot: quote as any,
          confirmedAt: new Date(),
        },
      });

      // Create Booking Room Item
      await tx.hotelBookingRoom.create({
        data: {
          hotelBookingId: booking.id,
          roomTypeId: dto.roomTypeId,
          quantity: quote.numberOfRooms,
          guestsAllocated: quote.adults + quote.children,
          nightlyRateSnapshot: new Prisma.Decimal(quote.roomType.basePricePerNight),
          subtotal: new Prisma.Decimal(quote.roomSubtotal),
        },
      });

      // Create Airport Transfer Booking if selected
      if (quote.airportTransfer.selected && quote.airportTransfer.rateId) {
        await tx.hotelTransferBooking.create({
          data: {
            hotelBookingId: booking.id,
            airportTransferRateId: quote.airportTransfer.rateId,
            pickupLocation: quote.airportTransfer.origin || 'Atse Tewodros Airport (GDQ), Gondar',
            pickupDate: checkInDate,
            pickupTime: dto.pickupTime || '12:00',
            flightNumber: dto.flightNumber,
            passengers: quote.adults + quote.children,
            selectedVehicleType: (quote.airportTransfer.vehicleType as VehicleType) || VehicleType.STANDARD_SEDAN,
            fixedFareSnapshot: new Prisma.Decimal(quote.airportTransfer.fixedPrice),
            transferStatus: TransferStatus.REQUESTED,
          },
        });
      }

      // Create linked payment record in existing Payment model
      const paymentRef = `PAY-HTL-${bookingReference}`;
      await tx.payment.create({
        data: {
          hotelBookingId: booking.id,
          passengerId,
          paymentType: PaymentType.HOTEL_RESERVATION,
          amount: new Prisma.Decimal(quote.grandTotal),
          currency: quote.currency,
          paymentMethod: dto.paymentMethod || PaymentMethod.CASH,
          paymentStatus: PaymentStatus.PENDING,
          transactionReference: paymentRef,
        },
      });

      return booking;
    });
  }

  /**
   * Public: List bookings belonging to authenticated passenger
   */
  async getPassengerBookings(passengerId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      prisma.hotelBooking.findMany({
        where: { passengerId },
        include: {
          hotel: {
            select: {
              id: true,
              name: true,
              slug: true,
              city: true,
              address: true,
              contactPhone: true,
              images: { where: { isCover: true }, take: 1 },
            },
          },
          bookingRooms: {
            include: { roomType: true },
          },
          transferBooking: true,
          payment: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.hotelBooking.count({ where: { passengerId } }),
    ]);

    const formatted = bookings.map((b) => ({
      id: b.id,
      bookingReference: b.bookingReference,
      hotelId: b.hotelId,
      hotelName: b.hotel.name,
      hotelCity: b.hotel.city,
      hotelAddress: b.hotel.address,
      hotelPhone: b.hotel.contactPhone,
      hotelImage: b.hotel.images[0]?.imageUrl || '',
      checkInDate: formatCalendarDate(b.checkInDate),
      checkOutDate: formatCalendarDate(b.checkOutDate),
      adults: b.adults,
      children: b.children,
      numberOfRooms: b.numberOfRooms,
      roomSubtotal: Number(b.roomSubtotal),
      transferSubtotal: Number(b.transferSubtotal),
      grandTotal: Number(b.grandTotal),
      currency: b.currency,
      bookingStatus: b.bookingStatus,
      paymentStatus: b.paymentStatus,
      roomName: b.bookingRooms[0]?.roomType?.name || 'Standard Room',
      airportTransfer: b.transferBooking
        ? {
            pickupLocation: b.transferBooking.pickupLocation,
            pickupDate: formatCalendarDate(b.transferBooking.pickupDate),
            pickupTime: b.transferBooking.pickupTime,
            flightNumber: b.transferBooking.flightNumber,
            fixedFare: Number(b.transferBooking.fixedFareSnapshot),
            transferStatus: b.transferBooking.transferStatus,
          }
        : null,
      createdAt: b.createdAt.toISOString(),
    }));

    return {
      bookings: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Public: Get single booking by reference with ownership verification
   */
  async getBookingByReference(bookingReference: string, passengerId: string, isAdmin = false) {
    const booking = await prisma.hotelBooking.findUnique({
      where: { bookingReference },
      include: {
        hotel: {
          include: {
            images: { take: 3 },
          },
        },
        bookingRooms: {
          include: { roomType: true },
        },
        transferBooking: true,
        payment: true,
      },
    });

    if (!booking) return null;

    if (!isAdmin && booking.passengerId !== passengerId) {
      throw new Error('FORBIDDEN: You do not own this hotel booking');
    }

    return {
      ...booking,
      checkInDate: formatCalendarDate(booking.checkInDate),
      checkOutDate: formatCalendarDate(booking.checkOutDate),
      roomSubtotal: Number(booking.roomSubtotal),
      transferSubtotal: Number(booking.transferSubtotal),
      grandTotal: Number(booking.grandTotal),
      bookingRooms: booking.bookingRooms.map((br) => ({
        ...br,
        nightlyRateSnapshot: Number(br.nightlyRateSnapshot),
        subtotal: Number(br.subtotal),
        roomType: {
          ...br.roomType,
          basePricePerNight: Number(br.roomType.basePricePerNight),
        },
      })),
      transferBooking: booking.transferBooking
        ? {
            ...booking.transferBooking,
            pickupDate: formatCalendarDate(booking.transferBooking.pickupDate),
            fixedFareSnapshot: Number(booking.transferBooking.fixedFareSnapshot),
          }
        : null,
      payment: booking.payment
        ? {
            ...booking.payment,
            amount: Number(booking.payment.amount),
          }
        : null,
    };
  }

  /**
   * Public: Cancel booking by passenger
   */
  async cancelBooking(bookingReference: string, passengerId: string) {
    const booking = await prisma.hotelBooking.findUnique({
      where: { bookingReference },
    });
    if (!booking) throw new Error('BOOKING_NOT_FOUND: Booking does not exist');

    if (booking.passengerId !== passengerId) {
      throw new Error('FORBIDDEN: You do not have permission to cancel this booking');
    }

    if (booking.bookingStatus === HotelBookingStatus.CANCELLED) {
      return booking; // Idempotent
    }

    if (booking.bookingStatus === HotelBookingStatus.COMPLETED) {
      throw new Error('CANNOT_CANCEL: Completed stay cannot be cancelled');
    }

    return prisma.hotelBooking.update({
      where: { bookingReference },
      data: {
        bookingStatus: HotelBookingStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    });
  }

  /**
   * Super Admin: List all hotel bookings with filtering
   */
  async adminListBookings(params: {
    hotelId?: string;
    status?: HotelBookingStatus;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.hotelId) where.hotelId = params.hotelId;
    if (params.status) where.bookingStatus = params.status;

    const [bookings, total] = await Promise.all([
      prisma.hotelBooking.findMany({
        where,
        include: {
          hotel: { select: { name: true, city: true } },
          passenger: { select: { fullName: true, phoneNumber: true, email: true } },
          transferBooking: true,
          payment: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.hotelBooking.count({ where }),
    ]);

    return {
      bookings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Super Admin: Update booking status
   */
  async adminUpdateBookingStatus(id: string, status: HotelBookingStatus) {
    return prisma.hotelBooking.update({
      where: { id },
      data: { bookingStatus: status },
    });
  }
}

export const hospitalityBookingService = new HospitalityBookingService();

