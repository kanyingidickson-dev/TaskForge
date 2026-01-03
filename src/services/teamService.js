const { getPrisma } = require('../db/prisma');
const { HttpError } = require('../utils/httpError');

const ROLE_RANK = {
  MEMBER: 1,
  ADMIN: 2,
  OWNER: 3,
};

async function createTeam({ userId, name }) {
  const prisma = getPrisma();

  const team = await prisma.team.create({
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

  return { team };
}

async function updateTeamMemberRole({ teamId, actorRole, targetUserId, role }) {
  const prisma = getPrisma();

  const membership = await prisma.teamMembership.findUnique({
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
    const owners = await prisma.teamMembership.count({
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

  const updated = await prisma.teamMembership.update({
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

  return {
    membership: {
      teamId: updated.teamId,
      role: updated.role,
      user: updated.user,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    },
  };
}

async function removeTeamMember({ teamId, actorRole, targetUserId }) {
  const prisma = getPrisma();

  const membership = await prisma.teamMembership.findUnique({
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
    const owners = await prisma.teamMembership.count({
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

  await prisma.teamMembership.delete({
    where: {
      teamId_userId: {
        teamId,
        userId: targetUserId,
      },
    },
  });
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

async function addTeamMember({ teamId, userId, role }) {
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
    const membership = await prisma.teamMembership.create({
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

    return {
      membership: {
        teamId: membership.teamId,
        role: membership.role,
        user: membership.user,
        createdAt: membership.createdAt,
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
