/**
 * js/mock/mock-server.js – In-browser mock API router.
 *
 * Acts as a drop-in replacement for the FastAPI backend when USE_MOCK is true.
 * Enforces the same auth and scope rules the real backend will enforce:
 *   401  – no token / unresolvable token
 *   403  – wrong role OR data outside the caller's scope
 *   404  – unknown resource ID
 *   409  – duplicate (e.g. a second assignment submission)
 *   422  – validation failure (with field-level errors)
 * All route handlers are pure synchronous functions; async latency lives in http.js.
 *
 * Depends on: js/mock/mock-db.js, js/core/clock.js, js/config.js
 */

import { mockDb, generateId } from "./mock-db.js";
import { getNow, getCurrentMonth } from "../core/clock.js";
import { evaluateSubmission } from "./mock-ai.js";
import {
  POINTS_SUBMISSION_ON_TIME,
  POINTS_QUIZ_COMPLETION,
  POINTS_ATTENDANCE_PRESENT,
  ABSENCE_WARNING_THRESHOLD,
  RATING_COOLDOWN_DAYS,
} from "../config.js";

/* ═══════════════════════════════════════════════════════════════
   1. TOKEN RESOLUTION
═══════════════════════════════════════════════════════════════ */

/**
 * Resolves a Bearer token string to a user record from the DB.
 * Token format (new): "aplus-mock-{userId}"
 *
 * @param {string|null} token
 * @returns {object|null} User record or null if token is missing/invalid.
 */
function resolveToken(token) {
  if (!token) return null;
  const match = /^aplus-mock-(.+)$/.exec(token);
  if (!match) return null;
  const userId = match[1];
  const db = mockDb.load();
  return db.users.find((u) => u.id === userId && !u.disabled) || null;
}

/* ═══════════════════════════════════════════════════════════════
   2. RESPONSE HELPERS
═══════════════════════════════════════════════════════════════ */

/** @param {number} status @param {any} data */
const ok      = (data, status = 200)  => ({ ok: true,  status, data });
/** @param {number} status @param {string} detail @param {object} [errors] */
const fail    = (status, detail, errors = null) =>
  ({ ok: false, status, error: { detail, ...(errors ? { errors } : {}) } });

const err401  = () => fail(401, "Authentication required.");
const err403  = () => fail(403, "Forbidden: insufficient permissions.");
const err404  = (res = "Resource") => fail(404, `${res} not found.`);
const err409  = (detail) => fail(409, detail);
const err422  = (errors) => fail(422, "Validation failed.", errors);

