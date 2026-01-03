const { getPrisma } = require('../db/prisma');
const { HttpError } = require('../utils/httpError');
const { logActivity, publishActivity } = require('./activityLogService');

const ROLE_RANK = {
  MEMBER: 1,
  ADMIN: 2,
  OWNER: 3,
};

async function assertTaskExists({ prisma, teamId, taskId }) {
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      teamId,
      deletedAt: null,
    },
  });

  if (!task) {
    throw new HttpError({
      status: 404,
      code: 'TASK_NOT_FOUND',
      message: 'Task not found',
    });
  }
}

async function createComment({ teamId, taskId, authorUserId, body }) {
  const prisma = getPrisma();

  const result = await prisma.$transaction(async (tx) => {
    await assertTaskExists({ prisma: tx, teamId, taskId });

    const created = await tx.comment.create({
      data: {
        teamId,
        taskId,
        authorUserId,
        body,
      },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            name: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    const activity = await logActivity({
      prisma: tx,
      teamId,
      actorUserId: authorUserId,
      entityType: 'COMMENT',
      entityId: created.id,
      action: 'COMMENTED',
      data: {
        taskId,
      },
    });

    return { comment: created, activity };
  });

  publishActivity(result.activity);

  return { comment: result.comment };
}

async function listTaskComments({ teamId, taskId }) {
  const prisma = getPrisma();

  await assertTaskExists({ prisma, teamId, taskId });

  const comments = await prisma.comment.findMany({
    where: {
      teamId,
      taskId,
      deletedAt: null,
    },
    include: {
      author: {
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return { comments };
}

async function deleteComment({ teamId, taskId, commentId, actorUserId, actorRole }) {
  const prisma = getPrisma();

  const activity = await prisma.$transaction(async (tx) => {
    await assertTaskExists({ prisma: tx, teamId, taskId });

    const comment = await tx.comment.findFirst({
      where: {
        id: commentId,
        teamId,
        taskId,
        deletedAt: null,
      },
    });

    if (!comment) {
      throw new HttpError({
        status: 404,
        code: 'COMMENT_NOT_FOUND',
        message: 'Comment not found',
      });
    }

    const actorRank = ROLE_RANK[actorRole] || 0;
    const canDelete = comment.authorUserId === actorUserId || actorRank >= ROLE_RANK.ADMIN;

    if (!canDelete) {
      throw new HttpError({
        status: 403,
        code: 'FORBIDDEN',
        message: 'Forbidden',
      });
    }

    await tx.comment.update({
      where: { id: comment.id },
      data: { deletedAt: new Date() },
    });

    const activityLog = await logActivity({
      prisma: tx,
      teamId,
      actorUserId,
      entityType: 'COMMENT',
      entityId: comment.id,
      action: 'DELETED',
      data: {
        taskId,
      },
    });

    return activityLog;
  });

  publishActivity(activity);
}

module.exports = {
  createComment,
  listTaskComments,
  deleteComment,
};
