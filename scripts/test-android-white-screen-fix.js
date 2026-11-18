/**
 * Kings Taxi — Android APK White-Screen Bug Permanent Fix Verification
 *
 * Verifies all root-cause remedies across the passenger mobile app:
 * 1. ZERO deprecated SafeAreaView imports from 'react-native'
 * 2. ErrorBoundary component created, luxury styled, and wrapping root Stack in app/_layout.tsx
 * 3. KingsTaxiBrandShowcase style validation (no pointerEvents in style, safe animation loops)
 * 4. Network service platform guard on navigator.onLine
 * 5. Set-password navigation and session state synchronization
 * 6. HomeScreen new-user profile resilience and safe-area context
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('👑 [Kings Taxi] Running Android White-Screen Root-Cause Fix Verification...\n');

let passCount = 0;
let failCount = 0;

function check(testName, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${testName}`);
    passCount++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${testName}`);
    console.error(`     Reason: ${err.message}\n`);
    failCount++;
  }
}

// ----------------------------------------------------------------------------
// Test 1: Zero deprecated SafeAreaView from 'react-native'
// ----------------------------------------------------------------------------
check('No deprecated SafeAreaView imported from react-native across passenger-mobile', () => {
  const badFiles = [];
  function scanDir(dir) {
    const list = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of list) {
      const full = path.join(dir, item.name);
      if (item.isDirectory()) {
        if (item.name !== 'node_modules' && item.name !== '.expo' && item.name !== '.git' && item.name !== 'dist') {
          scanDir(full);
        }
      } else if (item.name.endsWith('.tsx') || item.name.endsWith('.ts')) {
        const content = fs.readFileSync(full, 'utf8');
        const match = content.match(/import\s*\{[^}]*SafeAreaView[^}]*\}\s*from\s*['"]react-native['"]/);
        if (match) {
          badFiles.push(full);
        }
      }
    }
  }

  scanDir('apps/passenger-mobile');
  assert.strictEqual(
    badFiles.length,
    0,
    `Found ${badFiles.length} files importing SafeAreaView from 'react-native':\n${badFiles.join('\n')}`
  );
});

// ----------------------------------------------------------------------------
// Test 2: ErrorBoundary exists and is integrated into root _layout.tsx
// ----------------------------------------------------------------------------
check('ErrorBoundary component exists and is imported and wrapping Stack in app/_layout.tsx', () => {
  const ebPath = path.resolve('apps/passenger-mobile/src/components/common/ErrorBoundary.tsx');
  assert(fs.existsSync(ebPath), 'ErrorBoundary.tsx must exist');

  const ebContent = fs.readFileSync(ebPath, 'utf8');
  assert(ebContent.includes('class ErrorBoundary extends Component'), 'ErrorBoundary class must exist');
  assert(ebContent.includes('Reload Home'), 'Must offer Reload Home action');
  assert(ebContent.includes('Welcome Screen'), 'Must offer Welcome Screen action');

  const layoutPath = path.resolve('apps/passenger-mobile/app/_layout.tsx');
  const layoutContent = fs.readFileSync(layoutPath, 'utf8');
  assert(layoutContent.includes('ErrorBoundary'), 'app/_layout.tsx must import ErrorBoundary');
  assert(layoutContent.includes('<ErrorBoundary>'), 'app/_layout.tsx must wrap tree in <ErrorBoundary>');
  assert(layoutContent.includes('export { ErrorBoundary }'), 'app/_layout.tsx must export ErrorBoundary for Expo Router');
});

// ----------------------------------------------------------------------------
// Test 3: KingsTaxiBrandShowcase fixes (no pointerEvents in style, safe animations)
// ----------------------------------------------------------------------------
check('KingsTaxiBrandShowcase has no pointerEvents in styles and safe animation timing', () => {
  const showcasePath = path.resolve('apps/passenger-mobile/src/components/KingsTaxiBrandShowcase.tsx');
  const content = fs.readFileSync(showcasePath, 'utf8');

  // Must not have pointerEvents in styles
  assert(!content.includes("pointerEvents: 'none'"), 'Must not have pointerEvents in style object');
  assert(content.includes('pointerEvents="none"'), 'Must have pointerEvents as JSX prop');

  // Must not have 0ms timing in native animated loop
  assert(!content.includes('duration: 0,\n          useNativeDriver: true'), 'Must not have 0ms native driver duration');
  assert(content.includes('useNativeDriver: true'), 'Preserves native driver for transforms');
  assert(content.includes('try {'), 'startAnimations must be wrapped in try/catch');
});

// ----------------------------------------------------------------------------
// Test 4: Network service browser globals guard
// ----------------------------------------------------------------------------
check('Network service guards navigator.onLine for Hermes on Android', () => {
  const netPath = path.resolve('apps/passenger-mobile/src/services/network.service.ts');
  const content = fs.readFileSync(netPath, 'utf8');

  assert(content.includes("typeof navigator !== 'undefined'"), 'Must guard navigator before property access');
});

// ----------------------------------------------------------------------------
// Test 5: set-password.tsx navigation and session sync (NO arbitrary timeouts)
// ----------------------------------------------------------------------------
check('set-password.tsx synchronizes session cleanly without arbitrary setTimeout delays', () => {
  const spPath = path.resolve('apps/passenger-mobile/app/(auth)/set-password.tsx');
  const content = fs.readFileSync(spPath, 'utf8');

  assert(content.includes('completeRegistrationWithPassword('), 'Must call completeRegistrationWithPassword');
  assert(!content.includes("setTimeout(() => {\n        router.replace('/(tabs)');"), 'Must not have arbitrary setTimeout wrapping router.replace');
  assert(content.includes("router.replace('/(tabs)')"), 'Must replace to /(tabs)');
});

// ----------------------------------------------------------------------------
// Test 5b: TabsLayout and RootLayout layout wrapper validation
// ----------------------------------------------------------------------------
check('TabsLayout and RootLayout enforce flex: 1 and sceneStyle on Android Fabric', () => {
  const tabsLayoutPath = path.resolve('apps/passenger-mobile/app/(tabs)/_layout.tsx');
  const tabsContent = fs.readFileSync(tabsLayoutPath, 'utf8');
  assert(tabsContent.includes('sceneStyle: { flex: 1'), 'TabsLayout must specify sceneStyle flex: 1');
  assert(tabsContent.includes('tabLayoutWrapper'), 'TabsLayout must wrap tree in tabLayoutWrapper');

  const rootLayoutPath = path.resolve('apps/passenger-mobile/app/_layout.tsx');
  const rootContent = fs.readFileSync(rootLayoutPath, 'utf8');
  assert(rootContent.includes('contentStyle: { flex: 1'), 'RootLayout Stack must enforce flex: 1 in contentStyle');

  const indexPath = path.resolve('apps/passenger-mobile/app/index.tsx');
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  assert(indexContent.includes('isAuthenticated && token && user'), 'Root index.tsx must check authentication state before deciding route');
});

// ----------------------------------------------------------------------------
// Test 6: HomeScreen new-passenger resilience and safe-area context
// ----------------------------------------------------------------------------
check('HomeScreen has safe-area context, new-account null checks, and ErrorBoundary resilience', () => {
  const homePath = path.resolve('apps/passenger-mobile/app/(tabs)/index.tsx');
  const content = fs.readFileSync(homePath, 'utf8');

  assert(content.includes("from 'react-native-safe-area-context'"), 'HomeScreen must import from react-native-safe-area-context');
  assert(content.includes('avatarInitial'), 'HomeScreen must safely compute avatar initial');
  assert(content.includes('fetchRideHistory().catch('), 'fetchRideHistory must handle unhandled rejection');
  assert(content.includes("edges={['top', 'left', 'right']}"), 'SafeAreaView must specify safe edges');
});

// ----------------------------------------------------------------------------
// Summary
// ----------------------------------------------------------------------------
console.log('\n============================================================');
console.log(`Results: ${passCount} Passed, ${failCount} Failed`);
console.log('============================================================');

if (failCount > 0) {
  process.exit(1);
}
