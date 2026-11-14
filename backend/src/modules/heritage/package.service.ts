import { prisma } from '../../core/database/prisma';

export interface TourPackageFallback {
  id: string;
  name: string;
  slug: string;
  description: string;
  itinerary: any[];
  estimatedDurationMinutes: number;
  region: string;
  city: string;
  basePrice: number;
  currency: string;
  minimumPassengers: number;
  maximumPassengers: number;
  includesGuide: boolean;
  includesTransport: boolean;
  includesBoat: boolean;
  status: 'PUBLISHED' | 'DRAFT' | 'UNPUBLISHED' | 'ARCHIVED';
  featured: boolean;
  requiresAdvanceBooking: boolean;
  minimumAdvanceHours: number;
  cancellationPolicy: string;
  sites: {
    siteId: string;
    visitOrder: number;
    estimatedVisitDurationMinutes: number;
    siteName: string;
    entryFeeETB: number;
    requiresBoatTransport: boolean;
  }[];
}

export const FALLBACK_TOUR_PACKAGES: TourPackageFallback[] = [
  {
    id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    name: 'Gondar Imperial Heritage Full-Day Tour',
    slug: 'gondar-imperial-heritage-full-day',
    description:
      'Comprehensive royal experience touring Fasil Ghebbi castles, the angelic ceiling of Debre Berhan Selassie, and Empress Mentewab’s hillside palace at Kuskuam with comfortable chauffeured transport.',
    itinerary: [
      { order: 1, name: 'Fasil Ghebbi (Royal Enclosure)', duration: 180, notes: 'Castles, archive tower, banquet halls' },
      { order: 2, name: 'Debre Berhan Selassie Church', duration: 90, notes: 'Iconic angel ceiling frescoes' },
      { order: 3, name: 'Kuskuam Palace Complex', duration: 90, notes: 'Empress Mentewab royal residence and view' },
    ],
    estimatedDurationMinutes: 360,
    region: 'Amhara Region',
    city: 'Gondar',
    basePrice: 3500,
    currency: 'ETB',
    minimumPassengers: 1,
    maximumPassengers: 14,
    includesGuide: false,
    includesTransport: true,
    includesBoat: false,
    status: 'PUBLISHED',
    featured: true,
    requiresAdvanceBooking: true,
    minimumAdvanceHours: 6,
    cancellationPolicy: 'Free cancellation up to 12 hours before scheduled tour time. 50% refund thereafter.',
    sites: [
      {
        siteId: 'b8c1d2e3-4f5a-6b7c-8d9e-0f1a2b3c4d5e',
        visitOrder: 1,
        estimatedVisitDurationMinutes: 180,
        siteName: 'Fasil Ghebbi (Royal Enclosure)',
        entryFeeETB: 2000,
        requiresBoatTransport: false,
      },
      {
        siteId: 'c9d2e3f4-5a6b-7c8d-9e0f-1a2b3c4d5e6f',
        visitOrder: 2,
        estimatedVisitDurationMinutes: 90,
        siteName: 'Debre Berhan Selassie Church',
        entryFeeETB: 1500,
        requiresBoatTransport: false,
      },
      {
        siteId: 'd0e3f4a5-6b7c-8d9e-0f1a-2b3c4d5e6f7a',
        visitOrder: 3,
        estimatedVisitDurationMinutes: 90,
        siteName: 'Kuskuam Palace & Royal Monastery',
        entryFeeETB: 1200,
        requiresBoatTransport: false,
      },
    ],
  },
  {
    id: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
    name: 'Gondar Royal Palaces & Castles Half-Day Tour',
    slug: 'gondar-royal-palaces-half-day',
    description:
      'The essential highlights of Gondar: Emperor Fasilides’ Camelot castle fortress and the sacred art of Debre Berhan Selassie.',
    itinerary: [
      { order: 1, name: 'Fasil Ghebbi (Royal Enclosure)', duration: 120, notes: 'Main castle fortress' },
      { order: 2, name: 'Debre Berhan Selassie Church', duration: 60, notes: 'Murals and ceiling' },
    ],
    estimatedDurationMinutes: 180,
    region: 'Amhara Region',
    city: 'Gondar',
    basePrice: 2200,
    currency: 'ETB',
    minimumPassengers: 1,
    maximumPassengers: 14,
    includesGuide: false,
    includesTransport: true,
    includesBoat: false,
    status: 'PUBLISHED',
    featured: false,
    requiresAdvanceBooking: true,
    minimumAdvanceHours: 4,
    cancellationPolicy: 'Free cancellation up to 6 hours before departure.',
    sites: [
      {
        siteId: 'b8c1d2e3-4f5a-6b7c-8d9e-0f1a2b3c4d5e',
        visitOrder: 1,
        estimatedVisitDurationMinutes: 120,
        siteName: 'Fasil Ghebbi (Royal Enclosure)',
        entryFeeETB: 2000,
        requiresBoatTransport: false,
      },
      {
        siteId: 'c9d2e3f4-5a6b-7c8d-9e0f-1a2b3c4d5e6f',
        visitOrder: 2,
        estimatedVisitDurationMinutes: 60,
        siteName: 'Debre Berhan Selassie Church',
        entryFeeETB: 1500,
        requiresBoatTransport: false,
      },
    ],
  },
  {
    id: 'c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f',
    name: 'Lake Tana Island Monasteries & Gondar Heritage Excursion',
    slug: 'lake-tana-island-monasteries-gondar-excursion',
    description:
      'An epic historical expedition combining scenic motorized boat transport to ancient Lake Tana island monasteries with Gondar’s imperial castle fortress.',
    itinerary: [
      { order: 1, name: 'Lake Tana Island Monasteries (Ura Kidane Mehret)', duration: 240, notes: 'Boat voyage and monastery visit' },
      { order: 2, name: 'Fasil Ghebbi (Royal Enclosure)', duration: 180, notes: 'Imperial castle grounds' },
    ],
    estimatedDurationMinutes: 480,
    region: 'Amhara Region',
    city: 'Gondar / Bahir Dar',
    basePrice: 5800,
    currency: 'ETB',
    minimumPassengers: 1,
    maximumPassengers: 20,
    includesGuide: false,
    includesTransport: true,
    includesBoat: true,
    status: 'PUBLISHED',
    featured: true,
    requiresAdvanceBooking: true,
    minimumAdvanceHours: 12,
    cancellationPolicy: 'Free cancellation up to 24 hours before tour date.',
    sites: [
      {
        siteId: 'e1f4a5b6-7c8d-9e0f-1a2b-3c4d5e6f7a8b',
        visitOrder: 1,
        estimatedVisitDurationMinutes: 240,
        siteName: 'Lake Tana Island Monasteries (Ura Kidane Mehret)',
        entryFeeETB: 2500,
        requiresBoatTransport: true,
      },
      {
        siteId: 'b8c1d2e3-4f5a-6b7c-8d9e-0f1a2b3c4d5e',
        visitOrder: 2,
        estimatedVisitDurationMinutes: 180,
        siteName: 'Fasil Ghebbi (Royal Enclosure)',
        entryFeeETB: 2000,
        requiresBoatTransport: false,
      },
    ],
  },
];

