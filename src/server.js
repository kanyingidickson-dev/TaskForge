const http = require('http');
const { createApp } = require('./app');
const { logger } = require('./utils/logger');

const port = Number.parseInt(process.env.PORT, 10) || 3000;

const app = createApp();
const server = http.createServer(app);

server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

server.listen(port, () => {
  logger.info({ port }, 'server listening');
});

function shutdown(signal) {
  logger.info({ signal }, 'shutdown started');

  server.close((err) => {
    if (err) {
      logger.error({ err }, 'shutdown error');
      process.exitCode = 1;
    }

    logger.info('shutdown complete');
    process.exit();
  });

  setTimeout(() => {
    logger.error('force shutdown');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
