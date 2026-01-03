const { HttpError } = require('../utils/httpError');

function notFound() {
  return (req, res, next) => {
    next(
      new HttpError({
        status: 404,
        code: 'NOT_FOUND',
        message: 'Not Found',
      })
    );
  };
}

module.exports = { notFound };
