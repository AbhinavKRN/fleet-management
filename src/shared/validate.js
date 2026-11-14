import { HttpError } from './errors.js';

export function requireFields(body, fields) {
  const source = body || {};
  const missing = fields.filter((field) => source[field] === undefined || source[field] === null || source[field] === '');
  if (missing.length) throw new HttpError(400, `Missing ${missing.join(', ')}`);
}

export function assertEnum(value, allowed, label) {
  if (!allowed.includes(value)) throw new HttpError(400, `Invalid ${label}`);
}

export function numberOrNull(value) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new HttpError(400, 'Invalid number');
  return parsed;
}
