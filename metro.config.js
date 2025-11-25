const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add TypeScript support
config.resolver.sourceExts = [...config.resolver.sourceExts, 'tsx', 'ts', 'jsx', 'js'];

// Fix path aliases for @ imports
config.resolver.extraNodeModules = {
  '@': path.resolve(__dirname, './'),
};

module.exports = config;