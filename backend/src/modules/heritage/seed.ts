import { prisma } from '../../core/database/prisma';
import { FALLBACK_HERITAGE_SITES } from './site.service';
import { FALLBACK_TOUR_PACKAGES } from './package.service';
import { FALLBACK_TOUR_GUIDES } from './guide.service';
import { FALLBACK_VEHICLE_OPTIONS } from './vehicleOption.service';

export async function seedHeritageModule() {
  console.log('Seeding Heritage Tour Module...');

  // 1. Seed Heritage Sites
  for (const site of FALLBACK_HERITAGE_SITES) {
    await prisma.heritageSite.upsert({
      where: { slug: site.slug },
      update: {},
      create: {
        id: site.id,
        name: site.name,
        slug: site.slug,
        shortDescription: site.shortDescription,
        fullDescription: site.fullDescription,
        region: site.region,
        city: site.city,
        specificLocation: site.specificLocation,
        latitude: site.latitude,
        longitude: site.longitude,
        destinationType: site.destinationType as any,
        estimatedVisitDurationMinutes: site.estimatedVisitDurationMinutes,
        historicalInformation: site.historicalInformation,
        culturalInformation: site.culturalInformation,
        visitingRules: site.visitingRules,
        coverImageUrl: site.coverImageUrl,
        galleryImages: site.galleryImages,
        highlights: site.highlights,
        entryFeeETB: site.entryFeeETB,
        requiresBoatTransport: site.requiresBoatTransport,
        unescoDesignated: site.unescoDesignated,
        unescoYear: site.unescoYear,
        status: site.status as any,
        featured: site.featured,
        displayOrder: site.displayOrder,
      },
    });
  }

  // 2. Seed Vehicle Options
  for (const vo of FALLBACK_VEHICLE_OPTIONS) {
    await prisma.heritageTourVehicleOption.upsert({
      where: { id: vo.id },
      update: {},
      create: {
        id: vo.id,
        vehicleType: vo.vehicleType,
        displayName: vo.displayName,
        seatingCapacity: vo.seatingCapacity,
        luggageCapacity: vo.luggageCapacity,
        baseRate: vo.baseRate,
        perHourRate: vo.perHourRate,
        isActive: vo.isActive,
        features: vo.features,
        displayOrder: vo.displayOrder,
      },
    });
  }

  // 3. Seed Tour Guides
  for (const g of FALLBACK_TOUR_GUIDES) {
    await prisma.heritageTourGuide.upsert({
      where: { id: g.id },
      update: {},
      create: {
        id: g.id,
        fullName: g.fullName,
        languages: g.languages,
        qualifications: g.qualifications,
        specialties: g.specialties,
        dailyRate: g.dailyRate,
        hourlyRate: g.hourlyRate,
        phone: g.phone,
        email: g.email,
        profileImageUrl: g.profileImageUrl,
        rating: g.rating,
        totalToursLed: g.totalToursLed,
        isActive: g.isActive,
        availabilityStatus: g.availabilityStatus as any,
      },
    });
  }

  // 4. Seed Tour Packages & Package Sites
  for (const pkg of FALLBACK_TOUR_PACKAGES) {
    const createdPkg = await prisma.heritageTourPackage.upsert({
      where: { slug: pkg.slug },
      update: {},
      create: {
        id: pkg.id,
        name: pkg.name,
        slug: pkg.slug,
        description: pkg.description,
        itinerary: pkg.itinerary,
        estimatedDurationMinutes: pkg.estimatedDurationMinutes,
        region: pkg.region,
        city: pkg.city,
        basePrice: pkg.basePrice,
        currency: pkg.currency,
        minimumPassengers: pkg.minimumPassengers,
        maximumPassengers: pkg.maximumPassengers,
        includesGuide: pkg.includesGuide,
        includesTransport: pkg.includesTransport,
        includesBoat: pkg.includesBoat,
        status: pkg.status as any,
        featured: pkg.featured,
        requiresAdvanceBooking: pkg.requiresAdvanceBooking,
        minimumAdvanceHours: pkg.minimumAdvanceHours,
        cancellationPolicy: pkg.cancellationPolicy,
      },
    });

    for (const s of pkg.sites) {
      await prisma.heritageTourPackageSite.upsert({
        where: {
          packageId_siteId: {
            packageId: createdPkg.id,
            siteId: s.siteId,
          },
        },
        update: {},
        create: {
          packageId: createdPkg.id,
          siteId: s.siteId,
          visitOrder: s.visitOrder,
          estimatedVisitDurationMinutes: s.estimatedVisitDurationMinutes,
        },
      });
    }
  }

  console.log('Heritage Tour Module successfully seeded.');
}

