const { getPrisma } = require('../db/prisma');
const { HttpError } = require('../utils/httpError');
const { logActivity, publishActivity } = require('./activityLogService');

const ROLE_RANK = {
  MEMBER: 1,
  ADMIN: 2,
  OWNER: 3,
};

async function createTeam({ userId, name }) {
  const prisma = getPrisma();

  const result = await prisma.$transaction(async (tx) => {
    const created = await tx.team.create({
      data: {
        name,
        createdByUserId: userId,
        memberships: {
          create: {
            userId,
            role: 'OWNER',
          },
        },
      },
    });

    const activity = await logActivity({
      prisma: tx,
      teamId: created.id,
      actorUserId: userId,
      entityType: 'TEAM',
      entityId: created.id,
      action: 'CREATED',
      data: { name: created.name },
    });

    return { team: created, activities: [activity] };
  });

  for (const activity of result.activities) {
    publishActivity(activity);
  }

  return { team: result.team };
}

async function updateTeamMemberRole({ teamId, actorUserId, actorRole, targetUserId, role }) {
  const prisma = getPrisma();

  const updated = await prisma.$transaction(async (tx) => {
    const membership = await tx.teamMembership.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: targetUserId,
        },
      },
      include: {
        user: {
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

    if (!membership) {
      throw new HttpError({
        status: 404,
        code: 'MEMBERSHIP_NOT_FOUND',
        message: 'Membership not found',
      });
    }

    if (role === 'OWNER' && actorRole !== 'OWNER') {
      throw new HttpError({
        status: 403,
        code: 'FORBIDDEN',
        message: 'Forbidden',
      });
    }

    if (membership.role === 'OWNER' && actorRole !== 'OWNER') {
      throw new HttpError({
        status: 403,
        code: 'FORBIDDEN',
        message: 'Forbidden',
      });
    }

    if (membership.role === 'OWNER' && role !== 'OWNER') {
      const owners = await tx.teamMembership.count({
        where: { teamId, role: 'OWNER' },
      });

      if (owners <= 1) {
        throw new HttpError({
          status: 409,
          code: 'LAST_OWNER',
          message: 'Team must have at least one owner',
        });
      }
    }

    const actorRank = ROLE_RANK[actorRole] || 0;
    const targetRank = ROLE_RANK[membership.role] || 0;
    if (actorRank < targetRank) {
      throw new HttpError({
        status: 403,
        code: 'FORBIDDEN',
        message: 'Forbidden',
      });
    }

    const updatedMembership = await tx.teamMembership.update({
      where: {
        teamId_userId: {
          teamId,
          userId: targetUserId,
        },
      },
      data: { role },
      include: {
        user: {
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
      actorUserId,
      entityType: 'MEMBERSHIP',
      entityId: updatedMembership.id,
      action: 'UPDATED',
      data: {
        userId: targetUserId,
        roleFrom: membership.role,
        roleTo: role,
      },
    });

    return { membership: updatedMembership, activity };
  });

  publishActivity(updated.activity);

  return {
    membership: {
      teamId: updated.membership.teamId,
      role: updated.membership.role,
      user: updated.membership.user,
      createdAt: updated.membership.createdAt,
      updatedAt: updated.membership.updatedAt,
    },
  };
}

async function removeTeamMember({ teamId, actorUserId, actorRole, targetUserId }) {
  const prisma = getPrisma();

  const activity = await prisma.$transaction(async (tx) => {
    const membership = await tx.teamMembership.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: targetUserId,
        },
      },
    });

    if (!membership) {
      throw new HttpError({
        status: 404,
        code: 'MEMBERSHIP_NOT_FOUND',
        message: 'Membership not found',
      });
    }

    if (membership.role === 'OWNER' && actorRole !== 'OWNER') {
      throw new HttpError({
        status: 403,
        code: 'FORBIDDEN',
        message: 'Forbidden',
      });
    }

    if (membership.role === 'OWNER') {
      const owners = await tx.teamMembership.count({
        where: { teamId, role: 'OWNER' },
      });

      if (owners <= 1) {
        throw new HttpError({
          status: 409,
          code: 'LAST_OWNER',
          message: 'Team must have at least one owner',
        });
      }
    }

    const actorRank = ROLE_RANK[actorRole] || 0;
    const targetRank = ROLE_RANK[membership.role] || 0;
    if (actorRank < targetRank) {
      throw new HttpError({
        status: 403,
        code: 'FORBIDDEN',
        message: 'Forbidden',
      });
    }

    await tx.teamMembership.delete({
      where: {
        teamId_userId: {
          teamId,
          userId: targetUserId,
        },
      },
    });

    const activityLog = await logActivity({
      prisma: tx,
      teamId,
      actorUserId: actorUserId || null,
      entityType: 'MEMBERSHIP',
      entityId: membership.id,
      action: 'DELETED',
      data: { userId: targetUserId },
    });

    return activityLog;
  });

  publishActivity(activity);
}

async function listMyTeams({ userId }) {
  const prisma = getPrisma();

  const memberships = await prisma.teamMembership.findMany({
    where: { userId },
    include: { team: true },
    orderBy: { createdAt: 'asc' },
  });

  return {
    teams: memberships.map((m) => ({
      team: m.team,
      role: m.role,
    })),
  };
}

async function listTeamMembers({ teamId }) {
  const prisma = getPrisma();

  const members = await prisma.teamMembership.findMany({
    where: { teamId },
    include: {
      user: {
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

  return {
    members: members.map((m) => ({
      user: m.user,
      role: m.role,
      createdAt: m.createdAt,
    })),
  };
}

async function addTeamMember({ teamId, actorUserId, userId, role }) {
  const prisma = getPrisma();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new HttpError({
      status: 404,
      code: 'USER_NOT_FOUND',
      message: 'User not found',
    });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.teamMembership.create({
        data: {
          teamId,
          userId,
          role,
        },
        include: {
          user: {
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
        actorUserId,
        entityType: 'MEMBERSHIP',
        entityId: created.id,
        action: 'CREATED',
        data: {
          userId,
          role,
        },
      });

      return { membership: created, activity };
    });

    publishActivity(result.activity);

    return {
      membership: {
        teamId: result.membership.teamId,
        role: result.membership.role,
        user: result.membership.user,
        createdAt: result.membership.createdAt,
      },
    };
  } catch (err) {
    if (err && err.code === 'P2002') {
      throw new HttpError({
        status: 409,
        code: 'ALREADY_A_MEMBER',
        message: 'User is already a member',
      });
    }
    throw err;
  }
}

module.exports = {
  createTeam,
  listMyTeams,
  listTeamMembers,
  addTeamMember,
  updateTeamMemberRole,
  removeTeamMember,
};
