const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

/** @type {import('jest').Config} */
const config = {
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1', '^@kaptan/shared(.*)$': '<rootDir>/../shared$1' },
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/'],
};

module.exports = createJestConfig(config);
