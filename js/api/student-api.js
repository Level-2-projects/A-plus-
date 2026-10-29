/**
 * js/api/student-api.js – Student domain API client.
 * Dispatches requests to either the live FastAPI backend or the in-memory mock store.
 * Depends on: js/config.js, js/core/http.js, js/mock/student-mock-data.js
 */

import { USE_MOCK } from "../config.js";
import { request } from "../core/http.js";
import { mockDataStore } from "../mock/student-mock-data.js";

/** Small artificial network delay for mock testing */
const simulateDelay = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));

/* ---------- 1. Dashboard Summary ---------- */

/**
 * Retrieves aggregate overview metrics for the student dashboard.
 *
 * @returns {Promise<{
 *   enrolled_courses: number,
 *   pending_assignments: number,
 *   upcoming_quizzes: number,
 *   attendance_rate: number,
 *   points: number,
 *   rank: number,
 *   unread_messages: number
 * }>}
 */
export async function getDashboardSummary() {
  if (USE_MOCK) {
    await simulateDelay();
    return mockDataStore.getDashboardSummary();
  }
  return request("/student/dashboard/summary");
}

/* ---------- 2. Courses ---------- */

/**
 * Retrieves all courses in which the student is currently enrolled.
 *
 * @returns {Promise<Array<{
 *   id: string,
 *   code: string,
 *   title: string,
 *   doctor: string,
 *   department: string,
 *   credit_hours: number,
 *   lectures_count: number,
 *   completed_lectures: number,
 *   schedule: string,
 *   room: string
 * }>>}
 */
export async function getCourses() {
  if (USE_MOCK) {
    await simulateDelay();
    return mockDataStore.getCourses();
  }
  return request("/student/courses");
}

/**
 * Retrieves detailed information for a single course by ID or code.
 *
 * @param {string} id - Unique course identifier or course code.
 * @returns {Promise<{
 *   id: string,
 *   code: string,
 *   title: string,
 *   doctor: string,
 *   department: string,
 *   credit_hours: number,
 *   lectures_count: number,
 *   completed_lectures: number,
 *   schedule: string,
 *   room: string
 * }|null>}
 */
export async function getCourse(id) {
  if (USE_MOCK) {
    await simulateDelay();
    return mockDataStore.getCourse(id);
  }
  return request(`/student/courses/${encodeURIComponent(id)}`);
}

/* ---------- 3. Assignments ---------- */

/**
 * Retrieves the student's assignments across all enrolled courses.
 *
 * @returns {Promise<Array<{
 *   id: string,
 *   course_id: string,
 *   course_code: string,
 *   title: string,
 *   due_date: string,
 *   status: 'pending'|'submitted'|'graded',
 *   submitted_at: string|null,
 *   ai_feedback: string|null,
 *   final_grade: number|null,
 *   max_grade: number
 * }>>}
 */
export async function getAssignments() {
  if (USE_MOCK) {
    await simulateDelay();
    return mockDataStore.getAssignments();
  }
  return request("/student/assignments");
}

/* ---------- 4. Quizzes ---------- */

/**
 * Retrieves quizzes available, completed, or scheduled for the student.
 *
 * @returns {Promise<Array<{
 *   id: string,
 *   course_code: string,
 *   title: string,
 *   duration_minutes: number,
 *   questions_count: number,
 *   status: 'upcoming'|'completed'|'missed',
 *   available_from: string,
 *   available_to: string,
 *   score: number|null,
 *   total_score: number
 * }>>}
 */
export async function getQuizzes() {
  if (USE_MOCK) {
    await simulateDelay();
    return mockDataStore.getQuizzes();
  }
  return request("/student/quizzes");
}

/* ---------- 5. Attendance ---------- */

/**
 * Retrieves comprehensive attendance records and course-level penalty risks.
 *
 * @returns {Promise<{
 *   overall_percentage: number,
 *   total_lectures: number,
 *   attended_lectures: number,
 *   absence_count: number,
 *   grade_penalty_risk: boolean,
 *   warning_threshold: number,
 *   courses: Array<{
 *     course_id: string,
 *     course_code: string,
 *     course_title: string,
 *     total_sessions: number,
 *     attended: number,
 *     absences: number,
 *     percentage: number,
 *     penalty_status: 'normal'|'notice'|'warning'|'penalty'
 *   }>
 * }>}
 */
export async function getAttendance() {
  if (USE_MOCK) {
    await simulateDelay();
    return mockDataStore.getAttendance();
  }
  return request("/student/attendance");
}

/* ---------- 6. To-Do Items (CRUD) ---------- */

/**
 * Retrieves the student's personal to-do tasks.
 *
 * @returns {Promise<Array<{
 *   id: string,
 *   title: string,
 *   course_code?: string,
 *   due_date: string,
 *   priority: 'high'|'medium'|'low',
 *   completed: boolean,
 *   created_at: string
 * }>>}
 */
