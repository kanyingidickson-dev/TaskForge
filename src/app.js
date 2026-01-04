/**
 * Express application factory.
 *
 * Responsibilities:
 * - Configure security middleware (Helmet + custom headers)
 * - Apply optional rate limiting in production
 * - Serve static assets and register API routes
 * - Install not-found and error handlers (must be last)
 */

const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { env } = require('./config/env');
const { requestId } = require('./middleware/requestId');
const { securityHeaders } = require('./middleware/securityHeaders');
const { notFound } = require('./middleware/notFound');
const { errorHandler } = require('./middleware/errorHandler');
const { routes } = require('./routes');

function createApp() {
  const app = express();

  app.disable('x-powered-by');

  // NOTE: Required when running behind a reverse proxy so Express derives the
  // correct client IP (affects rate limiting and audit logs).
  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          "script-src": ["'self'"],
          "style-src": ["'self'", "'unsafe-inline'"],
          "img-src": ["'self'", 'data:', 'https:'],
          "font-src": ["'self'", 'data:', 'https:'],
          // NOTE: Allows the browser client to open WebSocket connections.
          "connect-src": ["'self'", 'ws:', 'wss:'],
        },
      },
    })
  );

  // NOTE: Enabled only in production by default to keep local development fast
  // and to reduce surprises behind proxies.
  const rateLimitEnabled = !env.disableRateLimit && env.isProduction;

  if (rateLimitEnabled) {
    app.use(
      rateLimit({
        windowMs: 60_000,
        limit: 300,
        standardHeaders: true,
        legacyHeaders: false,
      })
    );
  }

  app.use(requestId());
  app.use(securityHeaders());

  app.use('/static', express.static(path.join(__dirname, '..', 'public')));

  app.use(express.json({ limit: '1mb' }));

  app.use(routes);

  app.use(notFound());
  app.use(errorHandler());

  return app;
}

module.exports = { createApp };
