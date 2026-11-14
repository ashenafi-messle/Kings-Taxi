import { prisma } from '../../core/database/prisma';
import { HeritageDestinationType } from './heritage.types';

export interface HeritageSiteFallback {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  fullDescription: string;
  region: string;
  city: string;
  specificLocation: string;
  latitude: number;
  longitude: number;
  destinationType: HeritageDestinationType;
  estimatedVisitDurationMinutes: number;
  historicalInformation: string;
  culturalInformation: string;
  visitingRules: string;
  coverImageUrl: string;
  galleryImages: string[];
  highlights: string[];
  entryFeeETB: number;
  requiresBoatTransport: boolean;
  unescoDesignated: boolean;
  unescoYear?: number;
  status: 'PUBLISHED' | 'DRAFT' | 'UNPUBLISHED' | 'ARCHIVED';
  featured: boolean;
  displayOrder: number;
}

export const FALLBACK_HERITAGE_SITES: HeritageSiteFallback[] = [
  {
    id: 'b8c1d2e3-4f5a-6b7c-8d9e-0f1a2b3c4d5e',
    name: 'Fasil Ghebbi (Royal Enclosure)',
    slug: 'fasil-ghebbi-royal-enclosure',
    shortDescription: 'The Camelot of Africa — 17th-century fortified palace compound built by Emperor Fasilides.',
    fullDescription:
      'In 1636 Emperor Fasilides established Gondar as Ethiopia’s imperial capital. The fortress compound encompasses six stone castles, libraries, banquet halls, and stables showcasing unique Portuguese, Moorish, and Indian architectural influences.',
    region: 'Amhara Region',
    city: 'Gondar',
    specificLocation: 'Imperial Enclosure, Gondar City Center',
    latitude: 12.6078,
    longitude: 37.4705,
    destinationType: 'HISTORICAL_PALACE',
    estimatedVisitDurationMinutes: 180,
    historicalInformation: 'Imperial seat of the Ethiopian Empire for over two centuries during the Solomonic dynasty.',
    culturalInformation: 'Epicenter of Gondar historical heritage and traditional church education.',
    visitingRules: 'Modest attire recommended. Guided tours advised for historical rooms.',
    coverImageUrl: 'https://images.unsplash.com/photo-1599839575945-a9e5af0c3fa5?w=800&auto=format&fit=crop&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1599839575945-a9e5af0c3fa5?w=800&auto=format&fit=crop&q=80',
    ],
    highlights: [
      'Emperor Fasilides Castle & Archive Tower',
      'Empress Mentewab Palace',
      'Emperor Bakaffa Banquet Hall',
    ],
    entryFeeETB: 2000,
    requiresBoatTransport: false,
    unescoDesignated: true,
    unescoYear: 1979,
    status: 'PUBLISHED',
    featured: true,
    displayOrder: 1,
  },
  {
    id: 'c9d2e3f4-5a6b-7c8d-9e0f-1a2b3c4d5e6f',
    name: 'Debre Berhan Selassie Church',
    slug: 'debre-berhan-selassie-church',
    shortDescription: 'Famous mountain monastery renowned for its ceiling depicting 135 winged cherubic angels.',
    fullDescription:
      'Built in the 17th century by Emperor Iyasu I, Debre Berhan Selassie (Trinity and Mountain of Light) is the only major Gondar church to have survived the 1880s Mahdist invasion unharmed, saved according to local tradition by a divine swarm of bees.',
    region: 'Amhara Region',
    city: 'Gondar',
    specificLocation: 'Northeast hill overlooking Gondar city',
    latitude: 12.6125,
    longitude: 37.4812,
    destinationType: 'RELIGIOUS_MONASTERY',
    estimatedVisitDurationMinutes: 90,
    historicalInformation: 'Spared from destruction during historic invasions and houses rare surviving Gondarine wall paintings.',
    culturalInformation: 'One of the most revered sanctuaries of the Ethiopian Orthodox Tewahedo Church.',
    visitingRules: 'Shoes must be removed before entering the church sanctuary. Silence respected inside.',
    coverImageUrl: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800&auto=format&fit=crop&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800&auto=format&fit=crop&q=80',
    ],
    highlights: [
      'Iconic winged angel ceiling frescoes',
      'Holy Trinity sanctuary murals',
      'Sacred ancient church drum tower',
    ],
    entryFeeETB: 1500,
    requiresBoatTransport: false,
    unescoDesignated: true,
    unescoYear: 1979,
    status: 'PUBLISHED',
    featured: true,
    displayOrder: 2,
  },
  {
    id: 'd0e3f4a5-6b7c-8d9e-0f1a-2b3c4d5e6f7a',
    name: 'Kuskuam Palace & Royal Monastery',
    slug: 'kuskuam-palace-royal-monastery',
    shortDescription: 'Empress Mentewab’s peaceful 18th-century royal hillside retreat and royal tombs.',
    fullDescription:
      'Perched on the scenic hillside northwest of Gondar, Kuskuam was built in the 1730s by the influential Empress Mentewab as her royal residence, monastic sanctuary, and final resting place alongside her grandson Emperor Iyoas.',
    region: 'Amhara Region',
    city: 'Gondar',
    specificLocation: 'Kuskuam Hill, Northwest Gondar',
    latitude: 12.6288,
    longitude: 37.4522,
    destinationType: 'HISTORICAL_PALACE',
    estimatedVisitDurationMinutes: 120,
    historicalInformation: 'Served as royal palace and intellectual retreat for Empress Mentewab, Queen Mother of Gondar.',
    culturalInformation: 'Houses historical royal crypts and ecclesiastical manuscripts.',
    visitingRules: 'Respect religious grounds and burial vaults.',
    coverImageUrl: 'https://images.unsplash.com/photo-1584824486509-112e4181ff6b?w=800&auto=format&fit=crop&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1584824486509-112e4181ff6b?w=800&auto=format&fit=crop&q=80',
    ],
    highlights: [
      'Empress Mentewab two-story reception castle',
      'Royal burial chambers of Mentewab and Iyoas',
      'Panoramic sunset viewpoint across Gondar Valley',
    ],
    entryFeeETB: 1200,
    requiresBoatTransport: false,
    unescoDesignated: false,
    status: 'PUBLISHED',
    featured: false,
    displayOrder: 3,
  },
  {
    id: 'e1f4a5b6-7c8d-9e0f-1a2b-3c4d5e6f7a8b',
    name: 'Lake Tana Island Monasteries (Ura Kidane Mehret)',
    slug: 'lake-tana-island-monasteries',
    shortDescription: 'Sacred medieval island monasteries on the source of the Blue Nile requiring scenic boat transport.',
    fullDescription:
      'Lake Tana holds over 20 island and peninsula monasteries dating from the 14th century. Ura Kidane Mehret on the Zege Peninsula is acclaimed as the most magnificent, filled with vivid biblical frescoes painted on cedar walls and housing ancient imperial crowns.',
    region: 'Amhara Region',
    city: 'Bahir Dar / Lake Tana',
    specificLocation: 'Zege Peninsula, Lake Tana',
    latitude: 11.7011,
    longitude: 37.3325,
    destinationType: 'RELIGIOUS_MONASTERY',
    estimatedVisitDurationMinutes: 240,
    historicalInformation: 'Safeguarded ancient sacred relics, royal crowns, and church manuscripts during Middle Ages conflicts.',
    culturalInformation: 'Accessible via boat from the Lake Tana shores, passing traditional papyrus tankwa canoes.',
    visitingRules: 'Boat transportation required. Modest head covering and removal of shoes for monastery entrance.',
    coverImageUrl: 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=800&auto=format&fit=crop&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=800&auto=format&fit=crop&q=80',
    ],
    highlights: [
      'Round thatched wooden monastery with painted sanctuary',
      'Treasury of medieval imperial crowns & silver crosses',
      'Scenic motorized boat voyage across Lake Tana',
    ],
    entryFeeETB: 2500,
    requiresBoatTransport: true,
    unescoDesignated: true,
    unescoYear: 2015,
    status: 'PUBLISHED',
    featured: true,
    displayOrder: 4,
  },
];

