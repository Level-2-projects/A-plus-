/**
 * js/dean/reports.js – Dean College Reports & Analytics page.
 * Renders four tabs: Attendance, Submissions & Grades, Doctor Ratings, At-Risk Students.
 * Each tab has a data table with aqua bars plus a client-side CSV export button (UTF-8 BOM).
 * Filters: period (this_month / last_30_days / all_time) and department.
 *
 * Data source: getDeanReports(period) → { attendance[], submissions_and_grades[],
 *   doctor_ratings[], at_risk_students[] }
 * getDeanDepartments() → dept list for the filter select.
 *
 * Depends on: js/core/layout.js, js/api/dean-api.js, shared components.
 */

import { getDeanDepartments, getDeanReports } from "../api/dean-api.js";
import { createDataTable } from "../components/data-table.js";
import { createEmptyState } from "../components/empty-state.js";
import { createErrorState } from "../components/error-state.js";
import { createProgressBar } from "../components/progress-bar.js";
import { createSkeleton } from "../components/skeleton.js";
import { createTabs } from "../components/tabs.js";
import { STRINGS } from "../config/strings.js";
import { initDeanPage, setPageTitle } from "../core/layout.js";

initDeanPage("reports");
setPageTitle(STRINGS.pages.deanReports);

const S = STRINGS.deanReports;
const content = document.getElementById("page-content");

// ─── Page state ──────────────────────────────────────────────────────────────

let currentPeriod = "all_time";
let currentDeptId = "";
let activeTab = "attendance";
let reportData = null;
let departments = [];

// ─── Period & tab config ──────────────────────────────────────────────────────

const PERIODS = [
  { value: "this_month",   label: STRINGS.deanOverview.periodThisMonth  },
  { value: "last_30_days", label: STRINGS.deanOverview.periodLast30Days },
  { value: "all_time",     label: STRINGS.deanOverview.periodAllTime    },
];

const TABS = [
  { value: "attendance",  label: S.tabAttendance  },
  { value: "submissions", label: S.tabSubmissions },
  { value: "ratings",     label: S.tabRatings     },
  { value: "at_risk",     label: S.tabAtRisk      },
];

// ─── CSV export ───────────────────────────────────────────────────────────────

/**
 * Escapes a single CSV cell value.
 * Wraps in quotes when the value contains commas, quotes, or newlines.
 * Doubles any internal double-quotes. Safe for Arabic / Unicode text.
 */
