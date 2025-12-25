const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { requestId } = require('./middleware/requestId');
const { securityHeaders } = require('./middleware/securityHeaders');
const { notFound } = require('./middleware/notFound');
const { errorHandler } = require('./middleware/errorHandler');
const { routes } = require('./routes');

function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 300,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  app.use(requestId());
  app.use(securityHeaders());

  app.use(express.json({ limit: '1mb' }));

  app.use(routes);

  app.use(notFound());
  app.use(errorHandler());

  return app;
}

module.exports = { createApp };
