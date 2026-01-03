const { getPrisma, disconnectPrisma } = require('../src/db/prisma');

function describeIfDb(name, fn) {
  if (!process.env.DATABASE_URL) {
    return describe.skip(name, fn);
  }
  return describe(name, fn);
}

async function resetDb(prisma) {
  await prisma.$transaction([
    prisma.activityLog.deleteMany(),
    prisma.comment.deleteMany(),
    prisma.task.deleteMany(),
    prisma.teamInvite.deleteMany(),
    prisma.teamMembership.deleteMany(),
    prisma.session.deleteMany(),
    prisma.team.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

async function getDb() {
  const prisma = getPrisma();
  return prisma;
}

async function closeDb() {
  await disconnectPrisma();
}

module.exports = {
  describeIfDb,
  resetDb,
  getDb,
  closeDb,
};
