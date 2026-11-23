/**
 * js/mock/mock-scope-helpers.js – Computes ownership and enrollment scopes for mock routes.
 * Exports reusable scope lookups without mutating the database.
 */

/** Returns IDs of courses the student is enrolled in. */
export function studentCourseIds(db, studentId) {
  return db.enrollments.filter((e) => e.student_id === studentId).map((e) => e.course_id);
}
/** Returns IDs of courses taught by this doctor. */
export function doctorCourseIds(db, doctorId) {
  return db.courses.filter((c) => c.doctor_id === doctorId).map((c) => c.id);
}
/** Checks that a course belongs to the doctor; returns the course or null. */
export function doctorOwnsCourse(db, doctorId, courseId) {
  return db.courses.find((c) => c.id === courseId && c.doctor_id === doctorId) || null;
}
/** Returns IDs of students enrolled in any of the given course IDs. */
export function studentsInCourses(db, courseIds) {
  return db.enrollments.filter((e) => courseIds.includes(e.course_id)).map((e) => e.student_id);
}
