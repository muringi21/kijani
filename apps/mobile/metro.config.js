const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Let Metro resolve monorepo packages
config.watchFolders = [path.resolve(__dirname, "../../packages")];

module.exports = config;