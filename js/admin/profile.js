/**
 * js/admin/profile.js – Read-only authenticated department admin profile view.
 *
 * Fetches admin identity and renders the profile card.
 *
 * Depends on:
 *   - js/api/admin-api.js
 *   - js/core/layout.js
 *   - js/config/strings.js
 *   - js/components/error-state.js
 *   - js/components/profile-card.js
 *   - js/components/skeleton.js
 */

import { getAdminProfile } from "../api/admin-api.js";
import { initAdminPage } from "../core/layout.js";
import { STRINGS } from "../config/strings.js";
import { createErrorState } from "../components/error-state.js";
import { createProfileCard } from "../components/profile-card.js";
import { createSkeleton } from "../components/skeleton.js";

const root = document.getElementById("page-content");

/** Mounts the profile page and loads the authenticated admin's details. */
async function start() {
  initAdminPage("profile");
  if (!root || !document.querySelector(".app-shell")) return;
  root.append(createSkeleton({ label: STRINGS.shared.loading }));
  await loadProfile();
}

/** Loads admin profile fields with a visible retry state on failure. */
async function loadProfile() {
  try {
    const profile = await getAdminProfile();
    renderProfile(profile);
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
  page.append(
    title,
    createProfileCard(profile, {
      name: STRINGS.profile.name,
      email: STRINGS.profile.email,
      universityId: STRINGS.profile.universityId,
      department: STRINGS.profile.department,
      role: STRINGS.profile.role,
      roles: STRINGS.roles,
    })
  );
  root.append(page);
}

start();
