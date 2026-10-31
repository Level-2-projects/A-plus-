/**
 * js/api/student-api.js – Student domain API client.
 * Dispatches all student requests through request() in js/core/http.js.
 * Strictly decoupled from database/mock implementation details.
 *
 * Depends on: js/core/http.js
 */

import { request } from "../core/http.js";

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
 *   department: string,
 *   unread_messages: number
 * }>}
 */
export async function getDashboardSummary() {
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
 *   room: string,
 *   doctor_id: string,
 *   lectures: Array<{ id: string, number: number, title: string, date: string, material_url: string|null }>
 * }|null>}
 */
export async function getCourse(id) {
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
 *   description: string,
 *   due_date: string,
 *   status: 'pending'|'submitted'|'graded'|'missed',
 *   submitted_at: string|null,
 *   is_late: boolean|null,
 *   ai_feedback: string|null,
 *   final_grade: number|null,
 *   doctor_feedback: string|null,
 *   graded_at: string|null,
 *   max_grade: number
 * }>>}
 */
export async function getAssignments() {
  return request("/student/assignments");
}

/**
 * Retrieves a single assignment by ID.
 *
 * @param {string} id - Assignment ID.
 * @returns {Promise<object>}
 */
export async function getAssignment(id) {
  return request(`/student/assignments/${encodeURIComponent(id)}`);
}

/**
 * Submits an assignment solution (once per assignment).
 *
 * @param {string} assignmentId
 * @param {{ content: string }} submissionData
 * @returns {Promise<{
 *   id: string,
 *   assignment_id: string,
 *   submitted_at: string,
 *   is_late: boolean,
 *   ai_feedback: string
 * }>}
 */
export async function submitAssignment(assignmentId, submissionData) {
  return request(`/student/assignments/${encodeURIComponent(assignmentId)}/submit`, {
    method: "POST",
    body: submissionData,
  });
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
 *   status: 'upcoming'|'available'|'completed'|'missed',
 *   available_from: string,
 *   available_to: string,
 *   score: number|null,
 *   total_score: number,
 *   submitted_at: string|null
 * }>>}
 */
export async function getQuizzes() {
  return request("/student/quizzes");
}

/**
 * Retrieves a single quiz by ID (including questions if currently active and unattempted).
 *
 * @param {string} id - Quiz ID.
 * @returns {Promise<object>}
 */
export async function getQuiz(id) {
  return request(`/student/quizzes/${encodeURIComponent(id)}`);
}

/**
 * Submits an attempt for a quiz.
 *
 * @param {string} quizId
 * @param {{ answers: number[] }} attemptData - Array of chosen answer option indices.
 * @returns {Promise<{ id: string, score: number, total: number, submitted_at: string }>}
 */
export async function attemptQuiz(quizId, attemptData) {
  return request(`/student/quizzes/${encodeURIComponent(quizId)}/attempt`, {
    method: "POST",
    body: attemptData,
  });
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
 *   }>,
 *   history: Array<{ session_id: string, course_id: string, course_code: string, lecture_title: string, date: string, status: 'present'|'absent'|'excused' }>
 * }>}
 */
export async function getAttendance() {
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
  return request("/student/todos");
}

/**
 * Creates a new personal to-do item.
 *
 * @param {{ title: string, course_code?: string, due_date?: string, priority?: 'high'|'medium'|'low' }} todoData
 * @returns {Promise<object>}
 */
export async function createTodo(todoData) {
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
 * @returns {Promise<object>}
 */
export async function updateTodo(id, updates) {
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
 *   breakdown: Array<{ source: string, points: number }>,
 *   ledger: Array<{ source: string, points: number, description: string, created_at: string }>
 * }>}
 */
export async function getPoints() {
  return request("/student/points");
}

/* ---------- 8. Learning Roadmaps (PROVISIONAL) ---------- */

/**
 * Retrieves the student's milestone learning tracks and progress.
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
  return request("/student/roadmaps");
}

/* ---------- 9. Student Profile ---------- */

/**
 * Retrieves the authenticated student's profile.
 *
 * @returns {Promise<{id: string, full_name: string, email: string, university_id: string, department: string, role: string}>}
 */
export async function getProfile() {
  return request("/student/profile");
}

/* ---------- 10. Inbox & Notifications ---------- */

/**
 * Retrieves messages and system alerts from the student's inbox.
 *
 * @returns {Promise<Array<{
 *   id: string,
 *   type: 'warning'|'notice'|'suggestion'|'system',
 *   sender_name: string,
 *   subject: string,
 *   body: string,
 *   created_at: string,
 *   is_read: boolean
 * }>>}
 */
export async function getInbox() {
  return request("/student/inbox");
}

/**
 * Marks a specific inbox message as read.
 *
 * @param {string} id - Message ID.
 * @returns {Promise<boolean>}
 */
export async function markMessageRead(id) {
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
  return request("/student/inbox/unread-count");
}

/* ---------- 11. Ratings ---------- */

/**
 * Submits a rating for a lecture or doctor.
 *
 * @param {{ target_type: 'lecture'|'doctor', target_id: string, course_id?: string, score: number, comment?: string }} ratingData
 * @returns {Promise<object>}
 */
export async function submitRating(ratingData) {
  return request("/student/ratings", {
    method: "POST",
    body: ratingData,
  });
}
