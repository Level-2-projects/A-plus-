/**
 * js/mock/seed/attendance.js – Seed attendance sessions and per-student records.
 *
 * Sessions: three per course (one per seeded lecture).
 * Records: every enrolled student has a record in each session.
 * Absence counts per student per course:
 *   crs-a: usr-1=0, usr-2=1, usr-3=2  ← usr-3 is AT the warning threshold
 *   crs-b: usr-2=0, usr-3=1, usr-4=1
 *   crs-c: usr-3=0, usr-4=0, usr-5=1
 *
 * Depends on: Nothing.
 */

export const SEED_ATTENDANCE_SESSIONS = [
  /* ── Course A (SE301) ── */
  { id: "ses-a1", course_id: "crs-a", lecture_id: "lec-a1", date: "2026-10-06", method: "manual" },
  { id: "ses-a2", course_id: "crs-a", lecture_id: "lec-a2", date: "2026-10-13", method: "manual" },
  { id: "ses-a3", course_id: "crs-a", lecture_id: "lec-a3", date: "2026-10-20", method: "dynamic_qr" },

  /* ── Course B (SE304) ── */
  { id: "ses-b1", course_id: "crs-b", lecture_id: "lec-b1", date: "2026-10-07", method: "manual" },
  { id: "ses-b2", course_id: "crs-b", lecture_id: "lec-b2", date: "2026-10-14", method: "manual" },
  { id: "ses-b3", course_id: "crs-b", lecture_id: "lec-b3", date: "2026-10-21", method: "dynamic_qr" },

  /* ── Course C (SE302) ── */
  { id: "ses-c1", course_id: "crs-c", lecture_id: "lec-c1", date: "2026-10-07", method: "manual" },
  { id: "ses-c2", course_id: "crs-c", lecture_id: "lec-c2", date: "2026-10-14", method: "manual" },
  { id: "ses-c3", course_id: "crs-c", lecture_id: "lec-c3", date: "2026-10-21", method: "manual" },
];

export const SEED_ATTENDANCE_RECORDS = [
  /* ── Session A1 (lec-a1) ── */
  { id: "atr-a1-1", session_id: "ses-a1", student_id: "usr-1", status: "present" },
  { id: "atr-a1-2", session_id: "ses-a1", student_id: "usr-2", status: "present" },
  { id: "atr-a1-3", session_id: "ses-a1", student_id: "usr-3", status: "present" },

  /* ── Session A2 (lec-a2) ── */
  { id: "atr-a2-1", session_id: "ses-a2", student_id: "usr-1", status: "present" },
  { id: "atr-a2-2", session_id: "ses-a2", student_id: "usr-2", status: "absent" },   // usr-2: 1 absence in A
  { id: "atr-a2-3", session_id: "ses-a2", student_id: "usr-3", status: "present" },

  /* ── Session A3 (lec-a3) ── */
  { id: "atr-a3-1", session_id: "ses-a3", student_id: "usr-1", status: "present" },
  { id: "atr-a3-2", session_id: "ses-a3", student_id: "usr-2", status: "present" },
  { id: "atr-a3-3", session_id: "ses-a3", student_id: "usr-3", status: "absent" },   // usr-3: 1st absence in A

  /* ── Session B1 ── */
  { id: "atr-b1-1", session_id: "ses-b1", student_id: "usr-2", status: "present" },
  { id: "atr-b1-2", session_id: "ses-b1", student_id: "usr-3", status: "present" },
  { id: "atr-b1-3", session_id: "ses-b1", student_id: "usr-4", status: "present" },

  /* ── Session B2 ── */
  { id: "atr-b2-1", session_id: "ses-b2", student_id: "usr-2", status: "present" },
  { id: "atr-b2-2", session_id: "ses-b2", student_id: "usr-3", status: "absent" },   // usr-3: 1 absence in B
  { id: "atr-b2-3", session_id: "ses-b2", student_id: "usr-4", status: "present" },

  /* ── Session B3 ── */
  { id: "atr-b3-1", session_id: "ses-b3", student_id: "usr-2", status: "present" },
  { id: "atr-b3-2", session_id: "ses-b3", student_id: "usr-3", status: "present" },
  { id: "atr-b3-3", session_id: "ses-b3", student_id: "usr-4", status: "absent" },   // usr-4: 1 absence in B

  /* ── Session C1 ── */
  { id: "atr-c1-1", session_id: "ses-c1", student_id: "usr-3", status: "present" },
  { id: "atr-c1-2", session_id: "ses-c1", student_id: "usr-4", status: "present" },
  { id: "atr-c1-3", session_id: "ses-c1", student_id: "usr-5", status: "present" },

  /* ── Session C2 ── */
  { id: "atr-c2-1", session_id: "ses-c2", student_id: "usr-3", status: "present" },
  { id: "atr-c2-2", session_id: "ses-c2", student_id: "usr-4", status: "present" },
  { id: "atr-c2-3", session_id: "ses-c2", student_id: "usr-5", status: "absent" },   // usr-5: 1 absence in C

  /* ── Session C3 ── */
  { id: "atr-c3-1", session_id: "ses-c3", student_id: "usr-3", status: "present" },
  { id: "atr-c3-2", session_id: "ses-c3", student_id: "usr-4", status: "present" },
  { id: "atr-c3-3", session_id: "ses-c3", student_id: "usr-5", status: "present" },
];
