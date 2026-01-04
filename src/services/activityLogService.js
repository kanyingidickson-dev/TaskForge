/**
 * Activity log + in-process realtime fanout.
 *
 * Responsibilities:
 * - Persist activity records to the database
 * - Provide a lightweight pub/sub hook for realtime delivery (WebSocket)
 *
 * NOTE: The EventEmitter is process-local. If you run multiple Node instances,
 * realtime delivery requires an external broker (e.g., Redis pub/sub).
 */

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
