import { prisma } from '../../core/database/prisma';
import { logger } from '../../core/logging/logger';
import { HotelStatus, LoungeReservationStatus } from '@prisma/client';
import crypto from 'crypto';
import { CreateLoungeDto, UpdateLoungeDto, CreateLoungeReservationDto } from './hospitality.types';
import { parseCalendarDate, formatCalendarDate, getAddisCurrentDateString } from './utils/addisDate';

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

const BUILTIN_GONDAR_LOUNGES: any[] = [
  {
    id: 'lng_fasil_imperial',
    name: 'Fasil Imperial Lounge & Terrace',
    slug: 'fasil-imperial-lounge-terrace',
    shortDescription: 'Rooftop cocktail lounge and traditional coffee pavilion overlooking the Royal Enclosure.',
    description:
      'A refined rooftop lounge overlooking the imperial compound of Gondar. Enjoy artisan Ethiopian coffee tastings, evening cocktails, and light gourmet bites with traditional live music.',
    address: 'Near Fasilides Castle, Piasa, Gondar',
    city: 'Gondar',
    latitude: 12.6075,
    longitude: 37.4685,
    contactPhone: '+251581112233',
    operatingHours: '08:00 - 00:00',
    amenities: ['Castle View Terrace', 'Coffee Ceremony', 'Signature Cocktails', 'Live Acoustic Masinko'],
    featured: true,
    status: HotelStatus.PUBLISHED,
    coverImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80',
    images: [
      {
        id: 'img_lng_1',
        imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80',
        isCover: true,
        altText: 'Fasil Imperial Terrace Lounge',
      },
    ],
  },
  {
    id: 'lng_atse_tewodros',
    name: 'Atse Tewodros Executive Airport Lounge',
    slug: 'atse-tewodros-executive-lounge',
    shortDescription: 'Quiet premium airport departure lounge with private desks and direct boarding updates.',
    description:
      'Quiet premium airport departure lounge with private desks, high-speed Wi-Fi, refreshments, and direct boarding notifications.',
    address: 'Atse Tewodros Airport Terminal, Gondar',
    city: 'Gondar',
    latitude: 12.522,
    longitude: 37.432,
    contactPhone: '+251581115566',
    operatingHours: '06:00 - 20:00',
    amenities: ['Flight Boarding Updates', 'Complimentary Buffet', 'Fast Wi-Fi', 'Workstations'],
    featured: true,
    status: HotelStatus.PUBLISHED,
    coverImage: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&auto=format&fit=crop&q=80',
    images: [
      {
        id: 'img_lng_2',
        imageUrl: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&auto=format&fit=crop&q=80',
        isCover: true,
        altText: 'Atse Tewodros Executive Lounge',
      },
    ],
  },
];

export class LoungeService {
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Super Admin: Create a new lounge
   */
  async createLounge(dto: CreateLoungeDto, adminId?: string) {
    const slug = dto.slug || this.generateSlug(dto.name);
    const existing = await prisma.lounge.findUnique({ where: { slug } });
    const finalSlug = existing ? `${slug}-${Date.now().toString(36)}` : slug;

    return prisma.lounge.create({
      data: {
        name: dto.name,
        slug: finalSlug,
        description: dto.description,
        shortDescription: dto.shortDescription,
        address: dto.address,
        city: dto.city || 'Gondar',
        latitude: dto.latitude,
        longitude: dto.longitude,
        contactPhone: dto.contactPhone,
        contactEmail: dto.contactEmail,
        operatingHours: dto.operatingHours || '06:00 - 23:00',
        amenities: dto.amenities || [],
        featured: dto.featured || false,
        status: HotelStatus.DRAFT,
        createdByAdminId: adminId,
      },
    });
  }

