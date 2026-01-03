const { getPrisma } = require('../db/prisma');
const { HttpError } = require('../utils/httpError');

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
};
