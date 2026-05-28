const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.transformer.minifierConfig = {
  compress: {
    unused: false,
  },
  mangle: false,
};

config.maxWorkers = 2;

module.exports = config;
