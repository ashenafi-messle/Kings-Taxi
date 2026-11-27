const { getDefaultConfig } = require('expo/metro-config');
const fs = require('fs');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

if (!config.resolver.platforms.includes('web')) {
  config.resolver.platforms.push('web');
}

// Force CJS build for lucide-react-native (react-native field points to missing ESM file)
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'lucide-react-native') {
    const localCjs = path.resolve(projectRoot, 'node_modules/lucide-react-native/dist/cjs/lucide-react-native.js');
    const rootCjs = path.resolve(monorepoRoot, 'node_modules/lucide-react-native/dist/cjs/lucide-react-native.js');
    const filePath = fs.existsSync(localCjs) ? localCjs : rootCjs;
    if (fs.existsSync(filePath)) {
      return {
        filePath,
        type: 'sourceFile',
      };
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
