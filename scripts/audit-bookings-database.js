const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const { prisma } = require(path.join(__dirname, '../backend/dist/core/database/prisma'));

async function runAudit() {
  console.log('================================================================');
  console.log('  KINGS TAXI — READ-ONLY VPS DATABASE AUDIT (PHASE TWO)       ');
  console.log('================================================================\n');

  try {
    // A. Database Identity
    console.log('--- A. DATABASE IDENTITY & ENVIRONMENT ---');
    const dbInfo = await prisma.$queryRawUnsafe(`
      SELECT 
        current_database() as database_name,
        current_schema() as current_schema,
        version() as version;
    `);
    console.log('Database Name:', dbInfo[0]?.database_name);
    console.log('Schema:', dbInfo[0]?.current_schema);
    console.log('PostgreSQL Version:', dbInfo[0]?.version);

    // Redacted connection target
    const dbUrl = process.env.DATABASE_URL || '';
    const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':****@');
    console.log('Connection Target:', maskedUrl);

    // Migration history
    try {
      const migrations = await prisma.$queryRawUnsafe(`
        SELECT id, migration_name, finished_at, applied_steps_count 
        FROM "_prisma_migrations" 
        ORDER BY finished_at DESC LIMIT 10;
      `);
      console.log(`\nApplied Prisma Migrations count: ${migrations.length}`);
      migrations.forEach((m) => {
        console.log(`  - [${m.finished_at?.toISOString() || 'UNKNOWN'}] ${m.migration_name} (steps: ${m.applied_steps_count})`);
      });
    } catch (migErr) {
      console.log('\nNote on _prisma_migrations table:', migErr.message);
    }

    // Check table existence in information_schema
    const tablesToCheck = [
      'passengers',
      'bookings',
      'trips',
      'hotel_bookings',
      'hotel_booking_rooms',
      'hotel_transfer_bookings',
      'lounge_reservations',
      'lounges',
      'hotels',
      'heritage_sites',
      'heritage_tour_packages',
      'heritage_tour_bookings',
      'payments'
    ];

    const existingTablesRes = await prisma.$queryRawUnsafe(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = current_schema() 
        AND table_name = ANY($1::text[]);
    `, tablesToCheck);

    const existingTableNames = new Set(existingTablesRes.map((r) => r.table_name));
    console.log('\n--- Table Existence Verification ---');
    tablesToCheck.forEach((t) => {
      console.log(`  Table [${t}]: ${existingTableNames.has(t) ? 'EXISTS ✅' : 'DOES NOT EXIST ❌'}`);
    });

    // B. Detailed Table Statistics & Metrics
    console.log('\n--- B. SERVICE-BY-SERVICE TABLE METRICS ---');

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // 1. Passengers
    const totalPassengers = await prisma.passenger.count();
    console.log(`\n[PASSENGERS] Total: ${totalPassengers}`);
    const passengerList = await prisma.passenger.findMany({
      select: { id: true, fullName: true, email: true, phoneNumber: true, createdAt: true },
    });
    passengerList.forEach((p) => {
      console.log(`  Passenger: ${p.id} | ${p.fullName} | ${p.email || 'no-email'} | created: ${p.createdAt.toISOString()}`);
    });

    // 2. Rides (bookings table + trips table)
    console.log('\n--- RIDES (bookings & trips) ---');
    const totalBookings = await prisma.booking.count();
    const recent7dBookings = await prisma.booking.count({ where: { createdAt: { gte: sevenDaysAgo } } });
    const recent30dBookings = await prisma.booking.count({ where: { createdAt: { gte: thirtyDaysAgo } } });
    const latestBooking = await prisma.booking.findFirst({ orderBy: { createdAt: 'desc' }, select: { createdAt: true } });
    console.log(`Bookings (Rides): Total=${totalBookings}, Last 7d=${recent7dBookings}, Last 30d=${recent30dBookings}, Latest=${latestBooking?.createdAt?.toISOString() || 'NONE'}`);

    // Booking status distribution
    const bookingStatuses = await prisma.$queryRawUnsafe(`
      SELECT booking_status, count(*) as count 
      FROM bookings 
      GROUP BY booking_status;
    `);
    console.log('Ride Booking Statuses:', bookingStatuses);

    // Trips table
    const totalTrips = await prisma.trip.count();
    console.log(`Trips: Total=${totalTrips}`);

    // Inspect representative ride bookings
    const sampleBookings = await prisma.booking.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        passenger: { select: { id: true, fullName: true } },
        trip: { select: { id: true, tripStatus: true } },
        payment: { select: { id: true, paymentStatus: true, amount: true } },
      },
    });
    console.log('Sample Ride Bookings:');
    sampleBookings.forEach((b) => {
      console.log(`  ID: ${b.id} | Ref: ${b.bookingReference} | Passenger: ${b.passengerId} (${b.passenger?.fullName || 'ORPHAN'}) | Status: ${b.bookingStatus} | Fare: ${b.estimatedFare} ETB | Trip: ${b.trip?.tripStatus || 'none'} | Payment: ${b.payment?.paymentStatus || 'none'}`);
    });

    // 3. Hotel Bookings
    console.log('\n--- HOTELS (hotel_bookings) ---');
    if (existingTableNames.has('hotel_bookings')) {
      const totalHotelBookings = await prisma.hotelBooking.count();
      const recent7dHotels = await prisma.hotelBooking.count({ where: { createdAt: { gte: sevenDaysAgo } } });
      const recent30dHotels = await prisma.hotelBooking.count({ where: { createdAt: { gte: thirtyDaysAgo } } });
      const latestHotel = await prisma.hotelBooking.findFirst({ orderBy: { createdAt: 'desc' }, select: { createdAt: true } });
      console.log(`Hotel Bookings: Total=${totalHotelBookings}, Last 7d=${recent7dHotels}, Last 30d=${recent30dHotels}, Latest=${latestHotel?.createdAt?.toISOString() || 'NONE'}`);

      const hotelStatuses = await prisma.$queryRawUnsafe(`
        SELECT booking_status, payment_status, count(*) as count 
        FROM hotel_bookings 
        GROUP BY booking_status, payment_status;
      `);
      console.log('Hotel Booking Statuses:', hotelStatuses);

      const sampleHotels = await prisma.hotelBooking.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          passenger: { select: { id: true, fullName: true } },
          hotel: { select: { id: true, name: true } },
          bookingRooms: true,
          payment: { select: { id: true, paymentStatus: true } },
        },
      });
      console.log('Sample Hotel Bookings:');
      sampleHotels.forEach((h) => {
        console.log(`  ID: ${h.id} | Ref: ${h.bookingReference} | Hotel: ${h.hotel?.name || h.hotelId} | Passenger: ${h.passengerId} (${h.passenger?.fullName || 'ORPHAN'}) | Status: ${h.bookingStatus} | Total: ${h.grandTotal} ETB | Rooms: ${h.bookingRooms.length}`);
      });
    } else {
      console.log('⚠️ hotel_bookings table DOES NOT EXIST in database!');
    }

    // 4. Lounge Reservations
    console.log('\n--- LOUNGES (lounge_reservations) ---');
    if (existingTableNames.has('lounge_reservations')) {
      const totalLoungeRes = await prisma.loungeReservation.count();
      const recent7dLounge = await prisma.loungeReservation.count({ where: { createdAt: { gte: sevenDaysAgo } } });
      const recent30dLounge = await prisma.loungeReservation.count({ where: { createdAt: { gte: thirtyDaysAgo } } });
      const latestLounge = await prisma.loungeReservation.findFirst({ orderBy: { createdAt: 'desc' }, select: { createdAt: true } });
      console.log(`Lounge Reservations: Total=${totalLoungeRes}, Last 7d=${recent7dLounge}, Last 30d=${recent30dLounge}, Latest=${latestLounge?.createdAt?.toISOString() || 'NONE'}`);

      const loungeStatuses = await prisma.$queryRawUnsafe(`
        SELECT status, count(*) as count 
        FROM lounge_reservations 
        GROUP BY status;
      `);
      console.log('Lounge Reservation Statuses:', loungeStatuses);

      const sampleLounges = await prisma.loungeReservation.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          passenger: { select: { id: true, fullName: true } },
          lounge: { select: { id: true, name: true } },
        },
      });
      console.log('Sample Lounge Reservations:');
      sampleLounges.forEach((l) => {
        console.log(`  ID: ${l.id} | Ref: ${l.reservationReference} | Lounge: ${l.lounge?.name || l.loungeId} | Passenger: ${l.passengerId} (${l.passenger?.fullName || 'ORPHAN'}) | Status: ${l.status} | Guests: ${l.guestsCount}`);
      });
    } else {
      console.log('⚠️ lounge_reservations table DOES NOT EXIST in database!');
    }

    // 5. Heritage Tour Bookings
    console.log('\n--- HERITAGE TOURS (heritage_tour_bookings) ---');
    if (existingTableNames.has('heritage_tour_bookings')) {
      const totalHeritage = await prisma.heritageTourBooking.count();
      const recent7dHeritage = await prisma.heritageTourBooking.count({ where: { createdAt: { gte: sevenDaysAgo } } });
      const recent30dHeritage = await prisma.heritageTourBooking.count({ where: { createdAt: { gte: thirtyDaysAgo } } });
      const latestHeritage = await prisma.heritageTourBooking.findFirst({ orderBy: { createdAt: 'desc' }, select: { createdAt: true } });
      console.log(`Heritage Tour Bookings: Total=${totalHeritage}, Last 7d=${recent7dHeritage}, Last 30d=${recent30dHeritage}, Latest=${latestHeritage?.createdAt?.toISOString() || 'NONE'}`);

      const heritageStatuses = await prisma.$queryRawUnsafe(`
        SELECT booking_status, payment_status, count(*) as count 
        FROM heritage_tour_bookings 
        GROUP BY booking_status, payment_status;
      `);
      console.log('Heritage Tour Statuses:', heritageStatuses);

      const sampleHeritage = await prisma.heritageTourBooking.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          passenger: { select: { id: true, fullName: true } },
          package: { select: { id: true, name: true } },
          bookingSites: true,
          payment: { select: { id: true, paymentStatus: true } },
        },
      });
      console.log('Sample Heritage Tour Bookings:');
      sampleHeritage.forEach((ht) => {
        console.log(`  ID: ${ht.id} | Ref: ${ht.bookingReference} | Package: ${ht.package?.name || 'Custom'} | Passenger: ${ht.passengerId} (${ht.passenger?.fullName || 'ORPHAN'}) | Status: ${ht.bookingStatus} | Total: ${ht.totalAmount} ETB | Sites: ${ht.bookingSites.length}`);
      });
    } else {
      console.log('⚠️ heritage_tour_bookings table DOES NOT EXIST in database!');
    }

    // 6. Payments
    console.log('\n--- PAYMENTS (payments) ---');
    if (existingTableNames.has('payments')) {
      const totalPayments = await prisma.payment.count();
      console.log(`Payments: Total=${totalPayments}`);
      const paymentsByType = await prisma.$queryRawUnsafe(`
        SELECT payment_type, payment_status, count(*) as count 
        FROM payments 
        GROUP BY payment_type, payment_status;
      `);
      console.log('Payments By Type & Status:', paymentsByType);
    } else {
      console.log('⚠️ payments table DOES NOT EXIST in database!');
    }

    // 7. Check for Orphaned Records
    console.log('\n--- INTEGRITY CHECKS ---');
    if (existingTableNames.has('bookings')) {
      const orphanedRides = await prisma.$queryRawUnsafe(`
        SELECT count(*) as count FROM bookings b 
        LEFT JOIN passengers p ON b.passenger_id = p.id 
        WHERE p.id IS NULL;
      `);
      console.log(`Orphaned Rides (no passenger): ${orphanedRides[0]?.count || 0}`);
    }

    if (existingTableNames.has('hotel_bookings')) {
      const orphanedHotels = await prisma.$queryRawUnsafe(`
        SELECT count(*) as count FROM hotel_bookings h 
        LEFT JOIN passengers p ON h.passenger_id = p.id 
        WHERE p.id IS NULL;
      `);
      console.log(`Orphaned Hotels (no passenger): ${orphanedHotels[0]?.count || 0}`);
    }

    if (existingTableNames.has('lounge_reservations')) {
      const orphanedLounges = await prisma.$queryRawUnsafe(`
        SELECT count(*) as count FROM lounge_reservations l 
        LEFT JOIN passengers p ON l.passenger_id = p.id 
        WHERE p.id IS NULL;
      `);
      console.log(`Orphaned Lounges (no passenger): ${orphanedLounges[0]?.count || 0}`);
    }

    if (existingTableNames.has('heritage_tour_bookings')) {
      const orphanedHeritage = await prisma.$queryRawUnsafe(`
        SELECT count(*) as count FROM heritage_tour_bookings ht 
        LEFT JOIN passengers p ON ht.passenger_id = p.id 
        WHERE p.id IS NULL;
      `);
      console.log(`Orphaned Heritage Tours (no passenger): ${orphanedHeritage[0]?.count || 0}`);
    }

    console.log('\n================================================================');
    console.log('  AUDIT COMPLETE                                                ');
    console.log('================================================================');

  } catch (err) {
    console.error('Audit execution error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runAudit();
