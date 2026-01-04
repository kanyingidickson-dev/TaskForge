/**
 * Realtime WebSocket server.
 *
 * Responsibilities:
 * - Authenticate WS upgrades using an access token
 * - Track active connections and their team subscriptions
 * - Broadcast activity log events to subscribed clients
 *
 * NOTE: This module runs entirely on the Node.js event loop. As long as we avoid
 * async gaps while mutating connection state, no explicit locking is required.
 */

const WebSocket = require('ws');
const { URL } = require('url');

const { verifyAccessToken } = require('../auth/jwt');
const { getPrisma } = require('../db/prisma');
const { onActivity } = require('../services/activityLogService');
const { logger } = require('../utils/logger');

function initRealtimeServer(httpServer) {
  // NOTE: `noServer` lets us plug into the existing HTTP server's `upgrade`
  // event so we can perform custom auth before accepting the connection.
  const wss = new WebSocket.Server({ noServer: true });
  const connections = new Map();

  function send(ws, payload) {
    if (ws.readyState !== WebSocket.OPEN) return;
    // NOTE: We send JSON messages and keep the protocol intentionally small.
    ws.send(JSON.stringify(payload));
  }

  async function handleSubscribe(ws, { teamId }) {
    if (typeof teamId !== 'string') {
      send(ws, { type: 'error', code: 'VALIDATION_ERROR' });
      return;
    }

    const ctx = connections.get(ws);
    if (!ctx) return;

    const prisma = getPrisma();
    const membership = await prisma.teamMembership.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: ctx.userId,
        },
      },
    });

    if (!membership) {
      send(ws, { type: 'error', code: 'FORBIDDEN' });
      return;
    }

    ctx.teamIds.add(teamId);
    send(ws, { type: 'subscribed', teamId });
  }

  function handleUnsubscribe(ws, { teamId }) {
    if (typeof teamId !== 'string') {
      send(ws, { type: 'error', code: 'VALIDATION_ERROR' });
      return;
    }

    const ctx = connections.get(ws);
    if (!ctx) return;

    ctx.teamIds.delete(teamId);
    send(ws, { type: 'unsubscribed', teamId });
  }

  wss.on('connection', (ws, req) => {
    const userId = req.userId;
    const ctx = {
      userId,
      teamIds: new Set(),
    };

    connections.set(ws, ctx);

    ws.on('message', (raw) => {
      // NOTE: Messages are client-controlled input; treat as untrusted.
      let msg;
      try {
        msg = JSON.parse(raw.toString('utf8'));
      } catch {
        send(ws, { type: 'error', code: 'BAD_JSON' });
        return;
      }

      if (!msg || typeof msg.type !== 'string') {
        send(ws, { type: 'error', code: 'VALIDATION_ERROR' });
        return;
      }

      if (msg.type === 'subscribe') {
        handleSubscribe(ws, msg).catch((err) => {
          logger.error({ err }, 'realtime subscribe error');
          send(ws, { type: 'error', code: 'INTERNAL_ERROR' });
        });
        return;
      }

      if (msg.type === 'unsubscribe') {
        handleUnsubscribe(ws, msg);
        return;
      }

      send(ws, { type: 'error', code: 'UNKNOWN_MESSAGE' });
    });

    ws.on('close', () => {
      connections.delete(ws);
    });
  });

  const unsubscribe = onActivity((activity) => {
    // NOTE: Broadcast is best-effort. If a client is slow or disconnected we
    // simply skip it rather than backpressuring the entire event stream.
    for (const [ws, ctx] of connections.entries()) {
      if (!ctx.teamIds.has(activity.teamId)) continue;
      send(ws, { type: 'activity', activity });
    }
  });

  function handleUpgrade(request, socket, head) {
    let url;
    try {
      url = new URL(request.url, 'http://localhost');
    } catch {
      socket.destroy();
      return;
    }

    if (url.pathname !== '/realtime') {
      return;
    }

    // NOTE: WebSocket upgrades don't use standard HTTP auth headers in many
    // browser clients, so we accept the access token via query string.
    const token = url.searchParams.get('token');
    if (!token) {
      socket.destroy();
      return;
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      socket.destroy();
      return;
    }

    request.userId = payload.sub;

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }

  httpServer.on('upgrade', handleUpgrade);

  function close() {
    unsubscribe();
    httpServer.off('upgrade', handleUpgrade);
    wss.close();
  }

  return { close };
}

module.exports = { initRealtimeServer };
