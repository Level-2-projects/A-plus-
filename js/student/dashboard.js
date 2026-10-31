/**
 * js/student/dashboard.js - Student dashboard aggregates and due-work previews.
 * All dashboard data comes from the existing student APIs.
 */

import { getCurrentUser } from "../api.js";
import { getAttendance, getAssignments, getDashboardSummary, getInbox, getPoints, getQuizzes, getTodos } from "../api/student-api.js";
import { initStudentPage } from "../core/layout.js";
import { STRINGS } from "../config/strings.js";
import { createEmptyState } from "../components/empty-state.js";
import { createErrorState } from "../components/error-state.js";
import { createLeaderboard } from "../components/leaderboard.js";
import { createMetricCard } from "../components/metric-card.js";
import { createProgressRing } from "../components/progress-ring.js";
import { createSkeleton } from "../components/skeleton.js";
import { createStatusDot } from "../components/status-dot.js";
import { formatDate } from "../components/date-format.js";
import { initCountUp } from "../core/count-up.js";

const root = document.getElementById("page-content");

/** Mounts the student dashboard and loads all of its existing API data. */
async function start() {
  initStudentPage("dashboard");
  if (!root || !document.querySelector(".app-shell")) return;
  root.append(createSkeleton({ label: STRINGS.shared.loading }));
  await loadDashboard();
}

/** Loads dashboard metrics and each preview source concurrently. */
async function loadDashboard() {
  try {
    const [summary, assignments, quizzes, attendance, points, inbox, todos] = await Promise.all([
      getDashboardSummary(),
      getAssignments(),
      getQuizzes(),
      getAttendance(),
      getPoints(),
      getInbox(),
      getTodos(),
    ]);
    renderDashboard({ summary, assignments, quizzes, attendance, points, inbox, todos });
  } catch (error) {
    root.replaceChildren(createErrorState(error.message || STRINGS.shared.loadError, loadDashboard));
  }
}

