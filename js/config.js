/**
 * js/config.js – Central configuration for the "A Plus" platform.
 * Single source of truth for backend URLs, storage keys, role routes, and branding.
 * Depends on: js/config/student-nav.js
 */

import { STUDENT_NAV_ITEMS } from "./config/student-nav.js";

/** Toggle between local mock simulations and live backend communication. */
export const USE_MOCK = true;

/** Base URL of the FastAPI backend (used when USE_MOCK is false). */
export const API_BASE_URL = "http://localhost:8000";

/** Login page URL used for redirects on logout or unauthorized access. */
export const LOGIN_ROUTE = "/index.html";

/** Centralized brand configuration for logo presentation across the application shell. */
export const BRANDING = {
  logoPath: "../logo_clean.png",
  logoHeight: 44,
  logoAlt: "A Plus",
  wordmark: "A Plus",
};

/** Where each role lands after a successful login. */
export const ROLE_ROUTES = {
  super_admin:      "/super-admin/dashboard.html",
  department_admin: "/department-admin/dashboard.html",
  doctor:           "/doctor/dashboard.html",
  student:          "/student/dashboard.html",
};

/** Navigation definitions mapped by role. */
export const ROLE_NAV = {
  student: STUDENT_NAV_ITEMS,
};

/** Keys used to store authentication tokens and user profiles in Web Storage. */
export const STORAGE_KEYS = {
  token: "aplus_token",
  user: "aplus_user",
  rememberedId: "aplus_remembered_identifier",
  rememberedPassword: "aplus_remembered_password",
};
