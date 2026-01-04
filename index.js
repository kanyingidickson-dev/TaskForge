/**
 * Legacy minimal server.
 *
 * NOTE: The current TaskForge implementation lives under `src/` and the real
 * entry point is `src/server.js` (see `package.json`). This file is kept only
 * for historical reference.
 */

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  next();
});

const ROOT_BODY = 'Welcome to TaskForge!';
const ROOT_ETAG = 'W/"15-E9IrSfED/8Fp4SZP9LZB6ui+Ndg"';
const ROOT_CONTENT_LENGTH = Buffer.byteLength(ROOT_BODY, 'utf8');

app.get('/', (req, res) => {
  if (req.headers['if-none-match'] === ROOT_ETAG) {
    res.status(304);
    res.setHeader('ETag', ROOT_ETAG);
    return res.end();
  }

  res.status(200);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Length', ROOT_CONTENT_LENGTH);
  res.setHeader('ETag', ROOT_ETAG);
  return res.end(ROOT_BODY);
});

const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;
