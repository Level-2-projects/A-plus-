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

export function handleDoctorAttendance(db, user) {
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
export function handleDoctorRecordAttendance(db, user, body) {
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
export function handleDoctorStudents(db, user, searchParams) {
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
export function handleDoctorGrantBonus(db, user, studentId, body) {
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
export function handleDoctorMessages(db, user) {
  const myCourseIds = doctorCourseIds(db, user.id);
  // Doctor sees messages they sent
  const msgs = db.messages
    .filter((m) => m.sender_id === user.id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return ok(msgs);
}

/** POST /doctor/messages */
export function handleDoctorSendMessage(db, user, body) {
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
export function handleDoctorRatings(db, user) {
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
export function handleDoctorProfile(db, user) {
  return ok({
    id:            user.id,
    full_name:     user.full_name,
    email:         user.email,
    university_id: user.university_id,
    department:    user.department_name,
    role:          user.role,
  });
}

