const express = require('express');
const { z } = require('zod');

const { asyncHandler } = require('../middleware/asyncHandler');
const { requireAuth } = require('../middleware/requireAuth');
const { requireTeamRole } = require('../middleware/requireTeamRole');
const { validate } = require('../middleware/validate');
const commentService = require('../services/commentService');

const commentsRoutes = express.Router({ mergeParams: true });

const baseParamsSchema = z.object({
  teamId: z.string().uuid(),
  taskId: z.string().uuid(),
});

const deleteParamsSchema = baseParamsSchema.extend({
  commentId: z.string().uuid(),
});

const createCommentSchema = z.object({
  body: z.string().trim().min(1).max(5000),
});

commentsRoutes.get(
  '/',
  requireAuth(),
  requireTeamRole({ minRole: 'MEMBER' }),
  validate({ params: baseParamsSchema }),
  asyncHandler(async (req, res) => {
    const result = await commentService.listTaskComments({
      teamId: req.params.teamId,
      taskId: req.params.taskId,
    });
    res.status(200).json(result);
  })
);

commentsRoutes.post(
  '/',
  requireAuth(),
  requireTeamRole({ minRole: 'MEMBER' }),
  validate({ params: baseParamsSchema, body: createCommentSchema }),
  asyncHandler(async (req, res) => {
    const result = await commentService.createComment({
      teamId: req.params.teamId,
      taskId: req.params.taskId,
      authorUserId: req.user.id,
      body: req.body.body,
    });

    res.status(201).json(result);
  })
);

commentsRoutes.delete(
  '/:commentId',
  requireAuth(),
  requireTeamRole({ minRole: 'MEMBER' }),
  validate({ params: deleteParamsSchema }),
  asyncHandler(async (req, res) => {
    await commentService.deleteComment({
      teamId: req.params.teamId,
      taskId: req.params.taskId,
      commentId: req.params.commentId,
      actorUserId: req.user.id,
      actorRole: req.teamMembership.role,
    });

    res.status(204).end();
  })
);

module.exports = { commentsRoutes };
