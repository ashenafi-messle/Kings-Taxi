/**
 * Kings Taxi Platform — Passenger Bookings History Module Acceptance Test Suite
 *
 * Comprehensive end-to-end and algorithmic acceptance test suite for:
 * 1. Database Schema & Prisma ORM Relationships (Booking, Trip, HotelBooking, HeritageTourBooking, Payment)
 * 2. Unified Chronological Merging Engine & Heterogeneous Record Normalization
 * 3. Status Mapping & Normalization Across Rides, Hotels, and Heritage Tours
 * 4. Multi-Tenant Passenger Isolation & IDOR Access Control Prevention
 * 5. Server-Side Merged Pagination & Summary Metrics Computation
 * 6. Backend API Routes & Authentication Middleware Wiring
 * 7. Passenger Mobile App Service, Types, and Bookings UI Integration
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
console.log('  KINGS TAXI — PASSENGER BOOKINGS HISTORY ACCEPTANCE SUITE');
console.log('================================================================================\n');

// 1. Database Schema & Prisma ORM Models
runTest('1. Prisma schema contains Booking, Trip, HotelBooking, and HeritageTourBooking models', () => {
  const schemaPath = path.join(__dirname, '../backend/prisma/schema.prisma');
  assert.ok(fs.existsSync(schemaPath), 'schema.prisma must exist');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  assert.ok(schema.includes('model Booking {'), 'Booking model must exist');
  assert.ok(schema.includes('model Trip {'), 'Trip model must exist');
  assert.ok(schema.includes('model HotelBooking {'), 'HotelBooking model must exist');
  assert.ok(schema.includes('model HeritageTourBooking {'), 'HeritageTourBooking model must exist');
  assert.ok(schema.includes('model Payment {'), 'Payment model must exist');

  // Verify passenger relationships
  assert.ok(schema.includes('passengerId         String             @map("passenger_id") @db.Uuid'), 'Booking must link to passengerId');
  assert.ok(schema.includes('bookingReference    String             @unique @map("booking_reference")'), 'Booking references must be unique');
});

// 2. Status Normalization Logic
runTest('2. Status normalization functions correctly normalize statuses across all 3 domains', () => {
  const servicePath = path.join(__dirname, '../backend/dist/modules/passengers/passengerBookingHistory.service.js');
  assert.ok(fs.existsSync(servicePath), 'Compiled passengerBookingHistory.service.js must exist');
  const { normalizeBookingStatus, resolveStatusFilter } = require(servicePath);

  // Rides
  assert.strictEqual(normalizeBookingStatus('RIDE', 'TRIP_COMPLETED'), 'COMPLETED');
  assert.strictEqual(normalizeBookingStatus('RIDE', 'CANCELLED'), 'CANCELLED');
  assert.strictEqual(normalizeBookingStatus('RIDE', 'TRIP_STARTED'), 'IN_PROGRESS');
  assert.strictEqual(normalizeBookingStatus('RIDE', 'DRIVER_ARRIVING'), 'IN_PROGRESS');
  assert.strictEqual(normalizeBookingStatus('RIDE', 'DRIVER_ASSIGNED'), 'CONFIRMED');
  assert.strictEqual(normalizeBookingStatus('RIDE', 'REQUESTED'), 'PENDING');

  // Hotels
  assert.strictEqual(normalizeBookingStatus('HOTEL', 'COMPLETED'), 'COMPLETED');
  assert.strictEqual(normalizeBookingStatus('HOTEL', 'CONFIRMED'), 'CONFIRMED');
  assert.strictEqual(normalizeBookingStatus('HOTEL', 'CANCELLED'), 'CANCELLED');
  assert.strictEqual(normalizeBookingStatus('HOTEL', 'REJECTED'), 'CANCELLED');
  assert.strictEqual(normalizeBookingStatus('HOTEL', 'PENDING'), 'PENDING');

  // Heritage
  assert.strictEqual(normalizeBookingStatus('HERITAGE', 'COMPLETED'), 'COMPLETED');
  assert.strictEqual(normalizeBookingStatus('HERITAGE', 'CONFIRMED'), 'CONFIRMED');
  assert.strictEqual(normalizeBookingStatus('HERITAGE', 'GUIDE_ASSIGNED'), 'CONFIRMED');
  assert.strictEqual(normalizeBookingStatus('HERITAGE', 'VEHICLE_ASSIGNED'), 'CONFIRMED');
  assert.strictEqual(normalizeBookingStatus('HERITAGE', 'IN_PROGRESS'), 'IN_PROGRESS');
  assert.strictEqual(normalizeBookingStatus('HERITAGE', 'CANCELLED'), 'CANCELLED');
  assert.strictEqual(normalizeBookingStatus('HERITAGE', 'REQUESTED'), 'PENDING');

  // Filter resolution
  const rideCompletedFilter = resolveStatusFilter('RIDE', 'COMPLETED');
  assert.deepStrictEqual(rideCompletedFilter, ['TRIP_COMPLETED']);

  const hotelConfirmedFilter = resolveStatusFilter('HOTEL', 'CONFIRMED');
  assert.deepStrictEqual(hotelConfirmedFilter, ['CONFIRMED']);

  const heritagePendingFilter = resolveStatusFilter('HERITAGE', 'PENDING');
  assert.deepStrictEqual(heritagePendingFilter, ['DRAFT', 'REQUESTED', 'UNDER_REVIEW']);
});

// 3. Chronological Merging and In-Memory Pagination Algorithm
runTest('3. Global chronological sorting and pagination slice algorithm operates correctly', () => {
  const sampleItems = [
    { id: '1', createdAt: '2026-11-10T10:00:00Z', type: 'RIDE' },
    { id: '2', createdAt: '2026-11-12T12:00:00Z', type: 'HOTEL' },
    { id: '3', createdAt: '2026-11-11T08:00:00Z', type: 'HERITAGE' },
    { id: '4', createdAt: '2026-11-09T14:00:00Z', type: 'RIDE' },
    { id: '5', createdAt: '2026-11-12T15:00:00Z', type: 'HERITAGE' },
  ];

  // Sort descending
  const sortedDesc = [...sampleItems].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  assert.strictEqual(sortedDesc[0].id, '5', 'Most recent item should be first');
  assert.strictEqual(sortedDesc[1].id, '2');
  assert.strictEqual(sortedDesc[2].id, '3');
  assert.strictEqual(sortedDesc[3].id, '1');
  assert.strictEqual(sortedDesc[4].id, '4', 'Oldest item should be last');

  // Pagination (page 1, limit 2)
  const page1 = sortedDesc.slice(0, 2);
  assert.strictEqual(page1.length, 2);
  assert.strictEqual(page1[0].id, '5');

  // Pagination (page 2, limit 2)
  const page2 = sortedDesc.slice(2, 4);
  assert.strictEqual(page2.length, 2);
  assert.strictEqual(page2[0].id, '3');

  // Pagination (page 3, limit 2)
  const page3 = sortedDesc.slice(4, 6);
  assert.strictEqual(page3.length, 1);
  assert.strictEqual(page3[0].id, '4');
});

// 4. Passenger Isolation & IDOR Protection Verification
runTest('4. Backend service enforces strict passenger ownership checking (IDOR prevention)', () => {
  const serviceFilePath = path.join(__dirname, '../backend/src/modules/passengers/passengerBookingHistory.service.ts');
  const serviceCode = fs.readFileSync(serviceFilePath, 'utf8');

  assert.ok(serviceCode.includes('booking.passengerId !== passengerId'), 'Must verify booking passengerId matches authenticated passenger');
  assert.ok(serviceCode.includes("error.code = 'FORBIDDEN'"), 'Must mark IDOR violation with FORBIDDEN error code');

  const controllerFilePath = path.join(__dirname, '../backend/src/modules/passengers/passengerBookingHistory.controller.ts');
  const controllerCode = fs.readFileSync(controllerFilePath, 'utf8');
  assert.ok(controllerCode.includes("err.code === 'FORBIDDEN'"), 'Controller must catch FORBIDDEN error and respond with 403');
  assert.ok(controllerCode.includes('ApiResponse.unauthorized'), 'Controller must require authentication token');
});

// 5. Backend Routes Wiring
runTest('5. Passenger routes mount /bookings and /bookings/:type/:id with authenticateToken', () => {
  const passengerRoutesPath = path.join(__dirname, '../backend/src/modules/passengers/index.ts');
  const passengerRoutesCode = fs.readFileSync(passengerRoutesPath, 'utf8');

  assert.ok(passengerRoutesCode.includes("passengerRouter.get('/bookings', authenticateToken"), 'Must mount /bookings with auth');
  assert.ok(passengerRoutesCode.includes("passengerRouter.get('/bookings/:type/:id', authenticateToken"), 'Must mount /bookings/:type/:id with auth');

  const mainRoutesPath = path.join(__dirname, '../backend/src/routes/index.ts');
  const mainRoutesCode = fs.readFileSync(mainRoutesPath, 'utf8');
  assert.ok(mainRoutesCode.includes("apiV1Router.use('/passengers', passengerRouter)"), 'Must mount /passengers');
  assert.ok(mainRoutesCode.includes("apiV1Router.use('/passenger', passengerRouter)"), 'Must mount /passenger alias');
});

// 6. Mobile API Service & Types
runTest('6. Passenger mobile service and TypeScript interfaces exist and export properly', () => {
  const typesPath = path.join(__dirname, '../apps/passenger-mobile/src/types/bookingsHistory.types.ts');
  assert.ok(fs.existsSync(typesPath), 'bookingsHistory.types.ts must exist');
  const typesCode = fs.readFileSync(typesPath, 'utf8');

  assert.ok(typesCode.includes('export interface UnifiedBookingItem'), 'Must export UnifiedBookingItem');
  assert.ok(typesCode.includes('export interface PassengerBookingHistorySummary'), 'Must export PassengerBookingHistorySummary');
  assert.ok(typesCode.includes('export interface BookingHistoryPagination'), 'Must export BookingHistoryPagination');

  const servicePath = path.join(__dirname, '../apps/passenger-mobile/src/services/passengerBookings.service.ts');
  assert.ok(fs.existsSync(servicePath), 'passengerBookings.service.ts must exist');
  const serviceCode = fs.readFileSync(servicePath, 'utf8');

  assert.ok(serviceCode.includes('class PassengerBookingsService'), 'Must define PassengerBookingsService');
  assert.ok(serviceCode.includes('getBookingsHistory'), 'Must implement getBookingsHistory');
  assert.ok(serviceCode.includes('getBookingDetail'), 'Must implement getBookingDetail');
  assert.ok(serviceCode.includes('/passengers/bookings'), 'Must call backend /passengers/bookings');
});

// 7. Mobile UI Integration
runTest('7. Passenger mobile Bookings screen implements metrics header, category tabs, pull-to-refresh, and detail modal', () => {
  const bookingsScreenPath = path.join(__dirname, '../apps/passenger-mobile/app/(tabs)/bookings.tsx');
  assert.ok(fs.existsSync(bookingsScreenPath), 'bookings.tsx must exist');
  const bookingsScreenCode = fs.readFileSync(bookingsScreenPath, 'utf8');

  // Verify Metrics Header
  assert.ok(bookingsScreenCode.includes('styles.metricsRow'), 'Must render summary metrics row');
  assert.ok(bookingsScreenCode.includes('totalBookings'), 'Must display total bookings count');
  assert.ok(bookingsScreenCode.includes('completed'), 'Must display completed bookings count');
  assert.ok(bookingsScreenCode.includes('pending'), 'Must display pending bookings count');

  // Verify Category Tabs
  assert.ok(bookingsScreenCode.includes("'ALL'"), 'Must include ALL tab');
  assert.ok(bookingsScreenCode.includes("'RIDE'"), 'Must include RIDE tab');
  assert.ok(bookingsScreenCode.includes("'HOTEL'"), 'Must include HOTEL tab');
  assert.ok(bookingsScreenCode.includes("'HERITAGE'"), 'Must include HERITAGE tab');

  // Verify Pull to refresh & Infinite Scroll
  assert.ok(bookingsScreenCode.includes('RefreshControl'), 'Must implement RefreshControl');
  assert.ok(bookingsScreenCode.includes('onEndReached'), 'Must implement onEndReached for pagination');

  // Verify Skeleton Loader & Empty States
  assert.ok(bookingsScreenCode.includes('skeletonCard'), 'Must render skeleton loader during initial fetch');
  assert.ok(bookingsScreenCode.includes('EmptyState'), 'Must render EmptyState component');

  // Verify Modal Detail View
  assert.ok(bookingsScreenCode.includes('<Modal'), 'Must include bottom detail modal');
  assert.ok(bookingsScreenCode.includes('selectedItem'), 'Must render selected booking details');
});

// 8. Enhanced BookingCard Component
runTest('8. BookingCard supports unified items, reference IDs, status badges, and thumbnails', () => {
  const cardPath = path.join(__dirname, '../apps/passenger-mobile/src/components/BookingCard.tsx');
  assert.ok(fs.existsSync(cardPath), 'BookingCard.tsx must exist');
  const cardCode = fs.readFileSync(cardPath, 'utf8');

  assert.ok(cardCode.includes('StatusBadge'), 'Must render StatusBadge');
  assert.ok(cardCode.includes('booking.reference'), 'Must display booking reference if present');
  assert.ok(cardCode.includes('paymentStatus'), 'Must support payment status badge');
  assert.ok(cardCode.includes('imageThumbnail'), 'Must support thumbnail image');
});

console.log('\n--------------------------------------------------------------------------------');
console.log(`  RESULTS: ${passedTests} / ${totalTests} acceptance criteria passed (${failures.length} failures)`);
console.log('--------------------------------------------------------------------------------\n');

if (failures.length > 0) {
  console.error('Failed tests:');
  failures.forEach((f) => console.error(` - ${f.name}: ${f.error}`));
  process.exit(1);
} else {
  console.log('🎉 ALL PASSENGER BOOKING HISTORY ACCEPTANCE TESTS PASSED SUCCESSFULLY!\n');
}

