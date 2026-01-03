const express = require('express');
const { z } = require('zod');

const { asyncHandler } = require('../middleware/asyncHandler');
const { validate } = require('../middleware/validate');
const authService = require('../services/authService');

const authRoutes = express.Router();

const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  name: z.string().trim().min(1).max(120),
  password: z.string().min(8).max(200),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(200),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

authRoutes.post(
  '/register',
  validate({ body: registerSchema }),
  asyncHandler(async (req, res) => {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  })
);

authRoutes.post(
  '/login',
  validate({ body: loginSchema }),
  asyncHandler(async (req, res) => {
    const result = await authService.login(req.body);
    res.status(200).json(result);
  })
);

authRoutes.post(
  '/refresh',
  validate({ body: refreshSchema }),
  asyncHandler(async (req, res) => {
    const result = await authService.refresh(req.body);
    res.status(200).json(result);
  })
);

authRoutes.post(
  '/logout',
  validate({ body: refreshSchema }),
  asyncHandler(async (req, res) => {
    await authService.logout(req.body);
    res.status(204).end();
  })
);

module.exports = { authRoutes };
