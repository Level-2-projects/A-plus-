/**
 * js/doctor/profile.js - Read-only authenticated doctor profile view.
 * Depends on doctor profile API and shared profile rendering.
 */

import { getDoctorProfile } from "../api/doctor-api.js";
import { initDoctorPage } from "../core/layout.js";
import { STRINGS } from "../config/strings.js";
import { createErrorState } from "../components/error-state.js";
import { createProfileCard } from "../components/profile-card.js";
import { createSkeleton } from "../components/skeleton.js";

const root = document.getElementById("page-content");

/** Mounts the profile page and loads the authenticated doctor's details. */
async function start() {
  initDoctorPage("profile");
  if (!root || !document.querySelector(".app-shell")) return;
  root.append(createSkeleton({ label: STRINGS.shared.loading }));
  await loadProfile();
}

/** Loads doctor profile fields with a visible retry state on failure. */
async function loadProfile() {
  try {
    renderProfile(await getDoctorProfile());
  } catch (error) {
    root.replaceChildren(createErrorState(error.message || STRINGS.profile.loadError, loadProfile));
  }
}

/** Renders the read-only profile card without editable account controls. */
function renderProfile(profile) {
  root.replaceChildren();
  const page = document.createElement("section");
  page.className = "page-stack";
  const title = document.createElement("h2");
  title.textContent = STRINGS.profile.title;
  page.append(title, createProfileCard(profile, {
    name: STRINGS.profile.name,
    email: STRINGS.profile.email,
    universityId: STRINGS.profile.universityId,
    department: STRINGS.profile.department,
    role: STRINGS.profile.role,
    roles: STRINGS.roles,
  }));
  root.append(page);
}

start();
