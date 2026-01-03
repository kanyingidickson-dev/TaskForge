function parsePort(value, fallback) {
  if (!value) return fallback;
  const port = Number.parseInt(value, 10);
  if (!Number.isFinite(port) || port <= 0 || port > 65535) {
    throw new Error(`invalid PORT: ${value}`);
  }
  return port;
}

function parsePositiveInt(value, fallback, name) {
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`invalid ${name}: ${value}`);
  }
  return n;
}

function parseNodeEnv(value) {
  const nodeEnv = value || 'development';
  if (!['development', 'test', 'production'].includes(nodeEnv)) {
    throw new Error(`invalid NODE_ENV: ${nodeEnv}`);
  }
  return nodeEnv;
}

const nodeEnv = parseNodeEnv(process.env.NODE_ENV);

function requireSecret(name, testFallback) {
  const value = process.env[name];
  if (value) return value;

  if (nodeEnv === 'test') {
    return testFallback;
  }

  throw new Error(`${name} is required`);
}

const env = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  port: parsePort(process.env.PORT, 3000),
  disableRateLimit: process.env.DISABLE_RATE_LIMIT === '1',
  databaseUrl: process.env.DATABASE_URL,

  jwtAccessSecret: requireSecret('JWT_ACCESS_SECRET', 'test-access-secret'),
  jwtRefreshSecret: requireSecret('JWT_REFRESH_SECRET', 'test-refresh-secret'),
  jwtAccessTtlSeconds: parsePositiveInt(
    process.env.JWT_ACCESS_TTL_SECONDS,
    15 * 60,
    'JWT_ACCESS_TTL_SECONDS'
  ),
  jwtRefreshTtlSeconds: parsePositiveInt(
    process.env.JWT_REFRESH_TTL_SECONDS,
    7 * 24 * 60 * 60,
    'JWT_REFRESH_TTL_SECONDS'
  ),
};

module.exports = { env };
