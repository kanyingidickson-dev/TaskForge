const request = require('supertest');

const { createApp } = require('../src/app');
const { describeIfDb, resetDb, getDb, closeDb } = require('./dbUtils');

describeIfDb('comments endpoints (db integration)', () => {
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

  test('team member can create and list comments on a task', async () => {
    const app = createApp();

    const owner = await request(app).post('/auth/register').send({
      email: 'owner-comments@example.com',
      name: 'Owner',
      password: 'password123',
    });

    const member = await request(app).post('/auth/register').send({
      email: 'member-comments@example.com',
      name: 'Member',
      password: 'password123',
    });

    const teamRes = await request(app)
      .post('/teams')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Team Comments' });

    const teamId = teamRes.body.team.id;

    await request(app)
      .post(`/teams/${teamId}/members`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ userId: member.body.user.id, role: 'MEMBER' });

    const createTask = await request(app)
      .post(`/teams/${teamId}/tasks`)
      .set('Authorization', `Bearer ${member.body.accessToken}`)
      .send({ title: 'Task with comments' });

    const taskId = createTask.body.task.id;

    const createComment = await request(app)
      .post(`/teams/${teamId}/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${member.body.accessToken}`)
      .send({ body: 'First comment' });

    expect(createComment.status).toBe(201);
    expect(createComment.body.comment.body).toBe('First comment');
    expect(createComment.body.comment.author.email).toBe('member-comments@example.com');

    const listComments = await request(app)
      .get(`/teams/${teamId}/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`);

    expect(listComments.status).toBe(200);
    expect(listComments.body.comments.length).toBe(1);
    expect(listComments.body.comments[0].body).toBe('First comment');
  });

  test('only author or admin/owner can delete a comment', async () => {
    const app = createApp();

    const owner = await request(app).post('/auth/register').send({
      email: 'owner-delete-comment@example.com',
      name: 'Owner',
      password: 'password123',
    });

    const author = await request(app).post('/auth/register').send({
      email: 'author-comment@example.com',
      name: 'Author',
      password: 'password123',
    });

    const otherMember = await request(app).post('/auth/register').send({
      email: 'other-member-comment@example.com',
      name: 'Other',
      password: 'password123',
    });

    const admin = await request(app).post('/auth/register').send({
      email: 'admin-comment@example.com',
      name: 'Admin',
      password: 'password123',
    });

    const teamRes = await request(app)
      .post('/teams')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Team Delete Comments' });

    const teamId = teamRes.body.team.id;

    await request(app)
      .post(`/teams/${teamId}/members`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ userId: author.body.user.id, role: 'MEMBER' });

    await request(app)
      .post(`/teams/${teamId}/members`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ userId: otherMember.body.user.id, role: 'MEMBER' });

    await request(app)
      .post(`/teams/${teamId}/members`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ userId: admin.body.user.id, role: 'ADMIN' });

    const createTask = await request(app)
      .post(`/teams/${teamId}/tasks`)
      .set('Authorization', `Bearer ${author.body.accessToken}`)
      .send({ title: 'Task for delete' });

    const taskId = createTask.body.task.id;

    const created = await request(app)
      .post(`/teams/${teamId}/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${author.body.accessToken}`)
      .send({ body: 'Deletable comment' });

    const commentId = created.body.comment.id;

    const deleteAsOtherMember = await request(app)
      .delete(`/teams/${teamId}/tasks/${taskId}/comments/${commentId}`)
      .set('Authorization', `Bearer ${otherMember.body.accessToken}`);

    expect(deleteAsOtherMember.status).toBe(403);
    expect(deleteAsOtherMember.body).toMatchObject({
      error: { code: 'FORBIDDEN' },
    });

    const deleteAsAdmin = await request(app)
      .delete(`/teams/${teamId}/tasks/${taskId}/comments/${commentId}`)
      .set('Authorization', `Bearer ${admin.body.accessToken}`);

    expect(deleteAsAdmin.status).toBe(204);

    const listAfterDelete = await request(app)
      .get(`/teams/${teamId}/tasks/${taskId}/comments`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`);

    expect(listAfterDelete.status).toBe(200);
    expect(listAfterDelete.body.comments.length).toBe(0);
  });
});
