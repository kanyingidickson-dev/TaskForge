const request = require('supertest');

const { createApp } = require('../src/app');
const { signAccessToken } = require('../src/auth/jwt');

describe('comments endpoints (db-less behavior)', () => {
  test('GET /teams/:teamId/tasks/:taskId/comments returns UNAUTHORIZED when missing Authorization header', async () => {
    const app = createApp();

    const res = await request(app).get(
      '/teams/00000000-0000-0000-0000-000000000001/tasks/00000000-0000-0000-0000-000000000002/comments'
    );

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Unauthorized',
      },
    });
  });

  test('GET /teams/:teamId/tasks/:taskId/comments returns DB_NOT_CONFIGURED when token is valid but DB is missing', async () => {
    const app = createApp();

    const accessToken = signAccessToken({
      userId: '00000000-0000-0000-0000-000000000001',
    });

    const res = await request(app)
      .get('/teams/00000000-0000-0000-0000-000000000001/tasks/00000000-0000-0000-0000-000000000002/comments')
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
