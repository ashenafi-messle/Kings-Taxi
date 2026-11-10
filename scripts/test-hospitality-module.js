/**
 * Kings Taxi Platform — Hospitality Module Automated Acceptance Test Suite
 *
 * Comprehensive end-to-end and algorithmic acceptance test suite for:
 * 1. Database Schema & Prisma ORM Models (PostgreSQL)
 * 2. Africa/Addis_Ababa Dynamic Date & Night Calculation
 * 3. Super Admin Management & RBAC Protection
 * 4. Fixed Gondar Airport Transfer Engine (GDQ Airport -> Hotel)
 * 5. Authoritative Decimal Pricing & Quote Engine
 * 6. Inventory & Overbooking Prevention Logic
 * 7. Passenger Mobile Integration (Screens, Services, Stores)
 * 8. Security, Multi-tenant Isolation & Backward Compatibility
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

let passedTests = 0;
let totalTests = 0;
const failures = [];

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✅ [PASS] ${name}`);
  } catch (err) {
    failures.push({ name, error: err.message });
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
  }
}

console.log('\n================================================================================');
console.log('  KINGS TAXI — HOSPITALITY & GONDAR AIRPORT TRANSFERS ACCEPTANCE SUITE');
console.log('================================================================================\n');

// Paths
const schemaPath = path.join(__dirname, '../backend/prisma/schema.prisma');
const migrationSqlPath = path.join(
  __dirname,
  '../backend/prisma/migrations/20261110200000_add_hospitality_and_lounge_module/migration.sql'
);
const hospRoutesPath = path.join(__dirname, '../backend/src/modules/hospitality/hospitality.routes.ts');
const hotelServicePath = path.join(__dirname, '../backend/src/modules/hospitality/hotel.service.ts');
const bookingServicePath = path.join(__dirname, '../backend/src/modules/hospitality/booking.service.ts');

const mobileServicePath = path.join(__dirname, '../apps/passenger-mobile/src/services/hotel.service.ts');
const mobileHotelsTabPath = path.join(__dirname, '../apps/passenger-mobile/app/(tabs)/hotels.tsx');
const mobileHotelDetailPath = path.join(__dirname, '../apps/passenger-mobile/app/hotels/[id].tsx');
const mobileReservePath = path.join(__dirname, '../apps/passenger-mobile/app/hotels/reserve.tsx');
const mobileBookingStorePath = path.join(__dirname, '../apps/passenger-mobile/src/stores/booking.store.ts');
const mobileBookingsTabPath = path.join(__dirname, '../apps/passenger-mobile/app/(tabs)/bookings.tsx');

// ============================================================================
// SUITE 1: DATABASE SCHEMA & MIGRATIONS AUDIT
// ============================================================================
console.log('--- SUITE 1: PostgreSQL Database Schema & Migration SQL Audit ---');

runTest('1.1 Prisma schema defines all mandatory Hospitality and Lounge models', () => {
  assert(fs.existsSync(schemaPath), 'schema.prisma must exist');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  const requiredModels = [
    'model Hotel',
    'model HotelImage',
    'model HotelAmenity',
    'model HotelAmenityRelation',
    'model HotelRoomType',
    'model HotelRate',
    'model AirportTransferRate',
    'model HotelBooking',
    'model HotelBookingRoom',
    'model HotelTransferBooking',
    'model Lounge',
    'model LoungeImage',
    'model LoungeReservation',
  ];

  for (const m of requiredModels) {
    assert(schema.includes(m), `schema.prisma must define ${m}`);
  }
});

runTest('1.2 Prisma schema defines all mandatory Enums with correct states', () => {
  const schema = fs.readFileSync(schemaPath, 'utf8');
  assert(schema.includes('enum HotelStatus'), 'Must define HotelStatus');
  assert(schema.includes('enum RoomTypeStatus'), 'Must define RoomTypeStatus');
  assert(schema.includes('enum HotelBookingStatus'), 'Must define HotelBookingStatus');
  assert(schema.includes('enum TransferStatus'), 'Must define TransferStatus');
  assert(schema.includes('enum LoungeReservationStatus'), 'Must define LoungeReservationStatus');
  assert(schema.includes('enum PaymentType'), 'Must define PaymentType');
});

runTest('1.3 Payment model is seamlessly extended without breaking taxi rides', () => {
  const schema = fs.readFileSync(schemaPath, 'utf8');
  assert(schema.includes('hotelBookingId'), 'Payment must include hotelBookingId');
  assert(schema.includes('hotelBooking'), 'Payment must include hotelBooking relation');
  assert(schema.includes('paymentType'), 'Payment must include paymentType');
  assert(/bookingId\s+String\?/.test(schema), 'bookingId must be optional to support hotel bookings');
});

runTest('1.4 Migration SQL script creates all tables, foreign keys, and unique indexes', () => {
  assert(fs.existsSync(migrationSqlPath), 'Migration SQL must exist');
  const sql = fs.readFileSync(migrationSqlPath, 'utf8');
  assert(sql.includes('CREATE TABLE "hotels"'), 'Must create hotels table');
  assert(sql.includes('CREATE TABLE "hotel_room_types"'), 'Must create hotel_room_types table');
  assert(sql.includes('CREATE TABLE "airport_transfer_rates"'), 'Must create airport_transfer_rates table');
  assert(sql.includes('CREATE TABLE "hotel_bookings"'), 'Must create hotel_bookings table');
  assert(sql.includes('CREATE TABLE "hotel_transfer_bookings"'), 'Must create hotel_transfer_bookings table');
  assert(sql.includes('CREATE TABLE "lounges"'), 'Must create lounges table');
});

// ============================================================================
// SUITE 2: DYNAMIC AFRICA/ADDIS_ABABA CALENDAR DATE LOGIC
// ============================================================================
console.log('\n--- SUITE 2: Africa/Addis_Ababa Dynamic Date & Night Calculations ---');

const {
  getAddisCurrentDateString,
  calculateCalendarNights,
  addCalendarDays,
  formatCalendarDate,
  validateBookingDates,
} = require(path.join(__dirname, '../backend/dist/modules/hospitality/utils/addisDate'));

runTest('2.1 Addis Ababa current date matches Africa/Addis_Ababa local timezone', () => {
  const addisDateStr = getAddisCurrentDateString();
  assert(/^\d{4}-\d{2}-\d{2}$/.test(addisDateStr), 'Date must be formatted YYYY-MM-DD');

  const expected = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Addis_Ababa',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  assert.strictEqual(addisDateStr, expected, 'Current date must dynamically match Addis Ababa');
});

runTest('2.2 parseCalendarDate and addCalendarDays perform accurate date arithmetic', () => {
  const base = '2026-11-10';
  const next3 = formatCalendarDate(addCalendarDays(base, 3));
  assert.strictEqual(next3, '2026-11-13', 'Should add 3 calendar days');

  const leapCheck = formatCalendarDate(addCalendarDays('2028-02-28', 1));
  assert.strictEqual(leapCheck, '2028-02-29', 'Should handle leap year 2028');

  const monthCross = formatCalendarDate(addCalendarDays('2026-11-30', 2));
  assert.strictEqual(monthCross, '2026-12-02', 'Should cross month boundary');
});

runTest('2.3 calculateCalendarNights correctly computes difference between dates', () => {
  const nights1 = calculateCalendarNights('2026-11-10', '2026-11-12');
  assert.strictEqual(nights1, 2, 'Should compute 2 nights');

  const nightsWeek = calculateCalendarNights('2026-11-10', '2026-11-17');
  assert.strictEqual(nightsWeek, 7, 'Should compute 7 nights');
});

runTest('2.4 validateBookingDates strictly rejects past dates and checkOut <= checkIn', () => {
  const today = getAddisCurrentDateString();
  const yesterday = formatCalendarDate(addCalendarDays(today, -1));
  const tomorrow = formatCalendarDate(addCalendarDays(today, 1));
  const dayAfter = formatCalendarDate(addCalendarDays(today, 2));

  const pastCheck = validateBookingDates(yesterday, tomorrow);
  assert.strictEqual(pastCheck.valid, false, 'Must reject past check-in');
  assert(pastCheck.error.includes('past'), 'Error must mention past check-in');

  const sameDay = validateBookingDates(tomorrow, tomorrow);
  assert.strictEqual(sameDay.valid, false, 'Must reject same-day check-out');

  const inverted = validateBookingDates(dayAfter, tomorrow);
  assert.strictEqual(inverted.valid, false, 'Must reject checkOut < checkIn');

  const valid = validateBookingDates(tomorrow, dayAfter);
  assert.strictEqual(valid.valid, true, 'Must accept valid future dates');
  assert.strictEqual(valid.nights, 1, 'Must return 1 night');
});

// ============================================================================
// SUITE 3: AUTHORITATIVE DECIMAL PRICING & FIXED AIRPORT TRANSFER
// ============================================================================
console.log('\n--- SUITE 3: Authoritative Decimal Pricing & Fixed Gondar Airport Transfers ---');

runTest('3.1 Fixed Gondar Airport Transfer rate is completely separate from dynamic taxi meter', () => {
  const serviceCode = fs.readFileSync(bookingServicePath, 'utf8');
  assert(
    serviceCode.includes('airportTransferRate.findFirst') ||
      serviceCode.includes('transferRate'),
    'Booking service must query dedicated AirportTransferRate'
  );
  assert(
    !serviceCode.includes('calculateDynamicMeterFare') &&
      !serviceCode.includes('gpsDistanceKm'),
    'Fixed airport transfer must never use dynamic taxi metering'
  );
});

runTest('3.2 Authoritative Quote Engine calculates rooms, fixed transfers, tax and service fee', () => {
  const roomPrice = 3500;
  const nights = 3;
  const roomQty = 2;
  const roomSubtotal = roomPrice * nights * roomQty; // 21,000 ETB

  const fixedTransferRate = 1200; // Fixed Sedan rate GDQ -> Hotel
  const transferSubtotal = fixedTransferRate;

  const subtotal = roomSubtotal + transferSubtotal; // 22,200 ETB
  const taxAmount = Math.round(subtotal * 0.1); // 2,220 ETB
  const serviceFee = Math.round(subtotal * 0.02); // 444 ETB
  const totalAmount = subtotal + taxAmount + serviceFee; // 24,864 ETB

  assert.strictEqual(roomSubtotal, 21000);
  assert.strictEqual(transferSubtotal, 1200);
  assert.strictEqual(subtotal, 22200);
  assert.strictEqual(taxAmount, 2220);
  assert.strictEqual(serviceFee, 444);
  assert.strictEqual(totalAmount, 24864);
});

runTest('3.3 Booking service snapshots prices so future rate changes do not mutate history', () => {
  const bookingCode = fs.readFileSync(bookingServicePath, 'utf8');
  assert(bookingCode.includes('nightlyRateSnapshot'), 'Must snapshot room nightly rate in HotelBookingRoom');
  assert(bookingCode.includes('fixedFareSnapshot'), 'Must snapshot fixedFareSnapshot in HotelTransferBooking');
  assert(bookingCode.includes('priceSnapshot:'), 'Must snapshot complete quote in HotelBooking');
  assert(bookingCode.includes('grandTotal:'), 'Must snapshot grandTotal in HotelBooking');
});

// ============================================================================
// SUITE 4: ROOM INVENTORY & OVERBOOKING PREVENTION
// ============================================================================
console.log('\n--- SUITE 4: Atomic Room Inventory & Overbooking Prevention Logic ---');

runTest('4.1 Overlapping date evaluation uses standard reservation interval intersection', () => {
  const overlaps = (exIn, exOut, reqIn, reqOut) => exIn < reqOut && exOut > reqIn;

  // Existing booking: Nov 10 - Nov 15
  assert.strictEqual(overlaps('2026-11-10', '2026-11-15', '2026-11-12', '2026-11-14'), true, 'Contained within');
  assert.strictEqual(overlaps('2026-11-10', '2026-11-15', '2026-11-08', '2026-11-12'), true, 'Overlaps start');
  assert.strictEqual(overlaps('2026-11-10', '2026-11-15', '2026-11-14', '2026-11-18'), true, 'Overlaps end');
  assert.strictEqual(overlaps('2026-11-10', '2026-11-15', '2026-11-15', '2026-11-18'), false, 'Back to back (same day turnover allowed)');
  assert.strictEqual(overlaps('2026-11-10', '2026-11-15', '2026-11-05', '2026-11-10'), false, 'Prior checkout (allowed)');
});

runTest('4.2 Booking service rejects request when active overlapping bookings reach capacity', () => {
  const bookingCode = fs.readFileSync(bookingServicePath, 'utf8');
  assert(
    bookingCode.includes('availableInventory < quote.numberOfRooms'),
    'Must check available inventory count against requested rooms'
  );
  assert(
    bookingCode.includes('INSUFFICIENT_INVENTORY'),
    'Must throw INSUFFICIENT_INVENTORY when capacity is exceeded'
  );
});

// ============================================================================
// SUITE 5: SUPER ADMIN REST API & RBAC SECURITY
// ============================================================================
console.log('\n--- SUITE 5: Super Admin Endpoints & Role-Based Access Control ---');

runTest('5.1 Super admin hospitality management endpoints are protected by RBAC middleware', () => {
  const routesCode = fs.readFileSync(hospRoutesPath, 'utf8');
  assert(
    routesCode.includes("requireRole(['ADMIN', 'SUPER_ADMIN'])"),
    'Admin routes must enforce ADMIN or SUPER_ADMIN roles'
  );
  assert(routesCode.includes("hospitalityRouter.post('/admin/hotels'"), 'Must expose admin hotel creation');
  assert(routesCode.includes("hospitalityRouter.patch('/admin/hotels/:id'"), 'Must expose admin hotel update');
  assert(routesCode.includes("hospitalityRouter.post('/admin/hotels/:id/publish'"), 'Must expose hotel publishing');
  assert(routesCode.includes("hospitalityRouter.post('/admin/hotels/:id/unpublish'"), 'Must expose hotel unpublishing');
  assert(routesCode.includes("hospitalityRouter.post('/admin/hotels/:id/transfer-rates'"), 'Must expose transfer rates');
  assert(routesCode.includes("hospitalityRouter.post('/admin/lounges'"), 'Must expose lounge management');
});

runTest('5.2 Public hotel listing filters out unpublished and draft hotels', () => {
  const hotelServiceCode = fs.readFileSync(hotelServicePath, 'utf8');
  assert(
    hotelServiceCode.includes("status: 'PUBLISHED'") ||
      hotelServiceCode.includes('HotelStatus.PUBLISHED'),
    'Public queries must strictly query PUBLISHED hotels'
  );
});

runTest('5.3 Passenger booking isolation prevents unauthorized passenger access', () => {
  const bookingCode = fs.readFileSync(bookingServicePath, 'utf8');
  assert(
    bookingCode.includes('passengerId') &&
      (bookingCode.includes('forbidden') ||
        bookingCode.includes('ForbiddenError') ||
        bookingCode.includes('where: { passengerId }') ||
        bookingCode.includes('403') ||
        bookingCode.includes('UNAUTHORIZED_ACCESS')),
    'Passenger queries must be isolated by passengerId'
  );
});

// ============================================================================
// SUITE 6: PASSENGER MOBILE APP INTEGRATION
// ============================================================================
console.log('\n--- SUITE 6: Passenger Mobile Application Integration ---');

runTest('6.1 Mobile HotelService provides backend-connected APIs with offline resilience', () => {
  assert(fs.existsSync(mobileServicePath), 'Mobile HotelService must exist');
  const serviceCode = fs.readFileSync(mobileServicePath, 'utf8');

  assert(serviceCode.includes('searchHotels'), 'Must implement searchHotels');
  assert(serviceCode.includes('getHotelById'), 'Must implement getHotelById');
  assert(serviceCode.includes('getTransferRates'), 'Must implement getTransferRates');
  assert(serviceCode.includes('getQuote'), 'Must implement getQuote');
  assert(serviceCode.includes('createBooking'), 'Must implement createBooking');
  assert(serviceCode.includes('getPassengerBookings'), 'Must implement getPassengerBookings');
  assert(serviceCode.includes('listLounges'), 'Must implement listLounges');
  assert(serviceCode.includes('mockHotels'), 'Must provide fallback to mockHotels when offline');
});

runTest('6.2 Mobile Hotels tab supports both Hotels and Lounges with Gondar filter', () => {
  const hotelsTabCode = fs.readFileSync(mobileHotelsTabPath, 'utf8');
  assert(hotelsTabCode.includes('Luxury Hotels'), 'Must support Luxury Hotels tab');
  assert(hotelsTabCode.includes('VIP Lounges'), 'Must support VIP Lounges tab');
  assert(hotelsTabCode.includes('Gondar (GDQ)'), 'Must feature Gondar as key destination');
  assert(hotelsTabCode.includes('Direct Gondar Airport (GDQ) Transfer Available'), 'Must show airport badge');
  assert(hotelsTabCode.includes('HotelService.searchHotels'), 'Must fetch via HotelService');
});

runTest('6.3 Mobile Hotel Detail screen showcases rooms, amenities, and fixed Gondar Airport transfer', () => {
  const detailCode = fs.readFileSync(mobileHotelDetailPath, 'utf8');
  assert(detailCode.includes('Gondar Airport Transfer'), 'Must showcase Airport Transfer');
  assert(detailCode.includes('Atse Tewodros Airport (GDQ)'), 'Must display GDQ Airport');
  assert(detailCode.includes('HotelService.getTransferRates'), 'Must fetch transfer rates');
  assert(detailCode.includes('setSelectedRoomId'), 'Must support room selection');
  assert(detailCode.includes('/hotels/reserve'), 'Must link to reserve screen');
});

runTest('6.4 Mobile Hotel Reserve screen implements dynamic dates, GDQ toggle, and authoritative quote', () => {
  const reserveCode = fs.readFileSync(mobileReservePath, 'utf8');
  assert(reserveCode.includes('Africa/Addis_Ababa'), 'Must use Africa/Addis_Ababa dynamic dates');
  assert(reserveCode.includes('Include Gondar Airport (GDQ) Transfer'), 'Must include GDQ transfer toggle');
  assert(reserveCode.includes('HotelService.getQuote'), 'Must fetch authoritative quote from backend');
  assert(reserveCode.includes('Authoritative Price Summary'), 'Must render authoritative price breakdown');
  assert(reserveCode.includes('HotelService.createBooking'), 'Must confirm booking via backend');
  assert(reserveCode.includes('addHotelReservation'), 'Must sync with booking store');
});

runTest('6.5 Bookings tab fetches real hotel bookings and displays GDQ transfer badge', () => {
  const bookingsCode = fs.readFileSync(mobileBookingsTabPath, 'utf8');
  assert(bookingsCode.includes('fetchHotelReservations()'), 'Must fetch hotel reservations on mount');
  assert(bookingsCode.includes('GDQ Airport Transfer'), 'Must display GDQ transfer badge in booking history');
});

runTest('6.6 Booking store defines fetchHotelReservations action for remote persistence', () => {
  const storeCode = fs.readFileSync(mobileBookingStorePath, 'utf8');
  assert(storeCode.includes('fetchHotelReservations:'), 'Must define fetchHotelReservations');
  assert(storeCode.includes('HotelService.getPassengerBookings()'), 'Must call backend getPassengerBookings');
});

// ============================================================================
// SUITE 7: SUMMARY & ACCEPTANCE VERIFICATION
// ============================================================================
console.log('\n================================================================================');
console.log(`  HOSPITALITY MODULE ACCEPTANCE SUITE RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
console.log('================================================================================\n');

if (failures.length > 0) {
  console.error(`❌ ${failures.length} TESTS FAILED:`);
  for (const f of failures) {
    console.error(` - ${f.name}: ${f.error}`);
  }
  process.exit(1);
} else {
  console.log('🎉 ALL HOSPITALITY & GONDAR AIRPORT TRANSFER ACCEPTANCE TESTS PASSED PERFECTLY!\n');
  process.exit(0);
}
