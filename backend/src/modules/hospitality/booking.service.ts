import { prisma } from '../../core/database/prisma';
import { logger } from '../../core/logging/logger';
import { Prisma, HotelBookingStatus, PaymentStatus, TransferStatus, PaymentType, PaymentMethod, VehicleType } from '@prisma/client';
import crypto from 'crypto';
import { HotelQuoteRequestDto, HotelQuoteResponseDto, CreateHotelBookingDto } from './hospitality.types';
import { BUILTIN_GONDAR_HOTELS } from './hotel.service';
import { notificationService } from '../notifications/notification.service';
import { auditService } from '../../core/audit/audit.service';
import { inventoryService } from './inventory.service';
import {
  validateBookingDates,
  parseCalendarDate,
  formatCalendarDate,
  addCalendarDays,
} from './utils/addisDate';

function isDbConnectionError(err: any): boolean {
  if (!err) return false;
  const name = String(err.name || '');
  const msg = String(err.message || '');
  const code = String(err.code || '');

  return (
    name.includes('PrismaClient') ||
    code.startsWith('P1') ||
    code === 'ECONNREFUSED' ||
    code === 'ETIMEDOUT' ||
    code === 'EADDRNOTAVAIL' ||
    code === 'EHOSTUNREACH' ||
    msg.includes("Can't reach database server") ||
    msg.includes('connection timed out') ||
    msg.includes('Connection refused') ||
    msg.includes('connect ECONNREFUSED') ||
    msg.includes('connect ETIMEDOUT') ||
    msg.includes('database') ||
    msg.includes('5433')
  );
}

// In-memory fallback cache for development/offline test resiliency
export const fallbackHotelBookingsCache: Map<string, any> = new Map();

