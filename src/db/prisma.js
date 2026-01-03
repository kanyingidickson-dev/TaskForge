let prisma;

const { HttpError } = require('../utils/httpError');

function getPrisma() {
  if (prisma) return prisma;

  if (!process.env.DATABASE_URL) {
    throw new HttpError({
      status: 503,
      code: 'DB_NOT_CONFIGURED',
      message: 'Database is not configured',
    });
  }

  const { PrismaClient } = require('@prisma/client');
  prisma = new PrismaClient();
  return prisma;
}

async function disconnectPrisma() {
  if (!prisma) return;

  const instance = prisma;
  prisma = undefined;
  await instance.$disconnect();
}

module.exports = { getPrisma, disconnectPrisma };
