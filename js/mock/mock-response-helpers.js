/**
 * js/mock/mock-response-helpers.js – Shapes mock API success and failure responses.
 * Exports shared response factories and calendar-date validation.
 */

/** @param {number} status @param {any} data */
export const ok = (data, status = 200) => ({ ok: true, status, data });
/** @param {number} status @param {string} detail @param {object} [errors] */
export const fail = (status, detail, errors = null) =>
  ({ ok: false, status, error: { detail, ...(errors ? { errors } : {}) } });
/** Returns the standard 401 response. */
export const err401 = () => fail(401, "Authentication required.");
/** Returns the standard 403 response. */
export const err403 = () => fail(403, "Forbidden: insufficient permissions.");
/** Returns a standard missing-resource response. */
export const err404 = (res = "Resource") => fail(404, `${res} not found.`);
/** Returns a standard duplicate-resource response. */
export const err409 = (detail) => fail(409, detail);
/** Returns a standard field-validation response. */
export const err422 = (errors) => fail(422, "Validation failed.", errors);
/** Validates a calendar date formatted as YYYY-MM-DD. */
export function isValidDateOnly(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
