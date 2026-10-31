/**
 * js/mock/seed/todos.js – Seed personal to-do items for students.
 * Todos are private to their owner (enforced by mock server).
 * Depends on: Nothing.
 */

export const SEED_TODOS = [
  /* ── usr-1 todos ── */
  {
    id: "todo-1",
    student_id: "usr-1",
    title: "Review Hexagonal Architecture notes before Quiz 2",
    course_code: "SE301",
    due_date: "2026-11-04",
    priority: "high",
    completed: false,
    created_at: "2026-10-28T10:00:00Z",
  },
  {
    id: "todo-2",
    student_id: "usr-1",
    title: "Submit Assignment 1: Design Pattern Report",
    course_code: "SE301",
    due_date: "2026-11-10",
    priority: "high",
    completed: false,
    created_at: "2026-10-27T09:00:00Z",
  },
  {
    id: "todo-3",
    student_id: "usr-1",
    title: "Prepare quiz notes for SE301 Quiz 2",
    course_code: "SE301",
    due_date: "2026-11-05",
    priority: "medium",
    completed: true,
    created_at: "2026-10-25T14:00:00Z",
  },

  /* ── usr-2 todos ── */
  {
    id: "todo-4",
    student_id: "usr-2",
    title: "Finish SE304 Assignment 1 – Scheduler Simulator",
    course_code: "SE304",
    due_date: "2026-11-08",
    priority: "high",
    completed: false,
    created_at: "2026-10-29T08:00:00Z",
  },
  {
    id: "todo-5",
    student_id: "usr-2",
    title: "Read Chapter 7 of Operating Systems Concepts",
    course_code: "SE304",
    due_date: "2026-11-01",
    priority: "medium",
    completed: false,
    created_at: "2026-10-26T11:00:00Z",
  },

  /* ── usr-3 todos ── */
  {
    id: "todo-6",
    student_id: "usr-3",
    title: "Complete SE302 Assignment 1 – OpenAPI Spec",
    course_code: "SE302",
    due_date: "2026-11-12",
    priority: "high",
    completed: false,
    created_at: "2026-10-29T10:00:00Z",
  },
];
