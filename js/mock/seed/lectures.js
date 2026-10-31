/**
 * js/mock/seed/lectures.js – Seed lecture data for all courses.
 * Three lectures per course, with past dates (before 2026-10-30 reference date).
 * Depends on: Nothing.
 */

export const SEED_LECTURES = [
  /* ── Course A: SE301 ── */
  {
    id: "lec-a1",
    course_id: "crs-a",
    number: 1,
    title: "The Architecture Landscape: Styles, Patterns & Trade-offs",
    date: "2026-10-06",
    material_url: null,
  },
  {
    id: "lec-a2",
    course_id: "crs-a",
    number: 2,
    title: "Layered & Hexagonal Architecture Deep Dive",
    date: "2026-10-13",
    material_url: null,
  },
  {
    id: "lec-a3",
    course_id: "crs-a",
    number: 3,
    title: "Event-Driven Architecture & CQRS",
    date: "2026-10-20",
    material_url: null,
  },

  /* ── Course B: SE304 ── */
  {
    id: "lec-b1",
    course_id: "crs-b",
    number: 1,
    title: "Processes & Threads: Fundamentals",
    date: "2026-10-07",
    material_url: null,
  },
  {
    id: "lec-b2",
    course_id: "crs-b",
    number: 2,
    title: "CPU Scheduling Algorithms",
    date: "2026-10-14",
    material_url: null,
  },
  {
    id: "lec-b3",
    course_id: "crs-b",
    number: 3,
    title: "Deadlock: Detection, Prevention & Recovery",
    date: "2026-10-21",
    material_url: null,
  },

  /* ── Course C: SE302 ── */
  {
    id: "lec-c1",
    course_id: "crs-c",
    number: 1,
    title: "REST Principles & HTTP Semantics",
    date: "2026-10-07",
    material_url: null,
  },
  {
    id: "lec-c2",
    course_id: "crs-c",
    number: 2,
    title: "API Design: Resources, Versioning & Documentation",
    date: "2026-10-14",
    material_url: null,
  },
  {
    id: "lec-c3",
    course_id: "crs-c",
    number: 3,
    title: "Authentication & Authorization: JWT, OAuth 2.0",
    date: "2026-10-21",
    material_url: null,
  },
];
