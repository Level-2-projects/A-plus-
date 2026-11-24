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

/** Allowed academic levels for department-admin student management. */
const STUDENT_LEVELS = ["1", "2", "3", "4", "5"];

export function adminOwnsDept(db, adminUser) {
  if (!adminUser.department_id) return null;
  return db.departments.find((d) => d.id === adminUser.department_id) || null;
}

/** Generates a temporary plain-text password for newly provisioned accounts. */
export function generateTempPassword() {
  return `Aplus${Math.floor(1000 + Math.random() * 9000)}!`;
}

/** GET /admin/dashboard/summary */
export function handleAdminDashboard(db, user) {
  const dept = adminOwnsDept(db, user);
  if (!dept) return err403();

  const deptStudents = db.users.filter((u) => u.role === "student" && u.department_id === dept.id && !u.disabled);
  const deptDoctors  = db.users.filter((u) => u.role === "doctor" && u.department_id === dept.id && !u.disabled);
  const deptCourses  = db.courses.filter((c) => c.department_id === dept.id);

  // Attendance rate across all courses in department
  const deptCourseIds = deptCourses.map((c) => c.id);
  const sessionIds = db.attendance_sessions
    .filter((s) => deptCourseIds.includes(s.course_id))
    .map((s) => s.id);
  const records = db.attendance_records.filter((r) => sessionIds.includes(r.session_id));
  const attendedCount = records.filter((r) => r.status === "present").length;
  const avgAttendanceRate = records.length > 0
    ? Math.round((attendedCount / records.length) * 1000) / 10
    : 100;

  // At-risk students based on dynamic absence warning threshold
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

  // Monthly top 3 students in this department
  const currentMonth = getCurrentMonth();
  const studentTotals = deptStudents.map((s) => ({
    id: s.id,
    full_name: s.full_name,
    points: db.points_ledger
      .filter((p) => p.student_id === s.id && p.month === currentMonth)
      .reduce((sum, p) => sum + p.points, 0),
  })).sort((a, b) => b.points - a.points);

  const topStudents = studentTotals.slice(0, 3).map((s, idx) => ({
    id: s.id,
    full_name: s.full_name,
    points: s.points,
    rank: idx + 1,
  }));

  return ok({
    dept_name: dept.name,
    student_count: deptStudents.length,
    doctor_count: deptDoctors.length,
    course_count: deptCourses.length,
    avg_attendance_rate: avgAttendanceRate,
    at_risk_students: atRiskStudents,
    top_students: topStudents,
  });
}

/** GET /admin/students */
export function handleAdminGetStudents(db, user, query) {
  const dept = adminOwnsDept(db, user);
  if (!dept) return err403();

  const courseId = query?.get("course_id");
  let students = db.users.filter((u) => u.role === "student" && u.department_id === dept.id);

  if (courseId) {
    const course = db.courses.find((c) => c.id === courseId && c.department_id === dept.id);
    if (!course) return err403();
    const enrolledIds = db.enrollments.filter((e) => e.course_id === courseId).map((e) => e.student_id);
    students = students.filter((s) => enrolledIds.includes(s.id));
  }

  const result = students.map((s) => ({
    id: s.id,
    full_name: s.full_name,
    email: s.email,
    university_id: s.university_id,
    level: s.level ?? null,
    disabled: Boolean(s.disabled),
    enrolled_courses: db.enrollments
      .filter((e) => e.student_id === s.id)
      .map((e) => db.courses.find((c) => c.id === e.course_id)?.code)
      .filter(Boolean),
  }));

  return ok(result);
}

