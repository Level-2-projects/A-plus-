/**
 * js/student/courses.js - Student course cards, course detail, and anonymous ratings.
 * Depends on student API methods and shared page components.
 */

import { getAttendance, getAssignments, getCourse, getCourses, getQuizzes, submitRating } from "../api/student-api.js";
import { initStudentPage, setPageTitle } from "../core/layout.js";
import { STRINGS } from "../config/strings.js";
import { createErrorState } from "../components/error-state.js";
import { createEmptyState } from "../components/empty-state.js";
import { createFormField, showFieldErrors } from "../components/form-field.js";
import { createProgressRing } from "../components/progress-ring.js";
import { createSkeleton } from "../components/skeleton.js";
import { createStatusDot } from "../components/status-dot.js";
import { formatDate } from "../components/date-format.js";
import { showToast } from "../components/toast.js";

const root = document.getElementById("page-content");
const courseId = new URLSearchParams(location.search).get("id");

/** Mounts the student course view and renders a retryable loading state. */
async function start() {
  initStudentPage("courses");
  if (!root || !document.querySelector(".app-shell")) return;
  root.append(createSkeleton({ label: STRINGS.shared.loading }));
  await loadCourses();
}

/** Loads either the enrolled-course cards or one course's related content. */
async function loadCourses() {
  try {
    if (courseId) {
      const [course, assignments, quizzes, attendance] = await Promise.all([
        getCourse(courseId),
        getAssignments(),
        getQuizzes(),
        getAttendance(),
      ]);
      renderCourseDetail(course, assignments, quizzes, attendance);
      return;
    }
    const [courses, attendance] = await Promise.all([getCourses(), getAttendance()]);
    renderCourseList(courses, attendance.courses);
  } catch (error) {
    root.replaceChildren(createErrorState(error.message || STRINGS.courses.loadError, loadCourses));
  }
}

/** Renders enrolled courses with their course-specific attendance rings. */
function renderCourseList(courses, attendance) {
  root.replaceChildren();
  const page = document.createElement("section");
  page.className = "page-stack";
  const heading = document.createElement("h2");
  heading.textContent = STRINGS.courses.title;
  const grid = document.createElement("div");
  grid.className = "page-grid course-grid";
  if (!courses.length) grid.append(createEmptyState(STRINGS.courses.noCourses));
  courses.forEach((course, index) => {
    const courseAttendance = attendance.find((entry) => entry.course_id === course.id);
    grid.append(createCourseCard(course, courseAttendance?.percentage ?? 0, index));
  });
  page.append(heading, grid);
  root.append(page);
}

/** Creates an interactive course card with its progress ring and schedule. */
function createCourseCard(course, attendance, index) {
  const card = document.createElement("article");
  card.className = "card card--interactive course-card stagger";
  const ring = createProgressRing({ value: attendance, label: `${course.code} ${attendance}%` });
  const content = document.createElement("div");
  const code = document.createElement("p");
  code.className = `course-mark course-color-${(index % 6) + 1}`;
  code.textContent = course.code;
  const title = document.createElement("h3");
  title.textContent = course.title;
  const doctor = document.createElement("p");
  doctor.textContent = course.doctor;
  const schedule = document.createElement("p");
  schedule.textContent = `${course.schedule} · ${course.room}`;
  const link = document.createElement("a");
  link.className = "btn btn-secondary";
  link.href = `course.html?id=${encodeURIComponent(course.id)}`;
  link.textContent = STRINGS.courses.openCourse;
  content.append(code, title, doctor, schedule, link);
  card.append(ring, content);
  return card;
}

