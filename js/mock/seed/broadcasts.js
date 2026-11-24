/**
 * js/mock/seed/broadcasts.js – Seed college and department broadcast log.
 *
 * Stores college-wide and department-wide broadcast announcements created by
 * the Dean or Department Admins. Starts empty and populates upon message dispatches.
 *
 * Depends on: Nothing.
 */

export const SEED_BROADCASTS = [
  {
    id: "bcast-seed-1",
    sender_id: "usr-9",
    scope: "college",
    audience: "college",
    department_id: null,
    course_id: null,
    subject: "Academic Calendar & Fall Semester Guidelines",
    body: "Welcome to the Fall academic term. All students and faculty are reminded to adhere to institutional attendance thresholds and submission deadlines.",
    recipient_count: 12,
    created_at: "2026-10-01T08:00:00Z",
  },
  {
    id: "bcast-seed-2",
    sender_id: "usr-9",
    scope: "college",
    audience: "all_doctors",
    department_id: null,
    course_id: null,
    subject: "Midterm Assessment Submission Window",
    body: "Faculty members are requested to complete grading and rubric feedback for all midterm assignments within one week of the submission deadline.",
    recipient_count: 3,
    created_at: "2026-10-15T10:00:00Z",
  },
];
