const express = require('express');

const routes = express.Router();

routes.get('/', (req, res) => {
  res.status(200).type('text/plain').send('Welcome to TaskForge!');
});

routes.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

module.exports = { routes };
