class HttpError extends Error {
  constructor({ status, code, message }) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;

    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, HttpError);
    }
  }
}

module.exports = { HttpError };
