let prisma;

function getPrisma() {
  if (prisma) return prisma;

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to initialize Prisma');
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
