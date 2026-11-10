import { prisma } from '../../core/database/prisma';
import { HotelStatus, VehicleType, Prisma } from '@prisma/client';

export async function seedHospitalityModule() {
  console.log('Seeding Kings Taxi Hospitality Module (Gondar Hotels, Airport Transfers & Lounges)...');

  // 1. Seed Amenities
  const amenitiesData = [
    { name: 'High-Speed Wi-Fi', slug: 'wifi', icon: 'wifi', description: 'Complimentary high-speed fiber internet' },
    { name: 'Gondar Airport Transfer', slug: 'airport-transfer', icon: 'plane', description: 'Direct pickup from Atse Tewodros Airport (GDQ)' },
    { name: 'Swimming Pool', slug: 'swimming-pool', icon: 'droplet', description: 'Outdoor heated swimming pool' },
    { name: 'Gourmet Restaurant', slug: 'restaurant', icon: 'utensils', description: 'Traditional Ethiopian and international dining' },
    { name: 'Air Conditioning', slug: 'air-conditioning', icon: 'wind', description: 'Climate-controlled guest rooms' },
    { name: '24/7 Room Service', slug: 'room-service', icon: 'bell', description: 'Round-the-clock food and beverage service' },
    { name: 'Free Secure Parking', slug: 'free-parking', icon: 'car', description: 'Guarded parking area for personal and rental vehicles' },
    { name: 'Conference Facilities', slug: 'conference-facilities', icon: 'briefcase', description: 'Modern halls for business and delegations' },
    { name: 'Spa & Wellness', slug: 'spa-wellness', icon: 'sparkles', description: 'Steam, sauna, and massage therapy' },
  ];

  for (const item of amenitiesData) {
    await prisma.hotelAmenity.upsert({
      where: { slug: item.slug },
      update: { name: item.name, icon: item.icon, description: item.description },
      create: item,
    });
  }

  // 2. Seed Hotel 1: Goha Hotel Gondar
  const gohaHotel = await prisma.hotel.upsert({
    where: { slug: 'goha-hotel-gondar' },
    update: {
      name: 'Goha Hotel Gondar',
      status: HotelStatus.PUBLISHED,
      featured: true,
      city: 'Gondar',
      address: 'Goha Hill, Gondar, Amhara, Ethiopia',
      starRating: 4,
    },
    create: {
      name: 'Goha Hotel Gondar',
      slug: 'goha-hotel-gondar',
      description:
        'Perched high on the hills above Gondar, Goha Hotel commands breathtaking panoramic views of the historic royal castles, royal baths, and the sweeping Ethiopian highlands. Featuring traditional stone architecture, a hillside swimming pool, and authentic cultural dining.',
      shortDescription: 'Iconic hilltop hotel overlooking the castles of Gondar with panoramic highland vistas.',
      address: 'Goha Hill, Gondar, Amhara, Ethiopia',
      city: 'Gondar',
      subCity: 'Goha',
      latitude: 12.6185,
      longitude: 37.472,
      contactPhone: '+251581110634',
      contactEmail: 'reservations@gohahotel.com',
      website: 'https://gohahotels.com',
      starRating: 4,
      checkInTime: '14:00',
      checkOutTime: '11:00',
      timezone: 'Africa/Addis_Ababa',
      status: HotelStatus.PUBLISHED,
      featured: true,
      publishedAt: new Date(),
    },
  });

  // Link Amenities for Goha
  const gohaAmenities = await prisma.hotelAmenity.findMany({
    where: { slug: { in: ['wifi', 'airport-transfer', 'swimming-pool', 'restaurant', 'free-parking', 'room-service'] } },
  });
  for (const a of gohaAmenities) {
    await prisma.hotelAmenityRelation.upsert({
      where: { hotelId_amenityId: { hotelId: gohaHotel.id, amenityId: a.id } },
      update: {},
      create: { hotelId: gohaHotel.id, amenityId: a.id },
    });
  }

  // Goha Images
  await prisma.hotelImage.deleteMany({ where: { hotelId: gohaHotel.id } });
  await prisma.hotelImage.createMany({
    data: [
      {
        hotelId: gohaHotel.id,
        imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&auto=format&fit=crop&q=80',
        altText: 'Goha Hotel Panoramic View of Gondar',
        displayOrder: 1,
        isCover: true,
      },
      {
        hotelId: gohaHotel.id,
        imageUrl: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1200&auto=format&fit=crop&q=80',
        altText: 'Goha Hotel Hillside Terrace & Pool',
        displayOrder: 2,
        isCover: false,
      },
      {
        hotelId: gohaHotel.id,
        imageUrl: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1200&auto=format&fit=crop&q=80',
        altText: 'Deluxe Royal Castle View Suite',
        displayOrder: 3,
        isCover: false,
      },
    ],
  });

  // Goha Room Types
  const gohaRooms = [
    {
      name: 'Standard Hillside Twin Room',
      description: 'Comfortable twin bedding with garden and mountain hillside views, private balcony, and en-suite bath.',
      maximumAdults: 2,
      maximumChildren: 1,
      maximumGuests: 3,
      totalInventory: 14,
      basePricePerNight: new Prisma.Decimal(4800),
    },
    {
      name: 'Deluxe Royal Castle View Room',
      description: 'Spacious king-size bed overlooking Fasil Ghebbi royal enclosure, minibar, lounge chair, and luxury bath amenities.',
      maximumAdults: 2,
      maximumChildren: 2,
      maximumGuests: 4,
      totalInventory: 8,
      basePricePerNight: new Prisma.Decimal(7500),
    },
    {
      name: 'Imperial Presidential Suite',
      description: 'Expansive private suite with separate salon living area, wrap-around panoramic terrace, and VIP chauffeur access.',
      maximumAdults: 3,
      maximumChildren: 2,
      maximumGuests: 5,
      totalInventory: 3,
      basePricePerNight: new Prisma.Decimal(14000),
    },
  ];

  for (const r of gohaRooms) {
    const existingRoom = await prisma.hotelRoomType.findFirst({
      where: { hotelId: gohaHotel.id, name: r.name },
    });
    if (existingRoom) {
      await prisma.hotelRoomType.update({
        where: { id: existingRoom.id },
        data: r,
      });
    } else {
      await prisma.hotelRoomType.create({
        data: { hotelId: gohaHotel.id, ...r },
      });
    }
  }

  // Goha Fixed Airport Transfer Rates (Gondar Airport -> Goha Hotel)
  await prisma.airportTransferRate.deleteMany({ where: { hotelId: gohaHotel.id } });
  await prisma.airportTransferRate.createMany({
    data: [
      {
        hotelId: gohaHotel.id,
        originName: 'Atse Tewodros Airport (GDQ), Gondar',
        originType: 'AIRPORT',
        destinationName: 'Goha Hotel, Goha Hill, Gondar',
        vehicleType: VehicleType.STANDARD_SEDAN,
        vehicleCapacity: 4,
        fixedPrice: new Prisma.Decimal(1200),
        currency: 'ETB',
        effectiveFrom: new Date(Date.UTC(2026, 0, 1)),
        isActive: true,
      },
      {
        hotelId: gohaHotel.id,
        originName: 'Atse Tewodros Airport (GDQ), Gondar',
        originType: 'AIRPORT',
        destinationName: 'Goha Hotel, Goha Hill, Gondar',
        vehicleType: VehicleType.COMFORT_VAN,
        vehicleCapacity: 6,
        fixedPrice: new Prisma.Decimal(1800),
        currency: 'ETB',
        effectiveFrom: new Date(Date.UTC(2026, 0, 1)),
        isActive: true,
      },
    ],
  });

  // 3. Seed Hotel 2: Taye Belay Hotel Gondar
  const tayeHotel = await prisma.hotel.upsert({
    where: { slug: 'taye-belay-hotel-gondar' },
    update: {
      name: 'Taye Belay Hotel Gondar',
      status: HotelStatus.PUBLISHED,
      featured: true,
      city: 'Gondar',
      address: 'Piasa Square, Gondar, Ethiopia',
      starRating: 4,
    },
    create: {
      name: 'Taye Belay Hotel Gondar',
      slug: 'taye-belay-hotel-gondar',
      description:
        'Located in the heart of historic Gondar at Piasa, Taye Belay Hotel is moments away from the 17th-century castles of Emperor Fasilides. Offering premier hospitality, fine Ethiopian cuisine, conference facilities, and dedicated airport executive shuttles.',
      shortDescription: 'Centrally situated luxury hotel minutes from Fasil Ghebbi and the historical quarter.',
      address: 'Piasa Square, Gondar, Ethiopia',
      city: 'Gondar',
      subCity: 'Piasa',
      latitude: 12.608,
      longitude: 37.469,
      contactPhone: '+251581114400',
      contactEmail: 'info@tayebelayhotel.com',
      website: 'https://tayebelayhotel.com',
      starRating: 4,
      checkInTime: '14:00',
      checkOutTime: '11:00',
      timezone: 'Africa/Addis_Ababa',
      status: HotelStatus.PUBLISHED,
      featured: true,
      publishedAt: new Date(),
    },
  });

  // Taye Belay Images & Rooms
  await prisma.hotelImage.deleteMany({ where: { hotelId: tayeHotel.id } });
  await prisma.hotelImage.createMany({
    data: [
      {
        hotelId: tayeHotel.id,
        imageUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1200&auto=format&fit=crop&q=80',
        altText: 'Taye Belay Hotel Exterior Piasa',
        displayOrder: 1,
        isCover: true,
      },
      {
        hotelId: tayeHotel.id,
        imageUrl: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=1200&auto=format&fit=crop&q=80',
        altText: 'Taye Belay Executive Bedroom',
        displayOrder: 2,
        isCover: false,
      },
    ],
  });

  const tayeRooms = [
    {
      name: 'Superior Double Room',
      description: 'Elegant double room with queen-sized bed, work desk, high-speed Wi-Fi, and private bath.',
      maximumAdults: 2,
      maximumChildren: 1,
      maximumGuests: 3,
      totalInventory: 15,
      basePricePerNight: new Prisma.Decimal(5600),
    },
    {
      name: 'Fasil Royal Executive Suite',
      description: 'Spacious royal suite with plush furnishings, city castle outlook, mini-bar, and airport pickup priority.',
      maximumAdults: 3,
      maximumChildren: 2,
      maximumGuests: 4,
      totalInventory: 6,
      basePricePerNight: new Prisma.Decimal(11500),
    },
  ];

  for (const r of tayeRooms) {
    const existing = await prisma.hotelRoomType.findFirst({
      where: { hotelId: tayeHotel.id, name: r.name },
    });
    if (existing) {
      await prisma.hotelRoomType.update({ where: { id: existing.id }, data: r });
    } else {
      await prisma.hotelRoomType.create({ data: { hotelId: tayeHotel.id, ...r } });
    }
  }

  // Taye Belay Fixed Airport Transfer Rate
  await prisma.airportTransferRate.deleteMany({ where: { hotelId: tayeHotel.id } });
  await prisma.airportTransferRate.create({
    data: {
      hotelId: tayeHotel.id,
      originName: 'Atse Tewodros Airport (GDQ), Gondar',
      originType: 'AIRPORT',
      destinationName: 'Taye Belay Hotel, Piasa, Gondar',
      vehicleType: VehicleType.STANDARD_SEDAN,
      vehicleCapacity: 4,
      fixedPrice: new Prisma.Decimal(1000),
      currency: 'ETB',
      effectiveFrom: new Date(Date.UTC(2026, 0, 1)),
      isActive: true,
    },
  });

  // 4. Seed Lounges in Gondar
  const fasilLounge = await prisma.lounge.upsert({
    where: { slug: 'fasil-imperial-lounge-terrace' },
    update: {
      status: HotelStatus.PUBLISHED,
      featured: true,
    },
    create: {
      name: 'Fasil Imperial Lounge & Terrace',
      slug: 'fasil-imperial-lounge-terrace',
      description:
        'A refined rooftop lounge overlooking the imperial compound of Gondar. Enjoy artisan Ethiopian coffee tastings, evening cocktails, and light gourmet bites with traditional live music.',
      shortDescription: 'Rooftop cocktail lounge and traditional coffee pavilion overlooking the Royal Enclosure.',
      address: 'Near Fasilides Castle, Piasa, Gondar',
      city: 'Gondar',
      latitude: 12.6075,
      longitude: 37.4685,
      contactPhone: '+251581112233',
      operatingHours: '08:00 - 00:00',
      amenities: ['Castle View Terrace', 'Coffee Ceremony', 'Signature Cocktails', 'Live Acoustic Masinko'],
      featured: true,
      status: HotelStatus.PUBLISHED,
      publishedAt: new Date(),
    },
  });

  await prisma.loungeImage.deleteMany({ where: { loungeId: fasilLounge.id } });
  await prisma.loungeImage.create({
    data: {
      loungeId: fasilLounge.id,
      imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80',
      altText: 'Fasil Imperial Terrace Lounge',
      isCover: true,
      displayOrder: 1,
    },
  });

  console.log('✅ Hospitality Module successfully seeded with Gondar hotels, airport transfers, and lounges!');
}

