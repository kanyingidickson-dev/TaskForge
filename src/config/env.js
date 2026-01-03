function parsePort(value, fallback) {
  if (!value) return fallback;
  const port = Number.parseInt(value, 10);
  if (!Number.isFinite(port) || port <= 0 || port > 65535) {
    throw new Error(`invalid PORT: ${value}`);
  }
  return port;
}

function parseNodeEnv(value) {
  const nodeEnv = value || 'development';
  if (!['development', 'test', 'production'].includes(nodeEnv)) {
    throw new Error(`invalid NODE_ENV: ${nodeEnv}`);
  }
  return nodeEnv;
}

const nodeEnv = parseNodeEnv(process.env.NODE_ENV);

const env = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  port: parsePort(process.env.PORT, 3000),
  disableRateLimit: process.env.DISABLE_RATE_LIMIT === '1',
};

module.exports = { env };
