const request = require('supertest');

const { createApp } = require('../src/app');

describe('routes', () => {
  test('GET / returns welcome text', async () => {
    const app = createApp();
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toBe('Welcome to TaskForge!');
  });

  test('GET / returns HTML for browsers', async () => {
    const app = createApp();
    const res = await request(app).get('/').set('Accept', 'text/html');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toMatch(/TaskForge/);
  });

  test('GET /favicon.ico returns 204', async () => {
    const app = createApp();
    const res = await request(app).get('/favicon.ico');
    expect(res.status).toBe(204);
  });

  test('GET /health returns ok', async () => {
    const app = createApp();
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  test('GET /docs returns HTML', async () => {
    const app = createApp();
    const res = await request(app).get('/docs');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
  });

  test('GET /openapi.json returns OpenAPI spec', async () => {
    const app = createApp();
    const res = await request(app).get('/openapi.json');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ openapi: '3.0.3' });
  });

  test('unknown route returns 404', async () => {
    const app = createApp();
    const res = await request(app).get('/nope');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({
      error: {
        code: 'NOT_FOUND',
        message: 'Not Found',
      },
    });
    expect(typeof res.body.error.requestId).toBe('string');
    expect(res.body.error.requestId.length).toBeGreaterThan(0);
  });
});
