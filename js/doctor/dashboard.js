/**
 * js/doctor/dashboard.js - Doctor dashboard metrics, queues, and quick actions.
 * Uses doctor-scoped API responses; ratings remain anonymous.
 */

import { getCurrentUser } from "../api.js";
import { getDoctorAssignments, getDoctorDashboardSummary, getDoctorQuizzes, getDoctorRatings, getDoctorStudents } from "../api/doctor-api.js";
import { initDoctorPage } from "../core/layout.js";
import { STRINGS } from "../config/strings.js";
import { createEmptyState } from "../components/empty-state.js";
import { createErrorState } from "../components/error-state.js";
import { createMetricCard } from "../components/metric-card.js";
import { createSkeleton } from "../components/skeleton.js";
import { createStatusDot } from "../components/status-dot.js";
import { formatDate } from "../components/date-format.js";
import { initCountUp } from "../core/count-up.js";

const root = document.getElementById("page-content");

/** Mounts the doctor's dashboard and loads all required domain summaries. */
async function start() {
  initDoctorPage("dashboard");
  if (!root || !document.querySelector(".app-shell")) return;
  root.append(createSkeleton({ label: STRINGS.shared.loading }));
  await loadDashboard();
}

/** Loads dashboard metrics, grading queue, risk roster, quizzes, and ratings. */
async function loadDashboard() {
  try {
    const [summary, assignments, quizzes, students, ratings] = await Promise.all([
      getDoctorDashboardSummary(),
      getDoctorAssignments(),
      getDoctorQuizzes(),
      getDoctorStudents(),
      getDoctorRatings(),
    ]);
    renderDashboard({ summary, assignments, quizzes, students, ratings });
  } catch (error) {
    root.replaceChildren(createErrorState(error.message || STRINGS.shared.loadError, loadDashboard));
  }
}

/** Renders the welcome hero, four metrics, work queues, ratings, and shortcuts. */
function renderDashboard(data) {
  root.replaceChildren();
  const page = document.createElement("section");
  page.className = "page-stack";
  const fullName = getCurrentUser()?.full_name || STRINGS.roles.doctor;
  const firstName = fullName.trim().split(/\s+/)[0];
  const hero = document.createElement("section");
  hero.className = "card card--hero page-stack";
  const welcome = document.createElement("h2");
  welcome.textContent = STRINGS.dashboard.welcomeDoctor(firstName);
  const lead = document.createElement("p");
  lead.textContent = STRINGS.dashboard.doctorLead;
  const active = document.createElement("p");
  active.textContent = `${data.summary.active_courses_count} ${STRINGS.courses.title} · ${data.summary.total_enrolled_students} ${STRINGS.courses.enrolled}`;
  hero.append(welcome, lead, active);

  const deadlines = collectDeadlines(data.assignments, data.quizzes);
  const metrics = document.createElement("div");
  metrics.className = "metric-grid";
  metrics.append(
    createMetricCard(STRINGS.dashboard.waitingGrading, data.summary.pending_submissions_to_grade),
    createMetricCard(STRINGS.dashboard.deadlinesWeek, deadlines.length),
    createMetricCard(STRINGS.dashboard.atRisk, data.summary.students_at_absence_risk),
    createMetricCard(STRINGS.dashboard.averageRating, data.summary.average_student_rating ?? 0, " / 5"),
  );
  const grid = document.createElement("div");
  grid.className = "dashboard-grid";
  grid.append(
    createGradingSection(data.assignments),
    createAtRiskSection(data.students),
    createRatingSection(data.ratings),
    createQuickActions(),
  );
  page.append(hero, metrics, grid);
  root.append(page);
  initCountUp(root);
}

/** Collects assignments and quiz windows ending within the next seven days. */
function collectDeadlines(assignments, quizzes) {
  const now = new Date();
  const week = new Date(now);
  week.setDate(week.getDate() + 7);
  const deadlines = [
    ...assignments.map((item) => ({ title: item.title, date: item.due_date, href: `assignment.html?id=${encodeURIComponent(item.id)}`, course: item.course_code })),
    ...quizzes.map((item) => ({ title: item.title, date: item.available_to, href: `quiz.html?id=${encodeURIComponent(item.id)}`, course: item.course_code })),
  ];
  return deadlines
    .filter((entry) => new Date(entry.date) >= now && new Date(entry.date) <= week)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

/** Creates the needs-grading section with direct assignment links. */
function createGradingSection(assignments) {
  const section = createSection(STRINGS.dashboard.needsGrading);
  const pending = assignments
    .filter((assignment) => assignment.pending_submissions > 0)
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
  if (!pending.length) section.append(createEmptyState(STRINGS.dashboard.noSubmissions));
  pending.slice(0, 5).forEach((assignment) => {
    const link = document.createElement("a");
    link.className = "due-item";
    link.href = `assignment.html?id=${encodeURIComponent(assignment.id)}`;
    const title = document.createElement("strong");
    title.textContent = `${assignment.course_code} · ${assignment.title}`;
    const count = createStatusDot(`${assignment.pending_submissions} ${STRINGS.assignments.waiting}`, "warning");
    link.append(title, count);
    section.append(link);
  });
  return section;
}

/** Creates an at-risk list using course-scoped attendance data. */
function createAtRiskSection(students) {
  const section = createSection(STRINGS.dashboard.atRisk);
  const atRisk = students.filter((student) => student.at_penalty_risk);
  if (!atRisk.length) section.append(createEmptyState(STRINGS.dashboard.noRiskStudents));
  atRisk.slice(0, 6).forEach((student) => {
    const row = document.createElement("div");
    row.className = "due-item";
    const name = document.createElement("strong");
    name.textContent = `${student.name} · ${student.course_code}`;
    const status = createStatusDot(`${student.absences_count} ${STRINGS.students.absences}`, "danger");
    row.append(name, status);
    section.append(row);
  });
  return section;
}

/** Creates the latest-rating summary without rendering reviewer identities. */
function createRatingSection(ratings) {
  const section = createSection(STRINGS.dashboard.latestRatings);
  const latest = ratings.anonymous_comments.slice(0, 3);
  if (!latest.length) section.append(createEmptyState(STRINGS.dashboard.noRatings));
  latest.forEach((rating) => {
    const row = document.createElement("article");
    row.className = "rating-comment";
    const title = document.createElement("strong");
    title.textContent = `${rating.course_code} · ${rating.target_title}`;
    const score = document.createElement("span");
    score.className = "tabular-nums";
    score.textContent = `${rating.score} / 5`;
    const comment = document.createElement("p");
    comment.textContent = rating.comment;
    const date = document.createElement("time");
    date.dateTime = rating.date;
    date.textContent = formatDate(rating.date).absolute;
    row.append(title, score, comment, date);
    section.append(row);
  });
  return section;
}

/** Creates the three primary doctor workflow shortcuts. */
function createQuickActions() {
  const section = createSection(STRINGS.dashboard.quickActions);
  [
    [STRINGS.dashboard.newAssignment, "assignments.html"],
    [STRINGS.dashboard.takeAttendance, "attendance.html"],
    [STRINGS.dashboard.sendMessage, "messages.html"],
  ].forEach(([label, href]) => {
    const link = document.createElement("a");
    link.className = "btn btn-secondary";
    link.href = href;
    link.textContent = label;
    section.append(link);
  });
  return section;
}

/** Creates a titled dashboard section card. */
function createSection(titleText) {
  const section = document.createElement("section");
  section.className = "card dashboard-section";
  const heading = document.createElement("h2");
  heading.textContent = titleText;
  section.append(heading);
  return section;
}

start();