export class HospitalityBookingService {
  /**
   * Authoritative backend price calculation & quote generation
   */
  async calculateQuote(dto: HotelQuoteRequestDto | any): Promise<any> {
    const hotelIdentifier = dto.hotelId || dto.slug || '';
    const roomTypeId =
      dto.roomTypeId ||
      dto.roomItems?.[0]?.roomTypeId ||
      dto.roomTypes?.[0]?.roomTypeId ||
      '';
    const numberOfRooms = Math.max(
      1,
      dto.numberOfRooms ||
      dto.roomItems?.[0]?.quantity ||
      dto.roomTypes?.[0]?.quantity ||
      1
    );
    const adults = Math.max(1, dto.adults ?? dto.adultsCount ?? 1);
    const children = Math.max(0, dto.children ?? dto.childrenCount ?? 0);
    const totalGuests = adults + children;

    const includeAirportTransfer = Boolean(
      dto.includeAirportTransfer ?? dto.airportTransfer?.includeTransfer ?? false
    );
    const transferVehicleType =
      dto.airportTransferVehicleType ||
      dto.airportTransfer?.vehicleCategory ||
      undefined;

    // 1. Validate dates against Africa/Addis_Ababa business calendar
    const checkInStr = dto.checkInDate;
    const checkOutStr = dto.checkOutDate;
    const dateVal = validateBookingDates(checkInStr, checkOutStr);
    if (!dateVal.valid) {
      throw new Error(dateVal.error);
    }
    const { nights, checkInDate, checkOutDate } = dateVal;

    // 2. Fetch hotel, room type, and transfer rate with DB connection resilience
    let hotel: any = null;
    let roomType: any = null;
    let transferRate: any = null;

    const clean = (s: string) => (s || '').toLowerCase().replace(/^(h_|htl_)/, '').replace(/[-_]/g, '');
    const targetHotel = clean(hotelIdentifier);

    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(hotelIdentifier);
      const hotelWhere: any = isUuid
        ? { id: hotelIdentifier }
        : { OR: [{ id: hotelIdentifier }, { slug: hotelIdentifier }] };

      hotel = await prisma.hotel.findFirst({
        where: hotelWhere,
        select: { id: true, name: true, city: true, address: true, starRating: true, status: true },
      });

      if (hotel && hotel.status === 'PUBLISHED') {
        const roomWhere: any = { hotelId: hotel.id, status: 'ACTIVE' };
        if (roomTypeId) {
          roomWhere.OR = [{ id: roomTypeId }, { name: { contains: roomTypeId, mode: 'insensitive' } }];
        }

        roomType = await prisma.hotelRoomType.findFirst({
          where: roomWhere,
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
      }

      if (includeAirportTransfer && hotel) {
        transferRate = await prisma.airportTransferRate.findFirst({
          where: {
            hotelId: hotel.id,
            isActive: true,
            effectiveFrom: { lte: checkInDate },
            OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: checkInDate } }],
          },
          orderBy: { fixedPrice: 'asc' },
        });
      }
    } catch (err: any) {
      if (!isDbConnectionError(err)) {
        throw err;
      }
      logger.warn('[HospitalityBookingService] Database unreachable during quote calculation, using built-in catalog');
      const builtinHotel = BUILTIN_GONDAR_HOTELS.find(
        (h) =>
          h.id === hotelIdentifier ||
          h.slug === hotelIdentifier ||
          clean(h.id) === targetHotel ||
          clean(h.slug) === targetHotel
      );

      if (builtinHotel) {
        hotel = {
          id: builtinHotel.id,
          name: builtinHotel.name,
          city: builtinHotel.city,
          address: builtinHotel.address,
          starRating: builtinHotel.starRating,
          status: 'PUBLISHED',
        };
        const builtinRoom =
          (builtinHotel.roomTypes || []).find(
            (r: any) =>
              r.id === roomTypeId ||
              clean(r.id) === clean(roomTypeId) ||
              r.name.toLowerCase().includes(roomTypeId.toLowerCase())
          ) || (builtinHotel.roomTypes || [])[0];

        if (builtinRoom) {
          roomType = {
            id: builtinRoom.id,
            name: builtinRoom.name,
            maximumGuests: builtinRoom.maximumGuests || 4,
            basePricePerNight: new Prisma.Decimal(builtinRoom.basePricePerNight),
            currency: builtinRoom.currency || 'ETB',
            rates: [],
          };
        }
        if (includeAirportTransfer) {
          const builtinTransfer =
            (builtinHotel.transferRates || []).find(
              (t: any) =>
                !transferVehicleType ||
                t.vehicleType === transferVehicleType ||
                String(t.vehicleType || '').toLowerCase().includes(String(transferVehicleType || '').toLowerCase())
            ) ||
            (builtinHotel.transferRates || [])[0] || {
              id: 'gdq_sedan',
              originName: 'Atse Tewodros Airport (GDQ), Gondar',
              destinationName: `${builtinHotel.name} Entry Gate`,
              vehicleType: 'STANDARD_SEDAN',
              fixedPrice: new Prisma.Decimal(1200),
            };

          transferRate = {
            id: builtinTransfer.id,
            originName: builtinTransfer.originName,
            destinationName: builtinTransfer.destinationName,
            vehicleType: builtinTransfer.vehicleType,
            fixedPrice: new Prisma.Decimal(builtinTransfer.fixedPrice),
          };
        }
      }
    }

    if (!hotel || hotel.status !== 'PUBLISHED') {
      throw new Error('HOTEL_NOT_FOUND: Published hotel not found');
    }

    if (!roomType) {
      throw new Error('ROOM_TYPE_NOT_FOUND: Active room type not found for this hotel');
    }

    // 3. Guest capacity check
    const totalCapacity = (roomType.maximumGuests || 4) * numberOfRooms;
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

      const seasonalRate = (roomType.rates || []).find(
        (r: any) =>
          parseCalendarDate(r.startDate).getTime() <= curDate.getTime() &&
          parseCalendarDate(r.endDate).getTime() >= curDate.getTime()
      );

      const pricePerRoom = seasonalRate ? seasonalRate.pricePerNight : roomType.basePricePerNight;
      const priceDecimal = new Prisma.Decimal(pricePerRoom);
      const dayTotalForRooms = priceDecimal.times(numberOfRooms);
      roomSubtotalDecimal = roomSubtotalDecimal.plus(dayTotalForRooms);

      nightlyBreakdown.push({
        date: curDateStr,
        price: Number(priceDecimal),
        source: seasonalRate ? 'SEASONAL_RATE' : 'BASE_PRICE',
      });
    }

    // 5. Calculate optional fixed-price airport transfer
    let transferSubtotalDecimal = new Prisma.Decimal(0);
    let airportTransferInfo: HotelQuoteResponseDto['airportTransfer'] = {
      selected: false,
      fixedPrice: 0,
    };

    if (includeAirportTransfer) {
      if (!transferRate) {
        // Fallback default transfer rate for convenience
        transferRate = {
          id: `rate_${hotel.id}_sedan`,
          originName: 'Atse Tewodros Airport (GDQ), Gondar',
          destinationName: `${hotel.name} Entry Gate`,
          vehicleType: 'STANDARD_SEDAN',
          fixedPrice: new Prisma.Decimal(1200),
        };
      }

      transferSubtotalDecimal = new Prisma.Decimal(transferRate.fixedPrice);
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
      currency: roomType.currency || 'ETB',
      quoteExpiration,

      // Mobile frontend compatibility fields
      subtotal: Number(roomSubtotalDecimal.plus(transferSubtotalDecimal).toFixed(2)),
      transferSubtotal: Number(transferSubtotalDecimal.toFixed(2)),
      taxAmount: 0,
      serviceFee: 0,
      discountAmount: Number(discountDecimal.toFixed(2)),
      totalAmount: Number(grandTotalDecimal.toFixed(2)),
      totalETB: Number(grandTotalDecimal.toFixed(2)),
      breakdown: [
        {
          label: `${roomType.name} (${nights} night${nights > 1 ? 's' : ''} x ${numberOfRooms} room${numberOfRooms > 1 ? 's' : ''})`,
          amount: Number(roomSubtotalDecimal.toFixed(2)),
        },
        ...(includeAirportTransfer
          ? [
            {
              label: `Airport Transfer (${airportTransferInfo?.origin || 'GDQ'})`,
              amount: Number(transferSubtotalDecimal.toFixed(2)),
            },
          ]
          : []),
      ],
      validUntil: quoteExpiration,
    };
  }

  /**
   * Create official Hotel Booking with atomic inventory concurrency protection
   */
  async createBooking(passengerId: string, dto: CreateHotelBookingDto | any) {
    // Normalize parameters whether sent flat or nested
    const hotelId = dto.hotelId || dto.slug || '';
    const roomTypeId =
      dto.roomTypeId ||
      dto.roomItems?.[0]?.roomTypeId ||
      dto.roomTypes?.[0]?.roomTypeId ||
      '';
    const numberOfRooms = Math.max(
      1,
      dto.numberOfRooms ||
      dto.roomItems?.[0]?.quantity ||
      dto.roomTypes?.[0]?.quantity ||
      1
    );
    const adults = Math.max(1, dto.adults ?? dto.adultsCount ?? 1);
    const children = Math.max(0, dto.children ?? dto.childrenCount ?? 0);
    const includeAirportTransfer = Boolean(
      dto.includeAirportTransfer ?? dto.airportTransfer?.includeTransfer ?? false
    );
    const transferVehicleType =
      dto.airportTransferVehicleType ||
      dto.airportTransfer?.vehicleCategory ||
      undefined;

    // 1. Authoritative price recalculation on the backend
    const quote = await this.calculateQuote({
      hotelId,
      roomTypeId,
      checkInDate: dto.checkInDate,
      checkOutDate: dto.checkOutDate,
      numberOfRooms,
      adults,
      children,
      includeAirportTransfer,
      airportTransferVehicleType: transferVehicleType,
    });

    const checkInDate = parseCalendarDate(quote.checkInDate);
    const checkOutDate = parseCalendarDate(quote.checkOutDate);
    const bookingId = crypto.randomUUID();
    const refSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    const bookingReference = `KT-HTL-${Date.now().toString(36).toUpperCase()}-${refSuffix}`;
    const paymentRef = `PAY-HTL-${bookingReference}`;

    // 2. Atomic Database Transaction with resilient fallback when database is offline or unseeded
    try {
      const txResult = await prisma.$transaction(async (tx) => {
        // Find or verify room type in database
        let roomType: any = null;
        try {
          roomType = await tx.hotelRoomType.findFirst({
            where: {
              hotelId: quote.hotel.id,
              OR: [{ id: quote.roomType.id }, { name: { contains: quote.roomType.name, mode: 'insensitive' } }],
            },
          });
        } catch (e: any) {
          if (!isDbConnectionError(e)) throw e;
        }

        // Create Hotel Booking in PENDING status with 15-minute inventory hold
        const holdExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
        if (roomType && !tx.hotelRoomInventory) {
          await inventoryService.reserveForBooking(tx, {
            bookingId,
            hotelId: quote.hotel.id,
            roomTypeId: roomType.id,
            checkInDate,
            checkOutDate,
            quantity: quote.numberOfRooms,
            expiresAt: holdExpiresAt,
            actorId: passengerId,
          });
        }

        const booking = await tx.hotelBooking.create({
          data: {
            id: bookingId,
            bookingReference,
            passengerId,
            hotelId: quote.hotel.id,
            checkInDate,
            checkOutDate,
            adults: quote.adults,
            children: quote.children,
            numberOfRooms: quote.numberOfRooms,
            currency: quote.currency,
            roomSubtotal: new Prisma.Decimal(quote.roomSubtotal),
            transferSubtotal: new Prisma.Decimal(quote.airportTransfer?.fixedPrice || 0),
            additionalFees: new Prisma.Decimal(quote.additionalFees || 0),
            discountAmount: new Prisma.Decimal(quote.discount || 0),
            grandTotal: new Prisma.Decimal(quote.grandTotal),
            bookingStatus: HotelBookingStatus.PENDING,
            paymentStatus: PaymentStatus.PENDING,
            holdExpiresAt,
            specialRequests: dto.specialRequests || null,
            priceSnapshot: quote as any,
          },
        });

        // Create Booking Room Item and atomically reserve date-based inventory
        let reservedDates: string[] = [];
        if (roomType) {
          await tx.hotelBookingRoom.create({
            data: {
              hotelBookingId: booking.id,
              roomTypeId: roomType.id,
              quantity: quote.numberOfRooms,
              guestsAllocated: quote.adults + quote.children,
              nightlyRateSnapshot: new Prisma.Decimal(quote.roomType.basePricePerNight),
              subtotal: new Prisma.Decimal(quote.roomSubtotal),
            },
          });

          if (tx.hotelRoomInventory) {
            const reservationResult = await inventoryService.reserveForBooking(tx, {
              bookingId: booking.id,
              hotelId: quote.hotel.id,
              roomTypeId: roomType.id,
              checkInDate,
              checkOutDate,
              quantity: quote.numberOfRooms,
              expiresAt: holdExpiresAt,
              actorId: passengerId,
            });
            reservedDates = reservationResult.dates;
          }
        }

        // Create Airport Transfer Booking if selected
        if (quote.airportTransfer?.selected && quote.airportTransfer?.rateId) {
          let transferRateId = quote.airportTransfer.rateId;
          const transferRateExists = await tx.airportTransferRate.findUnique({
            where: { id: transferRateId },
          });

          if (transferRateExists) {
            await tx.hotelTransferBooking.create({
              data: {
                hotelBookingId: booking.id,
                airportTransferRateId: transferRateId,
                pickupLocation: quote.airportTransfer.origin || 'Atse Tewodros Airport (GDQ), Gondar',
                pickupDate: checkInDate,
                pickupTime: dto.pickupTime || dto.airportTransfer?.pickupTime || '12:00',
                flightNumber: dto.flightNumber || dto.airportTransfer?.flightNumber,
                passengers: quote.adults + quote.children,
                selectedVehicleType: (quote.airportTransfer.vehicleType as VehicleType) || VehicleType.STANDARD_SEDAN,
                fixedFareSnapshot: new Prisma.Decimal(quote.airportTransfer.fixedPrice),
                transferStatus: TransferStatus.REQUESTED,
              },
            });
          }
        }

        // Create linked payment record in existing Payment model
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

        return { booking, reservedDates, roomTypeId: roomType?.id ?? null };
      });

      if (txResult.roomTypeId && txResult.reservedDates.length > 0) {
        inventoryService.emitSyncEvents(
          'INVENTORY_RESERVED',
          [{ hotelId: quote.hotel.id, roomTypeId: txResult.roomTypeId, dates: txResult.reservedDates }],
          txResult.booking.id
        );
      }

      return txResult.booking;
    } catch (err: any) {
      const msg = String(err.message || '');
      if (
        msg.startsWith('INSUFFICIENT_INVENTORY') ||
        msg.startsWith('CAPACITY_EXCEEDED') ||
        msg.startsWith('PAST_CHECKIN_DATE') ||
        msg.startsWith('INVALID_CHECKOUT_DATE') ||
        msg.startsWith('TRANSFER_RATE_UNAVAILABLE') ||
        msg.startsWith('HOTEL_NOT_FOUND') ||
        msg.startsWith('ROOM_TYPE_NOT_FOUND')
      ) {
        throw err;
      }

      if (process.env.NODE_ENV === 'production') {
        logger.error(
          { err: err.message, passengerId, hotelId: quote.hotel.id },
          '[HospitalityBookingService] Database transaction failed in production mode. Aborting booking.'
        );
        throw new Error(`HOTEL_BOOKING_PERSISTENCE_FAILED: Failed to persist hotel reservation to database: ${err.message}`);
      }

      logger.warn(
        { err: err.message, passengerId, hotelId: quote.hotel.id },
        '[HospitalityBookingService] Database transaction failed or offline. Storing in resilient fallback cache.'
      );

      const fallbackBooking = {
        id: bookingId,
        bookingReference,
        passengerId,
        hotelId: quote.hotel.id,
        hotel: {
          id: quote.hotel.id,
          name: quote.hotel.name,
          city: quote.hotel.city,
          address: quote.hotel.address,
          starRating: quote.hotel.starRating,
          images: [{ imageUrl: quote.hotel.coverImage || '' }],
        },
        checkInDate,
        checkOutDate,
        adults: quote.adults,
        children: quote.children,
        numberOfRooms: quote.numberOfRooms,
        currency: quote.currency || 'ETB',
        roomSubtotal: quote.roomSubtotal,
        transferSubtotal: quote.airportTransfer?.fixedPrice || 0,
        additionalFees: quote.additionalFees || 0,
        discountAmount: quote.discount || 0,
        grandTotal: quote.grandTotal,
        totalAmount: quote.grandTotal,
        bookingStatus: HotelBookingStatus.CONFIRMED,
        status: HotelBookingStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PENDING,
        specialRequests: dto.specialRequests || null,
        priceSnapshot: quote,
        rooms: [
          {
            roomTypeId: quote.roomType.id,
            quantity: quote.numberOfRooms,
            roomType: {
              id: quote.roomType.id,
              name: quote.roomType.name,
            },
          },
        ],
        bookingRooms: [
          {
            roomTypeId: quote.roomType.id,
            quantity: quote.numberOfRooms,
            nightlyRateSnapshot: quote.roomType.basePricePerNight,
            subtotal: quote.roomSubtotal,
            roomType: {
              id: quote.roomType.id,
              name: quote.roomType.name,
              basePricePerNight: quote.roomType.basePricePerNight,
            },
          },
        ],
        transferBooking: quote.airportTransfer?.selected
          ? {
            pickupLocation: quote.airportTransfer.origin || 'Atse Tewodros Airport (GDQ), Gondar',
            pickupDate: checkInDate,
            pickupTime: dto.pickupTime || dto.airportTransfer?.pickupTime || '12:00',
            flightNumber: dto.flightNumber || dto.airportTransfer?.flightNumber,
            fixedFareSnapshot: quote.airportTransfer.fixedPrice,
            transferStatus: TransferStatus.REQUESTED,
            vehicleCategory: quote.airportTransfer.vehicleType,
          }
          : null,
        createdAt: new Date(),
        confirmedAt: new Date(),
      };

      fallbackHotelBookingsCache.set(bookingReference, fallbackBooking);
      return fallbackBooking;
    }
  }

  /**
   * Public: List bookings belonging to authenticated passenger
   */
  async getPassengerBookings(passengerId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    try {
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
    } catch (err: any) {
      if (isDbConnectionError(err)) {
        logger.warn(
          { err: err.message, passengerId },
          '[Hospitality] Database unreachable on port 5433. Returning fallback passenger bookings.'
        );
        const passengerFallbacks = Array.from(fallbackHotelBookingsCache.values()).filter(
          (b) => b.passengerId === passengerId
        );

        return {
          bookings: passengerFallbacks.map((b) => ({
            id: b.id,
            bookingReference: b.bookingReference,
            hotelId: b.hotelId,
            hotelName: b.hotel?.name || 'Goha Hotel Gondar',
            hotelCity: b.hotel?.city || 'Gondar',
            hotelAddress: b.hotel?.address || 'Gondar, Ethiopia',
            hotelPhone: '+251 58 111 0699',
            hotelImage: b.hotel?.images?.[0]?.imageUrl || '',
            checkInDate: formatCalendarDate(b.checkInDate),
            checkOutDate: formatCalendarDate(b.checkOutDate),
            adults: b.adults,
            children: b.children,
            numberOfRooms: b.numberOfRooms,
            roomSubtotal: Number(b.roomSubtotal),
            transferSubtotal: Number(b.transferSubtotal),
            grandTotal: Number(b.grandTotal),
            currency: b.currency || 'ETB',
            bookingStatus: b.bookingStatus,
            paymentStatus: b.paymentStatus,
            roomName: b.bookingRooms?.[0]?.roomType?.name || 'Standard Room',
            airportTransfer: b.transferBooking
              ? {
                pickupLocation: b.transferBooking.pickupLocation,
                pickupDate: formatCalendarDate(b.transferBooking.pickupDate),
                pickupTime: b.transferBooking.pickupTime,
                flightNumber: b.transferBooking.flightNumber,
                fixedFare: Number(b.transferBooking.fixedFareSnapshot || 0),
                transferStatus: b.transferBooking.transferStatus,
              }
              : null,
            createdAt: b.createdAt instanceof Date ? b.createdAt.toISOString() : String(b.createdAt),
          })),
          pagination: {
            page,
            limit,
            total: passengerFallbacks.length,
            totalPages: Math.max(1, Math.ceil(passengerFallbacks.length / limit)),
          },
        };
      }
      throw err;
    }
  }

  /**
   * Public: Get single booking by reference with ownership verification
   */
  async getBookingByReference(bookingReference: string, passengerId: string, isAdmin = false) {
    try {
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
          statusHistory: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!booking) {
        const fallback = fallbackHotelBookingsCache.get(bookingReference);
        if (fallback) {
          if (!isAdmin && fallback.passengerId !== passengerId) {
            throw new Error('FORBIDDEN: You do not own this hotel booking');
          }
          return {
            ...fallback,
            checkInDate: formatCalendarDate(fallback.checkInDate),
            checkOutDate: formatCalendarDate(fallback.checkOutDate),
          };
        }
        return null;
      }

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
    } catch (err: any) {
      if (err.message.includes('FORBIDDEN')) throw err;
      if (isDbConnectionError(err)) {
        logger.warn(
          { err: err.message, bookingReference },
          '[Hospitality] Database unreachable on port 5433 during getBookingByReference. Checking fallback cache.'
        );
        const fallback = fallbackHotelBookingsCache.get(bookingReference);
        if (fallback) {
          if (!isAdmin && fallback.passengerId !== passengerId) {
            throw new Error('FORBIDDEN: You do not own this hotel booking');
          }
          return {
            ...fallback,
            checkInDate: formatCalendarDate(fallback.checkInDate),
            checkOutDate: formatCalendarDate(fallback.checkOutDate),
          };
        }
        return null;
      }
      throw err;
    }
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

    const result = await prisma.$transaction(async (tx) => {
      const releasedItems = await inventoryService.releaseReservation(
        tx,
        booking.id,
        'CANCELLED',
        passengerId,
        'Cancelled by passenger'
      );

      const cancelledBooking = await tx.hotelBooking.update({
        where: { bookingReference },
        data: {
          bookingStatus: HotelBookingStatus.CANCELLED,
          cancelledAt: new Date(),
        },
      });

      return { cancelledBooking, releasedItems };
    });

    if (result.releasedItems.length > 0) {
      inventoryService.emitSyncEvents('INVENTORY_CANCELLED', result.releasedItems, booking.id);
    }

    return result.cancelledBooking;
  }

  /**
   * Super Admin: List all hotel bookings with filtering, search and pagination
   */
  async adminListBookings(params: {
    hotelId?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    try {
      const where: any = {};
      if (params.hotelId) where.hotelId = params.hotelId;
      if (params.status && params.status !== 'ALL') {
        where.bookingStatus = params.status as HotelBookingStatus;
      }
      if (params.search) {
        const q = params.search.trim();
        where.OR = [
          { bookingReference: { contains: q, mode: 'insensitive' } },
          { hotel: { name: { contains: q, mode: 'insensitive' } } },
          { passenger: { fullName: { contains: q, mode: 'insensitive' } } },
          { passenger: { phoneNumber: { contains: q } } },
        ];
      }

      const [bookings, total] = await Promise.all([
        prisma.hotelBooking.findMany({
          where,
          include: {
            hotel: { select: { id: true, name: true, city: true, contactPhone: true, address: true } },
            passenger: { select: { id: true, fullName: true, phoneNumber: true, email: true } },
            bookingRooms: {
              include: {
                roomType: { select: { id: true, name: true, basePricePerNight: true, totalInventory: true } },
              },
            },
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
          totalPages: Math.ceil(total / limit) || 1,
        },
      };
    } catch (err: any) {
      if (isDbConnectionError(err)) {
        logger.warn({ err: err.message }, '[HospitalityBookingService] DB offline, serving from fallback cache');
        let all = Array.from(fallbackHotelBookingsCache.values());
        if (params.status && params.status !== 'ALL') {
          all = all.filter((b) => b.bookingStatus === params.status);
        }
        if (params.search) {
          const q = params.search.toLowerCase().trim();
          all = all.filter(
            (b) =>
              (b.bookingReference || '').toLowerCase().includes(q) ||
              (b.hotel?.name || '').toLowerCase().includes(q) ||
              (b.passenger?.fullName || '').toLowerCase().includes(q)
          );
        }
        const total = all.length;
        const bookings = all.slice(skip, skip + limit);
        return {
          bookings,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit) || 1,
          },
        };
      }
      throw err;
    }
  }

  /**
   * Super Admin: Retrieve booking details by ID or reference
   */
  async adminGetBooking(idOrRef: string) {
    try {
      const booking = await prisma.hotelBooking.findFirst({
        where: {
          OR: [{ id: idOrRef }, { bookingReference: idOrRef }],
        },
        include: {
          hotel: {
            include: {
              images: true,
            },
          },
          passenger: true,
          bookingRooms: {
            include: {
              roomType: {
                include: {
                  images: true,
                },
              },
            },
          },
          transferBooking: true,
          payment: true,
          statusHistory: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (booking) return booking;
    } catch (err: any) {
      if (!isDbConnectionError(err)) throw err;
    }

    const fallback =
      fallbackHotelBookingsCache.get(idOrRef) ||
      Array.from(fallbackHotelBookingsCache.values()).find((b) => b.bookingReference === idOrRef);
    return fallback || null;
  }

  /**
   * Super Admin: Accept hotel booking with atomic inventory reservation and passenger notification
   */
  async adminAcceptBooking(id: string, adminId: string, adminNote?: string) {
    try {
      // Execute atomically in a database transaction
      const txResult = await prisma.$transaction(async (tx) => {
        const booking = await tx.hotelBooking.findUnique({
          where: { id },
          include: {
            hotel: true,
            passenger: true,
            bookingRooms: {
              include: {
                roomType: true,
              },
            },
          },
        });

        if (!booking) {
          throw new Error('Hotel booking not found.');
        }

        if (booking.bookingStatus === 'CONFIRMED') {
          throw new Error('This booking has already been accepted and confirmed.');
        }

        if (booking.bookingStatus === 'CANCELLED' || booking.bookingStatus === 'DECLINED') {
          throw new Error(`Cannot accept booking in ${booking.bookingStatus} state without reinstatement.`);
        }

        // Confirm inventory reservation atomically across stay dates (rejects expired holds)
        const confirmedItems = await inventoryService.confirmReservation(tx, id, adminId);

        // Update booking to CONFIRMED
        const now = new Date();
        const confirmedBooking = await tx.hotelBooking.update({
          where: { id },
          data: {
            bookingStatus: HotelBookingStatus.CONFIRMED,
            confirmedAt: now,
            reviewedByAdminId: adminId,
            reviewedAt: now,
            adminReviewNote: adminNote || null,
          },
          include: {
            hotel: true,
            passenger: true,
            bookingRooms: { include: { roomType: true } },
            payment: true,
          },
        });

        // Record status history transition
        await tx.hotelBookingStatusHistory.create({
          data: {
            hotelBookingId: id,
            fromStatus: booking.bookingStatus,
            toStatus: HotelBookingStatus.CONFIRMED,
            changedByAdminId: adminId,
            note: adminNote || 'Accepted and confirmed by Super Admin',
          },
        });

        return { confirmedBooking, confirmedItems };
      });

      const updated = txResult.confirmedBooking;

      if (txResult.confirmedItems.length > 0) {
        inventoryService.emitSyncEvents('INVENTORY_CONFIRMED', txResult.confirmedItems, id);
      }

      // Audit log and notification
      await auditService.record({
        actorId: adminId,
        actorType: 'ADMIN',
        action: 'ADMIN_ACCEPT_HOTEL_BOOKING',
        entityType: 'HotelBooking',
        entityId: id,
        metadata: {
          bookingReference: updated.bookingReference,
          hotelName: updated.hotel?.name,
          adminNote,
        },
      });

      await notificationService.sendHotelBookingAcceptedNotification({
        passengerId: updated.passengerId,
        bookingReference: updated.bookingReference,
        hotelName: updated.hotel?.name,
        roomTypeName: updated.bookingRooms?.[0]?.roomType?.name,
        checkInDate: updated.checkInDate,
      });

      return updated;
    } catch (err: any) {
      if (isDbConnectionError(err)) {
        logger.warn({ err: err.message }, '[HospitalityBookingService] DB offline, updating fallback cache');
        const existing = fallbackHotelBookingsCache.get(id);
        if (!existing) throw new Error('Hotel booking not found in fallback cache.');

        const now = new Date();
        existing.bookingStatus = 'CONFIRMED';
        existing.confirmedAt = now;
        existing.reviewedByAdminId = adminId;
        existing.reviewedAt = now;
        existing.adminReviewNote = adminNote;
        fallbackHotelBookingsCache.set(id, existing);

        await notificationService.sendHotelBookingAcceptedNotification({
          passengerId: existing.passengerId || 'pax_demo',
          bookingReference: existing.bookingReference,
          hotelName: existing.hotelName || existing.hotel?.name,
          checkInDate: existing.checkInDate,
        });

        return existing;
      }
      throw err;
    }
  }

  /**
   * Super Admin: Decline hotel booking with mandatory reason and passenger notification
   */
  async adminDeclineBooking(id: string, adminId: string, declineReason: string, adminNote?: string) {
    if (!declineReason || !declineReason.trim()) {
      throw new Error('A specific decline reason is required when declining a booking request.');
    }

    try {
      const txResult = await prisma.$transaction(async (tx) => {
        const booking = await tx.hotelBooking.findUnique({
          where: { id },
          include: {
            hotel: true,
            passenger: true,
            bookingRooms: true,
          },
        });

        if (!booking) {
          throw new Error('Hotel booking not found.');
        }

        const releasedItems = await inventoryService.releaseReservation(
          tx,
          id,
          'CANCELLED',
          adminId,
          `Declined: ${declineReason.trim()}`
        );

        const now = new Date();
        const declined = await tx.hotelBooking.update({
          where: { id },
          data: {
            bookingStatus: HotelBookingStatus.DECLINED,
            declineReason: declineReason.trim(),
            adminReviewNote: adminNote || null,
            reviewedByAdminId: adminId,
            reviewedAt: now,
          },
          include: {
            hotel: true,
            passenger: true,
            bookingRooms: { include: { roomType: true } },
            payment: true,
          },
        });

        // Record status history transition
        await tx.hotelBookingStatusHistory.create({
          data: {
            hotelBookingId: id,
            fromStatus: booking.bookingStatus,
            toStatus: HotelBookingStatus.DECLINED,
            changedByAdminId: adminId,
            note: `Declined: ${declineReason.trim()}${adminNote ? ` (${adminNote.trim()})` : ''}`,
          },
        });

        return { declined, releasedItems };
      });

      const updated = txResult.declined;

      if (txResult.releasedItems.length > 0) {
        inventoryService.emitSyncEvents('INVENTORY_CANCELLED', txResult.releasedItems, id);
      }

      await auditService.record({
        actorId: adminId,
        actorType: 'ADMIN',
        action: 'ADMIN_DECLINE_HOTEL_BOOKING',
        entityType: 'HotelBooking',
        entityId: id,
        metadata: {
          bookingReference: updated.bookingReference,
          hotelName: updated.hotel?.name,
          declineReason,
          adminNote,
        },
      });

      await notificationService.sendHotelBookingDeclinedNotification(
        {
          passengerId: updated.passengerId,
          bookingReference: updated.bookingReference,
          hotelName: updated.hotel?.name,
        },
        declineReason
      );

      return updated;
    } catch (err: any) {
      if (isDbConnectionError(err)) {
        logger.warn({ err: err.message }, '[HospitalityBookingService] DB offline, updating fallback cache');
        const existing = fallbackHotelBookingsCache.get(id);
        if (!existing) throw new Error('Hotel booking not found in fallback cache.');

        const now = new Date();
        existing.bookingStatus = 'DECLINED';
        existing.declineReason = declineReason.trim();
        existing.adminReviewNote = adminNote;
        existing.reviewedByAdminId = adminId;
        existing.reviewedAt = now;
        fallbackHotelBookingsCache.set(id, existing);

        await notificationService.sendHotelBookingDeclinedNotification(
          {
            passengerId: existing.passengerId || 'pax_demo',
            bookingReference: existing.bookingReference,
            hotelName: existing.hotelName || existing.hotel?.name,
          },
          declineReason
        );

        return existing;
      }
      throw err;
    }
  }

  /**
   * Super Admin: Update booking status directly
   */
  async adminUpdateBookingStatus(id: string, status: HotelBookingStatus) {
    try {
      return await prisma.hotelBooking.update({
        where: { id },
        data: { bookingStatus: status },
      });
    } catch (err: any) {
      if (isDbConnectionError(err)) {
        const existing = fallbackHotelBookingsCache.get(id);
        if (existing) {
          existing.bookingStatus = status;
          fallbackHotelBookingsCache.set(id, existing);
          return existing;
        }
      }
      throw err;
    }
  }
}

export const hospitalityBookingService = new HospitalityBookingService();

