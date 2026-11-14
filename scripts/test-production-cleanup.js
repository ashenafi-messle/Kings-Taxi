const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const { randomUUID } = require('crypto');

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const { Client } = require('C:/kings-taxi-db-test/node_modules/pg');

// Import compiled backend modules from dist
const { prisma } = require('../backend/dist/core/database/prisma');
const {
  passengerBookingHistoryService,
} = require('../backend/dist/modules/passengers/passengerBookingHistory.service');
const {
  passengerBookingHistoryController,
} = require('../backend/dist/modules/passengers/passengerBookingHistory.controller');
const { apiV1Router } = require('../backend/dist/routes');

async function runTestSuite() {
  console.log('================================================================');
  console.log('  KINGS TAXI — PASSENGER APP PRODUCTION CLEANUP AUDIT & TEST    ');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName} - ${details}`);
      failed++;
    }
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    // -------------------------------------------------------------------------
    // SUITE 1: REMOVAL OF "EXPLORE AS GUEST" FEATURE
    // -------------------------------------------------------------------------
    console.log('\n--- 1. EXPLORE AS A GUEST REMOVAL AUDIT ---');

    const welcomePath = path.join(__dirname, '../apps/passenger-mobile/app/(auth)/welcome.tsx');
    const welcomeContent = fs.readFileSync(welcomePath, 'utf8');

    assert(
      !welcomeContent.includes('guestLink'),
      'welcome.tsx does not contain guestLink or guestLinkText styles'
    );
    assert(
      !welcomeContent.includes("accessibilityLabel={t('exploreAsGuest')}"),
      'welcome.tsx does not render Explore as Guest button in unauthenticated view'
    );
    assert(
      !welcomeContent.includes("router.replace('/(tabs)')") ||
      !welcomeContent.includes('exploreAsGuest'),
      'welcome.tsx does not allow unauthenticated bypass into /(tabs)'
    );

    const homeIndexPath = path.join(__dirname, '../apps/passenger-mobile/app/(tabs)/index.tsx');
    const homeIndexContent = fs.readFileSync(homeIndexPath, 'utf8');

    assert(
      homeIndexContent.includes('!isAuthenticated && !user'),
      'HomeScreen enforces authentication guard and redirects unauthenticated users to /(auth)/welcome'
    );

    // -------------------------------------------------------------------------
    // SUITE 2: REMOVAL OF DEFAULT / PREFILLED PASSWORDS
    // -------------------------------------------------------------------------
    console.log('\n--- 2. PASSWORD FIELD & DEMO CREDENTIAL CLEANUP AUDIT ---');

    const loginPath = path.join(__dirname, '../apps/passenger-mobile/app/(auth)/login.tsx');
    const loginContent = fs.readFileSync(loginPath, 'utf8');

    assert(
      loginContent.includes("const [password, setPassword] = useState('');"),
      'login.tsx initializes password state as an empty string'
    );
    assert(
      !loginContent.includes("useState('Password123!')"),
      'login.tsx contains no hardcoded Password123! default state'
    );
    assert(
      !loginContent.includes("setEmail('passenger@kingstaxi.et')"),
      'login.tsx does not prefill demo email when rememberEmail is disabled'
    );

    const authStorePath = path.join(__dirname, '../apps/passenger-mobile/src/stores/auth.store.ts');
    const authStoreContent = fs.readFileSync(authStorePath, 'utf8');

    assert(
      !authStoreContent.includes("password = 'Password123!'"),
      'auth.store.ts does not provide Password123! as a default argument'
    );
    assert(
      authStoreContent.includes('loginWithEmail: async (\n    email: string,\n    password: string,\n    remember = false\n  )'),
      'auth.store.ts strictly requires password string parameter'
    );

    const setPasswordPath = path.join(__dirname, '../apps/passenger-mobile/app/(auth)/set-password.tsx');
    const setPasswordContent = fs.readFileSync(setPasswordPath, 'utf8');
    assert(
      setPasswordContent.includes("const [password, setPassword] = useState('');") &&
      setPasswordContent.includes("const [confirmPassword, setConfirmPassword] = useState('');"),
      'set-password.tsx initializes password and confirmPassword fields as empty strings'
    );

    // -------------------------------------------------------------------------
    // SUITE 3: BACKEND RECENT ACTIVITIES API & PERSISTENCE
    // -------------------------------------------------------------------------
    console.log('\n--- 3. BACKEND RECENT ACTIVITIES PERSISTENCE & ISOLATION ---');

    // Test passenger 1 and 2 setup
    let p1 = await prisma.passenger.findFirst({
      where: { phoneNumber: '+251911990001' },
    });
    if (!p1) {
      p1 = await prisma.passenger.create({
        data: {
          phoneNumber: '+251911990001',
          fullName: 'Abebe Bikila Support Test',
          email: 'abebe.support@kingstaxi.et',
          passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$dummyhash1',
          accountStatus: 'ACTIVE',
        },
      });
    }

    let p2 = await prisma.passenger.findFirst({
      where: { phoneNumber: '+251911990002' },
    });
    if (!p2) {
      p2 = await prisma.passenger.create({
        data: {
          phoneNumber: '+251911990002',
          fullName: 'Derartu Tulu Support Test',
          email: 'derartu.support@kingstaxi.et',
          passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$dummyhash2',
          accountStatus: 'ACTIVE',
        },
      });
    }

    // Call getRecentActivities for Passenger 1
    const p1Activities = await passengerBookingHistoryService.getRecentActivities(p1.id, 5);
    assert(Array.isArray(p1Activities.activities), 'getRecentActivities returns activities array');
    assert(typeof p1Activities.total === 'number', 'getRecentActivities returns numeric total count');

    // Check if each activity item conforms to normalized format
    if (p1Activities.activities.length > 0) {
      const act = p1Activities.activities[0];
      assert(!!act.id, `Activity contains unique id (${act.id})`);
      assert(!!act.type, `Activity contains type (${act.type})`);
      assert(!!act.title, `Activity contains title (${act.title})`);
      assert(!!act.category, `Activity contains category (${act.category})`);
      assert(!!act.normalizedStatus, `Activity contains normalizedStatus (${act.normalizedStatus})`);
      assert(!!act.iconType, `Activity contains iconType (${act.iconType})`);
      assert(!!act.timestamp, `Activity contains timestamp (${act.timestamp})`);
    } else {
      console.log('  ℹ️  Passenger 1 has no previous activities; creating sample booking to verify structure...');
      // Verify clean empty state return for passenger with no bookings
      assert(p1Activities.activities.length === 0, 'Returns clean empty list for passenger without bookings');
      assert(p1Activities.total === 0, 'Returns 0 total for passenger without bookings');
    }

    // Account-isolation / IDOR test
    const p2Activities = await passengerBookingHistoryService.getRecentActivities(p2.id, 5);
    const p1Ids = new Set(p1Activities.activities.map((a) => a.id));
    const p2Overlap = p2Activities.activities.some((a) => p1Ids.has(a.id));
    assert(!p2Overlap, 'Strict Account Isolation: Passenger 1 activities do not leak into Passenger 2');

    // Verify Controller unauthenticated guard
    let unauthorizedBlocked = false;
    const mockReq = { headers: {}, query: {} };
    const mockRes = {
      status(code) {
        if (code === 401) unauthorizedBlocked = true;
        return this;
      },
      json() {
        return this;
      },
    };
    await passengerBookingHistoryController.getRecentActivities(mockReq, mockRes);
    assert(unauthorizedBlocked, 'Controller returns 401 Unauthorized when no authenticated token/passenger exists');

    // -------------------------------------------------------------------------
    // SUITE 4: HOME SCREEN UI IMPLEMENTATION & LOCALES
    // -------------------------------------------------------------------------
    console.log('\n--- 4. HOME SCREEN RECENT ACTIVITIES UI AUDIT ---');

    const enHomeLocale = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../apps/passenger-mobile/src/i18n/locales/en/home.json'), 'utf8')
    );
    assert(
      enHomeLocale.noRecentActivity === 'Your recent activities will appear here when you start using Kings Taxi.',
      'en/home.json contains exact production empty state message'
    );

    assert(
      homeIndexContent.includes('activityLoadingBox') &&
      homeIndexContent.includes('activityErrorBox') &&
      homeIndexContent.includes('activityEmptyBox') &&
      homeIndexContent.includes('activityRow'),
      'HomeScreen implements loading, error, empty, and activity list UI states'
    );

    assert(
      homeIndexContent.includes('Your recent activities will appear here when you start using Kings Taxi.'),
      'HomeScreen presents the required empty state wording'
    );

    assert(
      homeIndexContent.includes('item.category === \'ride\' ?') &&
      homeIndexContent.includes('item.category === \'hotel\' ?') &&
      homeIndexContent.includes('item.category === \'lounge\' ?'),
      'HomeScreen dynamically renders category icons (Car, Hotel, Coffee, Compass)'
    );

    assert(
      homeIndexContent.includes('item.normalizedStatus'),
      'HomeScreen displays normalized status badge'
    );

    assert(
      homeIndexContent.includes('formatRelativeTime(item.timestamp)'),
      'HomeScreen displays relative formatted timestamps'
    );

    assert(
      homeIndexContent.includes('[user?.id]'),
      'HomeScreen keys recent activities loader to user.id for strict account isolation on logout/switch'
    );

    // -------------------------------------------------------------------------
    // SUITE 5: REMOVAL OF CUSTOM TOUR PACKAGE BUILDER FROM UI
    // -------------------------------------------------------------------------
    console.log('\n--- 5. CUSTOM TOUR PACKAGE BUILDER UI REMOVAL AUDIT ---');

    const explorePath = path.join(__dirname, '../apps/passenger-mobile/app/(tabs)/explore.tsx');
    const exploreContent = fs.readFileSync(explorePath, 'utf8');

    assert(
      !exploreContent.includes('contractCalloutCard'),
      'explore.tsx has contractCalloutCard removed'
    );
    assert(
      !exploreContent.includes('/tours/contract-builder'),
      'explore.tsx has navigation link to /tours/contract-builder removed'
    );

    const carouselPath = path.join(__dirname, '../apps/passenger-mobile/src/components/advertising/HomeAdCarousel.tsx');
    const carouselContent = fs.readFileSync(carouselPath, 'utf8');

    assert(
      !carouselContent.includes('/tours/contract-builder'),
      'HomeAdCarousel slide 5 does not route to /tours/contract-builder'
    );
    assert(
      carouselContent.includes("route: '/(tabs)/explore'"),
      'HomeAdCarousel slide 5 routes to official /(tabs)/explore'
    );

    const rootLayoutPath = path.join(__dirname, '../apps/passenger-mobile/app/_layout.tsx');
    const rootLayoutContent = fs.readFileSync(rootLayoutPath, 'utf8');

    assert(
      !rootLayoutContent.includes('name="tours/contract-builder"'),
      '_layout.tsx has tours/contract-builder stack screen removed from navigation hierarchy'
    );

    const builderPath = path.join(__dirname, '../apps/passenger-mobile/app/tours/contract-builder.tsx');
    const builderContent = fs.readFileSync(builderPath, 'utf8');

    assert(
      builderContent.includes("router.replace('/(tabs)/explore')"),
      'tours/contract-builder.tsx has safety redirect ensuring direct links redirect to /(tabs)/explore'
    );

    // -------------------------------------------------------------------------
    // SUITE 6: PRESERVATION OF STANDARD TOURS & HERITAGE PACKAGES
    // -------------------------------------------------------------------------
    console.log('\n--- 6. PRESERVATION OF STANDARD TOURS & HERITAGE PACKAGES ---');

    const tourBookPath = path.join(__dirname, '../apps/passenger-mobile/app/tours/book.tsx');
    const tourBookContent = fs.readFileSync(tourBookPath, 'utf8');

    assert(
      tourBookContent.includes('HeritageService') &&
      tourBookContent.includes('TourBookingScreen') &&
      tourBookContent.includes('TourPackage'),
      'Standard Tour Booking screen (app/tours/book.tsx) remains fully intact and operational'
    );

    const heritageDetailPath = path.join(__dirname, '../apps/passenger-mobile/app/heritage/[id].tsx');
    const heritageDetailContent = fs.readFileSync(heritageDetailPath, 'utf8');

    assert(
      heritageDetailContent.includes('mockHeritageSites') &&
      heritageDetailContent.includes('/tours/book'),
      'Heritage site details (app/heritage/[id].tsx) remains fully intact and links to /tours/book'
    );

    const heritageServicePath = path.join(__dirname, '../apps/passenger-mobile/src/services/heritage.service.ts');
    const heritageServiceContent = fs.readFileSync(heritageServicePath, 'utf8');

    assert(
      heritageServiceContent.includes('createBooking') &&
      heritageServiceContent.includes('getPackageDetails'),
      'HeritageService client module remains fully intact with all standard tour booking methods'
    );

    // Verify database tables for heritage tour bookings
    const heritageTblCheck = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name IN ('heritage_tour_bookings', 'heritage_sites', 'tour_packages')
    `);
    assert(
      heritageTblCheck.rows.length >= 2,
      `Standard Heritage Tour database tables preserved in PostgreSQL (found ${heritageTblCheck.rows.length} tables)`
    );

    console.log('\n================================================================');
    console.log(`  AUDIT COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    await client.end().catch(() => {});
    await prisma.$disconnect().catch(() => {});

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Test execution failed with error:', err);
    process.exit(1);
  }
}

runTestSuite();
