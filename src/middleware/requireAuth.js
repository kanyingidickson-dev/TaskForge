const { HttpError } = require('../utils/httpError');
const { verifyAccessToken } = require('../auth/jwt');

function requireAuth() {
  return (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth || typeof auth !== 'string') {
      return next(
        new HttpError({
          status: 401,
          code: 'UNAUTHORIZED',
          message: 'Unauthorized',
        })
      );
    }

    const parts = auth.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
      return next(
        new HttpError({
          status: 401,
          code: 'UNAUTHORIZED',
          message: 'Unauthorized',
        })
      );
    }

    try {
      const payload = verifyAccessToken(parts[1]);
      req.user = { id: payload.sub };
      return next();
    } catch {
      return next(
        new HttpError({
          status: 401,
          code: 'UNAUTHORIZED',
          message: 'Unauthorized',
        })
      );
    }
  };
}

module.exports = { requireAuth };
