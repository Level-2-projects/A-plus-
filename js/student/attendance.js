/**
 * js/student/attendance.js – Student attendance summaries and session history.
 * Depends on: student API, shared layout, and shared UI components.
 */

import { getAttendance } from "../api/student-api.js";
import { initStudentPage } from "../core/layout.js";
import { STRINGS } from "../config/strings.js";
import { createProgressRing } from "../components/progress-ring.js";
import { createDataTable } from "../components/data-table.js";
import { createEmptyState } from "../components/empty-state.js";
import { createErrorState } from "../components/error-state.js";
import { createSkeleton } from "../components/skeleton.js";
import { createStatusDot } from "../components/status-dot.js";

const root = document.getElementById("page-content");

/** Mounts the student attendance screen and fetches aggregate and history data. */
async function start() {
  initStudentPage("attendance");
  if (!root || !document.querySelector(".app-shell")) return;
  root.append(createSkeleton({ label: STRINGS.shared.loading }));
  await loadAttendance();
}

/** Loads attendance data and keeps request failures retryable. */
async function loadAttendance() {
  try {
    renderAttendance(await getAttendance());
  } catch (error) {
    root.replaceChildren(createErrorState(error.message || STRINGS.attendance.loadError, loadAttendance));
  }
}

/** Renders overall/course attendance rings and the student's session history. */
function renderAttendance(data) {
  root.replaceChildren();
  const page = document.createElement("section");
  page.className = "page-stack";
  const heading = document.createElement("h2");
  heading.textContent = STRINGS.attendance.title;
  const summary = document.createElement("section");
  summary.className = "card attendance-summary";
  const summaryRing = createProgressRing({
    value: data.overall_percentage,
    label: `${STRINGS.attendance.overall}: ${data.overall_percentage}%`,
  });
  const summaryText = document.createElement("div");
  const overall = document.createElement("h3");
  overall.textContent = STRINGS.attendance.overall;
  const counts = document.createElement("p");
  counts.className = "tabular-nums";
  counts.textContent = `${data.attended_lectures} ${STRINGS.attendance.attended} · ${data.absence_count} ${STRINGS.attendance.absences} · ${data.total_lectures} ${STRINGS.attendance.sessions}`;
  const threshold = document.createElement("p");
  threshold.textContent = `${STRINGS.attendance.threshold}: ${data.warning_threshold}`;
  summaryText.append(overall, counts, threshold);
  summary.append(summaryRing, summaryText);
  const courseGrid = document.createElement("div");
  courseGrid.className = "page-grid";
  if (!data.courses.length) courseGrid.append(createEmptyState(STRINGS.shared.noItems));
  data.courses.forEach((course, index) => courseGrid.append(createCourseSummary(course, index, data.warning_threshold)));
  const historyTitle = document.createElement("h3");
  historyTitle.textContent = STRINGS.attendance.history;
  const table = createDataTable({
    label: STRINGS.attendance.history,
    emptyMessage: STRINGS.attendance.noHistory,
    rows: data.history,
    columns: [
      { key: "course_code", label: STRINGS.attendance.course },
      { key: "lecture_title", label: STRINGS.attendance.lecture },
      { key: "date", label: STRINGS.attendance.date },
      { key: "status", label: STRINGS.attendance.recordStatus, render: (row) => createStatusDot(attendanceStatus(row.status), statusVariant(row.status)) },
    ],
  });
  page.append(heading, summary, courseGrid, historyTitle, table);
  root.append(page);
}

/** Creates one course card with attendance ring and threshold context. */
function createCourseSummary(course, index, warningThreshold) {
  const card = document.createElement("article");
  card.className = "card attendance-course";
  const ring = createProgressRing({
    value: course.percentage,
    label: `${course.course_code} ${course.percentage}%`,
  });
  const content = document.createElement("div");
  const title = document.createElement("h3");
  title.className = `course-mark course-color-${(index % 6) + 1}`;
  title.textContent = course.course_code;
  const description = document.createElement("p");
  description.textContent = course.course_title;
  const counts = document.createElement("p");
  counts.className = "tabular-nums";
  counts.textContent = `${course.attended} ${STRINGS.attendance.attended} · ${course.absences} / ${warningThreshold} ${STRINGS.attendance.absences}`;
  const status = createStatusDot(
    STRINGS.attendance.statusLabels[course.penalty_status] || course.penalty_status,
    course.penalty_status === "normal" ? "success" : course.penalty_status === "penalty" ? "danger" : "warning"
  );
  content.append(title, description, counts, status);
  card.append(ring, content);
  return card;
}

/** Converts attendance record states into localized visible labels. */
function attendanceStatus(status) {
  if (status === "present") return STRINGS.attendance.present;
  if (status === "absent") return STRINGS.attendance.absent;
  return STRINGS.attendance.excused;
}

/** Maps attendance record states to solid status dots. */
function statusVariant(status) {
  return status === "present" ? "success" : status === "absent" ? "danger" : "neutral";
}

start();
