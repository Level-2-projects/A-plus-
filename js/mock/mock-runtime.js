/**
 * js/mock/mock-runtime.js – Re-exports shared dependencies used by separated mock handlers.
 * Keeps handler module imports consistent without changing request behavior.
 */

export { mockDb, generateId } from "./mock-db.js";
export { getNow, getCurrentMonth } from "../core/clock.js";
export { evaluateSubmission } from "./mock-ai.js";
export { POINTS_SUBMISSION_ON_TIME, POINTS_QUIZ_COMPLETION, POINTS_ATTENDANCE_PRESENT, ABSENCE_WARNING_THRESHOLD, RATING_COOLDOWN_DAYS } from "../config.js";
export { ok, fail, err403, err404, err409, err422, isValidDateOnly } from "./mock-response-helpers.js";
export { studentCourseIds, doctorCourseIds, doctorOwnsCourse, studentsInCourses } from "./mock-scope-helpers.js";
export { checkAbsenceWarning } from "./absence-warning-service.js";
