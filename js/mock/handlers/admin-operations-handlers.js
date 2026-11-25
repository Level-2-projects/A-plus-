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
import { adminOwnsDept } from "./admin-account-handlers.js";

/** GET /admin/courses returns only courses owned by the authenticated admin's department. */
export function handleAdminGetCourses(db, user) {
  const dept = adminOwnsDept(db, user);
  if (!dept) return err403();

  const courses = db.courses.filter((c) => c.department_id === dept.id);
  const result = courses.map((c) => {
    const doc = db.users.find((u) => u.id === c.doctor_id);
    return {
      id: c.id,
      code: c.code,
      title: c.title,
      doctor_id: c.doctor_id,
      doctor: doc ? `Dr. ${doc.full_name}` : "Unassigned",
      credit_hours: c.credit_hours,
      total_lectures: c.total_lectures,
      schedule: c.schedule,
      room: c.room,
      color: c.color || "#2563eb",
      student_count: db.enrollments.filter((e) => e.course_id === c.id).length,
    };
  });

  return ok(result);
}

/** POST /admin/courses */
export function handleAdminCreateCourse(db, user, body) {
  const dept = adminOwnsDept(db, user);
  if (!dept) return err403();

  const code        = body?.code?.trim().toUpperCase();
  const title       = body?.title?.trim();
  const doctorId    = body?.doctor_id;
  const creditHours = Number(body?.credit_hours) || 3;

  const errors = {};
  if (!code) errors.code = "Course code is required.";
  if (!title) errors.title = "Course title is required.";
  if (!doctorId) errors.doctor_id = "Assigned doctor is required.";
  if (Object.keys(errors).length > 0) return err422(errors);

  if (db.courses.some((c) => c.code.toLowerCase() === code.toLowerCase())) {
    return err409("Course code already exists.");
  }

  const doctor = db.users.find((u) => u.id === doctorId && u.role === "doctor" && u.department_id === dept.id);
  if (!doctor) {
    return err422({ doctor_id: "Assigned doctor must belong to this department." });
  }

  const newCourse = {
    id: generateId("crs"),
    code,
    title,
    doctor_id: doctorId,
    department_id: dept.id,
    credit_hours: creditHours,
    total_lectures: Number(body?.total_lectures) || 12,
    schedule: body?.schedule?.trim() || "",
    room: body?.room?.trim() || "",
    color: body?.color || "#2563eb",
    created_at: getNow().toISOString(),
  };

  db.courses.push(newCourse);
  mockDb.save(db);

  return ok(newCourse, 201);
}

/** PATCH /admin/courses/:id */
export function handleAdminUpdateCourse(db, user, courseId, body) {
  const dept = adminOwnsDept(db, user);
  if (!dept) return err403();

  const course = db.courses.find((c) => c.id === courseId);
  if (!course) return err404("Course");
  if (course.department_id !== dept.id) return err403();

  if (body?.doctor_id) {
    const doctor = db.users.find((u) => u.id === body.doctor_id && u.role === "doctor" && u.department_id === dept.id);
    if (!doctor) return err422({ doctor_id: "Assigned doctor must belong to this department." });
    course.doctor_id = body.doctor_id;
  }
  if (body?.title?.trim()) course.title = body.title.trim();
  if (body?.schedule?.trim() !== undefined) course.schedule = body.schedule.trim();
  if (body?.room?.trim() !== undefined) course.room = body.room.trim();
  if (body?.color) course.color = body.color;
  if (body?.credit_hours) course.credit_hours = Number(body.credit_hours);

  mockDb.save(db);
  return ok(course);
}

/** POST /admin/courses/:id/enroll */
export function handleAdminEnrollStudent(db, user, courseId, body) {
  const dept = adminOwnsDept(db, user);
  if (!dept) return err403();

  const course = db.courses.find((c) => c.id === courseId);
  if (!course) return err404("Course");
  if (course.department_id !== dept.id) return err403();

  const studentId = body?.student_id;
  if (!studentId) return err422({ student_id: "Student ID is required." });

  const student = db.users.find((u) => u.id === studentId && u.role === "student");
  if (!student) return err404("Student");
  if (student.department_id !== dept.id) return err403();

  const alreadyEnrolled = db.enrollments.some((e) => e.course_id === courseId && e.student_id === studentId);
  if (alreadyEnrolled) {
    return err409("Student is already enrolled in this course.");
  }

  const enrollment = {
    id: generateId("enr"),
    student_id: studentId,
    course_id: courseId,
    enrolled_at: getNow().toISOString(),
  };

  db.enrollments.push(enrollment);
  mockDb.save(db);

  return ok(enrollment, 201);
}

/** DELETE /admin/courses/:id/enroll/:studentId */
export function handleAdminUnenrollStudent(db, user, courseId, studentId) {
  const dept = adminOwnsDept(db, user);
  if (!dept) return err403();

  const course = db.courses.find((c) => c.id === courseId);
  if (!course) return err404("Course");
  if (course.department_id !== dept.id) return err403();

  const student = db.users.find((u) => u.id === studentId && u.role === "student");
  if (!student) return err404("Student");
  if (student.department_id !== dept.id) return err403();

  const idx = db.enrollments.findIndex((e) => e.course_id === courseId && e.student_id === studentId);
  if (idx < 0) return err404("Enrollment");

  db.enrollments.splice(idx, 1);
  mockDb.save(db);

  return ok({ message: "Student unenrolled successfully." });
}

