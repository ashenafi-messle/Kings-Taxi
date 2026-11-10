import { PrismaClient, VehicleType, DriverVerificationStatus, DriverAvailabilityStatus, VehicleVerificationStatus } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// Scrypt password hash generator matching auth.service.ts
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64, {
    N: 16384,
    r: 8,
    p: 1,
    maxmem: 32 * 1024 * 1024,
  });
  return `scrypt$16384$8$1$${salt}$${derivedKey.toString('hex')}`;
}

async function main() {
  console.log('🌱 Starting Kings Taxi database seed on kings_taxi_dev...');

  // 1. Seed Subcities in Gondar
  const subcitiesData = [
    { name: 'Maraki', slug: 'maraki', city: 'Gondar', centerLatitude: 12.6074, centerLongitude: 37.4589, radiusKm: 5.0 },
    { name: 'Azezo', slug: 'azezo', city: 'Gondar', centerLatitude: 12.5350, centerLongitude: 37.4350, radiusKm: 6.0 },
    { name: 'Arada', slug: 'arada', city: 'Gondar', centerLatitude: 12.6070, centerLongitude: 37.4680, radiusKm: 4.0 },
    { name: 'Piasa', slug: 'piasa', city: 'Gondar', centerLatitude: 12.6080, centerLongitude: 37.4640, radiusKm: 4.0 },
    { name: 'Poly', slug: 'poly', city: 'Gondar', centerLatitude: 12.5850, centerLongitude: 37.4420, radiusKm: 5.0 },
  ];

  const subcities: Record<string, any> = {};
  for (const s of subcitiesData) {
    subcities[s.slug] = await prisma.subcity.upsert({
      where: { slug: s.slug },
      update: { name: s.name, centerLatitude: s.centerLatitude, centerLongitude: s.centerLongitude, radiusKm: s.radiusKm, isActive: true },
      create: s,
    });
    console.log(`  ✓ Subcity: ${s.name} (${s.slug})`);
  }

  // 2. Seed Dynamic Vehicle Fare Configurations
  const fareConfigsData = [
    { vehicleType: VehicleType.STANDARD_SEDAN, baseFare: 100.0, perKilometreRate: 25.0, perMinuteRate: 2.0, minimumFare: 50.0, currency: 'ETB' },
    { vehicleType: VehicleType.COMFORT_VAN, baseFare: 150.0, perKilometreRate: 35.0, perMinuteRate: 3.0, minimumFare: 75.0, currency: 'ETB' },
    { vehicleType: VehicleType.EXECUTIVE, baseFare: 200.0, perKilometreRate: 45.0, perMinuteRate: 4.0, minimumFare: 100.0, currency: 'ETB' },
    { vehicleType: VehicleType.MINIVAN_TOUR, baseFare: 180.0, perKilometreRate: 40.0, perMinuteRate: 3.5, minimumFare: 90.0, currency: 'ETB' },
  ];

  for (const f of fareConfigsData) {
    const existing = await prisma.vehicleFareConfiguration.findFirst({
      where: { vehicleType: f.vehicleType, isActive: true },
    });
    if (!existing) {
      await prisma.vehicleFareConfiguration.create({ data: f });
    }
    console.log(`  ✓ Fare Config: ${f.vehicleType} (Base: ${f.baseFare} ETB, Rate: ${f.perKilometreRate}/km, ${f.perMinuteRate}/min)`);
  }

  // 3. Seed Verified, Available Drivers in Gondar
  const dummyPasswordHash = hashPassword('GondarDriver2026!');

  const driversData = [
    {
      fullName: 'Dawit Haile',
      email: 'dawit.haile@kingstaxi.et',
      phoneNumber: '+251918112233',
      profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      rating: 4.92,
      totalTrips: 128,
      subcities: ['maraki', 'piasa'],
      primarySubcity: 'maraki',
      vehicle: {
        plateNumber: '3-A12345',
        vehicleModel: 'Toyota Corolla 2022',
        vehicleColor: 'Silver Metallic',
        vehicleType: VehicleType.STANDARD_SEDAN,
        seatingCapacity: 4,
      },
    },
    {
      fullName: 'Yohannes Bekele',
      email: 'yohannes.bekele@kingstaxi.et',
      phoneNumber: '+251918223344',
      profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
      rating: 4.85,
      totalTrips: 94,
      subcities: ['azezo', 'poly'],
      primarySubcity: 'azezo',
      vehicle: {
        plateNumber: '3-B23456',
        vehicleModel: 'Toyota HiAce Minivan',
        vehicleColor: 'White',
        vehicleType: VehicleType.COMFORT_VAN,
        seatingCapacity: 7,
      },
    },
    {
      fullName: 'Mulugeta Tadesse',
      email: 'mulugeta.tadesse@kingstaxi.et',
      phoneNumber: '+251918334455',
      profileImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
      rating: 5.0,
      totalTrips: 215,
      subcities: ['arada', 'piasa'],
      primarySubcity: 'arada',
      vehicle: {
        plateNumber: '3-C34567',
        vehicleModel: 'Mercedes-Benz E200',
        vehicleColor: 'Obsidian Black',
        vehicleType: VehicleType.EXECUTIVE,
        seatingCapacity: 4,
      },
    },
    {
      fullName: 'Almaz Tefera',
      email: 'almaz.tefera@kingstaxi.et',
      phoneNumber: '+251918445566',
      profileImage: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
      rating: 4.95,
      totalTrips: 106,
      subcities: ['maraki', 'arada'],
      primarySubcity: 'maraki',
      vehicle: {
        plateNumber: '3-D45678',
        vehicleModel: 'Hyundai Elantra 2023',
        vehicleColor: 'Pearl White',
        vehicleType: VehicleType.STANDARD_SEDAN,
        seatingCapacity: 4,
      },
    },
  ];

  for (const d of driversData) {
    const driver = await prisma.driver.upsert({
      where: { phoneNumber: d.phoneNumber },
      update: {
        fullName: d.fullName,
        email: d.email,
        profileImage: d.profileImage,
        verificationStatus: DriverVerificationStatus.APPROVED,
        availabilityStatus: DriverAvailabilityStatus.AVAILABLE,
        rating: d.rating,
        totalTrips: d.totalTrips,
      },
      create: {
        fullName: d.fullName,
        email: d.email,
        phoneNumber: d.phoneNumber,
        passwordHash: dummyPasswordHash,
        profileImage: d.profileImage,
        verificationStatus: DriverVerificationStatus.APPROVED,
        availabilityStatus: DriverAvailabilityStatus.AVAILABLE,
        rating: d.rating,
        totalTrips: d.totalTrips,
      },
    });

    // Upsert vehicle
    await prisma.vehicle.upsert({
      where: { plateNumber: d.vehicle.plateNumber },
      update: {
        driverId: driver.id,
        vehicleModel: d.vehicle.vehicleModel,
        vehicleColor: d.vehicle.vehicleColor,
        vehicleType: d.vehicle.vehicleType,
        seatingCapacity: d.vehicle.seatingCapacity,
        verificationStatus: VehicleVerificationStatus.VERIFIED,
        isActive: true,
      },
      create: {
        driverId: driver.id,
        plateNumber: d.vehicle.plateNumber,
        vehicleModel: d.vehicle.vehicleModel,
        vehicleColor: d.vehicle.vehicleColor,
        vehicleType: d.vehicle.vehicleType,
        seatingCapacity: d.vehicle.seatingCapacity,
        verificationStatus: VehicleVerificationStatus.VERIFIED,
        isActive: true,
      },
    });

    // Assign subcities
    for (const subcitySlug of d.subcities) {
      const subcity = subcities[subcitySlug];
      if (subcity) {
        await prisma.driverSubcity.upsert({
          where: {
            driverId_subcityId: {
              driverId: driver.id,
              subcityId: subcity.id,
            },
          },
          update: { isPrimary: subcitySlug === d.primarySubcity },
          create: {
            driverId: driver.id,
            subcityId: subcity.id,
            isPrimary: subcitySlug === d.primarySubcity,
          },
        });
      }
    }

    console.log(`  ✓ Driver: ${d.fullName} (${d.vehicle.vehicleModel}) -> Subcities: ${d.subcities.join(', ')}`);
  }

  // 4. Seed Standard Verified Demo Passenger
  const passengerSalt = 'salt_dawit_haile';
  const passengerHash = crypto.scryptSync('Password123!', passengerSalt, 64, {
    N: 16384,
    r: 8,
    p: 1,
    maxmem: 32 * 1024 * 1024,
  }).toString('hex');
  const combinedPassengerHash = `${passengerHash}:${passengerSalt}`;

  const demoPassenger = await prisma.passenger.upsert({
    where: { email: 'dawit@kingstaxi.et' },
    update: {
      fullName: 'Dawit Haile',
      phoneNumber: '+251911234567',
      passwordHash: combinedPassengerHash,
      language: 'EN',
      city: 'Gondar',
      isVerified: true,
      accountStatus: 'ACTIVE',
    },
    create: {
      fullName: 'Dawit Haile',
      email: 'dawit@kingstaxi.et',
      phoneNumber: '+251911234567',
      passwordHash: combinedPassengerHash,
      language: 'EN',
      city: 'Gondar',
      isVerified: true,
      accountStatus: 'ACTIVE',
      authIdentities: {
        create: {
          provider: 'EMAIL',
          providerId: 'dawit@kingstaxi.et',
          verified: true,
          verifiedAt: new Date(),
        },
      },
    },
  });
  console.log(`  ✓ Demo Passenger: ${demoPassenger.fullName} (${demoPassenger.email}) [Password123!]`);

  // 5. Seed Hospitality Module (Hotels, Airport Transfers, Lounges)
  const { seedHospitalityModule } = await import('../src/modules/hospitality/seed');
  await seedHospitalityModule();

  console.log('✅ Kings Taxi database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

