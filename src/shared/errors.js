export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function errorHandler(err, _req, res, next) {
  if (res.headersSent) return next(err);
  const invalidJson = err.type === 'entity.parse.failed';
  const status = invalidJson ? 400 : err.status || 500;
  const error = invalidJson ? 'Invalid JSON' : err.status ? err.message : 'Internal server error';
  res.status(status).json({ error });
}
