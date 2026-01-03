const { env } = require('../config/env');
const { getPrisma } = require('../db/prisma');
const { HttpError } = require('../utils/httpError');
const { hashPassword, verifyPassword } = require('../auth/password');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../auth/jwt');

function sanitizeUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function refreshExpiresAt() {
  return new Date(Date.now() + env.jwtRefreshTtlSeconds * 1000);
}

async function register({ email, name, password }) {
  const prisma = getPrisma();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new HttpError({
      status: 409,
      code: 'EMAIL_IN_USE',
      message: 'Email already in use',
    });
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
    },
  });

  const accessToken = signAccessToken({ userId: user.id });
  const refresh = signRefreshToken({ userId: user.id });

  await prisma.session.create({
    data: {
      userId: user.id,
      jti: refresh.jti,
      expiresAt: refreshExpiresAt(),
    },
  });

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken: refresh.token,
  };
}

async function login({ email, password }) {
  const prisma = getPrisma();

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new HttpError({
      status: 401,
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid credentials',
    });
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    throw new HttpError({
      status: 401,
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid credentials',
    });
  }

  const accessToken = signAccessToken({ userId: user.id });
  const refresh = signRefreshToken({ userId: user.id });

  await prisma.session.create({
    data: {
      userId: user.id,
      jti: refresh.jti,
      expiresAt: refreshExpiresAt(),
    },
  });

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken: refresh.token,
  };
}

async function refresh({ refreshToken }) {
  const prisma = getPrisma();

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (err) {
    throw new HttpError({
      status: 401,
      code: 'UNAUTHORIZED',
      message: 'Unauthorized',
    });
  }

  const session = await prisma.session.findUnique({ where: { jti: payload.jti } });
  const now = new Date();

  if (
    !session ||
    session.userId !== payload.sub ||
    session.revokedAt ||
    session.expiresAt <= now
  ) {
    throw new HttpError({
      status: 401,
      code: 'UNAUTHORIZED',
      message: 'Unauthorized',
    });
  }

  await prisma.session.update({
    where: { jti: session.jti },
    data: { revokedAt: now },
  });

  const accessToken = signAccessToken({ userId: session.userId });
  const nextRefresh = signRefreshToken({ userId: session.userId });

  await prisma.session.create({
    data: {
      userId: session.userId,
      jti: nextRefresh.jti,
      expiresAt: refreshExpiresAt(),
    },
  });

  return {
    accessToken,
    refreshToken: nextRefresh.token,
  };
}

async function logout({ refreshToken }) {
  const prisma = getPrisma();

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (err) {
    return;
  }

  const now = new Date();

  await prisma.session.updateMany({
    where: {
      userId: payload.sub,
      jti: payload.jti,
      revokedAt: null,
    },
    data: { revokedAt: now },
  });
}

module.exports = {
  register,
  login,
  refresh,
  logout,
};
