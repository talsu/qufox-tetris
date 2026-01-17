module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  moduleNameMapper: {
    '^phaser$': '<rootDir>/test/mocks/phaserMock.ts',
    '^src/(.*)$': '<rootDir>/src/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
};
