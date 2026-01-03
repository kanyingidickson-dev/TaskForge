const { getPrisma } = require('../db/prisma');

async function logActivity({
  prisma,
  teamId,
  actorUserId,
  entityType,
  entityId,
  action,
  data,
}) {
  const client = prisma || getPrisma();

  await client.activityLog.create({
    data: {
      teamId,
      actorUserId: actorUserId || null,
      entityType,
      entityId,
      action,
      data: data || {},
    },
  });
}

module.exports = {
  logActivity,
};
