import crypto from 'crypto';
import { prisma } from '../../core/database/prisma';
import { HeritageDestinationType } from './heritage.types';
import { heritageEventBus } from './heritageEvents';
import { CloudinaryService } from '../../integrations/cloudinary/cloudinary.service';

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
        include: {
          destinationImages: {
            orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
          },
        },
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      });

      if (sites.length > 0) {
        return sites.map((s: any) => {
          const destImgs = (s.destinationImages || []).map((img: any) => img.imageUrl).filter(Boolean);
          const gallery = destImgs.length > 0 ? destImgs : (s.galleryImages || []);
          const cover = s.coverImageUrl || gallery[0] || '';
          return {
            ...s,
            coverImageUrl: cover,
            galleryImages: gallery.length > 0 ? gallery : (cover ? [cover] : []),
          };
        });
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

  async getFeaturedSites() {
    return this.listSites({ featuredOnly: true });
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
      const site: any = await prisma.heritageSite.findFirst({
        where: {
          OR: [
            { id: slugOrId },
            { slug: slugOrId },
            { id: targetSlug },
            { slug: targetSlug },
          ],
          ...(isAdmin ? {} : { status: 'PUBLISHED' }),
        },
        include: {
          destinationImages: {
            orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
          },
        },
      });

      if (site) {
        const destImgs = (site.destinationImages || []).map((img: any) => img.imageUrl).filter(Boolean);
        const gallery = destImgs.length > 0 ? destImgs : (site.galleryImages || []);
        const cover = site.coverImageUrl || gallery[0] || '';
        return {
          ...site,
          coverImageUrl: cover,
          galleryImages: gallery.length > 0 ? gallery : (cover ? [cover] : []),
        };
      }
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

  private async uploadImagesToCloudinary(
    images: Array<{
      imageUrl: string;
      publicId?: string;
      caption?: string;
      displayOrder?: number;
      isPrimary?: boolean;
      fileFormat?: string;
      fileSize?: number;
    }>,
    folder: string
  ) {
    const uploadedPublicIds: string[] = [];
    const hasPrimary = images.some((img) => img.isPrimary);
    const processed = await Promise.all(
      images.map(async (img, idx) => {
        const rawUrl = (img.imageUrl || '').trim();
        if (!rawUrl) {
          throw new Error('INVALID_IMAGE: Image URL or payload cannot be empty.');
        }

        let finalUrl = rawUrl;
        let finalPublicId = img.publicId || null;
        let finalFormat = img.fileFormat || null;
        let finalSize = img.fileSize || null;

        if (rawUrl.startsWith('data:') || rawUrl.length > 500) {
          const uploadRes = await CloudinaryService.uploadAsset(rawUrl, {
            folder,
            resourceType: 'image',
          });
          finalUrl = uploadRes.secureUrl || uploadRes.url;
          finalPublicId = uploadRes.publicId;
          finalFormat = uploadRes.format;
          finalSize = uploadRes.bytes;
          if (uploadRes.publicId) {
            uploadedPublicIds.push(uploadRes.publicId);
          }
        }

        return {
          imageUrl: finalUrl,
          publicId: finalPublicId,
          caption: img.caption || null,
          displayOrder: img.displayOrder !== undefined ? img.displayOrder : idx,
          isPrimary: hasPrimary ? Boolean(img.isPrimary) : idx === 0,
          fileFormat: finalFormat,
          fileSize: finalSize,
        };
      })
    );

    return { processed, uploadedPublicIds };
  }

  private mapDestinationType(raw?: string): HeritageDestinationType {
    const s = String(raw || '').toUpperCase();
    if (['HISTORICAL_PALACE', 'RELIGIOUS_MONASTERY', 'ANCIENT_RUIN', 'NATURAL_LANDMARK', 'CULTURAL_VILLAGE'].includes(s)) {
      return s as HeritageDestinationType;
    }
    if (s.includes('CHURCH') || s.includes('MONASTERY')) return 'RELIGIOUS_MONASTERY';
    if (s.includes('PARK') || s.includes('MOUNTAIN') || s.includes('LAKE') || s.includes('NATURE')) return 'NATURAL_LANDMARK';
    if (s.includes('RUIN')) return 'ANCIENT_RUIN';
    if (s.includes('CULTURAL')) return 'CULTURAL_VILLAGE';
    return 'HISTORICAL_PALACE';
  }

  private buildSlug(name: string, providedSlug?: string): string {
    const base = (providedSlug || name || 'heritage-destination')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 96);
    return base || `heritage-${Date.now()}`;
  }

  /**
   * Super-admin: Create Heritage Site with Cloudinary image upload & PostgreSQL persistence
   */
  async adminCreateSite(data: any, adminId?: string) {
    const siteId = crypto.randomUUID();
    const rawImages: any[] = Array.isArray(data.destinationImages) && data.destinationImages.length > 0
      ? data.destinationImages
      : Array.isArray(data.images) && data.images.length > 0
      ? data.images
      : (Array.isArray(data.galleryImages) && data.galleryImages.length > 0
          ? data.galleryImages.map((url: string, idx: number) => ({
              imageUrl: url,
              displayOrder: idx,
              isPrimary: idx === 0,
            }))
          : (data.coverImageUrl || data.heroImage
              ? [{ imageUrl: data.coverImageUrl || data.heroImage, displayOrder: 0, isPrimary: true }]
              : []));

    const { processed: uploadedImages, uploadedPublicIds } =
      rawImages.length > 0
        ? await this.uploadImagesToCloudinary(rawImages, `kings-taxi/heritage/${siteId}`)
        : { processed: [], uploadedPublicIds: [] };

    const primaryImage =
      uploadedImages.find((img) => img.isPrimary)?.imageUrl ||
      uploadedImages[0]?.imageUrl ||
      data.coverImageUrl ||
      data.heroImage ||
      'https://images.unsplash.com/photo-1599839575945-a9e5af0c3fa5?w=800&auto=format&fit=crop&q=80';

    const baseSlug = this.buildSlug(data.name, data.slug);
    let uniqueSlug = baseSlug;
    const existingSlug = await prisma.heritageSite
      .findFirst({ where: { slug: baseSlug }, select: { id: true } })
      .catch(() => null);
    if (existingSlug) {
      uniqueSlug = `${baseSlug}-${crypto.randomBytes(2).toString('hex')}`;
    }

    const fullDesc = (
      data.fullDescription ||
      data.description ||
      data.shortDescription ||
      data.name ||
      ''
    ).trim();
    const shortDesc = (data.shortDescription || fullDesc || data.name || '').trim().slice(0, 250);
    const status = data.status || 'PUBLISHED';

    try {
      const created = await prisma.$transaction(async (tx) => {
        const site = await tx.heritageSite.create({
          data: {
            id: siteId,
            name: data.name.trim(),
            slug: uniqueSlug,
            shortDescription: shortDesc,
            fullDescription: fullDesc.length >= 10 ? fullDesc : `${shortDesc} — Heritage destination in ${data.city || 'Gondar'}.`,
            region: data.region || 'Amhara Region',
            city: data.city || 'Gondar',
            specificLocation: data.specificLocation || data.address || `${data.city || 'Gondar'}, Ethiopia`,
            latitude: typeof data.latitude === 'number' ? data.latitude : 12.6078,
            longitude: typeof data.longitude === 'number' ? data.longitude : 37.4705,
            destinationType: this.mapDestinationType(data.destinationType || data.category),
            estimatedVisitDurationMinutes: Number(data.estimatedVisitDurationMinutes || 120),
            historicalInformation: data.historicalInformation || data.historicalOverview || null,
            culturalInformation: data.culturalInformation || data.culturalSignificance || null,
            visitingRules: data.visitingRules || data.visitingHours || null,
            coverImageUrl: primaryImage,
            galleryImages: uploadedImages.map((img) => img.imageUrl),
            highlights: Array.isArray(data.highlights) ? data.highlights : [],
            entryFeeETB: Number(data.entryFeeETB ?? data.entranceFeeETB ?? 0),
            requiresBoatTransport: Boolean(data.requiresBoatTransport),
            unescoDesignated: Boolean(data.unescoDesignated ?? data.unescoWorldHeritage),
            unescoYear: data.unescoYear || null,
            featured: Boolean(data.featured),
            displayOrder: Number(data.displayOrder || 0),
            createdByAdminId: adminId || null,
            status,
            publishedAt: status === 'PUBLISHED' ? new Date() : null,
          },
        });

        if (uploadedImages.length > 0 && tx.heritageDestinationImage) {
          await Promise.all(
            uploadedImages.map((img) =>
              tx.heritageDestinationImage.create({
                data: {
                  siteId: site.id,
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

        return tx.heritageSite.findUnique({
          where: { id: site.id },
          include: {
            destinationImages: {
              orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
            },
          },
        });
      });

      heritageEventBus.emitHeritage({
        type: 'heritage.site.created',
        siteId: created?.id || siteId,
        status,
      });
      if (status === 'PUBLISHED') {
        heritageEventBus.emitHeritage({
          type: 'heritage.site.published',
          siteId: created?.id || siteId,
          status: 'PUBLISHED',
        });
      }

      return created;
    } catch (err: any) {
      // Compensating cleanup for newly uploaded Cloudinary assets if DB persistence fails
      for (const pid of uploadedPublicIds) {
        await CloudinaryService.deleteAsset(pid, 'image').catch(() => false);
      }
      throw err;
    }
  }

  /**
   * Super-admin: Update Heritage Site (with optional Cloudinary image replacement)
   */
  async adminUpdateSite(id: string, data: any) {
    const rawImages: any[] | null =
      Array.isArray(data.destinationImages) && data.destinationImages.length > 0
        ? data.destinationImages
        : Array.isArray(data.images) && data.images.length > 0
        ? data.images
        : null;

    let uploadedImages: any[] = [];
    let uploadedPublicIds: string[] = [];
    if (rawImages) {
      const res = await this.uploadImagesToCloudinary(rawImages, `kings-taxi/heritage/${id}`);
      uploadedImages = res.processed;
      uploadedPublicIds = res.uploadedPublicIds;
    }

    const updatePayload: any = {};
    if (data.name !== undefined) updatePayload.name = data.name.trim();
    if (data.shortDescription !== undefined) updatePayload.shortDescription = data.shortDescription.trim();
    if (data.fullDescription !== undefined || data.description !== undefined) {
      updatePayload.fullDescription = (data.fullDescription ?? data.description).trim();
    }
    if (data.region !== undefined) updatePayload.region = data.region;
    if (data.city !== undefined) updatePayload.city = data.city;
    if (data.specificLocation !== undefined || data.address !== undefined) {
      updatePayload.specificLocation = data.specificLocation ?? data.address;
    }
    if (data.latitude !== undefined) updatePayload.latitude = data.latitude;
    if (data.longitude !== undefined) updatePayload.longitude = data.longitude;
    if (data.destinationType !== undefined || data.category !== undefined) {
      updatePayload.destinationType = this.mapDestinationType(data.destinationType || data.category);
    }
    if (data.estimatedVisitDurationMinutes !== undefined) {
      updatePayload.estimatedVisitDurationMinutes = Number(data.estimatedVisitDurationMinutes);
    }
    if (data.historicalInformation !== undefined || data.historicalOverview !== undefined) {
      updatePayload.historicalInformation = data.historicalInformation ?? data.historicalOverview;
    }
    if (data.culturalInformation !== undefined || data.culturalSignificance !== undefined) {
      updatePayload.culturalInformation = data.culturalInformation ?? data.culturalSignificance;
    }
    if (data.visitingRules !== undefined || data.visitingHours !== undefined) {
      updatePayload.visitingRules = data.visitingRules ?? data.visitingHours;
    }
    if (data.entryFeeETB !== undefined || data.entranceFeeETB !== undefined) {
      updatePayload.entryFeeETB = Number(data.entryFeeETB ?? data.entranceFeeETB);
    }
    if (data.unescoDesignated !== undefined || data.unescoWorldHeritage !== undefined) {
      updatePayload.unescoDesignated = Boolean(data.unescoDesignated ?? data.unescoWorldHeritage);
    }
    if (data.featured !== undefined) updatePayload.featured = Boolean(data.featured);
    if (data.status !== undefined) {
      updatePayload.status = data.status;
      if (data.status === 'PUBLISHED') updatePayload.publishedAt = new Date();
    }
    if (uploadedImages.length > 0) {
      updatePayload.coverImageUrl =
        uploadedImages.find((img) => img.isPrimary)?.imageUrl || uploadedImages[0].imageUrl;
      updatePayload.galleryImages = uploadedImages.map((img) => img.imageUrl);
    } else if (data.coverImageUrl !== undefined || data.heroImage !== undefined) {
      updatePayload.coverImageUrl = data.coverImageUrl ?? data.heroImage;
    }

    try {
      const updated = await prisma.$transaction(async (tx) => {
        if (uploadedImages.length > 0 && tx.heritageDestinationImage) {
          await tx.heritageDestinationImage.deleteMany({ where: { siteId: id } });
          await Promise.all(
            uploadedImages.map((img) =>
              tx.heritageDestinationImage.create({
                data: {
                  siteId: id,
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

        return tx.heritageSite.update({
          where: { id },
          data: updatePayload,
          include: {
            destinationImages: {
              orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
            },
          },
        });
      });

      heritageEventBus.emitHeritage({
        type: 'heritage.site.updated',
        siteId: updated.id,
        status: updated.status,
      });
      return updated;
    } catch (err: any) {
      for (const pid of uploadedPublicIds) {
        await CloudinaryService.deleteAsset(pid, 'image').catch(() => false);
      }
      throw err;
    }
  }

  /**
   * Super-admin: Delete Heritage Site (archives safely if bookings exist)
   */
  async adminDeleteSite(id: string) {
    const bookingCount = prisma.heritageTourBookingSite
      ? await prisma.heritageTourBookingSite.count({ where: { siteId: id } }).catch(() => 0)
      : 0;

    if (bookingCount > 0) {
      const archived = await prisma.heritageSite.update({
        where: { id },
        data: { status: 'ARCHIVED', featured: false },
      });
      heritageEventBus.emitHeritage({ type: 'heritage.site.unpublished', siteId: id, status: 'ARCHIVED' });
      return archived;
    }

    const deleted = await prisma.heritageSite.delete({
      where: { id },
    });
    heritageEventBus.emitHeritage({ type: 'heritage.site.unpublished', siteId: id, status: 'DELETED' });
    return deleted;
  }

  /**
   * Super-admin: Publish Site
   */
  async adminPublishSite(id: string) {
    const published = await prisma.heritageSite.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });
    heritageEventBus.emitHeritage({ type: 'heritage.site.published', siteId: id, status: 'PUBLISHED' });
    return published;
  }

  /**
   * Super-admin: Unpublish Site
   */
  async adminUnpublishSite(id: string) {
    const unpublished = await prisma.heritageSite.update({
      where: { id },
      data: {
        status: 'UNPUBLISHED',
      },
    });
    heritageEventBus.emitHeritage({ type: 'heritage.site.unpublished', siteId: id, status: 'UNPUBLISHED' });
    return unpublished;
  }

  /**
   * Super-admin: Get all gallery images for a heritage destination site
   */
  async getSiteImages(siteId: string) {
    try {
      return await prisma.heritageDestinationImage.findMany({
        where: { siteId },
        orderBy: { displayOrder: 'asc' },
      });
    } catch (err: any) {
      return [];
    }
  }

  /**
   * Super-admin: Set/replace gallery images for a heritage destination site (1 to 8 images)
   */
  async setSiteImages(
    siteId: string,
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
      throw new Error('A heritage destination must have between 1 and 8 images.');
    }

    const site = await prisma.heritageSite.findUnique({ where: { id: siteId } });
    if (!site) throw new Error('SITE_NOT_FOUND: Heritage site does not exist');

    const { processed, uploadedPublicIds } = await this.uploadImagesToCloudinary(
      images,
      `kings-taxi/heritage/${siteId}`
    );

    const primaryUrl = processed.find((img) => img.isPrimary)?.imageUrl || processed[0].imageUrl;

    try {
      const created = await prisma.$transaction(async (tx) => {
        await tx.heritageDestinationImage.deleteMany({ where: { siteId } });

        const rows = await Promise.all(
          processed.map((img, idx) =>
            tx.heritageDestinationImage.create({
              data: {
                siteId,
                imageUrl: img.imageUrl,
                publicId: img.publicId,
                caption: img.caption,
                displayOrder: img.displayOrder ?? idx,
                isPrimary: img.isPrimary,
                fileFormat: img.fileFormat,
                fileSize: img.fileSize,
              },
            })
          )
        );

        await tx.heritageSite.update({
          where: { id: siteId },
          data: {
            coverImageUrl: primaryUrl,
            galleryImages: processed.map((p) => p.imageUrl),
          },
        });

        return rows;
      });

      heritageEventBus.emitHeritage({ type: 'heritage.site.updated', siteId, status: site.status });
      return created;
    } catch (err: any) {
      for (const pid of uploadedPublicIds) {
        await CloudinaryService.deleteAsset(pid, 'image').catch(() => false);
      }
      throw err;
    }
  }

  /**
   * Safe read-only DB & Cloudinary diagnostic (never exposes credentials)
   */
  async getDatabaseDiagnostics() {
    const dbInfo: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        current_database() AS database_name,
        current_user AS database_user,
        inet_server_addr()::text AS server_ip,
        version() AS postgres_version
    `);
    const [siteCount, imageCount, bookingCount] = await Promise.all([
      prisma.heritageSite.count(),
      prisma.heritageDestinationImage.count(),
      prisma.heritageTourBooking.count(),
    ]);
    return {
      connected: true,
      databaseName: dbInfo?.[0]?.database_name || null,
      databaseUser: dbInfo?.[0]?.database_user || null,
      serverIp: dbInfo?.[0]?.server_ip || null,
      postgresVersion: dbInfo?.[0]?.postgres_version || null,
      tables: {
        heritage_sites: siteCount,
        heritage_destination_images: imageCount,
        heritage_tour_bookings: bookingCount,
      },
      cloudinaryConfigured: Boolean(
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
      ),
    };
  }
}

export const heritageSiteService = new HeritageSiteService();

