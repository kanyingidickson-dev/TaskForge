const request = require('supertest');

const { createApp } = require('../src/app');

describe('routes', () => {
  test('GET / returns welcome text', async () => {
    const app = createApp();
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toBe('Welcome to TaskForge!');
  });

  test('GET /health returns ok', async () => {
    const app = createApp();
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  test('unknown route returns 404', async () => {
    const app = createApp();
    const res = await request(app).get('/nope');
    expect(res.status).toBe(404);
  });
});
