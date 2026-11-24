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

/* ═══════════════════════════════════════════════════════════════
   6. STUDENT ROUTE HANDLERS
═══════════════════════════════════════════════════════════════ */

/** GET /student/dashboard/summary */
export function handleStudentDashboard(db, user) {
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
export function handleStudentCourses(db, user) {
  const enrolledIds = studentCourseIds(db, user.id);
  const courses = db.courses
    .filter((c) => enrolledIds.includes(c.id))
    .map((c) => formatCourseForStudent(db, c));
  return ok(courses);
}

/** GET /student/courses/:id */
export function handleStudentCourse(db, user, courseId) {
  const enrolledIds = studentCourseIds(db, user.id);
  const course = db.courses.find(
    (item) => item.id === courseId || item.code.toLowerCase() === courseId.toLowerCase()
  );
  if (!course || !enrolledIds.includes(course.id)) return err404("Course");
  return ok(formatCourseForStudent(db, course, true));
}

/** Formats a course record for student consumption. */
export function formatCourseForStudent(db, course, includeLectures = false) {
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
export function handleStudentAssignments(db, user) {
  const enrolledIds = studentCourseIds(db, user.id);
  const assignments = db.assignments
    .filter((a) => enrolledIds.includes(a.course_id))
    .map((a) => formatAssignmentForStudent(db, a, user.id));
  return ok(assignments);
}

/** GET /student/assignments/:id */
export function handleStudentAssignment(db, user, assignmentId) {
  const enrolledIds = studentCourseIds(db, user.id);
  const asg = db.assignments.find((a) => a.id === assignmentId);
  if (!asg || !enrolledIds.includes(asg.course_id)) return err404("Assignment");
  return ok(formatAssignmentForStudent(db, asg, user.id));
}

/** POST /student/assignments/:id/submit — body: { content: string } */
export function handleStudentSubmitAssignment(db, user, assignmentId, body) {
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
      points:       db.settings?.points_submission_on_time ?? POINTS_SUBMISSION_ON_TIME,
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
export function formatAssignmentForStudent(db, asg, studentId) {
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
export function handleStudentQuizzes(db, user) {
  const enrolledIds = studentCourseIds(db, user.id);
  const now = getNow();
  const quizzes = db.quizzes
    .filter((q) => enrolledIds.includes(q.course_id))
    .map((q) => formatQuizForStudent(db, q, user.id, now));
  return ok(quizzes);
}

/** GET /student/quizzes/:id (includes questions for active quiz) */
export function handleStudentQuiz(db, user, quizId) {
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
export function handleStudentAttemptQuiz(db, user, quizId, body) {
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
    points:       db.settings?.points_quiz_completion ?? POINTS_QUIZ_COMPLETION,
    reference_id: attempt.id,
    description:  `Quiz completed: ${course?.code ?? ""} – ${quiz.title}`,
    created_at:   now.toISOString(),
  });

  mockDb.save(db);
  return ok({ id: attempt.id, score, total, submitted_at: attempt.submitted_at }, 201);
}

/** Formats a quiz for student view (no correct_index). */
export function formatQuizForStudent(db, quiz, studentId, now) {
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
