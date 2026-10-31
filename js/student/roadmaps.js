/**
 * js/student/roadmaps.js - Read-only learning tracks and step timelines.
 * Roadmap content is a provisional preview supplied by the existing API.
 */

import { getRoadmaps } from "../api/student-api.js";
import { initStudentPage } from "../core/layout.js";
import { STRINGS } from "../config/strings.js";
import { createEmptyState } from "../components/empty-state.js";
import { createErrorState } from "../components/error-state.js";
import { createProgressBar } from "../components/progress-bar.js";
import { createSkeleton } from "../components/skeleton.js";

const root = document.getElementById("page-content");

/** Mounts the roadmap page and loads its read-only tracks. */
async function start() {
  initStudentPage("roadmaps");
  if (!root || !document.querySelector(".app-shell")) return;
  root.append(createSkeleton({ label: STRINGS.shared.loading }));
  await loadRoadmaps();
}

/** Loads roadmap data and presents an explicit retry state on failure. */
async function loadRoadmaps() {
  try {
    renderRoadmaps(await getRoadmaps());
  } catch (error) {
    root.replaceChildren(createErrorState(error.message || STRINGS.shared.loadError, loadRoadmaps));
  }
}

/** Renders each provisional roadmap with a progress bar and solid timeline markers. */
function renderRoadmaps(roadmaps) {
  root.replaceChildren();
  const page = document.createElement("section");
  page.className = "page-stack";
  const title = document.createElement("h2");
  title.textContent = STRINGS.roadmaps.title;
  const grid = document.createElement("div");
  grid.className = "page-grid";
  if (!roadmaps.length) grid.append(createEmptyState(STRINGS.roadmaps.noTracks));
  roadmaps.forEach((roadmap) => {
    const card = document.createElement("article");
    card.className = "card page-stack";
    const heading = document.createElement("h3");
    heading.textContent = roadmap.title;
    const description = document.createElement("p");
    description.textContent = roadmap.description;
    const progressLabel = document.createElement("p");
    progressLabel.textContent = `${STRINGS.roadmaps.progress}: ${roadmap.progress_percent}%`;
    const bar = createProgressBar(roadmap.progress_percent, progressLabel.textContent);
    const steps = document.createElement("ol");
    steps.className = "roadmap-steps";
    roadmap.steps.forEach((step) => {
      const item = document.createElement("li");
      item.className = "roadmap-step";
      const marker = document.createElement("span");
      marker.className = `roadmap-marker roadmap-marker--${step.status}`;
      marker.setAttribute("aria-hidden", "true");
      const label = document.createElement("span");
      label.textContent = step.title;
      const state = document.createElement("span");
      state.className = "status status-neutral";
      state.textContent = STRINGS.roadmaps[step.status] || step.status;
      item.append(marker, label, state);
      steps.append(item);
    });
    card.append(heading, description, progressLabel, bar, steps);
    grid.append(card);
  });
  page.append(title, grid);
  root.append(page);
}

start();
