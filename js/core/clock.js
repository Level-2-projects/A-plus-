/**
 * js/core/clock.js – Testable wall-clock abstraction.
 * Replaces every `new Date()` call so the test runner can freeze time
 * (e.g. to simulate end-of-month points reset or deadline expiry).
 *
 * Depends on: Nothing.
 */

/** @type {Date|null} Injected fake date; null means use the real wall clock. */
let _fakeNow = null;

/* ---------- Public API ---------- */

/**
 * Returns the current date/time, honouring any injected fake clock.
 * @returns {Date}
 */
export function getNow() {
  return _fakeNow ? new Date(_fakeNow) : new Date();
}

/**
 * Returns the current instant as an ISO 8601 string.
 * @returns {string} e.g. "2026-10-30T21:00:00.000Z"
 */
export function getNowIso() {
  return getNow().toISOString();
}

/**
 * Returns the current year-month string used to partition the points ledger.
 * @returns {string} e.g. "2026-10"
 */
export function getCurrentMonth() {
  const d = getNow();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/* ---------- Test-only helpers ---------- */

/**
 * Freezes the clock at a specific instant for deterministic tests.
 * Call clearFakeClock() in the test teardown.
 *
 * @param {string|Date} dateOrIso - The date/time to lock at.
 */
export function setFakeClock(dateOrIso) {
  _fakeNow = new Date(dateOrIso);
}

/**
 * Restores the real system clock.
 */
export function clearFakeClock() {
  _fakeNow = null;
}

/**
 * Returns true if a fake clock is currently active (useful for assertions).
 * @returns {boolean}
 */
export function isFakeClockActive() {
  return _fakeNow !== null;
}
