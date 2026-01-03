const express = require('express');

const { asyncHandler } = require('../middleware/asyncHandler');
const { requireAuth } = require('../middleware/requireAuth');
const { getPrisma } = require('../db/prisma');
const { HttpError } = require('../utils/httpError');

const meRoutes = express.Router();

meRoutes.get(
  '/me',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const prisma = getPrisma();

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      throw new HttpError({
        status: 401,
        code: 'UNAUTHORIZED',
        message: 'Unauthorized',
      });
    }

    res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  })
);

module.exports = { meRoutes };
