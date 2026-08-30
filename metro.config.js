// Metro config minimal — satu alias penting: markdown-it (via
// react-native-markdown-display) mengimpor `punycode` (builtin Node yang tidak
// ada di React Native). Alias ke package npm `punycode` (pure JS) biar bundling
// jalan. Kalau tidak dibutuhkan lagi, file ini bisa dihapus.
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  punycode: require.resolve("punycode/"),
};

module.exports = config;