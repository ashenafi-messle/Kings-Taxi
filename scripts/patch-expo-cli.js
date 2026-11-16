/**
 * Kings Taxi — Expo CLI Windows / Offline Stability Patch
 *
 * Resolves:
 * 1. TypeError: Body is unusable: Body has already been read in @expo/cli
 * 2. EPERM: operation not permitted on Windows when creating/reading ~/.expo cache
 * 3. Fallback to local expo/bundledNativeModules.json when Expo remote API or network is unavailable
 */

const fs = require('fs');
const path = require('path');

function patchFile(relativePath, search, replace) {
  const filePath = path.join(__dirname, '..', relativePath);
  if (!fs.existsSync(filePath)) return false;
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes(replace)) return true; // Already patched
  if (content.includes(search)) {
    content = content.replace(search, replace);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`[Patch] Successfully patched ${relativePath}`);
    return true;
  }
  return false;
}

function run() {
  console.log('[Patch] Applying Kings Taxi Expo CLI stability patches...');

  // 1. bundledNativeModules.js fallback
  patchFile(
    'node_modules/@expo/cli/build/src/start/doctor/dependencies/bundledNativeModules.js',
    `        } catch (error) {
            if (error instanceof _errors.CommandError && (error.code === "OFFLINE" || error.code === "API")) {
                _log.warn((0, _chalk().default)\`Unable to reach well-known versions endpoint. Using local dependency map {bold expo/bundledNativeModules.json} for version validation\`);
            } else {
                throw error;
            }
        }`,
    `        } catch (error) {
            _log.warn((0, _chalk().default)\`Unable to reach well-known versions endpoint. Using local dependency map {bold expo/bundledNativeModules.json} for version validation\`);
        }`
  );

  // 2. wrapFetchWithCache.js - clone response before cache stream consumption & avoid identifier collisions
  const wrapFetchPath = path.join(__dirname, '..', 'node_modules/@expo/cli/build/src/api/rest/cache/wrapFetchWithCache.js');
  if (fs.existsSync(wrapFetchPath)) {
    let wrapContent = fs.readFileSync(wrapFetchPath, 'utf8');
    if (!wrapContent.includes('let storedResponse = null;')) {
      const targetRegex = /\/\/ Execute the fetch request[\s\S]*?return new \(_undici\(\)\)\.Response\([^;]+\);/;
      const replacement = `// Execute the fetch request
            const response = await fetch(url, init);
            if (!response.ok || !response.body) {
                return response;
            }
            let bodyForCache = response.body;
            let responseToReturn = response;
            if (typeof response.clone === "function") {
                try {
                    const cloned = response.clone();
                    bodyForCache = cloned.body;
                } catch {}
            }
            // Cache the response using an isolated identifier
            let storedResponse = null;
            try {
                storedResponse = await cache.set(cacheKey, {
                    body: bodyForCache,
                    info: (0, _responseCache.getResponseInfo)(response)
                });
            } catch (err) {
                debug(\`Failed to cache response for: \${url}\`, err);
            }
            // Warn through debug logs that caching failed
            if (!storedResponse) {
                debug(\`Failed to cache response for: \${url}\`);
                try { await cache.remove(cacheKey); } catch {}
                return responseToReturn;
            }
            // Return the cached response
            return new (_undici()).Response(storedResponse.body, storedResponse.info);`;

      if (targetRegex.test(wrapContent)) {
        wrapContent = wrapContent.replace(targetRegex, replacement);
        fs.writeFileSync(wrapFetchPath, wrapContent, 'utf8');
        console.log('[Patch] Successfully patched wrapFetchWithCache.js with isolated storedResponse');
      }
    }
  }

  // 3. UserSettings.js - try/catch in getAnonymousId
  patchFile(
    'node_modules/@expo/cli/build/src/api/user/UserSettings.js',
    `function getAnonymousId() {
    const settings = getSettings();
    let id = settings.get("uuid", null);
    if (!id) {
        id = _crypto().default.randomUUID();
        settings.set("uuid", id);
    }
    return id;
}`,
    `function getAnonymousId() {
    try {
        const settings = getSettings();
        let id = settings.get("uuid", null);
        if (!id) {
            id = _crypto().default.randomUUID();
            try {
                settings.set("uuid", id);
            } catch {}
        }
        return id;
    } catch {
        return _crypto().default.randomUUID();
    }
}`
  );

  console.log('[Patch] Expo CLI stability patches applied.');
}

run();

