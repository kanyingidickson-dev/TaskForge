class HttpError extends Error {
  constructor({ status, code, message, details }) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;

    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, HttpError);
    }
  }
}

module.exports = { HttpError };
