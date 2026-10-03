'use strict';

/**
 * An error that carries an HTTP status and a machine-readable code.
 * The error-handling middleware turns these into JSON responses.
 */
class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const badRequest = (message, details) => new AppError(400, 'BAD_REQUEST', message, details);
const validationError = (details) =>
  new AppError(400, 'VALIDATION_ERROR', 'Request validation failed', details);
const paymentRequired = (message) => new AppError(402, 'INSUFFICIENT_FUNDS', message);
const notFound = (message) => new AppError(404, 'NOT_FOUND', message);
const conflict = (message, code = 'CONFLICT') => new AppError(409, code, message);

module.exports = {
  AppError,
  badRequest,
  validationError,
  paymentRequired,
  notFound,
  conflict,
};
