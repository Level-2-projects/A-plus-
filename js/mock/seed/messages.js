/**
 * js/mock/seed/messages.js – Seed inbox messages for students.
 *
 * sender_type "doctor" = sent by a doctor via the Messages page.
 * sender_type "system" = auto-generated (absence warnings, grade notifications).
 * recipient_id is always a student ID; isolation is enforced in the mock server.
 *
 * Depends on: Nothing.
 */

export const SEED_MESSAGES = [
  /* ── Messages for usr-1 (Karim Adel) ── */
  {
    id: "msg-1",
    sender_id: "usr-6",
    sender_type: "doctor",
    sender_name: "Dr. Ahmed Mansour",
    recipient_id: "usr-1",
    course_id: "crs-a",
    type: "notice",
    subject: "SE301 – Assignment 2 Clarification",
    body: "Please note that the refactoring should target the payment module specifically. You may use any language from our approved list.",
    created_at: "2026-10-08T09:00:00Z",
    is_read: true,
  },
  {
    id: "msg-2",
    sender_id: null,
    sender_type: "system",
    sender_name: "A Plus System",
    recipient_id: "usr-1",
    course_id: null,
    type: "system",
    subject: "Grade Posted: SE301 – Assignment 2",
    body: "Your final grade for Assignment 2 (Hexagonal Architecture Refactoring) has been posted: 17/20.",
    created_at: "2026-10-22T10:05:00Z",
    is_read: false,
  },
  {
    id: "msg-8",
    sender_id: null,
    sender_type: "system",
    sender_name: "A Plus System",
    recipient_id: "usr-1",
    course_id: "crs-a",
    type: "warning",
    subject: "SE301 – Submission Deadline Reminder",
    body: "Assignment 1 closes soon. Submit your work before the deadline to avoid a late flag.",
    created_at: "2026-10-28T11:00:00Z",
    is_read: false,
  },
  {
    id: "msg-9",
    sender_id: "usr-6",
    sender_type: "doctor",
    sender_name: "Dr. Ahmed Mansour",
    recipient_id: "usr-1",
    course_id: "crs-a",
    type: "suggestion",
    subject: "SE301 – Suggested Review Before Assignment 1",
    body: "Review the lecture material on design-pattern trade-offs before finalizing your analysis report.",
    created_at: "2026-10-29T09:30:00Z",
    is_read: false,
  },

  /* ── Messages for usr-2 (Nour Hassan) ── */
  {
    id: "msg-3",
    sender_id: "usr-6",
    sender_type: "doctor",
    sender_name: "Dr. Ahmed Mansour",
    recipient_id: "usr-2",
    course_id: "crs-a",
    type: "notice",
    subject: "SE301 – Office Hours Rescheduled",
    body: "This week's office hours are moved to Wednesday at 1:00 PM due to department council meetings.",
    created_at: "2026-10-20T08:00:00Z",
    is_read: false,
  },
  {
    id: "msg-4",
    sender_id: null,
    sender_type: "system",
    sender_name: "A Plus System",
    recipient_id: "usr-2",
    course_id: "crs-a",
    type: "warning",
    subject: "Absence Notice: SE301 – 1 Absence Recorded",
    body: "You have 1 absence recorded in SE301 Software Architecture & Design Patterns. The penalty threshold is 2 absences.",
    created_at: "2026-10-13T14:00:00Z",
    is_read: true,
  },

  /* ── Messages for usr-3 (Yara Ibrahim) ── */
  {
    id: "msg-5",
    sender_id: null,
    sender_type: "system",
    sender_name: "A Plus System",
    recipient_id: "usr-3",
    course_id: "crs-a",
    type: "warning",
    subject: "Absence Warning: SE301 – Penalty Threshold Reached",
    body: "You have reached 2 absences in SE301 Software Architecture & Design Patterns. Further absences may incur a grade penalty per university policy.",
    created_at: "2026-10-20T14:30:00Z",
    is_read: false,
  },
  {
    id: "msg-6",
    sender_id: "usr-6",
    sender_type: "doctor",
    sender_name: "Dr. Ahmed Mansour",
    recipient_id: "usr-3",
    course_id: "crs-a",
    type: "suggestion",
    subject: "SE301 – Suggested Reading for Assignment 3",
    body: "I recommend reviewing chapters 4 and 5 of 'Clean Architecture' by Robert Martin before attempting Assignment 3.",
    created_at: "2026-10-25T10:00:00Z",
    is_read: false,
  },

  /* ── Messages for usr-5 (Laila Mostafa) — doctor2's course only ── */
  {
    id: "msg-7",
    sender_id: "usr-7",
    sender_type: "doctor",
    sender_name: "Dr. Sara Nabil",
    recipient_id: "usr-5",
    course_id: "crs-c",
    type: "notice",
    subject: "SE302 – Quiz 1 Results Posted",
    body: "Quiz 1 results are now available. You can view your score in the Quizzes section.",
    created_at: "2026-10-29T09:00:00Z",
    is_read: false,
  },
];
