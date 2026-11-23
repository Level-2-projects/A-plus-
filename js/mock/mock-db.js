/**
 * js/mock/mock-db.js – Shared localStorage-backed mock database.
 * Single source of truth for all mock state across student and doctor portals.
 * Broadcasts changes to other open tabs via the native "storage" event.
 *
 * Schema version: increment DB_VERSION whenever the seed shape changes
 * so stale localStorage data from a previous version is automatically replaced.
 *
 * Depends on: all js/mock/seed/*.js files.
 */

import { SEED_DEPARTMENTS }          from "./seed/departments.js";
import { SEED_USERS }                from "./seed/users.js";
import { SEED_COURSES }              from "./seed/courses.js";
import { SEED_ENROLLMENTS }          from "./seed/enrollments.js";
import { SEED_LECTURES }             from "./seed/lectures.js";
import { SEED_ASSIGNMENTS }          from "./seed/assignments.js";
import { SEED_SUBMISSIONS }          from "./seed/submissions.js";
import { SEED_QUIZZES }              from "./seed/quizzes.js";
import { SEED_QUIZ_ATTEMPTS }        from "./seed/quiz-attempts.js";
import { SEED_ATTENDANCE_SESSIONS, SEED_ATTENDANCE_RECORDS } from "./seed/attendance.js";
import { SEED_MESSAGES }             from "./seed/messages.js";
import { SEED_POINTS_LEDGER }        from "./seed/points-ledger.js";
import { SEED_RATINGS }              from "./seed/ratings.js";
import { SEED_TODOS }                from "./seed/todos.js";
import { SEED_SETTINGS }             from "./seed/settings.js";
import { SEED_BROADCASTS }           from "./seed/broadcasts.js";

/* ---------- Constants ---------- */

/** Increment whenever seed shape changes to force a DB reset for old sessions. */
const DB_VERSION = 4;

/** localStorage key under which the entire database JSON is stored. */
export const MOCK_DB_KEY = "aplus_mock_db";

/* ---------- Seed snapshot factory ---------- */

/**
 * Returns a fresh deep-clone of the seed data.
 * Every resetToSeed() call and every first-load builds from this.
 *
 * @returns {object} Brand-new database object.
 */
function buildSeedSnapshot() {
  return {
    version: DB_VERSION,
    departments:          JSON.parse(JSON.stringify(SEED_DEPARTMENTS)),
    users:                JSON.parse(JSON.stringify(SEED_USERS)),
    courses:              JSON.parse(JSON.stringify(SEED_COURSES)),
    enrollments:          JSON.parse(JSON.stringify(SEED_ENROLLMENTS)),
    lectures:             JSON.parse(JSON.stringify(SEED_LECTURES)),
    assignments:          JSON.parse(JSON.stringify(SEED_ASSIGNMENTS)),
    submissions:          JSON.parse(JSON.stringify(SEED_SUBMISSIONS)),
    quizzes:              JSON.parse(JSON.stringify(SEED_QUIZZES)),
    quiz_attempts:        JSON.parse(JSON.stringify(SEED_QUIZ_ATTEMPTS)),
    attendance_sessions:  JSON.parse(JSON.stringify(SEED_ATTENDANCE_SESSIONS)),
    attendance_records:   JSON.parse(JSON.stringify(SEED_ATTENDANCE_RECORDS)),
    messages:             JSON.parse(JSON.stringify(SEED_MESSAGES)),
    points_ledger:        JSON.parse(JSON.stringify(SEED_POINTS_LEDGER)),
    ratings:              JSON.parse(JSON.stringify(SEED_RATINGS)),
    todos:                JSON.parse(JSON.stringify(SEED_TODOS)),
    settings:             JSON.parse(JSON.stringify(SEED_SETTINGS)),
    broadcasts:           JSON.parse(JSON.stringify(SEED_BROADCASTS)),
  };
}

/* ---------- ID generator ---------- */

/** Running counter to guarantee unique IDs within a session. */
let _idCounter = Date.now();

/**
 * Generates a unique string ID with an optional prefix.
 *
 * @param {string} [prefix="id"] - Short prefix indicating the entity type.
 * @returns {string} e.g. "sub-1730321000123-42"
 */
export function generateId(prefix = "id") {
  return `${prefix}-${_idCounter++}`;
}

/* ---------- Load / Save ---------- */

/**
 * Loads the database from localStorage, seeding it if absent or version-mismatched.
 *
 * @returns {object} The current database snapshot.
 */
export function load() {
  try {
    const raw = localStorage.getItem(MOCK_DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Version mismatch: clear and re-seed to avoid schema drift
      if (parsed.version !== DB_VERSION) {
        console.warn(`[MockDB] Version mismatch (stored ${parsed.version}, expected ${DB_VERSION}). Re-seeding.`);
        return resetToSeed();
      }
      return parsed;
    }
  } catch (err) {
    console.warn("[MockDB] Failed to parse stored database. Re-seeding.", err);
  }
  return resetToSeed();
}

/**
 * Persists the database to localStorage and notifies other tabs via the storage event.
 * Other tabs listening with listenForChanges() will pick this up automatically.
 *
 * @param {object} db - The database object to persist.
 */
export function save(db) {
  localStorage.setItem(MOCK_DB_KEY, JSON.stringify(db));
  // The browser fires "storage" in OTHER tabs automatically when localStorage changes.
  // For the CURRENT tab we dispatch a custom event so the layout can also react.
  window.dispatchEvent(new CustomEvent("aplus-db-changed"));
}

/**
 * Wipes localStorage and restores the seed snapshot, returning the fresh database.
 * Also resets the ID counter to avoid collisions with old seeded IDs.
 *
 * @returns {object} Fresh database snapshot.
 */
export function resetToSeed() {
  _idCounter = Date.now();
  const fresh = buildSeedSnapshot();
  localStorage.setItem(MOCK_DB_KEY, JSON.stringify(fresh));
  window.dispatchEvent(new CustomEvent("aplus-db-changed"));
  return fresh;
}

/**
 * Registers a callback to be called whenever the DB changes in ANY tab.
 * Useful for live-updating the unread badge in an open student tab.
 *
 * @param {() => void} callback - Function to call on change.
 * @returns {() => void} Cleanup function that removes the listeners.
 */
export function listenForChanges(callback) {
  // Native storage event fires only in OTHER tabs for the same origin.
  const onStorage = (evt) => { if (evt.key === MOCK_DB_KEY) callback(); };
  // Custom event fires in THIS tab (dispatched by save()).
  const onCustom = () => callback();

  window.addEventListener("storage", onStorage);
  window.addEventListener("aplus-db-changed", onCustom);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("aplus-db-changed", onCustom);
  };
}

/* ---------- Convenience export (named singleton alias) ---------- */

/**
 * Namespaced DB access object – preferred import style for the mock server.
 */
export const mockDb = {
  load,
  save,
  resetToSeed,
  listenForChanges,
  generateId: (prefix) => generateId(prefix),
};
