'use strict';

const { AppError, notFound } = require('../utils/errors');

/** Catch-all for unmatched routes. Mount after all real routes. */
function notFoundHandler(req, res, next) {
  next(notFound(`Route ${req.method} ${req.path} not found`));
}

/**
 * Convert any thrown error into a consistent JSON body:
 *   { "error": { "code": "...", "message": "...", "details": [...] } }
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  // Malformed JSON bodies surface from express.json() with a 400 status.
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON' },
    });
  }

  console.error(err);
  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong on our end' },
  });
}

module.exports = { notFoundHandler, errorHandler };
