/**
 * js/doctor/ratings.js - Anonymous rating averages and comment review.
 * The UI consumes only anonymous aggregates and never renders student identity.
 */

import { getDoctorCourses, getDoctorRatings } from "../api/doctor-api.js";
import { initDoctorPage } from "../core/layout.js";
import { STRINGS } from "../config/strings.js";
import { createEmptyState } from "../components/empty-state.js";
import { createErrorState } from "../components/error-state.js";
import { createFormField } from "../components/form-field.js";
import { createProgressBar } from "../components/progress-bar.js";
import { createProgressRing } from "../components/progress-ring.js";
import { createSkeleton } from "../components/skeleton.js";
import { formatDate } from "../components/date-format.js";

const root = document.getElementById("page-content");
let courses = [];
let ratings = null;
let selectedCourse = "";

/** Mounts the page and loads anonymous ratings plus doctor-owned courses. */
async function start() {
  initDoctorPage("ratings");
  if (!root || !document.querySelector(".app-shell")) return;
  root.append(createSkeleton({ label: STRINGS.shared.loading }));
  await loadRatings();
}

/** Loads all rating information and exposes an explicit retry state. */
async function loadRatings() {
  try {
    [courses, ratings] = await Promise.all([getDoctorCourses(), getDoctorRatings()]);
    renderRatings();
  } catch (error) {
    root.replaceChildren(createErrorState(error.message || STRINGS.ratings.loadError, loadRatings));
  }
}

/** Renders aggregate ratings, a course comment filter, and anonymous feedback. */
function renderRatings() {
  root.replaceChildren();
  const page = document.createElement("section");
  page.className = "page-stack";
  const heading = document.createElement("h2");
  heading.textContent = STRINGS.ratings.title;
  const summary = document.createElement("section");
  summary.className = "card rating-summary";
  const score = ratings.overall_score ?? 0;
  summary.append(createProgressRing({
    value: score * 20,
    variant: score >= 4 ? "success" : "aqua",
    label: `${STRINGS.ratings.overall}: ${score || STRINGS.shared.noItems} / 5`,
  }));
  const overallText = document.createElement("div");
  const total = document.createElement("h3");
  total.textContent = STRINGS.ratings.overall;
  const totalCount = document.createElement("p");
  totalCount.textContent = `${ratings.total_evaluations} ${STRINGS.ratings.evaluations}`;
  overallText.append(total, totalCount);
  summary.append(overallText);

  const breakdown = document.createElement("section");
  breakdown.className = "card page-stack";
  const breakdownHeading = document.createElement("h3");
  breakdownHeading.textContent = STRINGS.ratings.breakdown;
  breakdown.append(breakdownHeading);
  if (!ratings.breakdown.length) breakdown.append(createEmptyState(STRINGS.ratings.noRatings));
  ratings.breakdown.forEach((metric) => {
    const row = document.createElement("div");
    row.className = "rating-breakdown-row";
    const label = document.createElement("span");
    label.textContent = metric.metric;
    const value = document.createElement("span");
    value.className = "tabular-nums";
    value.textContent = metric.score === null ? STRINGS.shared.noItems : `${metric.score} / 5`;
    const bar = createProgressBar(metric.score === null ? 0 : metric.score * 20, `${metric.metric}: ${value.textContent}`);
    row.append(label, value, bar);
    breakdown.append(row);
  });

  const filter = createFormField({
    label: STRINGS.ratings.course,
    name: "course",
    options: [
      { value: "", text: STRINGS.ratings.allCourses },
      ...courses.map((course) => ({ value: course.code, text: course.code })),
    ],
  });
  const select = filter.querySelector("select");
  select.value = selectedCourse;
  select.addEventListener("change", () => {
    selectedCourse = select.value;
    renderRatings();
  });
  const commentsHeading = document.createElement("h3");
  commentsHeading.textContent = STRINGS.ratings.comments;
  const comments = document.createElement("div");
  comments.className = "card-list";
  const visible = ratings.anonymous_comments.filter((comment) => !selectedCourse || comment.course_code === selectedCourse);
  if (!visible.length) comments.append(createEmptyState(STRINGS.ratings.noComments));
  visible.forEach((comment) => comments.append(createComment(comment)));
  page.append(heading, summary, breakdown, filter, commentsHeading, comments);
  root.append(page);
}

/** Creates one comment card containing no reviewer identity fields. */
function createComment(comment) {
  const card = document.createElement("article");
  card.className = "card rating-comment";
  const heading = document.createElement("h4");
  heading.textContent = `${comment.course_code} · ${comment.target_title}`;
  const score = document.createElement("p");
  score.textContent = `${STRINGS.ratings.score}: ${comment.score} / 5`;
  const date = document.createElement("time");
  date.dateTime = comment.date;
  date.textContent = formatDate(comment.date).absolute;
  const text = document.createElement("p");
  text.textContent = comment.comment;
  card.append(heading, score, date, text);
  return card;
}

start();
