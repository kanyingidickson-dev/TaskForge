const { logger } = require('../utils/logger');

function errorHandler() {
  return (err, req, res, next) => {
    logger.error({ err, requestId: req.id }, 'request error');

    if (res.headersSent) {
      return next(err);
    }

    res.status(500).json({ error: 'Internal Server Error' });
  };
}

module.exports = { errorHandler };
