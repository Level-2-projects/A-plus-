/**
 * js/doctor/courses.js - Doctor course cards, lecture editing, and course work.
 * Depends on doctor API methods and shared page components.
 */

import { createDoctorLecture, getDoctorAssignments, getDoctorCourse, getDoctorCourses, getDoctorQuizzes, updateDoctorLecture } from "../api/doctor-api.js";
import { initDoctorPage, setPageTitle } from "../core/layout.js";
import { STRINGS } from "../config/strings.js";
import { createEmptyState } from "../components/empty-state.js";
import { createErrorState } from "../components/error-state.js";
import { createFormField, showFieldErrors } from "../components/form-field.js";
import { createSkeleton } from "../components/skeleton.js";
import { formatDate } from "../components/date-format.js";
import { showToast } from "../components/toast.js";

const root = document.getElementById("page-content");
const courseId = new URLSearchParams(location.search).get("id");
let courses = [];

/** Mounts the doctor's courses list or course detail. */
async function start() {
  initDoctorPage("courses");
  if (!root || !document.querySelector(".app-shell")) return;
  root.append(createSkeleton({ label: STRINGS.shared.loading }));
  await loadCourses();
}

/** Loads all data for the current route and renders an explicit retry on failure. */
async function loadCourses() {
  try {
    if (courseId) {
      const [course, assignments, quizzes] = await Promise.all([
        getDoctorCourse(courseId),
        getDoctorAssignments(),
        getDoctorQuizzes(),
      ]);
      renderCourseDetail(course, assignments, quizzes);
      return;
    }
    courses = await getDoctorCourses();
    renderCourseList();
  } catch (error) {
    root.replaceChildren(createErrorState(error.message || STRINGS.courses.loadError, loadCourses));
  }
}

/** Renders doctor-owned courses with enrollment and lecture progress. */
function renderCourseList() {
  root.replaceChildren();
  const page = document.createElement("section");
  page.className = "page-stack";
  const heading = document.createElement("h2");
  heading.textContent = STRINGS.courses.title;
  const grid = document.createElement("div");
  grid.className = "page-grid course-grid";
  if (!courses.length) grid.append(createEmptyState(STRINGS.dashboard.noCourses));
  courses.forEach((course, index) => {
    const card = document.createElement("article");
    card.className = "card card--interactive course-card stagger";
    const content = document.createElement("div");
    const code = document.createElement("p");
    code.className = `course-mark course-color-${(index % 6) + 1}`;
    code.textContent = course.code;
    const title = document.createElement("h3");
    title.textContent = course.title;
    const count = document.createElement("p");
    count.textContent = `${course.enrolled_count} ${STRINGS.courses.enrolled}`;
    const schedule = document.createElement("p");
    schedule.textContent = `${course.schedule} · ${course.room}`;
    const link = document.createElement("a");
    link.className = "btn btn-secondary";
    link.href = `course.html?id=${encodeURIComponent(course.id)}`;
    link.textContent = STRINGS.courses.openCourse;
    content.append(code, title, count, schedule, link);
    card.append(content);
    grid.append(card);
  });
  page.append(heading, grid);
  root.append(page);
}

