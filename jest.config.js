const config = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
};

if (process.env.DATABASE_URL) {
  config.maxWorkers = 1;
}

module.exports = config;
