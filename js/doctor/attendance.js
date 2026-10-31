/**
 * js/doctor/attendance.js – Doctor attendance roster, recording, and history.
 * Depends on: doctor API, business-rule configuration, and shared UI components.
 */

import { getDoctorAttendanceSessions, getDoctorCourses, getDoctorStudents, recordAttendanceSession } from "../api/doctor-api.js";
import { initDoctorPage } from "../core/layout.js";
import { ABSENCE_WARNING_THRESHOLD } from "../config.js";
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
let sessions = [];
let roster = [];
let selectedCourseId = "";
let selectedStatuses = new Map();
let formNotice = "";

/** Mounts the page and loads doctor-owned courses and attendance history. */
async function start() {
  initDoctorPage("attendance");
  if (!root || !document.querySelector(".app-shell")) return;
  root.append(createSkeleton({ label: STRINGS.shared.loading }));
  await loadAttendance();
}

/** Loads all required data and initializes a roster for the first available course. */
async function loadAttendance() {
  try {
    [courses, sessions] = await Promise.all([getDoctorCourses(), getDoctorAttendanceSessions()]);
    selectedCourseId ||= courses[0]?.id || "";
    if (selectedCourseId) await loadRoster(selectedCourseId);
    renderAttendance();
  } catch (error) {
    root.replaceChildren(createErrorState(error.message || STRINGS.attendance.loadError, loadAttendance));
  }
}

/** Loads the selected course's enrolled roster and defaults statuses to present. */
async function loadRoster(courseId) {
  roster = await getDoctorStudents(courseId);
  selectedStatuses = new Map(roster.map((student) => [student.student_id, "present"]));
}

/** Renders course/session controls, roster status buttons, and the session table. */
function renderAttendance() {
  root.replaceChildren();
  const page = document.createElement("section");
  page.className = "page-stack";
  const heading = document.createElement("h2");
  heading.textContent = STRINGS.attendance.title;
  page.append(heading);
  page.append(createAttendanceForm());
  const historyTitle = document.createElement("h3");
  historyTitle.textContent = STRINGS.attendance.history;
  const table = createDataTable({
    label: STRINGS.attendance.history,
    emptyMessage: STRINGS.attendance.noHistory,
    rows: sessions,
    columns: [
      { key: "course_code", label: STRINGS.attendance.course },
      { key: "lecture_title", label: STRINGS.attendance.lecture },
      { key: "date", label: STRINGS.attendance.date },
      { key: "present_count", label: STRINGS.attendance.present },
      { key: "absent_count", label: STRINGS.attendance.absent },
      { key: "total", label: STRINGS.attendance.sessions },
    ],
  });
  page.append(historyTitle, table);
  root.append(page);
}

/** Builds the roster submission form and exposes threshold warning feedback. */
function createAttendanceForm() {
  const form = document.createElement("form");
  form.className = "card page-stack";
  const title = document.createElement("h3");
  title.textContent = STRINGS.attendance.roster;
  const courseField = createFormField({
    label: STRINGS.attendance.course,
    name: "course_id",
    required: true,
    options: [
      { value: "", text: STRINGS.attendance.selectCourse },
      ...courses.map((course) => ({ value: course.id, text: `${course.code} — ${course.title}` })),
    ],
  });
  const courseSelect = courseField.querySelector("select");
  courseSelect.value = selectedCourseId;
  courseSelect.addEventListener("change", async () => {
    selectedCourseId = courseSelect.value;
    try {
      await loadRoster(selectedCourseId);
      formNotice = "";
      renderAttendance();
    } catch (error) {
      root.replaceChildren(createErrorState(error.message || STRINGS.attendance.loadError, loadAttendance));
    }
  });
  const dateField = createFormField({ label: STRINGS.attendance.date, name: "date", type: "date", required: true });
  dateField.querySelector("input").value = todayDate();
  const rosterList = document.createElement("div");
  rosterList.className = "attendance-roster";
  if (!selectedCourseId) rosterList.append(createEmptyState(STRINGS.attendance.noCourse));
  else if (!roster.length) rosterList.append(createEmptyState(STRINGS.attendance.noStudents));
  roster.forEach((student) => rosterList.append(createRosterRow(student)));
  const warning = document.createElement("p");
  warning.className = "attendance-warning-note";
  warning.setAttribute("role", "status");
  warning.textContent = formNotice;
  warning.hidden = !formNotice;
  const error = document.createElement("p");
  error.className = "form-message";
  error.hidden = true;
  const submit = document.createElement("button");
  submit.type = "submit";
  submit.className = "btn btn-primary";
  submit.textContent = STRINGS.attendance.save;
  form.append(title, courseField, dateField, rosterList, warning, error, submit);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const date = String(new FormData(form).get("date"));
    const warningRecipients = roster.filter((student) =>
      selectedStatuses.get(student.student_id) === "absent"
      && student.absences_count + 1 === ABSENCE_WARNING_THRESHOLD
    );
    submit.disabled = true;
    try {
      await recordAttendanceSession({
        course_id: selectedCourseId,
        date,
        method: "manual",
        records: roster.map((student) => ({
          student_id: student.student_id,
          status: selectedStatuses.get(student.student_id),
        })),
      });
      sessions = await getDoctorAttendanceSessions();
      formNotice = warningRecipients.length
        ? `${STRINGS.attendance.warningSent} ${warningRecipients.map((student) => student.name).join(", ")}.`
        : "";
      showToast(STRINGS.attendance.saved, { kind: "success" });
      renderAttendance();
    } catch (requestError) {
      showFieldErrors(form, requestError, error);
      submit.disabled = false;
    }
  });
  return form;
}

/** Creates one roster row with an accessible solid-selected attendance control. */
function createRosterRow(student) {
  const row = document.createElement("fieldset");
  row.className = "attendance-roster-row";
  const legend = document.createElement("legend");
  legend.textContent = student.name;
  const prior = document.createElement("span");
  prior.className = "attendance-roster-absence";
  prior.textContent = `${student.absences_count} ${STRINGS.attendance.absences}`;
  const controls = document.createElement("div");
  controls.className = "segmented-control";
  controls.setAttribute("aria-label", `${student.name}: ${STRINGS.attendance.recordStatus}`);
  ["present", "absent", "excused"].forEach((status) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "segmented-control__option";
    button.textContent = STRINGS.attendance[status];
    button.setAttribute("aria-pressed", String(selectedStatuses.get(student.student_id) === status));
    button.addEventListener("click", () => {
      selectedStatuses.set(student.student_id, status);
      renderAttendance();
    });
    controls.append(button);
  });
  row.append(legend, prior, controls);
  return row;
}

/** Returns the browser-local current date in an HTML date-input format. */
function todayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

start();