/** Renders the course roster summary, lectures, assignments, and quizzes. */
function renderCourseDetail(course, assignments, quizzes) {
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
  const summary = document.createElement("p");
  summary.textContent = `${course.enrolled_count} ${STRINGS.courses.enrolled} · ${course.credit_hours} ${STRINGS.courses.credits} · ${course.schedule} · ${course.room}`;
  overview.append(code, title, summary);

  const lectureHeading = document.createElement("div");
  lectureHeading.className = "page-heading-row";
  const lectureTitle = document.createElement("h3");
  lectureTitle.textContent = STRINGS.courses.lectures;
  const addLecture = document.createElement("button");
  addLecture.className = "btn btn-primary";
  addLecture.type = "button";
  addLecture.textContent = STRINGS.courses.newLecture;
  addLecture.addEventListener("click", () => openLectureDialog(course, null));
  lectureHeading.append(lectureTitle, addLecture);
  const lectureList = document.createElement("div");
  lectureList.className = "card-list";
  if (!course.lectures.length) lectureList.append(createEmptyState(STRINGS.courses.noLectures));
  course.lectures.forEach((lecture) => {
    const card = document.createElement("article");
    card.className = "card lecture-card";
    const heading = document.createElement("h4");
    heading.textContent = `${lecture.number}. ${lecture.title}`;
    const date = document.createElement("time");
    date.dateTime = lecture.date;
    date.textContent = formatDate(lecture.date).absolute;
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "btn btn-secondary";
    edit.textContent = STRINGS.courses.editLecture;
    edit.addEventListener("click", () => openLectureDialog(course, lecture));
    card.append(heading, date, edit);
    if (lecture.material_url) {
      const material = document.createElement("a");
      material.href = lecture.material_url;
      material.target = "_blank";
      material.rel = "noopener noreferrer";
      material.textContent = STRINGS.courses.material;
      card.append(material);
    }
    lectureList.append(card);
  });

  const assignmentHeading = document.createElement("h3");
  assignmentHeading.textContent = STRINGS.courses.assignments;
  const assignmentList = document.createElement("div");
  assignmentList.className = "card-list";
  const ownAssignments = assignments.filter((item) => item.course_id === course.id);
  if (!ownAssignments.length) assignmentList.append(createEmptyState(STRINGS.courses.noAssignments));
  ownAssignments.forEach((item) => {
    const card = document.createElement("article");
    card.className = "card course-work-row";
    const name = document.createElement("h4");
    name.textContent = item.title;
    const summary = document.createElement("p");
    summary.textContent = `${item.pending_submissions} ${STRINGS.assignments.waiting} · ${item.total_submissions} ${STRINGS.assignments.submissions}`;
    const link = document.createElement("a");
    link.href = `assignment.html?id=${encodeURIComponent(item.id)}`;
    link.textContent = STRINGS.assignments.openSubmissions;
    card.append(name, summary, link);
    assignmentList.append(card);
  });

  const quizHeading = document.createElement("h3");
  quizHeading.textContent = STRINGS.courses.quizzes;
  const quizList = document.createElement("div");
  quizList.className = "card-list";
  const ownQuizzes = quizzes.filter((item) => item.course_id === course.id);
  if (!ownQuizzes.length) quizList.append(createEmptyState(STRINGS.courses.noQuizzes));
  ownQuizzes.forEach((item) => {
    const card = document.createElement("article");
    card.className = "card course-work-row";
    const name = document.createElement("h4");
    name.textContent = item.title;
    const summary = document.createElement("p");
    summary.textContent = `${item.completed_count} / ${item.total_enrolled} ${STRINGS.quizzes.attempts}`;
    const link = document.createElement("a");
    link.href = `quiz.html?id=${encodeURIComponent(item.id)}`;
    link.textContent = STRINGS.quizzes.viewResults;
    card.append(name, summary, link);
    quizList.append(card);
  });
  page.append(back, overview, lectureHeading, lectureList, assignmentHeading, assignmentList, quizHeading, quizList);
  root.append(page);
}

/** Opens a native dialog for creating or updating one course lecture. */
function openLectureDialog(course, lecture) {
  const previouslyFocused = document.activeElement;
  const dialog = document.createElement("dialog");
  dialog.className = "confirm-dialog";
  const form = document.createElement("form");
  form.className = "page-stack";
  const heading = document.createElement("h2");
  heading.textContent = lecture ? STRINGS.courses.editLecture : STRINGS.courses.newLecture;
  const titleField = createFormField({ label: STRINGS.courses.lectureTitle, name: "title", required: true });
  const numberField = createFormField({ label: STRINGS.courses.lectureNumber, name: "number", type: "number", required: true });
  const dateField = createFormField({ label: STRINGS.courses.lectureDate, name: "date", type: "date", required: true });
  const urlField = createFormField({ label: STRINGS.courses.materialUrl, name: "material_url", type: "url" });
  const message = document.createElement("p");
  message.className = "form-message";
  message.hidden = true;
  const actions = document.createElement("div");
  actions.className = "dialog-actions";
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.className = "btn btn-secondary";
  cancel.textContent = STRINGS.dialog.cancel;
  cancel.addEventListener("click", () => dialog.close());
  const save = document.createElement("button");
  save.type = "submit";
  save.className = "btn btn-primary";
  save.textContent = STRINGS.courses.saveLecture;
  actions.append(cancel, save);
  form.append(heading, titleField, numberField, dateField, urlField, message, actions);
  dialog.append(form);
  document.body.append(dialog);
  if (lecture) {
    titleField.querySelector("input").value = lecture.title;
    numberField.querySelector("input").value = lecture.number;
    dateField.querySelector("input").value = lecture.date;
    urlField.querySelector("input").value = lecture.material_url || "";
  } else {
    dateField.querySelector("input").value = todayDate();
    const nextNumber = Math.max(0, ...course.lectures.map((entry) => entry.number)) + 1;
    numberField.querySelector("input").value = String(nextNumber);
  }
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      dialog.close();
    }
  });
  dialog.addEventListener("close", () => {
    dialog.remove();
    if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
  }, { once: true });
  dialog.showModal();
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const values = new FormData(form);
    const payload = {
      course_id: course.id,
      title: String(values.get("title")).trim(),
      number: Number(values.get("number")),
      date: String(values.get("date")),
      material_url: String(values.get("material_url") || "").trim(),
    };
    save.disabled = true;
    try {
      if (lecture) await updateDoctorLecture(lecture.id, payload);
      else await createDoctorLecture(payload);
      showToast(STRINGS.courses.lectureSaved, { kind: "success" });
      dialog.close();
      await loadCourses();
    } catch (error) {
      showFieldErrors(form, error, message);
      save.disabled = false;
    }
  });
}

/** Supplies a browser-local ISO date for the lecture editor. */
function todayDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

start();