/** POST /admin/students */
export function handleAdminCreateStudent(db, user, body) {
  const dept = adminOwnsDept(db, user);
  if (!dept) return err403();

  const fullName     = body?.full_name?.trim();
  const email        = body?.email?.trim().toLowerCase();
  const universityId = body?.university_id?.trim();
  const rawLevel     = body?.level !== undefined && body?.level !== null ? String(body.level).trim() : "1";

  const errors = {};
  if (!fullName) errors.full_name = "Full name is required.";
  if (!email) errors.email = "Email is required.";
  if (!universityId) errors.university_id = "University ID is required.";
  if (!STUDENT_LEVELS.includes(rawLevel)) errors.level = "Level must be between 1 and 5.";
  if (Object.keys(errors).length > 0) return err422(errors);

  const level = rawLevel;

  if (db.users.some((u) => u.email.toLowerCase() === email)) {
    return err409("Email already registered in the system.");
  }
  if (db.users.some((u) => u.university_id?.toLowerCase() === universityId.toLowerCase())) {
    return err409("University ID already exists.");
  }

  const tempPassword = generateTempPassword();
  const newStudent = {
    id: generateId("usr"),
    email,
    password: tempPassword,
    full_name: fullName,
    role: "student",
    department_id: dept.id,
    department_name: dept.name,
    university_id: universityId,
    level,
    disabled: false,
  };

  db.users.push(newStudent);
  mockDb.save(db);

  return ok({
    student: {
      id: newStudent.id,
      full_name: newStudent.full_name,
      email: newStudent.email,
      university_id: newStudent.university_id,
      level: newStudent.level,
      disabled: false,
      enrolled_courses: [],
    },
    temp_password: tempPassword,
  }, 201);
}

/** PATCH /admin/students/:id */
export function handleAdminUpdateStudent(db, user, studentId, body) {
  const dept = adminOwnsDept(db, user);
  if (!dept) return err403();

  const student = db.users.find((u) => u.id === studentId && u.role === "student");
  if (!student) return err404("Student");
  if (student.department_id !== dept.id) return err403();

  if (body?.email) {
    const email = body.email.trim().toLowerCase();
    if (db.users.some((u) => u.id !== studentId && u.email.toLowerCase() === email)) {
      return err409("Email is already taken.");
    }
    student.email = email;
  }
  if (body?.full_name?.trim()) {
    student.full_name = body.full_name.trim();
  }
  if (body?.university_id?.trim()) {
    const uId = body.university_id.trim();
    if (db.users.some((u) => u.id !== studentId && u.university_id?.toLowerCase() === uId.toLowerCase())) {
      return err409("University ID already exists.");
    }
    student.university_id = uId;
  }
  if (body?.level !== undefined) {
    const level = String(body.level).trim();
    if (!STUDENT_LEVELS.includes(level)) return err422({ level: "Level must be between 1 and 5." });
    student.level = level;
  }

  mockDb.save(db);
  return ok({
    id: student.id,
    full_name: student.full_name,
    email: student.email,
    university_id: student.university_id,
    level: student.level ?? null,
    disabled: Boolean(student.disabled),
    enrolled_courses: db.enrollments
      .filter((e) => e.student_id === student.id)
      .map((e) => db.courses.find((c) => c.id === e.course_id)?.code)
      .filter(Boolean),
  });
}

/** POST /admin/students/:id/deactivate */
export function handleAdminDeactivateStudent(db, user, studentId) {
  const dept = adminOwnsDept(db, user);
  if (!dept) return err403();

  const student = db.users.find((u) => u.id === studentId && u.role === "student");
  if (!student) return err404("Student");
  if (student.department_id !== dept.id) return err403();

  student.disabled = true;
  mockDb.save(db);
  return ok({ message: "Student account deactivated.", disabled: true });
}

/** POST /admin/students/:id/reactivate */
export function handleAdminReactivateStudent(db, user, studentId) {
  const dept = adminOwnsDept(db, user);
  if (!dept) return err403();

  const student = db.users.find((u) => u.id === studentId && u.role === "student");
  if (!student) return err404("Student");
  if (student.department_id !== dept.id) return err403();

  student.disabled = false;
  mockDb.save(db);
  return ok({ message: "Student account reactivated.", disabled: false });
}

