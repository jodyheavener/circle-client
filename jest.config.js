module.exports = {
  clearMocks: true,
  moduleFileExtensions: ['js', 'ts'],
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  verbose: true,
  setupFiles: ['./setupJest.js'],
  reporters: [
    'default',
    ['jest-junit', { outputDirectory: 'artifacts/tests' }],
  ],
};
