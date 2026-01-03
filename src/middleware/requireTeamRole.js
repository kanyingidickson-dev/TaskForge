const { getPrisma } = require('../db/prisma');
const { HttpError } = require('../utils/httpError');

const ROLE_RANK = {
  MEMBER: 1,
  ADMIN: 2,
  OWNER: 3,
};

function requireTeamRole({ teamIdParam = 'teamId', minRole = 'MEMBER' } = {}) {
  return async (req, res, next) => {
    const teamId = req.params[teamIdParam];
    if (!teamId) {
      return next(
        new HttpError({
          status: 400,
          code: 'VALIDATION_ERROR',
          message: 'Validation Error',
          details: { location: 'params', issues: [] },
        })
      );
    }

    const userId = req.user && req.user.id;
    if (!userId) {
      return next(
        new HttpError({
          status: 401,
          code: 'UNAUTHORIZED',
          message: 'Unauthorized',
        })
      );
    }

    let membership;
    try {
      const prisma = getPrisma();
      membership = await prisma.teamMembership.findUnique({
        where: {
          teamId_userId: {
            teamId,
            userId,
          },
        },
      });
    } catch (err) {
      return next(err);
    }

    if (!membership) {
      return next(
        new HttpError({
          status: 403,
          code: 'FORBIDDEN',
          message: 'Forbidden',
        })
      );
    }

    const haveRank = ROLE_RANK[membership.role] || 0;
    const needRank = ROLE_RANK[minRole] || 0;

    if (haveRank < needRank) {
      return next(
        new HttpError({
          status: 403,
          code: 'FORBIDDEN',
          message: 'Forbidden',
        })
      );
    }

    req.teamMembership = {
      teamId: membership.teamId,
      userId: membership.userId,
      role: membership.role,
    };

    return next();
  };
}

module.exports = { requireTeamRole };
