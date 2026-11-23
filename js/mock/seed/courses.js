/**
 * js/mock/seed/courses.js – Seed course catalogue.
 *
 * Three courses:
 *   crs-a  SE301  Software Architecture & Design Patterns  → doctor1 (usr-6)
 *   crs-b  SE304  Operating Systems & Concurrency          → doctor1 (usr-6)
 *   crs-c  SE302  Web Engineering & RESTful Services       → doctor2 (usr-7)
 *
 * Depends on: Nothing.
 */

export const SEED_COURSES = [
  {
    id: "crs-a",
    code: "SE301",
    title: "Software Architecture & Design Patterns",
    department_id: "dept-1",
    doctor_id: "usr-6",
    credit_hours: 3,
    schedule: "Sun & Tue 10:00–11:30 AM",
    room: "Hall 3B",
    total_lectures: 12,
    color: "#2563eb",
    created_at: "2026-09-01T00:00:00Z",
  },
  {
    id: "crs-b",
    code: "SE304",
    title: "Operating Systems & Concurrency",
    department_id: "dept-1",
    doctor_id: "usr-6",
    credit_hours: 4,
    schedule: "Mon & Wed 12:00–1:45 PM",
    room: "Hall 1A",
    total_lectures: 14,
    color: "#16a34a",
    created_at: "2026-09-01T00:00:00Z",
  },
  {
    id: "crs-c",
    code: "SE302",
    title: "Web Engineering & RESTful Services",
    department_id: "dept-1",
    doctor_id: "usr-7",
    credit_hours: 3,
    schedule: "Tue & Thu 1:00–2:30 PM",
    room: "Lab 101",
    total_lectures: 12,
    color: "#2563eb",
    created_at: "2026-09-01T00:00:00Z",
  },
  {
    id: "crs-d",
    code: "IS201",
    title: "Database Systems",
    doctor_id: "usr-12",
    department_id: "dept-2",
    credit_hours: 3,
    total_lectures: 14,
    schedule: "Mon/Wed 10:00–11:30",
    room: "IS-Lab 1",
    color: "#0ea5e9",
    created_at: "2026-09-01T00:00:00Z",
  },
  {
    id: "crs-e",
    code: "IS202",
    title: "Systems Analysis",
    doctor_id: "usr-12",
    department_id: "dept-2",
    credit_hours: 3,
    total_lectures: 14,
    schedule: "Tue/Thu 12:00–13:30",
    room: "IS-Lab 2",
    color: "#7c3aed",
    created_at: "2026-09-01T00:00:00Z",
  },
];
