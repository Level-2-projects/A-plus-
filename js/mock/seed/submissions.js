/**
 * js/mock/seed/submissions.js – Seed assignment submissions.
 *
 * Seeds a realistic mix:
 *   - sub-1: asg-a2, usr-1, on-time, doctor-graded (complete example)
 *   - sub-2: asg-a2, usr-2, on-time, ai-scored but NOT yet doctor-graded (pending)
 *   - sub-3: asg-a2, usr-3, LATE, ai-scored but NOT yet doctor-graded
 *   - sub-4: asg-b2, usr-2, on-time, doctor-graded
 *   - sub-5: asg-c2, usr-3, on-time, pending grade
 *   - sub-6: asg-c2, usr-5, on-time, pending grade
 *
 * ai_score_out_of_10 is internal to the doctor; student endpoints must NEVER return it.
 * Depends on: Nothing.
 */

export const SEED_SUBMISSIONS = [
  /* ── Assignment A2 (past-due) ── */
  {
    id: "sub-1",
    assignment_id: "asg-a2",
    student_id: "usr-1",
    content: "Attached refactored codebase with full Hexagonal Architecture implementation.",
    submitted_at: "2026-10-14T14:20:00Z",
    is_late: false,
    ai_score_out_of_10: 8.5,
    ai_feedback:
      "Strong separation of domain logic from infrastructure. Ports are well-defined; consider adding an anti-corruption layer for the legacy adapter.",
    ai_confidence: 0.94,
    doctor_final_grade: 17,
    doctor_feedback: "Excellent refactoring. The domain model is clean and the adapters are well-named.",
    graded_at: "2026-10-22T10:00:00Z",
  },
  {
    id: "sub-2",
    assignment_id: "asg-a2",
    student_id: "usr-2",
    content: "Hexagonal architecture applied; see GitHub repo link and design document.",
    submitted_at: "2026-10-14T16:45:00Z",
    is_late: false,
    ai_score_out_of_10: 9.2,
    ai_feedback:
      "Exemplary domain isolation. The inbound HTTP adapter and outbound DB adapter are textbook examples. Minor: missing input validation in the service layer.",
    ai_confidence: 0.97,
    doctor_final_grade: null,
    doctor_feedback: null,
    graded_at: null,
  },
  {
    id: "sub-3",
    assignment_id: "asg-a2",
    student_id: "usr-3",
    content: "Partial implementation — apologies for the late submission.",
    submitted_at: "2026-10-16T09:15:00Z",  // 1 day late
    is_late: true,
    ai_score_out_of_10: 6.2,
    ai_feedback:
      "The core domain model is correct but the infrastructure layer still leaks domain concerns. The repository interface is missing.",
    ai_confidence: 0.88,
    doctor_final_grade: null,
    doctor_feedback: null,
    graded_at: null,
  },

  /* ── Assignment B2 (past-due) ── */
  {
    id: "sub-4",
    assignment_id: "asg-b2",
    student_id: "usr-2",
    content: "Banker's algorithm implementation with 8 test scenarios.",
    submitted_at: "2026-10-17T20:00:00Z",
    is_late: false,
    ai_score_out_of_10: 8.8,
    ai_feedback:
      "Correct safety algorithm implementation. Test cases are thorough. Edge case with n=1 process is handled correctly.",
    ai_confidence: 0.92,
    doctor_final_grade: 23,
    doctor_feedback: "Well done. The test suite is comprehensive.",
    graded_at: "2026-10-25T11:00:00Z",
  },
  {
    id: "sub-5",
    assignment_id: "asg-c2",
    student_id: "usr-3",
    content: "JWT auth implementation with refresh-token rotation.",
    submitted_at: "2026-10-19T17:30:00Z",
    is_late: false,
    ai_score_out_of_10: 7.9,
    ai_feedback:
      "Refresh token rotation is implemented correctly. The role guard middleware is clean. Consider adding rate limiting on the login endpoint.",
    ai_confidence: 0.91,
    doctor_final_grade: null,
    doctor_feedback: null,
    graded_at: null,
  },
  {
    id: "sub-6",
    assignment_id: "asg-c2",
    student_id: "usr-5",
    content: "Full JWT implementation with RBAC.",
    submitted_at: "2026-10-19T22:00:00Z",
    is_late: false,
    ai_score_out_of_10: 9.0,
    ai_feedback:
      "Excellent implementation. RBAC is well-structured. Token expiry handling is robust.",
    ai_confidence: 0.96,
    doctor_final_grade: null,
    doctor_feedback: null,
    graded_at: null,
  },
];
