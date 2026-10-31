/**
 * js/student/points.js - Monthly points, department leaderboard, and ledger.
 * Depends on student points API and configured award constants.
 */

import { getPoints } from "../api/student-api.js";
import { POINTS_ATTENDANCE_PRESENT, POINTS_QUIZ_COMPLETION, POINTS_SUBMISSION_ON_TIME } from "../config.js";
import { initStudentPage } from "../core/layout.js";
import { STRINGS } from "../config/strings.js";
import { createDataTable } from "../components/data-table.js";
import { createEmptyState } from "../components/empty-state.js";
import { createErrorState } from "../components/error-state.js";
import { createLeaderboard } from "../components/leaderboard.js";
import { createMetricCard } from "../components/metric-card.js";
import { createSkeleton } from "../components/skeleton.js";
import { formatDate } from "../components/date-format.js";
import { initCountUp } from "../core/count-up.js";

const root = document.getElementById("page-content");

/** Mounts the points screen and retrieves the current month's view. */
async function start() {
  initStudentPage("points");
  if (!root || !document.querySelector(".app-shell")) return;
  root.append(createSkeleton({ label: STRINGS.shared.loading }));
  await loadPoints();
}

/** Loads points and shows a retry control on errors. */
async function loadPoints() {
  try {
    renderPoints(await getPoints());
  } catch (error) {
    root.replaceChildren(createErrorState(error.message || STRINGS.shared.loadError, loadPoints));
  }
}

/** Renders count-up metrics, medals, point rules, and current-month ledger. */
function renderPoints(data) {
  root.replaceChildren();
  const page = document.createElement("section");
  page.className = "page-stack";
  const title = document.createElement("h2");
  title.textContent = STRINGS.points.title;
  const metrics = document.createElement("div");
  metrics.className = "metric-grid";
  metrics.append(
    createMetricCard(STRINGS.points.month, data.current_points),
    createMetricCard(STRINGS.points.rank, data.department_rank),
  );
  const leaderboardCard = document.createElement("section");
  leaderboardCard.className = "card page-stack";
  const leaderboardTitle = document.createElement("h3");
  leaderboardTitle.textContent = STRINGS.points.leaderboard;
  leaderboardCard.append(leaderboardTitle, createLeaderboard(data.monthly_top_3, STRINGS.shared.noItems));

  const earnCard = document.createElement("section");
  earnCard.className = "card page-stack";
  const earnTitle = document.createElement("h3");
  earnTitle.textContent = STRINGS.points.howToEarn;
  const earnList = document.createElement("ul");
  earnList.className = "points-rule-list";
  [
    [STRINGS.points.onTimeSubmission, POINTS_SUBMISSION_ON_TIME],
    [STRINGS.points.quizCompletion, POINTS_QUIZ_COMPLETION],
    [STRINGS.points.attendance, POINTS_ATTENDANCE_PRESENT],
  ].forEach(([label, value]) => {
    const item = document.createElement("li");
    item.textContent = `${label}: ${value}`;
    earnList.append(item);
  });
  const reset = document.createElement("p");
  reset.textContent = `${STRINGS.points.reset}: ${formatDate(data.points_reset_date).absolute}`;
  earnCard.append(earnTitle, earnList, reset);

  const ledgerTitle = document.createElement("h3");
  ledgerTitle.textContent = STRINGS.points.ledger;
  const sourceLabels = {
    submission: STRINGS.points.onTimeSubmission,
    quiz: STRINGS.points.quizCompletion,
    attendance: STRINGS.points.attendance,
    bonus: STRINGS.students.awarded,
  };
  const ledger = createDataTable({
    label: STRINGS.points.ledger,
    emptyMessage: STRINGS.points.noEntries,
    rows: data.ledger,
    columns: [
      { key: "description", label: STRINGS.points.source, render: (row) => row.description || sourceLabels[row.source] || row.source },
      { key: "points", label: STRINGS.points.value },
      { key: "created_at", label: STRINGS.points.date, render: (row) => formatDate(row.created_at).absolute },
    ],
  });
  page.append(title, metrics, leaderboardCard, earnCard, ledgerTitle, ledger);
  root.append(page);
  initCountUp(root);
}

start();
