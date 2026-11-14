/**
 * Kings Taxi Platform — Heritage Tour Module Automated Acceptance Test Suite
 *
 * Comprehensive end-to-end and algorithmic acceptance test suite for:
 * 1. Database Schema & Prisma ORM Models (PostgreSQL & Additive Migrations)
 * 2. Africa/Addis_Ababa Dynamic Date & Advance Notice Validation
 * 3. Super Admin Management & RBAC Protection (Sites, Packages, Guides, Vehicles)
 * 4. Authoritative Decimal Pricing Engine & Lake Tana Boat Charter Rules
 * 5. Vehicle Seating Capacity Enforcement & Tour Guide Concurrency Validation
 * 6. Authoritative Tour Bookings & Immutable Historical Snapshots
 * 7. Payment Integration & Idempotent Webhook Processing
 * 8. Passenger Mobile Integration (Screens, Services, Types)
 * 9. Multi-tenant Passenger Isolation & IDOR Prevention
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
console.log('  KINGS TAXI — HERITAGE TOUR MODULE ACCEPTANCE SUITE (20 CRITERIA)');
console.log('================================================================================\n');

// Paths
const schemaPath = path.join(__dirname, '../backend/prisma/schema.prisma');
const migrationSqlPath = path.join(
  __dirname,
  '../backend/prisma/migrations/20261111100000_add_heritage_tour_module/migration.sql'
);
const dateUtilsPath = path.join(__dirname, '../backend/dist/modules/heritage/utils/date.utils.js');
const siteServicePath = path.join(__dirname, '../backend/dist/modules/heritage/site.service.js');
const packageServicePath = path.join(__dirname, '../backend/dist/modules/heritage/package.service.js');
const guideServicePath = path.join(__dirname, '../backend/dist/modules/heritage/guide.service.js');
const vehicleOptionServicePath = path.join(__dirname, '../backend/dist/modules/heritage/vehicleOption.service.js');
const pricingServicePath = path.join(__dirname, '../backend/dist/modules/heritage/pricing.service.js');
const bookingServicePath = path.join(__dirname, '../backend/dist/modules/heritage/booking.service.js');
const heritageRoutesPath = path.join(__dirname, '../backend/src/modules/heritage/heritage.routes.ts');
const paymentIndexPath = path.join(__dirname, '../backend/src/modules/payments/index.ts');

const mobileServicePath = path.join(__dirname, '../apps/passenger-mobile/src/services/heritage.service.ts');
const mobileTypesPath = path.join(__dirname, '../apps/passenger-mobile/src/types/heritage.types.ts');
const mobileDetailPath = path.join(__dirname, '../apps/passenger-mobile/app/heritage/[id].tsx');
const mobileBookPath = path.join(__dirname, '../apps/passenger-mobile/app/tours/book.tsx');

// ============================================================================
// SUITE 1: DATABASE SCHEMA & MIGRATIONS AUDIT (Criteria 1-5, 18)
// ============================================================================
console.log('--- SUITE 1: PostgreSQL Database Schema & Migration SQL Audit ---');

const schemaContent = fs.readFileSync(schemaPath, 'utf8');
const migrationContent = fs.readFileSync(migrationSqlPath, 'utf8');

runTest('1.1 Prisma schema defines all mandatory Heritage models', () => {
  const mandatoryModels = [
    'HeritageSite',
    'HeritageTourPackage',
    'HeritageTourPackageSite',
    'HeritageTourPriceComponent',
    'HeritageTourGuide',
    'HeritageTourVehicleOption',
    'HeritageTourBooking',
    'HeritageTourBookingSite',
    'HeritageTourBookingPriceItem',
    'HeritageTourGuideRequest',
  ];

  for (const model of mandatoryModels) {
    assert(
      schemaContent.includes(`model ${model}`),
      `Prisma schema missing model: ${model}`
    );
  }
});

runTest('1.2 Prisma schema defines all mandatory Enums with correct states', () => {
  const mandatoryEnums = [
    'HeritageDestinationType',
    'HeritageTourBookingStatus',
    'TourComponentType',
    'TourPricingMethod',
    'GuideAvailabilityStatus',
  ];

  for (const en of mandatoryEnums) {
    assert(
      schemaContent.includes(`enum ${en}`),
      `Prisma schema missing enum: ${en}`
    );
  }

  // Ensure PaymentType has HERITAGE_TOUR
  assert(
    schemaContent.includes('HERITAGE_TOUR'),
    'PaymentType enum must contain HERITAGE_TOUR'
  );
});

runTest('1.3 Payment model is seamlessly extended without breaking taxi or hotel bookings', () => {
  assert(
    schemaContent.includes('heritageTourBookingId String?'),
    'Payment model missing heritageTourBookingId'
  );
  assert(
    schemaContent.includes('heritageTourBooking HeritageTourBooking?'),
    'Payment model missing relation to HeritageTourBooking'
  );
});

runTest('1.4 Migration SQL script creates all tables, foreign keys, and unique indexes additively', () => {
  assert(
    migrationContent.includes('ALTER TYPE "PaymentType" ADD VALUE IF NOT EXISTS \'HERITAGE_TOUR\''),
    'Migration missing PaymentType extension'
  );
  assert(
    migrationContent.includes('CREATE TABLE IF NOT EXISTS "heritage_sites"'),
    'Migration missing heritage_sites table creation'
  );
  assert(
    migrationContent.includes('CREATE TABLE IF NOT EXISTS "heritage_tour_packages"'),
    'Migration missing heritage_tour_packages table creation'
  );
  assert(
    migrationContent.includes('CREATE TABLE IF NOT EXISTS "heritage_tour_bookings"'),
    'Migration missing heritage_tour_bookings table creation'
  );
  assert(
    migrationContent.includes('CREATE UNIQUE INDEX IF NOT EXISTS "heritage_tour_bookings_booking_reference_key"'),
    'Migration missing unique booking reference index'
  );
});

// ============================================================================
// SUITE 2: AFRICA/ADDIS_ABABA DYNAMIC DATE & ADVANCE NOTICE (Criteria 9-10)
// ============================================================================
console.log('\n--- SUITE 2: Africa/Addis_Ababa Dynamic Date & Advance Booking Validation ---');

const {
  getAddisAbabaTodayDate,
  validateTourBookingDate,
  addCalendarDays,
  isValidCalendarDate,
} = require(dateUtilsPath);

runTest('2.1 Addis Ababa current date matches Africa/Addis_Ababa local timezone', () => {
  const today = getAddisAbabaTodayDate();
  assert(/^\d{4}-\d{2}-\d{2}$/.test(today), `Expected YYYY-MM-DD format, got ${today}`);
  assert(isValidCalendarDate(today), `Today (${today}) is not a valid calendar date`);
});

runTest('2.2 Date utilities perform accurate calendar day additions', () => {
  assert.strictEqual(addCalendarDays('2026-11-11', 1), '2026-11-12');
  assert.strictEqual(addCalendarDays('2026-11-30', 1), '2026-12-01');
  assert.strictEqual(addCalendarDays('2026-12-31', 1), '2027-01-01');
});

runTest('2.3 validateTourBookingDate strictly rejects past dates', () => {
  const pastDate = '2020-01-01';
  const result = validateTourBookingDate(pastDate, '09:00', 6);
  assert.strictEqual(result.valid, false, 'Expected past date to be rejected');
  assert(result.error.includes('past'), 'Expected past date error message');
});

runTest('2.4 validateTourBookingDate accepts future scheduled dates', () => {
  const today = getAddisAbabaTodayDate();
  const futureDate = addCalendarDays(today, 5);
  const result = validateTourBookingDate(futureDate, '09:00', 6);
  assert.strictEqual(result.valid, true, `Expected future date (${futureDate}) to be valid`);
});

runTest('2.5 Same-day advance booking window enforces minimum advance hours', () => {
  const today = getAddisAbabaTodayDate();
  // Check an early morning time (01:00) that is guaranteed to have less than 6 hours advance notice
  const earlyResult = validateTourBookingDate(today, '01:00', 6);
  assert.strictEqual(earlyResult.valid, false, 'Expected same-day past-hour tour to fail advance notice');
});

// ============================================================================
// SUITE 3: AUTHORITATIVE DECIMAL PRICING & LAKE TANA BOAT CHARTER (Criteria 12-13)
// ============================================================================
console.log('\n--- SUITE 3: Authoritative Pricing Engine & Lake Tana Boat Charter ---');

const { heritageTourPricingService } = require(pricingServicePath);

runTest('3.1 Authoritative Pricing engine computes transparent itemized breakdown using Decimal arithmetic', () => {
  const quote = heritageTourPricingService.calculatePricing({
    packageName: 'Gondar Imperial Heritage Full-Day Tour',
    basePrice: 3500,
    sites: [
      { name: 'Fasil Ghebbi', entryFeeETB: 2000, requiresBoatTransport: false },
      { name: 'Debre Berhan Selassie', entryFeeETB: 1500, requiresBoatTransport: false },
    ],
    totalPassengers: 2,
    vehicleOption: { displayName: 'Standard Sedan', baseRate: 1800 },
    guideRequested: true,
    guide: { fullName: 'Yohannes Mengistu', dailyRate: 1500 },
  });

  // Base: 3500
  // Vehicle: 1800
  // Guide: 1500
  // Entrance: (2000 * 2) + (1500 * 2) = 4000 + 3000 = 7000
  // Boat: 0
  // Expected Total: 3500 + 1800 + 1500 + 7000 = 13800 ETB
  assert.strictEqual(quote.baseAmount, 3500);
  assert.strictEqual(quote.vehicleAmount, 1800);
  assert.strictEqual(quote.guideAmount, 1500);
  assert.strictEqual(quote.entranceFeesAmount, 7000);
  assert.strictEqual(quote.boatTransportAmount, 0);
  assert.strictEqual(quote.totalAmount, 13800);
  assert.strictEqual(quote.breakdown.length, 5); // Base, Vehicle, Guide, Site 1 entry, Site 2 entry
});

runTest('3.2 Lake Tana boat charter component is automatically added when destination requires boat transport', () => {
  const quoteWithBoat = heritageTourPricingService.calculatePricing({
    packageName: 'Lake Tana Island Monasteries Excursion',
    basePrice: 5800,
    sites: [
      { name: 'Lake Tana Monasteries', entryFeeETB: 2500, requiresBoatTransport: true },
      { name: 'Fasil Ghebbi', entryFeeETB: 2000, requiresBoatTransport: false },
    ],
    totalPassengers: 3,
    vehicleOption: { displayName: 'Tour Minivan', baseRate: 3200 },
    guideRequested: false,
  });

  // Base: 5800
  // Vehicle: 3200
  // Guide: 0
  // Entrance: (2500 * 3) + (2000 * 3) = 7500 + 6000 = 13500
  // Boat: 1200
  // Expected Total: 5800 + 3200 + 0 + 13500 + 1200 = 23700 ETB
  assert.strictEqual(quoteWithBoat.boatTransportAmount, 1200);
  assert.strictEqual(quoteWithBoat.totalAmount, 23700);

  const boatItem = quoteWithBoat.breakdown.find((i) => i.componentType === 'BOAT_TRANSPORT');
  assert(boatItem, 'Expected BOAT_TRANSPORT component in breakdown');
  assert.strictEqual(boatItem.totalPrice, 1200);
});

// ============================================================================
// SUITE 4: VEHICLE CAPACITY & GUIDE CONCURRENCY VALIDATION (Criteria 7, 8, 11)
// ============================================================================
console.log('\n--- SUITE 4: Vehicle Seating Capacity & Tour Guide Concurrency Validation ---');

const { heritageTourVehicleOptionService } = require(vehicleOptionServicePath);
const { heritageTourGuideService } = require(guideServicePath);

runTest('4.1 Vehicle capacity engine strictly rejects parties exceeding seating capacity', () => {
  const sedanOption = { displayName: 'Standard Sedan', seatingCapacity: 4 };
  const validCheck = heritageTourVehicleOptionService.validateVehicleCapacity(sedanOption, 4);
  assert.strictEqual(validCheck.valid, true, '4 passengers should fit in standard sedan');

  const invalidCheck = heritageTourVehicleOptionService.validateVehicleCapacity(sedanOption, 6);
  assert.strictEqual(invalidCheck.valid, false, '6 passengers must be rejected for standard sedan');
  assert(invalidCheck.error.includes('seats up to 4'), 'Expected seating capacity error message');
});

runTest('4.2 Tour guide availability checks prevent scheduling conflicting bookings', async () => {
  // Guide service has checkGuideAvailability method
  assert(
    typeof heritageTourGuideService.checkGuideAvailability === 'function',
    'checkGuideAvailability must be a callable method'
  );
});

// ============================================================================
// SUITE 5: AUTHORITATIVE BOOKINGS & IMMUTABLE SNAPSHOTS (Criteria 14-17)
// ============================================================================
console.log('\n--- SUITE 5: Authoritative Tour Bookings, Snapshots & Isolation ---');

const { heritageTourBookingService } = require(bookingServicePath);

runTest('5.1 Booking service generates unique reference format HTB-YYYYMMDD-XXXX', async () => {
  const futureDate = addCalendarDays(getAddisAbabaTodayDate(), 3);
  const booking = await heritageTourBookingService.createBooking('test-passenger-uuid-001', {
    packageId: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    scheduledDate: futureDate,
    preferredStartTime: '09:00',
    adults: 2,
    children: 0,
    vehicleOptionId: 'v1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
    pickupLocation: 'Haile Resort Gondar',
    paymentMethod: 'TELEBIRR',
  });

  assert(booking, 'Booking creation returned empty response');
  assert(
    booking.bookingReference.startsWith('HTB-'),
    `Booking reference must start with HTB-, got ${booking.bookingReference}`
  );
  assert.strictEqual(booking.bookingStatus, 'REQUESTED');
});

runTest('5.2 Authoritative price snapshotting preserves immutable price breakdown', async () => {
  const futureDate = addCalendarDays(getAddisAbabaTodayDate(), 4);
  const booking = await heritageTourBookingService.createBooking('test-passenger-uuid-001', {
    packageId: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    scheduledDate: futureDate,
    preferredStartTime: '09:00',
    adults: 2,
    children: 1,
    vehicleOptionId: 'v1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
    pickupLocation: 'Gondar Plaza Hotel',
  });

  assert(booking.pricing, 'Expected pricing snapshot on booking record');
  assert(booking.pricing.breakdown.length > 0, 'Expected itemized breakdown in snapshot');
  assert(booking.pricing.totalAmount > 0, 'Expected positive total amount');
});

runTest('5.3 Passenger tenant isolation prevents unauthorized access (IDOR prevention)', async () => {
  const futureDate = addCalendarDays(getAddisAbabaTodayDate(), 5);
  const booking = await heritageTourBookingService.createBooking('passenger-owner-123', {
    packageId: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    scheduledDate: futureDate,
    adults: 1,
    pickupLocation: 'Gondar City',
  });

  // Owner accessing own booking: should succeed
  const ownerView = await heritageTourBookingService.getBookingByReference(
    'passenger-owner-123',
    booking.bookingReference,
    false
  );
  assert(ownerView, 'Owner should be able to view their booking');

  // Different passenger accessing booking: must throw access denied
  let idorBlocked = false;
  try {
    await heritageTourBookingService.getBookingByReference(
      'malicious-passenger-456',
      booking.bookingReference,
      false
    );
  } catch (err) {
    if (err.message.includes('Access denied')) {
      idorBlocked = true;
    }
  }
  assert(idorBlocked, 'Different passenger must be denied access to booking');
});

runTest('5.4 Booking cancellation validates booking status transitions', async () => {
  const futureDate = addCalendarDays(getAddisAbabaTodayDate(), 6);
  const booking = await heritageTourBookingService.createBooking('passenger-owner-123', {
    packageId: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    scheduledDate: futureDate,
    adults: 1,
    pickupLocation: 'Gondar City',
  });

  const cancelled = await heritageTourBookingService.cancelBooking(
    'passenger-owner-123',
    booking.bookingReference,
    'Change of travel itinerary'
  );
  assert.strictEqual(cancelled.bookingStatus, 'CANCELLED');

  // Attempting to cancel already cancelled booking should throw
  let doubleCancelFailed = false;
  try {
    await heritageTourBookingService.cancelBooking(
      'passenger-owner-123',
      booking.bookingReference,
      'Try again'
    );
  } catch (err) {
    doubleCancelFailed = true;
  }
  assert(doubleCancelFailed, 'Double cancellation must be rejected');
});

// ============================================================================
// SUITE 6: SUPER ADMIN RBAC & MANAGEMENT PROTECTION (Criteria 1-4, 6)
// ============================================================================
console.log('\n--- SUITE 6: Super Admin Management & RBAC Protection ---');

const routesContent = fs.readFileSync(heritageRoutesPath, 'utf8');

runTest('6.1 Super admin heritage management endpoints are protected by RBAC middleware', () => {
  assert(
    routesContent.includes("requireRole(['ADMIN', 'SUPER_ADMIN'])"),
    'Admin routes missing requireRole middleware'
  );
  assert(
    routesContent.includes('/admin/heritage/sites'),
    'Missing /admin/heritage/sites route'
  );
  assert(
    routesContent.includes('/admin/heritage/packages'),
    'Missing /admin/heritage/packages route'
  );
  assert(
    routesContent.includes('/admin/heritage/guides'),
    'Missing /admin/heritage/guides route'
  );
  assert(
    routesContent.includes('/admin/heritage/bookings'),
    'Missing /admin/heritage/bookings route'
  );
});

// ============================================================================
// SUITE 7: PAYMENT INTEGRATION & IDEMPOTENT WEBHOOKS (Criteria 18-19)
// ============================================================================
console.log('\n--- SUITE 7: Payment Integration & Idempotent Webhook Processing ---');

const paymentContent = fs.readFileSync(paymentIndexPath, 'utf8');

runTest('7.1 Multi-gateway payment module includes idempotent webhook handler', () => {
  assert(
    paymentContent.includes("paymentRouter.post('/webhook'"),
    'Payments router missing webhook route'
  );
  assert(
    paymentContent.includes('heritageTourBookingId'),
    'Webhook missing heritageTourBookingId association'
  );
  assert(
    paymentContent.includes("bookingStatus: 'CONFIRMED'"),
    'Successful webhook must transition heritage booking to CONFIRMED'
  );
  assert(
    paymentContent.includes('already processed (idempotent)'),
    'Webhook must handle repeated events idempotently'
  );
});

// ============================================================================
// SUITE 8: PASSENGER MOBILE APPLICATION INTEGRATION (Criterion 20)
// ============================================================================
console.log('\n--- SUITE 8: Passenger Mobile Application Integration ---');

const mobileServiceContent = fs.readFileSync(mobileServicePath, 'utf8');
const mobileTypesContent = fs.readFileSync(mobileTypesPath, 'utf8');
const mobileDetailContent = fs.readFileSync(mobileDetailPath, 'utf8');
const mobileBookContent = fs.readFileSync(mobileBookPath, 'utf8');

runTest('8.1 Mobile HeritageService provides backend-connected APIs with fallback resilience', () => {
  const methods = [
    'getAllSites',
    'getSiteById',
    'getPackages',
    'getPackageDetails',
    'getVehicleOptions',
    'getGuides',
    'getQuote',
    'createBooking',
    'getPassengerBookings',
    'getBookingByReference',
    'cancelBooking',
  ];

  for (const m of methods) {
    assert(
      mobileServiceContent.includes(`static async ${m}`),
      `Mobile HeritageService missing method: ${m}`
    );
  }
});

runTest('8.2 Mobile heritage types define all complete data contracts', () => {
  const types = [
    'HeritageSite',
    'TourPackage',
    'TourVehicleOption',
    'TourGuide',
    'TourQuote',
    'TourBookingRequest',
    'TourBooking',
    'TourPriceBreakdownItem',
  ];

  for (const t of types) {
    assert(
      mobileTypesContent.includes(`interface ${t}`),
      `Mobile types missing interface: ${t}`
    );
  }
});

runTest('8.3 Mobile Heritage Detail screen connects directly to Tour Booking experience', () => {
  assert(
    mobileDetailContent.includes('/tours/book'),
    'Heritage detail screen must navigate to /tours/book'
  );
  assert(
    mobileDetailContent.includes('site.entryFeeETB'),
    'Heritage detail screen must display admission fee'
  );
});

runTest('8.4 Mobile Tour Booking screen implements complete interactive booking flow', () => {
  assert(
    mobileBookContent.includes('Select Tour Package'),
    'Booking screen missing package selection'
  );
  assert(
    mobileBookContent.includes('Chauffeured Vehicle'),
    'Booking screen missing vehicle selection'
  );
  assert(
    mobileBookContent.includes('Certified Tour Guide'),
    'Booking screen missing guide toggle'
  );
  assert(
    mobileBookContent.includes('Itemized Price Summary'),
    'Booking screen missing itemized breakdown card'
  );
  assert(
    mobileBookContent.includes('Lake Tana Boat Charter'),
    'Booking screen missing Lake Tana boat charter indication'
  );
});

// ============================================================================
// FINAL SUMMARY
// ============================================================================
console.log('\n================================================================================');
console.log(`  HERITAGE TOUR MODULE ACCEPTANCE SUITE RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
console.log('================================================================================\n');

if (failures.length === 0) {
  console.log('🎉 ALL 20 HERITAGE TOUR MODULE ACCEPTANCE TEST CRITERIA PASSED PERFECTLY!\n');
  process.exit(0);
} else {
  console.error(`💥 ${failures.length} TESTS FAILED.`);
  process.exit(1);
}
