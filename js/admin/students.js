/**
 * js/admin/students.js – Department student directory and account management UI.
 * Uses existing admin student and enrollment APIs without adding routes.
 */

import { createAdminStudent, deactivateAdminStudent, enrollStudent, getAdminCourses, getAdminStudents, reactivateAdminStudent, unenrollStudent, updateAdminStudent } from "../api/admin-api.js";
import { createDataTable } from "../components/data-table.js";
import { confirmDialog } from "../components/dialog.js";
import { createEmptyState } from "../components/empty-state.js";
import { createErrorState } from "../components/error-state.js";
import { createFormField, showFieldErrors } from "../components/form-field.js";
import { createSkeleton } from "../components/skeleton.js";
import { createStatusDot } from "../components/status-dot.js";
import { showToast } from "../components/toast.js";
import { initAdminPage, setPageTitle } from "../core/layout.js";
import { STRINGS } from "../config/strings.js";

const root = document.getElementById("page-content");
let students = [];
let courses = [];
let searchTerm = "";
let courseFilter = "";
let statusFilter = "";

/** Mounts the protected students page and loads its directory data. */
async function start() {
  initAdminPage("students");
  if (!root || !document.querySelector(".app-shell")) return;
  setPageTitle(STRINGS.pages.adminStudents);
  root.append(createSkeleton({ lines: 8, label: STRINGS.shared.loading }));
  await loadStudents();
}

/** Loads department courses and the current student directory. */
async function loadStudents() {
  try {
    [students, courses] = await Promise.all([getAdminStudents(courseFilter || undefined), getAdminCourses()]);
    renderStudents();
  } catch (error) {
    root.replaceChildren(createErrorState(error.message || STRINGS.adminStudents.loadError, loadStudents));
  }
}

/** Renders filters, actions, and the responsive shared data table. */
function renderStudents() {
  root.replaceChildren();
  const page = document.createElement("section");
  page.className = "page-stack";
  const header = document.createElement("div");
  header.className = "course-work-row";
  const title = document.createElement("h2");
  title.textContent = STRINGS.adminStudents.title;
  const add = createButton(STRINGS.adminStudents.add, "btn btn-primary", () => openStudentDialog());
  header.append(title, add);
  page.append(header, createFilters());
  const visible = students.filter(matchesFilters);
  if (!visible.length) page.append(createEmptyState(STRINGS.adminStudents.noStudents));
  else page.append(createDataTable({ label: STRINGS.adminStudents.title, emptyMessage: STRINGS.adminStudents.noStudents, rows: visible, columns: tableColumns() }));
  root.append(page);
}

/** Creates accessible search, course, and account-status filters. */
function createFilters() {
  const form = document.createElement("div");
  form.className = "todo-form-grid";
  const search = createFormField({ label: STRINGS.adminStudents.search, name: "search" });
  const searchInput = search.querySelector("input");
  searchInput.placeholder = STRINGS.adminStudents.searchPlaceholder;
  searchInput.value = searchTerm;
  searchInput.addEventListener("input", () => { searchTerm = searchInput.value; renderStudents(); });
  const course = createFormField({ label: STRINGS.adminStudents.course, name: "course", options: [{ value: "", text: STRINGS.adminStudents.allCourses }, ...courses.map((item) => ({ value: item.id, text: `${item.code} — ${item.title}` }))] });
  const courseSelect = course.querySelector("select");
  courseSelect.value = courseFilter;
  courseSelect.addEventListener("change", async () => { courseFilter = courseSelect.value; await loadStudents(); });
  const status = createFormField({ label: STRINGS.adminStudents.status, name: "status", options: [{ value: "", text: STRINGS.adminStudents.allStatuses }, { value: "active", text: STRINGS.adminStudents.active }, { value: "disabled", text: STRINGS.adminStudents.deactivated }] });
  const statusSelect = status.querySelector("select");
  statusSelect.value = statusFilter;
  statusSelect.addEventListener("change", () => { statusFilter = statusSelect.value; renderStudents(); });
  form.append(search, course, status);
  return form;
}

/** Returns whether a row matches the locally applicable search and status controls. */
function matchesFilters(student) {
  const query = searchTerm.trim().toLowerCase();
  const matchesSearch = !query || [student.full_name, student.email, student.university_id].some((value) => String(value).toLowerCase().includes(query));
  return matchesSearch && (!statusFilter || (statusFilter === "disabled" ? student.disabled : !student.disabled));
}