export class HeritageSiteService {
  /**
   * Search and list heritage sites with filters
   */
  async listSites(query?: {
    city?: string;
    region?: string;
    destinationType?: HeritageDestinationType;
    unescoOnly?: boolean;
    featuredOnly?: boolean;
    search?: string;
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

      if (query?.region) {
        where.region = { contains: query.region, mode: 'insensitive' };
      }

      if (query?.destinationType) {
        where.destinationType = query.destinationType;
      }

      if (query?.unescoOnly) {
        where.unescoDesignated = true;
      }

      if (query?.featuredOnly) {
        where.featured = true;
      }

      if (query?.search) {
        where.OR = [
          { name: { contains: query.search, mode: 'insensitive' } },
          { shortDescription: { contains: query.search, mode: 'insensitive' } },
          { fullDescription: { contains: query.search, mode: 'insensitive' } },
        ];
      }

      const sites = await prisma.heritageSite.findMany({
        where,
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      });

      if (sites.length > 0) {
        return sites;
      }
    } catch {
      // Database offline or table empty, proceed to resilient fallback
    }

    // Filter fallback sites
    let results = [...FALLBACK_HERITAGE_SITES];

    if (!query?.isAdmin) {
      results = results.filter((s) => s.status === 'PUBLISHED');
    }

    if (query?.city) {
      const c = query.city.toLowerCase();
      results = results.filter((s) => s.city.toLowerCase().includes(c));
    }

    if (query?.region) {
      const r = query.region.toLowerCase();
      results = results.filter((s) => s.region.toLowerCase().includes(r));
    }

    if (query?.destinationType) {
      results = results.filter((s) => s.destinationType === query.destinationType);
    }

    if (query?.unescoOnly) {
      results = results.filter((s) => s.unescoDesignated);
    }

    if (query?.featuredOnly) {
      results = results.filter((s) => s.featured);
    }

    if (query?.search) {
      const q = query.search.toLowerCase();
      results = results.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.shortDescription.toLowerCase().includes(q) ||
          s.fullDescription.toLowerCase().includes(q)
      );
    }

