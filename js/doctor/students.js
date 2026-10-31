/**
 * js/doctor/students.js - Doctor roster filters and scoped bonus-point awards.
 * Depends on doctor course/student APIs and shared components.
 */

import { getDoctorCourses, getDoctorStudents, grantBonusPoints } from "../api/doctor-api.js";
import { initDoctorPage } from "../core/layout.js";
import { STRINGS } from "../config/strings.js";
import { createDataTable } from "../components/data-table.js";
import { createEmptyState } from "../components/empty-state.js";
import { createErrorState } from "../components/error-state.js";
import { createFormField, showFieldErrors } from "../components/form-field.js";
import { createSkeleton } from "../components/skeleton.js";
import { createStatusDot } from "../components/status-dot.js";
import { showToast } from "../components/toast.js";

const root = document.getElementById("page-content");
let courses = [];
let students = [];
let selectedCourse = "";

/** Mounts the doctor's roster view and loads owned courses and students. */
async function start() {
  initDoctorPage("students");
  if (!root || !document.querySelector(".app-shell")) return;
  root.append(createSkeleton({ label: STRINGS.shared.loading }));
  await loadStudents();
}

/** Loads course filters and the matching enrolled roster. */
async function loadStudents() {
  try {
    courses = await getDoctorCourses();
    students = await getDoctorStudents(selectedCourse || undefined);
    renderStudents();
  } catch (error) {
    root.replaceChildren(createErrorState(error.message || STRINGS.students.loadError, loadStudents));
  }
}

/** Renders the course selector and responsive student roster table. */
function renderStudents() {
  root.replaceChildren();
  const page = document.createElement("section");
  page.className = "page-stack";
  const heading = document.createElement("h2");
  heading.textContent = STRINGS.students.title;
  const filter = createFormField({
    label: STRINGS.students.course,
    name: "course",
    options: [
      { value: "", text: STRINGS.shared.noItems },
      ...courses.map((course) => ({ value: course.code, text: `${course.code} — ${course.title}` })),
    ],
  });
  const select = filter.querySelector("select");
  select.value = selectedCourse;
  select.addEventListener("change", async () => {
    selectedCourse = select.value;
    await loadStudents();
  });
  const table = createDataTable({
    label: STRINGS.students.title,
    emptyMessage: STRINGS.students.noStudents,
    rows: students,
    columns: [
      { key: "name", label: STRINGS.students.name },
      { key: "course_code", label: STRINGS.students.course },
      { key: "attendance_rate", label: STRINGS.students.attendance, render: (row) => `${row.attendance_rate}%` },
      { key: "absences_count", label: STRINGS.students.absences },
      { key: "current_grade", label: STRINGS.students.grade, render: (row) => row.current_grade ?? STRINGS.shared.noItems },
      { key: "current_month_points", label: STRINGS.students.points },
      { key: "risk", label: STRINGS.students.atRisk, render: (row) => createStatusDot(row.at_penalty_risk ? STRINGS.students.atRisk : STRINGS.students.onTrack, row.at_penalty_risk ? "warning" : "success") },
      { key: "award", label: STRINGS.students.award, render: (row) => createAwardButton(row) },
    ],
  });
  page.append(heading, filter, table);
  root.append(page);
}

/** Creates the action that opens a scoped bonus-award dialog for a student. */
function createAwardButton(student) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "btn btn-secondary";
  button.textContent = STRINGS.students.award;
  button.addEventListener("click", () => openAwardDialog(student));
  return button;
}

/** Opens a native dialog and submits validated bonus points for one student. */
function openAwardDialog(student) {
  const previouslyFocused = document.activeElement;
  const dialog = document.createElement("dialog");
  dialog.className = "confirm-dialog";
  const form = document.createElement("form");
  form.className = "page-stack";
  const heading = document.createElement("h2");
  heading.textContent = `${STRINGS.students.awardTitle}: ${student.name}`;
  const pointsField = createFormField({ label: STRINGS.students.amount, name: "points", type: "number", required: true });
  pointsField.querySelector("input").min = "1";
  const reasonField = createFormField({ label: STRINGS.students.reason, name: "reason", required: true });
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
  save.textContent = STRINGS.students.saveAward;
  actions.append(cancel, save);
  form.append(heading, pointsField, reasonField, message, actions);
  dialog.append(form);
  document.body.append(dialog);
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
    const data = new FormData(form);
    save.disabled = true;
    try {
      await grantBonusPoints(student.student_id, {
        points: Number(data.get("points")),
        reason: String(data.get("reason")).trim(),
      });
      showToast(STRINGS.students.awarded, { kind: "success" });
      dialog.close();
      await loadStudents();
    } catch (error) {
      showFieldErrors(form, error, message);
      save.disabled = false;
    }
  });
}

start();