/** Validates a calendar date formatted as YYYY-MM-DD. */
function isValidDateOnly(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/**
 * Authenticates a mock account through the same router used by application requests.
 * This keeps the browser login path aligned with the future backend contract.
 *
 * @param {object} db - Current mock database.
 * @param {{ identifier?: string, password?: string }|null} body - Login credentials.
 * @returns {{ ok: boolean, status: number, data?: object, error?: object }} Router response.
 */
function handleMockLogin(db, body) {
  const identifier = body?.identifier?.trim().toLowerCase();
  const password = body?.password;
  if (!identifier || !password) return err422({ credentials: "Identifier and password are required." });

  const user = db.users.find((candidate) => (
    (candidate.email.toLowerCase() === identifier || candidate.university_id?.toLowerCase() === identifier)
    && candidate.password === password
  ));
  if (!user) return fail(401, "Invalid credentials.");
  if (user.disabled) return fail(403, "Account disabled.");

  return ok({
    access_token: `aplus-mock-${user.id}`,
    token_type: "bearer",
    user: { id: user.id, full_name: user.full_name, role: user.role, department: user.department_name },
  });
}

/* ═══════════════════════════════════════════════════════════════
   3. SCOPE HELPERS
═══════════════════════════════════════════════════════════════ */

/** Returns IDs of courses the student is enrolled in. */
function studentCourseIds(db, studentId) {
  return db.enrollments
    .filter((e) => e.student_id === studentId)
    .map((e) => e.course_id);
}

/** Returns IDs of courses taught by this doctor. */
function doctorCourseIds(db, doctorId) {
  return db.courses
    .filter((c) => c.doctor_id === doctorId)
    .map((c) => c.id);
}

/** Checks that a course belongs to the doctor; returns the course or null. */
function doctorOwnsCourse(db, doctorId, courseId) {
  return db.courses.find((c) => c.id === courseId && c.doctor_id === doctorId) || null;
}

/** Returns IDs of students enrolled in any of the given course IDs. */
function studentsInCourses(db, courseIds) {
  return db.enrollments
    .filter((e) => courseIds.includes(e.course_id))
    .map((e) => e.student_id);
}

/* ═══════════════════════════════════════════════════════════════
   4. AI EVALUATION HELPER (Delegated to mock-ai.js)
═══════════════════════════════════════════════════════════════ */
// AI evaluation logic is decoupled into js/mock/mock-ai.js for easy replacement by an n8n webhook or LLM.

/* ═══════════════════════════════════════════════════════════════
   5. ABSENCE WARNING HELPER
   Called after every attendance session record is saved.
   Creates ONE system warning message when threshold is first crossed,
   never duplicated.
═══════════════════════════════════════════════════════════════ */

/**
 * Checks if a student just crossed the absence threshold in a course and
 * creates a single system warning message if they have not received one already.
 *
 * @param {object} db  - The current database (will be mutated and saved).
 * @param {string} studentId
 * @param {string} courseId
 */
function checkAbsenceWarning(db, studentId, courseId) {
  // Count absences for this student in this course
  const courseSessionIds = db.attendance_sessions
    .filter((s) => s.course_id === courseId)
    .map((s) => s.id);

  const absenceCount = db.attendance_records.filter(
    (r) => courseSessionIds.includes(r.session_id) &&
            r.student_id === studentId &&
            r.status === "absent"
  ).length;

  if (absenceCount < ABSENCE_WARNING_THRESHOLD) return;

  // Check if a warning for this course already exists to avoid duplication
  const alreadyWarned = db.messages.some(
    (m) => m.recipient_id === studentId &&
            m.course_id   === courseId &&
            m.sender_type === "system" &&
            m.type        === "warning" &&
            m.subject.startsWith("Absence Warning:")
  );

  if (alreadyWarned) return;

  // Create the warning
  const course = db.courses.find((c) => c.id === courseId);
  db.messages.push({
    id:           generateId("msg"),
    sender_id:    null,
    sender_type:  "system",
    sender_name:  "A Plus System",
    recipient_id: studentId,
    course_id:    courseId,
    type:         "warning",
    subject:      `Absence Warning: ${course?.code ?? courseId} – Penalty Threshold Reached`,
    body:         `You have reached ${ABSENCE_WARNING_THRESHOLD} absences in ${course?.title ?? courseId}. ` +
                  `Further absences may incur a grade penalty per university policy.`,
    created_at:   getNow().toISOString(),
    is_read:      false,
  });
}

/* ═══════════════════════════════════════════════════════════════
   6. STUDENT ROUTE HANDLERS
═══════════════════════════════════════════════════════════════ */

/** GET /student/dashboard/summary */
function handleStudentDashboard(db, user) {
  const enrolledIds = studentCourseIds(db, user.id);

  const pendingAssignments = db.assignments
    .filter((a) => enrolledIds.includes(a.course_id))
    .filter((a) => {
      const hasSubmission = db.submissions.some(
        (s) => s.assignment_id === a.id && s.student_id === user.id
      );
      return !hasSubmission && new Date(a.due_date) >= getNow();
    }).length;

  const upcomingQuizzes = db.quizzes
    .filter((q) => enrolledIds.includes(q.course_id))
    .filter((q) => {
      const attempted = db.quiz_attempts.some(
        (a) => a.quiz_id === q.id && a.student_id === user.id
      );
      return !attempted && new Date(q.available_to) >= getNow();
    }).length;

  // Attendance rate across all enrolled courses
  const myCourseSessionIds = db.attendance_sessions
    .filter((s) => enrolledIds.includes(s.course_id))
    .map((s) => s.id);
  const myRecords = db.attendance_records.filter(
    (r) => myCourseSessionIds.includes(r.session_id) && r.student_id === user.id
  );
  const attendedCount  = myRecords.filter((r) => r.status === "present").length;
  const attendanceRate = myRecords.length > 0
    ? Math.round((attendedCount / myRecords.length) * 1000) / 10
    : 100;

  const currentMonth = getCurrentMonth();
  const myMonthPoints = db.points_ledger
    .filter((p) => p.student_id === user.id && p.month === currentMonth)
    .reduce((sum, p) => sum + p.points, 0);

  const unreadCount = db.messages.filter(
    (m) => m.recipient_id === user.id && !m.is_read
  ).length;

  // Rank among department students this month
  const dept = db.departments.find((d) => d.id === user.department_id);
  const deptStudentIds = db.users
    .filter((u) => u.role === "student" && u.department_id === user.department_id)
    .map((u) => u.id);
  const totals = deptStudentIds.map((sid) => ({
    id:     sid,
    points: db.points_ledger
      .filter((p) => p.student_id === sid && p.month === currentMonth)
      .reduce((s, p) => s + p.points, 0),
  })).sort((a, b) => b.points - a.points);
  const rank = totals.findIndex((t) => t.id === user.id) + 1;

  return ok({
    enrolled_courses:    enrolledIds.length,
    pending_assignments: pendingAssignments,
    upcoming_quizzes:    upcomingQuizzes,
    attendance_rate:     attendanceRate,
    points:              myMonthPoints,
    rank,
    department:          dept?.name ?? user.department_name,
    unread_messages:     unreadCount,
  });
}

/** GET /student/courses */
function handleStudentCourses(db, user) {
  const enrolledIds = studentCourseIds(db, user.id);
  const courses = db.courses
    .filter((c) => enrolledIds.includes(c.id))
    .map((c) => formatCourseForStudent(db, c));
  return ok(courses);
}

/** GET /student/courses/:id */
function handleStudentCourse(db, user, courseId) {
  const enrolledIds = studentCourseIds(db, user.id);
  const course = db.courses.find(
    (item) => item.id === courseId || item.code.toLowerCase() === courseId.toLowerCase()
  );
  if (!course || !enrolledIds.includes(course.id)) return err404("Course");
  return ok(formatCourseForStudent(db, course, true));
}

/** Formats a course record for student consumption. */
function formatCourseForStudent(db, course, includeLectures = false) {
  const doctor      = db.users.find((u) => u.id === course.doctor_id);
  const lecturesDone = db.attendance_sessions.filter((s) => s.course_id === course.id).length;
  const formatted = {
    id:                 course.id,
    code:               course.code,
    title:              course.title,
    doctor:             doctor ? `Dr. ${doctor.full_name}` : "Unknown",
    department:         (db.departments.find((d) => d.id === course.department_id))?.name ?? "",
    credit_hours:       course.credit_hours,
    lectures_count:     course.total_lectures,
    completed_lectures: lecturesDone,
    schedule:           course.schedule,
    room:               course.room,
  };
  if (includeLectures) {
    formatted.doctor_id = course.doctor_id;
    formatted.lectures = db.lectures
      .filter((lecture) => lecture.course_id === course.id)
      .sort((a, b) => a.number - b.number)
      .map((lecture) => ({
        id: lecture.id,
        number: lecture.number,
        title: lecture.title,
        date: lecture.date,
        material_url: lecture.material_url,
      }));
  }
  return formatted;
}

/** GET /student/assignments */
function handleStudentAssignments(db, user) {
  const enrolledIds = studentCourseIds(db, user.id);
  const assignments = db.assignments
    .filter((a) => enrolledIds.includes(a.course_id))
    .map((a) => formatAssignmentForStudent(db, a, user.id));
  return ok(assignments);
}

/** GET /student/assignments/:id */
function handleStudentAssignment(db, user, assignmentId) {
  const enrolledIds = studentCourseIds(db, user.id);
  const asg = db.assignments.find((a) => a.id === assignmentId);
  if (!asg || !enrolledIds.includes(asg.course_id)) return err404("Assignment");
  return ok(formatAssignmentForStudent(db, asg, user.id));
}

/** POST /student/assignments/:id/submit — body: { content: string } */
function handleStudentSubmitAssignment(db, user, assignmentId, body) {
  const enrolledIds = studentCourseIds(db, user.id);
  const asg = db.assignments.find((a) => a.id === assignmentId);
  if (!asg || !enrolledIds.includes(asg.course_id)) return err404("Assignment");

  // Duplicate check (submit once only)
  const existing = db.submissions.find(
    (s) => s.assignment_id === assignmentId && s.student_id === user.id
  );
  if (existing) return err409("You have already submitted this assignment.");

  if (!body?.content?.trim()) {
    return err422({ content: "Submission content is required." });
  }

  const now    = getNow();
  const isLate = now > new Date(asg.due_date);
  const aiFb   = evaluateSubmission(user.id, assignmentId, body.content.trim());

  const sub = {
    id:                   generateId("sub"),
    assignment_id:        assignmentId,
    student_id:           user.id,
    content:              body.content.trim(),
    submitted_at:         now.toISOString(),
    is_late:              isLate,
    ai_score_out_of_10:   aiFb.score_out_of_10,   // NEVER exposed to student endpoints
    ai_feedback:          aiFb.feedback_summary,
    ai_confidence:        aiFb.confidence,
    doctor_final_grade:   null,
    doctor_feedback:      null,
    graded_at:            null,
  };
  db.submissions.push(sub);

  // Award points only for on-time submission
  if (!isLate) {
    const course = db.courses.find((c) => c.id === asg.course_id);
    db.points_ledger.push({
      id:           generateId("pts"),
      student_id:   user.id,
      month:        getCurrentMonth(),
      source:       "submission",
      points:       POINTS_SUBMISSION_ON_TIME,
      reference_id: sub.id,
      description:  `On-time submission: ${course?.code ?? ""} – ${asg.title}`,
      created_at:   now.toISOString(),
    });
  }

  mockDb.save(db);

  // Return student-safe view (NO ai_score_out_of_10)
  return ok({
    id:           sub.id,
    assignment_id: sub.assignment_id,
    submitted_at: sub.submitted_at,
    is_late:      sub.is_late,
    ai_feedback:  sub.ai_feedback,
  }, 201);
}

/** Formats an assignment for the student (strips ai_score_out_of_10). */
function formatAssignmentForStudent(db, asg, studentId) {
  const sub = db.submissions.find(
    (s) => s.assignment_id === asg.id && s.student_id === studentId
  );
  const now = getNow();
  let status = "pending";
  if (sub) status = sub.doctor_final_grade !== null ? "graded" : "submitted";
  else if (new Date(asg.due_date) < now) status = "missed";

  const course = db.courses.find((c) => c.id === asg.course_id);
  return {
    id:           asg.id,
    course_id:    asg.course_id,
    course_code:  course?.code ?? "",
    title:        asg.title,
    description:  asg.description,
    due_date:     asg.due_date,
    max_grade:    asg.max_grade,
    status,
    submitted_at:   sub?.submitted_at   ?? null,
    is_late:        sub?.is_late        ?? null,
    ai_feedback:    sub?.ai_feedback    ?? null,   // ai_score_out_of_10 intentionally omitted
    final_grade:    sub?.doctor_final_grade ?? null,
    doctor_feedback: sub?.doctor_feedback ?? null,
    graded_at:      sub?.graded_at      ?? null,
  };
}

/** GET /student/quizzes */
function handleStudentQuizzes(db, user) {
  const enrolledIds = studentCourseIds(db, user.id);
  const now = getNow();
  const quizzes = db.quizzes
    .filter((q) => enrolledIds.includes(q.course_id))
    .map((q) => formatQuizForStudent(db, q, user.id, now));
  return ok(quizzes);
}

/** GET /student/quizzes/:id (includes questions for active quiz) */
function handleStudentQuiz(db, user, quizId) {
  const enrolledIds = studentCourseIds(db, user.id);
  const quiz = db.quizzes.find((q) => q.id === quizId);
  if (!quiz || !enrolledIds.includes(quiz.course_id)) return err404("Quiz");

  const now      = getNow();
  const attempt  = db.quiz_attempts.find((a) => a.quiz_id === quizId && a.student_id === user.id);
  const isActive = new Date(quiz.available_from) <= now && new Date(quiz.available_to) >= now;
  const formatted = formatQuizForStudent(db, quiz, user.id, now);

  // Only expose questions when the quiz is active and not yet attempted
  if (isActive && !attempt) {
    formatted.questions = quiz.questions.map((q) => ({
      id:      q.id,
      text:    q.text,
      options: q.options,
      points:  q.points,
      // correct_index intentionally omitted
    }));
  }
  return ok(formatted);
}

/** POST /student/quizzes/:id/attempt — body: { answers: number[] } */
function handleStudentAttemptQuiz(db, user, quizId, body) {
  const enrolledIds = studentCourseIds(db, user.id);
  const quiz = db.quizzes.find((q) => q.id === quizId);
  if (!quiz || !enrolledIds.includes(quiz.course_id)) return err404("Quiz");

  // One attempt per student
  const existing = db.quiz_attempts.find(
    (a) => a.quiz_id === quizId && a.student_id === user.id
  );
  if (existing) return err409("You have already attempted this quiz.");

  const now = getNow();
  if (now < new Date(quiz.available_from) || now > new Date(quiz.available_to)) {
    return fail(400, "This quiz is not currently available.");
  }

  if (!Array.isArray(body?.answers)) {
    return err422({ answers: "answers must be an array of option indices." });
  }
  if (body.answers.length !== quiz.questions.length) {
    return err422({ answers: `Expected ${quiz.questions.length} answers.` });
  }

  // Auto-grade
  const score = quiz.questions.reduce((sum, q, i) => {
    return body.answers[i] === q.correct_index ? sum + q.points : sum;
  }, 0);
  const total = quiz.questions.reduce((sum, q) => sum + q.points, 0);

  const attempt = {
    id:           generateId("qa"),
    quiz_id:      quizId,
    student_id:   user.id,
    answers:      body.answers,
    score,
    total,
    submitted_at: now.toISOString(),
  };
  db.quiz_attempts.push(attempt);

  // Award points for quiz completion
  const course = db.courses.find((c) => c.id === quiz.course_id);
  db.points_ledger.push({
    id:           generateId("pts"),
    student_id:   user.id,
    month:        getCurrentMonth(),
    source:       "quiz",
    points:       POINTS_QUIZ_COMPLETION,
    reference_id: attempt.id,
    description:  `Quiz completed: ${course?.code ?? ""} – ${quiz.title}`,
    created_at:   now.toISOString(),
  });

  mockDb.save(db);
  return ok({ id: attempt.id, score, total, submitted_at: attempt.submitted_at }, 201);
}

/** Formats a quiz for student view (no correct_index). */
function formatQuizForStudent(db, quiz, studentId, now) {
  const attempt  = db.quiz_attempts.find((a) => a.quiz_id === quiz.id && a.student_id === studentId);
  const course   = db.courses.find((c) => c.id === quiz.course_id);
  const total    = quiz.questions.reduce((s, q) => s + q.points, 0);

  let status = "upcoming";
  if (attempt) status = "completed";
  else if (now > new Date(quiz.available_to)) status = "missed";
  else if (now >= new Date(quiz.available_from)) status = "available";

  return {
    id:               quiz.id,
    course_code:      course?.code ?? "",
    title:            quiz.title,
    duration_minutes: quiz.duration_minutes,
    questions_count:  quiz.questions.length,
    total_score:      total,
    available_from:   quiz.available_from,
    available_to:     quiz.available_to,
    status,
    score:            attempt?.score ?? null,
    submitted_at:     attempt?.submitted_at ?? null,
  };
}

/** GET /student/attendance */
function handleStudentAttendance(db, user) {
  const enrolledIds = studentCourseIds(db, user.id);

  // Build per-course summary
  const courses = enrolledIds.map((cid) => {
    const course    = db.courses.find((c) => c.id === cid);
    const sessionIds = db.attendance_sessions
      .filter((s) => s.course_id === cid)
      .map((s) => s.id);
    const records = db.attendance_records.filter(
      (r) => sessionIds.includes(r.session_id) && r.student_id === user.id
    );
    const attended  = records.filter((r) => r.status === "present").length;
    const absences  = records.filter((r) => r.status === "absent").length;
    const total     = records.length;
    const pct       = total > 0 ? Math.round((attended / total) * 1000) / 10 : 100;

    let penalty_status = "normal";
    if (absences >= ABSENCE_WARNING_THRESHOLD + 2) penalty_status = "penalty";
    else if (absences >= ABSENCE_WARNING_THRESHOLD) penalty_status = "warning";
    else if (absences >= ABSENCE_WARNING_THRESHOLD - 1) penalty_status = "notice";

    return {
      course_id:      cid,
      course_code:    course?.code  ?? "",
      course_title:   course?.title ?? "",
      total_sessions: total,
      attended,
      absences,
      percentage:     pct,
      penalty_status,
    };
  });

  const totalLectures  = courses.reduce((s, c) => s + c.total_sessions, 0);
  const totalAttended  = courses.reduce((s, c) => s + c.attended, 0);
  const totalAbsences  = courses.reduce((s, c) => s + c.absences, 0);
  const overallPct     = totalLectures > 0
    ? Math.round((totalAttended / totalLectures) * 1000) / 10
    : 100;
  const history = db.attendance_sessions
    .filter((session) => enrolledIds.includes(session.course_id))
    .map((session) => {
      const course = db.courses.find((item) => item.id === session.course_id);
      const lecture = db.lectures.find((item) => item.id === session.lecture_id);
      const record = db.attendance_records.find(
        (item) => item.session_id === session.id && item.student_id === user.id
      );
      return {
        session_id: session.id,
        course_id: session.course_id,
        course_code: course?.code ?? "",
        lecture_title: lecture?.title ?? "",
        date: session.date,
        status: record?.status ?? "excused",
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  return ok({
    overall_percentage:  overallPct,
    total_lectures:      totalLectures,
    attended_lectures:   totalAttended,
    absence_count:       totalAbsences,
    grade_penalty_risk:  courses.some((c) => c.penalty_status === "warning" || c.penalty_status === "penalty"),
    warning_threshold:   ABSENCE_WARNING_THRESHOLD,
    courses,
    history,
  });
}

/** GET /student/todos */
function handleStudentTodos(db, user) {
  return ok(db.todos.filter((t) => t.student_id === user.id));
}

/** POST /student/todos */
function handleCreateTodo(db, user, body) {
  if (typeof body?.title !== "string" || !body.title.trim()) {
    return err422({ title: "Title is required." });
  }
  if (body.priority !== undefined && !["high", "medium", "low"].includes(body.priority)) {
    return err422({ priority: "Priority must be high, medium, or low." });
  }
  if (body.course_code !== undefined && body.course_code !== null) {
    if (typeof body.course_code !== "string" || !body.course_code.trim()) {
      return err422({ course_code: "course_code must be a non-empty course code." });
    }
    const course = db.courses.find((item) => item.code === body.course_code.trim());
    if (!course) return err404("Course");
    if (!studentCourseIds(db, user.id).includes(course.id)) return err403();
  }
  if (body.due_date !== undefined && body.due_date !== null && !isValidDateOnly(body.due_date)) {
    return err422({ due_date: "due_date must be a valid YYYY-MM-DD date." });
  }
  const todo = {
    id:          generateId("todo"),
    student_id:  user.id,
    title:       body.title.trim(),
    course_code: body.course_code ?? null,
    due_date:    body.due_date    ?? null,
    priority:    ["high", "medium", "low"].includes(body.priority) ? body.priority : "medium",
    completed:   false,
    created_at:  getNow().toISOString(),
  };
  db.todos.push(todo);
  mockDb.save(db);
  return ok(todo, 201);
}

/** PATCH /student/todos/:id */
function handleUpdateTodo(db, user, todoId, body) {
  const idx = db.todos.findIndex((t) => t.id === todoId && t.student_id === user.id);
  if (idx === -1) return err404("Todo");
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return err422({ body: "A todo update object is required." });
  }
  if (body.title !== undefined && (typeof body.title !== "string" || !body.title.trim())) {
    return err422({ title: "Title cannot be empty." });
  }
  if (body.priority !== undefined && !["high", "medium", "low"].includes(body.priority)) {
    return err422({ priority: "Priority must be high, medium, or low." });
  }
  if (body.course_code !== undefined && body.course_code !== null) {
    if (typeof body.course_code !== "string" || !body.course_code.trim()) {
      return err422({ course_code: "course_code must be a non-empty course code." });
    }
    const course = db.courses.find((item) => item.code === body.course_code.trim());
    if (!course) return err404("Course");
    if (!studentCourseIds(db, user.id).includes(course.id)) return err403();
  }
  if (body.due_date !== undefined && body.due_date !== null && !isValidDateOnly(body.due_date)) {
    return err422({ due_date: "due_date must be a valid YYYY-MM-DD date." });
  }
  if (body.completed !== undefined && typeof body.completed !== "boolean") {
    return err422({ completed: "completed must be a boolean." });
  }
  const allowed = ["title", "course_code", "due_date", "priority", "completed"];
  allowed.forEach((k) => {
    if (k in body) db.todos[idx][k] = k === "title" ? body[k].trim() : body[k];
  });
  mockDb.save(db);
  return ok(db.todos[idx]);
}

/** DELETE /student/todos/:id */
function handleDeleteTodo(db, user, todoId) {
  const idx = db.todos.findIndex((t) => t.id === todoId && t.student_id === user.id);
  if (idx === -1) return err404("Todo");
  db.todos.splice(idx, 1);
  mockDb.save(db);
  return ok(null, 204);
}

/** GET /student/points */
function handleStudentPoints(db, user) {
  const currentMonth = getCurrentMonth();
  const dept = db.departments.find((d) => d.id === user.department_id);

  const myCurrentPoints = db.points_ledger
    .filter((p) => p.student_id === user.id && p.month === currentMonth)
    .reduce((s, p) => s + p.points, 0);

  // Leaderboard: current-month totals for all students in same department
  const deptStudents = db.users.filter(
    (u) => u.role === "student" && u.department_id === user.department_id
  );
  const totals = deptStudents.map((s) => ({
    id:     s.id,
    name:   s.full_name,
    points: db.points_ledger
      .filter((p) => p.student_id === s.id && p.month === currentMonth)
      .reduce((sum, p) => sum + p.points, 0),
  })).sort((a, b) => b.points - a.points);

  const rank = totals.findIndex((t) => t.id === user.id) + 1;
  const top3 = totals.slice(0, 3).map((t, i) => ({
    rank:           i + 1,
    name:           t.name,
    points:         t.points,
    initials:       t.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(),
    department:     dept?.name ?? "",
    is_current_user: t.id === user.id,
  }));

  // Breakdown by source for current month
  const sourceMap = {};
  db.points_ledger
    .filter((p) => p.student_id === user.id && p.month === currentMonth)
    .forEach((p) => { sourceMap[p.source] = (sourceMap[p.source] ?? 0) + p.points; });
  const breakdown = Object.entries(sourceMap).map(([source, points]) => ({ source, points }));
  const ledger = db.points_ledger
    .filter((entry) => entry.student_id === user.id && entry.month === currentMonth)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map(({ source, points, description, created_at }) => ({ source, points, description, created_at }));

  const [year, month] = currentMonth.split("-");
  const nextMonth = new Date(Date.UTC(Number(year), Number(month), 1));

  return ok({
    current_points:    myCurrentPoints,
    department_rank:   rank,
    department_name:   dept?.name ?? user.department_name,
    current_month:     currentMonth,
    points_reset_date: nextMonth.toISOString().slice(0, 10),
    monthly_top_3:     top3,
    breakdown,
    ledger,
  });
}

/** GET /student/roadmaps – static provisional data */
function handleStudentRoadmaps() {
  return ok([
    {
      id: "rm-1",
      title: "Software Architecture Track",
      description: "Master enterprise-grade architectural patterns and system design.",
      progress_percent: 35,
      steps: [
        { id: "rm-1-s1", title: "Monolith to Microservices",      status: "done"    },
        { id: "rm-1-s2", title: "Event-Driven Design",            status: "done"    },
        { id: "rm-1-s3", title: "Hexagonal Architecture",         status: "current" },
        { id: "rm-1-s4", title: "Domain-Driven Design",           status: "locked"  },
        { id: "rm-1-s5", title: "Cloud-Native Architecture",      status: "locked"  },
      ],
    },
    {
      id: "rm-2",
      title: "Full-Stack Web Engineering",
      description: "Build production-grade RESTful APIs and modern front-end applications.",
      progress_percent: 60,
      steps: [
        { id: "rm-2-s1", title: "HTTP & REST Fundamentals",       status: "done"    },
        { id: "rm-2-s2", title: "API Design & OpenAPI",           status: "done"    },
        { id: "rm-2-s3", title: "Authentication & Authorization", status: "done"    },
        { id: "rm-2-s4", title: "Real-Time with WebSockets",      status: "current" },
        { id: "rm-2-s5", title: "GraphQL & gRPC",                 status: "locked"  },
      ],
    },
  ]);
}

/** GET /student/inbox */
function handleStudentInbox(db, user) {
  const msgs = db.messages
    .filter((m) => m.recipient_id === user.id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return ok(msgs);
}

/** PUT /student/inbox/:id/read */
function handleMarkMessageRead(db, user, msgId) {
  const msg = db.messages.find((m) => m.id === msgId && m.recipient_id === user.id);
  if (!msg) return err404("Message");
  msg.is_read = true;
  mockDb.save(db);
  return ok({ success: true, id: msgId, is_read: true });
}

/** GET /student/inbox/unread-count */
function handleStudentUnreadCount(db, user) {
  const count = db.messages.filter(
    (m) => m.recipient_id === user.id && !m.is_read
  ).length;
  return ok({ unread_count: count });
}

/** GET /student/profile */
function handleStudentProfile(db, user) {
  return ok({
    id:            user.id,
    full_name:     user.full_name,
    email:         user.email,
    university_id: user.university_id,
    department:    user.department_name,
    role:          user.role,
  });
}

/** POST /student/ratings */
function handleStudentRating(db, user, body) {
  const { target_type, target_id, course_id, score, comment } = body ?? {};

  if (!["lecture", "doctor"].includes(target_type)) {
    return err422({ target_type: "Must be 'lecture' or 'doctor'." });
  }
  if (typeof target_id !== "string" || !target_id.trim()) {
    return err422({ target_id: "target_id is required." });
  }
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    return err422({ score: "Score must be an integer between 1 and 5." });
  }
  if (comment !== undefined && comment !== null && typeof comment !== "string") {
    return err422({ comment: "comment must be a string." });
  }

  const enrolledIds = studentCourseIds(db, user.id);
  let resolvedCourseId;
  if (target_type === "lecture") {
    const lecture = db.lectures.find((item) => item.id === target_id);
    if (!lecture) return err404("Lecture");
    if (course_id && course_id !== lecture.course_id) {
      return err422({ course_id: "course_id must match the lecture's course." });
    }
    resolvedCourseId = lecture.course_id;
  } else {
    const doctor = db.users.find((item) => item.id === target_id && item.role === "doctor");
    if (!doctor) return err404("Doctor");
    const doctorCourses = db.courses.filter((course) => course.doctor_id === doctor.id);
    const matchingCourse = course_id
      ? doctorCourses.find((course) => course.id === course_id)
      : doctorCourses.find((course) => enrolledIds.includes(course.id));
    if (!matchingCourse) return err403();
    resolvedCourseId = matchingCourse.id;
  }
  if (!enrolledIds.includes(resolvedCourseId)) return err403();

  // Cooldown check
  const cooldownMs = RATING_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
  const recent = db.ratings.find(
    (r) =>
      r.student_id  === user.id &&
      r.target_type === target_type &&
      r.target_id   === target_id &&
      getNow() - new Date(r.created_at) < cooldownMs
  );
  if (recent) {
    return fail(429, `You can rate this ${target_type} again in ${RATING_COOLDOWN_DAYS} days.`);
  }

  const rating = {
    id:          generateId("rat"),
    student_id:  user.id,
    target_type,
    target_id,
    course_id:   resolvedCourseId,
    score,
    comment:     comment?.trim() || null,
    created_at:  getNow().toISOString(),
  };
  db.ratings.push(rating);
  mockDb.save(db);
  return ok(rating, 201);
}

/* ═══════════════════════════════════════════════════════════════
   7. DOCTOR ROUTE HANDLERS
═══════════════════════════════════════════════════════════════ */

/** GET /doctor/dashboard/summary */
function handleDoctorDashboard(db, user) {
  const myCourseIds   = doctorCourseIds(db, user.id);
  const myAssignments = db.assignments.filter((a) => myCourseIds.includes(a.course_id));
  const myStudentIds  = [...new Set(studentsInCourses(db, myCourseIds))];
  const now           = getNow();

  const pending = myAssignments.reduce((sum, a) => {
    return sum + db.submissions.filter(
      (s) => s.assignment_id === a.id && s.doctor_final_grade === null
    ).length;
  }, 0);

  // Students near or at absence risk
  let atRisk = 0;
  myStudentIds.forEach((sid) => {
    myCourseIds.forEach((cid) => {
      const enrolled = db.enrollments.some(
        (e) => e.student_id === sid && e.course_id === cid
      );
      if (!enrolled) return;
      const sessionIds = db.attendance_sessions
        .filter((s) => s.course_id === cid).map((s) => s.id);
      const absences = db.attendance_records.filter(
        (r) => sessionIds.includes(r.session_id) && r.student_id === sid && r.status === "absent"
      ).length;
      if (absences >= ABSENCE_WARNING_THRESHOLD) atRisk++;
    });
  });

  const upcoming = myAssignments
    .filter((a) => new Date(a.due_date) >= now)
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 3)
    .map((a) => {
      const c = db.courses.find((c) => c.id === a.course_id);
      return { title: `${c?.code ?? ""} – ${a.title}`, due: a.due_date.slice(0, 10) };
    });

  // Average rating across doctor's courses
  const myRatings = db.ratings.filter(
    (r) => r.target_type === "doctor" && r.target_id === user.id
  );
  const avgRating = myRatings.length > 0
    ? Math.round((myRatings.reduce((s, r) => s + r.score, 0) / myRatings.length) * 100) / 100
    : null;

  return ok({
    active_courses_count:        myCourseIds.length,
    pending_submissions_to_grade: pending,
    students_at_absence_risk:    atRisk,
    upcoming_deadlines:          upcoming,
    average_student_rating:      avgRating,
    total_enrolled_students:     myStudentIds.length,
  });
}

/** GET /doctor/courses */
function handleDoctorCourses(db, user) {
  const courses = db.courses
    .filter((c) => c.doctor_id === user.id)
    .map((c) => formatCourseForDoctor(db, c));
  return ok(courses);
}

/** GET /doctor/courses/:id */
function handleDoctorCourse(db, user, courseId) {
  const course = db.courses.find(
    (item) =>
      (item.id === courseId || item.code.toLowerCase() === courseId.toLowerCase()) &&
      item.doctor_id === user.id
  );
  if (!course) return err404("Course");
  return ok(formatCourseForDoctor(db, course, true));
}

function formatCourseForDoctor(db, course, includeLectures = false) {
  const enrolled      = db.enrollments.filter((e) => e.course_id === course.id).length;
  const lecturesDone  = db.attendance_sessions.filter((s) => s.course_id === course.id).length;
  const formatted = {
    id:                 course.id,
    code:               course.code,
    title:              course.title,
    department:         (db.departments.find((d) => d.id === course.department_id))?.name ?? "",
    credit_hours:       course.credit_hours,
    enrolled_count:     enrolled,
    lectures_count:     course.total_lectures,
    completed_lectures: lecturesDone,
    schedule:           course.schedule,
    room:               course.room,
  };
  if (includeLectures) {
    formatted.lectures = db.lectures
      .filter((lecture) => lecture.course_id === course.id)
      .sort((a, b) => a.number - b.number)
      .map((lecture) => ({
        id: lecture.id,
        number: lecture.number,
        title: lecture.title,
        date: lecture.date,
        material_url: lecture.material_url,
      }));
  }
  return formatted;
}

/** GET /doctor/assignments */
function handleDoctorAssignments(db, user) {
  const myCourseIds = doctorCourseIds(db, user.id);
  const assignments = db.assignments
    .filter((a) => myCourseIds.includes(a.course_id))
    .map((a) => formatAssignmentForDoctor(db, a));
  return ok(assignments);
}

/** POST /doctor/assignments — create assignment for a course */
function handleDoctorCreateAssignment(db, user, body) {
  if (!body?.title?.trim()) return err422({ title: "Assignment title is required." });
  if (!body?.course_id) return err422({ course_id: "course_id is required." });
  if (!doctorOwnsCourse(db, user.id, body.course_id)) return err403();

  const asg = {
    id: generateId("asg"),
    course_id: body.course_id,
    title: body.title.trim(),
    description: body.description?.trim() || "",
    due_date: body.due_date || getNow().toISOString(),
    max_grade: Number(body.max_grade) || 20,
    created_at: getNow().toISOString(),
  };

  db.assignments.push(asg);
  mockDb.save(db);
  return ok(formatAssignmentForDoctor(db, asg), 201);
}

/** Updates a doctor-owned assignment without allowing a course transfer. */
function handleDoctorUpdateAssignment(db, user, assignmentId, body) {
  const assignment = db.assignments.find((item) => item.id === assignmentId);
  if (!assignment) return err404("Assignment");
  if (!doctorOwnsCourse(db, user.id, assignment.course_id)) return err403();
  if (body?.title !== undefined && !body.title.trim()) return err422({ title: "Assignment title cannot be empty." });
  if (body?.max_grade !== undefined && (!Number.isFinite(Number(body.max_grade)) || Number(body.max_grade) <= 0)) {
    return err422({ max_grade: "max_grade must be greater than zero." });
  }
  ["title", "description", "due_date", "max_grade"].forEach((field) => {
    if (body?.[field] !== undefined) assignment[field] = field === "title" || field === "description" ? body[field].trim() : body[field];
  });
  mockDb.save(db);
  return ok(formatAssignmentForDoctor(db, assignment));
}

/** POST /doctor/lectures — upload/create lecture for a course */
function handleDoctorCreateLecture(db, user, body) {
  if (!body?.title?.trim()) return err422({ title: "Lecture title is required." });
  if (!body?.course_id) return err422({ course_id: "course_id is required." });
  if (!doctorOwnsCourse(db, user.id, body.course_id)) return err403();

  const currentLectures = db.lectures.filter((l) => l.course_id === body.course_id);
  const nextNumber = currentLectures.length + 1;

  const lec = {
    id: generateId("lec"),
    course_id: body.course_id,
    number: Number(body.number) || nextNumber,
    title: body.title.trim(),
    date: body.date || getNow().toISOString().slice(0, 10),
    material_url: body.material_url || null,
  };

  db.lectures.push(lec);
  mockDb.save(db);
  return ok(lec, 201);
}

/** Updates metadata for a lecture that belongs to the authenticated doctor. */
function handleDoctorUpdateLecture(db, user, lectureId, body) {
  const lecture = db.lectures.find((item) => item.id === lectureId);
  if (!lecture) return err404("Lecture");
  if (!doctorOwnsCourse(db, user.id, lecture.course_id)) return err403();
  if (body?.title !== undefined && !body.title.trim()) return err422({ title: "Lecture title cannot be empty." });
  ["title", "number", "date", "material_url"].forEach((field) => {
    if (body?.[field] !== undefined) lecture[field] = field === "title" ? body[field].trim() : body[field];
  });
  mockDb.save(db);
  return ok(lecture);
}

/** GET /doctor/assignments/pending-count */
function handleDoctorPendingCount(db, user) {
  const myCourseIds   = doctorCourseIds(db, user.id);
  const myAssignments = db.assignments.filter((a) => myCourseIds.includes(a.course_id));
  const count = myAssignments.reduce((sum, a) => {
    return sum + db.submissions.filter(
      (s) => s.assignment_id === a.id && s.doctor_final_grade === null
    ).length;
  }, 0);
  return ok({ pending_count: count });
}

function formatAssignmentForDoctor(db, asg) {
  const subs    = db.submissions.filter((s) => s.assignment_id === asg.id);
  const pending = subs.filter((s) => s.doctor_final_grade === null).length;
  const graded  = subs.filter((s) => s.doctor_final_grade !== null).length;
  const course  = db.courses.find((c) => c.id === asg.course_id);

  // Includes ai_score_out_of_10 — doctor view only
  return {
    id:                  asg.id,
    course_code:         course?.code  ?? "",
    course_id:           asg.course_id,
    title:               asg.title,
    description:         asg.description,
    due_date:            asg.due_date,
    max_grade:           asg.max_grade,
    total_submissions:   subs.length,
    pending_submissions: pending,
    graded_submissions:  graded,
    submissions:         subs.map((s) => {
      const student = db.users.find((u) => u.id === s.student_id);
      return {
        id:                s.id,
        student_id:        s.student_id,
        student_name:      student?.full_name ?? "Unknown",
        content:           s.content,
        submitted_at:      s.submitted_at,
        is_late:           s.is_late,
        ai_evaluation: {
          score_out_of_10: s.ai_score_out_of_10,
          feedback_summary: s.ai_feedback,
          confidence:       s.ai_confidence,
        },
        doctor_final_grade: s.doctor_final_grade,
        doctor_feedback:    s.doctor_feedback,
        graded_at:          s.graded_at,
      };
    }),
  };
}

/** POST /doctor/submissions/:id/grade — body: { final_grade: number, doctor_feedback?: string } */
function handleDoctorGradeSubmission(db, user, submissionId, body) {
  const sub = db.submissions.find((s) => s.id === submissionId);
  if (!sub) return err404("Submission");

  // Check scope: submission must be for one of the doctor's assignments
  const asg = db.assignments.find((a) => a.id === sub.assignment_id);
  if (!asg || !doctorOwnsCourse(db, user.id, asg.course_id)) return err403();

  const grade = Number(body?.final_grade);
  if (!Number.isFinite(grade) || grade < 0 || grade > asg.max_grade) {
    return err422({ final_grade: `Grade must be between 0 and ${asg.max_grade}.` });
  }

  sub.doctor_final_grade = grade;
  sub.doctor_feedback    = body?.doctor_feedback?.trim() || null;
  sub.graded_at          = getNow().toISOString();
  mockDb.save(db);

  // Notify the student
  const course  = db.courses.find((c) => c.id === asg.course_id);
  db.messages.push({
    id:           generateId("msg"),
    sender_id:    null,
    sender_type:  "system",
    sender_name:  "A Plus System",
    recipient_id: sub.student_id,
    course_id:    asg.course_id,
    type:         "system",
    subject:      `Grade Posted: ${course?.code ?? ""} – ${asg.title}`,
    body:         `Your final grade for "${asg.title}" has been posted: ${grade}/${asg.max_grade}.`,
    created_at:   getNow().toISOString(),
    is_read:      false,
  });
  mockDb.save(db);
  return ok(formatAssignmentForDoctor(db, asg));
}

/** GET /doctor/quizzes */
function handleDoctorQuizzes(db, user) {
  const myCourseIds = doctorCourseIds(db, user.id);
  const now = getNow();
  return ok(
    db.quizzes
      .filter((q) => myCourseIds.includes(q.course_id))
      .map((q) => formatQuizForDoctor(db, q, now))
  );
}

/** GET /doctor/quizzes/:id/results */
function handleDoctorQuizResults(db, user, quizId) {
  const quiz = db.quizzes.find((item) => item.id === quizId);
  if (!quiz) return err404("Quiz");
  if (!doctorOwnsCourse(db, user.id, quiz.course_id)) return err403();
  const students = new Map(db.users.map((student) => [student.id, student.full_name]));
  const attempts = db.quiz_attempts
    .filter((attempt) => attempt.quiz_id === quizId)
    .map((attempt) => ({
      student_name: students.get(attempt.student_id) ?? "",
      submitted_at: attempt.submitted_at,
      score: attempt.score,
      total: attempt.total,
    }));
  return ok({ attempts });
}

/** POST /doctor/quizzes */
function handleDoctorCreateQuiz(db, user, body) {
  if (!body?.title?.trim())        return err422({ title: "Title is required." });
  if (!body?.course_id)            return err422({ course_id: "course_id is required." });
  if (!doctorOwnsCourse(db, user.id, body.course_id)) return err403();

  const quiz = {
    id:               generateId("qz"),
    course_id:        body.course_id,
    title:            body.title.trim(),
    duration_minutes: Number(body.duration_minutes) || 20,
    available_from:   body.available_from,
    available_to:     body.available_to,
    questions:        body.questions ?? [],
  };
  db.quizzes.push(quiz);
  mockDb.save(db);
  return ok(formatQuizForDoctor(db, quiz, getNow()), 201);
}

/** Updates a doctor-owned quiz while retaining its course scope. */
function handleDoctorUpdateQuiz(db, user, quizId, body) {
  const quiz = db.quizzes.find((item) => item.id === quizId);
  if (!quiz) return err404("Quiz");
  if (!doctorOwnsCourse(db, user.id, quiz.course_id)) return err403();
  if (body?.title !== undefined && !body.title.trim()) return err422({ title: "Quiz title cannot be empty." });
  ["title", "duration_minutes", "available_from", "available_to", "questions"].forEach((field) => {
    if (body?.[field] !== undefined) quiz[field] = field === "title" ? body[field].trim() : body[field];
  });
  mockDb.save(db);
  return ok(formatQuizForDoctor(db, quiz, getNow()));
}

function formatQuizForDoctor(db, quiz, now) {
  const course    = db.courses.find((c) => c.id === quiz.course_id);
  const attempts  = db.quiz_attempts.filter((a) => a.quiz_id === quiz.id);
  const avgScore  = attempts.length > 0
    ? Math.round((attempts.reduce((s, a) => s + a.score, 0) / attempts.length) * 100) / 100
    : null;

  let status = "scheduled";
  if (now > new Date(quiz.available_to)) status = "closed";
  else if (now >= new Date(quiz.available_from)) status = "active";

  const enrolled = db.enrollments.filter((e) => e.course_id === quiz.course_id).length;
  return {
    id:               quiz.id,
    course_code:      course?.code ?? "",
    course_id:        quiz.course_id,
    title:            quiz.title,
    duration_minutes: quiz.duration_minutes,
    available_from:   quiz.available_from,
    available_to:     quiz.available_to,
    status,
    total_enrolled:   enrolled,
    completed_count:  attempts.length,
    average_score:    avgScore,
    questions_count:  quiz.questions.length,
  };
}

/** GET /doctor/attendance */
function handleDoctorAttendance(db, user) {
  const myCourseIds = doctorCourseIds(db, user.id);
  const sessions = db.attendance_sessions
    .filter((s) => myCourseIds.includes(s.course_id))
    .map((s) => {
      const course    = db.courses.find((c) => c.id === s.course_id);
      const lecture   = db.lectures.find((l) => l.id === s.lecture_id);
      const records   = db.attendance_records.filter((r) => r.session_id === s.id);
      const present   = records.filter((r) => r.status === "present").length;
      const absent    = records.filter((r) => r.status === "absent").length;
      return {
        id:            s.id,
        course_code:   course?.code ?? "",
        course_id:     s.course_id,
        lecture_id:    s.lecture_id,
        lecture_title: lecture?.title ?? "",
        date:          s.date,
        method:        s.method,
        present_count: present,
        absent_count:  absent,
        total:         records.length,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
  return ok(sessions);
}

/** POST /doctor/attendance */
function handleDoctorRecordAttendance(db, user, body) {
  if (!body?.course_id) return err422({ course_id: "Required." });
  if (!doctorOwnsCourse(db, user.id, body.course_id)) return err403();
  if (!isValidDateOnly(body?.date)) return err422({ date: "A valid YYYY-MM-DD date is required." });
  if (!Array.isArray(body?.records) || body.records.length === 0) {
    return err422({ records: "At least one attendance record is required." });
  }
  if (body.method !== undefined && !["manual", "dynamic_qr"].includes(body.method)) {
    return err422({ method: "method must be manual or dynamic_qr." });
  }

  const enrolledStudentIds = db.enrollments
    .filter((e) => e.course_id === body.course_id)
    .map((e) => e.student_id);
  const seenStudentIds = new Set();

  for (const rec of body.records) {
    if (!rec || typeof rec.student_id !== "string" || !rec.student_id.trim()) {
      return err422({ records: "Every record must include a student_id." });
    }
    if (!["present", "absent", "excused"].includes(rec.status)) {
      return err422({ records: "Every record status must be present, absent, or excused." });
    }
    if (!enrolledStudentIds.includes(rec.student_id)) return err403();
    if (seenStudentIds.has(rec.student_id)) {
      return err422({ records: "A student may appear only once in an attendance session." });
    }
    seenStudentIds.add(rec.student_id);
  }

  const session = {
    id:         generateId("ses"),
    course_id:  body.course_id,
    lecture_id: body.lecture_id ?? null,
    date:       body.date,
    method:     body.method ?? "manual",
  };
  db.attendance_sessions.push(session);

  for (const rec of body.records) {
    const status = rec.status;
    db.attendance_records.push({
      id:         generateId("atr"),
      session_id: session.id,
      student_id: rec.student_id,
      status,
    });
    if (status === "present") {
      db.points_ledger.push({
        id:           generateId("pts"),
        student_id:   rec.student_id,
        month:        getCurrentMonth(),
        source:       "attendance",
        points:       POINTS_ATTENDANCE_PRESENT,
        reference_id: session.id,
        description:  `Attendance: ${body.course_id} – ${body.date}`,
        created_at:   getNow().toISOString(),
      });
    }
    // Check if this student crossed the absence warning threshold
    if (status === "absent") {
      checkAbsenceWarning(db, rec.student_id, body.course_id);
    }
  }

  mockDb.save(db);
  return ok({ session_id: session.id, recorded: seenStudentIds.size }, 201);
}

/** GET /doctor/students */
function handleDoctorStudents(db, user, searchParams) {
  const myCourseIds = doctorCourseIds(db, user.id);
  const filterCourse = searchParams.get("course"); // optional course code filter

  const coursesToUse = filterCourse
    ? myCourseIds.filter((cid) => {
        const c = db.courses.find((x) => x.id === cid);
        return c?.code === filterCourse || c?.id === filterCourse;
      })
    : myCourseIds;

  // Build roster: one row per (student, course)
  const rows = [];
  coursesToUse.forEach((cid) => {
    const course = db.courses.find((c) => c.id === cid);
    const enrolled = db.enrollments
      .filter((e) => e.course_id === cid)
      .map((e) => e.student_id);

    enrolled.forEach((sid) => {
      const student = db.users.find((u) => u.id === sid);
      if (!student) return;

      const sessionIds = db.attendance_sessions
        .filter((s) => s.course_id === cid).map((s) => s.id);
      const records = db.attendance_records.filter(
        (r) => sessionIds.includes(r.session_id) && r.student_id === sid
      );
      const attended = records.filter((r) => r.status === "present").length;
      const absences = records.filter((r) => r.status === "absent").length;
      const total    = records.length;
      const rate     = total > 0 ? Math.round((attended / total) * 1000) / 10 : 100;

      // Latest graded submission grade for this course
      const grades = db.submissions
        .filter((s) => {
          const asg = db.assignments.find((a) => a.id === s.assignment_id);
          return asg?.course_id === cid && s.student_id === sid && s.doctor_final_grade !== null;
        })
        .map((s) => s.doctor_final_grade);
      const avgGrade = grades.length ? Math.round(grades.reduce((a, b) => a + b) / grades.length) : null;

      const bonus = db.points_ledger
        .filter((p) => p.student_id === sid && p.source === "bonus")
        .reduce((s, p) => s + p.points, 0);
      const currentMonthPoints = db.points_ledger
        .filter((p) => p.student_id === sid && p.month === getCurrentMonth())
        .reduce((s, p) => s + p.points, 0);

      rows.push({
        student_id:           sid,
        name:                 student.full_name,
        university_id:        student.university_id,
        course_code:          course?.code ?? "",
        course_id:            cid,
        attendance_rate:      rate,
        absences_count:       absences,
        at_penalty_risk:      absences >= ABSENCE_WARNING_THRESHOLD,
        current_grade:        avgGrade,
        bonus_points_granted: bonus,
        current_month_points: currentMonthPoints,
      });
    });
  });

  return ok(rows);
}

/** POST /doctor/students/:id/bonus */
function handleDoctorGrantBonus(db, user, studentId, body) {
  const myCourseIds   = doctorCourseIds(db, user.id);
  const myStudentIds  = studentsInCourses(db, myCourseIds);
  if (!myStudentIds.includes(studentId)) return err403();

  const points = Number(body?.points);
  if (!Number.isFinite(points) || points <= 0) {
    return err422({ points: "Points must be a positive number." });
  }
  if (!body?.reason?.trim()) return err422({ reason: "Reason is required." });

  const entry = {
    id:           generateId("pts"),
    student_id:   studentId,
    month:        getCurrentMonth(),
    source:       "bonus",
    points,
    reference_id: null,
    description:  `Bonus: ${body.reason.trim()}`,
    created_at:   getNow().toISOString(),
  };
  db.points_ledger.push(entry);
  mockDb.save(db);

  const totalBonus = db.points_ledger
    .filter((p) => p.student_id === studentId && p.source === "bonus")
    .reduce((s, p) => s + p.points, 0);

  return ok({ success: true, student_id: studentId, points_granted: points, new_total_bonus: totalBonus });
}

/** GET /doctor/messages */
function handleDoctorMessages(db, user) {
  const myCourseIds = doctorCourseIds(db, user.id);
  // Doctor sees messages they sent
  const msgs = db.messages
    .filter((m) => m.sender_id === user.id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return ok(msgs);
}

/** POST /doctor/messages */
function handleDoctorSendMessage(db, user, body) {
  if (typeof body?.subject !== "string" || !body.subject.trim()) {
    return err422({ subject: "Subject is required." });
  }
  if (typeof body?.body !== "string" || !body.body.trim()) {
    return err422({ body: "Message body is required." });
  }
  if (!body?.course_id)       return err422({ course_id: "course_id is required." });
  if (!doctorOwnsCourse(db, user.id, body.course_id)) return err403();

  const validTypes = ["warning", "notice", "suggestion", "system"];
  if (body.type !== undefined && !validTypes.includes(body.type)) {
    return err422({ type: "type must be warning, notice, suggestion, or system." });
  }
  if (body.recipient_ids !== undefined && !Array.isArray(body.recipient_ids)) {
    return err422({ recipient_ids: "recipient_ids must be an array of student IDs." });
  }
  const msgType = body.type ?? "notice";

  // Resolve recipients: all enrolled students OR a specific student list
  const enrolledStudentIds = db.enrollments
    .filter((e) => e.course_id === body.course_id)
    .map((e) => e.student_id);

  let recipientIds;
  if (Array.isArray(body.recipient_ids) && body.recipient_ids.length > 0) {
    if (body.recipient_ids.some((id) => !enrolledStudentIds.includes(id))) return err403();
    recipientIds = [...new Set(body.recipient_ids)];
  } else {
    recipientIds = enrolledStudentIds;
  }

  const now      = getNow();
  const doctor   = db.users.find((u) => u.id === user.id);
  const created  = [];

  recipientIds.forEach((rid) => {
    const msg = {
      id:           generateId("msg"),
      sender_id:    user.id,
      sender_type:  "doctor",
      sender_name:  `Dr. ${doctor?.full_name ?? ""}`,
      recipient_id: rid,
      course_id:    body.course_id,
      type:         msgType,
      subject:      body.subject.trim(),
      body:         body.body.trim(),
      created_at:   now.toISOString(),
      is_read:      false,
    };
    db.messages.push(msg);
    created.push(msg);
  });

  mockDb.save(db);
  return ok({ sent_count: created.length, message_ids: created.map((m) => m.id) }, 201);
}

/** GET /doctor/ratings */
function handleDoctorRatings(db, user) {
  const myCourseIds = doctorCourseIds(db, user.id);

  // Doctor ratings
  const doctorRatings = db.ratings.filter(
    (r) => r.target_type === "doctor" && r.target_id === user.id
  );

  // Lecture ratings for doctor's lectures
  const myLectureIds = db.lectures
    .filter((l) => myCourseIds.includes(l.course_id))
    .map((l) => l.id);
  const lectureRatings = db.ratings.filter(
    (r) => r.target_type === "lecture" && myLectureIds.includes(r.target_id)
  );

  const allRatings = [...doctorRatings, ...lectureRatings];
  const overall = allRatings.length > 0
    ? Math.round((allRatings.reduce((s, r) => s + r.score, 0) / allRatings.length) * 100) / 100
    : null;

  // Breakdown by metric (lecture vs doctor)
  const doctorAvg = doctorRatings.length > 0
    ? Math.round((doctorRatings.reduce((s, r) => s + r.score, 0) / doctorRatings.length) * 100) / 100
    : null;
  const lectureAvg = lectureRatings.length > 0
    ? Math.round((lectureRatings.reduce((s, r) => s + r.score, 0) / lectureRatings.length) * 100) / 100
    : null;

  return ok({
    overall_score:       overall,
    total_evaluations:   allRatings.length,
    breakdown: [
      { metric: "Overall Doctor Rating",  score: doctorAvg  },
      { metric: "Lecture Quality",         score: lectureAvg },
    ],
    // Comments returned WITHOUT student_id (anonymity enforced here)
    anonymous_comments: allRatings
      .filter((r) => r.comment)
      .map((r) => {
        const course = db.courses.find((c) => c.id === r.course_id);
        const lec    = r.target_type === "lecture"
          ? db.lectures.find((l) => l.id === r.target_id)
          : null;
        return {
          course_code:  course?.code ?? "",
          target_type:  r.target_type,
          target_title: lec?.title ?? (r.target_type === "doctor" ? "Doctor Rating" : ""),
          date:         r.created_at.slice(0, 10),
          score:        r.score,
          comment:      r.comment,
          // student_id intentionally omitted
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date)),
  });
}

/** GET /doctor/profile */
function handleDoctorProfile(db, user) {
  return ok({
    id:            user.id,
    full_name:     user.full_name,
    email:         user.email,
    university_id: user.university_id,
    department:    user.department_name,
    role:          user.role,
  });
}

/* ═══════════════════════════════════════════════════════════════
   8. ROUTE TABLE
   [method, path_regex, handler_fn, allowed_roles]
   Path params are captured in regex groups and passed as positional args.
═══════════════════════════════════════════════════════════════ */

const ROUTES = [
  /* ── Student routes ── */
  ["GET",   /^\/student\/dashboard\/summary$/,           (db, u, _p, _b, _q) => handleStudentDashboard(db, u),                         ["student"]],
  ["GET",   /^\/student\/courses$/,                      (db, u, _p, _b, _q) => handleStudentCourses(db, u),                           ["student"]],
  ["GET",   /^\/student\/courses\/([^/]+)$/,             (db, u, p)           => handleStudentCourse(db, u, p[1]),                       ["student"]],
  ["GET",   /^\/student\/assignments$/,                  (db, u)              => handleStudentAssignments(db, u),                        ["student"]],
  ["GET",   /^\/student\/assignments\/([^/]+)$/,         (db, u, p)           => handleStudentAssignment(db, u, p[1]),                   ["student"]],
  ["POST",  /^\/student\/assignments\/([^/]+)\/submit$/, (db, u, p, b)        => handleStudentSubmitAssignment(db, u, p[1], b),          ["student"]],
  ["GET",   /^\/student\/quizzes$/,                      (db, u)              => handleStudentQuizzes(db, u),                            ["student"]],
  ["GET",   /^\/student\/quizzes\/([^/]+)$/,             (db, u, p)           => handleStudentQuiz(db, u, p[1]),                         ["student"]],
  ["POST",  /^\/student\/quizzes\/([^/]+)\/attempt$/,    (db, u, p, b)        => handleStudentAttemptQuiz(db, u, p[1], b),               ["student"]],
  ["GET",   /^\/student\/attendance$/,                   (db, u)              => handleStudentAttendance(db, u),                         ["student"]],
  ["GET",   /^\/student\/todos$/,                        (db, u)              => handleStudentTodos(db, u),                              ["student"]],
  ["POST",  /^\/student\/todos$/,                        (db, u, _p, b)       => handleCreateTodo(db, u, b),                            ["student"]],
  ["PATCH", /^\/student\/todos\/([^/]+)$/,               (db, u, p, b)        => handleUpdateTodo(db, u, p[1], b),                       ["student"]],
  ["DELETE",/^\/student\/todos\/([^/]+)$/,               (db, u, p)           => handleDeleteTodo(db, u, p[1]),                          ["student"]],
  ["GET",   /^\/student\/points$/,                       (db, u)              => handleStudentPoints(db, u),                             ["student"]],
  ["GET",   /^\/student\/roadmaps$/,                     ()                   => handleStudentRoadmaps(),                                ["student"]],
  ["GET",   /^\/student\/inbox\/unread-count$/,          (db, u)              => handleStudentUnreadCount(db, u),                        ["student"]],
  ["GET",   /^\/student\/inbox$/,                        (db, u)              => handleStudentInbox(db, u),                              ["student"]],
  ["PUT",   /^\/student\/inbox\/([^/]+)\/read$/,         (db, u, p)           => handleMarkMessageRead(db, u, p[1]),                     ["student"]],
  ["GET",   /^\/student\/profile$/,                      (db, u)              => handleStudentProfile(db, u),                            ["student"]],
  ["POST",  /^\/student\/ratings$/,                      (db, u, _p, b)       => handleStudentRating(db, u, b),                         ["student"]],

  /* ── Doctor routes ── */
  ["GET",   /^\/doctor\/dashboard\/summary$/,            (db, u)              => handleDoctorDashboard(db, u),                           ["doctor"]],
  ["GET",   /^\/doctor\/courses$/,                       (db, u)              => handleDoctorCourses(db, u),                             ["doctor"]],
  ["GET",   /^\/doctor\/courses\/([^/]+)$/,              (db, u, p)           => handleDoctorCourse(db, u, p[1]),                        ["doctor"]],
  ["GET",   /^\/doctor\/assignments\/pending-count$/,    (db, u)              => handleDoctorPendingCount(db, u),                        ["doctor"]],
  ["GET",   /^\/doctor\/assignments$/,                   (db, u)              => handleDoctorAssignments(db, u),                         ["doctor"]],
  ["POST",  /^\/doctor\/assignments$/,                   (db, u, _p, b)       => handleDoctorCreateAssignment(db, u, b),                  ["doctor"]],
  ["PATCH", /^\/doctor\/assignments\/([^/]+)$/,          (db, u, p, b)        => handleDoctorUpdateAssignment(db, u, p[1], b),            ["doctor"]],
  ["POST",  /^\/doctor\/lectures$/,                      (db, u, _p, b)       => handleDoctorCreateLecture(db, u, b),                     ["doctor"]],
  ["PATCH", /^\/doctor\/lectures\/([^/]+)$/,             (db, u, p, b)        => handleDoctorUpdateLecture(db, u, p[1], b),               ["doctor"]],
  ["POST",  /^\/doctor\/submissions\/([^/]+)\/grade$/,   (db, u, p, b)        => handleDoctorGradeSubmission(db, u, p[1], b),            ["doctor"]],
  ["GET",   /^\/doctor\/quizzes\/([^/]+)\/results$/,     (db, u, p)           => handleDoctorQuizResults(db, u, p[1]),                   ["doctor"]],
  ["GET",   /^\/doctor\/quizzes$/,                       (db, u)              => handleDoctorQuizzes(db, u),                             ["doctor"]],
  ["POST",  /^\/doctor\/quizzes$/,                       (db, u, _p, b)       => handleDoctorCreateQuiz(db, u, b),                      ["doctor"]],
  ["PATCH", /^\/doctor\/quizzes\/([^/]+)$/,              (db, u, p, b)        => handleDoctorUpdateQuiz(db, u, p[1], b),                  ["doctor"]],
  ["GET",   /^\/doctor\/attendance$/,                    (db, u)              => handleDoctorAttendance(db, u),                          ["doctor"]],
  ["POST",  /^\/doctor\/attendance$/,                    (db, u, _p, b)       => handleDoctorRecordAttendance(db, u, b),                 ["doctor"]],
  ["GET",   /^\/doctor\/students$/,                      (db, u, _p, _b, q)  => handleDoctorStudents(db, u, q),                         ["doctor"]],
  ["POST",  /^\/doctor\/students\/([^/]+)\/bonus$/,      (db, u, p, b)        => handleDoctorGrantBonus(db, u, p[1], b),                 ["doctor"]],
  ["GET",   /^\/doctor\/messages$/,                      (db, u)              => handleDoctorMessages(db, u),                            ["doctor"]],
  ["POST",  /^\/doctor\/messages$/,                      (db, u, _p, b)       => handleDoctorSendMessage(db, u, b),                     ["doctor"]],
  ["GET",   /^\/doctor\/ratings$/,                       (db, u)              => handleDoctorRatings(db, u),                             ["doctor"]],
  ["GET",   /^\/doctor\/profile$/,                       (db, u)              => handleDoctorProfile(db, u),                             ["doctor"]],
];

/* ═══════════════════════════════════════════════════════════════
   9. MAIN DISPATCH FUNCTION
═══════════════════════════════════════════════════════════════ */

/**
 * Dispatches an in-browser mock API request.
 * Called synchronously by http.js when USE_MOCK is true.
 *
 * @param {string}      method - HTTP verb ("GET", "POST", etc.)
 * @param {string}      rawPath - Path + optional query string (e.g. "/student/courses?foo=bar")
 * @param {object|null} body - Parsed request body (already a JS object).
 * @param {string|null} token - Bearer token from the Authorization header.
 * @returns {{ ok: boolean, status: number, data?: any, error?: object }}
 */
export function handle(method, rawPath, body, token) {
  // Split path from query string
  const qIdx        = rawPath.indexOf("?");
  const pathname    = qIdx >= 0 ? rawPath.slice(0, qIdx) : rawPath;
  const searchParams = new URLSearchParams(qIdx >= 0 ? rawPath.slice(qIdx + 1) : "");

  // Login is the sole public route and must not require a bearer token.
  if (method === "POST" && pathname === "/auth/login") {
    return handleMockLogin(mockDb.load(), body);
  }

  // Resolve caller identity from token
  const user = resolveToken(token);
  if (!user) return err401();

  // Match route
  for (const [routeMethod, pattern, handler, allowedRoles] of ROUTES) {
    if (routeMethod !== method) continue;
    const match = pattern.exec(pathname);
    if (!match) continue;

    // Role check
    if (allowedRoles.length && !allowedRoles.includes(user.role)) {
      return err403();
    }

    // Load DB once per request
    const db = mockDb.load();

    try {
      return handler(db, user, match, body, searchParams);
    } catch (err) {
      console.error("[MockServer] Unhandled handler error:", err);
      return fail(500, "Internal mock server error.");
    }
  }

  return fail(404, `No mock route found for ${method} ${pathname}`);
}
