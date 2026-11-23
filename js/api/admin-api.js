/**
 * js/api/admin-api.js – Department Admin domain API client.
 *
 * Dispatches all Department Admin operations through request() in js/core/http.js.
 * Strictly decoupled from database/mock implementation details.
 *
 * Depends on: js/core/http.js
 */

import { request } from "../core/http.js";

/* ---------- 1. Dashboard ---------- */

/**
 * Retrieves the department overview dashboard metrics and summaries.
 *
 * @returns {Promise<{
 *   dept_name: string,
 *   student_count: number,
 *   doctor_count: number,
 *   course_count: number,
 *   avg_attendance_rate: number,
 *   at_risk_students: Array<{ id: string, full_name: string, course_code: string, absence_count: number }>,
 *   top_students: Array<{ id: string, full_name: string, points: number, rank: number }>
 * }>}
 */
export async function getAdminDashboard() {
  return request("/admin/dashboard/summary");
}

/* ---------- 2. Students Management ---------- */

/**
 * Retrieves all students belonging to the department admin's department.
 *
 * @param {string} [courseId] - Optional course ID filter.
 * @returns {Promise<Array<{
 *   id: string,
 *   full_name: string,
 *   email: string,
 *   university_id: string,
 *   disabled: boolean,
 *   enrolled_courses: string[]
 * }>>}
 */
export async function getAdminStudents(courseId) {
  const query = courseId ? `?course_id=${encodeURIComponent(courseId)}` : "";
  return request(`/admin/students${query}`);
}

/**
 * Creates a new student record in the administrator's department.
 *
 * @param {{ full_name: string, email: string, university_id: string }} data
 * @returns {Promise<{ student: object, temp_password: string }>}
 */
export async function createAdminStudent(data) {
  return request("/admin/students", {
    method: "POST",
    body: data,
  });
}

/**
 * Updates a student profile within the admin's department.
 *
 * @param {string} id - Student ID.
 * @param {{ full_name?: string, email?: string, university_id?: string }} data
 * @returns {Promise<object>}
 */
export async function updateAdminStudent(id, data) {
  return request(`/admin/students/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: data,
  });
}

/**
 * Deactivates a student account.
 *
 * @param {string} id - Student ID.
 * @returns {Promise<{ message: string, disabled: boolean }>}
 */
export async function deactivateAdminStudent(id) {
  return request(`/admin/students/${encodeURIComponent(id)}/deactivate`, {
    method: "POST",
  });
}

/**
 * Reactivates a deactivated student account.
 *
 * @param {string} id - Student ID.
 * @returns {Promise<{ message: string, disabled: boolean }>}
 */
export async function reactivateAdminStudent(id) {
  return request(`/admin/students/${encodeURIComponent(id)}/reactivate`, {
    method: "POST",
  });
}

/* ---------- 3. Faculty Doctors Management ---------- */

/**
 * Retrieves all doctors assigned to the admin's department.
 *
 * @returns {Promise<Array<{
 *   id: string,
 *   full_name: string,
 *   email: string,
 *   university_id: string,
 *   disabled: boolean,
 *   courses: Array<{ id: string, code: string, title: string }>
 * }>>}
 */
export async function getAdminDoctors() {
  return request("/admin/doctors");
}

/**
 * Creates a new faculty doctor account in the admin's department.
 *
 * @param {{ full_name: string, email: string, university_id: string }} data
 * @returns {Promise<{ doctor: object, temp_password: string }>}
 */
export async function createAdminDoctor(data) {
  return request("/admin/doctors", {
    method: "POST",
    body: data,
  });
}

/**
 * Updates a faculty doctor profile.
 *
 * @param {string} id - Doctor ID.
 * @param {{ full_name?: string, email?: string, university_id?: string }} data
 * @returns {Promise<object>}
 */
export async function updateAdminDoctor(id, data) {
  return request(`/admin/doctors/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: data,
  });
}

/**
 * Deactivates a doctor account.
 *
 * @param {string} id - Doctor ID.
 * @returns {Promise<{ message: string, disabled: boolean }>}
 */
export async function deactivateAdminDoctor(id) {
  return request(`/admin/doctors/${encodeURIComponent(id)}/deactivate`, {
    method: "POST",
  });
}

/**
 * Reactivates a doctor account.
 *
 * @param {string} id - Doctor ID.
 * @returns {Promise<{ message: string, disabled: boolean }>}
 */
export async function reactivateAdminDoctor(id) {
  return request(`/admin/doctors/${encodeURIComponent(id)}/reactivate`, {
    method: "POST",
  });
}

/* ---------- 4. Courses & Enrollments ---------- */

