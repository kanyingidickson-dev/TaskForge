const express = require('express');
const { z } = require('zod');

const { asyncHandler } = require('../middleware/asyncHandler');
const { requireAuth } = require('../middleware/requireAuth');
const { requireTeamRole } = require('../middleware/requireTeamRole');
const { validate } = require('../middleware/validate');
const teamService = require('../services/teamService');
const { tasksRoutes } = require('./tasks');

const teamsRoutes = express.Router();

const createTeamSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

const addMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER']),
});

const updateMemberRoleSchema = z.object({
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER']),
});

teamsRoutes.post(
  '/',
  requireAuth(),
  validate({ body: createTeamSchema }),
  asyncHandler(async (req, res) => {
    const result = await teamService.createTeam({
      userId: req.user.id,
      name: req.body.name,
    });
    res.status(201).json(result);
  })
);

teamsRoutes.get(
  '/',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const result = await teamService.listMyTeams({ userId: req.user.id });
    res.status(200).json(result);
  })
);

teamsRoutes.get(
  '/:teamId/members',
  requireAuth(),
  requireTeamRole({ minRole: 'MEMBER' }),
  asyncHandler(async (req, res) => {
    const result = await teamService.listTeamMembers({ teamId: req.params.teamId });
    res.status(200).json(result);
  })
);

teamsRoutes.post(
  '/:teamId/members',
  requireAuth(),
  requireTeamRole({ minRole: 'ADMIN' }),
  validate({ body: addMemberSchema }),
  asyncHandler(async (req, res) => {
    const result = await teamService.addTeamMember({
      teamId: req.params.teamId,
      userId: req.body.userId,
      role: req.body.role,
    });
    res.status(201).json(result);
  })
);

teamsRoutes.patch(
  '/:teamId/members/:userId',
  requireAuth(),
  requireTeamRole({ minRole: 'ADMIN' }),
  validate({ body: updateMemberRoleSchema }),
  asyncHandler(async (req, res) => {
    const result = await teamService.updateTeamMemberRole({
      teamId: req.params.teamId,
      actorRole: req.teamMembership.role,
      targetUserId: req.params.userId,
      role: req.body.role,
    });
    res.status(200).json(result);
  })
);

teamsRoutes.delete(
  '/:teamId/members/:userId',
  requireAuth(),
  requireTeamRole({ minRole: 'ADMIN' }),
  asyncHandler(async (req, res) => {
    await teamService.removeTeamMember({
      teamId: req.params.teamId,
      actorRole: req.teamMembership.role,
      targetUserId: req.params.userId,
    });
    res.status(204).end();
  })
);

teamsRoutes.use('/:teamId/tasks', tasksRoutes);

module.exports = { teamsRoutes };
