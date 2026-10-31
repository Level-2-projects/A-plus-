/**
 * js/mock/seed/ratings.js – Seed lecture and doctor ratings from students.
 * target_type "lecture" | "doctor" — doctor endpoints aggregate without student identities.
 * Depends on: Nothing.
 */

export const SEED_RATINGS = [
  /* ── Lecture ratings ── */
  {
    id: "rat-1",
    student_id: "usr-1",
    target_type: "lecture",
    target_id: "lec-a1",
    course_id: "crs-a",
    score: 5,
    comment: "Extremely clear overview. The trade-off matrix was very useful.",
    created_at: "2026-10-06T12:00:00Z",
  },
  {
    id: "rat-2",
    student_id: "usr-2",
    target_type: "lecture",
    target_id: "lec-a1",
    course_id: "crs-a",
    score: 4,
    comment: "Good pace. Would appreciate more live coding examples.",
    created_at: "2026-10-06T12:30:00Z",
  },
  {
    id: "rat-3",
    student_id: "usr-1",
    target_type: "lecture",
    target_id: "lec-a2",
    course_id: "crs-a",
    score: 5,
    comment: "The hexagonal architecture diagram made everything click.",
    created_at: "2026-10-13T12:00:00Z",
  },
  {
    id: "rat-4",
    student_id: "usr-3",
    target_type: "lecture",
    target_id: "lec-b1",
    course_id: "crs-b",
    score: 4,
    comment: null,
    created_at: "2026-10-07T14:00:00Z",
  },

  /* ── Doctor ratings ── */
  {
    id: "rat-5",
    student_id: "usr-1",
    target_type: "doctor",
    target_id: "usr-6",
    course_id: "crs-a",
    score: 5,
    comment: "Very approachable and explains complex topics clearly.",
    created_at: "2026-10-13T13:00:00Z",
  },
  {
    id: "rat-6",
    student_id: "usr-2",
    target_type: "doctor",
    target_id: "usr-6",
    course_id: "crs-a",
    score: 4,
    comment: "Great teaching style. Feedback on assignments could be faster.",
    created_at: "2026-10-22T09:00:00Z",
  },
  {
    id: "rat-7",
    student_id: "usr-3",
    target_type: "doctor",
    target_id: "usr-7",
    course_id: "crs-c",
    score: 5,
    comment: "Excellent real-world API examples. Very helpful office hours.",
    created_at: "2026-10-21T15:00:00Z",
  },
];
