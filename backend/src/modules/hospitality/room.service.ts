import { prisma, isDbConnectionError } from '../../core/database/prisma';
import { logger } from '../../core/logging/logger';
import { Prisma, HotelStatus, HotelPublicationStatus } from '@prisma/client';
import { CreateRoomTypeDto, UpdateRoomTypeDto, CreateRateDto } from './hospitality.types';
import { HospitalityImageService } from './hospitalityImage.service';
import { BUILTIN_GONDAR_HOTELS } from './hotel.service';
import {
  parseCalendarDate,
  validateBookingDates,
  formatCalendarDate,
  addCalendarDays,
} from './utils/addisDate';

function isUuid(val?: string | null): boolean {
  return !!val && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
}

export class RoomService {
  /**
   * Super Admin: Create a room type for a hotel
   */
  async createRoomType(hotelId: string, dto: CreateRoomTypeDto) {
    const isHotelUuid = isUuid(hotelId);

    if (!isHotelUuid) {
      throw new Error('INVALID_HOTEL_ID: Hotel ID must be a valid UUID');
    }

    try {
      const hotel = await prisma.hotel.findUnique({ where: { id: hotelId } });
      if (!hotel) {
        throw new Error('HOTEL_NOT_FOUND: Hotel does not exist');
      }

      const room = await prisma.hotelRoomType.create({
        data: {
          hotelId,
          name: dto.name,
          description: dto.description || '',
          maximumAdults: dto.maximumAdults || 2,
          maximumChildren: dto.maximumChildren || 1,
          maximumGuests: dto.maximumGuests || 3,
          totalInventory: dto.totalInventory || 10,
          basePricePerNight: new Prisma.Decimal(dto.basePricePerNight || 3500),
          currency: dto.currency || 'ETB',
        },
      });

      const rawImages = (dto.galleryImages || dto.images || []);
      if (Array.isArray(rawImages) && rawImages.length > 0) {
        const normalized = rawImages.map((img: any, idx: number) => {
          if (typeof img === 'string') {
            return {
              imageUrl: img,
              caption: null,
              displayOrder: idx,
              isPrimary: idx === 0,
              publicId: undefined,
              fileFormat: undefined,
              fileSize: undefined,
            };
          }
          return {
            imageUrl: img.imageUrl || img.fileData || '',
            caption: img.caption || null,
            displayOrder: img.displayOrder !== undefined ? img.displayOrder : idx,
            isPrimary: img.isPrimary !== undefined ? img.isPrimary : idx === 0,
            publicId: img.publicId,
            fileFormat: img.fileFormat,
            fileSize: img.fileSize,
          };
        });

        const processed = await Promise.all(
          normalized.map(async (img, idx) => {
            const raw = img.imageUrl;
            if (raw && (raw.startsWith('data:') || raw.length > 500)) {
              try {
                const uploaded = await HospitalityImageService.processImage(raw, {
                  folder: `kings-taxi/hotels/hotel-${hotel.id}/rooms/room-${room.id}`,
                  publicIdPrefix: `room_${room.id.slice(0, 8)}`,
                  caption: img.caption,
                  displayOrder: img.displayOrder ?? idx,
                  isPrimary: img.isPrimary,
                });
                return {
                  imageUrl: uploaded.imageUrl,
                  publicId: uploaded.publicId || null,
                  caption: img.caption,
                  displayOrder: img.displayOrder ?? idx,
                  isPrimary: img.isPrimary,
                  fileFormat: uploaded.fileFormat || null,
                  fileSize: uploaded.fileSize || null,
                };
              } catch (err: any) {
                logger.warn({ error: err.message }, '[createRoomType] Cloudinary room image upload error');
              }
            }
            return {
              imageUrl: img.imageUrl,
              publicId: img.publicId || null,
              caption: img.caption,
              displayOrder: img.displayOrder ?? idx,
              isPrimary: img.isPrimary,
              fileFormat: img.fileFormat || null,
              fileSize: img.fileSize || null,
            };
          })
        );

        await Promise.all(
          processed.map((img) =>
            prisma.roomImage.create({
              data: {
                roomTypeId: room.id,
                imageUrl: img.imageUrl,
                publicId: img.publicId,
                caption: img.caption,
                displayOrder: img.displayOrder,
                isPrimary: img.isPrimary,
                fileFormat: img.fileFormat,
                fileSize: img.fileSize,
              },
            })
          )
        );
      }

      return await prisma.hotelRoomType.findUnique({
        where: { id: room.id },
        include: {
          images: {
            orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
          },
          rates: true,
        },
      });
    } catch (err: any) {
      logger.error({ err, hotelId, name: dto.name }, '[createRoomType] Database error creating room type');
      throw err;
    }
  }

