const request = require('supertest');

const { createApp } = require('../src/app');
const { describeIfDb, resetDb, getDb, closeDb } = require('./dbUtils');

describeIfDb('teams endpoints (db integration)', () => {
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

  test('owner can create team, add member; member cannot add members; list members works', async () => {
    const app = createApp();

    const u1 = await request(app).post('/auth/register').send({
      email: 'owner@example.com',
      name: 'Owner',
      password: 'password123',
    });

    const u2 = await request(app).post('/auth/register').send({
      email: 'member@example.com',
      name: 'Member',
      password: 'password123',
    });

    expect(u1.status).toBe(201);
    expect(u2.status).toBe(201);

    const teamRes = await request(app)
      .post('/teams')
      .set('Authorization', `Bearer ${u1.body.accessToken}`)
      .send({ name: 'Team A' });

    expect(teamRes.status).toBe(201);
    expect(teamRes.body.team.name).toBe('Team A');

    const teamId = teamRes.body.team.id;

    const listOwnerTeams = await request(app)
      .get('/teams')
      .set('Authorization', `Bearer ${u1.body.accessToken}`);

    expect(listOwnerTeams.status).toBe(200);
    expect(listOwnerTeams.body.teams.length).toBe(1);
    expect(listOwnerTeams.body.teams[0].team.id).toBe(teamId);
    expect(listOwnerTeams.body.teams[0].role).toBe('OWNER');

    const addMember = await request(app)
      .post(`/teams/${teamId}/members`)
      .set('Authorization', `Bearer ${u1.body.accessToken}`)
      .send({ userId: u2.body.user.id, role: 'MEMBER' });

    expect(addMember.status).toBe(201);
    expect(addMember.body.membership.user.email).toBe('member@example.com');
    expect(addMember.body.membership.role).toBe('MEMBER');

    const listMembers = await request(app)
      .get(`/teams/${teamId}/members`)
      .set('Authorization', `Bearer ${u1.body.accessToken}`);

    expect(listMembers.status).toBe(200);
    expect(listMembers.body.members.length).toBe(2);

    const memberAddAttempt = await request(app)
      .post(`/teams/${teamId}/members`)
      .set('Authorization', `Bearer ${u2.body.accessToken}`)
      .send({ userId: u1.body.user.id, role: 'MEMBER' });

    expect(memberAddAttempt.status).toBe(403);

    const listMemberTeams = await request(app)
      .get('/teams')
      .set('Authorization', `Bearer ${u2.body.accessToken}`);

    expect(listMemberTeams.status).toBe(200);
    expect(listMemberTeams.body.teams.length).toBe(1);
    expect(listMemberTeams.body.teams[0].team.id).toBe(teamId);
    expect(listMemberTeams.body.teams[0].role).toBe('MEMBER');
  });
});
