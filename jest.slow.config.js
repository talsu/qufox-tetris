const baseConfig = require('./jest.config');

module.exports = {
  ...baseConfig,
  testPathIgnorePatterns: ['<rootDir>/test/e2e/'],
};
