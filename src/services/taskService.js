const { getPrisma } = require('../db/prisma');
const { HttpError } = require('../utils/httpError');

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

  if (assigneeUserId) {
    const assigneeMembership = await prisma.teamMembership.findUnique({
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

  const task = await prisma.task.create({
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

async function updateTask({ teamId, taskId, patch }) {
  const prisma = getPrisma();

  const existing = await prisma.task.findFirst({
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
    const assigneeMembership = await prisma.teamMembership.findUnique({
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

  const updated = await prisma.task.update({
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

  return { task: updated };
}

module.exports = {
  createTask,
  listTeamTasks,
  updateTask,
};
