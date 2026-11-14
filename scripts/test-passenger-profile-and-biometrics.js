/**
 * Kings Taxi — Passenger Profile, Cloudinary Image Upload & Native Biometric Acceptance Suite
 *
 * Automated verification of:
 * 1. PostgreSQL/Prisma database schema alignment (Passenger & PassengerSession)
 * 2. Backend Cloudinary environment variables & secure signed upload signature generation
 * 3. Backend Profile Service (getProfile, updateProfile, contact change OTP flow, security status)
 * 4. IDOR protection & JWT-derived identity enforcement
 * 5. Mobile Biometric Service (expo-local-authentication, hardware inspection, fallback PIN)
 * 6. Mobile Profile Service & Cloudinary direct signed upload flow
 * 7. Profile Screen UI (removal of SMS/push alerts, camera badge, editable personal info, biometric toggle)
 * 8. Welcome Screen passwordless re-entry via device authentication
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

let passedTests = 0;
let totalTests = 0;
const failures = [];

async function runTest(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ✅ [PASS] ${name}`);
  } catch (err) {
    failures.push({ name, error: err.message });
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
  }
}

async function runSuite() {
  console.log('\n================================================================================');
  console.log('  KINGS TAXI — PASSENGER PROFILE, CLOUDINARY & BIOMETRIC ACCEPTANCE SUITE');
  console.log('================================================================================\n');

  // 1. PostgreSQL/Prisma Schema Alignment
  await runTest('1. Prisma schema contains all required Passenger & PassengerSession fields', () => {
    const schemaPath = path.join(__dirname, '../backend/prisma/schema.prisma');
    assert.ok(fs.existsSync(schemaPath), 'schema.prisma must exist');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    assert.ok(schema.includes('model Passenger {'), 'Passenger model must exist');
    assert.ok(schema.includes('fullName'), 'Passenger.fullName must exist');
    assert.ok(schema.includes('email'), 'Passenger.email must exist');
    assert.ok(schema.includes('phoneNumber'), 'Passenger.phoneNumber must exist');
    assert.ok(schema.includes('profileImage'), 'Passenger.profileImage must exist');
    assert.ok(schema.includes('city'), 'Passenger.city must exist');
    assert.ok(schema.includes('language'), 'Passenger.language must exist');
    assert.ok(schema.includes('emergencyContactName'), 'Passenger.emergencyContactName must exist');
    assert.ok(schema.includes('emergencyContactPhone'), 'Passenger.emergencyContactPhone must exist');

    assert.ok(schema.includes('model PassengerSession {'), 'PassengerSession model must exist');
    assert.ok(schema.includes('deviceId'), 'PassengerSession.deviceId must exist');
    assert.ok(schema.includes('deviceName'), 'PassengerSession.deviceName must exist');
  });

  // 2. Cloudinary Environment Configuration
  await runTest('2. Cloudinary environment variables are configured in backend config/env.ts and .env.example', () => {
    const envTsPath = path.join(__dirname, '../backend/src/config/env.ts');
    const envExamplePath = path.join(__dirname, '../backend/.env.example');

    const envTs = fs.readFileSync(envTsPath, 'utf8');
    assert.ok(envTs.includes('CLOUDINARY_CLOUD_NAME'), 'env.ts must define CLOUDINARY_CLOUD_NAME');
    assert.ok(envTs.includes('CLOUDINARY_API_KEY'), 'env.ts must define CLOUDINARY_API_KEY');
    assert.ok(envTs.includes('CLOUDINARY_API_SECRET'), 'env.ts must define CLOUDINARY_API_SECRET');

    const envExample = fs.readFileSync(envExamplePath, 'utf8');
    assert.ok(envExample.includes('CLOUDINARY_CLOUD_NAME='), '.env.example must document Cloudinary cloud name');
    assert.ok(envExample.includes('CLOUDINARY_API_KEY='), '.env.example must document Cloudinary API key');
    assert.ok(envExample.includes('CLOUDINARY_API_SECRET='), '.env.example must document Cloudinary API secret');
  });

  // 3. Backend Passenger Profile Service
  await runTest('3. PassengerProfileService correctly updates personal details & handles offline DB gracefully', async () => {
    const servicePath = path.join(__dirname, '../backend/dist/modules/passengers/passengerProfile.service.js');
    assert.ok(fs.existsSync(servicePath), 'Compiled passengerProfile.service.js must exist');
    const { passengerProfileService } = require(servicePath);

    const testPassengerId = 'e2e-test-passenger-001';

    // Update profile
    const updated = await passengerProfileService.updateProfile(testPassengerId, {
      fullName: 'Yared Tesfaye',
      city: 'Gondar City, Ethiopia',
      emergencyContactName: 'Almaz Worku',
      emergencyContactPhone: '+251 92 345 6789',
    });

    assert.strictEqual(updated.fullName, 'Yared Tesfaye');
    assert.strictEqual(updated.city, 'Gondar City, Ethiopia');
    assert.strictEqual(updated.emergencyContactName, 'Almaz Worku');
    assert.strictEqual(updated.emergencyContactPhone, '+251 92 345 6789');

    // Retrieve profile
    const profile = await passengerProfileService.getProfile(testPassengerId);
    assert.strictEqual(profile.fullName, 'Yared Tesfaye');
    assert.strictEqual(profile.city, 'Gondar City, Ethiopia');
  });

  // 4. Contact Change 2-Step OTP Lifecycle
  await runTest('4. Contact change initiates OTP session and verifies code before updating email/phone', async () => {
    const { passengerProfileService } = require(path.join(
      __dirname,
      '../backend/dist/modules/passengers/passengerProfile.service.js'
    ));

    const testPassengerId = 'e2e-test-passenger-001';

    // Initiate change to new email
    const initiateResult = await passengerProfileService.initiateContactChange(testPassengerId, {
      type: 'email',
      newContact: 'yared.updated@kingstaxi.et',
    });

    assert.ok(initiateResult.sessionId, 'Must return a sessionId for 2-step verification');
    assert.ok(initiateResult.devOtp, 'Must generate 6-digit OTP code');
    assert.strictEqual(initiateResult.devOtp.length, 6, 'OTP must be 6 digits');

    // Verify invalid OTP code fails
    let failed = false;
    try {
      await passengerProfileService.verifyContactChange(testPassengerId, {
        sessionId: initiateResult.sessionId,
        code: '999999', // Incorrect OTP
      });
    } catch (err) {
      failed = true;
      assert.ok(
        err.message.toUpperCase().includes('INVALID') || err.message.includes('expired') || err.message.includes('Incorrect'),
        'Should reject bad OTP'
      );
    }
    assert.ok(failed, 'Verification with bad code must throw error');

    // Verify valid OTP code succeeds
    const verifyResult = await passengerProfileService.verifyContactChange(testPassengerId, {
      sessionId: initiateResult.sessionId,
      code: initiateResult.devOtp,
    });

    assert.ok(verifyResult, 'Verification with correct OTP must succeed');
    assert.strictEqual(verifyResult.email, 'yared.updated@kingstaxi.et');
  });

  // 5. Cloudinary Upload Signature Generation & Secret Isolation
  await runTest('5. Cloudinary signature generator produces signed parameters without exposing API secret', async () => {
    const { passengerProfileService } = require(path.join(
      __dirname,
      '../backend/dist/modules/passengers/passengerProfile.service.js'
    ));

    const testPassengerId = 'e2e-test-passenger-001';
    const sigData = await passengerProfileService.generateCloudinarySignature(testPassengerId);

    assert.ok(sigData.apiKey, 'Must return apiKey');
    assert.ok(sigData.timestamp, 'Must return timestamp');
    assert.ok(sigData.folder, 'Must return folder');
    assert.ok(sigData.publicId, 'Must return publicId');
    assert.ok(sigData.uploadUrl, 'Must return uploadUrl');
    assert.strictEqual(sigData.apiSecret, undefined, 'CRITICAL: Must NEVER expose apiSecret in response');

    // Test profile image URL update
    const imgUpdate = await passengerProfileService.updateProfileImage(testPassengerId, {
      imageUrl: 'https://res.cloudinary.com/demo/image/upload/v12345/passengers/avatars/sample.jpg',
      publicId: 'passengers/avatars/sample',
    });
    assert.ok(imgUpdate.profileImage.includes('cloudinary.com'));

    // Test profile image removal
    const imgRemove = await passengerProfileService.removeProfileImage(testPassengerId);
    assert.strictEqual(imgRemove.success, true);
    assert.strictEqual(imgRemove.profileImage, null);
  });

  // 6. Native Biometric Preference Registration & Session Tracking
  await runTest('6. Biometric preferences register device metadata and reflect in security query', async () => {
    const { passengerProfileService } = require(path.join(
      __dirname,
      '../backend/dist/modules/passengers/passengerProfile.service.js'
    ));

    const testPassengerId = 'e2e-test-passenger-001';

    // Enable biometric login
    const enableResult = await passengerProfileService.updateBiometricPreference(testPassengerId, {
      enabled: true,
      deviceId: 'device-iphone-15',
      deviceName: 'iPhone 15 Pro',
      biometricType: 'FACE_ID',
    });
    assert.strictEqual(enableResult.success, true);
    assert.strictEqual(enableResult.biometricEnabled, true);

    // Query security info
    const secInfo = await passengerProfileService.getSecurityInfo(testPassengerId);
    assert.strictEqual(secInfo.biometricEnabled, true);
    assert.ok(Array.isArray(secInfo.sessions), 'Sessions must be an array');

    // Disable biometric login
    const disableResult = await passengerProfileService.updateBiometricPreference(testPassengerId, {
      enabled: false,
    });
    assert.strictEqual(disableResult.success, true);
    assert.strictEqual(disableResult.biometricEnabled, false);
  });

  // 7. IDOR Protection in Controller
  await runTest('7. PassengerProfileController derives passengerId strictly from authenticated JWT token', () => {
    const controllerPath = path.join(
      __dirname,
      '../backend/src/modules/passengers/passengerProfile.controller.ts'
    );
    const controllerCode = fs.readFileSync(controllerPath, 'utf8');

    assert.ok(controllerCode.includes('this.getPassengerId(req)'), 'Must use getPassengerId');
    assert.ok(
      controllerCode.includes('(req as any).user?.sub') ||
      controllerCode.includes('(req as any).user?.userId'),
      'Must extract sub/userId from req.user'
    );
    assert.ok(
      !controllerCode.includes('req.body.passengerId') && !controllerCode.includes('req.params.passengerId'),
      'Must never trust client body or params for passengerId'
    );
  });

  // 8. Mobile App Biometric Service Implementation
  await runTest('8. Mobile BiometricAuthService implements capability checks, fallback label, and secure storage', () => {
    const bioServicePath = path.join(
      __dirname,
      '../apps/passenger-mobile/src/services/biometricAuth.service.ts'
    );
    assert.ok(fs.existsSync(bioServicePath), 'biometricAuth.service.ts must exist');
    const bioCode = fs.readFileSync(bioServicePath, 'utf8');

    assert.ok(bioCode.includes('LocalAuthentication.hasHardwareAsync()'), 'Must check hardware');
    assert.ok(bioCode.includes('LocalAuthentication.isEnrolledAsync()'), 'Must check enrollment');
    assert.ok(bioCode.includes('LocalAuthentication.authenticateAsync('), 'Must prompt native auth');
    assert.ok(bioCode.includes('fallbackLabel'), 'Must configure fallback label for PIN/passcode');
    assert.ok(bioCode.includes('enableBiometricLogin'), 'Must implement enableBiometricLogin');
    assert.ok(bioCode.includes('disableBiometricLogin'), 'Must implement disableBiometricLogin');
  });

  // 9. Mobile App Passenger Profile Service Implementation
  await runTest('9. Mobile PassengerProfileService supports direct signed Cloudinary upload & contact change OTP', () => {
    const profServicePath = path.join(
      __dirname,
      '../apps/passenger-mobile/src/services/passengerProfile.service.ts'
    );
    assert.ok(fs.existsSync(profServicePath), 'passengerProfile.service.ts must exist');
    const profCode = fs.readFileSync(profServicePath, 'utf8');

    assert.ok(profCode.includes('uploadProfilePicture'), 'Must implement uploadProfilePicture');
    assert.ok(profCode.includes('getCloudinaryUploadSignature'), 'Must request upload signature');
    assert.ok(profCode.includes('initiateContactChange'), 'Must implement initiateContactChange');
    assert.ok(profCode.includes('verifyContactChange'), 'Must implement verifyContactChange');
    assert.ok(profCode.includes('updateProfileImage'), 'Must implement updateProfileImage');
    assert.ok(profCode.includes('removeProfileImage'), 'Must implement removeProfileImage');
  });

  // 10. Profile Screen UI & SMS/Push Alert Toggle Removal
  await runTest('10. Profile Screen contains camera badge, editable personal info, and removes SMS/push alerts', () => {
    const profilePath = path.join(
      __dirname,
      '../apps/passenger-mobile/app/(tabs)/profile.tsx'
    );
    assert.ok(fs.existsSync(profilePath), 'profile.tsx must exist');
    const profileCode = fs.readFileSync(profilePath, 'utf8');

    // Camera badge & ImagePicker
    assert.ok(profileCode.includes('Camera'), 'Must display camera badge on avatar');
    assert.ok(profileCode.includes('launchImageLibraryAsync'), 'Must invoke image library picker');
    assert.ok(profileCode.includes('uploadProfilePicture'), 'Must call Cloudinary upload service');

    // Editable personal info
    assert.ok(profileCode.includes('editFullName'), 'Must have editable fullName');
    assert.ok(profileCode.includes('editCity'), 'Must have editable city');
    assert.ok(profileCode.includes('editEmergencyName'), 'Must have emergency contact name');
    assert.ok(profileCode.includes('editEmergencyPhone'), 'Must have emergency contact phone');

    // 2-step contact change
    assert.ok(profileCode.includes('startContactChange'), 'Must have contact change button');
    assert.ok(profileCode.includes('handleVerifyContactChange'), 'Must have OTP verify modal');

    // Biometrics toggle
    assert.ok(profileCode.includes('handleToggleBiometrics'), 'Must have biometric toggle handler');
    assert.ok(profileCode.includes('biometricLoginEnabled'), 'Must bind to biometricLoginEnabled');

    // SMS & push alerts toggles removal check
    assert.ok(
      !profileCode.includes('SMS & push alerts'),
      'CRITICAL: Must remove obsolete "SMS & push alerts" toggle row from Profile UI'
    );
    assert.ok(
      !profileCode.includes('smsReceiptsEnabled'),
      'CRITICAL: Must remove smsReceiptsEnabled from Profile UI'
    );
  });

  // 11. Welcome Screen Biometric App Re-Entry Integration
  await runTest('11. Welcome Screen provides one-tap passwordless biometric app re-entry', () => {
    const welcomePath = path.join(
      __dirname,
      '../apps/passenger-mobile/app/(auth)/welcome.tsx'
    );
    assert.ok(fs.existsSync(welcomePath), 'welcome.tsx must exist');
    const welcomeCode = fs.readFileSync(welcomePath, 'utf8');

    assert.ok(welcomeCode.includes('handleBiometricReentry'), 'Must have handleBiometricReentry');
    assert.ok(welcomeCode.includes('canBiometricUnlock'), 'Must check if biometric unlock is active');
    assert.ok(welcomeCode.includes('BiometricAuthService.authenticate'), 'Must authenticate user');
    assert.ok(welcomeCode.includes('biometricQuickBtn'), 'Must display biometric unlock button');
  });

  // 12. App.json Hardware Permissions & Expo Plugins
  await runTest('12. app.json includes expo-image-picker and expo-local-authentication plugins and permissions', () => {
    const appJsonPath = path.join(
      __dirname,
      '../apps/passenger-mobile/app.json'
    );
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

    assert.ok(appJson.expo.plugins.some((p) => Array.isArray(p) ? p[0] === 'expo-image-picker' : p === 'expo-image-picker'), 'expo-image-picker plugin must be registered');
    assert.ok(appJson.expo.plugins.some((p) => Array.isArray(p) ? p[0] === 'expo-local-authentication' : p === 'expo-local-authentication'), 'expo-local-authentication plugin must be registered');
    assert.ok(appJson.expo.ios.infoPlist.NSFaceIDUsageDescription, 'NSFaceIDUsageDescription must be set');
    assert.ok(appJson.expo.ios.infoPlist.NSPhotoLibraryUsageDescription, 'NSPhotoLibraryUsageDescription must be set');
  });

  // 13. Production Persistence Enforcement (Phase 7 Test 10)
  await runTest('13. In production mode, failed database writes reject with 503 and never return false success', async () => {
    const servicePath = path.join(__dirname, '../backend/dist/modules/passengers/passengerProfile.service.js');
    const { passengerProfileService } = require(servicePath);

    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    let failedWith503 = false;
    try {
      await passengerProfileService.updateProfile('prod-failure-test-id', {
        fullName: 'Should Fail Without DB',
      });
    } catch (err) {
      if (err.statusCode === 503 || err.message.includes('unavailable')) {
        failedWith503 = true;
      }
    } finally {
      process.env.NODE_ENV = prevEnv;
    }

    assert.ok(failedWith503, 'Failed DB write in production must throw 503 and never report false success');
  });

  console.log('\n--------------------------------------------------------------------------------');
  console.log(`  ACCEPTANCE TEST RESULTS: ${passedTests}/${totalTests} PASSED`);
  console.log('--------------------------------------------------------------------------------\n');

  if (failures.length > 0) {
    console.error('FAILED TESTS:');
    failures.forEach((f) => console.error(` - ${f.name}: ${f.error}`));
    process.exit(1);
  } else {
    console.log('🌟 ALL PASSENGER PROFILE, CLOUDINARY & BIOMETRIC ACCEPTANCE TESTS PASSED!\n');
    process.exit(0);
  }
}

runSuite().catch((err) => {
  console.error('Fatal test suite crash:', err);
  process.exit(1);
});
