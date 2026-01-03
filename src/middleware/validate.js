const { HttpError } = require('../utils/httpError');

function formatZodError(error) {
  return {
    issues: error.issues,
  };
}

function validate({ body, query, params } = {}) {
  return (req, res, next) => {
    if (body) {
      const result = body.safeParse(req.body);
      if (!result.success) {
        return next(
          new HttpError({
            status: 400,
            code: 'VALIDATION_ERROR',
            message: 'Validation Error',
            details: { location: 'body', ...formatZodError(result.error) },
          })
        );
      }
      req.body = result.data;
    }

    if (query) {
      const result = query.safeParse(req.query);
      if (!result.success) {
        return next(
          new HttpError({
            status: 400,
            code: 'VALIDATION_ERROR',
            message: 'Validation Error',
            details: { location: 'query', ...formatZodError(result.error) },
          })
        );
      }
      req.query = result.data;
    }

    if (params) {
      const result = params.safeParse(req.params);
      if (!result.success) {
        return next(
          new HttpError({
            status: 400,
            code: 'VALIDATION_ERROR',
            message: 'Validation Error',
            details: { location: 'params', ...formatZodError(result.error) },
          })
        );
      }
      req.params = result.data;
    }

    return next();
  };
}

module.exports = { validate };
