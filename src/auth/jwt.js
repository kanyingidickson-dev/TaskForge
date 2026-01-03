const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const { env } = require('../config/env');

function requireSecret(secret, name) {
  if (!secret) {
    throw new Error(`${name} is required`);
  }
  return secret;
}

function signAccessToken({ userId }) {
  const secret = requireSecret(env.jwtAccessSecret, 'JWT_ACCESS_SECRET');

  return jwt.sign(
    {
      sub: userId,
      type: 'access',
    },
    secret,
    { expiresIn: env.jwtAccessTtlSeconds }
  );
}

function signRefreshToken({ userId }) {
  const secret = requireSecret(env.jwtRefreshSecret, 'JWT_REFRESH_SECRET');
  const jti = crypto.randomUUID();

  const token = jwt.sign(
    {
      sub: userId,
      type: 'refresh',
      jti,
    },
    secret,
    { expiresIn: env.jwtRefreshTtlSeconds }
  );

  return { token, jti };
}

function verifyAccessToken(token) {
  const secret = requireSecret(env.jwtAccessSecret, 'JWT_ACCESS_SECRET');
  const payload = jwt.verify(token, secret);
  if (!payload || payload.type !== 'access') {
    throw new Error('invalid access token');
  }
  return payload;
}

function verifyRefreshToken(token) {
  const secret = requireSecret(env.jwtRefreshSecret, 'JWT_REFRESH_SECRET');
  const payload = jwt.verify(token, secret);
  if (!payload || payload.type !== 'refresh') {
    throw new Error('invalid refresh token');
  }
  return payload;
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