/**
 * Retrieves courses in the admin's department with enrollment figures.
 *
 * @returns {Promise<Array<{
 *   id: string,
 *   code: string,
 *   title: string,
 *   doctor: string,
 *   doctor_id: string,
 *   credit_hours: number,
 *   student_count: number,
 *   schedule: string,
 *   room: string,
 *   color: string
 * }>>}
 */
export async function getAdminCourses() {
  return request("/admin/courses");
}

/**
 * Creates a new department course.
 *
 * @param {{
 *   code: string,
 *   title: string,
 *   doctor_id: string,
 *   credit_hours: number,
 *   schedule: string,
 *   room: string,
 *   color?: string
 * }} data
 * @returns {Promise<object>}
 */
export async function createAdminCourse(data) {
  return request("/admin/courses", {
    method: "POST",
    body: data,
  });
}

/**
 * Updates course details.
 *
 * @param {string} id - Course ID.
 * @param {object} data
 * @returns {Promise<object>}
 */
export async function updateAdminCourse(id, data) {
  return request(`/admin/courses/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: data,
  });
}

/**
 * Enrolls a department student in a course.
 *
 * @param {string} courseId - Course ID.
 * @param {string|{ student_id: string }} studentIdOrObj - Student ID or object containing student_id.
 * @returns {Promise<object>}
 */
export async function enrollStudent(courseId, studentIdOrObj) {
  const body = typeof studentIdOrObj === "object" && studentIdOrObj !== null
    ? studentIdOrObj
    : { student_id: studentIdOrObj };

  return request(`/admin/courses/${encodeURIComponent(courseId)}/enroll`, {
    method: "POST",
    body,
  });
}

/**
 * Unenrolls a student from a course.
 *
 * @param {string} courseId - Course ID.
 * @param {string} studentId - Student ID.
 * @returns {Promise<{ message: string }>}
 */
export async function unenrollStudent(courseId, studentId) {
  return request(`/admin/courses/${encodeURIComponent(courseId)}/enroll/${encodeURIComponent(studentId)}`, {
    method: "DELETE",
  });
}

/* ---------- 5. Attendance & Points ---------- */

/**
 * Retrieves attendance analytics by course in the department.
 *
 * @returns {Promise<Array<{
 *   course_id: string,
 *   course_code: string,
 *   course_title: string,
 *   total_sessions: number,
 *   avg_attendance_rate: number,
 *   at_risk_count: number
 * }>>}
 */
export async function getAdminAttendance() {
  return request("/admin/attendance");
}

/**
 * Retrieves monthly points leaderboard for all department students.
 *
 * @returns {Promise<Array<{
 *   rank: number,
 *   student_id: string,
 *   full_name: string,
 *   points: number
 * }>>}
 */
export async function getAdminPoints() {
  return request("/admin/points");
}

/* ---------- 6. Messages & Inbox ---------- */

/**
 * Retrieves outbox messages sent by or to the admin.
 *
 * @returns {Promise<Array<object>>}
 */
export async function getAdminMessages() {
  return request("/admin/messages");
}

/**
 * Broadcasts an administrative message to department students, doctors, both, or dean.
 *
 * @param {{
 *   recipient_type: 'students'|'doctors'|'both'|'dean',
 *   subject: string,
 *   body: string,
 *   type: 'notice'|'warning'|'suggestion'
 * }} data
 * @returns {Promise<{ sent_count: number }>}
 */
export async function sendAdminMessage(data) {
  return request("/admin/messages", {
    method: "POST",
    body: data,
  });
}

/**
 * Retrieves count of unread messages for the admin.
 *
 * @returns {Promise<{ unread_count: number }>}
 */
export async function getAdminUnreadCount() {
  return request("/admin/inbox/unread-count");
}

/**
 * Retrieves incoming messages directed to the admin.
 *
 * @returns {Promise<Array<object>>}
 */
export async function getAdminInbox() {
  return request("/admin/inbox");
}

/**
 * Marks an admin message as read.
 *
 * @param {string} id - Message ID.
 * @returns {Promise<object>}
 */
export async function markAdminMessageRead(id) {
  return request(`/admin/inbox/${encodeURIComponent(id)}/read`, {
    method: "PUT",
  });
}

/* ---------- 7. Institutional Settings (Read-Only) ---------- */

/**
 * Retrieves college settings for display.
 *
 * @returns {Promise<object>}
 */
export async function getAdminSettings() {
  return request("/admin/settings");
}

/* ---------- 8. Profile ---------- */

/**
 * Retrieves authenticated department admin profile.
 *
 * @returns {Promise<{
 *   id: string,
 *   full_name: string,
 *   email: string,
 *   university_id: string,
 *   department: string,
 *   role: string
 * }>}
 */
export async function getAdminProfile() {
  return request("/admin/profile");
}