  /**
   * Super Admin: Update lounge
   */
  async updateLounge(id: string, dto: UpdateLoungeDto, _adminId?: string) {
    const lounge = await prisma.lounge.findUnique({ where: { id } });
    if (!lounge) throw new Error('LOUNGE_NOT_FOUND: Lounge does not exist');

    return prisma.lounge.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        shortDescription: dto.shortDescription,
        address: dto.address,
        city: dto.city,
        latitude: dto.latitude,
        longitude: dto.longitude,
        contactPhone: dto.contactPhone,
        contactEmail: dto.contactEmail,
        operatingHours: dto.operatingHours,
        amenities: dto.amenities,
        featured: dto.featured,
        status: dto.status,
      },
    });
  }

  /**
   * Super Admin: Publish lounge
   */
  async publishLounge(id: string) {
    return prisma.lounge.update({
      where: { id },
      data: {
        status: HotelStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });
  }

  /**
   * Super Admin: Unpublish lounge
   */
  async unpublishLounge(id: string) {
    return prisma.lounge.update({
      where: { id },
      data: { status: HotelStatus.UNPUBLISHED },
    });
  }

  /**
   * Super Admin: Delete lounge
   */
  async deleteLounge(id: string) {
    return prisma.lounge.delete({ where: { id } });
  }

  /**
   * Super Admin: Add image to lounge
   */
  async addImage(loungeId: string, imageUrl: string, isCover = false, altText?: string) {
    if (isCover) {
      await prisma.loungeImage.updateMany({
        where: { loungeId },
        data: { isCover: false },
      });
    }

    return prisma.loungeImage.create({
      data: {
        loungeId,
        imageUrl,
        isCover,
        altText,
      },
    });
  }

  /**
   * Public: List published lounges
   */
  async listPublishedLounges(params: {
    city?: string;
    search?: string;
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

      if (params.search && params.search.trim()) {
        const q = params.search.trim();
        where.OR = [
          { name: { contains: q, mode: 'insensitive' } },
          { address: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ];
      }

      const [lounges, total] = await Promise.all([
        prisma.lounge.findMany({
          where,
          include: {
            images: {
              orderBy: [{ isCover: 'desc' }, { displayOrder: 'asc' }],
              take: 3,
            },
          },
          orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
          skip,
          take: limit,
        }),
        prisma.lounge.count({ where }),
      ]);

      const formatted = lounges.map((l) => ({
        ...l,
        coverImage: l.images.find((img) => img.isCover)?.imageUrl || l.images[0]?.imageUrl || '',
      }));

      return {
        lounges: formatted,
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
          '[Hospitality] Database unreachable on port 5433. Serving built-in Gondar lounges for development.'
        );
        return this.getBuiltinLounges(params);
      }
      throw err;
    }
  }

  getBuiltinLounges(params: {
    city?: string;
    search?: string;
    featured?: boolean;
    page?: number;
    limit?: number;
  }) {
    let list = [...BUILTIN_GONDAR_LOUNGES];
    if (params.city && params.city !== 'ALL') {
      list = list.filter((l) => l.city.toLowerCase() === params.city!.toLowerCase());
    }
    if (params.featured !== undefined) {
      list = list.filter((l) => l.featured === params.featured);
    }
    if (params.search && params.search.trim()) {
      const q = params.search.trim().toLowerCase();
      list = list.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.address.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q)
      );
    }
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(50, Math.max(1, params.limit || 10));
    const skip = (page - 1) * limit;
    const paginated = list.slice(skip, skip + limit);

    return {
      lounges: paginated,
      pagination: {
        page,
        limit,
        total: list.length,
        totalPages: Math.ceil(list.length / limit),
      },
    };
  }

  getBuiltinLoungeDetails(idOrSlug: string) {
    const found = BUILTIN_GONDAR_LOUNGES.find((l) => l.id === idOrSlug || l.slug === idOrSlug);
    return found || null;
  }

  /**
   * Public: Get lounge details by ID or slug
   */
  async getLoungeDetails(idOrSlug: string, isPublic = true) {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
      const where: any = isUuid ? { id: idOrSlug } : { slug: idOrSlug };
      if (isPublic) where.status = HotelStatus.PUBLISHED;

      return await prisma.lounge.findFirst({
        where,
        include: {
          images: {
            orderBy: [{ isCover: 'desc' }, { displayOrder: 'asc' }],
          },
        },
      });
    } catch (err: any) {
      if (isDbConnectionError(err)) {
        logger.warn(
          { err: err.message },
          `[Hospitality] Database unreachable. Serving built-in details for lounge ${idOrSlug}`
        );
        return this.getBuiltinLoungeDetails(idOrSlug);
      }
      throw err;
    }
  }

  /**
   * Public: Create lounge table/seating reservation
   */
  async createReservation(passengerId: string, dto: CreateLoungeReservationDto) {
    const lounge = await prisma.lounge.findUnique({
      where: { id: dto.loungeId, status: HotelStatus.PUBLISHED },
    });
    if (!lounge) throw new Error('LOUNGE_NOT_FOUND: Published lounge not found');

    const reservationDate = parseCalendarDate(dto.reservationDate);
    const today = parseCalendarDate(getAddisCurrentDateString());

    if (reservationDate.getTime() < today.getTime()) {
      throw new Error('PAST_DATE: Lounge reservation cannot be in the past');
    }

    const ref = `KT-LNG-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

    return prisma.loungeReservation.create({
      data: {
        reservationReference: ref,
        loungeId: dto.loungeId,
        passengerId,
        reservationDate,
        reservationTime: dto.reservationTime || '18:00',
        guestsCount: dto.guestsCount || 1,
        specialRequests: dto.specialRequests,
        status: LoungeReservationStatus.CONFIRMED,
      },
    });
  }

  /**
   * Public: List passenger lounge reservations
   */
  async getPassengerReservations(passengerId: string) {
    const list = await prisma.loungeReservation.findMany({
      where: { passengerId },
      include: {
        lounge: {
          select: {
            name: true,
            city: true,
            address: true,
            contactPhone: true,
            images: { where: { isCover: true }, take: 1 },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return list.map((r) => ({
      id: r.id,
      reference: r.reservationReference,
      loungeName: r.lounge.name,
      city: r.lounge.city,
      address: r.lounge.address,
      phone: r.lounge.contactPhone,
      image: r.lounge.images[0]?.imageUrl || '',
      date: formatCalendarDate(r.reservationDate),
      time: r.reservationTime,
      guests: r.guestsCount,
      status: r.status,
    }));
  }
}

export const loungeService = new LoungeService();
