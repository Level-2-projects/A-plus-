/**
 * js/student/todo.js - Student private task creation, filters, editing, and deletion.
 * Depends on student todo/course APIs and shared components.
 */

import { createTodo, deleteTodo, getCourses, getTodos, updateTodo } from "../api/student-api.js";
import { initStudentPage } from "../core/layout.js";
import { STRINGS } from "../config/strings.js";
import { confirmDialog } from "../components/dialog.js";
import { createEmptyState } from "../components/empty-state.js";
import { createErrorState } from "../components/error-state.js";
import { createFormField, showFieldErrors } from "../components/form-field.js";
import { createSkeleton } from "../components/skeleton.js";
import { createTabs } from "../components/tabs.js";
import { showToast } from "../components/toast.js";

const root = document.getElementById("page-content");
let todos = [];
let courses = [];
let activeFilter = "all";

/** Mounts the task view, fetches its data, and shows retry on request failure. */
async function start() {
  initStudentPage("todo");
  if (!root || !document.querySelector(".app-shell")) return;
  root.append(createSkeleton({ label: STRINGS.shared.loading }));
  await loadTodos();
}

/** Loads tasks and enrolled courses needed by the create and edit forms. */
async function loadTodos() {
  try {
    [todos, courses] = await Promise.all([getTodos(), getCourses()]);
    renderTodos();
  } catch (error) {
    root.replaceChildren(createErrorState(error.message || STRINGS.todo.loadError, loadTodos));
  }
}

/** Renders task filters, the add form, and the matching task rows. */
function renderTodos() {
  root.replaceChildren();
  const page = document.createElement("section");
  page.className = "page-stack";
  const heading = document.createElement("h2");
  heading.textContent = STRINGS.todo.title;
  const form = createTodoForm();
  const tabs = createTabs([
    { value: "all", label: STRINGS.todo.all },
    { value: "active", label: STRINGS.todo.active },
    { value: "done", label: STRINGS.todo.done },
  ], activeFilter, (filter) => {
    activeFilter = filter;
    renderTodos();
  }, STRINGS.todo.title);
  const list = document.createElement("div");
  list.className = "card-list";
  const visible = todos.filter((todo) =>
    activeFilter === "all" || (activeFilter === "done" ? todo.completed : !todo.completed)
  );
  if (!visible.length) list.append(createEmptyState(STRINGS.todo.noTasks));
  visible.forEach((todo) => list.append(createTodoRow(todo)));
  page.append(heading, form, tabs, list);
  root.append(page);
}

/** Creates the form for adding a private task. */
function createTodoForm() {
  const form = document.createElement("form");
  form.className = "card page-stack";
  const heading = document.createElement("h3");
  heading.textContent = STRINGS.todo.add;
  const fields = document.createElement("div");
  fields.className = "todo-form-grid";
  const titleField = createFormField({ label: STRINGS.todo.task, name: "title", required: true });
  const dueField = createFormField({ label: STRINGS.todo.due, name: "due_date", type: "date" });
  const priorityField = createFormField({
    label: STRINGS.todo.priority,
    name: "priority",
    required: true,
    options: ["high", "medium", "low"].map((priority) => ({ value: priority, text: STRINGS.todo[priority] })),
  });
  const courseField = createCourseField("course_code");
  fields.append(titleField, dueField, priorityField);
  const courseRow = document.createElement("div");
  courseRow.className = "todo-form-grid";
  courseRow.append(courseField);
  const message = createFormMessage();
  const submit = document.createElement("button");
  submit.className = "btn btn-primary";
  submit.type = "submit";
  submit.textContent = STRINGS.todo.add;
  form.append(heading, fields, courseRow, message, submit);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const payload = {
      title: String(data.get("title")).trim(),
      priority: String(data.get("priority")),
      course_code: String(data.get("course_code") || "") || undefined,
      due_date: String(data.get("due_date") || "") || undefined,
    };
    submit.disabled = true;
    try {
      await createTodo(payload);
      showToast(STRINGS.todo.created, { kind: "success" });
      await loadTodos();
    } catch (error) {
      showFieldErrors(form, error, message);
      submit.disabled = false;
    }
  });
  return form;
}

/** Creates a course selector shared by task creation and inline editing. */
function createCourseField(name, selected = "") {
  const field = createFormField({
    label: STRINGS.todo.course,
    name,
    options: [
      { value: "", text: STRINGS.todo.none },
      ...courses.map((course) => ({ value: course.code, text: `${course.code} — ${course.title}` })),
    ],
  });
  field.querySelector("select").value = selected;
  return field;
}

