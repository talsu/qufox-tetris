module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testPathIgnorePatterns: [
    '<rootDir>/test/e2e/',
    '<rootDir>/test/unit/logic/botManager.simulation.test.ts'
  ],
  moduleNameMapper: {
    '^phaser$': '<rootDir>/test/mocks/phaserMock.ts',
    '^src/(.*)$': '<rootDir>/src/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
};
