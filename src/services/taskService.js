const { getPrisma } = require('../db/prisma');
const { HttpError } = require('../utils/httpError');
const { logActivity } = require('./activityLogService');

async function createTask({
  teamId,
  createdByUserId,
  title,
  description,
  status,
  priority,
  dueAt,
  assigneeUserId,
}) {
  const prisma = getPrisma();

  const task = await prisma.$transaction(async (tx) => {
    if (assigneeUserId) {
      const assigneeMembership = await tx.teamMembership.findUnique({
        where: {
          teamId_userId: {
            teamId,
            userId: assigneeUserId,
          },
        },
      });

      if (!assigneeMembership) {
        throw new HttpError({
          status: 400,
          code: 'ASSIGNEE_NOT_IN_TEAM',
          message: 'Assignee must be a member of the team',
        });
      }
    }

    const created = await tx.task.create({
      data: {
        teamId,
        title,
        description: description || null,
        status,
        priority,
        dueAt: dueAt || null,
        createdByUserId,
        assigneeUserId: assigneeUserId || null,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            name: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        assignee: {
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

    await logActivity({
      prisma: tx,
      teamId,
      actorUserId: createdByUserId,
      entityType: 'TASK',
      entityId: created.id,
      action: 'CREATED',
      data: {
        title: created.title,
        status: created.status,
        priority: created.priority,
        assigneeUserId: created.assigneeUserId,
      },
    });

    return created;
  });

  return { task };
}

async function listTeamTasks({ teamId }) {
  const prisma = getPrisma();

  const tasks = await prisma.task.findMany({
    where: {
      teamId,
      deletedAt: null,
    },
    include: {
      createdBy: {
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      assignee: {
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
    orderBy: [{ updatedAt: 'desc' }],
  });

  return { tasks };
}

async function updateTask({ teamId, taskId, actorUserId, patch }) {
  const prisma = getPrisma();

  const updated = await prisma.$transaction(async (tx) => {
    const existing = await tx.task.findFirst({
      where: {
        id: taskId,
        teamId,
        deletedAt: null,
      },
    });

    if (!existing) {
      throw new HttpError({
        status: 404,
        code: 'TASK_NOT_FOUND',
        message: 'Task not found',
      });
    }

    if (patch.assigneeUserId !== undefined && patch.assigneeUserId !== null) {
      const assigneeMembership = await tx.teamMembership.findUnique({
        where: {
          teamId_userId: {
            teamId,
            userId: patch.assigneeUserId,
          },
        },
      });

      if (!assigneeMembership) {
        throw new HttpError({
          status: 400,
          code: 'ASSIGNEE_NOT_IN_TEAM',
          message: 'Assignee must be a member of the team',
        });
      }
    }

    const next = await tx.task.update({
      where: { id: existing.id },
      data: {
        title: patch.title,
        description: patch.description,
        status: patch.status,
        priority: patch.priority,
        dueAt: patch.dueAt,
        assigneeUserId: patch.assigneeUserId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            name: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        assignee: {
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

    await logActivity({
      prisma: tx,
      teamId,
      actorUserId,
      entityType: 'TASK',
      entityId: next.id,
      action: 'UPDATED',
      data: {
        patch,
        statusFrom: existing.status,
        statusTo: next.status,
        assigneeUserIdFrom: existing.assigneeUserId,
        assigneeUserIdTo: next.assigneeUserId,
      },
    });

    return next;
  });

  return { task: updated };
}

module.exports = {
  createTask,
  listTeamTasks,
  updateTask,
};
