/**
 * js/mock/dean-analytics-service.js – Dean-safe, period-aware institutional aggregates.
 * Exports analytics and CSV-ready report builders without student identities or AI scores.
 */

import { getNow } from "../core/clock.js";

const PERIODS = new Set(["this_month", "last_30_days", "all_time"]);
const ATTENTION_ATTENDANCE = 75;
const ATTENTION_SUBMISSIONS = 60;
const ATTENTION_RATING = 3;

/** Validates a requested analytics time window. */
export function resolvePeriod(value) {
  return PERIODS.has(value) ? value : "all_time";
}

/** Returns whether an ISO or date-only value falls inside the requested window. */
export function isInPeriod(value, period) {
  if (period === "all_time") return true;
  const now = getNow();
  const date = new Date(value);
  if (period === "this_month") return date.getUTCFullYear() === now.getUTCFullYear() && date.getUTCMonth() === now.getUTCMonth();
  return date >= new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)) && date <= now;
}

/** Rounds finite metric values to one decimal place, preserving missing values. */
function average(values) {
  if (!values.length) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

/** Builds anonymous, per-course metrics for a department. */
function courseMetrics(db, course, period, threshold) {
  const sessions = db.attendance_sessions.filter((item) => item.course_id === course.id && isInPeriod(item.date, period));
  const sessionIds = new Set(sessions.map((item) => item.id));
  const records = db.attendance_records.filter((item) => sessionIds.has(item.session_id));
  const attendanceRate = records.length ? Math.round((records.filter((item) => item.status === "present").length / records.length) * 1000) / 10 : null;
  const assignments = db.assignments.filter((item) => item.course_id === course.id && isInPeriod(item.due_date, period));
  const assignmentIds = new Set(assignments.map((item) => item.id));
  const eligible = assignments.reduce((sum) => sum + db.enrollments.filter((item) => item.course_id === course.id).length, 0);
  const submissions = db.submissions.filter((item) => assignmentIds.has(item.assignment_id) && isInPeriod(item.submitted_at, period));
  const submissionRate = eligible ? Math.round((submissions.length / eligible) * 1000) / 10 : null;
  const grades = submissions.filter((item) => typeof item.doctor_final_grade === "number").map((item) => item.doctor_final_grade);
  const ratings = db.ratings.filter((item) => item.target_type === "doctor" && item.course_id === course.id && isInPeriod(item.created_at, period));
  const absentByStudent = new Map();
  records.filter((item) => item.status === "absent").forEach((item) => absentByStudent.set(item.student_id, (absentByStudent.get(item.student_id) || 0) + 1));
  const studentIds = new Set(db.enrollments.filter((item) => item.course_id === course.id).map((item) => item.student_id));
  const points = db.points_ledger.filter((item) => studentIds.has(item.student_id) && isInPeriod(item.created_at, period)).map((item) => item.points);
  return {
    course_id: course.id, course_code: course.code, course_name: course.title,
    attendance_rate: attendanceRate, submission_rate: submissionRate, average_grade: average(grades),
    average_doctor_rating: average(ratings.map((item) => item.score)), doctor_rating_count: ratings.length,
    at_risk_count: [...absentByStudent.values()].filter((count) => count >= threshold).length,
    average_points: average(points),
  };
}

/** Returns department metrics and nested dean-safe course metrics for a period. */
export function buildDeanAnalytics(db, periodValue) {
  const period = resolvePeriod(periodValue);
  const threshold = db.settings?.absence_warning_threshold ?? 2;
  const departments = db.departments.map((department) => {
    const courses = db.courses.filter((course) => course.department_id === department.id).map((course) => courseMetrics(db, course, period, threshold));
    const students = db.users.filter((user) => user.role === "student" && user.department_id === department.id && !user.disabled);
    const months = [getNow().toISOString().slice(0, 7), new Date(Date.UTC(getNow().getUTCFullYear(), getNow().getUTCMonth() - 1, 1)).toISOString().slice(0, 7)];
    const top_students = months.map((month) => ({ month, ranking: students.map((student) => ({ points: db.points_ledger.filter((entry) => entry.student_id === student.id && entry.month === month).reduce((sum, entry) => sum + entry.points, 0) })).sort((a, b) => b.points - a.points).slice(0, 3).map((entry, index) => ({ rank: index + 1, points: entry.points })) }));
    return { department_id: department.id, department_name: department.name, ...summarize(courses), courses, top_students };
  });
  const allCourses = departments.flatMap((department) => department.courses.map((course) => ({ ...course, department_id: department.department_id, department_name: department.department_name })));
  return { period, ...summarize(allCourses), departments, needs_attention: allCourses.filter((course) => (course.attendance_rate !== null && course.attendance_rate < ATTENTION_ATTENDANCE) || (course.submission_rate !== null && course.submission_rate < ATTENTION_SUBMISSIONS) || (course.average_doctor_rating !== null && course.average_doctor_rating < ATTENTION_RATING)).map((course) => ({ department_id: course.department_id, department_name: course.department_name, course_id: course.course_id, course_code: course.course_code, reasons: [course.attendance_rate !== null && course.attendance_rate < ATTENTION_ATTENDANCE ? "high_absence" : null, course.submission_rate !== null && course.submission_rate < ATTENTION_SUBMISSIONS ? "low_submissions" : null, course.average_doctor_rating !== null && course.average_doctor_rating < ATTENTION_RATING ? "low_ratings" : null].filter(Boolean) })) };
}

/** Calculates college or department rollups from anonymous course metrics. */
function summarize(courses) {
  return { attendance_rate: average(courses.map((item) => item.attendance_rate).filter((item) => item !== null)), submission_rate: average(courses.map((item) => item.submission_rate).filter((item) => item !== null)), average_grade: average(courses.map((item) => item.average_grade).filter((item) => item !== null)), average_doctor_rating: average(courses.map((item) => item.average_doctor_rating).filter((item) => item !== null)), doctor_rating_count: courses.reduce((sum, item) => sum + item.doctor_rating_count, 0), at_risk_count: courses.reduce((sum, item) => sum + item.at_risk_count, 0), average_points: average(courses.map((item) => item.average_points).filter((item) => item !== null)) };
}

/** Builds CSV-ready report rows without exposing student identities. */
export function buildDeanReports(db, period) {
  const analytics = buildDeanAnalytics(db, period);
  const courses = analytics.departments.flatMap((department) => department.courses.map((course) => ({ department_id: department.department_id, department_name: department.department_name, ...course })));
  return { period: analytics.period, attendance: courses.map(({ department_id, department_name, course_code, attendance_rate, at_risk_count }) => ({ department_id, department_name, course_code, attendance_rate, at_risk_count })), submissions_and_grades: courses.map(({ department_id, department_name, course_code, submission_rate, average_grade }) => ({ department_id, department_name, course_code, submission_rate, average_grade })), doctor_ratings: courses.map(({ department_id, department_name, course_code, average_doctor_rating, doctor_rating_count }) => ({ department_id, department_name, course_code, average_doctor_rating, doctor_rating_count, anonymous_comments: db.ratings.filter((item) => item.target_type === "doctor" && item.course_id === courses.find((course) => course.course_code === course_code)?.course_id && isInPeriod(item.created_at, analytics.period)).filter((item) => item.comment).map((item) => ({ comment: item.comment, created_at: item.created_at })) })), at_risk_students: courses.flatMap(({ department_id, department_name, course_id, course_code }) => anonymousRiskRows(db, department_id, department_name, course_id, course_code, analytics.period)) };
}

/** Produces anonymous at-risk rows that preserve no student identifier or identity. */
function anonymousRiskRows(db, departmentId, departmentName, courseId, courseCode, period) {
  const threshold = db.settings?.absence_warning_threshold ?? 2;
  const sessionIds = new Set(db.attendance_sessions.filter((item) => item.course_id === courseId && isInPeriod(item.date, period)).map((item) => item.id));
  const counts = new Map();
  db.attendance_records.filter((item) => sessionIds.has(item.session_id) && item.status === "absent").forEach((item) => counts.set(item.student_id, (counts.get(item.student_id) || 0) + 1));
  return [...counts.values()].filter((count) => count >= threshold).map((absence_count) => ({ department_id: departmentId, department_name: departmentName, course_code: courseCode, absence_count }));
}
