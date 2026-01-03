const http = require('http');
const { createApp } = require('./app');
const { env } = require('./config/env');
const { disconnectPrisma } = require('./db/prisma');
const { initRealtimeServer } = require('./realtime/realtimeServer');
const { logger } = require('./utils/logger');

const app = createApp();
const server = http.createServer(app);
const realtime = initRealtimeServer(server);

server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

server.listen(env.port, () => {
  logger.info({ port: env.port }, 'server listening');
});

function shutdown(signal) {
  logger.info({ signal }, 'shutdown started');

  realtime.close();

  server.close((err) => {
    if (err) {
      logger.error({ err }, 'shutdown error');
      process.exitCode = 1;
    }

    disconnectPrisma()
      .catch((disconnectErr) => {
        logger.error({ err: disconnectErr }, 'shutdown error');
        process.exitCode = 1;
      })
      .finally(() => {
        logger.info('shutdown complete');
        process.exit();
      });
  });

  setTimeout(() => {
    logger.error('force shutdown');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
