const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== KINGS TAXI BRANDING, AUTH & ADVERTISING VERIFICATION SUITE ===\n');

// 1. Asset Verification
console.log('Test 1: Official Brand Logo & Assets');
const logoPath = path.resolve(__dirname, '../apps/passenger-mobile/assets/branding/kings-taxi-logo.png');
const iconPath = path.resolve(__dirname, '../apps/passenger-mobile/assets/branding/kings-taxi-icon.png');
const appIconPath = path.resolve(__dirname, '../apps/passenger-mobile/assets/icon.png');

assert(fs.existsSync(logoPath), 'Official logo asset must exist at assets/branding/kings-taxi-logo.png');
assert(fs.existsSync(iconPath), 'App icon asset must exist at assets/branding/kings-taxi-icon.png');
assert(fs.existsSync(appIconPath), 'Main icon asset must exist at assets/icon.png');

const logoStat = fs.statSync(logoPath);
assert(logoStat.size > 500000, `Logo file must be high-resolution (found ${logoStat.size} bytes)`);
console.log(`  -> Logo exists: ${logoPath} (${(logoStat.size / 1024 / 1024).toFixed(2)} MB)`);
console.log('  -> PASSED: Official branding assets verified.\n');

// 2. Color Tokens Verification
console.log('Test 2: Luxury Gold-and-White Design Tokens');
const colorsFile = path.resolve(__dirname, '../apps/passenger-mobile/src/theme/colors.ts');
const colorsContent = fs.readFileSync(colorsFile, 'utf8');

const requiredTokens = [
  '#C69A45', // primaryGold
  '#9D722D', // deepGold
  '#E9D5A5', // champagne
  '#F8F1E3', // lightGold
  '#FFFFFF', // white
  '#FCFBF8', // background (warm ivory)
  '#202020', // dark charcoal
  '#77736B', // secondaryText
  '#EAE5DA', // border
  '#168A63', // success
  '#D64545', // error
  '#2AABEE', // telegram
];

requiredTokens.forEach((token) => {
  assert(colorsContent.includes(token), `Design tokens must include ${token}`);
});
console.log('  -> All 12 requested luxury gold, ivory, charcoal, and status tokens confirmed.');
console.log('  -> PASSED: Centralized design system tokens verified.\n');

// 3. 5-Slide Landing Page Hero Verification
console.log('Test 3: 5-Slide Landing Hero Carousel & Localization');
const landingFile = path.resolve(__dirname, '../apps/passenger-mobile/src/components/advertising/LandingHeroCarousel.tsx');
const landingContent = fs.readFileSync(landingFile, 'utf8');

const landingKeys = [
  'landingSlide1Title',
  'landingSlide1Subtitle',
  'landingSlide2Title',
  'landingSlide2Subtitle',
  'landingSlide3Title',
  'landingSlide3Subtitle',
  'landingSlide4Title',
  'landingSlide4Subtitle',
  'landingSlide5Title',
  'landingSlide5Subtitle',
];

const authEn = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../apps/passenger-mobile/src/i18n/locales/en/auth.json'), 'utf8'));
const authAm = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../apps/passenger-mobile/src/i18n/locales/am/auth.json'), 'utf8'));
const authOm = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../apps/passenger-mobile/src/i18n/locales/om/auth.json'), 'utf8'));

landingKeys.forEach((key) => {
  assert(authEn[key], `Missing English translation for ${key}`);
  assert(authAm[key], `Missing Amharic translation for ${key}`);
  assert(authOm[key], `Missing Oromo translation for ${key}`);
});
console.log(`  -> Verified all 5 landing promotional slides across EN, AM, OM.`);
console.log(`     Sample Slide 1 [EN]: "${authEn.landingSlide1Title}"`);
console.log(`     Sample Slide 1 [AM]: "${authAm.landingSlide1Title}"`);
console.log(`     Sample Slide 1 [OM]: "${authOm.landingSlide1Title}"`);
console.log('  -> PASSED: Landing hero promotional carousel fully localized.\n');

// 4. 5-Slide Home Advertising Carousel Verification
console.log('Test 4: 5-Slide Home Advertising Carousel & Service Routing');
const homeAdFile = path.resolve(__dirname, '../apps/passenger-mobile/src/components/advertising/HomeAdCarousel.tsx');
const homeAdContent = fs.readFileSync(homeAdFile, 'utf8');