/** Creates a task card with completion, inline edit, and confirmed deletion. */
function createTodoRow(todo) {
  const card = document.createElement("article");
  card.className = "card todo-card";
  if (todo.editing) return createInlineEditForm(todo);
  const row = document.createElement("div");
  row.className = "todo-item";
  const label = document.createElement("label");
  label.className = "todo-item__title";
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = todo.completed;
  checkbox.setAttribute("aria-label", todo.completed ? STRINGS.todo.reopen : STRINGS.todo.complete);
  checkbox.addEventListener("change", async () => {
    checkbox.disabled = true;
    try {
      await updateTodo(todo.id, { completed: checkbox.checked });
      showToast(STRINGS.todo.updated, { kind: "success" });
      await loadTodos();
    } catch (error) {
      showToast(error.message || STRINGS.shared.loadError, { kind: "error" });
      checkbox.disabled = false;
      checkbox.checked = todo.completed;
    }
  });
  const title = document.createElement("strong");
  title.textContent = todo.title;
  label.append(checkbox, title);
  const priority = document.createElement("span");
  priority.className = `status status-${todo.priority === "high" ? "danger" : todo.priority === "medium" ? "warning" : "info"}`;
  priority.textContent = STRINGS.todo[todo.priority] || todo.priority;
  const due = document.createElement("time");
  if (todo.due_date) {
    due.dateTime = todo.due_date;
    due.textContent = todo.due_date;
  }
  const course = document.createElement("span");
  course.textContent = todo.course_code || "";
  const actions = document.createElement("div");
  actions.className = "todo-actions";
  const edit = document.createElement("button");
  edit.type = "button";
  edit.className = "btn btn-secondary";
  edit.textContent = STRINGS.todo.edit;
  edit.addEventListener("click", () => {
    todo.editing = true;
    renderTodos();
  });
  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "btn btn-ghost";
  remove.textContent = STRINGS.todo.remove;
  remove.addEventListener("click", async () => {
    const confirmed = await confirmDialog({ title: STRINGS.todo.deleteTitle, message: STRINGS.todo.deleteConfirm, confirmLabel: STRINGS.todo.remove });
    if (!confirmed) return;
    try {
      await deleteTodo(todo.id);
      showToast(STRINGS.todo.deleted, { kind: "success" });
      await loadTodos();
    } catch (error) {
      showToast(error.message || STRINGS.todo.loadError, { kind: "error" });
    }
  });
  actions.append(edit, remove);
  row.append(label, priority, due, course, actions);
  card.append(row);
  return card;
}

/** Replaces one task row with its inline editable form. */
function createInlineEditForm(todo) {
  const form = document.createElement("form");
  form.className = "card page-stack";
  const titleField = createFormField({ label: STRINGS.todo.task, name: "title", required: true });
  titleField.querySelector("input").value = todo.title;
  const dueField = createFormField({ label: STRINGS.todo.due, name: "due_date", type: "date" });
  dueField.querySelector("input").value = todo.due_date || "";
  const priorityField = createFormField({
    label: STRINGS.todo.priority,
    name: "priority",
    required: true,
    options: ["high", "medium", "low"].map((priority) => ({ value: priority, text: STRINGS.todo[priority] })),
  });
  priorityField.querySelector("select").value = todo.priority;
  const courseField = createCourseField("course_code", todo.course_code || "");
  const message = createFormMessage();
  const actions = document.createElement("div");
  actions.className = "todo-actions";
  const save = document.createElement("button");
  save.type = "submit";
  save.className = "btn btn-primary";
  save.textContent = STRINGS.todo.save;
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.className = "btn btn-secondary";
  cancel.textContent = STRINGS.dialog.cancel;
  cancel.addEventListener("click", () => {
    delete todo.editing;
    renderTodos();
  });
  actions.append(save, cancel);
  form.append(titleField, dueField, priorityField, courseField, message, actions);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    save.disabled = true;
    try {
      await updateTodo(todo.id, {
        title: String(data.get("title")).trim(),
        due_date: String(data.get("due_date") || ""),
        priority: String(data.get("priority")),
        course_code: String(data.get("course_code") || ""),
      });
      showToast(STRINGS.todo.updated, { kind: "success" });
      await loadTodos();
    } catch (error) {
      showFieldErrors(form, error, message);
      save.disabled = false;
    }
  });
  return form;
}

/** Creates a form-level validation/status message container. */
function createFormMessage() {
  const message = document.createElement("p");
  message.className = "form-message";
  message.hidden = true;
  return message;
}

start();
