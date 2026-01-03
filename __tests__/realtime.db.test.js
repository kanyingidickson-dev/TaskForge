const http = require('http');
const WebSocket = require('ws');
const request = require('supertest');

const { createApp } = require('../src/app');
const { initRealtimeServer } = require('../src/realtime/realtimeServer');
const { describeIfDb, resetDb, getDb, closeDb } = require('./dbUtils');

describeIfDb('realtime (db integration)', () => {
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

  test('subscribed websocket client receives activity event after HTTP mutation', async () => {
    const app = createApp();
    const server = http.createServer(app);
    const realtime = initRealtimeServer(server);

    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', resolve);
    });

    const address = server.address();
    const port = address.port;

    try {
      const owner = await request(app).post('/auth/register').send({
        email: 'owner-realtime@example.com',
        name: 'Owner',
        password: 'password123',
      });

      const teamRes = await request(app)
        .post('/teams')
        .set('Authorization', `Bearer ${owner.body.accessToken}`)
        .send({ name: 'Team Realtime' });

      const teamId = teamRes.body.team.id;

      const ws = new WebSocket(`ws://127.0.0.1:${port}/realtime?token=${owner.body.accessToken}`);

      await new Promise((resolve, reject) => {
        ws.once('open', resolve);
        ws.once('error', reject);
      });

      const messages = [];
      ws.on('message', (raw) => {
        try {
          messages.push(JSON.parse(raw.toString('utf8')));
        } catch {
          messages.push({ type: 'parse_error' });
        }
      });

      ws.send(JSON.stringify({ type: 'subscribe', teamId }));

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('subscribe timeout')), 2000);
        const interval = setInterval(() => {
          if (messages.some((m) => m.type === 'subscribed' && m.teamId === teamId)) {
            clearTimeout(timeout);
            clearInterval(interval);
            resolve();
          }
        }, 10);
      });

      const createTask = await request(app)
        .post(`/teams/${teamId}/tasks`)
        .set('Authorization', `Bearer ${owner.body.accessToken}`)
        .send({ title: 'Realtime task' });

      expect(createTask.status).toBe(201);

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('activity timeout')), 3000);
        const interval = setInterval(() => {
          const activityMsg = messages.find((m) => m.type === 'activity');
          if (activityMsg && activityMsg.activity && activityMsg.activity.teamId === teamId) {
            clearTimeout(timeout);
            clearInterval(interval);
            resolve();
          }
        }, 10);
      });

      ws.close();
    } finally {
      realtime.close();
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