/** Declares the shared data-table columns and their safe DOM renderers. */
function tableColumns() {
  return [
    { key: "full_name", label: STRINGS.students.name },
    { key: "email", label: STRINGS.profile.email },
    { key: "university_id", label: STRINGS.profile.universityId },
    { key: "level", label: STRINGS.adminStudents.level, render: (row) => row.level || "—" },
    { key: "enrolled_courses", label: STRINGS.adminStudents.enrolledCourses, render: (row) => row.enrolled_courses.join(", ") || "—" },
    { key: "status", label: STRINGS.adminStudents.status, render: (row) => createStatusDot(row.disabled ? STRINGS.adminStudents.deactivated : STRINGS.adminStudents.active, row.disabled ? "warning" : "success") },
    { key: "actions", label: STRINGS.adminStudents.actions, render: (row) => createRowActions(row) },
  ];
}

/** Creates per-row edit, account-state, and enrollment actions. */
function createRowActions(student) {
  const actions = document.createElement("div");
  actions.className = "todo-actions";
  actions.append(createButton(STRINGS.adminStudents.edit, "btn btn-secondary", () => openStudentDialog(student)));
  actions.append(createButton(student.disabled ? STRINGS.adminStudents.reactivate : STRINGS.adminStudents.deactivate, "btn btn-secondary", () => toggleStudent(student)));
  actions.append(createButton(STRINGS.adminStudents.enrollments, "btn btn-secondary", () => openEnrollmentDialog(student)));
  return actions;
}

/** Creates a button without inline event handlers. */
function createButton(label, className, action) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.addEventListener("click", action);
  return button;
}

/** Opens creation or edit dialog and maps API validation errors to its fields. */
function openStudentDialog(student = null) {
  const dialog = document.createElement("dialog");
  dialog.className = "confirm-dialog";
  const form = document.createElement("form");
  form.className = "confirm-dialog__form";
  const heading = document.createElement("h2");
  heading.textContent = student ? STRINGS.adminStudents.edit : STRINGS.adminStudents.add;
  const fields = [createFormField({ label: STRINGS.profile.name, name: "full_name", required: true }), createFormField({ label: STRINGS.profile.email, name: "email", type: "email", required: true }), createFormField({ label: STRINGS.profile.universityId, name: "university_id", required: true }), createFormField({ label: STRINGS.adminStudents.level, name: "level", required: true, options: ["1", "2", "3", "4", "5"].map((value) => ({ value, text: value })) })];
  fields.forEach((field) => { const input = field.querySelector("input, select"); if (student) input.value = student[input.name] || ""; });
  const message = document.createElement("p");
  message.className = "form-message"; message.hidden = true;
  const actions = document.createElement("div"); actions.className = "dialog-actions";
  const cancel = createButton(STRINGS.dialog.cancel, "btn btn-secondary", () => dialog.close());
  const save = document.createElement("button"); save.type = "submit"; save.className = "btn btn-primary"; save.textContent = STRINGS.adminStudents.save;
  actions.append(cancel, save); form.append(heading, ...fields, message, actions); dialog.append(form); document.body.append(dialog); dialog.showModal();
  dialog.addEventListener("close", () => dialog.remove(), { once: true });
  form.addEventListener("submit", async (event) => {
    event.preventDefault(); save.disabled = true;
    const data = Object.fromEntries(new FormData(form));
    try {
      const result = student ? await updateAdminStudent(student.id, data) : await createAdminStudent(data);
      dialog.close(); showToast(student ? STRINGS.adminStudents.updated : STRINGS.adminStudents.created, { kind: "success" });
      if (!student) showTemporaryPassword(result.temp_password);
      await loadStudents();
    } catch (error) { showFieldErrors(form, error, message); save.disabled = false; }
  });
}

