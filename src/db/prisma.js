function getPrisma() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to initialize Prisma');
  }

  const { PrismaClient } = require('@prisma/client');
  return new PrismaClient();
}

module.exports = { getPrisma };