/** GET /admin/attendance */
export function handleAdminAttendance(db, user) {
  const dept = adminOwnsDept(db, user);
  if (!dept) return err403();

  const courses = db.courses.filter((c) => c.department_id === dept.id);
  const threshold = db.settings?.absence_warning_threshold ?? ABSENCE_WARNING_THRESHOLD;

  const summary = courses.map((course) => {
    const sessions = db.attendance_sessions.filter((s) => s.course_id === course.id);
    const sessionIds = sessions.map((s) => s.id);
    const records = db.attendance_records.filter((r) => sessionIds.includes(r.session_id));
    const presentCount = records.filter((r) => r.status === "present").length;
    const avgRate = records.length > 0 ? Math.round((presentCount / records.length) * 1000) / 10 : 100;

    const enrolledStudents = db.enrollments.filter((e) => e.course_id === course.id).map((e) => e.student_id);
    const atRiskCount = enrolledStudents.filter((sid) => {
      const absences = records.filter((r) => r.student_id === sid && r.status === "absent").length;
      return absences >= threshold;
    }).length;

    return {
      course_id: course.id,
      course_code: course.code,
      course_title: course.title,
      total_sessions: sessions.length,
      avg_attendance_rate: avgRate,
      at_risk_count: atRiskCount,
    };
  });

  return ok(summary);
}

/** GET /admin/points */
export function handleAdminPoints(db, user) {
  const dept = adminOwnsDept(db, user);
  if (!dept) return err403();

  const currentMonth = getCurrentMonth();
  const deptStudents = db.users.filter((u) => u.role === "student" && u.department_id === dept.id && !u.disabled);

  const leaderboard = deptStudents.map((s) => ({
    student_id: s.id,
    full_name: s.full_name,
    points: db.points_ledger
      .filter((p) => p.student_id === s.id && p.month === currentMonth)
      .reduce((sum, p) => sum + p.points, 0),
  }))
  .sort((a, b) => b.points - a.points)
  .map((entry, idx) => ({
    rank: idx + 1,
    student_id: entry.student_id,
    full_name: entry.full_name,
    points: entry.points,
  }));

  return ok(leaderboard);
}

/** GET /admin/messages */
export function handleAdminMessages(db, user) {
  const broadcasts = (db.broadcasts || [])
    .filter((broadcast) => broadcast.sender_id === user.id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return ok(broadcasts);
}

/** POST /admin/messages */
export function handleAdminSendMessage(db, user, body) {
  const dept = adminOwnsDept(db, user);
  if (!dept) return err403();

  const recipientType = body?.recipient_type || "students";
  const subject       = body?.subject?.trim();
  const messageBody   = body?.body?.trim();
  const type          = ["notice", "warning", "suggestion"].includes(body?.type) ? body.type : "notice";

  const errors = {};
  if (!subject) errors.subject = "Subject is required.";
  if (!messageBody) errors.body = "Message body is required.";
  if (Object.keys(errors).length > 0) return err422(errors);

  let recipientIds = [];
  if (recipientType === "students") {
    recipientIds = db.users
      .filter((u) => u.role === "student" && u.department_id === dept.id && !u.disabled)
      .map((u) => u.id);
  } else if (recipientType === "doctors") {
    recipientIds = db.users
      .filter((u) => u.role === "doctor" && u.department_id === dept.id && !u.disabled)
      .map((u) => u.id);
  } else if (recipientType === "both") {
    recipientIds = db.users
      .filter((u) => (u.role === "student" || u.role === "doctor") && u.department_id === dept.id && !u.disabled)
      .map((u) => u.id);
  } else if (recipientType === "course") {
    const course = db.courses.find((item) => item.id === body?.course_id);
    if (!course || course.department_id !== dept.id) return err403();
    recipientIds = db.enrollments
      .filter((enrollment) => enrollment.course_id === course.id)
      .map((enrollment) => enrollment.student_id);
  } else if (recipientType === "dean") {
    const dean = db.users.find((u) => u.role === "super_admin");
    if (dean) recipientIds = [dean.id];
  }

  const nowIso = getNow().toISOString();
  recipientIds.forEach((rId) => {
    db.messages.push({
      id: generateId("msg"),
      sender_id: user.id,
      sender_type: "admin",
      sender_name: user.full_name,
      recipient_id: rId,
      course_id: recipientType === "course" ? body.course_id : null,
      type,
      subject,
      body: messageBody,
      created_at: nowIso,
      is_read: false,
    });
  });

  if (!db.broadcasts) db.broadcasts = [];
  db.broadcasts.push({
    id: generateId("bcast"),
    sender_id: user.id,
    scope: "department",
    audience: recipientType,
    department_id: dept.id,
    course_id: recipientType === "course" ? body.course_id : null,
    subject,
    body: messageBody,
    recipient_count: recipientIds.length,
    created_at: nowIso,
  });

  mockDb.save(db);
  return ok({ sent_count: recipientIds.length }, 201);
}

/** GET /admin/settings */
export function handleAdminSettings(db, _user) {
  return ok(db.settings || {});
}

/** GET /admin/inbox */
export function handleAdminInbox(db, user) {
  const messages = db.messages
    .filter((m) => m.recipient_id === user.id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return ok(messages);
}

/** GET /admin/inbox/unread-count */
export function handleAdminUnreadCount(db, user) {
  const unread = db.messages.filter((m) => m.recipient_id === user.id && !m.is_read).length;
  return ok({ unread_count: unread });
}

/** PUT /admin/inbox/:id/read */
export function handleAdminMarkRead(db, user, messageId) {
  const msg = db.messages.find((m) => m.id === messageId && m.recipient_id === user.id);
  if (!msg) return err404("Message");
  msg.is_read = true;
  mockDb.save(db);
  return ok({ message: "Marked as read." });
}