export async function getTodos() {
  if (USE_MOCK) {
    await simulateDelay();
    return mockDataStore.getTodos();
  }
  return request("/student/todos");
}

/**
 * Creates a new personal to-do item.
 *
 * @param {{ title: string, course_code?: string, due_date?: string, priority?: 'high'|'medium'|'low' }} todoData
 * @returns {Promise<{
 *   id: string,
 *   title: string,
 *   course_code?: string,
 *   due_date: string,
 *   priority: 'high'|'medium'|'low',
 *   completed: boolean,
 *   created_at: string
 * }>}
 */
export async function createTodo(todoData) {
  if (USE_MOCK) {
    await simulateDelay();
    return mockDataStore.addTodo(todoData);
  }
  return request("/student/todos", {
    method: "POST",
    body: todoData,
  });
}

/**
 * Updates properties of an existing to-do item (e.g. completion status).
 *
 * @param {string} id - Task ID.
 * @param {object} updates - Fields to modify.
 * @returns {Promise<object|null>}
 */
export async function updateTodo(id, updates) {
  if (USE_MOCK) {
    await simulateDelay();
    return mockDataStore.updateTodo(id, updates);
  }
  return request(`/student/todos/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: updates,
  });
}

/**
 * Deletes a to-do item by ID.
 *
 * @param {string} id - Task ID.
 * @returns {Promise<boolean>}
 */
export async function deleteTodo(id) {
  if (USE_MOCK) {
    await simulateDelay();
    return mockDataStore.deleteTodo(id);
  }
  await request(`/student/todos/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  return true;
}

/* ---------- 7. Gamified Points & Leaderboard ---------- */

/**
 * Retrieves current reward points, department standing, and monthly top 3 students.
 *
 * @returns {Promise<{
 *   current_points: number,
 *   department_rank: number,
 *   department_name: string,
 *   current_month: string,
 *   points_reset_date: string,
 *   monthly_top_3: Array<{
 *     rank: number,
 *     name: string,
 *     points: number,
 *     initials: string,
 *     department: string,
 *     is_current_user?: boolean
 *   }>,
 *   breakdown: Array<{ source: string, points: number }>
 * }>}
 */
export async function getPoints() {
  if (USE_MOCK) {
    await simulateDelay();
    return mockDataStore.getPoints();
  }
  return request("/student/points");
}

/* ---------- 8. Learning Roadmaps (PROVISIONAL) ---------- */

/**
 * Retrieves the student's milestone learning tracks and progress.
 * NOTE: PROVISIONAL SCHEMA – Subject to modification in future feature iterations.
 *
 * @returns {Promise<Array<{
 *   id: string,
 *   title: string,
 *   description: string,
 *   progress_percent: number,
 *   steps: Array<{
 *     id: string,
 *     title: string,
 *     status: 'done'|'current'|'locked'
 *   }>
 * }>>}
 */
export async function getRoadmaps() {
  if (USE_MOCK) {
    await simulateDelay();
    return mockDataStore.getRoadmaps();
  }
  return request("/student/roadmaps");
}

/* ---------- 9. Student Profile (PROVISIONAL) ---------- */

/**
 * Retrieves the authenticated student's profile.
 * NOTE: PROVISIONAL SCHEMA – subject to backend profile requirements.
 *
 * @returns {Promise<{id: string, full_name: string, email: string, university_id: string, department: string, level: string}>}
 */
export async function getProfile() {
  if (USE_MOCK) {
    await simulateDelay();
    return mockDataStore.getProfile();
  }
  return request("/student/profile");
}

/* ---------- 10. Inbox & Notifications ---------- */

/**
 * Retrieves messages and system alerts from the student's inbox.
 *
 * @returns {Promise<Array<{
 *   id: string,
 *   type: 'warning'|'notice'|'suggestion'|'system',
 *   sender: string,
 *   subject: string,
 *   body: string,
 *   created_at: string,
 *   is_read: boolean
 * }>>}
 */
export async function getInbox() {
  if (USE_MOCK) {
    await simulateDelay();
    return mockDataStore.getInbox();
  }
  return request("/student/inbox");
}

/**
 * Marks a specific inbox message as read.
 *
 * @param {string} id - Message ID.
 * @returns {Promise<boolean>}
 */
export async function markMessageRead(id) {
  if (USE_MOCK) {
    await simulateDelay(50);
    return mockDataStore.markMessageRead(id);
  }
  await request(`/student/inbox/${encodeURIComponent(id)}/read`, {
    method: "PUT",
  });
  return true;
}

/**
 * Retrieves the count of unread messages currently in the student's inbox.
 *
 * @returns {Promise<{ unread_count: number }>}
 */
export async function getUnreadCount() {
  if (USE_MOCK) {
    await simulateDelay(50);
    return { unread_count: mockDataStore.getUnreadCount() };
  }
  return request("/student/inbox/unread-count");
}
