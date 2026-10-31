/**
 * js/doctor/assignments.js – Doctor assignment creation and course assignment list.
 * Depends on: doctor API, shared layout, and shared UI components.
 */

import { createDoctorAssignment, getDoctorAssignments, getDoctorCourses } from "../api/doctor-api.js";
import { initDoctorPage } from "../core/layout.js";
import { STRINGS } from "../config/strings.js";
import { createFormField, showFieldErrors } from "../components/form-field.js";
import { createEmptyState } from "../components/empty-state.js";
import { createErrorState } from "../components/error-state.js";
import { createSkeleton } from "../components/skeleton.js";
import { createStatusDot } from "../components/status-dot.js";
import { formatDate } from "../components/date-format.js";
import { showToast } from "../components/toast.js";

const root = document.getElementById("page-content");
let assignments = [];
let courses = [];

/** Mounts the doctor's shell and loads their courses and assignments. */
async function start() {
  initDoctorPage("assignments");
  if (!root || !document.querySelector(".app-shell")) return;
  root.append(createSkeleton({ label: STRINGS.shared.loading }));
  await loadAssignments();
}

/** Loads both required list resources and keeps API errors visible with retry. */
async function loadAssignments() {
  try {
    [assignments, courses] = await Promise.all([getDoctorAssignments(), getDoctorCourses()]);
    renderAssignments();
  } catch (error) {
    root.replaceChildren(createErrorState(error.message || STRINGS.shared.loadError, loadAssignments));
  }
}

/** Renders the creation form and only assignments owned by the current doctor. */
function renderAssignments() {
  root.replaceChildren();
  const page = document.createElement("section");
  page.className = "page-stack";
  const form = createAssignmentForm();
  const list = document.createElement("div");
  list.className = "card-list assignment-card-list";
  if (!assignments.length) list.append(createEmptyState(STRINGS.assignments.noCourseAssignments));
  assignments.forEach((assignment, index) => list.append(createAssignmentCard(assignment, index)));
  page.append(form, list);
  root.append(page);
}

/** Creates the validated assignment form with courses restricted by the API. */
function createAssignmentForm() {
  const form = document.createElement("form");
  form.className = "card page-stack";
  const heading = document.createElement("h2");
  heading.textContent = STRINGS.assignments.createFormTitle;
  const courseField = createFormField({
    label: STRINGS.assignments.courseId,
    name: "course_id",
    required: true,
    options: [
      { value: "", text: STRINGS.assignments.courseSelectPrompt },
      ...courses.map((course) => ({ value: course.id, text: `${course.code} — ${course.title}` })),
    ],
  });
  const titleField = createFormField({ label: STRINGS.assignments.title, name: "title", required: true });
  const descriptionField = createFormField({ label: STRINGS.assignments.description, name: "description", multiline: true });
  descriptionField.querySelector("textarea").placeholder = STRINGS.assignments.descriptionPlaceholder;
  const dueField = createFormField({ label: STRINGS.assignments.dueDate, name: "due_date", type: "datetime-local", required: true });
  const gradeField = createFormField({ label: STRINGS.assignments.maxGrade, name: "max_grade", type: "number", required: true });
  gradeField.querySelector("input").min = "1";
  gradeField.querySelector("input").step = "1";
  gradeField.querySelector("input").value = "20";
  const error = createFormMessage();
  const submit = document.createElement("button");
  submit.type = "submit";
  submit.className = "btn btn-primary";
  submit.textContent = STRINGS.assignments.create;
  form.append(heading, courseField, titleField, descriptionField, dueField, gradeField, error, submit);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    submit.disabled = true;
    try {
      await createDoctorAssignment({
        course_id: String(data.get("course_id")),
        title: String(data.get("title")),
        description: String(data.get("description")),
        due_date: new Date(String(data.get("due_date"))).toISOString(),
        max_grade: Number(data.get("max_grade")),
      });
      showToast(STRINGS.assignments.assignmentCreated, { kind: "success" });
      await loadAssignments();
    } catch (requestError) {
      showFieldErrors(form, requestError, error);
      submit.disabled = false;
    }
  });
  return form;
}

/** Creates an assignment summary and a link to its submission and grading panel. */
function createAssignmentCard(assignment, index) {
  const card = document.createElement("article");
  card.className = "card assignment-card stagger";
  const heading = document.createElement("div");
  heading.className = "assignment-card__header";
  const title = document.createElement("h3");
  title.className = "assignment-card__title";
  title.textContent = assignment.title;
  const status = createStatusDot(`${assignment.pending_submissions} ${STRINGS.assignments.pendingCount}`,
    assignment.pending_submissions ? "warning" : "success");
  heading.append(title, status);
  const meta = document.createElement("div");
  meta.className = "assignment-card__meta";
  const course = courses.find((item) => item.id === assignment.course_id);
  const courseMark = document.createElement("span");
  courseMark.className = `course-mark course-color-${(index % 6) + 1}`;
  courseMark.textContent = assignment.course_code;
  const due = document.createElement("span");
  const date = formatDate(assignment.due_date);
  due.textContent = `${STRINGS.assignments.due}: ${date.absolute} (${date.relative})`;
  meta.append(courseMark, due);
  const counts = document.createElement("p");
  counts.className = "tabular-nums";
  counts.textContent = `${STRINGS.assignments.submittedCount}: ${assignment.total_submissions} / ${course?.enrolled_count ?? 0} · ${STRINGS.assignments.gradedCount}: ${assignment.graded_submissions}`;
  const link = document.createElement("a");
  link.className = "btn btn-secondary";
  link.href = `assignment.html?id=${encodeURIComponent(assignment.id)}`;
  link.textContent = STRINGS.assignments.openSubmissions;
  card.append(heading, meta, counts, link);
  return card;
}

/** Creates a hidden form-level validation message for unmapped API errors. */
function createFormMessage() {
  const message = document.createElement("p");
  message.className = "form-message";
  message.hidden = true;
  return message;
}

start();