function csvEscape(value) {
  const str = value == null ? "" : String(value);
  if (/[,"\r\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

/** Assembles a CSV string with a UTF-8 BOM so spreadsheets open it correctly. */
function buildCsv(headers, rows) {
  const BOM = "\uFEFF";
  const header = headers.map(csvEscape).join(",");
  const body = rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");
  return `${BOM}${header}\r\n${body}`;
}

/** Triggers a browser download for the given CSV text with a dated file name. */
function downloadCsv(csv, baseName) {
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `${baseName}_${dateStr}.csv`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** Builds and downloads the CSV for the currently visible tab and department filter. */
function exportCurrentTab() {
  if (!reportData) return;
  const dept = currentDeptId;

  if (activeTab === "attendance") {
    const rows = filterByDept(reportData.attendance, dept);
    downloadCsv(
      buildCsv(
        [S.department, S.course, S.attendanceRate, S.atRiskCount],
        rows.map((r) => [r.department_name, r.course_code, r.attendance_rate ?? "", r.at_risk_count ?? ""])
      ),
      "attendance_report"
    );
  } else if (activeTab === "submissions") {
    const rows = filterByDept(reportData.submissions_and_grades, dept);
    downloadCsv(
      buildCsv(
        [S.department, S.course, S.submissionRate, S.avgGrade],
        rows.map((r) => [r.department_name, r.course_code, r.submission_rate ?? "", r.average_grade ?? ""])
      ),
      "submissions_grades_report"
    );
  } else if (activeTab === "ratings") {
    const rows = filterByDept(reportData.doctor_ratings, dept);
    downloadCsv(
      buildCsv(
        [S.department, S.course, S.avgRating, S.ratingCount],
        rows.map((r) => [r.department_name, r.course_code, r.average_doctor_rating ?? "", r.doctor_rating_count ?? ""])
      ),
      "doctor_ratings_report"
    );
  } else if (activeTab === "at_risk") {
    const rows = filterByDept(reportData.at_risk_students, dept);
    downloadCsv(
      buildCsv(
        [S.department, S.course, S.absenceCount],
        rows.map((r) => [r.department_name, r.course_code, r.absence_count ?? ""])
      ),
      "at_risk_report"
    );
  }
}

// ─── Shared cell helpers ───────────────────────────────────────────────────────

/** Filters a report array to a single department when deptId is set. */
function filterByDept(rows, deptId) {
  if (!deptId) return rows;
  return rows.filter((r) => r.department_id === deptId);
}

/** Creates a progress bar + percentage label for a report percentage cell. */
function barCell(value) {
  const wrap = document.createElement("span");
  wrap.className = "bar-cell";
  const pct = value == null ? 0 : Math.round(value);
  wrap.append(createProgressBar(pct, `${pct}%`));
  const label = document.createElement("span");
  label.className = "bar-label tabular-nums";
  label.textContent = value == null ? "—" : `${pct}%`;
  wrap.append(label);
  return wrap;
}

/** Creates a plain numeric cell with an optional suffix (e.g. "/5"). */
function numCell(value, suffix = "") {
  const span = document.createElement("span");
  span.className = "tabular-nums";
  if (value == null) {
    span.textContent = "—";
  } else {
    const num = Number(value);
    span.textContent = `${num % 1 ? num.toFixed(1) : num}${suffix}`;
  }
  return span;
}

// ─── Tab content renderers ────────────────────────────────────────────────────

function renderAttendanceTab(data, deptId) {
  const rows = filterByDept(data.attendance, deptId);
  if (!rows.length) return createEmptyState(S.noData);
  return createDataTable({
    columns: [
      { key: "department_name", label: S.department },
      { key: "course_code",     label: S.course },
      { key: "attendance_rate", label: S.attendanceRate, render: (r) => barCell(r.attendance_rate) },
      { key: "at_risk_count",   label: S.atRiskCount,   render: (r) => numCell(r.at_risk_count)   },
    ],
    rows,
    label: S.tabAttendance,
    emptyMessage: S.noData,
  });
}

function renderSubmissionsTab(data, deptId) {
  const rows = filterByDept(data.submissions_and_grades, deptId);
  if (!rows.length) return createEmptyState(S.noData);
  return createDataTable({
    columns: [
      { key: "department_name", label: S.department },
      { key: "course_code",     label: S.course },
      { key: "submission_rate", label: S.submissionRate, render: (r) => barCell(r.submission_rate) },
      { key: "average_grade",   label: S.avgGrade,       render: (r) => numCell(r.average_grade)   },
    ],
    rows,
    label: S.tabSubmissions,
    emptyMessage: S.noData,
  });
}

function renderRatingsTab(data, deptId) {
  const rows = filterByDept(data.doctor_ratings, deptId);
  if (!rows.length) return createEmptyState(S.noData);

  const wrap = document.createElement("div");

  // Summary table (averages & counts — no student identities)
  wrap.append(createDataTable({
    columns: [
      { key: "department_name",       label: S.department  },
      { key: "course_code",           label: S.course      },
      { key: "average_doctor_rating", label: S.avgRating,   render: (r) => numCell(r.average_doctor_rating, "/5") },
      { key: "doctor_rating_count",   label: S.ratingCount, render: (r) => numCell(r.doctor_rating_count)         },
    ],
    rows,
    label: S.tabRatings,
    emptyMessage: S.noData,
  }));

  // Anonymous comments per course
  rows.forEach((row) => {
    const comments = row.anonymous_comments || [];
    if (!comments.length) return;
    const sec = document.createElement("section");
    sec.className = "dashboard-section";
    const h3 = document.createElement("h3");
    h3.className = "section-heading";
    h3.textContent = `${row.course_code} — ${S.comments}`;
    sec.append(h3);
    const list = document.createElement("ul");
    list.className = "comment-list";
    comments.forEach(({ comment }) => {
      const li = document.createElement("li");
      li.className = "comment-item card";
      li.textContent = comment;
      list.append(li);
    });
    sec.append(list);
    wrap.append(sec);
  });

  return wrap;
}

function renderAtRiskTab(data, deptId) {
  const rows = filterByDept(data.at_risk_students, deptId);
  if (!rows.length) return createEmptyState(S.noData);
  return createDataTable({
    columns: [
      { key: "department_name", label: S.department    },
      { key: "course_code",     label: S.course        },
      { key: "absence_count",   label: S.absenceCount, render: (r) => numCell(r.absence_count) },
    ],
    rows,
    label: S.tabAtRisk,
    emptyMessage: S.noData,
  });
}

// ─── Render orchestration ─────────────────────────────────────────────────────

/** Builds the department filter <select> from the loaded departments list. */
function buildDeptFilter() {
  const sel = document.createElement("select");
  sel.className = "input filter-select";
  sel.setAttribute("aria-label", S.departmentLabel);
  const allOpt = document.createElement("option");
  allOpt.value = "";
  allOpt.textContent = S.allDepartments;
  sel.append(allOpt);
  departments.forEach((dept) => {
    const opt = document.createElement("option");
    opt.value = dept.id;
    opt.textContent = dept.name;
    sel.append(opt);
  });
  sel.value = currentDeptId;
  sel.addEventListener("change", () => {
    currentDeptId = sel.value;
    renderTabContent();
  });
  return sel;
}

/** Swaps the data area with the current tab's rendered content. */
function renderTabContent() {
  const area = document.getElementById("report-data-area");
  if (!area || !reportData) return;
  area.innerHTML = "";
  if      (activeTab === "attendance")  area.append(renderAttendanceTab(reportData, currentDeptId));
  else if (activeTab === "submissions") area.append(renderSubmissionsTab(reportData, currentDeptId));
  else if (activeTab === "ratings")     area.append(renderRatingsTab(reportData, currentDeptId));
  else if (activeTab === "at_risk")     area.append(renderAtRiskTab(reportData, currentDeptId));
}

// ─── Load & mount ─────────────────────────────────────────────────────────────

async function loadReports() {
  content.innerHTML = "";
  content.append(createSkeleton({ lines: 4, label: STRINGS.shared.loading }));

  try {
    [reportData, departments] = await Promise.all([
      getDeanReports(currentPeriod),
      getDeanDepartments(),
    ]);
  } catch {
    content.innerHTML = "";
    content.append(createErrorState(S.loadError, loadReports));
    return;
  }

  content.innerHTML = "";

  // Page heading
  const h1 = document.createElement("h1");
  h1.textContent = S.title;
  content.append(h1);

  // Filter bar: period tabs + dept select
  const filterBar = document.createElement("div");
  filterBar.className = "page-heading-row";
  const periodTabs = createTabs(PERIODS, currentPeriod, (period) => {
    currentPeriod = period;
    loadReports();
  }, S.periodLabel);
  filterBar.append(periodTabs, buildDeptFilter());
  content.append(filterBar);

  // Report content tabs
  const tabsEl = createTabs(TABS, activeTab, (tab) => {
    activeTab = tab;
    renderTabContent();
  }, S.title);
  content.append(tabsEl);

  // Export CSV button (above data)
  const exportBtn = document.createElement("button");
  exportBtn.type = "button";
  exportBtn.className = "btn btn-secondary";
  exportBtn.textContent = S.exportCsv;
  exportBtn.addEventListener("click", exportCurrentTab);
  const exportRow = document.createElement("div");
  exportRow.className = "export-row";
  exportRow.append(exportBtn);
  content.append(exportRow);

  // Data area (swapped by renderTabContent)
  const dataArea = document.createElement("div");
  dataArea.id = "report-data-area";
  content.append(dataArea);

  renderTabContent();
}

loadReports();
