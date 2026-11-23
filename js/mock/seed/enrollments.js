/**
 * js/mock/seed/enrollments.js – Seed student-to-course enrollments.
 *
 * Enrollment matrix:
 *   usr-1  → crs-a                   (Course A only)
 *   usr-2  → crs-a, crs-b
 *   usr-3  → crs-a, crs-b, crs-c     (all courses)
 *   usr-4  → crs-b, crs-c
 *   usr-5  → crs-c                   (Course C only — isolation test: NOT in doctor1's courses)
 *
 * Depends on: Nothing.
 */

export const SEED_ENROLLMENTS = [
  /* Course A (SE301) */
  { id: "enr-1", student_id: "usr-1", course_id: "crs-a", enrolled_at: "2026-09-01" },
  { id: "enr-2", student_id: "usr-2", course_id: "crs-a", enrolled_at: "2026-09-01" },
  { id: "enr-3", student_id: "usr-3", course_id: "crs-a", enrolled_at: "2026-09-01" },

  /* Course B (SE304) */
  { id: "enr-4", student_id: "usr-2", course_id: "crs-b", enrolled_at: "2026-09-01" },
  { id: "enr-5", student_id: "usr-3", course_id: "crs-b", enrolled_at: "2026-09-01" },
  { id: "enr-6", student_id: "usr-4", course_id: "crs-b", enrolled_at: "2026-09-01" },

  /* Course C (SE302) */
  { id: "enr-7",  student_id: "usr-3", course_id: "crs-c", enrolled_at: "2026-09-01" },
  { id: "enr-8",  student_id: "usr-4", course_id: "crs-c", enrolled_at: "2026-09-01" },
  { id: "enr-9",  student_id: "usr-5", course_id: "crs-c", enrolled_at: "2026-09-01" },

  /* Information Systems (dept-2) */
  { id: "enr-is1", student_id: "usr-13", course_id: "crs-d", enrolled_at: "2026-09-05T00:00:00Z" },
  { id: "enr-is2", student_id: "usr-13", course_id: "crs-e", enrolled_at: "2026-09-05T00:00:00Z" },
  { id: "enr-is3", student_id: "usr-14", course_id: "crs-d", enrolled_at: "2026-09-05T00:00:00Z" },
];
