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

export function handleStudentAttendance(db, user) {
  const threshold = db.settings?.absence_warning_threshold ?? ABSENCE_WARNING_THRESHOLD;
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
    if (absences >= threshold + 2) penalty_status = "penalty";
    else if (absences >= threshold) penalty_status = "warning";
    else if (absences >= threshold - 1) penalty_status = "notice";

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
    warning_threshold:   threshold,
    courses,
    history,
  });
}

/** GET /student/todos */
export function handleStudentTodos(db, user) {
  return ok(db.todos.filter((t) => t.student_id === user.id));
}

/** POST /student/todos */
export function handleCreateTodo(db, user, body) {
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
export function handleUpdateTodo(db, user, todoId, body) {
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
export function handleDeleteTodo(db, user, todoId) {
  const idx = db.todos.findIndex((t) => t.id === todoId && t.student_id === user.id);
  if (idx === -1) return err404("Todo");
  db.todos.splice(idx, 1);
  mockDb.save(db);
  return ok(null, 204);
}

/** GET /student/points */
export function handleStudentPoints(db, user) {
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
export function handleStudentRoadmaps() {
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
export function handleStudentInbox(db, user) {
  const msgs = db.messages
    .filter((m) => m.recipient_id === user.id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return ok(msgs);
}

/** PUT /student/inbox/:id/read */
export function handleMarkMessageRead(db, user, msgId) {
  const msg = db.messages.find((m) => m.id === msgId && m.recipient_id === user.id);
  if (!msg) return err404("Message");
  msg.is_read = true;
  mockDb.save(db);
  return ok({ success: true, id: msgId, is_read: true });
}

/** GET /student/inbox/unread-count */
export function handleStudentUnreadCount(db, user) {
  const count = db.messages.filter(
    (m) => m.recipient_id === user.id && !m.is_read
  ).length;
  return ok({ unread_count: count });
}

/** GET /student/profile */
export function handleStudentProfile(db, user) {
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
export function handleStudentRating(db, user, body) {
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
  const cooldownDays = db.settings?.rating_cooldown_days ?? RATING_COOLDOWN_DAYS;
  const cooldownMs = cooldownDays * 24 * 60 * 60 * 1000;
  const recent = db.ratings.find(
    (r) =>
      r.student_id  === user.id &&
      r.target_type === target_type &&
      r.target_id   === target_id &&
      getNow() - new Date(r.created_at) < cooldownMs
  );
  if (recent) {
    return fail(429, `You can rate this ${target_type} again in ${cooldownDays} days.`);
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

