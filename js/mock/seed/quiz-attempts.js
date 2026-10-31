/**
 * js/mock/seed/quiz-attempts.js – Seed completed quiz attempts.
 * answers[] contains the index chosen per question (maps to questions[i].options).
 * score is computed at submission time from correct_index comparisons.
 * Depends on: Nothing.
 */

export const SEED_QUIZ_ATTEMPTS = [
  /* usr-1 completed qz-a1 (5 questions, 5 points max) */
  {
    id: "qa-1",
    quiz_id: "qz-a1",
    student_id: "usr-1",
    answers: [1, 1, 2, 1, 2],   // indices chosen
    score: 5,                   // all correct
    total: 5,
    submitted_at: "2026-10-25T10:15:00Z",
  },

  /* usr-2 completed qz-a1 */
  {
    id: "qa-2",
    quiz_id: "qz-a1",
    student_id: "usr-2",
    answers: [1, 1, 2, 0, 2],   // q4 wrong
    score: 4,
    total: 5,
    submitted_at: "2026-10-25T11:30:00Z",
  },

  /* usr-3 completed qz-a1 */
  {
    id: "qa-3",
    quiz_id: "qz-a1",
    student_id: "usr-3",
    answers: [0, 1, 2, 1, 2],   // q1 wrong
    score: 4,
    total: 5,
    submitted_at: "2026-10-26T09:00:00Z",
  },

  /* usr-2 completed qz-b1 (3 questions) */
  {
    id: "qa-4",
    quiz_id: "qz-b1",
    student_id: "usr-2",
    answers: [2, 1, 1],
    score: 3,
    total: 3,
    submitted_at: "2026-10-27T09:45:00Z",
  },

  /* usr-3 completed qz-b1 */
  {
    id: "qa-5",
    quiz_id: "qz-b1",
    student_id: "usr-3",
    answers: [2, 1, 0],         // q3 wrong
    score: 2,
    total: 3,
    submitted_at: "2026-10-27T10:20:00Z",
  },

  /* usr-4 completed qz-b1 */
  {
    id: "qa-6",
    quiz_id: "qz-b1",
    student_id: "usr-4",
    answers: [2, 1, 1],
    score: 3,
    total: 3,
    submitted_at: "2026-10-27T11:00:00Z",
  },

  /* usr-3 completed qz-c1 (2 questions) */
  {
    id: "qa-7",
    quiz_id: "qz-c1",
    student_id: "usr-3",
    answers: [2, 1],
    score: 2,
    total: 2,
    submitted_at: "2026-10-28T09:30:00Z",
  },

  /* usr-5 completed qz-c1 */
  {
    id: "qa-8",
    quiz_id: "qz-c1",
    student_id: "usr-5",
    answers: [2, 1],
    score: 2,
    total: 2,
    submitted_at: "2026-10-28T10:00:00Z",
  },
];
