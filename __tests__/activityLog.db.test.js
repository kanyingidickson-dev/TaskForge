const request = require('supertest');

const { createApp } = require('../src/app');
const { describeIfDb, resetDb, getDb, closeDb } = require('./dbUtils');

describeIfDb('activity log write-path (db integration)', () => {
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

  test('writes activity rows for team, membership, task, and comment mutations', async () => {
    const app = createApp();

    const owner = await request(app).post('/auth/register').send({
      email: 'owner-activity@example.com',
      name: 'Owner',
      password: 'password123',
    });

    const member = await request(app).post('/auth/register').send({
      email: 'member-activity@example.com',
      name: 'Member',
      password: 'password123',
    });

    const teamRes = await request(app)
      .post('/teams')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Team Activity' });

    const teamId = teamRes.body.team.id;

    await request(app)
      .post(`/teams/${teamId}/members`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ userId: member.body.user.id, role: 'MEMBER' });

    await request(app)
      .patch(`/teams/${teamId}/members/${member.body.user.id}`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ role: 'ADMIN' });

    const taskRes = await request(app)
      .post(`/teams/${teamId}/tasks`)
      .set('Authorization', `Bearer ${member.body.accessToken}`)
      .send({ title: 'Task Activity' });

    const taskId = taskRes.body.task.id;

    await request(app)
      .patch(`/teams/${teamId}/tasks/${taskId}`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ status: 'DONE' });

    const commentRes = await request(app)
      .post(`/teams/${teamId}/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${member.body.accessToken}`)
      .send({ body: 'Comment Activity' });

    const commentId = commentRes.body.comment.id;

    await request(app)
      .delete(`/teams/${teamId}/tasks/${taskId}/comments/${commentId}`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`);

    await request(app)
      .delete(`/teams/${teamId}/members/${member.body.user.id}`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`);

    const logs = await prisma.activityLog.findMany({
      where: { teamId },
      orderBy: { createdAt: 'asc' },
    });

    const hasTeamCreated = logs.some(
      (l) => l.entityType === 'TEAM' && l.action === 'CREATED' && l.actorUserId === owner.body.user.id
    );

    const hasMembershipCreated = logs.some(
      (l) =>
        l.entityType === 'MEMBERSHIP' &&
        l.action === 'CREATED' &&
        l.actorUserId === owner.body.user.id &&
        l.data &&
        l.data.userId === member.body.user.id
    );

    const hasMembershipUpdated = logs.some(
      (l) =>
        l.entityType === 'MEMBERSHIP' &&
        l.action === 'UPDATED' &&
        l.actorUserId === owner.body.user.id &&
        l.data &&
        l.data.roleTo === 'ADMIN'
    );

    const hasTaskCreated = logs.some(
      (l) => l.entityType === 'TASK' && l.action === 'CREATED' && l.actorUserId === member.body.user.id
    );

    const hasTaskUpdated = logs.some(
      (l) => l.entityType === 'TASK' && l.action === 'UPDATED' && l.actorUserId === owner.body.user.id
    );

    const hasCommented = logs.some(
      (l) =>
        l.entityType === 'COMMENT' &&
        l.action === 'COMMENTED' &&
        l.actorUserId === member.body.user.id &&
        l.entityId === commentId
    );

    const hasCommentDeleted = logs.some(
      (l) =>
        l.entityType === 'COMMENT' &&
        l.action === 'DELETED' &&
        l.actorUserId === owner.body.user.id &&
        l.entityId === commentId
    );

    const hasMembershipDeleted = logs.some(
      (l) =>
        l.entityType === 'MEMBERSHIP' &&
        l.action === 'DELETED' &&
        l.actorUserId === owner.body.user.id &&
        l.data &&
        l.data.userId === member.body.user.id
    );

    expect(hasTeamCreated).toBe(true);
    expect(hasMembershipCreated).toBe(true);
    expect(hasMembershipUpdated).toBe(true);
    expect(hasTaskCreated).toBe(true);
    expect(hasTaskUpdated).toBe(true);
    expect(hasCommented).toBe(true);
    expect(hasCommentDeleted).toBe(true);
    expect(hasMembershipDeleted).toBe(true);
  });
});