/** Renders lectures, course work, attendance, and anonymous rating forms. */
function renderCourseDetail(course, assignments, quizzes, attendance) {
  root.replaceChildren();
  setPageTitle(course.title);
  const page = document.createElement("section");
  page.className = "page-stack";
  const back = document.createElement("a");
  back.href = "courses.html";
  back.textContent = STRINGS.courses.backToCourses;
  const overview = document.createElement("article");
  overview.className = "card page-stack";
  const code = document.createElement("p");
  code.className = "course-mark course-color-1";
  code.textContent = course.code;
  const title = document.createElement("h2");
  title.textContent = course.title;
  const doctor = document.createElement("p");
  doctor.textContent = `${STRINGS.courses.doctor}: ${course.doctor}`;
  const details = document.createElement("p");
  details.textContent = `${course.department} · ${course.credit_hours} ${STRINGS.courses.credits} · ${course.schedule} · ${course.room}`;
  const courseAttendance = attendance.courses.find((item) => item.course_id === course.id);
  const ring = createProgressRing({
    value: courseAttendance?.percentage ?? 0,
    label: `${STRINGS.courses.attendance}: ${courseAttendance?.percentage ?? 0}%`,
  });
  const attendanceDescription = document.createElement("p");
  attendanceDescription.textContent = courseAttendance
    ? `${courseAttendance.attended} ${STRINGS.attendance.attended} · ${courseAttendance.absences} ${STRINGS.attendance.absences}`
    : STRINGS.shared.noItems;
  overview.append(code, title, doctor, details, ring, attendanceDescription);

  const lectureSection = document.createElement("section");
  lectureSection.className = "page-stack";
  const lectureHeading = document.createElement("h3");
  lectureHeading.textContent = STRINGS.courses.lectures;
  const lectureList = document.createElement("div");
  lectureList.className = "card-list";
  if (!course.lectures.length) lectureList.append(createEmptyState(STRINGS.courses.noLectures));
  course.lectures.forEach((lecture) => {
    const card = document.createElement("article");
    card.className = "card lecture-card";
    const name = document.createElement("h4");
    name.textContent = `${lecture.number}. ${lecture.title}`;
    const date = document.createElement("time");
    date.dateTime = lecture.date;
    date.textContent = formatDate(lecture.date).absolute;
    card.append(name, date);
    if (lecture.material_url) {
      const material = document.createElement("a");
      material.href = lecture.material_url;
      material.target = "_blank";
      material.rel = "noopener noreferrer";
      material.textContent = STRINGS.courses.material;
      card.append(material);
    }
    card.append(createRatingForm("lecture", lecture.id, course.id, STRINGS.courses.rateLecture));
    lectureList.append(card);
  });
  lectureSection.append(lectureHeading, lectureList);

  const assignmentsHeading = document.createElement("h3");
  assignmentsHeading.textContent = STRINGS.courses.assignments;
  const courseAssignments = assignments.filter((item) => item.course_id === course.id);
  const assignmentList = document.createElement("div");
  assignmentList.className = "card-list";
  if (!courseAssignments.length) assignmentList.append(createEmptyState(STRINGS.courses.noAssignments));
  courseAssignments.forEach((item) => {
    const line = document.createElement("article");
    line.className = "card course-work-row";
    const label = document.createElement("h4");
    label.textContent = item.title;
    const due = document.createElement("p");
    const formatted = formatDate(item.due_date);
    due.textContent = `${STRINGS.assignments.due}: ${formatted.absolute} (${formatted.relative})`;
    const link = document.createElement("a");
    link.href = `assignment.html?id=${encodeURIComponent(item.id)}`;
    link.textContent = STRINGS.assignments.viewAssignment;
    line.append(label, createStatusDot(STRINGS.assignments.statusLabels[item.status] || item.status, item.status === "graded" ? "success" : "warning"), due, link);
    assignmentList.append(line);
  });

  const quizzesHeading = document.createElement("h3");
  quizzesHeading.textContent = STRINGS.courses.quizzes;
  const courseQuizzes = quizzes.filter((item) => item.course_id === course.id || item.course_code === course.code);
  const quizList = document.createElement("div");
  quizList.className = "card-list";
  if (!courseQuizzes.length) quizList.append(createEmptyState(STRINGS.courses.noQuizzes));
  courseQuizzes.forEach((item) => {
    const line = document.createElement("article");
    line.className = "card course-work-row";
    const label = document.createElement("h4");
    label.textContent = item.title;
    const status = createStatusDot(STRINGS.quizzes[item.status] || item.status, item.status === "completed" ? "success" : item.status === "missed" ? "danger" : "info");
    const link = document.createElement("a");
    link.href = `quiz.html?id=${encodeURIComponent(item.id)}`;
    link.textContent = STRINGS.quizzes.start;
    line.append(label, status, link);
    quizList.append(line);
  });
  page.append(back, overview, lectureSection, assignmentsHeading, assignmentList, quizzesHeading, quizList);
  page.append(createRatingForm("doctor", course.doctor_id, course.id, STRINGS.courses.rateDoctor));
  root.append(page);
}

/** Builds an anonymous one-to-five rating form for a doctor or lecture. */
function createRatingForm(targetType, targetId, targetCourseId, headingText) {
  const form = document.createElement("form");
  form.className = "card page-stack rating-form";
  const heading = document.createElement("h4");
  heading.textContent = headingText;
  const scoreField = createFormField({
    label: STRINGS.courses.score,
    name: "score",
    type: "number",
    required: true,
  });
  const scoreInput = scoreField.querySelector("input");
  scoreInput.min = "1";
  scoreInput.max = "5";
  scoreInput.step = "1";
  const commentField = createFormField({
    label: STRINGS.courses.comment,
    name: "comment",
    multiline: true,
  });
  const message = document.createElement("p");
  message.className = "form-message";
  message.hidden = true;
  const submit = document.createElement("button");
  submit.className = "btn btn-primary";
  submit.type = "submit";
  submit.textContent = STRINGS.courses.submitRating;
  form.append(heading, scoreField, commentField, message, submit);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    submit.disabled = true;
    const formData = new FormData(form);
    try {
      await submitRating({
        target_type: targetType,
        target_id: targetId,
        course_id: targetCourseId,
        score: Number(formData.get("score")),
        comment: String(formData.get("comment") || ""),
      });
      showToast(STRINGS.courses.ratingSent, { kind: "success" });
      form.reset();
    } catch (error) {
      showFieldErrors(form, error, message);
      if (error.status === 429) showToast(STRINGS.courses.ratingCooldown, { kind: "error" });
    } finally {
      submit.disabled = false;
    }
  });
  return form;
}

start();