/** GET /admin/doctors */
export function handleAdminGetDoctors(db, user) {
  const dept = adminOwnsDept(db, user);
  if (!dept) return err403();

  const doctors = db.users.filter((u) => u.role === "doctor" && u.department_id === dept.id);
  const result = doctors.map((d) => ({
    id: d.id,
    full_name: d.full_name,
    email: d.email,
    university_id: d.university_id,
    disabled: Boolean(d.disabled),
    courses: db.courses
      .filter((c) => c.doctor_id === d.id)
      .map((c) => ({ id: c.id, code: c.code, title: c.title })),
  }));

  return ok(result);
}

/** POST /admin/doctors */
export function handleAdminCreateDoctor(db, user, body) {
  const dept = adminOwnsDept(db, user);
  if (!dept) return err403();

  const fullName     = body?.full_name?.trim();
  const email        = body?.email?.trim().toLowerCase();
  const universityId = body?.university_id?.trim();

  const errors = {};
  if (!fullName) errors.full_name = "Full name is required.";
  if (!email) errors.email = "Email is required.";
  if (!universityId) errors.university_id = "University ID is required.";
  if (Object.keys(errors).length > 0) return err422(errors);

  if (db.users.some((u) => u.email.toLowerCase() === email)) {
    return err409("Email already registered in the system.");
  }
  if (db.users.some((u) => u.university_id?.toLowerCase() === universityId.toLowerCase())) {
    return err409("University ID already exists.");
  }

  const tempPassword = generateTempPassword();
  const newDoctor = {
    id: generateId("usr"),
    email,
    password: tempPassword,
    full_name: fullName,
    role: "doctor",
    department_id: dept.id,
    department_name: dept.name,
    university_id: universityId,
    disabled: false,
  };

  db.users.push(newDoctor);
  mockDb.save(db);

  return ok({
    doctor: {
      id: newDoctor.id,
      full_name: newDoctor.full_name,
      email: newDoctor.email,
      university_id: newDoctor.university_id,
      disabled: false,
      courses: [],
    },
    temp_password: tempPassword,
  }, 201);
}

/** PATCH /admin/doctors/:id */
export function handleAdminUpdateDoctor(db, user, doctorId, body) {
  const dept = adminOwnsDept(db, user);
  if (!dept) return err403();

  const doctor = db.users.find((u) => u.id === doctorId && u.role === "doctor");
  if (!doctor) return err404("Doctor");
  if (doctor.department_id !== dept.id) return err403();

  if (body?.email) {
    const email = body.email.trim().toLowerCase();
    if (db.users.some((u) => u.id !== doctorId && u.email.toLowerCase() === email)) {
      return err409("Email is already taken.");
    }
    doctor.email = email;
  }
  if (body?.full_name?.trim()) doctor.full_name = body.full_name.trim();
  if (body?.university_id?.trim()) {
    const uId = body.university_id.trim();
    if (db.users.some((u) => u.id !== doctorId && u.university_id?.toLowerCase() === uId.toLowerCase())) {
      return err409("University ID already exists.");
    }
    doctor.university_id = uId;
  }

  mockDb.save(db);
  return ok({
    id: doctor.id,
    full_name: doctor.full_name,
    email: doctor.email,
    university_id: doctor.university_id,
    disabled: Boolean(doctor.disabled),
    courses: db.courses
      .filter((c) => c.doctor_id === doctor.id)
      .map((c) => ({ id: c.id, code: c.code, title: c.title })),
  });
}

/** POST /admin/doctors/:id/deactivate */
export function handleAdminDeactivateDoctor(db, user, doctorId) {
  const dept = adminOwnsDept(db, user);
  if (!dept) return err403();

  const doctor = db.users.find((u) => u.id === doctorId && u.role === "doctor");
  if (!doctor) return err404("Doctor");
  if (doctor.department_id !== dept.id) return err403();

  doctor.disabled = true;
  mockDb.save(db);
  return ok({ message: "Doctor account deactivated.", disabled: true });
}

/** POST /admin/doctors/:id/reactivate */