/** Renders the welcome hero, metrics, and the student's learning previews. */
function renderDashboard(data) {
  root.replaceChildren();
  const page = document.createElement("section");
  page.className = "page-stack";
  const user = getCurrentUser();
  const firstName = user?.full_name?.trim().split(/\s+/)[0] || STRINGS.roles.student;
  const hero = document.createElement("section");
  hero.className = "card card--hero page-stack";
  const welcome = document.createElement("h2");
  welcome.textContent = STRINGS.dashboard.welcomeStudent(firstName);
  const intro = document.createElement("p");
  intro.textContent = STRINGS.dashboard.studentLead;
  const summaryLine = document.createElement("p");
  summaryLine.className = "hero-summary";
  summaryLine.textContent = `${data.summary.pending_assignments} ${STRINGS.dashboard.assignments} · ${data.summary.unread_messages} ${STRINGS.dashboard.unreadMessages}`;
  hero.append(welcome, intro, summaryLine);

  const metrics = document.createElement("div");
  metrics.className = "metric-grid";
  metrics.append(
    createMetricCard(STRINGS.dashboard.attendance, data.summary.attendance_rate, "%"),
    createMetricCard(STRINGS.dashboard.points, data.summary.points),
    createMetricCard(STRINGS.dashboard.rank, data.summary.rank),
    createMetricCard(STRINGS.dashboard.unreadMessages, data.summary.unread_messages),
  );
  const dueItems = createDueItems(data.assignments, data.quizzes);
  const dueCard = createSection(STRINGS.dashboard.dueSoon);
  dueCard.append(createDueList(dueItems));

  const attendanceCard = createSection(STRINGS.dashboard.attendanceByCourse);
  const rings = document.createElement("div");
  rings.className = "course-ring-list";
  if (!data.attendance.courses.length) rings.append(createEmptyState(STRINGS.courses.noCourses));
  data.attendance.courses.forEach((course, index) => {
    const item = document.createElement("article");
    item.className = "attendance-course";
    item.append(createProgressRing({ value: course.percentage, label: `${course.course_code} ${course.percentage}%` }));
    const detail = document.createElement("div");
    const code = document.createElement("h4");
    code.className = `course-mark course-color-${(index % 6) + 1}`;
    code.textContent = course.course_code;
    const title = document.createElement("p");
    title.textContent = course.course_title;
    detail.append(code, title);
    item.append(detail);
    rings.append(item);
  });
  attendanceCard.append(rings);

  const leaderboardCard = createSection(STRINGS.dashboard.topStudents);
  leaderboardCard.append(createLeaderboard(data.points.monthly_top_3, STRINGS.shared.noItems));

  const messagesCard = createSection(STRINGS.dashboard.latestMessages);
  const latestMessages = data.inbox.slice(0, 3);
  if (!latestMessages.length) messagesCard.append(createEmptyState(STRINGS.dashboard.noMessages));
  latestMessages.forEach((message) => {
    const item = document.createElement("a");
    item.className = "due-item";
    item.href = `inbox.html?id=${encodeURIComponent(message.id)}`;
    const title = document.createElement("strong");
    title.textContent = message.subject;
    const status = createStatusDot(STRINGS.inboxTypes[message.type] || message.type, message.is_read ? "neutral" : "warning");
    item.append(title, status);
    messagesCard.append(item);
  });

  const todosCard = createSection(STRINGS.dashboard.todoPreview);
  const activeTodos = data.todos.filter((todo) => !todo.completed).slice(0, 5);
  if (!activeTodos.length) todosCard.append(createEmptyState(STRINGS.dashboard.noTodos));
  activeTodos.forEach((todo) => {
    const row = document.createElement("p");
    row.className = "todo-item__title";
    const dot = document.createElement("span");
    dot.className = `priority-dot priority-dot--${todo.priority}`;
    dot.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.textContent = todo.title;
    row.append(dot, label);
    todosCard.append(row);
  });
  const todoLink = document.createElement("a");
  todoLink.href = "todo.html";
  todoLink.textContent = STRINGS.dashboard.open;
  todosCard.append(todoLink);

  const grid = document.createElement("div");
  grid.className = "dashboard-grid";
  grid.append(dueCard, attendanceCard, leaderboardCard, messagesCard, todosCard);
  page.append(hero, metrics, grid);
  root.append(page);
  initCountUp(root);
}

/** Creates a titled dashboard section card. */
function createSection(titleText) {
  const section = document.createElement("section");
  section.className = "card dashboard-section";
  const title = document.createElement("h3");
  title.textContent = titleText;
  section.append(title);
  return section;
}

/** Collects assignments and quizzes with due dates in the coming seven days. */
function createDueItems(assignments, quizzes) {
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + 7);
  const items = [
    ...assignments
      .filter((item) => item.status === "pending")
      .map((item) => ({ title: item.title, date: item.due_date, href: `assignment.html?id=${encodeURIComponent(item.id)}`, course: item.course_code })),
    ...quizzes
      .filter((item) => ["upcoming", "available"].includes(item.status))
      .map((item) => ({ title: item.title, date: item.available_to, href: `quiz.html?id=${encodeURIComponent(item.id)}`, course: item.course_code })),
  ];
  return items
    .filter((item) => new Date(item.date) >= now && new Date(item.date) <= end)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

/** Creates the due-work preview with deadlines and target links. */
function createDueList(items) {
  const list = document.createElement("div");
  if (!items.length) {
    list.append(createEmptyState(STRINGS.dashboard.noDueItems));
    return list;
  }
  items.forEach((item) => {
    const link = document.createElement("a");
    link.className = "due-item";
    link.href = item.href;
    const label = document.createElement("strong");
    label.textContent = `${item.course} · ${item.title}`;
    const time = document.createElement("time");
    time.dateTime = item.date;
    const date = formatDate(item.date);
    time.textContent = `${date.absolute} (${date.relative})`;
    link.append(label, time);
    list.append(link);
  });
  return list;
}

start();
