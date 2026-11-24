/**
 * js/api/doctor-api.js – Doctor domain API client.
 * Dispatches all doctor requests through request() in js/core/http.js.
 * Strictly decoupled from database/mock implementation details.
 *
 * Depends on: js/core/http.js
 */

import { request } from "../core/http.js";

/* ---------- 1. Doctor Dashboard Summary ---------- */

/**
 * Retrieves items needing attention today for the doctor:
 * Uncorrected submissions, upcoming deadlines, students at absence penalty risk, and average rating.
 *
 * @returns {Promise<{
 *   active_courses_count: number,
 *   pending_submissions_to_grade: number,
 *   students_at_absence_risk: number,
 *   upcoming_deadlines: Array<{ title: string, due: string }>,
 *   average_student_rating: number|null,
 *   total_enrolled_students: number
 * }>}
 */
export async function getDoctorDashboardSummary() {
  return request("/doctor/dashboard/summary");
}

/* ---------- 2. Doctor Assigned Courses ---------- */

/**
 * Retrieves all courses assigned to the logged-in doctor.
 *
 * @returns {Promise<Array<{
 *   id: string,
 *   code: string,
 *   title: string,
 *   department: string,
 *   credit_hours: number,
 *   enrolled_count: number,
 *   lectures_count: number,
 *   completed_lectures: number,
 *   schedule: string,
 *   room: string
 * }>>}
 */
export async function getDoctorCourses() {
  return request("/doctor/courses");
}

/**
 * Retrieves details for a single course assigned to the doctor.
 *
 * @param {string} id - Course ID or code.
 * @returns {Promise<{
 *   id: string, code: string, title: string, department: string, credit_hours: number,
 *   enrolled_count: number, lectures_count: number, completed_lectures: number,
 *   schedule: string, room: string,
 *   lectures: Array<{ id: string, number: number, title: string, date: string, material_url: string|null }>
 * }>}
 */
export async function getDoctorCourse(id) {
  return request(`/doctor/courses/${encodeURIComponent(id)}`);
}

/* ---------- 3. Assignments & Grading ---------- */

/**
 * Retrieves all assignments and student submissions across doctor's courses.
 * Includes AI preliminary scores out of 10 and doctor's final grade slot.
 *
 * @returns {Promise<Array<{
 *   id: string,
 *   course_code: string,
 *   course_id: string,
 *   title: string,
 *   description: string,
 *   due_date: string,
 *   max_grade: number,
 *   total_submissions: number,
 *   pending_submissions: number,
 *   graded_submissions: number,
 *   submissions: Array<{
 *     id: string,
 *     student_id: string,
 *      student_name: string,
 content: string,
 *     submitted_at: string,
 *     is_late: boolean,
 *     ai_evaluation: { score_out_of_10: number, feedback_summary: string, confidence: number },
 *     doctor_final_grade: number|null,
 *     doctor_feedback: string|null,
 *     graded_at: string|null
 *   }>
 * }>>}
 */
export async function getDoctorAssignments() {
  return request("/doctor/assignments");
}

/**
 * Retrieves count of submissions pending grading across all courses.
 * Drives the gold sidebar badge on the doctor's Assignments item.
 *
 * @returns {Promise<{ pending_count: number }>}
 */
export async function getDoctorPendingSubmissionsCount() {
  return request("/doctor/assignments/pending-count");
}

/**
 * Doctor creates a new assignment for an enrolled course.
 *
 * @param {{
 *   course_id: string,
 *   title: string,
 *   description?: string,
 *   due_date: string,
 *   max_grade?: number
 * }} assignmentData
 * @returns {Promise<object>}
 */
export async function createDoctorAssignment(assignmentData) {
  return request("/doctor/assignments", {
    method: "POST",
    body: assignmentData,
  });
}

/** Updates editable properties of an assignment owned by the authenticated doctor. */
export async function updateDoctorAssignment(assignmentId, assignmentData) {
  return request(`/doctor/assignments/${encodeURIComponent(assignmentId)}`, { method: "PATCH", body: assignmentData });
}

/**
 * Doctor creates or uploads materials for a lecture.
 *
 * @param {{
 *   course_id: string,
 *   title: string,
 *   number?: number,
 *   date?: string,
 *   material_url?: string
 * }} lectureData
 * @returns {Promise<object>}
 */
export async function createDoctorLecture(lectureData) {
  return request("/doctor/lectures", {
    method: "POST",
    body: lectureData,
  });
}

/** Updates editable lecture metadata for a course owned by the authenticated doctor. */
export async function updateDoctorLecture(lectureId, lectureData) {
  return request(`/doctor/lectures/${encodeURIComponent(lectureId)}`, { method: "PATCH", body: lectureData });
}

/**
 * Doctor submits the final grade and optional feedback for a student submission.
 *
 * @param {string} submissionId - Unique submission ID.
 * @param {{ final_grade: number, doctor_feedback?: string }} gradeData
 * @returns {Promise<object>}
 */
export async function gradeAssignmentSubmission(submissionId, gradeData) {
  return request(`/doctor/submissions/${encodeURIComponent(submissionId)}/grade`, {
    method: "POST",
    body: gradeData,
  });
}

/* ---------- 4. Quizzes & Results ---------- */

/**
 * Retrieves quizzes created by the doctor and aggregated results.
 *
 * @returns {Promise<Array<{
 *   id: string,
 *   course_code: string,
 *   course_id: string,
 *   title: string,
 *   duration_minutes: number,
 *   available_from: string,
 *   available_to: string,
 *   status: string,
 *   total_enrolled: number,
 *   completed_count: number,
 *   average_score: number|null,
 *   questions_count: number
 * }>>}
 */
