'use strict';

const { validationError } = require('./errors');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Tiny schema validator so we don't need an extra dependency.
 *
 * Schema shape:
 *   { fieldName: { type, required, min, max, minLength, maxLength, enum, format } }
 *
 * Supported types: 'string', 'integer', 'boolean'.
 * Pass `{ coerce: true }` when validating query strings, where every value
 * arrives as a string.
 *
 * Returns a new object containing only the fields declared in the schema.
 * Throws a VALIDATION_ERROR AppError listing every problem found.
 */
function validate(input, schema, { coerce = false } = {}) {
  const source = input && typeof input === 'object' ? input : {};
  const errors = [];
  const out = {};

  for (const [field, rules] of Object.entries(schema)) {
    let value = source[field];

    if (value === undefined || value === null || value === '') {
      if (rules.required) errors.push({ field, message: `${field} is required` });
      continue;
    }

    if (coerce) value = coerceValue(value, rules.type);

    const problem = check(value, rules);
    if (problem) {
      errors.push({ field, message: `${field} ${problem}` });
      continue;
    }

    out[field] = typeof value === 'string' ? value.trim() : value;
  }

  if (errors.length) throw validationError(errors);
  return out;
}

function coerceValue(value, type) {
  if (typeof value !== 'string') return value;
  if (type === 'integer' && /^-?\d+$/.test(value)) return parseInt(value, 10);
  if (type === 'boolean') {
    if (value === 'true') return true;
    if (value === 'false') return false;
  }
  return value;
}

function check(value, rules) {
  switch (rules.type) {
    case 'string':
      if (typeof value !== 'string') return 'must be a string';
      if (rules.minLength !== undefined && value.trim().length < rules.minLength) {
        return `must be at least ${rules.minLength} characters`;
      }
      if (rules.maxLength !== undefined && value.trim().length > rules.maxLength) {
        return `must be at most ${rules.maxLength} characters`;
      }
      if (rules.format === 'email' && !EMAIL_RE.test(value.trim())) {
        return 'must be a valid email address';
      }
      if (rules.enum && !rules.enum.includes(value)) {
        return `must be one of: ${rules.enum.join(', ')}`;
      }
      return null;
    case 'integer':
      if (!Number.isSafeInteger(value)) return 'must be an integer';
      if (rules.min !== undefined && value < rules.min) return `must be >= ${rules.min}`;
      if (rules.max !== undefined && value > rules.max) return `must be <= ${rules.max}`;
      return null;
    case 'boolean':
      return typeof value === 'boolean' ? null : 'must be a boolean';
    /* istanbul ignore next */
    default:
      throw new Error(`Unknown validation type: ${rules.type}`);
  }
}

module.exports = { validate };
