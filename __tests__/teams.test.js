const request = require('supertest');

const { createApp } = require('../src/app');
const { signAccessToken } = require('../src/auth/jwt');

describe('teams endpoints (db-less behavior)', () => {
  test('GET /teams returns UNAUTHORIZED when missing Authorization header', async () => {
    const app = createApp();

    const res = await request(app).get('/teams');

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Unauthorized',
      },
    });
  });

  test('GET /teams returns DB_NOT_CONFIGURED when token is valid but DB is missing', async () => {
    const app = createApp();

    const accessToken = signAccessToken({
      userId: '00000000-0000-0000-0000-000000000001',
    });

    const res = await request(app)
      .get('/teams')
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
