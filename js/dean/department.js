/**
 * js/dean/department.js – Dean Department Detail page (read-only).
 * Reuses shared component patterns from the admin dashboard.
 * Reads ?id= from the URL; keeps "departments" nav item active.
 *
 * Depends on: js/core/layout.js, js/api/dean-api.js, shared components.
 */

import { getDeanDepartmentDetail } from "../api/dean-api.js";
import { createEmptyState } from "../components/empty-state.js";
import { createErrorState } from "../components/error-state.js";
import { createLeaderboard } from "../components/leaderboard.js";
import { createMetricCard } from "../components/metric-card.js";
import { createSkeleton } from "../components/skeleton.js";
import { STRINGS } from "../config/strings.js";
import { initCountUp } from "../core/count-up.js";
import { initDeanPage, setPageTitle } from "../core/layout.js";

// Keep "departments" active so nav breadcrumb remains correct
initDeanPage("departments");

const content = document.getElementById("page-content");

/** Builds a section with a heading element. */
function section(title) {
  const wrap = document.createElement("section");
  wrap.className = "dashboard-section";
  const h2 = document.createElement("h2");
  h2.className = "section-heading";
  h2.textContent = title;
  wrap.append(h2);
  return wrap;
}

/** Loads the requested department detail and renders a recoverable error when absent. */
async function loadPage() {
  content.innerHTML = "";
  content.append(createSkeleton({ lines: 4, label: STRINGS.shared.loading }));

  const id = new URLSearchParams(location.search).get("id");
  if (!id) {
    content.innerHTML = "";
    content.append(createErrorState("No department ID provided.", () => history.back()));
    return;
  }

  try {
    const data = await getDeanDepartmentDetail(id);

    setPageTitle(data.dept_name);

    content.innerHTML = "";

    // ── Back link ──
    const backLink = document.createElement("a");
    backLink.href = "departments.html";
    backLink.className = "back-link";
    backLink.textContent = "← Back to Departments";
    content.append(backLink);

    // ── Page heading ──
    const h1 = document.createElement("h1");
    h1.textContent = data.dept_name;
    content.append(h1);

    // ── Metric grid ──
    const metricsGrid = document.createElement("div");
    metricsGrid.className = "metric-grid";
    metricsGrid.append(
      createMetricCard("Students",    data.student_count,       ""),
      createMetricCard("Doctors",     data.doctor_count,        ""),
      createMetricCard("Courses",     data.course_count,        ""),
      createMetricCard("Avg Attendance", data.avg_attendance_rate, "%"),
    );
    content.append(metricsGrid);
    initCountUp(content);

    // ── Top students (anonymous: rank + points) ──
    const topSec = section("Top Students (This Month)");
    const entries = (data.top_students || []).map((e) => ({
      rank:   e.rank,
      name:   `Student #${e.rank}`,
      points: e.points,
    }));
    topSec.append(createLeaderboard(entries, STRINGS.deanOverview.noTopStudents));
    content.append(topSec);

    // ── At-risk students ──
    const atRiskSec = section("At-Risk Students");
    if (!data.at_risk_students || !data.at_risk_students.length) {
      atRiskSec.append(createEmptyState("No at-risk students in this department."));
    } else {
      const list = document.createElement("ul");
      list.className = "attention-list";
      data.at_risk_students.forEach(({ course_code, absence_count }) => {
        const li = document.createElement("li");
        li.className = "attention-item card";
        li.textContent = `${course_code} — ${absence_count} absence${absence_count !== 1 ? "s" : ""}`;
        list.append(li);
      });
      atRiskSec.append(list);
    }
    content.append(atRiskSec);

    // ── Doctors list ──
    const docSec = section("Faculty Doctors");
    if (!data.doctors || !data.doctors.length) {
      docSec.append(createEmptyState("No doctors in this department."));
    } else {
      const list = document.createElement("ul");
      list.className = "simple-list";
      data.doctors.forEach((doc) => {
        const li = document.createElement("li");
        li.className = "card";
        const name = document.createElement("strong");
        name.textContent = doc.full_name;
        const courses = document.createElement("span");
        courses.textContent = doc.courses.length
          ? ` — ${doc.courses.join(", ")}`
          : " — no courses assigned";
        li.append(name, courses);
        list.append(li);
      });
      docSec.append(list);
    }
    content.append(docSec);

    // ── Courses list ──
    const coursesSec = section("Courses");
    if (!data.courses || !data.courses.length) {
      coursesSec.append(createEmptyState("No courses in this department."));
    } else {
      const list = document.createElement("ul");
      list.className = "simple-list";
      data.courses.forEach((course) => {
        const li = document.createElement("li");
        li.className = "card";
        const code = document.createElement("strong");
        code.textContent = `${course.code} — ${course.title}`;
        const meta = document.createElement("span");
        meta.textContent = ` · ${course.doctor} · ${course.enrolled_count} student${course.enrolled_count !== 1 ? "s" : ""}`;
        li.append(code, meta);
        list.append(li);
      });
      coursesSec.append(list);
    }
    content.append(coursesSec);
  } catch {
    content.innerHTML = "";
    content.append(createErrorState("Department details could not be loaded.", loadPage));
  }
}

loadPage();
