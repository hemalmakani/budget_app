/* eslint-env node */
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, {
  // Specify the path to your global.css for NativeWind
  input: "./global.css",
  // You may need to configure additional options here
  // Check the documentation for further customization if needed
  resolver: {
    ...config.resolver,
    sourceExts: [...config.resolver.sourceExts, "mjs"],
  },
});
