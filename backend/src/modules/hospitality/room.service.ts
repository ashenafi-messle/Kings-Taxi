import { prisma } from '../../core/database/prisma';
import { Prisma } from '@prisma/client';
import { CreateRoomTypeDto, UpdateRoomTypeDto, CreateRateDto } from './hospitality.types';
import {
  parseCalendarDate,
  validateBookingDates,
  formatCalendarDate,
  addCalendarDays,
} from './utils/addisDate';

export class RoomService {
  /**
   * Super Admin: Create a room type for a hotel
   */
  async createRoomType(hotelId: string, dto: CreateRoomTypeDto) {
    const hotel = await prisma.hotel.findUnique({ where: { id: hotelId } });
    if (!hotel) throw new Error('HOTEL_NOT_FOUND: Hotel does not exist');

    return prisma.hotelRoomType.create({
      data: {
        hotelId,
        name: dto.name,
        description: dto.description,
        maximumAdults: dto.maximumAdults || 2,
        maximumChildren: dto.maximumChildren || 1,
        maximumGuests: dto.maximumGuests || 3,
        totalInventory: dto.totalInventory || 10,
        basePricePerNight: new Prisma.Decimal(dto.basePricePerNight),
        currency: dto.currency || 'ETB',
      },
    });
  }

  /**
   * Super Admin: Update room type
   */
  async updateRoomType(roomTypeId: string, dto: UpdateRoomTypeDto) {
    const room = await prisma.hotelRoomType.findUnique({ where: { id: roomTypeId } });
    if (!room) throw new Error('ROOM_TYPE_NOT_FOUND: Room type does not exist');

    return prisma.hotelRoomType.update({
      where: { id: roomTypeId },
      data: {
        name: dto.name,
        description: dto.description,
        maximumAdults: dto.maximumAdults,
        maximumChildren: dto.maximumChildren,
        maximumGuests: dto.maximumGuests,
        totalInventory: dto.totalInventory,
        basePricePerNight: dto.basePricePerNight !== undefined ? new Prisma.Decimal(dto.basePricePerNight) : undefined,
        currency: dto.currency,
        status: dto.status,
      },
    });
  }

  /**
   * Super Admin: Create date-sensitive rate (seasonal pricing)
   */
  async createRate(roomTypeId: string, dto: CreateRateDto) {
    const room = await prisma.hotelRoomType.findUnique({ where: { id: roomTypeId } });
    if (!room) throw new Error('ROOM_TYPE_NOT_FOUND: Room type does not exist');

    const startDate = parseCalendarDate(dto.startDate);
    const endDate = parseCalendarDate(dto.endDate);

    if (endDate.getTime() <= startDate.getTime()) {
      throw new Error('INVALID_DATE_RANGE: Rate endDate must be after startDate');
    }

    return prisma.hotelRate.create({
      data: {
        roomTypeId,
        startDate,
        endDate,
        pricePerNight: new Prisma.Decimal(dto.pricePerNight),
        currency: dto.currency || 'ETB',
        minimumNights: dto.minimumNights || 1,
      },
    });
  }

  /**
   * Check real-time room availability for a hotel across dates
   */
  async checkHotelAvailability(
    hotelId: string,
    checkInDateStr: string,
    checkOutDateStr: string,
    guestsCount = 2,
    roomsNeeded = 1
  ) {
    const dateCheck = validateBookingDates(checkInDateStr, checkOutDateStr);
    if (!dateCheck.valid) {
      throw new Error(dateCheck.error);
    }

    const { nights, checkInDate, checkOutDate } = dateCheck;

    // Fetch active room types for this hotel
    const roomTypes = await prisma.hotelRoomType.findMany({
      where: {
        hotelId,
        status: 'ACTIVE',
      },
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

    if (roomTypes.length === 0) {
      return {
        hotelId,
        checkInDate: formatCalendarDate(checkInDate),
        checkOutDate: formatCalendarDate(checkOutDate),
        nights,
        roomTypes: [],
      };
    }

    // Find all overlapping active bookings for this hotel
    // Overlapping condition: booking.checkInDate < checkOutDate AND booking.checkOutDate > checkInDate
    const overlappingBookings = await prisma.hotelBooking.findMany({
      where: {
        hotelId,
        bookingStatus: { in: ['CONFIRMED', 'PENDING'] },
        checkInDate: { lt: checkOutDate },
        checkOutDate: { gt: checkInDate },
      },
      include: {
        bookingRooms: true,
      },
    });

    // Calculate booked inventory per room type
    const bookedQuantities: Record<string, number> = {};
    for (const booking of overlappingBookings) {
      for (const br of booking.bookingRooms) {
        bookedQuantities[br.roomTypeId] = (bookedQuantities[br.roomTypeId] || 0) + br.quantity;
      }
    }

    const evaluatedRooms = roomTypes.map((room) => {
      const booked = bookedQuantities[room.id] || 0;
      const remainingInventory = Math.max(0, room.totalInventory - booked);
      const isCapacitySufficient = room.maximumGuests >= guestsCount;
      const hasEnoughInventory = remainingInventory >= roomsNeeded;

      // Calculate nightly prices across the range
      const nightlyRates: Array<{ date: string; price: number; isSeasonal: boolean }> = [];
      let totalRoomPrice = new Prisma.Decimal(0);

      for (let dayOffset = 0; dayOffset < nights; dayOffset++) {
        const currentDate = addCalendarDays(checkInDate, dayOffset);
        const dateStr = formatCalendarDate(currentDate);

        // Check if there is an active seasonal rate covering this specific date
        const matchingRate = room.rates.find(
          (r) =>
            parseCalendarDate(r.startDate).getTime() <= currentDate.getTime() &&
            parseCalendarDate(r.endDate).getTime() >= currentDate.getTime()
        );

        const nightlyPrice = matchingRate ? matchingRate.pricePerNight : room.basePricePerNight;
        totalRoomPrice = totalRoomPrice.plus(nightlyPrice);

        nightlyRates.push({
          date: dateStr,
          price: Number(nightlyPrice),
          isSeasonal: Boolean(matchingRate),
        });
      }

      const averageNightlyPrice = Number(totalRoomPrice.dividedBy(nights).toFixed(2));

      return {
        id: room.id,
        name: room.name,
        description: room.description,
        maximumGuests: room.maximumGuests,
        maximumAdults: room.maximumAdults,
        maximumChildren: room.maximumChildren,
        totalInventory: room.totalInventory,
        remainingInventory,
        isAvailable: hasEnoughInventory && isCapacitySufficient,
        basePricePerNight: Number(room.basePricePerNight),
        averageNightlyPrice,
        currency: room.currency,
        nightlyRates,
      };
    });

    return {
      hotelId,
      checkInDate: formatCalendarDate(checkInDate),
      checkOutDate: formatCalendarDate(checkOutDate),
      nights,
      roomsNeeded,
      guestsCount,
      roomTypes: evaluatedRooms,
    };
  }
}

export const roomService = new RoomService();