export async function getDoctorQuizzes() {
  return request("/doctor/quizzes");
}

/**
 * Retrieves the enrolled students' attempts and scores for a doctor-owned quiz.
 *
 * @param {string} quizId - Quiz identifier.
 * @returns {Promise<{ attempts: Array<{ student_name: string, submitted_at: string, score: number, total: number }> }>}
 */
export async function getDoctorQuizResults(quizId) {
  return request(`/doctor/quizzes/${encodeURIComponent(quizId)}/results`);
}

/**
 * Creates a new quiz.
 *
 * @param {object} quizData
 * @returns {Promise<object>}
 */
export async function createDoctorQuiz(quizData) {
  return request("/doctor/quizzes", {
    method: "POST",
    body: quizData,
  });
}

/** Updates editable quiz metadata for a course owned by the authenticated doctor. */
export async function updateDoctorQuiz(quizId, quizData) {
  return request(`/doctor/quizzes/${encodeURIComponent(quizId)}`, { method: "PATCH", body: quizData });
}

/* ---------- 5. Lecture Attendance ---------- */

/**
 * Retrieves attendance sessions history for doctor's courses.
 *
 * @returns {Promise<Array<{
 *   id: string,
 *   course_code: string,
 *   course_id: string,
 *   lecture_id: string|null,
 *   lecture_title: string,
 *   date: string,
 *   method: string,
 *   present_count: number,
 *   absent_count: number,
 *   total: number
 * }>>}
 */
export async function getDoctorAttendanceSessions() {
  return request("/doctor/attendance");
}

/**
 * Records a new lecture attendance session (hybrid QR or roster).
 *
 * @param {{
 *   course_id: string,
 *   lecture_id?: string,
 *   date: string,
 *   method?: string,
 *   records: Array<{ student_id: string, status: 'present'|'absent'|'excused' }>
 * }} sessionData
 * @returns {Promise<{ session_id: string, recorded: number }>}
 */
export async function recordAttendanceSession(sessionData) {
  return request("/doctor/attendance", {
    method: "POST",
    body: sessionData,
  });
}

/* ---------- 6. Students Roster & Bonus Points ---------- */

/**
 * Retrieves enrolled students roster with attendance records and penalty status.
 *
 * @param {string} [courseCode] - Optional course filter (code or ID).
 * @returns {Promise<Array<{
 *   student_id: string,
 *   name: string,
 *   university_id: string,
 *   course_code: string,
 *   course_id: string,
 *   attendance_rate: number,
 *   absences_count: number,
 *   at_penalty_risk: boolean,
 *   current_grade: number|null,
 *   bonus_points_granted: number,
 *   current_month_points: number
 * }>>}
 */
export async function getDoctorStudents(courseCode) {
  const query = courseCode ? `?course=${encodeURIComponent(courseCode)}` : "";
  return request(`/doctor/students${query}`);
}

/**
 * Doctor grants bonus points to a student for exceptional contributions or participation.
 * Feeds directly into the student's monthly top-3 points calculation.
 *
 * @param {string} studentId - Target student ID.
 * @param {{ points: number, reason: string }} bonusData
 * @returns {Promise<{ success: boolean, student_id: string, points_granted: number, new_total_bonus: number }>}
 */
export async function grantBonusPoints(studentId, bonusData) {
  return request(`/doctor/students/${encodeURIComponent(studentId)}/bonus`, {
    method: "POST",
    body: bonusData,
  });
}

/* ---------- 7. Doctor Messages & Outbox ---------- */

/**
 * Retrieves messages and alerts sent by the doctor to students.
 *
 * @returns {Promise<Array<object>>}
 */
export async function getDoctorMessages() {
  return request("/doctor/messages");
}

/** Retrieves received doctor messages, newest first. */
export async function getDoctorInbox() { return request("/doctor/inbox"); }

/** Retrieves the unread received-message count for the doctor sidebar. */
export async function getDoctorUnreadCount() { return request("/doctor/inbox/unread-count"); }

/** Marks a received doctor message as read. */
export async function markDoctorMessageRead(id) { return request(`/doctor/inbox/${encodeURIComponent(id)}/read`, { method: "PUT" }); }

/**
 * Sends a message, notice, or absence warning to students (lands in their student inbox).
 *
 * @param {{
 *   course_id: string,
 *   recipient_ids?: string[],
 *   type?: 'warning'|'notice'|'suggestion'|'system',
 *   subject: string,
 *   body: string
 * }} messageData
 * @returns {Promise<{ sent_count: number, message_ids: string[] }>}
 */
export async function sendDoctorMessage(messageData) {
  return request("/doctor/messages", {
    method: "POST",
    body: messageData,
  });
}

/* ---------- 8. Anonymous Ratings & Feedback ---------- */

/**
 * Retrieves aggregated anonymous student ratings and constructive comments.
 *
 * @returns {Promise<{
 *   overall_score: number|null,
 *   total_evaluations: number,
 *   breakdown: Array<{ metric: string, score: number|null }>,
 *   anonymous_comments: Array<{ course_code: string, target_type: string, target_title: string, date: string, score: number, comment: string }>
 * }>}
 */
export async function getDoctorRatings() {
  return request("/doctor/ratings");
}

/* ---------- 9. Doctor Profile ---------- */

/**
 * Retrieves authenticated doctor's profile.
 *
 * @returns {Promise<object>}
 */
export async function getDoctorProfile() {
  return request("/doctor/profile");
}