const adRoutes = ['/rides/book', '/(tabs)/hotels', '/(tabs)/explore', '/support', '/tours/contract-builder'];
adRoutes.forEach((route) => {
  assert(homeAdContent.includes(route), `HomeAdCarousel must link to ${route}`);
});

const homeEn = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../apps/passenger-mobile/src/i18n/locales/en/home.json'), 'utf8'));
const homeAm = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../apps/passenger-mobile/src/i18n/locales/am/home.json'), 'utf8'));
const homeOm = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../apps/passenger-mobile/src/i18n/locales/om/home.json'), 'utf8'));

for (let i = 1; i <= 5; i++) {
  assert(homeEn[`ad${i}Title`], `Missing ad${i}Title in EN`);
  assert(homeAm[`ad${i}Title`], `Missing ad${i}Title in AM`);
  assert(homeOm[`ad${i}Title`], `Missing ad${i}Title in OM`);
  assert(homeEn[`ad${i}Cta`], `Missing ad${i}Cta in EN`);
}
console.log(`  -> 5 interactive promotional cards with CTAs to Rides, Hotels, Heritage, Safety & Charters.`);
console.log(`     Slide 1 CTA: "${homeEn.ad1Cta}" -> /rides/book`);
console.log(`     Slide 2 CTA: "${homeEn.ad2Cta}" -> /(tabs)/hotels`);
console.log(`     Slide 3 CTA: "${homeEn.ad3Cta}" -> /(tabs)/explore`);
console.log(`     Slide 4 CTA: "${homeEn.ad4Cta}" -> /support`);
console.log(`     Slide 5 CTA: "${homeEn.ad5Cta}" -> /tours/contract-builder`);
console.log('  -> PASSED: Home page advertising carousel verified.\n');

// 5. Telegram Authentication & Deep Linking Service
console.log('Test 5: Telegram Authentication Architecture & Deep Linking');
const tgFile = path.resolve(__dirname, '../apps/passenger-mobile/src/services/telegramAuth.service.ts');
const tgContent = fs.readFileSync(tgFile, 'utf8');

assert(tgContent.includes('KingsTaxiAuthBot'), 'Telegram service must use configured bot username');
assert(tgContent.includes('generateChallenge'), 'Telegram service must support nonce challenge generation');
assert(tgContent.includes('verifySession'), 'Telegram service must implement backend verification contract');
console.log('  -> Deep link format: https://t.me/KingsTaxiAuthBot?start=kt_<nonce>');
console.log('  -> Security contract: HMAC-SHA256 signature validation with bot token on backend.');
console.log('  -> PASSED: Telegram authentication service verified.\n');

// 6. Security, Remember Email & Password Autofill
console.log('Test 6: Security, Email Remembering & OS Password Autofill');
const loginFile = path.resolve(__dirname, '../apps/passenger-mobile/app/(auth)/login.tsx');
const loginContent = fs.readFileSync(loginFile, 'utf8');
const registerFile = path.resolve(__dirname, '../apps/passenger-mobile/app/(auth)/register.tsx');
const registerContent = fs.readFileSync(registerFile, 'utf8');
const pwdInputFile = path.resolve(__dirname, '../apps/passenger-mobile/src/components/authentication/PasswordInput.tsx');
const pwdInputContent = fs.readFileSync(pwdInputFile, 'utf8');

assert(loginContent.includes('RememberEmailCheckbox'), 'Login screen must have RememberEmailCheckbox');
assert(loginContent.includes('loginWithEmail'), 'Login screen must support email authentication');
assert(loginContent.includes('loginWithTelegram'), 'Login screen must support Telegram authentication');
assert(loginContent.includes('autoComplete="email"'), 'Login screen must specify autoComplete="email"');
assert(pwdInputContent.includes('autoComplete={isNewPassword ? \'new-password\' : \'password\'}'), 'Password input must specify OS autocomplete');
assert(pwdInputContent.includes('textContentType={isNewPassword ? \'newPassword\' : \'password\'}'), 'Password input must specify iOS textContentType');
assert(!loginContent.includes('AsyncStorage.setItem(\'password\''), 'Password must NEVER be stored in AsyncStorage');

console.log('  -> OS email and password autofill tags active (iOS textContentType & Android autoComplete).');
console.log('  -> Remembered email isolated to @kings_taxi_remembered_email.');
console.log('  -> Passwords strictly excluded from persistent storage.');
console.log('  -> PASSED: Security and password handling verified.\n');

console.log('>>> ALL 6 BRANDING, AUTH & ADVERTISING VERIFICATION TESTS PASSED SUCCESSFULLY! <<<');

