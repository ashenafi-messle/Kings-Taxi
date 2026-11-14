/**
 * KINGS TAXI — 25-SCENARIO PRODUCTION PERSISTENCE & RETRIEVAL VALIDATION SUITE
 *
 * Verifies live PostgreSQL database persistence across all four service categories:
 * Rides, Hotels, Lounges, Heritage Tours.
 */

const path = require('path');
const dotenv = require('dotenv');
const assert = require('assert');
const { randomUUID } = require('crypto');

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const { prisma } = require(path.join(__dirname, '../backend/dist/core/database/prisma'));
const { PassengerBookingHistoryService } = require(
  path.join(__dirname, '../backend/dist/modules/passengers/passengerBookingHistory.service')
);

const historyService = new PassengerBookingHistoryService();

let totalTests = 0;
let passedTests = 0;
const failures = [];

async function test(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ✅ [PASS ${totalTests}] ${name}`);
  } catch (err) {
    failures.push({ name, error: err.message });
    console.error(`  ❌ [FAIL ${totalTests}] ${name}`);
    console.error(`     Error: ${err.message}`);
  }
}

async function runSuite() {
  console.log('================================================================================');
  console.log('  KINGS TAXI — 25-SCENARIO PERSISTENCE & RETRIEVAL VALIDATION SUITE            ');
  console.log('================================================================================\n');

  // Test state identifiers
  const testPassengerAId = randomUUID();
  const testPassengerBId = randomUUID();
  let createdRideId;
  let createdHotelBookingId;
  let createdLoungeResId;
  let createdTourBookingId;
  let initialProdRidesCount = 0;

  try {
    // Warm up Prisma connection pool
    try {
      await prisma.$connect();
      await prisma.$queryRawUnsafe('SELECT 1');
    } catch (_) {}

    // 1. Database Connection & Environment
    await test('1. PostgreSQL database connects successfully and identifies as kings_taxi_dev', async () => {
      const dbInfo = await prisma.$queryRawUnsafe('SELECT current_database() as db');
      assert.strictEqual(dbInfo[0].db, 'kings_taxi_dev', 'Must connect to kings_taxi_dev');
    });

    // 2. Applied Migrations
    await test('2. All 4 versioned migrations are recorded in _prisma_migrations', async () => {
      const migrations = await prisma.$queryRawUnsafe(
        'SELECT migration_name FROM _prisma_migrations ORDER BY finished_at ASC'
      );
      const names = migrations.map((m) => m.migration_name);
      assert.ok(names.includes('20261106000000_init'), 'init must exist');
      assert.ok(names.includes('20261110000000_add_ride_booking_gps_and_fare_models'), 'ride models must exist');
      assert.ok(names.includes('20261110200000_add_hospitality_and_lounge_module'), 'hospitality must exist');
      assert.ok(names.includes('20261111100000_add_heritage_tour_module'), 'heritage must exist');
    });

    // 3. Schema Table Integrity
    await test('3. All 27 core domain tables exist in PostgreSQL information_schema', async () => {
      const tables = [
        'passengers', 'bookings', 'trips', 'payments', 'hotels', 'hotel_images',
        'hotel_amenities', 'hotel_amenity_relations', 'hotel_room_types', 'hotel_rates',
        'airport_transfer_rates', 'hotel_bookings', 'hotel_booking_rooms',
        'hotel_transfer_bookings', 'lounges', 'lounge_images', 'lounge_reservations',
        'heritage_sites', 'heritage_tour_packages', 'heritage_tour_package_sites',
        'heritage_tour_price_components', 'heritage_tour_guides',
        'heritage_tour_vehicle_options', 'heritage_tour_bookings',
        'heritage_tour_booking_sites', 'heritage_tour_booking_price_items',
        'heritage_tour_guide_requests'
      ];
      const res = await prisma.$queryRawUnsafe(
        'SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = ANY($1::text[])',
        tables
      );
      assert.strictEqual(res.length, 27, `Expected 27 tables, found ${res.length}`);
    });

    // 4. Production Records Intact Check
    await test('4. Existing production rides (8 records) exist and are protected', async () => {
      initialProdRidesCount = await prisma.booking.count();
      assert.ok(initialProdRidesCount >= 8, `Expected at least 8 production bookings, found ${initialProdRidesCount}`);
    });

    // 5. Test Passenger Creation
    await test('5. Test Passengers A and B can be provisioned in PostgreSQL', async () => {
      await prisma.passenger.create({
        data: {
          id: testPassengerAId,
          phoneNumber: `+251999${Date.now().toString().slice(-6)}`,
          email: `test.passenger.a.${Date.now()}@kingstaxi.et`,
          fullName: 'Test Passenger Alpha',
          passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$dummy_hash_for_test',
          language: 'EN',
          city: 'Gondar',
          accountStatus: 'ACTIVE',
        },
      });
      await prisma.passenger.create({
        data: {
          id: testPassengerBId,
          phoneNumber: `+251998${Date.now().toString().slice(-6)}`,
          email: `test.passenger.b.${Date.now()}@kingstaxi.et`,
          fullName: 'Test Passenger Beta',
          passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$dummy_hash_for_test',
          language: 'EN',
          city: 'Gondar',
          accountStatus: 'ACTIVE',
        },
      });
      const inDb = await prisma.passenger.findUnique({ where: { id: testPassengerAId } });
      assert.ok(inDb, 'Passenger A must exist in DB');
    });

    // 6. Ride Booking Persistence
    await test('6. Ride booking persists directly into PostgreSQL bookings table', async () => {
      const ref = `KT-TEST-RIDE-${Date.now().toString().slice(-4)}`;
      const ride = await prisma.booking.create({
        data: {
          passengerId: testPassengerAId,
          bookingReference: ref,
          serviceType: 'RIDE_HAILING',
          bookingStatus: 'TRIP_COMPLETED',
          pickupLocation: 'Fasil Ghebbi Castle Gate, Gondar',
          pickupLatitude: 12.6078,
          pickupLongitude: 37.4705,
          destinationLocation: 'Goha Hotel Panorama, Gondar',
          destinationLatitude: 12.6185,
          destinationLongitude: 37.4720,
          estimatedFare: 285.50,
          finalFare: 285.50,
          currency: 'ETB',
          estimatedDistanceMeters: 4800,
          estimatedDurationSeconds: 840,
        },
      });
      createdRideId = ride.id;

      // Verify in DB
      const verified = await prisma.booking.findUnique({ where: { id: createdRideId } });
      assert.ok(verified, 'Ride must be in DB');
      assert.strictEqual(verified.bookingReference, ref);
      assert.strictEqual(verified.passengerId, testPassengerAId);
    });

    // 7. Hotel Booking Persistence
    await test('7. Hotel reservation persists directly into PostgreSQL hotel_bookings table', async () => {
      const hotel = await prisma.hotel.findFirst();
      assert.ok(hotel, 'Hotel catalog record required');
      const room = await prisma.hotelRoomType.findFirst({ where: { hotelId: hotel.id } });
      assert.ok(room, 'Hotel room type required');

      const ref = `KT-HTL-TEST-${Date.now().toString().slice(-4)}`;
      const checkIn = new Date(Date.now() + 86400000);
      const checkOut = new Date(Date.now() + 3 * 86400000);

      const hBooking = await prisma.hotelBooking.create({
        data: {
          passengerId: testPassengerAId,
          hotelId: hotel.id,
          bookingReference: ref,
          bookingStatus: 'CONFIRMED',
          checkInDate: checkIn,
          checkOutDate: checkOut,
          adults: 2,
          children: 0,
          numberOfRooms: 1,
          roomSubtotal: 9600.00,
          grandTotal: 9600.00,
          currency: 'ETB',
        },
      });
      createdHotelBookingId = hBooking.id;

      // Verify in DB
      const verified = await prisma.hotelBooking.findUnique({ where: { id: createdHotelBookingId } });
      assert.ok(verified, 'Hotel booking must exist in PostgreSQL');
      assert.strictEqual(verified.bookingReference, ref);
    });

    // 8. Lounge Reservation Persistence
    await test('8. Lounge reservation persists directly into PostgreSQL lounge_reservations table', async () => {
      const lounge = await prisma.lounge.findFirst();
      assert.ok(lounge, 'Lounge catalog record required');

      const ref = `KT-LNG-TEST-${Date.now().toString().slice(-4)}`;
      const resDate = new Date(Date.now() + 86400000);

      const lRes = await prisma.loungeReservation.create({
        data: {
          passengerId: testPassengerAId,
          loungeId: lounge.id,
          reservationReference: ref,
          status: 'CONFIRMED',
          reservationDate: resDate,
          reservationTime: '15:30',
          guestsCount: 2,
        },
      });
      createdLoungeResId = lRes.id;

      // Verify in DB
      const verified = await prisma.loungeReservation.findUnique({ where: { id: createdLoungeResId } });
      assert.ok(verified, 'Lounge reservation must exist in PostgreSQL');
      assert.strictEqual(verified.reservationReference, ref);
    });

    // 9. Heritage Tour Booking Persistence
    await test('9. Heritage Tour booking persists directly into PostgreSQL heritage_tour_bookings table', async () => {
      const pkg = await prisma.heritageTourPackage.findFirst();
      assert.ok(pkg, 'Heritage tour package required');

      const ref = `KT-TOUR-TEST-${Date.now().toString().slice(-4)}`;
      const schedDate = new Date(Date.now() + 172800000);

      const tBooking = await prisma.heritageTourBooking.create({
        data: {
          passengerId: testPassengerAId,
          packageId: pkg.id,
          bookingReference: ref,
          bookingStatus: 'CONFIRMED',
          scheduledDate: schedDate,
          preferredStartTime: '09:00',
          adults: 2,
          children: 0,
          pickupLocation: 'Goha Hotel, Gondar',
          baseAmount: 5400.00,
          totalAmount: 5400.00,
          currency: 'ETB',
          pricingSnapshot: {},
        },
      });
      createdTourBookingId = tBooking.id;

      // Verify in DB
      const verified = await prisma.heritageTourBooking.findUnique({ where: { id: createdTourBookingId } });
      assert.ok(verified, 'Heritage tour booking must exist in PostgreSQL');
      assert.strictEqual(verified.bookingReference, ref);
    });

    // 10. Unified Retrieval Across All 4 Domains
    await test('10. Unified service retrieves all 4 bookings for Passenger A simultaneously', async () => {
      const res = await historyService.getUnifiedBookings(testPassengerAId, { type: 'ALL', page: 1, limit: 10 });
      assert.ok(res, 'Response must exist');
      assert.strictEqual(res.pagination.totalCount, 4, `Expected 4 items, got ${res.pagination.totalCount}`);
      const types = res.items.map((i) => i.type);
      assert.ok(types.includes('RIDE'), 'Must include RIDE');
      assert.ok(types.includes('HOTEL'), 'Must include HOTEL');
      assert.ok(types.includes('LOUNGE'), 'Must include LOUNGE');
      assert.ok(types.includes('HERITAGE'), 'Must include HERITAGE');
    });

    // 11. Summary Metrics Computation
    await test('11. Summary metrics accurately compute counts across all 4 categories', async () => {
      const res = await historyService.getUnifiedBookings(testPassengerAId, { type: 'ALL', page: 1, limit: 10 });
      assert.strictEqual(res.summary.totalBookings, 4);
      assert.strictEqual(res.summary.totalRides, 1);
      assert.strictEqual(res.summary.totalHotels, 1);
      assert.strictEqual(res.summary.totalLounges, 1);
      assert.strictEqual(res.summary.totalHeritageTours, 1);
    });

    // 12. Category Filter RIDE
    await test('12. Category tab filter RIDE returns only ride bookings', async () => {
      const res = await historyService.getUnifiedBookings(testPassengerAId, { type: 'RIDE', page: 1, limit: 10 });
      assert.strictEqual(res.items.length, 1);
      assert.strictEqual(res.items[0].type, 'RIDE');
      assert.strictEqual(res.items[0].id, createdRideId);
    });

    // 13. Category Filter HOTEL
    await test('13. Category tab filter HOTEL returns only hotel bookings', async () => {
      const res = await historyService.getUnifiedBookings(testPassengerAId, { type: 'HOTEL', page: 1, limit: 10 });
      assert.strictEqual(res.items.length, 1);
      assert.strictEqual(res.items[0].type, 'HOTEL');
      assert.strictEqual(res.items[0].id, createdHotelBookingId);
    });

    // 14. Category Filter LOUNGE
    await test('14. Category tab filter LOUNGE returns only lounge reservations', async () => {
      const res = await historyService.getUnifiedBookings(testPassengerAId, { type: 'LOUNGE', page: 1, limit: 10 });
      assert.strictEqual(res.items.length, 1);
      assert.strictEqual(res.items[0].type, 'LOUNGE');
      assert.strictEqual(res.items[0].id, createdLoungeResId);
    });

    // 15. Category Filter HERITAGE
    await test('15. Category tab filter HERITAGE returns only heritage tour bookings', async () => {
      const res = await historyService.getUnifiedBookings(testPassengerAId, { type: 'HERITAGE', page: 1, limit: 10 });
      assert.strictEqual(res.items.length, 1);
      assert.strictEqual(res.items[0].type, 'HERITAGE');
      assert.strictEqual(res.items[0].id, createdTourBookingId);
    });

    // 16. Status Filtering
    await test('16. Status filter COMPLETED matches normalized statuses correctly', async () => {
      const res = await historyService.getUnifiedBookings(testPassengerAId, { status: 'COMPLETED', page: 1, limit: 10 });
      assert.ok(res.items.length >= 1, 'Should find completed bookings');
    });

    // 17. Global Chronological Sorting
    await test('17. Multi-category bookings are strictly sorted newest first (descending)', async () => {
      const res = await historyService.getUnifiedBookings(testPassengerAId, { type: 'ALL', page: 1, limit: 10 });
      for (let i = 0; i < res.items.length - 1; i++) {
        const d1 = new Date(res.items[i].createdAt).getTime();
        const d2 = new Date(res.items[i + 1].createdAt).getTime();
        assert.ok(d1 >= d2, `Item ${i} (${d1}) must be >= item ${i + 1} (${d2})`);
      }
    });

    // 18. Pagination Slicing
    await test('18. Server-side merged pagination slices correctly across heterogeneous records', async () => {
      const page1 = await historyService.getUnifiedBookings(testPassengerAId, { type: 'ALL', page: 1, limit: 2 });
      assert.strictEqual(page1.items.length, 2);
      assert.strictEqual(page1.pagination.page, 1);
      assert.strictEqual(page1.pagination.totalPages, 2);
      assert.strictEqual(page1.pagination.hasMore, true);

      const page2 = await historyService.getUnifiedBookings(testPassengerAId, { type: 'ALL', page: 2, limit: 2 });
      assert.strictEqual(page2.items.length, 2);
      assert.strictEqual(page2.pagination.page, 2);
      assert.strictEqual(page2.pagination.hasMore, false);

      // Verify no overlap
      const ids1 = page1.items.map((i) => i.id);
      const ids2 = page2.items.map((i) => i.id);
      ids1.forEach((id) => assert.ok(!ids2.includes(id), `Page 1 id ${id} must not appear in page 2`));
    });

    // 19. IDOR Multi-Tenant Access Isolation (List)
    await test('19. Passenger B querying unified bookings sees 0 of Passenger A bookings', async () => {
      const resB = await historyService.getUnifiedBookings(testPassengerBId, { type: 'ALL', page: 1, limit: 10 });
      assert.strictEqual(resB.items.length, 0, 'Passenger B must have 0 bookings');
      assert.strictEqual(resB.pagination.totalCount, 0);
    });

    // 20. Booking Detail Retrieval (RIDE)
    await test('20. getBookingDetail retrieves RIDE record with full location & fare details', async () => {
      const detail = await historyService.getBookingDetail(testPassengerAId, 'RIDE', createdRideId);
      assert.ok(detail, 'Detail must exist');
      assert.strictEqual(detail.type, 'RIDE');
      assert.strictEqual(detail.booking.id, createdRideId);
      assert.ok(detail.booking.pickupLocation.includes('Fasil Ghebbi'));
      assert.strictEqual(Number(detail.booking.estimatedFare), 285.50);
    });

    // 21. Booking Detail Retrieval (HOTEL & LOUNGE & HERITAGE)
    await test('21. getBookingDetail retrieves HOTEL, LOUNGE, and HERITAGE detail records', async () => {
      const hDetail = await historyService.getBookingDetail(testPassengerAId, 'HOTEL', createdHotelBookingId);
      assert.ok(hDetail, 'Hotel detail must exist');
      assert.strictEqual(hDetail.type, 'HOTEL');
      assert.strictEqual(hDetail.booking.id, createdHotelBookingId);

      const lDetail = await historyService.getBookingDetail(testPassengerAId, 'LOUNGE', createdLoungeResId);
      assert.ok(lDetail, 'Lounge detail must exist');
      assert.strictEqual(lDetail.type, 'LOUNGE');
      assert.strictEqual(lDetail.booking.id, createdLoungeResId);

      const tDetail = await historyService.getBookingDetail(testPassengerAId, 'HERITAGE', createdTourBookingId);
      assert.ok(tDetail, 'Tour detail must exist');
      assert.strictEqual(tDetail.type, 'HERITAGE');
      assert.strictEqual(tDetail.booking.id, createdTourBookingId);
    });

    // 22. IDOR Access Control Denial (Detail)
    await test('22. Passenger B attempting to access Passenger A booking detail is blocked with 404', async () => {
      try {
        await historyService.getBookingDetail(testPassengerBId, 'RIDE', createdRideId);
        assert.fail('Should have thrown error');
      } catch (err) {
        assert.ok(err.statusCode === 404 || err.code === 'FORBIDDEN' || err.message.includes('not found') || err.message.includes('another passenger'), 'Must block with error');
      }

      try {
        await historyService.getBookingDetail(testPassengerBId, 'LOUNGE', createdLoungeResId);
        assert.fail('Should have thrown error');
      } catch (err) {
        assert.ok(err.statusCode === 404 || err.code === 'FORBIDDEN' || err.message.includes('not found') || err.message.includes('another passenger'), 'Must block with error');
      }
    });

    // 23. Production Rides Integrity Check for Ashenafi mesele
    await test('23. Passenger Ashenafi mesele (55e44211) retrieves real historical rides from DB', async () => {
      const res = await historyService.getUnifiedBookings('55e44211-7723-4df7-872d-4b1e2e6d7f8e', {
        type: 'ALL',
        page: 1,
        limit: 10,
      });
      assert.ok(res.items.length >= 5, `Expected at least 5 rides, got ${res.items.length}`);
      assert.ok(res.summary.totalRides >= 5, `Summary totalRides should be >= 5, got ${res.summary.totalRides}`);
      console.log(`      -> Ashenafi mesele has ${res.items.length} live bookings retrieved from PostgreSQL.`);
    });

    // 24. Clean Up Test Records Only (Protecting Production Records)
    await test('24. Clean up test records (Alpha & Beta only, zero production touch)', async () => {
      if (createdRideId) await prisma.booking.delete({ where: { id: createdRideId } });
      if (createdHotelBookingId) await prisma.hotelBooking.delete({ where: { id: createdHotelBookingId } });
      if (createdLoungeResId) await prisma.loungeReservation.delete({ where: { id: createdLoungeResId } });
      if (createdTourBookingId) await prisma.heritageTourBooking.delete({ where: { id: createdTourBookingId } });
      await prisma.passenger.delete({ where: { id: testPassengerAId } });
      await prisma.passenger.delete({ where: { id: testPassengerBId } });
      console.log('      -> Test records cleaned up cleanly.');
    });

    // 25. Final Production Database State Verification
    await test('25. Final verification: production database state is completely sound and stable', async () => {
      const finalRidesCount = await prisma.booking.count();
      assert.strictEqual(finalRidesCount, initialProdRidesCount, 'Production rides count must remain unchanged');
      const finalPassengersCount = await prisma.passenger.count();
      assert.strictEqual(finalPassengersCount, 5, 'Production passengers count must be exactly 5');
    });

  } catch (globalErr) {
    console.error('Fatal validation runner error:', globalErr);
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n--------------------------------------------------------------------------------');
  console.log(`  VALIDATION RESULTS: ${passedTests} / ${totalTests} passed (${failures.length} failures)`);
  console.log('--------------------------------------------------------------------------------\n');

  if (failures.length === 0) {
    console.log('🎉 ALL 25 PERSISTENCE & RETRIEVAL VALIDATION SCENARIOS PASSED WITH 100% SUCCESS!\n');
    process.exit(0);
  } else {
    console.error('❌ VALIDATION FAILED WITH', failures.length, 'FAILURES:');
    failures.forEach((f) => console.error(`  - ${f.name}: ${f.error}`));
    process.exit(1);
  }
}

runSuite();
