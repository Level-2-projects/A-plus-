/**
 * js/admin/dashboard.js – Department dashboard backed by the existing admin API.
 * Renders only metrics, rankings, and risk data exposed by the dashboard route.
 */

import { getAdminDashboard, getAdminSettings } from "../api/admin-api.js";
import { getCurrentUser } from "../api.js";
import { createEmptyState } from "../components/empty-state.js";
import { createErrorState } from "../components/error-state.js";
import { createLeaderboard } from "../components/leaderboard.js";
import { createMetricCard } from "../components/metric-card.js";
import { createSkeleton } from "../components/skeleton.js";
import { initCountUp } from "../core/count-up.js";
import { initAdminPage, setPageTitle } from "../core/layout.js";
import { STRINGS } from "../config/strings.js";

const root = document.getElementById("page-content");

/** Mounts the protected dashboard and fetches its supported data. */
async function start() {
  initAdminPage("dashboard");
  if (!root || !document.querySelector(".app-shell")) return;
  setPageTitle(STRINGS.pages.adminDashboard);
  root.append(createSkeleton({ lines: 8, label: STRINGS.shared.loading }));
  await loadDashboard();
}

/** Fetches dashboard metrics and settings required to label absence risk. */
async function loadDashboard() {
  try {
    const [dashboard, settings] = await Promise.all([getAdminDashboard(), getAdminSettings()]);
    renderDashboard(dashboard, settings);
  } catch (error) {
    root.replaceChildren(createErrorState(error.message || STRINGS.adminDashboard.loadError, loadDashboard));
  }
}

/** Renders cards and lists from the existing dashboard response. */
function renderDashboard(dashboard, settings) {
  root.replaceChildren();
  const page = document.createElement("section");
  page.className = "page-stack";
  const firstName = String(getCurrentUser()?.full_name || "Admin").split(" ")[0];
  page.append(createHero(dashboard, firstName), createMetricGrid(dashboard), createSummaryGrid(dashboard, settings));
  root.append(page);
  initCountUp(page);
}

/** Creates the solid department welcome card. */
function createHero(dashboard, firstName) {
  const hero = document.createElement("section");
  hero.className = "card card--hero";
  const heading = document.createElement("h2");
  heading.textContent = STRINGS.adminDashboard.welcome(firstName);
  const detail = document.createElement("p");
  detail.textContent = STRINGS.adminDashboard.summary(dashboard.student_count, dashboard.doctor_count, dashboard.course_count);
  hero.append(heading, detail);
  return hero;
}

/** Builds the count-up metrics available to the department administrator. */
function createMetricGrid(dashboard) {
  const grid = document.createElement("section");
  grid.className = "metric-grid";
  [
    [STRINGS.adminDashboard.students, dashboard.student_count, ""],
    [STRINGS.adminDashboard.doctors, dashboard.doctor_count, ""],
    [STRINGS.adminDashboard.courses, dashboard.course_count, ""],
    [STRINGS.adminDashboard.attendance, dashboard.avg_attendance_rate, "%"],
    [STRINGS.adminDashboard.atRisk, dashboard.at_risk_students.length, ""],
  ].forEach(([label, value, suffix]) => grid.append(createMetricCard(label, value, suffix)));
  return grid;
}

/** Builds the supported top-three and at-risk summary panels. */
function createSummaryGrid(dashboard, settings) {
  const grid = document.createElement("div");
  grid.className = "dashboard-grid";
  const top = document.createElement("section");
  top.className = "card dashboard-section";
  const topHeading = document.createElement("h2");
  topHeading.textContent = STRINGS.adminDashboard.topStudents;
  top.append(topHeading, createLeaderboard(dashboard.top_students.map((student) => ({ name: student.full_name, points: student.points, rank: student.rank })), STRINGS.adminDashboard.noTopStudents));
  const risk = document.createElement("section");
  risk.className = "card dashboard-section";
  const riskHeading = document.createElement("h2");
  riskHeading.textContent = STRINGS.adminDashboard.riskList;
  risk.append(riskHeading, createRiskList(dashboard.at_risk_students, settings.absence_warning_threshold));
  grid.append(top, risk);
  return grid;
}

/** Creates a list that explains each exposed risk record against the configured threshold. */
function createRiskList(items, threshold) {
  if (!items.length) return createEmptyState(STRINGS.adminDashboard.noRiskStudents);
  const list = document.createElement("ul");
  list.className = "leaderboard-list";
  items.forEach((item) => {
    const row = document.createElement("li");
    row.className = "due-item";
    const name = document.createElement("strong");
    name.textContent = `${item.full_name} · ${item.course_code}`;
    const count = document.createElement("span");
    count.className = "status status-warning tabular-nums";
    count.textContent = STRINGS.adminDashboard.absences(item.absence_count, threshold);
    row.append(name, count);
    list.append(row);
  });
  return list;
}

start();
