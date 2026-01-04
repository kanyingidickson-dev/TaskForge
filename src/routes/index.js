const express = require('express');
const path = require('path');

const { authRoutes } = require('./auth');
const { meRoutes } = require('./me');
const { teamsRoutes } = require('./teams');
const { getOpenApiSpec } = require('../openapi');

const routes = express.Router();

const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');

const ROOT_BODY = 'Welcome to TaskForge!';
const ROOT_ETAG = 'W/"15-E9IrSfED/8Fp4SZP9LZB6ui+Ndg"';
const ROOT_CONTENT_LENGTH = Buffer.byteLength(ROOT_BODY, 'utf8');

routes.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

routes.get('/docs', (req, res) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; script-src 'self' https://unpkg.com; style-src 'self' https://unpkg.com 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data: https:; connect-src 'self' ws: wss:"
  );
  res.status(200);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.sendFile(path.join(PUBLIC_DIR, 'docs.html'));
});

routes.get('/app', (req, res) => {
  res.status(200);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.sendFile(path.join(PUBLIC_DIR, 'app.html'));
});

routes.get('/openapi.json', (req, res) => {
  const host = req.get('host');
  const origin = host ? `${req.protocol}://${host}` : undefined;
  res.status(200).json(getOpenApiSpec({ origin }));
});

routes.get('/', (req, res) => {
  const accept = typeof req.headers.accept === 'string' ? req.headers.accept : '';
  if (accept.includes('text/html')) {
    res.status(200);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
  }

  if (req.headers['if-none-match'] === ROOT_ETAG) {
    res.status(304);
    res.setHeader('ETag', ROOT_ETAG);
    return res.end();
  }

  res.status(200);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Length', ROOT_CONTENT_LENGTH);
  res.setHeader('ETag', ROOT_ETAG);
  return res.end(ROOT_BODY);
});

routes.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

routes.use('/auth', authRoutes);
routes.use(meRoutes);
routes.use('/teams', teamsRoutes);

module.exports = { routes };
