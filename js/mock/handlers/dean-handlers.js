/**
 * Mock route handler module.
 * Contains moved synchronous request handlers and imports shared mock runtime dependencies.
 *
 * Depends on: js/mock/mock-runtime.js
 */

import {
  mockDb, generateId, getNow, getCurrentMonth, evaluateSubmission,
  POINTS_SUBMISSION_ON_TIME, POINTS_QUIZ_COMPLETION, POINTS_ATTENDANCE_PRESENT,
  ABSENCE_WARNING_THRESHOLD, RATING_COOLDOWN_DAYS, ok, fail, err403, err404,
  err409, err422, isValidDateOnly, studentCourseIds, doctorCourseIds,
  doctorOwnsCourse, studentsInCourses, checkAbsenceWarning,
} from "../mock-runtime.js";
import { generateTempPassword } from "./admin-account-handlers.js";

export function handleDeanOverview(db, _user) {
  const totalStudents = db.users.filter((u) => u.role === "student" && !u.disabled).length;
  const totalDoctors  = db.users.filter((u) => u.role === "doctor" && !u.disabled).length;
  const totalCourses  = db.courses.length;

  const records = db.attendance_records;
  const presentCount = records.filter((r) => r.status === "present").length;
  const collegeAvgAttendance = records.length > 0 ? Math.round((presentCount / records.length) * 1000) / 10 : 100;

  const gradedSubmissions = db.submissions.filter((s) => typeof s.final_grade === "number");
  const collegeAvgGrade = gradedSubmissions.length > 0
    ? Math.round((gradedSubmissions.reduce((sum, s) => sum + s.final_grade, 0) / gradedSubmissions.length) * 10) / 10
    : null;

  const departments = db.departments.map((d) => {
    const deptCourses = db.courses.filter((c) => c.department_id === d.id);
    const sessionIds = db.attendance_sessions
      .filter((s) => deptCourses.some((c) => c.id === s.course_id))
      .map((s) => s.id);
    const deptRecords = db.attendance_records.filter((r) => sessionIds.includes(r.session_id));
    const deptPresent = deptRecords.filter((r) => r.status === "present").length;
    const avgAttendance = deptRecords.length > 0 ? Math.round((deptPresent / deptRecords.length) * 1000) / 10 : 100;

    return {
      id: d.id,
      name: d.name,
      code: d.code,
      student_count: db.users.filter((u) => u.role === "student" && u.department_id === d.id && !u.disabled).length,
      doctor_count: db.users.filter((u) => u.role === "doctor" && u.department_id === d.id && !u.disabled).length,
      course_count: deptCourses.length,
      avg_attendance_rate: avgAttendance,
    };
  });

  return ok({
    dept_count: db.departments.length,
    total_students: totalStudents,
    total_doctors: totalDoctors,
    total_courses: totalCourses,
    college_avg_attendance: collegeAvgAttendance,
    college_avg_grade: collegeAvgGrade,
    departments,
  });
}

/** GET /dean/departments */
export function handleDeanDepartments(db, _user) {
  const departments = db.departments.map((d) => {
    const admin = db.users.find((u) => u.role === "department_admin" && u.department_id === d.id);
    return {
      id: d.id,
      name: d.name,
      code: d.code,
      student_count: db.users.filter((u) => u.role === "student" && u.department_id === d.id && !u.disabled).length,
      doctor_count: db.users.filter((u) => u.role === "doctor" && u.department_id === d.id && !u.disabled).length,
      course_count: db.courses.filter((c) => c.department_id === d.id).length,
      admin: admin ? admin.full_name : null,
    };
  });
  return ok(departments);
}

/** POST /dean/departments */
export function handleDeanCreateDepartment(db, _user, body) {
  const name              = body?.name?.trim();
  const code              = body?.code?.trim().toUpperCase();
  const adminFullName     = body?.admin_full_name?.trim();
  const adminEmail        = body?.admin_email?.trim().toLowerCase();
  const adminUniversityId = body?.admin_university_id?.trim();

  const errors = {};
  if (!name) errors.name = "Department name is required.";
  if (!code) errors.code = "Department code is required.";
  if (!adminFullName) errors.admin_full_name = "Admin full name is required.";
  if (!adminEmail) errors.admin_email = "Admin email is required.";
  if (!adminUniversityId) errors.admin_university_id = "Admin university ID is required.";
  if (Object.keys(errors).length > 0) return err422(errors);

  if (db.departments.some((d) => d.code.toUpperCase() === code)) {
    return err409("Department code already exists.");
  }
  if (db.users.some((u) => u.email.toLowerCase() === adminEmail)) {
    return err409("Admin email already registered.");
  }

  const newDept = {
    id: generateId("dept"),
    name,
    code,
    college: "Faculty of Computing & Information Technology",
    created_at: getNow().toISOString(),
  };

  const tempPassword = generateTempPassword();
  const newAdmin = {
    id: generateId("usr"),
    email: adminEmail,
    password: tempPassword,
    full_name: adminFullName,
    role: "department_admin",
    department_id: newDept.id,
    department_name: newDept.name,
    university_id: adminUniversityId,
    disabled: false,
  };

  db.departments.push(newDept);
  db.users.push(newAdmin);
  mockDb.save(db);

  return ok({
    department: newDept,
    admin: {
      id: newAdmin.id,
      full_name: newAdmin.full_name,
      email: newAdmin.email,
      university_id: newAdmin.university_id,
      role: newAdmin.role,
    },
    temp_password: tempPassword,
  }, 201);
}

