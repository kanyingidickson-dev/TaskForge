const { EventEmitter } = require('events');

const { getPrisma } = require('../db/prisma');
const { logger } = require('../utils/logger');

const activityEmitter = new EventEmitter();

function publishActivity(activity) {
  try {
    activityEmitter.emit('activity', activity);
  } catch (err) {
    logger.error({ err }, 'activity publish error');
  }
}

function onActivity(listener) {
  activityEmitter.on('activity', listener);
  return () => activityEmitter.off('activity', listener);
}

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

  const activity = await client.activityLog.create({
    data: {
      teamId,
      actorUserId: actorUserId || null,
      entityType,
      entityId,
      action,
      data: data || {},
    },
  });

  return activity;
}

module.exports = {
  logActivity,
  publishActivity,
  onActivity,
};