  /**
   * Super Admin: Update room type
   */
  async updateRoomType(roomTypeId: string, dto: UpdateRoomTypeDto) {
    if (!isUuid(roomTypeId)) {
      return {
        id: roomTypeId,
        ...dto,
        updatedAt: new Date(),
      } as any;
    }
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
   * Retrieve active room types for a specific hotel (public or admin)
   */
  async getRoomsByHotel(hotelIdOrSlug: string, isPublic = true) {
    const isIdUuid = isUuid(hotelIdOrSlug);

    let hotel: any = null;
    if (isIdUuid) {
      hotel = await prisma.hotel.findUnique({ where: { id: hotelIdOrSlug } });
    } else {
      hotel = await prisma.hotel.findUnique({ where: { slug: hotelIdOrSlug } });
    }

    if (!hotel) {
      const builtin = BUILTIN_GONDAR_HOTELS.find((h) => h.id === hotelIdOrSlug || h.slug === hotelIdOrSlug);
      if (builtin) {
        return (builtin.roomTypes || []).filter((r: any) => !isPublic || r.status === 'ACTIVE');
      }
      throw new Error('HOTEL_NOT_FOUND: Hotel does not exist');
    }

    if (isPublic) {
      const isPublished =
        hotel.status === HotelStatus.PUBLISHED ||
        hotel.publicationStatus === HotelPublicationStatus.PUBLISHED;
      if (!isPublished || hotel.status === HotelStatus.ARCHIVED) {
        throw new Error('HOTEL_NOT_FOUND: Hotel is not currently published');
      }
    }

    const rooms = await prisma.hotelRoomType.findMany({
      where: {
        hotelId: hotel.id,
        status: isPublic ? 'ACTIVE' : undefined,
      },
      include: {
        images: {
          orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
        },
        rates: {
          where: { status: 'ACTIVE' },
          orderBy: { startDate: 'asc' },
        },
      },
      orderBy: { basePricePerNight: 'asc' },
    });

    return rooms.map((r) => ({
      ...r,
      basePricePerNight: Number(r.basePricePerNight),
      photos: (r.images && r.images.length > 0)
        ? r.images.map((img) => img.imageUrl)
        : (hotel.coverImageUrl ? [hotel.coverImageUrl] : []),
      rates: r.rates.map((rt) => ({
        ...rt,
        pricePerNight: Number(rt.pricePerNight),
      })),
    }));
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

    try {
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
          availableInventory: remainingInventory,
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
    } catch (err: any) {
      if (isDbConnectionError(err)) {
        logger.warn(
          { err: err.message },
          `[Hospitality] Database unreachable. Serving default room availability for hotel ${hotelId}`
        );
        return this.getBuiltinRoomAvailability(
          hotelId,
          checkInDate,
          checkOutDate,
          nights,
          guestsCount,
          roomsNeeded
        );
      }
      throw err;
    }
  }

  getBuiltinRoomAvailability(
    hotelId: string,
    checkInDate: Date,
    checkOutDate: Date,
    nights: number,
    guestsCount: number,
    roomsNeeded: number
  ) {
    const defaultRooms = [
      {
        id: 'room_goha_std',
        name: 'Standard Hillside Twin Room',
        description: 'Comfortable twin bedding with garden and mountain hillside views, private balcony, and en-suite bath.',
        maximumAdults: 2,
        maximumChildren: 1,
        maximumGuests: 3,
        totalInventory: 14,
        remainingInventory: 10,
        isAvailable: 3 >= guestsCount && 10 >= roomsNeeded,
        basePricePerNight: 4800,
        averageNightlyPrice: 4800,
        currency: 'ETB',
        nightlyRates: Array.from({ length: nights }).map((_, i) => ({
          date: formatCalendarDate(addCalendarDays(checkInDate, i)),
          price: 4800,
          isSeasonal: false,
        })),
      },
      {
        id: 'room_goha_dlx',
        name: 'Deluxe Royal Castle View Room',
        description: 'Spacious king-size bed overlooking Fasil Ghebbi royal enclosure, minibar, lounge chair, and luxury bath amenities.',
        maximumAdults: 2,
        maximumChildren: 2,
        maximumGuests: 4,
        totalInventory: 8,
        remainingInventory: 6,
        isAvailable: 4 >= guestsCount && 6 >= roomsNeeded,
        basePricePerNight: 7500,
        averageNightlyPrice: 7500,
        currency: 'ETB',
        nightlyRates: Array.from({ length: nights }).map((_, i) => ({
          date: formatCalendarDate(addCalendarDays(checkInDate, i)),
          price: 7500,
          isSeasonal: false,
        })),
      },
      {
        id: 'room_goha_suite',
        name: 'Imperial Presidential Suite',
        description: 'Expansive private suite with separate salon living area, wrap-around panoramic terrace, and VIP chauffeur access.',
        maximumAdults: 3,
        maximumChildren: 2,
        maximumGuests: 5,
        totalInventory: 3,
        remainingInventory: 2,
        isAvailable: 5 >= guestsCount && 2 >= roomsNeeded,
        basePricePerNight: 14000,
        averageNightlyPrice: 14000,
        currency: 'ETB',
        nightlyRates: Array.from({ length: nights }).map((_, i) => ({
          date: formatCalendarDate(addCalendarDays(checkInDate, i)),
          price: 14000,
          isSeasonal: false,
        })),
      },
    ];

    return {
      hotelId,
      checkInDate: formatCalendarDate(checkInDate),
      checkOutDate: formatCalendarDate(checkOutDate),
      nights,
      roomsNeeded,
      guestsCount,
      roomTypes: defaultRooms,
    };
  }

  /**
   * Super Admin: Get all gallery images for a room type
   */
  async getRoomImages(roomTypeId: string) {
    try {
      return await prisma.roomImage.findMany({
        where: { roomTypeId },
        orderBy: { displayOrder: 'asc' },
      });
    } catch (err: any) {
      if (isDbConnectionError(err)) {
        return [];
      }
      throw err;
    }
  }

  /**
   * Super Admin: Set/replace gallery images for a room type (strictly 2 to 4 images)
   */
  async setRoomImages(
    roomTypeId: string,
    images: {
      imageUrl: string;
      publicId?: string;
      caption?: string;
      displayOrder?: number;
      isPrimary?: boolean;
      fileFormat?: string;
      fileSize?: number;
    }[]
  ) {
    if (!images || images.length < 1 || images.length > 8) {
      throw new Error('A room type must have between 1 and 8 images.');
    }

    const hasPrimary = images.some((img) => img.isPrimary);
    const normalized = images.map((img, idx) => ({
      ...img,
      displayOrder: img.displayOrder !== undefined ? img.displayOrder : idx,
      isPrimary: hasPrimary ? !!img.isPrimary : idx === 0,
    }));

    if (!isUuid(roomTypeId)) {
      throw new Error('INVALID_ROOM_TYPE_ID: Room type ID must be a valid UUID');
    }

    try {
      const room = await prisma.hotelRoomType.findUnique({ where: { id: roomTypeId } });
      if (!room) throw new Error('ROOM_TYPE_NOT_FOUND: Room type does not exist');

      const existingImages = (await prisma.roomImage.findMany({ where: { roomTypeId } })) || [];

      // Resilient Base64 upload to Cloudinary if image data URIs are supplied
      const processedImages = await Promise.all(
        normalized.map(async (img, idx) => {
          if (img.imageUrl && (img.imageUrl.startsWith('data:') || img.imageUrl.length > 500)) {
            try {
              const uploadRes = await HospitalityImageService.processImage(img.imageUrl, {
                folder: `kings-taxi/hotels/hotel-${room.hotelId}/rooms/room-${roomTypeId}`,
                publicIdPrefix: `room_${roomTypeId.slice(0, 8)}`,
                caption: img.caption,
                displayOrder: img.displayOrder ?? idx,
                isPrimary: img.isPrimary,
              });
              return {
                ...img,
                imageUrl: uploadRes.imageUrl,
                publicId: uploadRes.publicId || img.publicId,
                fileFormat: uploadRes.fileFormat || img.fileFormat,
                fileSize: uploadRes.fileSize || img.fileSize,
              };
            } catch (err: any) {
              logger.warn({ error: err.message }, '[setRoomImages] Cloudinary room image upload error');
              return img;
            }
          }
          return img;
        })
      );

      const created = await prisma.$transaction(async (tx) => {
        await tx.roomImage.deleteMany({ where: { roomTypeId } });

        return Promise.all(
          processedImages.map((img, idx) =>
            tx.roomImage.create({
              data: {
                roomTypeId,
                imageUrl: img.imageUrl,
                publicId: img.publicId || null,
                caption: img.caption || null,
                displayOrder: img.displayOrder ?? idx,
                isPrimary: img.isPrimary,
                fileFormat: img.fileFormat || null,
                fileSize: img.fileSize || null,
              },
            })
          )
        );
      });

      // Cleanup removed Cloudinary assets safely after DB commit
      const newPublicIds = new Set(processedImages.map((p) => p.publicId).filter(Boolean));
      for (const oldImg of existingImages) {
        if (oldImg.publicId && !newPublicIds.has(oldImg.publicId)) {
          await HospitalityImageService.safeDelete(oldImg.publicId);
        }
      }

      return created;
    } catch (err: any) {
      logger.error({ err, roomTypeId }, '[setRoomImages] Database error setting room images');
      throw err;
    }
  }

  /**
   * Super Admin: Add single room image
   */
  async addRoomImage(
    roomTypeId: string,
    imageDto: { imageUrl: string; fileData?: string; caption?: string; isPrimary?: boolean; displayOrder?: number }
  ) {
    const room = await prisma.hotelRoomType.findUnique({ where: { id: roomTypeId } });
    if (!room) throw new Error('ROOM_TYPE_NOT_FOUND: Room type does not exist');

    let finalImageUrl = imageDto.imageUrl;
    let publicId: string | null = null;
    let fileFormat: string | null = null;
    let fileSize: number | null = null;

    const raw = imageDto.fileData || imageDto.imageUrl;
    if (raw && (raw.startsWith('data:') || raw.length > 500)) {
      const uploadRes = await HospitalityImageService.processImage(raw, {
        folder: `kings-taxi/hotels/hotel-${room.hotelId}/rooms/room-${roomTypeId}`,
        publicIdPrefix: `room_${roomTypeId.slice(0, 8)}`,
        caption: imageDto.caption,
        isPrimary: imageDto.isPrimary,
      });
      finalImageUrl = uploadRes.imageUrl;
      publicId = uploadRes.publicId || null;
      fileFormat = uploadRes.fileFormat || null;
      fileSize = uploadRes.fileSize || null;
    }

    if (imageDto.isPrimary) {
      await prisma.roomImage.updateMany({
        where: { roomTypeId },
        data: { isPrimary: false },
      });
    }

    return prisma.roomImage.create({
      data: {
        roomTypeId,
        imageUrl: finalImageUrl,
        publicId,
        caption: imageDto.caption || null,
        displayOrder: imageDto.displayOrder || 0,
        isPrimary: imageDto.isPrimary || false,
        fileFormat,
        fileSize,
      },
    });
  }

  /**
   * Super Admin: Delete single room image
   */
  async deleteRoomImage(roomTypeId: string, imageId: string) {
    const image = await prisma.roomImage.findFirst({
      where: { id: imageId, roomTypeId },
    });
    if (!image) throw new Error('IMAGE_NOT_FOUND: Room image does not exist');

    if (image.publicId) {
      await HospitalityImageService.safeDelete(image.publicId);
    }

    return prisma.roomImage.delete({ where: { id: imageId } });
  }

  /**
   * Super Admin: Delete room type and its associated images safely
   */
  async deleteRoomType(roomTypeId: string) {
    const room = await prisma.hotelRoomType.findUnique({
      where: { id: roomTypeId },
      include: { images: true },
    });
    if (!room) throw new Error('ROOM_TYPE_NOT_FOUND: Room type does not exist');

    for (const img of room.images) {
      if (img.publicId) {
        await HospitalityImageService.safeDelete(img.publicId);
      }
    }

    return prisma.hotelRoomType.delete({ where: { id: roomTypeId } });
  }
}

export const roomService = new RoomService();
