/**
 * js/student/assignments.js – Student assignment list and status filters.
 * Depends on: student API, shared layout, and shared UI components.
 */

import { getAssignments } from "../api/student-api.js";
import { initStudentPage } from "../core/layout.js";
import { STRINGS } from "../config/strings.js";
import { createTabs } from "../components/tabs.js";
import { createEmptyState } from "../components/empty-state.js";
import { createErrorState } from "../components/error-state.js";
import { createSkeleton } from "../components/skeleton.js";
import { createStatusDot } from "../components/status-dot.js";
import { formatDate } from "../components/date-format.js";

const root = document.getElementById("page-content");
let assignmentRows = [];
let selectedFilter = "all";

/** Mounts the shell and loads the current student's assignment list. */
async function start() {
  initStudentPage("assignments");
  if (!root || !document.querySelector(".app-shell")) return;
  root.append(createSkeleton({ label: STRINGS.shared.loading }));
  await loadAssignments();
}

/** Fetches assignments and exposes an explicit retry state on failure. */
async function loadAssignments() {
  try {
    assignmentRows = await getAssignments();
    renderAssignments();
  } catch (error) {
    root.replaceChildren(createErrorState(error.message || STRINGS.assignments.loadAssignmentsError, loadAssignments));
  }
}

/** Renders filters and cards from the current API response. */
function renderAssignments() {
  root.replaceChildren();
  const page = document.createElement("section");
  page.className = "page-stack";
  const heading = document.createElement("div");
  heading.className = "page-heading-row";
  const title = document.createElement("h2");
  title.textContent = STRINGS.assignments.pageTitle;
  heading.append(title);
  const tabs = createTabs([
    { value: "all", label: STRINGS.assignments.all },
    { value: "pending", label: STRINGS.assignments.toDo },
    { value: "submitted", label: STRINGS.assignments.submitted },
    { value: "graded", label: STRINGS.assignments.graded },
  ], selectedFilter, (value) => {
    selectedFilter = value;
    renderAssignments();
  }, STRINGS.assignments.status);
  const list = document.createElement("div");
  list.className = "card-list assignment-card-list";
  const visible = assignmentRows.filter((item) => selectedFilter === "all" || item.status === selectedFilter);
  if (!visible.length) list.append(createEmptyState(STRINGS.assignments.noAssignments));
  visible.forEach((item, index) => list.append(createAssignmentCard(item, index)));
  page.append(heading, tabs, list);
  root.append(page);
}

/** Creates one student-safe assignment card with its deadline and grade. */
function createAssignmentCard(item, index) {
  const card = document.createElement("article");
  card.className = "card card--interactive assignment-card stagger";
  card.dataset.course = item.course_id;
  const header = document.createElement("div");
  header.className = "assignment-card__header";
  const title = document.createElement("h3");
  title.className = "assignment-card__title";
  title.textContent = item.title;
  const statusLabel = STRINGS.assignments.statusLabels[item.status] || item.status;
  header.append(title, createStatusDot(statusLabel, item.status === "graded" ? "success" : item.status === "missed" ? "danger" : item.status === "submitted" ? "info" : "warning"));
  const meta = document.createElement("div");
  meta.className = "assignment-card__meta";
  const course = document.createElement("span");
  course.className = `course-mark course-color-${(index % 6) + 1}`;
  course.textContent = item.course_code;
  const deadline = document.createElement("span");
  const formatted = formatDate(item.due_date);
  deadline.textContent = `${STRINGS.assignments.due}: ${formatted.absolute} (${formatted.relative})`;
  meta.append(course, deadline);
  const actions = document.createElement("div");
  actions.className = "assignment-card__actions";
  if (item.final_grade !== null) {
    const grade = document.createElement("strong");
    grade.className = "tabular-nums";
    grade.textContent = `${STRINGS.assignments.grade}: ${item.final_grade} / ${item.max_grade}`;
    actions.append(grade);
  }
  const link = document.createElement("a");
  link.className = "btn btn-secondary";
  link.href = `assignment.html?id=${encodeURIComponent(item.id)}`;
  link.textContent = STRINGS.assignments.viewAssignment;
  actions.append(link);
  card.append(header, meta, actions);
  return card;
}

start();