/** GET /dean/departments/:id */
export function handleDeanDepartmentDetail(db, _user, deptId) {
  const dept = db.departments.find((d) => d.id === deptId);
  if (!dept) return err404("Department");

  const deptStudents = db.users.filter((u) => u.role === "student" && u.department_id === dept.id && !u.disabled);
  const deptDoctors  = db.users.filter((u) => u.role === "doctor" && u.department_id === dept.id && !u.disabled);
  const deptCourses  = db.courses.filter((c) => c.department_id === dept.id);

  const deptCourseIds = deptCourses.map((c) => c.id);
  const sessionIds = db.attendance_sessions
    .filter((s) => deptCourseIds.includes(s.course_id))
    .map((s) => s.id);
  const records = db.attendance_records.filter((r) => sessionIds.includes(r.session_id));
  const attendedCount = records.filter((r) => r.status === "present").length;
  const avgAttendanceRate = records.length > 0 ? Math.round((attendedCount / records.length) * 1000) / 10 : 100;

  const threshold = db.settings?.absence_warning_threshold ?? ABSENCE_WARNING_THRESHOLD;
  const atRiskStudents = [];
  for (const student of deptStudents) {
    for (const course of deptCourses) {
      const courseSessionIds = db.attendance_sessions
        .filter((s) => s.course_id === course.id)
        .map((s) => s.id);
      const absenceCount = db.attendance_records.filter(
        (r) => courseSessionIds.includes(r.session_id) && r.student_id === student.id && r.status === "absent"
      ).length;
      if (absenceCount >= threshold) {
        atRiskStudents.push({
          id: student.id,
          full_name: student.full_name,
          course_code: course.code,
          absence_count: absenceCount,
        });
      }
    }
  }

  const currentMonth = getCurrentMonth();
  const topStudents = deptStudents.map((s) => ({
    id: s.id,
    full_name: s.full_name,
    points: db.points_ledger
      .filter((p) => p.student_id === s.id && p.month === currentMonth)
      .reduce((sum, p) => sum + p.points, 0),
  }))
  .sort((a, b) => b.points - a.points)
  .slice(0, 3)
  .map((s, idx) => ({ id: s.id, full_name: s.full_name, points: s.points, rank: idx + 1 }));

  return ok({
    dept_name: dept.name,
    student_count: deptStudents.length,
    doctor_count: deptDoctors.length,
    course_count: deptCourses.length,
    avg_attendance_rate: avgAttendanceRate,
    at_risk_students: atRiskStudents,
    top_students: topStudents,
    doctors: deptDoctors.map((d) => ({
      id: d.id,
      full_name: d.full_name,
      courses: db.courses.filter((c) => c.doctor_id === d.id).map((c) => c.code),
    })),
    courses: deptCourses.map((c) => ({
      id: c.id,
      code: c.code,
      title: c.title,
      doctor: db.users.find((u) => u.id === c.doctor_id)?.full_name ?? "Unassigned",
      enrolled_count: db.enrollments.filter((e) => e.course_id === c.id).length,
    })),
  });
}

/** GET /dean/settings */
export function handleDeanSettings(db, _user) {
  return ok(db.settings || {});
}

/** PATCH /dean/settings */
export function handleDeanUpdateSettings(db, user, body) {
  if (!db.settings) db.settings = {};

  const numericFields = [
    "absence_warning_threshold",
    "rating_cooldown_days",
    "points_submission_on_time",
    "points_quiz_completion",
    "points_attendance_present",
  ];

  const errors = {};
  for (const field of numericFields) {
    if (body?.[field] !== undefined) {
      const val = Number(body[field]);
      if (!Number.isInteger(val) || val <= 0) {
        errors[field] = "Must be a positive integer.";
      }
    }
  }

  if (Object.keys(errors).length > 0) return err422(errors);

  for (const field of numericFields) {
    if (body?.[field] !== undefined) {
      db.settings[field] = Number(body[field]);
    }
  }

  db.settings.updated_at = getNow().toISOString();
  db.settings.updated_by = user.id;

  mockDb.save(db);
  return ok(db.settings);
}

