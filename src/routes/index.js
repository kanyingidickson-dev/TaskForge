const express = require('express');

const routes = express.Router();

const ROOT_BODY = 'Welcome to TaskForge!';
const ROOT_ETAG = 'W/"15-E9IrSfED/8Fp4SZP9LZB6ui+Ndg"';
const ROOT_CONTENT_LENGTH = Buffer.byteLength(ROOT_BODY, 'utf8');

routes.get('/', (req, res) => {
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

module.exports = { routes };
