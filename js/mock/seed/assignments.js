/**
 * js/mock/seed/assignments.js – Seed assignments.
 * Each course has one open (future due date) and one past-due assignment.
 * Reference "now": 2026-11-22
 * Depends on: Nothing.
 */

export const SEED_ASSIGNMENTS = [
  /* ── Course A: SE301 ── */
  {
    id: "asg-a1",
    course_id: "crs-a",
    title: "Assignment 1: Design Pattern Analysis Report",
    description:
      "Analyse three Gang-of-Four design patterns used in a real open-source project. Include class diagrams and a justification of each pattern choice.",
    due_date: "2027-06-10T23:59:00Z",
    max_grade: 20,
    created_at: "2026-10-07T08:00:00Z",
  },
  {
    id: "asg-a2",
    course_id: "crs-a",
    title: "Assignment 2: Hexagonal Architecture Refactoring",
    description:
      "Refactor the provided monolith codebase into a Hexagonal (Ports & Adapters) architecture. Document every port and adapter.",
    due_date: "2026-10-15T23:59:00Z",
    max_grade: 20,
    created_at: "2026-09-30T08:00:00Z",
  },

  /* ── Course B: SE304 ── */
  {
    id: "asg-b1",
    course_id: "crs-b",
    title: "Assignment 1: Scheduling Algorithm Simulator",
    description:
      "Implement FCFS, SJF (preemptive) and Round-Robin schedulers in Python. Compare average turnaround times on the given workload.",
    due_date: "2027-06-08T23:59:00Z",
    max_grade: 25,
    created_at: "2026-10-08T08:00:00Z",
  },
  {
    id: "asg-b2",
    course_id: "crs-b",
    title: "Assignment 2: Deadlock Detection Lab",
    description:
      "Implement the Banker's algorithm. Include a test suite with at least 5 safe-state and 3 unsafe-state scenarios.",
    due_date: "2026-10-18T23:59:00Z",
    max_grade: 25,
    created_at: "2026-09-28T08:00:00Z",
  },

  /* ── Course C: SE302 ── */
  {
    id: "asg-c1",
    course_id: "crs-c",
    title: "Assignment 1: RESTful API Design & OpenAPI Spec",
    description:
      "Design a RESTful API for a library management system. Provide a full OpenAPI 3.0 specification with request/response examples.",
    due_date: "2027-06-12T23:59:00Z",
    max_grade: 20,
    created_at: "2026-10-08T08:00:00Z",
  },
  {
    id: "asg-c2",
    course_id: "crs-c",
    title: "Assignment 2: JWT Authentication Implementation",
    description:
      "Implement a Node.js Express API with JWT login, refresh-token rotation, and role-based route guards.",
    due_date: "2026-10-20T23:59:00Z",
    max_grade: 20,
    created_at: "2026-09-28T08:00:00Z",
  },
];
