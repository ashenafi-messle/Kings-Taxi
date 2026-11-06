/**
 * Kings Taxi Passenger Mobile App - Cross-Platform Compatibility Test Suite
 *
 * Verifies Android & iOS readiness:
 * 1. app.json native parity (bundleId, package, permissions, infoPlist, intentFilters, adaptiveIcon)
 * 2. eas.json build profiles (development, preview APK, production AAB & IPA)
 * 3. LocationService (GPS permissions, fallback coordinates, reverse geocode)
 * 4. PaymentService (Telebirr, CBE Birr, Chapa, Cash, deep link callbacks)
 * 5. Security & Authentication compliance (Zero client secrets, SecureStore, Telegram challenge)
 * 6. Native navigation (BackHandler, SafeArea, KeyboardAvoidingView)
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

console.log('\n=============================================================');
console.log('  KINGS TAXI - ANDROID & iOS CROSS-PLATFORM COMPATIBILITY TEST');
console.log('=============================================================\n');

// 1. app.json Configuration & Native Parity
console.log('--- 1. Testing app.json Native Configurations ---');

const appJsonPath = path.join(__dirname, '../apps/passenger-mobile/app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
const expoConfig = appJson.expo;

runTest('App name, slug, version and scheme match specification', () => {
  assert.strictEqual(expoConfig.name, 'Kings Taxi');
  assert.strictEqual(expoConfig.slug, 'kings-taxi');
  assert.strictEqual(expoConfig.version, '1.0.0');
  assert.strictEqual(expoConfig.scheme, 'kingstaxi');
  assert.strictEqual(expoConfig.newArchEnabled, true);
  assert.strictEqual(expoConfig.owner, 'ardab-tech-solutions-22');
  assert.strictEqual(expoConfig.extra?.eas?.projectId, 'dea6e1f4-dcc5-4129-b016-cd36af49c3bf');
});

runTest('iOS bundleIdentifier and Android package name are strictly identical', () => {
  const iosId = expoConfig.ios?.bundleIdentifier;
  const androidPkg = expoConfig.android?.package;
  assert.strictEqual(iosId, 'et.kingstaxi.passenger');
  assert.strictEqual(androidPkg, 'et.kingstaxi.passenger');
  assert.strictEqual(iosId, androidPkg);
});

runTest('iOS infoPlist contains required usage descriptions', () => {
  const infoPlist = expoConfig.ios?.infoPlist;
  assert(infoPlist, 'infoPlist must exist in ios configuration');
  assert(
    infoPlist.NSLocationWhenInUseUsageDescription &&
      infoPlist.NSLocationWhenInUseUsageDescription.includes('location'),
    'NSLocationWhenInUseUsageDescription missing or incomplete'
  );
  assert(
    infoPlist.NSCameraUsageDescription,
    'NSCameraUsageDescription missing'
  );
  assert(
    infoPlist.NSPhotoLibraryUsageDescription,
    'NSPhotoLibraryUsageDescription missing'
  );
  assert(
    Array.isArray(infoPlist.UIBackgroundModes) &&
      infoPlist.UIBackgroundModes.includes('remote-notification'),
    'UIBackgroundModes must include remote-notification'
  );
});

runTest('Android configuration contains adaptiveIcon, keyboard mode, and permissions', () => {
  const android = expoConfig.android;
  assert(android, 'android configuration must exist');
  assert.strictEqual(android.softwareKeyboardLayoutMode, 'pan');
  assert(android.adaptiveIcon?.foregroundImage, 'adaptiveIcon foregroundImage required');
  assert(android.adaptiveIcon?.backgroundColor, 'adaptiveIcon backgroundColor required');

  const perms = android.permissions || [];
  assert(perms.includes('ACCESS_FINE_LOCATION'), 'Must include ACCESS_FINE_LOCATION');
  assert(perms.includes('ACCESS_COARSE_LOCATION'), 'Must include ACCESS_COARSE_LOCATION');
  assert(perms.includes('INTERNET'), 'Must include INTERNET');
  assert(perms.includes('VIBRATE'), 'Must include VIBRATE');
});

runTest('Android intentFilters configure deep link scheme for payment callbacks', () => {
  const filters = expoConfig.android?.intentFilters || [];
  const viewFilter = filters.find((f) => f.action === 'VIEW');
  assert(viewFilter, 'VIEW action intent filter required');
  const data = viewFilter.data || [];
  const hasScheme = data.some((d) => d.scheme === 'kingstaxi');
  assert(hasScheme, 'Intent filter must specify scheme: kingstaxi');
});

runTest('Plugins include expo-router, expo-secure-store, expo-localization, expo-font, expo-location', () => {
  const plugins = expoConfig.plugins || [];
  const hasRouter = plugins.includes('expo-router');
  const hasSecureStore = plugins.includes('expo-secure-store');
  const hasLocalization = plugins.includes('expo-localization');
  const hasFont = plugins.includes('expo-font');
  const hasLocation = plugins.some(
    (p) => (typeof p === 'string' && p === 'expo-location') || (Array.isArray(p) && p[0] === 'expo-location')
  );

  assert(hasRouter, 'expo-router plugin missing');
  assert(hasSecureStore, 'expo-secure-store plugin missing');
  assert(hasLocalization, 'expo-localization plugin missing');
  assert(hasFont, 'expo-font plugin missing');
  assert(hasLocation, 'expo-location plugin missing');
});

// 2. eas.json Build Profiles
console.log('\n--- 2. Testing eas.json Build Profiles ---');

const rootEasPath = path.join(__dirname, '../eas.json');
const mobileEasPath = path.join(__dirname, '../apps/passenger-mobile/eas.json');

runTest('eas.json exists in root and mobile directories', () => {
  assert(fs.existsSync(rootEasPath), 'Root eas.json missing');
  assert(fs.existsSync(mobileEasPath), 'Mobile package eas.json missing');
});

runTest('eas.json contains development, preview, and production profiles', () => {
  const eas = JSON.parse(fs.readFileSync(rootEasPath, 'utf8'));
  assert(eas.build?.development, 'development profile missing');
  assert(eas.build?.preview, 'preview profile missing');
  assert(eas.build?.production, 'production profile missing');
  assert.strictEqual(eas.cli?.appVersionSource, 'remote');

  // Preview must build APK on Android for easy testing
  assert.strictEqual(eas.build.preview.android?.buildType, 'apk');

  // Production must build AAB on Android and IPA on iOS
  assert.strictEqual(eas.build.production.android?.buildType, 'app-bundle');
  assert.strictEqual(eas.build.production.ios?.simulator, false);
});

// 3. Location & GPS Service
console.log('\n--- 3. Testing Location & GPS Service ---');

const locationServicePath = path.join(
  __dirname,
  '../apps/passenger-mobile/src/services/location.service.ts'
);

runTest('LocationService implements permission checks, position retrieval, and fallback', () => {
  assert(fs.existsSync(locationServicePath), 'location.service.ts missing');
  const content = fs.readFileSync(locationServicePath, 'utf8');

  assert(content.includes('checkPermissions'), 'checkPermissions method missing');
  assert(content.includes('requestPermissions'), 'requestPermissions method missing');
  assert(content.includes('getCurrentLocation'), 'getCurrentLocation method missing');
  assert(content.includes('reverseGeocode'), 'reverseGeocode method missing');
  assert(content.includes('DEFAULT_ADDIS_COORDINATES'), 'DEFAULT_ADDIS_COORDINATES missing');
  assert(content.includes('8.9778') && content.includes('38.7993'), 'Addis Ababa default coords missing');
});

// 4. Payment Gateway & Deep Linking
console.log('\n--- 4. Testing Payment System & Deep Link Handshake ---');

const paymentServicePath = path.join(
  __dirname,
  '../apps/passenger-mobile/src/services/payment.service.ts'
);
const paymentCallbackRoutePath = path.join(
  __dirname,
  '../apps/passenger-mobile/app/payments/callback.tsx'
);

runTest('PaymentService generates deep link handshake for Telebirr, CBE Birr, Chapa', () => {
  assert(fs.existsSync(paymentServicePath), 'payment.service.ts missing');
  const content = fs.readFileSync(paymentServicePath, 'utf8');

  assert(content.includes('initiateGatewayHandshake'), 'initiateGatewayHandshake missing');
  assert(content.includes('openPaymentGateway'), 'openPaymentGateway missing');
  assert(content.includes('verifyPayment'), 'verifyPayment missing');
  assert(content.includes('parseCallbackUrl'), 'parseCallbackUrl missing');
  assert(content.includes('kingstaxi://payments/callback'), 'Deep link callback URL missing');
  assert(content.includes('telebirr://pay'), 'Telebirr scheme missing');
  assert(content.includes('cbebirr://pay'), 'CBE Birr scheme missing');
});

runTest('Payment callback screen handles deep link returns and verification', () => {
  assert(fs.existsSync(paymentCallbackRoutePath), 'callback.tsx missing');
  const content = fs.readFileSync(paymentCallbackRoutePath, 'utf8');

  assert(content.includes('PaymentService.verifyPayment'), 'Must verify payment reference');
  assert(content.includes('BackHandler'), 'Must handle Android hardware back press');
  assert(content.includes('formatETB'), 'Must display formatted ETB amount');
});

// 5. Security & Authentication Audit
console.log('\n--- 5. Testing Security, Tokens & Credentials ---');

const secureStoragePath = path.join(
  __dirname,
  '../apps/passenger-mobile/src/utils/secureStorage.ts'
);
const telegramAuthPath = path.join(
  __dirname,
  '../apps/passenger-mobile/src/services/telegramAuth.service.ts'
);

runTest('SecureStore is utilized for token persistence across iOS Keychain and Android Keystore', () => {
  assert(fs.existsSync(secureStoragePath), 'secureStorage.ts missing');
  const content = fs.readFileSync(secureStoragePath, 'utf8');

  assert(content.includes('expo-secure-store'), 'Must use expo-secure-store');
  assert(content.includes('setItemAsync'), 'Must use SecureStore setItemAsync');
  assert(content.includes('getItemAsync'), 'Must use SecureStore getItemAsync');
  assert(content.includes('deleteItemAsync'), 'Must use SecureStore deleteItemAsync');
});

runTest('Telegram authentication does NOT expose bot tokens in client codebase', () => {
  assert(fs.existsSync(telegramAuthPath), 'telegramAuth.service.ts missing');
  const content = fs.readFileSync(telegramAuthPath, 'utf8');

  // Verify no bot tokens in client
  assert(!content.includes('BOT_TOKEN ='), 'BOT_TOKEN must not be in frontend client');
  assert(content.includes('KingsTaxiAuthBot'), 'Official bot handle must be used');
  assert(content.includes('generateChallenge'), 'Cryptographic challenge nonce must be generated');
});

// 6. Native Navigation & Android BackHandler Integration
console.log('\n--- 6. Testing Native Navigation, BackHandler & Gestures ---');

const welcomeScreenPath = path.join(__dirname, '../apps/passenger-mobile/app/(auth)/welcome.tsx');
const loginScreenPath = path.join(__dirname, '../apps/passenger-mobile/app/(auth)/login.tsx');
const activeRideScreenPath = path.join(__dirname, '../apps/passenger-mobile/app/rides/active.tsx');
const checkoutScreenPath = path.join(__dirname, '../apps/passenger-mobile/app/payments/checkout.tsx');
const bookScreenPath = path.join(__dirname, '../apps/passenger-mobile/app/rides/book.tsx');

runTest('Android BackHandler is handled across auth, booking, active ride and payment checkout', () => {
  const welcomeContent = fs.readFileSync(welcomeScreenPath, 'utf8');
  const loginContent = fs.readFileSync(loginScreenPath, 'utf8');
  const activeContent = fs.readFileSync(activeRideScreenPath, 'utf8');
  const checkoutContent = fs.readFileSync(checkoutScreenPath, 'utf8');
  const bookContent = fs.readFileSync(bookScreenPath, 'utf8');

  assert(welcomeContent.includes('BackHandler.addEventListener'), 'WelcomeScreen must handle BackHandler');
  assert(loginContent.includes('BackHandler.addEventListener'), 'LoginScreen must handle BackHandler');
  assert(activeContent.includes('BackHandler.addEventListener'), 'ActiveRideScreen must handle BackHandler');
  assert(checkoutContent.includes('BackHandler.addEventListener'), 'CheckoutScreen must handle BackHandler');
  assert(bookContent.includes('BackHandler.addEventListener'), 'BookRideScreen must handle BackHandler');
});

runTest('Root layout registers callback screen and sets up SafeAreaProvider', () => {
  const layoutPath = path.join(__dirname, '../apps/passenger-mobile/app/_layout.tsx');
  const layoutContent = fs.readFileSync(layoutPath, 'utf8');

  assert(layoutContent.includes('SafeAreaProvider'), 'SafeAreaProvider missing in RootLayout');
  assert(layoutContent.includes('payments/callback'), 'payments/callback must be registered in stack');
});

console.log('\n=============================================================');
console.log(`  RESULT: ${passedTests} / ${totalTests} tests passed (${Math.round((passedTests / totalTests) * 100)}%)`);
console.log('=============================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}

