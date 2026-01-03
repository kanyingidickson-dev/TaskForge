const request = require('supertest');

const { createApp } = require('../src/app');
const { signAccessToken } = require('../src/auth/jwt');

describe('auth endpoints', () => {
  test('POST /auth/register returns VALIDATION_ERROR for invalid body', async () => {
    const app = createApp();

    const res = await request(app).post('/auth/register').send({
      email: 'not-an-email',
      name: '',
      password: 'short',
    });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation Error',
        details: {
          location: 'body',
        },
      },
    });
  });

  test('POST /auth/register returns DB_NOT_CONFIGURED when DB is missing', async () => {
    const app = createApp();

    const res = await request(app).post('/auth/register').send({
      email: 'user@example.com',
      name: 'User',
      password: 'password123',
    });

    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({
      error: {
        code: 'DB_NOT_CONFIGURED',
        message: 'Database is not configured',
      },
    });
  });

  test('GET /me returns UNAUTHORIZED when missing Authorization header', async () => {
    const app = createApp();

    const res = await request(app).get('/me');

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Unauthorized',
      },
    });
  });

  test('GET /me returns DB_NOT_CONFIGURED when DB is missing but token is valid', async () => {
    const app = createApp();

    const accessToken = signAccessToken({
      userId: '00000000-0000-0000-0000-000000000001',
    });

    const res = await request(app)
      .get('/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({
      error: {
        code: 'DB_NOT_CONFIGURED',
        message: 'Database is not configured',
      },
    });
  });
});
