const fs = require('fs');
const path = require('path');

const localesDir = path.resolve(__dirname, '../apps/passenger-mobile/src/i18n/locales');
const languages = ['en', 'am', 'om'];
const namespaces = [
  'common',
  'navigation',
  'auth',
  'home',
  'transportation',
  'hotels',
  'heritage',
  'bookings',
  'payments',
  'profile',
  'notifications',
  'validation',
];

function getKeys(obj, prefix = '') {
  let keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys = keys.concat(getKeys(value, fullKey));
    } else {
      keys.push({ key: fullKey, value });
    }
  }
  return keys;
}

function extractInterpolations(str) {
  if (typeof str !== 'string') return [];
  const matches = str.match(/{{([^{}]+)}}/g) || [];
  return matches.map((m) => m.replace(/[{}]/g, '').trim()).sort();
}

console.log('=== KINGS TAXI I18N LOCALIZATION AUDIT ===');
console.log(`Locales directory: ${localesDir}`);
console.log(`Languages: ${languages.join(', ')}`);
console.log(`Namespaces: ${namespaces.join(', ')}\n`);

let totalKeysCount = 0;
let errorsFound = 0;

for (const ns of namespaces) {
  const enFilePath = path.join(localesDir, 'en', `${ns}.json`);
  if (!fs.existsSync(enFilePath)) {
    console.error(`[ERROR] Missing base English file: en/${ns}.json`);
    errorsFound++;
    continue;
  }

  const enContent = JSON.parse(fs.readFileSync(enFilePath, 'utf8'));
  const enKeys = getKeys(enContent);
  totalKeysCount += enKeys.length;

  for (const lang of ['am', 'om']) {
    const targetFilePath = path.join(localesDir, lang, `${ns}.json`);
    if (!fs.existsSync(targetFilePath)) {
      console.error(`[ERROR] Missing target file: ${lang}/${ns}.json`);
      errorsFound++;
      continue;
    }

    const targetContent = JSON.parse(fs.readFileSync(targetFilePath, 'utf8'));
    const targetKeys = getKeys(targetContent);

    const enKeyMap = new Map(enKeys.map((k) => [k.key, k.value]));
    const targetKeyMap = new Map(targetKeys.map((k) => [k.key, k.value]));

    // Check for missing keys in target
    for (const [key, enVal] of enKeyMap.entries()) {
      if (!targetKeyMap.has(key)) {
        console.error(`[MISSING KEY] [${lang}] Namespace: "${ns}", Key: "${key}"`);
        errorsFound++;
      } else {
        const targetVal = targetKeyMap.get(key);
        if (targetVal === '' || targetVal === null || targetVal === undefined) {
          console.error(`[EMPTY VALUE] [${lang}] Namespace: "${ns}", Key: "${key}"`);
          errorsFound++;
        }

        // Check interpolation variables
        const enInterps = extractInterpolations(enVal);
        const targetInterps = extractInterpolations(targetVal);
        if (JSON.stringify(enInterps) !== JSON.stringify(targetInterps)) {
          console.error(
            `[INTERPOLATION MISMATCH] [${lang}] Namespace: "${ns}", Key: "${key}"\n` +
              `  Expected: [${enInterps.join(', ')}]\n` +
              `  Found:    [${targetInterps.join(', ')}]`
          );
          errorsFound++;
        }
      }
    }

    // Check for surplus keys in target not in en
    for (const key of targetKeyMap.keys()) {
      if (!enKeyMap.has(key)) {
        console.error(`[SURPLUS KEY] [${lang}] Namespace: "${ns}", Key: "${key}" (not found in en)`);
        errorsFound++;
      }
    }
  }
}

console.log(`\nAudit completed:`);
console.log(`- Total namespaces checked: ${namespaces.length}`);
console.log(`- Unique base translation keys per language: ${totalKeysCount}`);
console.log(`- Total translated strings across 3 languages: ${totalKeysCount * 3}`);
console.log(`- Errors / discrepancies found: ${errorsFound}`);

if (errorsFound > 0) {
  console.error('\n>>> AUDIT FAILED! Please resolve the missing or mismatched keys above.');
  process.exit(1);
} else {
  console.log('\n>>> AUDIT PASSED! 100% key parity and interpolation integrity verified across EN, AM, and OM.');
  process.exit(0);
}

