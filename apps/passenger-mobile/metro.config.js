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

module.exports = config;