export class HeritageTourPackageService {
  /**
   * List packages with optional filters
   */
  async listPackages(query?: {
    city?: string;
    featuredOnly?: boolean;
    isAdmin?: boolean;
  }) {
    try {
      const where: any = {};
      if (!query?.isAdmin) {
        where.status = 'PUBLISHED';
      }
      if (query?.city) {
        where.city = { contains: query.city, mode: 'insensitive' };
      }
      if (query?.featuredOnly) {
        where.featured = true;
      }

      const packages = await prisma.heritageTourPackage.findMany({
        where,
        include: {
          packageSites: {
            include: { site: true },
            orderBy: { visitOrder: 'asc' },
          },
          priceComponents: true,
        },
        orderBy: [{ featured: 'desc' }, { basePrice: 'asc' }],
      });

      if (packages.length > 0) {
        return packages;
      }
    } catch {
      // Database offline or empty
    }

    let results = [...FALLBACK_TOUR_PACKAGES];
    if (!query?.isAdmin) {
      results = results.filter((p) => p.status === 'PUBLISHED');
    }
    if (query?.city) {
      const c = query.city.toLowerCase();
      results = results.filter((p) => p.city.toLowerCase().includes(c));
    }
    if (query?.featuredOnly) {
      results = results.filter((p) => p.featured);
    }
    return results;
  }

  /**
   * Get single package by ID or slug
   */
  async getPackageBySlugOrId(slugOrId: string, isAdmin: boolean = false) {
    try {
      const pkg = await prisma.heritageTourPackage.findFirst({
        where: {
          OR: [{ id: slugOrId }, { slug: slugOrId }],
          ...(isAdmin ? {} : { status: 'PUBLISHED' }),
        },
        include: {
          packageSites: {
            include: { site: true },
            orderBy: { visitOrder: 'asc' },
          },
          priceComponents: true,
        },
      });

      if (pkg) return pkg;
    } catch {
      // Database offline
    }

    const fallback = FALLBACK_TOUR_PACKAGES.find(
      (p) => p.id === slugOrId || p.slug === slugOrId
    );

    if (fallback && (isAdmin || fallback.status === 'PUBLISHED')) {
      return fallback;
    }

    return null;
  }

  /**
   * Super-admin: Create tour package
   */
  async adminCreatePackage(data: any, adminId?: string) {
    const { siteIds, ...packageData } = data;
    return prisma.heritageTourPackage.create({
      data: {
        ...packageData,
        createdByAdminId: adminId,
        status: packageData.status || 'DRAFT',
        ...(siteIds && siteIds.length > 0
          ? {
              packageSites: {
                create: siteIds.map((siteId: string, index: number) => ({
                  siteId,
                  visitOrder: index + 1,
                })),
              },
            }
          : {}),
      },
      include: { packageSites: true },
    });
  }

  /**
   * Super-admin: Update package
   */
  async adminUpdatePackage(id: string, data: any) {
    const { siteIds, ...packageData } = data;
    return prisma.heritageTourPackage.update({
      where: { id },
      data: packageData,
    });
  }

  /**
   * Super-admin: Delete package
   */
  async adminDeletePackage(id: string) {
    return prisma.heritageTourPackage.delete({
      where: { id },
    });
  }

  /**
   * Super-admin: Publish package
   */
  async adminPublishPackage(id: string) {
    return prisma.heritageTourPackage.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });
  }

  /**
   * Super-admin: Unpublish package
   */
  async adminUnpublishPackage(id: string) {
    return prisma.heritageTourPackage.update({
      where: { id },
      data: { status: 'UNPUBLISHED' },
    });
  }
}

export const heritageTourPackageService = new HeritageTourPackageService();

