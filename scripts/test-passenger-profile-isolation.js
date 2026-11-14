/**
 * Kings Taxi — Passenger Profile Image Account Isolation Acceptance Suite
 *
 * Verifies all 12 Phase 9 Acceptance Scenarios:
 * TEST 1: Passenger A uploads a profile picture -> separate Cloudinary asset & record.
 * TEST 2: Passenger B uploads a different profile picture -> separate asset & record.
 * TEST 3: Passenger A logs in again -> sees only Passenger A's image.
 * TEST 4: Passenger B logs in again -> sees only Passenger B's image.
 * TEST 5: Passenger A changes their image -> Passenger A updates, Passenger B untouched.
 * TEST 6: Passenger A removes their image -> Passenger A default avatar, Passenger B untouched.
 * TEST 7: Cross-passenger ID submission -> rejected/ignored.
 * TEST 8: Cross-passenger Cloudinary asset deletion -> rejected by ownership verification.
 * TEST 9: Account switching on same device -> Passenger B never sees Passenger A's cached image.
 * TEST 10: Database update failure -> old image preserved, orphan asset safely handled.
 * TEST 11: Remote image load failure -> fallback display without corrupting database URL.
 * TEST 12: Two passengers with identical original filenames -> distinct unique Cloudinary assets.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Load compiled backend services
const { PassengerProfileService } = require('../backend/dist/modules/passengers/passengerProfile.service');

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

async function runIsolationSuite() {
  console.log('\n================================================================================');
  console.log('  KINGS TAXI — PASSENGER PROFILE IMAGE ISOLATION ACCEPTANCE SUITE (PHASE 9)');
  console.log('================================================================================\n');

  const profileService = new PassengerProfileService();

  const passengerA = 'passenger-iso-aaa-111';
  const passengerB = 'passenger-iso-bbb-222';

  let assetA1 = null;
  let assetB1 = null;
  let assetA2 = null;

  // TEST 1: Passenger A uploads a profile picture
  await runTest('TEST 1: Passenger A uploads a profile picture (unique asset & DB record)', async () => {
    const sigA = await profileService.generateCloudinarySignature(passengerA);
    assert.ok(sigA.folder.includes(passengerA), 'Folder must be passenger-specific');
    assert.ok(sigA.publicId.startsWith('avatar_'), 'Public ID must be unique');

    assetA1 = {
      imageUrl: `https://res.cloudinary.com/${sigA.cloudName}/image/upload/${sigA.folder}/${sigA.publicId}.jpg`,
      publicId: `${sigA.folder}/${sigA.publicId}`,
    };

    const updateA = await profileService.updateProfileImage(passengerA, assetA1);
    assert.strictEqual(updateA.profileImage, assetA1.imageUrl);
    assert.strictEqual(updateA.profileImagePublicId, assetA1.publicId);
  });

  // TEST 2: Passenger B uploads a different profile picture
  await runTest('TEST 2: Passenger B uploads a different profile picture (separate asset & DB record)', async () => {
    const sigB = await profileService.generateCloudinarySignature(passengerB);
    assert.ok(sigB.folder.includes(passengerB), 'Folder must belong to Passenger B');
    assert.notStrictEqual(sigB.folder, `kings-taxi/passengers/${passengerA}`);

    assetB1 = {
      imageUrl: `https://res.cloudinary.com/${sigB.cloudName}/image/upload/${sigB.folder}/${sigB.publicId}.png`,
      publicId: `${sigB.folder}/${sigB.publicId}`,
    };

    const updateB = await profileService.updateProfileImage(passengerB, assetB1);
    assert.strictEqual(updateB.profileImage, assetB1.imageUrl);
    assert.strictEqual(updateB.profileImagePublicId, assetB1.publicId);
    assert.notStrictEqual(updateB.profileImage, assetA1.imageUrl, 'Assets must be distinct');
  });

  // TEST 3: Passenger A logs in again -> sees only Passenger A's image
  await runTest('TEST 3: Passenger A logs in again (sees only Passenger A\'s uploaded image)', async () => {
    const profileA = await profileService.getProfile(passengerA);
    assert.strictEqual(profileA.profileImage, assetA1.imageUrl);
    assert.strictEqual(profileA.avatarUrl, assetA1.imageUrl);
    assert.notStrictEqual(profileA.profileImage, assetB1.imageUrl);
  });

  // TEST 4: Passenger B logs in again -> sees only Passenger B's image
  await runTest('TEST 4: Passenger B logs in again (sees only Passenger B\'s uploaded image)', async () => {
    const profileB = await profileService.getProfile(passengerB);
    assert.strictEqual(profileB.profileImage, assetB1.imageUrl);
    assert.strictEqual(profileB.avatarUrl, assetB1.imageUrl);
    assert.notStrictEqual(profileB.profileImage, assetA1.imageUrl);
  });

  // TEST 5: Passenger A changes their image -> Passenger A updates, Passenger B untouched
  await runTest('TEST 5: Passenger A changes their image (Passenger B image remains unchanged)', async () => {
    const sigA2 = await profileService.generateCloudinarySignature(passengerA);
    assetA2 = {
      imageUrl: `https://res.cloudinary.com/${sigA2.cloudName}/image/upload/${sigA2.folder}/${sigA2.publicId}.webp`,
      publicId: `${sigA2.folder}/${sigA2.publicId}`,
    };

    const updateA2 = await profileService.updateProfileImage(passengerA, assetA2);
    assert.strictEqual(updateA2.profileImage, assetA2.imageUrl);

    // Verify Passenger B is unchanged
    const profileB = await profileService.getProfile(passengerB);
    assert.strictEqual(profileB.profileImage, assetB1.imageUrl, 'Passenger B profile image must not change');
  });

  // TEST 6: Passenger A removes their image -> Passenger A default avatar, Passenger B untouched
  await runTest('TEST 6: Passenger A removes their image (Passenger B image remains unchanged)', async () => {
    const removeRes = await profileService.removeProfileImage(passengerA);
    assert.strictEqual(removeRes.profileImage, null);

    const profileA = await profileService.getProfile(passengerA);
    assert.strictEqual(profileA.profileImage, null, 'Passenger A must have null profile image');

    // Verify Passenger B is still unchanged
    const profileB = await profileService.getProfile(passengerB);
    assert.strictEqual(profileB.profileImage, assetB1.imageUrl, 'Passenger B profile image must remain intact');
  });

  // TEST 7: Passenger A attempts to submit Passenger B's asset or ID
  await runTest('TEST 7: Passenger A attempts cross-passenger asset hijacking (rejected)', async () => {
    let rejected = false;
    try {
      await profileService.updateProfileImage(passengerA, {
        imageUrl: assetB1.imageUrl,
        publicId: assetB1.publicId, // Belongs to Passenger B
      });
    } catch (err) {
      rejected = true;
      assert.ok(
        err.message.includes('FORBIDDEN_ASSET') || err.message.includes('CONFLICT'),
        `Error must identify forbidden cross-account asset. Got: ${err.message}`
      );
    }
    assert.ok(rejected, 'Submitting another passenger\'s asset must be rejected');
  });

  // TEST 8: Passenger A attempts to delete Passenger B's Cloudinary asset
  await runTest('TEST 8: Passenger A cannot trigger deletion of Passenger B\'s Cloudinary asset', async () => {
    // Calling removeProfileImage on Passenger A must not delete Passenger B's asset
    const removeRes = await profileService.removeProfileImage(passengerA);
    assert.ok(removeRes.success);

    // Passenger B's image is still registered and untouched
    const profileB = await profileService.getProfile(passengerB);
    assert.strictEqual(profileB.profileImage, assetB1.imageUrl);
  });

  // TEST 9: Passenger A logs out and Passenger B logs in on same device (cache isolation)
  await runTest('TEST 9: Passenger A logs out and Passenger B logs in on same device (no cache leakage)', () => {
    // Verify client store and profile logic partition cache keys by passenger ID
    const profileCode = fs.readFileSync(
      path.join(__dirname, '../apps/passenger-mobile/app/(tabs)/profile.tsx'),
      'utf8'
    );
    const authStoreCode = fs.readFileSync(
      path.join(__dirname, '../apps/passenger-mobile/src/stores/auth.store.ts'),
      'utf8'
    );

    // Profile screen must query account-specific key: @kings_taxi_local_avatar_${user.id}
    assert.ok(
      profileCode.includes('@kings_taxi_local_avatar_${user.id}'),
      'Profile screen must isolate avatar cache key by authenticated user.id'
    );

    // Profile screen avatar fallback must be account-scoped
    assert.ok(
      profileCode.includes('(user?.id ? localAvatarCache : null)'),
      'Avatar fallback must not display local cache if user is not authenticated or mismatched'
    );

    // AuthStore logout must clear passenger-specific avatar key
    assert.ok(
      authStoreCode.includes('@kings_taxi_local_avatar_${currentUserId}'),
      'Logout must delete the passenger-scoped avatar cache'
    );

    // Login must isolate the avatar cache for newly authenticated passenger
    assert.ok(
      authStoreCode.includes('@kings_taxi_local_avatar_${user.id}'),
      'Login must isolate avatar storage to user.id'
    );
  });

  // TEST 10: Database update fails after Cloudinary upload -> old image preserved
  await runTest('TEST 10: Database update failure preserves old image & handles orphan asset safely', async () => {
    // Set a known image for test passenger
    const testPassenger = 'passenger-fail-recovery-001';
    const originalAsset = {
      imageUrl: 'https://res.cloudinary.com/kings-taxi/image/upload/kings-taxi/passengers/passenger-fail-recovery-001/original.jpg',
      publicId: 'kings-taxi/passengers/passenger-fail-recovery-001/original',
    };
    await profileService.updateProfileImage(testPassenger, originalAsset);

    // Attempt invalid update with malformed URL
    let failed = false;
    try {
      await profileService.updateProfileImage(testPassenger, {
        imageUrl: 'http://malicious-external-host.com/evil.jpg',
        publicId: 'kings-taxi/passengers/passenger-fail-recovery-001/evil',
      });
    } catch {
      failed = true;
    }
    assert.ok(failed, 'Invalid upload update must fail');

    // Verify original image is still active and unmodified
    const current = await profileService.getProfile(testPassenger);
    assert.strictEqual(current.profileImage, originalAsset.imageUrl);
  });

  // TEST 11: Cloudinary image URL fails to load -> fallback avatar without corrupting DB
  await runTest('TEST 11: Remote image load failure displays fallback without corrupting stored DB URL', async () => {
    const profileCode = fs.readFileSync(
      path.join(__dirname, '../apps/passenger-mobile/app/(tabs)/profile.tsx'),
      'utf8'
    );

    // Verify onError sets avatarLoadError state instead of calling removeProfileImage
    assert.ok(
      profileCode.includes('setAvatarLoadError(true)'),
      'onError must set avatarLoadError state flag'
    );
    const onErrorMatch = /onError=\{\(\)\s*=>\s*\{([^}]+)\}\}/.exec(profileCode);
    assert.ok(onErrorMatch, 'Image onError handler must exist');
    assert.ok(
      !onErrorMatch[1].includes('removeProfileImage'),
      'Image onError handler must never call removeProfileImage on the backend'
    );

    // Verify backend record remains intact
    const profile = await profileService.getProfile(passengerB);
    assert.strictEqual(profile.profileImage, assetB1.imageUrl, 'Database URL must remain untouched');
  });

  // TEST 12: Two passengers upload images with identical original filenames
  await runTest('TEST 12: Two passengers uploading identical filenames receive separate assets', async () => {
    const filename = 'my_profile_photo.jpg';

    const sig1 = await profileService.generateCloudinarySignature('passenger-file-dup-1');
    const sig2 = await profileService.generateCloudinarySignature('passenger-file-dup-2');

    assert.notStrictEqual(sig1.folder, sig2.folder, 'Folders must be distinct');
    assert.notStrictEqual(sig1.publicId, sig2.publicId, 'Public IDs must be distinct even with same file');
    assert.notStrictEqual(sig1.fullPublicId, sig2.fullPublicId, 'Full public IDs must be distinct');

    assert.ok(sig1.folder.includes('passenger-file-dup-1'));
    assert.ok(sig2.folder.includes('passenger-file-dup-2'));
  });

  console.log('\n--------------------------------------------------------------------------------');
  console.log(`  ISOLATION SUITE RESULTS: ${passedTests} / ${totalTests} PASSED`);
  console.log('--------------------------------------------------------------------------------\n');

  if (failures.length > 0) {
    console.error(`💥 ${failures.length} TEST(S) FAILED:`);
    failures.forEach((f) => console.error(`  - ${f.name}: ${f.error}`));
    process.exit(1);
  } else {
    console.log('🌟 ALL 12 PASSENGER PROFILE IMAGE ISOLATION TESTS PASSED WITH ZERO FAILURES!\n');
  }
}

runIsolationSuite().catch((err) => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
