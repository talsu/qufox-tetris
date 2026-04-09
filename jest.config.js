module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testPathIgnorePatterns: [
    '<rootDir>/test/e2e/',
    '<rootDir>/test/performance/'
  ],
  moduleNameMapper: {
    '^phaser$': '<rootDir>/test/mocks/phaserMock.ts',
    '^src/(.*)$': '<rootDir>/src/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  coverageThreshold: {
    global: {
      lines: 70,
      branches: 60,
      functions: 60,
      statements: 70
    }
  },
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html']
};
