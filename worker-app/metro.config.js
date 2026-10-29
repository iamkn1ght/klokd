// Metro config — Expo defaults plus one redirect.
//
// @kmv/helpan-console (v0.2.3) points React Native at its TypeScript source,
// whose imports use Node-style ".js" endings (./types.js → types.ts). Metro
// can't resolve those, so bundling fails. The package also ships a prebuilt
// ESM copy (lib/module) with real .js files and compiled JSX: use that.
// Remove once the Console fixes its "react-native" entry (reported to Helpan).
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const consoleEntry = path.join(__dirname, 'node_modules', '@kmv', 'helpan-console', 'lib', 'module', 'index.js');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@kmv/helpan-console') return { type: 'sourceFile', filePath: consoleEntry };
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
