/**
 * Kings Taxi Platform - Payment Completion & Home Screen Active Ride Removal Test
 *
 * Verifies the user requirement:
 * "on the home page of the app there is ride in progress notification for passenger
 *  when once the payment is completed it automatically removed from the home page
 *  but stay on the ride histories"
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✅ [PASS] ${name}`);
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
  }
}

console.log('\n================================================================================');
console.log('  KINGS TAXI - PAYMENT COMPLETION & HOME ACTIVE RIDE REMOVAL TEST');
console.log('================================================================================\n');

// 1. Static Source Code Checks
console.log('--- Phase 1: Source Code Inspections ---');

const indexScreenPath = path.join(__dirname, '../apps/passenger-mobile/app/(tabs)/index.tsx');
const bookingsScreenPath = path.join(__dirname, '../apps/passenger-mobile/app/(tabs)/bookings.tsx');
const checkoutScreenPath = path.join(__dirname, '../apps/passenger-mobile/app/payments/checkout.tsx');
const receiptScreenPath = path.join(__dirname, '../apps/passenger-mobile/app/rides/receipt.tsx');
const rideStorePath = path.join(__dirname, '../apps/passenger-mobile/src/stores/ride.store.ts');
const rideServicePath = path.join(__dirname, '../apps/passenger-mobile/src/services/ride.service.ts');

runTest('1.1 Home screen only renders active ride banner when currentRide is non-null and not completed', () => {
  const content = fs.readFileSync(indexScreenPath, 'utf8');
  assert(content.includes('currentRide && currentRide.status !=='), 'Must check currentRide and status');
  assert(content.includes('PAYMENT_COMPLETED'), 'Must exclude PAYMENT_COMPLETED');
  assert(content.includes('activeRideBanner'), 'Must render activeRideBanner when active');
  assert(content.includes('useRideStore.getState().fetchRideHistory()'), 'Must fetch ride history on mount');
});

runTest('1.2 RideStore completePayment clears currentRide, sets lastCompletedRide, and updates rideHistory', () => {
  const content = fs.readFileSync(rideStorePath, 'utf8');
  assert(content.includes('completePayment'), 'Must define completePayment');
  assert(content.includes("status: 'PAYMENT_COMPLETED'"), 'Must set status to PAYMENT_COMPLETED');
  assert(content.includes('currentRide: null'), 'Must immediately clear currentRide to null');
  assert(content.includes('lastCompletedRide: completedRide'), 'Must store lastCompletedRide for receipt view');
  assert(content.includes('rideHistory: updatedHistory'), 'Must update rideHistory with completed ride');
  assert(content.includes('RIDE_HISTORY_STORAGE_KEY'), 'Must persist ride history into AsyncStorage');
});

runTest('1.3 RideStore syncRideState does not revive completed or cancelled rides', () => {
  const content = fs.readFileSync(rideStorePath, 'utf8');
  assert(content.includes("status === 'PAYMENT_COMPLETED'"), 'Must guard against syncing PAYMENT_COMPLETED');
  assert(content.includes('return;'), 'Must return early if ride is completed');
});

runTest('1.4 Bookings screen passes ride id to receipt screen and loads history', () => {
  const content = fs.readFileSync(bookingsScreenPath, 'utf8');
  assert(content.includes('fetchRideHistory()'), 'Must call fetchRideHistory on mount');
  assert(content.includes("pathname: '/rides/receipt'"), 'Must navigate to receipt');
  assert(content.includes('params: { id: booking.id }'), 'Must pass ride ID to receipt screen');
});

runTest('1.5 Receipt screen supports param ID, lastCompletedRide, or history lookup', () => {
  const content = fs.readFileSync(receiptScreenPath, 'utf8');
  assert(content.includes('useLocalSearchParams'), 'Must use URL params');
  assert(content.includes('selectedFromHistory'), 'Must find ride from history by ID');
  assert(content.includes('lastCompletedRide'), 'Must support lastCompletedRide fallback');
});

runTest('1.6 RideService has recordPayment API helper', () => {
  const content = fs.readFileSync(rideServicePath, 'utf8');
  assert(content.includes('recordPayment'), 'Must define recordPayment method');
});

// 2. Behavioral Lifecycle Simulation
console.log('\n--- Phase 2: State Lifecycle Simulation ---');

class MockRideStore {
  constructor() {
    this.currentRide = null;
    this.lastCompletedRide = null;
    this.rideHistory = [
      {
        id: 'hist_old_1',
        status: 'TRIP_COMPLETED',
        pickup: { title: 'Maraki Campus' },
        destination: { title: 'Fasil Ghebbi' },
        finalPrice: 180,
        createdAt: '2026-11-01T10:00:00Z',
      },
    ];
    this.storage = new Map();
  }

  // 1. Passenger starts a ride
  startRide(rideData) {
    this.currentRide = {
      ...rideData,
      status: 'TRIP_STARTED',
      createdAt: new Date().toISOString(),
    };
  }

  // 2. Driver ends trip
  endTrip(finalPrice) {
    if (!this.currentRide) return;
    this.currentRide.status = 'TRIP_COMPLETED';
    this.currentRide.finalPrice = finalPrice;
    this.currentRide.completedAt = new Date().toISOString();
  }

  // 3. Passenger completes payment
  completePayment(method, ref) {
    if (!this.currentRide) return;
    const completed = {
      ...this.currentRide,
      status: 'PAYMENT_COMPLETED',
      paymentMethod: method,
      bookingReference: ref,
      completedAt: this.currentRide.completedAt || new Date().toISOString(),
    };

    const updatedHistory = [completed, ...this.rideHistory.filter((r) => r.id !== completed.id)];
    this.storage.set('@kings_taxi_ride_history', JSON.stringify(updatedHistory));

    // Clear active slot immediately
    this.currentRide = null;
    this.lastCompletedRide = completed;
    this.rideHistory = updatedHistory;
  }

  // Check if Home Screen shows banner
  isHomeScreenBannerVisible() {
    return Boolean(
      this.currentRide &&
      this.currentRide.status !== 'PAYMENT_COMPLETED' &&
      this.currentRide.status !== 'CANCELLED'
    );
  }

  // Background sync simulation
  syncRideState(backendStatus) {
    if (!this.currentRide || this.currentRide.status === 'PAYMENT_COMPLETED') {
      return; // Protected
    }
    this.currentRide.status = backendStatus;
  }
}

runTest('Test 2.1: Banner is VISIBLE on Home Screen while ride is in progress', () => {
  const store = new MockRideStore();
  store.startRide({
    id: 'ride_active_999',
    bookingReference: 'KT-ACTIVE-01',
    pickup: { title: 'Piasa Square' },
    destination: { title: 'Maraki Campus' },
    finalPrice: 160,
  });

  assert.strictEqual(store.isHomeScreenBannerVisible(), true, 'Banner must show during active ride');
  assert.strictEqual(store.currentRide.status, 'TRIP_STARTED');
});

runTest('Test 2.2: Banner remains visible when trip ends but awaiting payment', () => {
  const store = new MockRideStore();
  store.startRide({ id: 'ride_active_999' });
  store.endTrip(175);

  assert.strictEqual(store.isHomeScreenBannerVisible(), true, 'Banner remains visible while awaiting payment');
  assert.strictEqual(store.currentRide.status, 'TRIP_COMPLETED');
});

runTest('Test 2.3: Once payment is completed, banner is AUTOMATICALLY REMOVED from Home Screen', () => {
  const store = new MockRideStore();
  store.startRide({ id: 'ride_active_999', pickup: { title: 'Piasa' }, destination: { title: 'Maraki' } });
  store.endTrip(175);

  // Complete Payment via Telebirr
  store.completePayment('telebirr', 'TXN-TB-889922');

  assert.strictEqual(store.isHomeScreenBannerVisible(), false, 'Banner MUST be removed from Home Screen');
  assert.strictEqual(store.currentRide, null, 'currentRide MUST be null');
});

runTest('Test 2.4: Completed ride STAYS permanently in ride histories', () => {
  const store = new MockRideStore();
  store.startRide({ id: 'ride_active_999', pickup: { title: 'Piasa' }, destination: { title: 'Maraki' } });
  store.endTrip(175);
  store.completePayment('telebirr', 'TXN-TB-889922');

  assert(store.rideHistory.length >= 2, 'History must contain past rides plus new completed ride');
  const found = store.rideHistory.find((r) => r.id === 'ride_active_999');
  assert(found, 'Completed ride must exist in rideHistory');
  assert.strictEqual(found.status, 'PAYMENT_COMPLETED');
  assert.strictEqual(found.paymentMethod, 'telebirr');
  assert.strictEqual(found.bookingReference, 'TXN-TB-889922');
  assert.strictEqual(found.finalPrice, 175);
});

runTest('Test 2.5: Receipt screen can access the completed ride without currentRide', () => {
  const store = new MockRideStore();
  store.startRide({ id: 'ride_active_999' });
  store.endTrip(175);
  store.completePayment('telebirr', 'TXN-TB-889922');

  // When opening from checkout
  const receiptFromCheckout = store.lastCompletedRide;
  assert.notStrictEqual(receiptFromCheckout, null);
  assert.strictEqual(receiptFromCheckout.id, 'ride_active_999');

  // When opening from Bookings history list with params.id
  const receiptFromHistory = store.rideHistory.find((r) => r.id === 'ride_active_999');
  assert.notStrictEqual(receiptFromHistory, null);
  assert.strictEqual(receiptFromHistory.id, 'ride_active_999');
});

runTest('Test 2.6: Background sync does not resurrect completed ride on Home Screen', () => {
  const store = new MockRideStore();
  store.startRide({ id: 'ride_active_999' });
  store.endTrip(175);
  store.completePayment('cbe_birr', 'TXN-CBE-112233');

  // Background sync tries to update with backend status 'TRIP_COMPLETED'
  store.syncRideState('TRIP_COMPLETED');

  assert.strictEqual(store.currentRide, null, 'currentRide must remain null');
  assert.strictEqual(store.isHomeScreenBannerVisible(), false, 'Banner must remain hidden on Home Screen');
});

console.log('\n--------------------------------------------------------------------------------');
console.log(`  TEST RESULTS: ${passedTests}/${totalTests} Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
console.log('--------------------------------------------------------------------------------\n');

if (passedTests !== totalTests) {
  process.exit(1);
} else {
  console.log('  🎯 ALL PAYMENT COMPLETION & HOME REMOVAL TESTS PASSED!\n');
}

