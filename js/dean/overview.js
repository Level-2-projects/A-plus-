/**
 * js/dean/overview.js – Dean College Overview page.
 * Renders hero card, count-up metrics, department comparison bars,
 * needs-attention list, and top-3 leaderboard per department.
 *
 * Depends on: js/core/layout.js, js/api/dean-api.js, shared components.
 */

import { getDeanAnalytics, getDeanOverview } from "../api/dean-api.js";
import { createEmptyState } from "../components/empty-state.js";
import { createErrorState } from "../components/error-state.js";
import { createLeaderboard } from "../components/leaderboard.js";
import { createMetricCard } from "../components/metric-card.js";
import { createProgressBar } from "../components/progress-bar.js";
import { createSkeleton } from "../components/skeleton.js";
import { createTabs } from "../components/tabs.js";
import { STRINGS } from "../config/strings.js";
import { initCountUp } from "../core/count-up.js";
import { initDeanPage, setPageTitle } from "../core/layout.js";

const S = STRINGS.deanOverview;

const PERIODS = [
  { value: "this_month",  label: S.periodThisMonth  },
  { value: "last_30_days", label: S.periodLast30Days },
  { value: "all_time",    label: S.periodAllTime     },
];

const REASON_LABELS = {
  high_absence:    "High absences",
  low_submissions: "Low submissions",
  low_ratings:     "Low doctor ratings",
};

initDeanPage("overview");
setPageTitle(STRINGS.pages.deanOverview);

const content = document.getElementById("page-content");

/** Renders a full-width section with a heading. */
function section(title) {
  const wrap = document.createElement("section");
  wrap.className = "dashboard-section";
  const h2 = document.createElement("h2");
  h2.className = "section-heading";
  h2.textContent = title;
  wrap.append(h2);
  return wrap;
}

/** Renders a single department comparison block (attendance, submission, grade bars). */
function renderDeptBar(dept) {
  const card = document.createElement("div");
  card.className = "card dept-comparison-card";

  const name = document.createElement("h3");
  name.textContent = dept.department_name;
  card.append(name);

  const rows = [
    { label: "Attendance",  value: dept.attendance_rate  },
    { label: "Submissions", value: dept.submission_rate  },
    { label: "Avg Grade",   value: dept.average_grade    },
  ];

  rows.forEach(({ label, value }) => {
    const row = document.createElement("div");
    row.className = "progress-row";
    const cap = document.createElement("span");
    cap.className = "progress-label";
    const pct = value == null ? 0 : Math.round(value);
    cap.textContent = `${label}: ${pct}%`;
    row.append(cap, createProgressBar(pct, `${dept.department_name} ${label}`));
    card.append(row);
  });

  return card;
}

/** Renders the needs-attention list. */
function renderNeedsAttention(items) {
  const sec = section(S.needsAttention);
  if (!items.length) {
    sec.append(createEmptyState(S.noNeedsAttention));
    return sec;
  }
  const list = document.createElement("ul");
  list.className = "attention-list";
  items.forEach((item) => {
    const li = document.createElement("li");
    li.className = "attention-item card";
    const header = document.createElement("strong");
    header.textContent = `${item.department_name} — ${item.course_code}`;
    const reasons = document.createElement("span");
    reasons.textContent = item.reasons.map((r) => REASON_LABELS[r] || r).join(", ");
    li.append(header, " · ", reasons);
    list.append(li);
  });
  sec.append(list);
  return sec;
}

/** Renders the top-3 leaderboard cards per department. */
function renderTopStudents(departments) {
  const sec = section(S.topStudentsByDept);
  const grid = document.createElement("div");
  grid.className = "dashboard-grid";

  departments.forEach((dept) => {
    const card = document.createElement("div");
    card.className = "card";
    const title = document.createElement("h3");
    title.textContent = dept.department_name;
    card.append(title);

    // top_students is an array of months; use first (current month) ranking
    const currentMonth = dept.top_students && dept.top_students[0];
    const ranking = currentMonth ? (currentMonth.ranking || []) : [];

    const entries = ranking.map((e) => ({ rank: e.rank, name: `#${e.rank}`, points: e.points }));
    card.append(createLeaderboard(entries, S.noTopStudents));
    grid.append(card);
  });

  sec.append(grid);
  return sec;
}

let currentPeriod = "all_time";
let analyticsSection = null;

/** Loads and renders the period-dependent analytics portion. */
async function loadAnalytics(period) {
  if (!analyticsSection) return;
  analyticsSection.innerHTML = "";
  analyticsSection.append(createSkeleton({ lines: 4, label: STRINGS.shared.loading }));

  try {
    const analytics = await getDeanAnalytics(period);

    analyticsSection.innerHTML = "";

    // Department comparison bars
    const compSec = section(S.departmentComparison);
    const barsGrid = document.createElement("div");
    barsGrid.className = "dashboard-grid";
    (analytics.departments || []).forEach((dept) => barsGrid.append(renderDeptBar(dept)));
    if (!analytics.departments || !analytics.departments.length) {
      barsGrid.append(createEmptyState(STRINGS.shared.noItems));
    }
    compSec.append(barsGrid);
    analyticsSection.append(compSec);

    // Needs attention
    analyticsSection.append(renderNeedsAttention(analytics.needs_attention || []));

    // Top students per dept
    analyticsSection.append(renderTopStudents(analytics.departments || []));
  } catch {
    analyticsSection.innerHTML = "";
    analyticsSection.append(
      createErrorState(S.loadError, () => loadAnalytics(currentPeriod))
    );
  }
}

/** Loads overview summary (hero + metrics) + analytics. */
async function loadPage() {
  content.innerHTML = "";
  content.append(createSkeleton({ lines: 3, label: STRINGS.shared.loading }));

  try {
    const overview = await getDeanOverview();

    content.innerHTML = "";

    // Hero card
    const user = JSON.parse(sessionStorage.getItem("aplus_session") || "{}");
    const lastName = (user.full_name || "Dean").split(" ").pop();
    const hero = document.createElement("div");
    hero.className = "card card--hero";
    const heroTitle = document.createElement("h1");
    heroTitle.textContent = S.welcome(lastName);
    const heroSub = document.createElement("p");
    heroSub.textContent = S.summary(
      overview.dept_count,
      overview.total_students,
      overview.total_doctors,
      overview.total_courses
    );
    hero.append(heroTitle, heroSub);
    content.append(hero);

    // Metric grid — static values from overview; submission_rate & doctor_rating need analytics
    const metricsGrid = document.createElement("div");
    metricsGrid.className = "metric-grid";
    metricsGrid.append(
      createMetricCard(S.students,    overview.total_students,         ""),
      createMetricCard(S.doctors,     overview.total_doctors,          ""),
      createMetricCard(S.courses,     overview.total_courses,          ""),
      createMetricCard(S.departments, overview.dept_count,             ""),
      createMetricCard(S.attendanceRate, overview.college_avg_attendance, "%"),
    );
    content.append(metricsGrid);
    initCountUp(content);

    // Period filter tabs
    const tabsRow = document.createElement("div");
    tabsRow.className = "page-heading-row";
    tabsRow.append(
      createTabs(PERIODS, currentPeriod, (period) => {
        currentPeriod = period;
        loadAnalytics(period);
      }, "Analysis period")
    );
    content.append(tabsRow);

    // Analytics area (swapped on period change)
    analyticsSection = document.createElement("div");
    content.append(analyticsSection);

    await loadAnalytics(currentPeriod);
  } catch {
    content.innerHTML = "";
    content.append(createErrorState(S.loadError, loadPage));
  }
}

loadPage();
