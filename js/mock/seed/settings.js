/**
 * js/mock/seed/settings.js – Seed academic policy and points ledger settings.
 *
 * Defines the initial institutional settings configured at the Dean level.
 * Governs absence warning thresholds, rating cooldowns, and points incentives.
 *
 * Depends on: Nothing.
 */

export const SEED_SETTINGS = {
  id: "settings-1",
  absence_warning_threshold: 2,
  rating_cooldown_days: 7,
  points_submission_on_time: 50,
  points_quiz_completion: 30,
  points_attendance_present: 10,
  updated_at: "2026-10-01T00:00:00Z",
  updated_by: null,
};
