import { prisma } from '../../core/database/prisma';
import { logger } from '../../core/logging/logger';
import { HotelStatus } from '@prisma/client';
import { CreateHotelDto, UpdateHotelDto, CreateHotelImageDto } from './hospitality.types';

function isDbConnectionError(err: any): boolean {
  if (!err) return false;
  const msg = typeof err.message === 'string' ? err.message : '';
  return (
    err.code === 'P1001' ||
    err.code === 'P1002' ||
    err.name === 'PrismaClientInitializationError' ||
    msg.includes("Can't reach database server") ||
    msg.includes('connection timed out') ||
    msg.includes('Connection refused')
  );
}

const BUILTIN_GONDAR_HOTELS: any[] = [
  {
    id: 'h_goha_hotel_gondar',
    name: 'Goha Hotel Gondar',
    slug: 'goha-hotel-gondar',
    shortDescription: 'Iconic hilltop hotel overlooking the castles of Gondar with panoramic highland vistas.',
    description:
      'Perched high on the hills above Gondar, Goha Hotel commands breathtaking panoramic views of the historic royal castles, royal baths, and the sweeping Ethiopian highlands.',
    address: 'Goha Hill, Gondar, Amhara, Ethiopia',
    city: 'Gondar',
    subCity: 'Goha',
    latitude: 12.6185,
    longitude: 37.472,
    starRating: 4,
    featured: true,
    checkInTime: '14:00',
    checkOutTime: '11:00',
    coverImage: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&auto=format&fit=crop&q=80',
    images: [
      { id: 'img_goha_1', imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&auto=format&fit=crop&q=80', isCover: true, altText: 'Goha Hotel Panorama' },
      { id: 'img_goha_2', imageUrl: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1200&auto=format&fit=crop&q=80', isCover: false, altText: 'Goha Hillside Pool' },
    ],
    amenities: [
      { id: 'a_wifi', name: 'High-Speed Wi-Fi', slug: 'wifi', icon: 'wifi' },
      { id: 'a_airport', name: 'Gondar Airport Transfer', slug: 'airport-transfer', icon: 'plane' },
      { id: 'a_pool', name: 'Swimming Pool', slug: 'swimming-pool', icon: 'droplet' },
      { id: 'a_restaurant', name: 'Gourmet Restaurant', slug: 'restaurant', icon: 'utensils' },
    ],
    startingPrice: 4800,
    currency: 'ETB',
    airportTransferAvailable: true,
    airportTransferRate: {
      id: 'rate_goha_sedan',
      origin: 'Atse Tewodros Airport (GDQ), Gondar',
      fixedPrice: 1200,
      currency: 'ETB',
      vehicleType: 'STANDARD_SEDAN',
      capacity: 4,
    },
    roomTypes: [
      {
        id: 'room_goha_std',
        name: 'Standard Hillside Twin Room',
        description: 'Comfortable twin bedding with garden and mountain hillside views, private balcony, and en-suite bath.',
        basePricePerNight: 4800,
        currency: 'ETB',
        maximumAdults: 2,
        maximumChildren: 1,
        maximumGuests: 3,
        totalInventory: 14,
        status: 'ACTIVE',
        rates: [],
      },
      {
        id: 'room_goha_dlx',
        name: 'Deluxe Royal Castle View Room',
        description: 'Spacious king-size bed overlooking Fasil Ghebbi royal enclosure, minibar, lounge chair, and luxury bath amenities.',
        basePricePerNight: 7500,
        currency: 'ETB',
        maximumAdults: 2,
        maximumChildren: 2,
        maximumGuests: 4,
        totalInventory: 8,
        status: 'ACTIVE',
        rates: [],
      },
      {
        id: 'room_goha_suite',
        name: 'Imperial Presidential Suite',
        description: 'Expansive private suite with separate salon living area, wrap-around panoramic terrace, and VIP chauffeur access.',
        basePricePerNight: 14000,
        currency: 'ETB',
        maximumAdults: 3,
        maximumChildren: 2,
        maximumGuests: 5,
        totalInventory: 3,
        status: 'ACTIVE',
        rates: [],
      },
    ],
    transferRates: [
      {
        id: 'rate_goha_sedan',
        originName: 'Atse Tewodros Airport (GDQ), Gondar',
        destinationName: 'Goha Hotel, Goha Hill, Gondar',
        vehicleType: 'STANDARD_SEDAN',
        vehicleCapacity: 4,
        fixedPrice: 1200,
        currency: 'ETB',
        isActive: true,
      },
      {
        id: 'rate_goha_van',
        originName: 'Atse Tewodros Airport (GDQ), Gondar',
        destinationName: 'Goha Hotel, Goha Hill, Gondar',
        vehicleType: 'COMFORT_VAN',
        vehicleCapacity: 6,
        fixedPrice: 1800,
        currency: 'ETB',
        isActive: true,
      },
    ],
  },
  {
    id: 'h_taye_belay_gondar',
    name: 'Taye Belay Hotel Gondar',
    slug: 'taye-belay-hotel-gondar',
    shortDescription: 'Centrally situated luxury hotel minutes from Fasil Ghebbi and the historical quarter.',
    description:
      'Located in the heart of historic Gondar at Piasa, Taye Belay Hotel is moments away from the 17th-century castles of Emperor Fasilides.',
    address: 'Piasa Square, Gondar, Ethiopia',
    city: 'Gondar',
    subCity: 'Piasa',
    latitude: 12.608,
    longitude: 37.469,
    starRating: 4,
    featured: true,
    checkInTime: '14:00',
    checkOutTime: '11:00',
    coverImage: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1200&auto=format&fit=crop&q=80',
    images: [
      { id: 'img_taye_1', imageUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1200&auto=format&fit=crop&q=80', isCover: true, altText: 'Taye Belay Hotel Exterior' },
    ],
    amenities: [
      { id: 'a_wifi', name: 'High-Speed Wi-Fi', slug: 'wifi', icon: 'wifi' },
      { id: 'a_airport', name: 'Gondar Airport Transfer', slug: 'airport-transfer', icon: 'plane' },
    ],
    startingPrice: 5600,
    currency: 'ETB',
    airportTransferAvailable: true,
    airportTransferRate: {
      id: 'rate_taye_sedan',
      origin: 'Atse Tewodros Airport (GDQ), Gondar',
      fixedPrice: 1000,
      currency: 'ETB',
      vehicleType: 'STANDARD_SEDAN',
      capacity: 4,
    },
    roomTypes: [
      {
        id: 'room_taye_sup',
        name: 'Superior Double Room',
        description: 'Elegant double room with queen-sized bed, work desk, high-speed Wi-Fi, and private bath.',
        basePricePerNight: 5600,
        currency: 'ETB',
        maximumAdults: 2,
        maximumChildren: 1,
        maximumGuests: 3,
        totalInventory: 15,
        status: 'ACTIVE',
        rates: [],
      },
      {
        id: 'room_taye_exec',
        name: 'Fasil Royal Executive Suite',
        description: 'Spacious royal suite with plush furnishings, city castle outlook, mini-bar, and airport pickup priority.',
        basePricePerNight: 11500,
        currency: 'ETB',
        maximumAdults: 3,
        maximumChildren: 2,
        maximumGuests: 4,
        totalInventory: 6,
        status: 'ACTIVE',
        rates: [],
      },
    ],
    transferRates: [
      {
        id: 'rate_taye_sedan',
        originName: 'Atse Tewodros Airport (GDQ), Gondar',
        destinationName: 'Taye Belay Hotel, Piasa, Gondar',
        vehicleType: 'STANDARD_SEDAN',
        vehicleCapacity: 4,
        fixedPrice: 1000,
        currency: 'ETB',
        isActive: true,
      },
    ],
  },
];

export class HotelService {
  /**
   * Helper to slugify hotel names
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Super Admin: Create a new hotel
   */
  async createHotel(dto: CreateHotelDto, adminId?: string) {
    const slug = dto.slug || this.generateSlug(dto.name);

    // Verify slug uniqueness
    const existing = await prisma.hotel.findUnique({ where: { slug } });
    const finalSlug = existing ? `${slug}-${Date.now().toString(36)}` : slug;

    return prisma.$transaction(async (tx) => {
      const hotel = await tx.hotel.create({
        data: {
          name: dto.name,
          slug: finalSlug,
          description: dto.description,
          shortDescription: dto.shortDescription,
          address: dto.address,
          city: dto.city || 'Gondar',
          subCity: dto.subCity,
          latitude: dto.latitude,
          longitude: dto.longitude,
          contactPhone: dto.contactPhone,
          contactEmail: dto.contactEmail,
          website: dto.website,
          starRating: dto.starRating || 4,
          checkInTime: dto.checkInTime || '14:00',
          checkOutTime: dto.checkOutTime || '11:00',
          timezone: dto.timezone || 'Africa/Addis_Ababa',
          status: HotelStatus.DRAFT,
          featured: dto.featured ?? false,
          createdByAdminId: adminId,
        },
      });

      // Link amenities if provided
      if (dto.amenitySlugs && dto.amenitySlugs.length > 0) {
        const amenities = await tx.hotelAmenity.findMany({
          where: { slug: { in: dto.amenitySlugs } },
        });

        for (const amenity of amenities) {
          await tx.hotelAmenityRelation.create({
            data: {
              hotelId: hotel.id,
              amenityId: amenity.id,
            },
          });
        }
      }

      return hotel;
    });
  }

  /**
   * Super Admin: Update hotel details
   */
  async updateHotel(id: string, dto: UpdateHotelDto, adminId?: string) {
    const hotel = await prisma.hotel.findUnique({ where: { id } });
    if (!hotel) {
      throw new Error('HOTEL_NOT_FOUND: Hotel does not exist');
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.hotel.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
          shortDescription: dto.shortDescription,
          address: dto.address,
          city: dto.city,
          subCity: dto.subCity,
          latitude: dto.latitude,
          longitude: dto.longitude,
          contactPhone: dto.contactPhone,
          contactEmail: dto.contactEmail,
          website: dto.website,
          starRating: dto.starRating,
          checkInTime: dto.checkInTime,
          checkOutTime: dto.checkOutTime,
          timezone: dto.timezone,
          featured: dto.featured,
          status: dto.status,
          updatedByAdminId: adminId,
        },
      });

      // Update amenities if specified
      if (dto.amenitySlugs !== undefined) {
        await tx.hotelAmenityRelation.deleteMany({ where: { hotelId: id } });
        if (dto.amenitySlugs.length > 0) {
          const amenities = await tx.hotelAmenity.findMany({
            where: { slug: { in: dto.amenitySlugs } },
          });
          for (const amenity of amenities) {
            await tx.hotelAmenityRelation.create({
              data: {
                hotelId: id,
                amenityId: amenity.id,
              },
            });
          }
        }
      }

      return updated;
    });
  }

  /**
   * Super Admin: Publish hotel (makes visible to passenger mobile app)
   */
  async publishHotel(id: string, adminId?: string) {
    const hotel = await prisma.hotel.findUnique({ where: { id } });
    if (!hotel) throw new Error('HOTEL_NOT_FOUND: Hotel does not exist');

    return prisma.hotel.update({
      where: { id },
      data: {
        status: HotelStatus.PUBLISHED,
        publishedAt: new Date(),
        updatedByAdminId: adminId,
      },
    });
  }

  /**
   * Super Admin: Unpublish hotel
   */
  async unpublishHotel(id: string, adminId?: string) {
    const hotel = await prisma.hotel.findUnique({ where: { id } });
    if (!hotel) throw new Error('HOTEL_NOT_FOUND: Hotel does not exist');

    return prisma.hotel.update({
      where: { id },
      data: {
        status: HotelStatus.UNPUBLISHED,
        updatedByAdminId: adminId,
      },
    });
  }

  /**
   * Super Admin: Delete hotel (soft archive if bookings exist)
   */
  async deleteHotel(id: string) {
    const bookingCount = await prisma.hotelBooking.count({ where: { hotelId: id } });
    if (bookingCount > 0) {
      // Soft archive to protect foreign key integrity and audit logs
      return prisma.hotel.update({
        where: { id },
        data: { status: HotelStatus.ARCHIVED },
      });
    }

    return prisma.hotel.delete({ where: { id } });
  }

  /**
   * Super Admin: Upload and associate an image
   */
  async addImage(hotelId: string, dto: CreateHotelImageDto) {
    const hotel = await prisma.hotel.findUnique({ where: { id: hotelId } });
    if (!hotel) throw new Error('HOTEL_NOT_FOUND: Hotel does not exist');

    if (dto.isCover) {
      // Remove isCover flag from existing images
      await prisma.hotelImage.updateMany({
        where: { hotelId },
        data: { isCover: false },
      });
    }

    return prisma.hotelImage.create({
      data: {
        hotelId,
        imageUrl: dto.imageUrl,
        altText: dto.altText,
        displayOrder: dto.displayOrder || 0,
        isCover: dto.isCover || false,
      },
    });
  }

  /**
   * Super Admin: Remove hotel image
   */
  async deleteImage(imageId: string) {
    return prisma.hotelImage.delete({ where: { id: imageId } });
  }

  /**
   * Public: List published hotels with search, city filter, starting price, and pagination
   */
  async listPublishedHotels(params: {
    city?: string;
    search?: string;
    starRating?: number;
    featured?: boolean;
    page?: number;
    limit?: number;
  }) {
    try {
      const page = Math.max(1, params.page || 1);
      const limit = Math.min(50, Math.max(1, params.limit || 10));
      const skip = (page - 1) * limit;

      const where: any = {
        status: HotelStatus.PUBLISHED,
      };

      if (params.city && params.city !== 'ALL') {
        where.city = { equals: params.city, mode: 'insensitive' };
      }

      if (params.featured !== undefined) {
        where.featured = params.featured;
      }

      if (params.starRating) {
        where.starRating = { gte: params.starRating };
      }

      if (params.search && params.search.trim()) {
        const q = params.search.trim();
        where.OR = [
          { name: { contains: q, mode: 'insensitive' } },
          { address: { contains: q, mode: 'insensitive' } },
          { city: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ];
      }

      const [hotels, total] = await Promise.all([
        prisma.hotel.findMany({
          where,
          select: {
            id: true,
            name: true,
            slug: true,
            shortDescription: true,
            address: true,
            city: true,
            subCity: true,
            latitude: true,
            longitude: true,
            starRating: true,
            featured: true,
            checkInTime: true,
            checkOutTime: true,
            images: {
              orderBy: [{ isCover: 'desc' }, { displayOrder: 'asc' }],
              select: {
                id: true,
                imageUrl: true,
                altText: true,
                isCover: true,
              },
              take: 3,
            },
            amenities: {
              select: {
                amenity: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    icon: true,
                  },
                },
              },
            },
            roomTypes: {
              where: { status: 'ACTIVE' },
              select: {
                id: true,
                name: true,
                basePricePerNight: true,
                currency: true,
                maximumGuests: true,
              },
              orderBy: { basePricePerNight: 'asc' },
            },
            transferRates: {
              where: { isActive: true },
              select: {
                id: true,
                originName: true,
                destinationName: true,
                fixedPrice: true,
                currency: true,
                vehicleType: true,
                vehicleCapacity: true,
              },
              take: 1,
            },
          },
          orderBy: [{ featured: 'desc' }, { starRating: 'desc' }, { createdAt: 'desc' }],
          skip,
          take: limit,
        }),
        prisma.hotel.count({ where }),
      ]);

      // Format formatted response with starting price
      const formatted = hotels.map((h) => {
        const coverImage = h.images.find((img) => img.isCover)?.imageUrl || h.images[0]?.imageUrl || '';
        const startingPrice = h.roomTypes[0] ? Number(h.roomTypes[0].basePricePerNight) : 0;
        const currency = h.roomTypes[0]?.currency || 'ETB';
        const airportTransferRate = h.transferRates[0]
          ? {
            id: h.transferRates[0].id,
            origin: h.transferRates[0].originName,
            fixedPrice: Number(h.transferRates[0].fixedPrice),
            currency: h.transferRates[0].currency,
            vehicleType: h.transferRates[0].vehicleType,
            capacity: h.transferRates[0].vehicleCapacity,
          }
          : null;

        return {
          id: h.id,
          name: h.name,
          slug: h.slug,
          shortDescription: h.shortDescription,
          address: h.address,
          city: h.city,
          subCity: h.subCity,
          latitude: h.latitude,
          longitude: h.longitude,
          starRating: h.starRating,
          featured: h.featured,
          checkInTime: h.checkInTime,
          checkOutTime: h.checkOutTime,
          coverImage,
          images: h.images,
          amenities: h.amenities.map((a) => a.amenity),
          startingPrice,
          currency,
          airportTransferAvailable: Boolean(airportTransferRate),
          airportTransferRate,
        };
      });

      return {
        hotels: formatted,
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
          { err: err.message },
          '[Hospitality] Database unreachable on port 5433. Serving built-in Gondar hotels for development.'
        );
        return this.getBuiltinHotels(params);
      }
      throw err;
    }
  }

  getBuiltinHotels(params: {
    city?: string;
    search?: string;
    starRating?: number;
    featured?: boolean;
    page?: number;
    limit?: number;
  }) {
    let list = [...BUILTIN_GONDAR_HOTELS];
    if (params.city && params.city !== 'ALL') {
      list = list.filter((h) => h.city.toLowerCase() === params.city!.toLowerCase());
    }
    if (params.featured !== undefined) {
      list = list.filter((h) => h.featured === params.featured);
    }
    if (params.starRating) {
      list = list.filter((h) => h.starRating >= params.starRating!);
    }
    if (params.search && params.search.trim()) {
      const q = params.search.trim().toLowerCase();
      list = list.filter(
        (h) =>
          h.name.toLowerCase().includes(q) ||
          h.address.toLowerCase().includes(q) ||
          h.city.toLowerCase().includes(q) ||
          h.description.toLowerCase().includes(q)
      );
    }
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(50, Math.max(1, params.limit || 10));
    const skip = (page - 1) * limit;
    const paginated = list.slice(skip, skip + limit);

    return {
      hotels: paginated,
      pagination: {
        page,
        limit,
        total: list.length,
        totalPages: Math.ceil(list.length / limit),
      },
    };
  }

  getBuiltinHotelDetails(idOrSlug: string) {
    const found = BUILTIN_GONDAR_HOTELS.find((h) => h.id === idOrSlug || h.slug === idOrSlug);
    return found || null;
  }

  /**
   * Public: Get complete hotel details by ID or slug
   */
  async getHotelDetails(idOrSlug: string, isPublic = true) {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

      const where: any = isUuid ? { id: idOrSlug } : { slug: idOrSlug };
      if (isPublic) {
        where.status = HotelStatus.PUBLISHED;
      }

      const hotel = await prisma.hotel.findFirst({
        where,
        include: {
          images: {
            orderBy: [{ isCover: 'desc' }, { displayOrder: 'asc' }],
          },
          amenities: {
            include: { amenity: true },
          },
          roomTypes: {
            where: isPublic ? { status: 'ACTIVE' } : undefined,
            include: {
              rates: {
                where: { status: 'ACTIVE' },
                orderBy: { startDate: 'asc' },
              },
            },
            orderBy: { basePricePerNight: 'asc' },
          },
          transferRates: {
            where: { isActive: true },
            orderBy: { fixedPrice: 'asc' },
          },
        },
      });

      if (!hotel) return null;

      return {
        ...hotel,
        startingPrice: hotel.roomTypes[0] ? Number(hotel.roomTypes[0].basePricePerNight) : 0,
        currency: hotel.roomTypes[0]?.currency || 'ETB',
        amenities: hotel.amenities.map((a) => a.amenity),
        roomTypes: hotel.roomTypes.map((r) => ({
          ...r,
          basePricePerNight: Number(r.basePricePerNight),
          rates: r.rates.map((rt) => ({
            ...rt,
            pricePerNight: Number(rt.pricePerNight),
          })),
        })),
        transferRates: hotel.transferRates.map((t) => ({
          ...t,
          fixedPrice: Number(t.fixedPrice),
        })),
      };
    } catch (err: any) {
      if (isDbConnectionError(err)) {
        logger.warn(
          { err: err.message },
          `[Hospitality] Database unreachable. Serving built-in details for ${idOrSlug}`
        );
        return this.getBuiltinHotelDetails(idOrSlug);
      }
      throw err;
    }
  }

  /**
   * Super Admin: List all hotels regardless of status
   */
  async listAdminHotels(page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [hotels, total] = await Promise.all([
    prisma.hotel.findMany({
      include: {
        images: { take: 1, orderBy: { isCover: 'desc' } },
        _count: {
          select: {
            roomTypes: true,
            transferRates: true,
            hotelBookings: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.hotel.count(),
  ]);

  return {
    hotels,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
}

export const hotelService = new HotelService();