/** Shows the temporary password exactly once after account creation, with local copy support. */
function showTemporaryPassword(password) {
  const dialog = document.createElement("dialog"); dialog.className = "confirm-dialog";
  const form = document.createElement("form"); form.method = "dialog"; form.className = "confirm-dialog__form";
  const title = document.createElement("h2"); title.textContent = STRINGS.adminStudents.passwordTitle;
  const note = document.createElement("p"); note.textContent = STRINGS.adminStudents.passwordNotice;
  const value = document.createElement("code"); value.textContent = password;
  const copy = createButton(STRINGS.adminStudents.copy, "btn btn-secondary", async () => { await navigator.clipboard?.writeText(password); showToast(STRINGS.adminStudents.copied, { kind: "success" }); });
  const close = document.createElement("button"); close.className = "btn btn-primary"; close.value = "close"; close.textContent = STRINGS.shared.close;
  form.append(title, note, value, copy, close); dialog.append(form); document.body.append(dialog); dialog.showModal(); dialog.addEventListener("close", () => dialog.remove(), { once: true });
}

/** Confirms and changes account state, then refreshes the row immediately from the API. */
async function toggleStudent(student) {
  const reactivating = student.disabled;
  const confirmed = await confirmDialog({ title: reactivating ? STRINGS.adminStudents.reactivateTitle : STRINGS.adminStudents.deactivateTitle, message: reactivating ? STRINGS.adminStudents.reactivateConfirm : STRINGS.adminStudents.deactivateConfirm, confirmLabel: reactivating ? STRINGS.adminStudents.reactivate : STRINGS.adminStudents.deactivate });
  if (!confirmed) return;
  try { reactivating ? await reactivateAdminStudent(student.id) : await deactivateAdminStudent(student.id); showToast(reactivating ? STRINGS.adminStudents.reactivatedMessage : STRINGS.adminStudents.deactivatedMessage, { kind: "success" }); await loadStudents(); }
  catch (error) { showToast(error.message || STRINGS.adminStudents.loadError, { kind: "error" }); }
}

/** Opens a department-course enrollment panel for a single student. */
function openEnrollmentDialog(student) {
  const dialog = document.createElement("dialog"); dialog.className = "confirm-dialog";
  const form = document.createElement("form"); form.className = "confirm-dialog__form";
  const title = document.createElement("h2"); title.textContent = `${STRINGS.adminStudents.enrollmentTitle}: ${student.full_name}`;
  const available = courses.filter((course) => !student.enrolled_courses.includes(course.code));
  const selectField = createFormField({ label: STRINGS.adminStudents.addCourse, name: "course", options: [{ value: "", text: STRINGS.adminStudents.allCourses }, ...available.map((course) => ({ value: course.id, text: `${course.code} — ${course.title}` }))] });
  const save = document.createElement("button"); save.type = "submit"; save.className = "btn btn-primary"; save.textContent = STRINGS.adminStudents.addCourse;
  const list = document.createElement("div"); list.className = "page-stack";
  const enrolled = courses.filter((course) => student.enrolled_courses.includes(course.code));
  if (!enrolled.length) list.append(createEmptyState(STRINGS.adminStudents.noEnrollments));
  enrolled.forEach((course) => { const row = document.createElement("div"); row.className = "due-item"; const name = document.createElement("span"); name.textContent = `${course.code} — ${course.title}`; const remove = createButton(STRINGS.adminStudents.removeCourse, "btn btn-secondary", async () => { try { await unenrollStudent(course.id, student.id); dialog.close(); showToast(STRINGS.adminStudents.enrollmentSaved, { kind: "success" }); await loadStudents(); } catch (error) { showToast(error.message, { kind: "error" }); } }); row.append(name, remove); list.append(row); });
  const cancel = createButton(STRINGS.dialog.cancel, "btn btn-secondary", () => dialog.close()); const actions = document.createElement("div"); actions.className = "dialog-actions"; actions.append(cancel, save); form.append(title, selectField, list, actions); dialog.append(form); document.body.append(dialog); dialog.showModal(); dialog.addEventListener("close", () => dialog.remove(), { once: true });
  form.addEventListener("submit", async (event) => { event.preventDefault(); const courseId = new FormData(form).get("course"); if (!courseId) return; try { await enrollStudent(String(courseId), student.id); dialog.close(); showToast(STRINGS.adminStudents.enrollmentSaved, { kind: "success" }); await loadStudents(); } catch (error) { showToast(error.message || STRINGS.adminStudents.loadError, { kind: "error" }); } });
}

start();
