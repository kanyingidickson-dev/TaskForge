const { logger } = require('../utils/logger');
const { HttpError } = require('../utils/httpError');
const { env } = require('../config/env');

function errorHandler() {
  return (err, req, res, next) => {
    if (res.headersSent) {
      return next(err);
    }

    const status = err instanceof HttpError ? err.status : 500;
    const code = err instanceof HttpError ? err.code : 'INTERNAL_ERROR';
    const message = err instanceof HttpError ? err.message : 'Internal Server Error';

    const errForLog = {
      name: err && err.name,
      message: err && err.message,
    };

    const shouldLogStack =
      status >= 500 &&
      err &&
      err.stack &&
      !(env.nodeEnv === 'test' && err instanceof HttpError);

    if (shouldLogStack) {
      errForLog.stack = err.stack;
    }

    const logMeta = {
      requestId: req.id,
      status,
      code,
      err: errForLog,
    };

    if (status >= 500) {
      logger.error(logMeta, 'request error');
    } else {
      logger.info(logMeta, 'request error');
    }

    const responseError = {
      code,
      message,
      requestId: req.id,
    };

    if (err instanceof HttpError && err.details !== undefined) {
      responseError.details = err.details;
    }

    res.status(status).json({
      error: {
        ...responseError,
      },
    });
  };
}

module.exports = { errorHandler };
