const request = require('supertest');

const { createApp } = require('../src/app');
const { describeIfDb, resetDb, getDb, closeDb } = require('./dbUtils');

describeIfDb('auth endpoints (db integration)', () => {
  let prisma;

  beforeAll(async () => {
    prisma = await getDb();
  });

  beforeEach(async () => {
    await resetDb(prisma);
  });

  afterAll(async () => {
    await closeDb();
  });

  test('register -> me -> refresh rotation -> logout revokes', async () => {
    const app = createApp();

    const registerRes = await request(app).post('/auth/register').send({
      email: 'user1@example.com',
      name: 'User 1',
      password: 'password123',
    });

    expect(registerRes.status).toBe(201);
    expect(registerRes.body.user.email).toBe('user1@example.com');
    expect(typeof registerRes.body.accessToken).toBe('string');
    expect(typeof registerRes.body.refreshToken).toBe('string');

    const meRes = await request(app)
      .get('/me')
      .set('Authorization', `Bearer ${registerRes.body.accessToken}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.email).toBe('user1@example.com');

    const refresh1 = await request(app).post('/auth/refresh').send({
      refreshToken: registerRes.body.refreshToken,
    });

    expect(refresh1.status).toBe(200);
    expect(typeof refresh1.body.accessToken).toBe('string');
    expect(typeof refresh1.body.refreshToken).toBe('string');

    const refreshReuseOld = await request(app).post('/auth/refresh').send({
      refreshToken: registerRes.body.refreshToken,
    });

    expect(refreshReuseOld.status).toBe(401);

    const logout = await request(app).post('/auth/logout').send({
      refreshToken: refresh1.body.refreshToken,
    });

    expect(logout.status).toBe(204);

    const refreshAfterLogout = await request(app).post('/auth/refresh').send({
      refreshToken: refresh1.body.refreshToken,
    });

    expect(refreshAfterLogout.status).toBe(401);
  });
});