    return results;
  }

  /**
   * Get single site by ID or slug
   */
  async getSiteBySlugOrId(slugOrId: string, isAdmin: boolean = false) {
    const ALIAS_MAP: Record<string, string> = {
      hrt_fasil_gondar: 'fasil-ghebbi-royal-enclosure',
      hrt_debre_berhan: 'debre-berhan-selassie-church',
      hrt_kuskuam: 'kuskuam-palace-monastery',
      hrt_lake_tana: 'lake-tana-island-monasteries',
      hrt_fasilides_bath: 'fasilides-bath-pavilion',
      hrt_lalibela: 'rock-hewn-churches-lalibela',
      hrt_simien: 'simien-mountains-national-park',
    };
    const targetSlug = ALIAS_MAP[slugOrId] || slugOrId;

    try {
      const site = await prisma.heritageSite.findFirst({
        where: {
          OR: [
            { id: slugOrId },
            { slug: slugOrId },
            { id: targetSlug },
            { slug: targetSlug },
          ],
          ...(isAdmin ? {} : { status: 'PUBLISHED' }),
        },
      });

      if (site) return site;
    } catch {
      // Database offline, check fallback
    }

    const fallback = FALLBACK_HERITAGE_SITES.find(
      (s) =>
        s.id === slugOrId ||
        s.slug === slugOrId ||
        s.id === targetSlug ||
        s.slug === targetSlug ||
        (s as any).legacyId === slugOrId
    );

    if (fallback && (isAdmin || fallback.status === 'PUBLISHED')) {
      return fallback;
    }

    return null;
  }

  /**
   * Super-admin: Create Heritage Site
   */
  async adminCreateSite(data: any, adminId?: string) {
    return prisma.heritageSite.create({
      data: {
        ...data,
        createdByAdminId: adminId,
        status: data.status || 'DRAFT',
      },
    });
  }

  /**
   * Super-admin: Update Heritage Site
   */
  async adminUpdateSite(id: string, data: any) {
    return prisma.heritageSite.update({
      where: { id },
      data,
    });
  }

  /**
   * Super-admin: Delete Heritage Site
   */
  async adminDeleteSite(id: string) {
    return prisma.heritageSite.delete({
      where: { id },
    });
  }

  /**
   * Super-admin: Publish Site
   */
  async adminPublishSite(id: string) {
    return prisma.heritageSite.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });
  }

  /**
   * Super-admin: Unpublish Site
   */
  async adminUnpublishSite(id: string) {
    return prisma.heritageSite.update({
      where: { id },
      data: {
        status: 'UNPUBLISHED',
      },
    });
  }
}

export const heritageSiteService = new HeritageSiteService();

