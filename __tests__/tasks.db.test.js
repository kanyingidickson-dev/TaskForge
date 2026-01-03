const request = require('supertest');

const { createApp } = require('../src/app');
const { describeIfDb, resetDb, getDb, closeDb } = require('./dbUtils');

describeIfDb('tasks endpoints (db integration)', () => {
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

  test('team member can create, list, and update a task', async () => {
    const app = createApp();

    const owner = await request(app).post('/auth/register').send({
      email: 'owner-tasks@example.com',
      name: 'Owner',
      password: 'password123',
    });

    const member = await request(app).post('/auth/register').send({
      email: 'member-tasks@example.com',
      name: 'Member',
      password: 'password123',
    });

    const teamRes = await request(app)
      .post('/teams')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Team Tasks' });

    const teamId = teamRes.body.team.id;

    await request(app)
      .post(`/teams/${teamId}/members`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ userId: member.body.user.id, role: 'MEMBER' });

    const createTask = await request(app)
      .post(`/teams/${teamId}/tasks`)
      .set('Authorization', `Bearer ${member.body.accessToken}`)
      .send({ title: 'First task' });

    expect(createTask.status).toBe(201);
    expect(createTask.body.task.title).toBe('First task');
    expect(createTask.body.task.status).toBe('TODO');
    expect(createTask.body.task.priority).toBe('MEDIUM');
    expect(createTask.body.task.createdBy.email).toBe('member-tasks@example.com');

    const taskId = createTask.body.task.id;

    const listTasks = await request(app)
      .get(`/teams/${teamId}/tasks`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`);

    expect(listTasks.status).toBe(200);
    expect(listTasks.body.tasks.length).toBe(1);
    expect(listTasks.body.tasks[0].id).toBe(taskId);

    const updateTask = await request(app)
      .patch(`/teams/${teamId}/tasks/${taskId}`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ status: 'DONE', priority: 'HIGH' });

    expect(updateTask.status).toBe(200);
    expect(updateTask.body.task.status).toBe('DONE');
    expect(updateTask.body.task.priority).toBe('HIGH');
  });

  test('cannot create or assign tasks to users who are not in the team', async () => {
    const app = createApp();

    const owner = await request(app).post('/auth/register').send({
      email: 'owner-assign@example.com',
      name: 'Owner',
      password: 'password123',
    });

    const outsider = await request(app).post('/auth/register').send({
      email: 'outsider@example.com',
      name: 'Outsider',
      password: 'password123',
    });

    const teamRes = await request(app)
      .post('/teams')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Team Assign' });

    const teamId = teamRes.body.team.id;

    const createTask = await request(app)
      .post(`/teams/${teamId}/tasks`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ title: 'Task', assigneeUserId: outsider.body.user.id });

    expect(createTask.status).toBe(400);
    expect(createTask.body).toMatchObject({
      error: {
        code: 'ASSIGNEE_NOT_IN_TEAM',
        message: 'Assignee must be a member of the team',
      },
    });

    const createUnassigned = await request(app)
      .post(`/teams/${teamId}/tasks`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ title: 'Task 2' });

    const taskId = createUnassigned.body.task.id;

    const assignAttempt = await request(app)
      .patch(`/teams/${teamId}/tasks/${taskId}`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ assigneeUserId: outsider.body.user.id });

    expect(assignAttempt.status).toBe(400);
    expect(assignAttempt.body).toMatchObject({
      error: {
        code: 'ASSIGNEE_NOT_IN_TEAM',
        message: 'Assignee must be a member of the team',
      },
    });
  });

  test('non-members cannot access team tasks', async () => {
    const app = createApp();

    const owner = await request(app).post('/auth/register').send({
      email: 'owner-access@example.com',
      name: 'Owner',
      password: 'password123',
    });

    const outsider = await request(app).post('/auth/register').send({
      email: 'outsider-access@example.com',
      name: 'Outsider',
      password: 'password123',
    });

    const teamRes = await request(app)
      .post('/teams')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Team Access' });

    const teamId = teamRes.body.team.id;

    const listAsOutsider = await request(app)
      .get(`/teams/${teamId}/tasks`)
      .set('Authorization', `Bearer ${outsider.body.accessToken}`);

    expect(listAsOutsider.status).toBe(403);
    expect(listAsOutsider.body).toMatchObject({
      error: { code: 'FORBIDDEN' },
    });
  });

  test('PATCH /teams/:teamId/tasks/:taskId rejects empty body', async () => {
    const app = createApp();

    const owner = await request(app).post('/auth/register').send({
      email: 'owner-patch@example.com',
      name: 'Owner',
      password: 'password123',
    });

    const teamRes = await request(app)
      .post('/teams')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ name: 'Team Patch' });

    const teamId = teamRes.body.team.id;

    const createTask = await request(app)
      .post(`/teams/${teamId}/tasks`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({ title: 'Patch me' });

    const taskId = createTask.body.task.id;

    const patchEmpty = await request(app)
      .patch(`/teams/${teamId}/tasks/${taskId}`)
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({});

    expect(patchEmpty.status).toBe(400);
    expect(patchEmpty.body).toMatchObject({
      error: { code: 'VALIDATION_ERROR' },
    });
  });
});
