const express = require('express');
const { z } = require('zod');

const { asyncHandler } = require('../middleware/asyncHandler');
const { requireAuth } = require('../middleware/requireAuth');
const { requireTeamRole } = require('../middleware/requireTeamRole');
const { validate } = require('../middleware/validate');
const taskService = require('../services/taskService');

const tasksRoutes = express.Router({ mergeParams: true });

const taskStatusSchema = z.enum(['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE']);
const taskPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(5000).optional(),
  status: taskStatusSchema.optional().default('TODO'),
  priority: taskPrioritySchema.optional().default('MEDIUM'),
  dueAt: z.coerce.date().optional(),
  assigneeUserId: z.string().uuid().optional(),
});

const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z
      .union([z.string().trim().min(1).max(5000), z.null()])
      .optional(),
    status: taskStatusSchema.optional(),
    priority: taskPrioritySchema.optional(),
    dueAt: z.union([z.coerce.date(), z.null()]).optional(),
    assigneeUserId: z.union([z.string().uuid(), z.null()]).optional(),
  })
  .refine((obj) => Object.values(obj).some((v) => v !== undefined), {
    message: 'At least one field must be provided',
  });

tasksRoutes.get(
  '/',
  requireAuth(),
  requireTeamRole({ minRole: 'MEMBER' }),
  asyncHandler(async (req, res) => {
    const result = await taskService.listTeamTasks({ teamId: req.params.teamId });
    res.status(200).json(result);
  })
);

tasksRoutes.post(
  '/',
  requireAuth(),
  requireTeamRole({ minRole: 'MEMBER' }),
  validate({ body: createTaskSchema }),
  asyncHandler(async (req, res) => {
    const result = await taskService.createTask({
      teamId: req.params.teamId,
      createdByUserId: req.user.id,
      title: req.body.title,
      description: req.body.description,
      status: req.body.status,
      priority: req.body.priority,
      dueAt: req.body.dueAt,
      assigneeUserId: req.body.assigneeUserId,
    });

    res.status(201).json(result);
  })
);

tasksRoutes.patch(
  '/:taskId',
  requireAuth(),
  requireTeamRole({ minRole: 'MEMBER' }),
  validate({ body: updateTaskSchema }),
  asyncHandler(async (req, res) => {
    const result = await taskService.updateTask({
      teamId: req.params.teamId,
      taskId: req.params.taskId,
      patch: req.body,
    });

    res.status(200).json(result);
  })
);

module.exports = { tasksRoutes };
