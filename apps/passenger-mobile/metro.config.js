// Learn more https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Monorepo root and project root configuration
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all relevant directories across the workspace
config.watchFolders = [monorepoRoot];

// 2. Resolve modules from both local and root node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// 3. Ensure 'web' platform is registered so Metro indexes and resolves .web.js, .web.ts, and .web.tsx extensions
if (!config.resolver.platforms.includes('web')) {
  config.resolver.platforms.push('web');
}

// 4. Force CJS builds for packages whose 'react-native' / 'module' fields
//    point to ESM files that Metro cannot resolve bare imports from.
//
//    socket.io-client v4.x: "module" field → ESM build with bare "./manager.js"
//    imports that Metro cannot handle. Force CJS entry instead.
//
//    lucide-react-native v0.469+: "react-native" field → dist/esm/lucide-react-native.js
//    which does NOT exist in the installed package (only CJS dist exists).
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'socket.io-client') {
    return {
      filePath: path.resolve(projectRoot, 'node_modules/socket.io-client/build/cjs/index.js'),
      type: 'sourceFile',
    };
  }
  if (moduleName === 'lucide-react-native') {
    return {
      filePath: path.resolve(projectRoot, 'node_modules/lucide-react-native/dist/cjs/lucide-react-native.js'),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

