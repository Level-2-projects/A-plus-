/**
 * js/mock/seed/points-ledger.js – Seed points ledger entries.
 *
 * Points constants (must match js/config.js):
 *   POINTS_SUBMISSION_ON_TIME = 50
 *   POINTS_QUIZ_COMPLETION    = 30
 *   POINTS_ATTENDANCE_PRESENT = 10
 *
 * Current month October 2026 totals (for leaderboard test):
 *   usr-1: 50 + 30 + 10 + 10 + 10 = 110  → rank 1
 *   usr-2: 50 + 30 + 10 + 10      = 100  → rank 2
 *   usr-3: 30 + 10 + 10 + 10      =  60  → rank 3
 *   usr-4: 10 + 10 + 10           =  30
 *   usr-5: 30 + 10 + 10           =  50
 *
 * September 2026 entries must NOT appear in current-month leaderboard.
 *
 * Depends on: Nothing.
 */

export const SEED_POINTS_LEDGER = [
  /* ════════════════ October 2026 ════════════════ */

  /* usr-1 */
  {
    id: "pts-1",
    student_id: "usr-1",
    month: "2026-10",
    source: "submission",
    points: 50,
    reference_id: "sub-1",
    description: "On-time submission: SE301 – Assignment 2",
    created_at: "2026-10-14T14:20:00Z",
  },
  {
    id: "pts-2",
    student_id: "usr-1",
    month: "2026-10",
    source: "quiz",
    points: 30,
    reference_id: "qa-1",
    description: "Quiz completed: SE301 – Quiz 1",
    created_at: "2026-10-25T10:15:00Z",
  },
  {
    id: "pts-3",
    student_id: "usr-1",
    month: "2026-10",
    source: "attendance",
    points: 10,
    reference_id: "atr-a1-1",
    description: "Attendance: SE301 – Lecture 1",
    created_at: "2026-10-06T11:30:00Z",
  },
  {
    id: "pts-4",
    student_id: "usr-1",
    month: "2026-10",
    source: "attendance",
    points: 10,
    reference_id: "atr-a2-1",
    description: "Attendance: SE301 – Lecture 2",
    created_at: "2026-10-13T11:30:00Z",
  },
  {
    id: "pts-5",
    student_id: "usr-1",
    month: "2026-10",
    source: "attendance",
    points: 10,
    reference_id: "atr-a3-1",
    description: "Attendance: SE301 – Lecture 3",
    created_at: "2026-10-20T11:30:00Z",
  },

  /* usr-2 */
  {
    id: "pts-6",
    student_id: "usr-2",
    month: "2026-10",
    source: "submission",
    points: 50,
    reference_id: "sub-2",
    description: "On-time submission: SE301 – Assignment 2",
    created_at: "2026-10-14T16:45:00Z",
  },
  {
    id: "pts-7",
    student_id: "usr-2",
    month: "2026-10",
    source: "quiz",
    points: 30,
    reference_id: "qa-2",
    description: "Quiz completed: SE301 – Quiz 1",
    created_at: "2026-10-25T11:30:00Z",
  },
  {
    id: "pts-8",
    student_id: "usr-2",
    month: "2026-10",
    source: "attendance",
    points: 10,
    reference_id: "atr-a1-2",
    description: "Attendance: SE301 – Lecture 1",
    created_at: "2026-10-06T11:30:00Z",
  },
  {
    id: "pts-9",
    student_id: "usr-2",
    month: "2026-10",
    source: "attendance",
    points: 10,
    reference_id: "atr-b1-1",
    description: "Attendance: SE304 – Lecture 1",
    created_at: "2026-10-07T13:45:00Z",
  },

  /* usr-3 (late submission earns NO points) */
  {
    id: "pts-10",
    student_id: "usr-3",
    month: "2026-10",
    source: "quiz",
    points: 30,
    reference_id: "qa-3",
    description: "Quiz completed: SE301 – Quiz 1",
    created_at: "2026-10-26T09:00:00Z",
  },
  {
    id: "pts-11",
    student_id: "usr-3",
    month: "2026-10",
    source: "attendance",
    points: 10,
    reference_id: "atr-a1-3",
    description: "Attendance: SE301 – Lecture 1",
    created_at: "2026-10-06T11:30:00Z",
  },
  {
    id: "pts-12",
    student_id: "usr-3",
    month: "2026-10",
    source: "attendance",
    points: 10,
    reference_id: "atr-b1-2",
    description: "Attendance: SE304 – Lecture 1",
    created_at: "2026-10-07T13:45:00Z",
  },
  {
    id: "pts-13",
    student_id: "usr-3",
    month: "2026-10",
    source: "attendance",
    points: 10,
    reference_id: "atr-c1-1",
    description: "Attendance: SE302 – Lecture 1",
    created_at: "2026-10-07T14:30:00Z",
  },

  /* usr-4 */
  {
    id: "pts-14",
    student_id: "usr-4",
    month: "2026-10",
    source: "attendance",
    points: 10,
    reference_id: "atr-b1-3",
    description: "Attendance: SE304 – Lecture 1",
    created_at: "2026-10-07T13:45:00Z",
  },
  {
    id: "pts-15",
    student_id: "usr-4",
    month: "2026-10",
    source: "attendance",
    points: 10,
    reference_id: "atr-c1-2",
    description: "Attendance: SE302 – Lecture 1",
    created_at: "2026-10-07T14:30:00Z",
  },
  {
    id: "pts-16",
    student_id: "usr-4",
    month: "2026-10",
    source: "attendance",
    points: 10,
    reference_id: "atr-b2-3",
    description: "Attendance: SE304 – Lecture 2",
    created_at: "2026-10-14T13:45:00Z",
  },

  /* usr-5 */
  {
    id: "pts-17",
    student_id: "usr-5",
    month: "2026-10",
    source: "quiz",
    points: 30,
    reference_id: "qa-8",
    description: "Quiz completed: SE302 – Quiz 1",
    created_at: "2026-10-28T10:00:00Z",
  },
  {
    id: "pts-18",
    student_id: "usr-5",
    month: "2026-10",
    source: "attendance",
    points: 10,
    reference_id: "atr-c1-3",
    description: "Attendance: SE302 – Lecture 1",
    created_at: "2026-10-07T14:30:00Z",
  },
  {
    id: "pts-19",
    student_id: "usr-5",
    month: "2026-10",
    source: "attendance",
    points: 10,
    reference_id: "atr-c3-3",
    description: "Attendance: SE302 – Lecture 3",
    created_at: "2026-10-21T14:30:00Z",
  },

  /* ════════════════ September 2026 (previous month — ignored in leaderboard) ════════════════ */

  {
    id: "pts-sep-1",
    student_id: "usr-1",
    month: "2026-09",
    source: "bonus",
    points: 100,
    reference_id: null,
    description: "Bonus: Outstanding in-class presentation",
    created_at: "2026-09-20T12:00:00Z",
  },
  {
    id: "pts-sep-2",
    student_id: "usr-2",
    month: "2026-09",
    source: "bonus",
    points: 80,
    reference_id: null,
    description: "Bonus: Best project demo in September",
    created_at: "2026-09-25T12:00:00Z",
  },

  /* Dept 2 (Information Systems) students — September 2026 */
  {
    id: "pts-sep-3",
    student_id: "usr-13",
    month: "2026-09",
    source: "bonus",
    points: 75,
    reference_id: null,
    description: "Bonus: Database Schema Design Excellence",
    created_at: "2026-09-22T10:00:00Z",
  },
  {
    id: "pts-sep-4",
    student_id: "usr-14",
    month: "2026-09",
    source: "bonus",
    points: 60,
    reference_id: null,
    description: "Bonus: Requirements Analysis Case Study",
    created_at: "2026-09-23T14:00:00Z",
  },

  /* Dept 2 (Information Systems) students — October 2026 */
  {
    id: "pts-is-1",
    student_id: "usr-13",
    month: "2026-10",
    source: "bonus",
    points: 90,
    reference_id: null,
    description: "Bonus: Top performance in SQL Optimization",
    created_at: "2026-10-18T11:00:00Z",
  },
  {
    id: "pts-is-2",
    student_id: "usr-14",
    month: "2026-10",
    source: "bonus",
    points: 70,
    reference_id: null,
    description: "Bonus: Diligent participation in lab work",
    created_at: "2026-10-20T11:30:00Z",
  },
];
