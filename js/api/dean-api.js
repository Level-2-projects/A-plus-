/**
 * js/api/dean-api.js – College Dean (super_admin) domain API client.
 *
 * Dispatches all Dean operations through request() in js/core/http.js.
 * Strictly decoupled from database/mock implementation details.
 *
 * Depends on: js/core/http.js
 */

import { request } from "../core/http.js";

/* ---------- 1. Overview & Department Management ---------- */

/**
 * Retrieves the college-wide executive summary.
 *
 * @returns {Promise<{
 *   dept_count: number,
 *   total_students: number,
 *   total_doctors: number,
 *   total_courses: number,
 *   college_avg_attendance: number,
 *   college_avg_grade: number|null,
 *   departments: Array<{ id: string, name: string, student_count: number, doctor_count: number, avg_attendance_rate: number }>
 * }>}
 */
export async function getDeanOverview() {
  return request("/dean/overview/summary");
}

/**
 * Retrieves all departments with key academic metrics and assigned administrators.
 *
 * @returns {Promise<Array<{
 *   id: string,
 *   name: string,
 *   code: string,
 *   student_count: number,
 *   doctor_count: number,
 *   course_count: number,
 *   admin: string|null
 * }>>}
 */
export async function getDeanDepartments() {
  return request("/dean/departments");
}

/**
 * Creates a new department and provisions its Department Admin account.
 *
 * @param {{
 *   name: string,
 *   code: string,
 *   admin_full_name: string,
 *   admin_email: string,
 *   admin_university_id: string
 * }} data
 * @returns {Promise<{
 *   department: object,
 *   admin: object,
 *   temp_password: string
 * }>}
 */
export async function createDeanDepartment(data) {
  return request("/dean/departments", {
    method: "POST",
    body: data,
  });
}

/**
 * Retrieves full details and performance breakdown for a single department.
 *
 * @param {string} id - Department ID.
 * @returns {Promise<object>}
 */
export async function getDeanDepartmentDetail(id) {
  return request(`/dean/departments/${encodeURIComponent(id)}`);
}

/* ---------- 2. Analytics & Reporting ---------- */

/**
 * Retrieves college analytics across attendance, submissions, grades, and ratings.
 * Strictly anonymized (contains no student identity or ai_score values).
 *
 * @param {'this_month'|'last_30_days'|'all_time'} [period='all_time']
 * @returns {Promise<{
 *   attendance_rate: number,
 *   submission_rate: number,
 *   avg_grade: number|null,
 *   avg_doctor_rating: number|null,
 *   at_risk_count: number,
 *   top_students: Array<{ id: string, full_name: string, points: number, rank: number }>,
 *   departments: Array<object>
 * }>}
 */
export async function getDeanAnalytics(period = "all_time") {
  const query = period ? `?period=${encodeURIComponent(period)}` : "";
  return request(`/dean/analytics${query}`);
}

/** Retrieves CSV-ready dean report rows without student identities or AI scores. */
export async function getDeanReports(period = "all_time") {
  const query = period ? `?period=${encodeURIComponent(period)}` : "";
  return request(`/dean/reports${query}`);
}

/* ---------- 3. Announcements & Messaging ---------- */

/**
 * Retrieves announcements and messages broadcast by the Dean.
 *
 * @returns {Promise<Array<object>>}
 */
export async function getDeanMessages() {
  return request("/dean/messages");
}

/**
 * Broadcasts a message to college, a department, or role-specific audiences.
 *
 * @param {{
 *   audience: 'college'|'department'|'dept_students'|'dept_doctors'|'all_doctors'|'all_students',
 *   department_id?: string,
 *   subject: string,
 *   body: string,
 *   type?: string
 * }} data
 * @returns {Promise<{ sent_count: number, broadcast_id: string }>}
 */
export async function sendDeanMessage(data) {
  return request("/dean/messages", {
    method: "POST",
    body: data,
  });
}

/**
 * Retrieves incoming messages sent to the Dean.
 *
 * @returns {Promise<Array<object>>}
 */
export async function getDeanInbox() {
  return request("/dean/inbox");
}

/**
 * Marks an inbox message as read for the Dean.
 *
 * @param {string} id - Message ID.
 * @returns {Promise<object>}
 */
export async function markDeanMessageRead(id) {
  return request(`/dean/inbox/${encodeURIComponent(id)}/read`, {
    method: "PUT",
  });
}

/**
 * Retrieves the count of unread inbox messages for the Dean.
 *
 * @returns {Promise<{ unread_count: number }>}
 */
export async function getDeanUnreadCount() {
  return request("/dean/inbox/unread-count");
}

/* ---------- 4. Settings Configuration ---------- */

/**
 * Retrieves current institutional threshold and points configuration.
 *
 * @returns {Promise<{
 *   id: string,
 *   absence_warning_threshold: number,
 *   rating_cooldown_days: number,
 *   points_submission_on_time: number,
 *   points_quiz_completion: number,
 *   points_attendance_present: number,
 *   updated_at: string,
 *   updated_by: string|null
 * }>}
 */
export async function getDeanSettings() {
  return request("/dean/settings");
}

/**
 * Updates institutional academic policies and points rules.
 *
 * @param {{
 *   absence_warning_threshold?: number,
 *   rating_cooldown_days?: number,
 *   points_submission_on_time?: number,
 *   points_quiz_completion?: number,
 *   points_attendance_present?: number
 * }} data
 * @returns {Promise<object>}
 */
export async function updateDeanSettings(data) {
  return request("/dean/settings", {
    method: "PATCH",
    body: data,
  });
}

/* ---------- 5. Profile ---------- */

/**
 * Retrieves the authenticated Dean's profile record.
 *
 * @returns {Promise<object>}
 */
export async function getDeanProfile() {
  return request("/dean/profile");
}
