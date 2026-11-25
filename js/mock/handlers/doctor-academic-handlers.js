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

/** GET /doctor/dashboard/summary aggregates the authenticated doctor's workload. */
export function handleDoctorDashboard(db, user) {
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
      if (absences >= (db.settings?.absence_warning_threshold ?? ABSENCE_WARNING_THRESHOLD)) atRisk++;
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
export function handleDoctorCourses(db, user) {
  const courses = db.courses
    .filter((c) => c.doctor_id === user.id)
    .map((c) => formatCourseForDoctor(db, c));
  return ok(courses);
}

/** GET /doctor/courses/:id */
export function handleDoctorCourse(db, user, courseId) {
  const course = db.courses.find(
    (item) =>
      (item.id === courseId || item.code.toLowerCase() === courseId.toLowerCase()) &&
      item.doctor_id === user.id
  );
  if (!course) return err404("Course");
  return ok(formatCourseForDoctor(db, course, true));
}

/** Formats one owned course for doctor-facing responses. */
export function formatCourseForDoctor(db, course, includeLectures = false) {
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
export function handleDoctorAssignments(db, user) {
  const myCourseIds = doctorCourseIds(db, user.id);
  const assignments = db.assignments
    .filter((a) => myCourseIds.includes(a.course_id))
    .map((a) => formatAssignmentForDoctor(db, a));
  return ok(assignments);
}

/** POST /doctor/assignments — create assignment for a course */
export function handleDoctorCreateAssignment(db, user, body) {
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
export function handleDoctorUpdateAssignment(db, user, assignmentId, body) {
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
export function handleDoctorCreateLecture(db, user, body) {
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
export function handleDoctorUpdateLecture(db, user, lectureId, body) {
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
export function handleDoctorPendingCount(db, user) {
  const myCourseIds   = doctorCourseIds(db, user.id);
  const myAssignments = db.assignments.filter((a) => myCourseIds.includes(a.course_id));
  const count = myAssignments.reduce((sum, a) => {
    return sum + db.submissions.filter(
      (s) => s.assignment_id === a.id && s.doctor_final_grade === null
    ).length;
  }, 0);
  return ok({ pending_count: count });
}

/** Formats one owned assignment and its doctor-only grading details. */
export function formatAssignmentForDoctor(db, asg) {
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
export function handleDoctorGradeSubmission(db, user, submissionId, body) {
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
export function handleDoctorQuizzes(db, user) {
  const myCourseIds = doctorCourseIds(db, user.id);
  const now = getNow();
  return ok(
    db.quizzes
      .filter((q) => myCourseIds.includes(q.course_id))
      .map((q) => formatQuizForDoctor(db, q, now))
  );
}

/** GET /doctor/quizzes/:id/results */
export function handleDoctorQuizResults(db, user, quizId) {
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
export function handleDoctorCreateQuiz(db, user, body) {
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
export function handleDoctorUpdateQuiz(db, user, quizId, body) {
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

/** Formats one owned quiz with its current availability status. */
export function formatQuizForDoctor(db, quiz, now) {
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
