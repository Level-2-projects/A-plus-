/**
 * js/config.js – Central configuration for the "A Plus" platform.
 * Single source of truth for backend URLs, storage keys, role routes, branding,
 * mock behaviour constants, and domain business rule thresholds.
 * Depends on: js/config/student-nav.js, js/config/doctor-nav.js, js/config/admin-nav.js, js/config/dean-nav.js
 */

import { STUDENT_NAV_ITEMS } from "./config/student-nav.js";
import { DOCTOR_NAV_ITEMS } from "./config/doctor-nav.js";
import { ADMIN_NAV_ITEMS } from "./config/admin-nav.js";
import { DEAN_NAV_ITEMS } from "./config/dean-nav.js";

/** Toggle between local mock simulations and live backend communication. */
export const USE_MOCK = true;

/** Base URL of the FastAPI backend (used when USE_MOCK is false). */
export const API_BASE_URL = "http://localhost:8000";

/* ---------- Mock behaviour ---------- */

/** Simulated network latency in milliseconds (applied when USE_MOCK is true). */
export const MOCK_LATENCY_MS = 300;

/**
 * Probability [0, 1] of a mock request failing with 503.
 * Set to e.g. 0.1 to stress-test error handling during development.
 * Default 0 = never fail.
 */
export const MOCK_FAILURE_RATE = 0;

/* ---------- localStorage key for the shared mock database ---------- */
export const MOCK_DB_STORAGE_KEY = "aplus_mock_db";

/* ---------- Domain business rules ---------- */

/**
 * Number of absences in a course that triggers a system warning message.
 * The real backend enforces the same threshold.
 */
export const ABSENCE_WARNING_THRESHOLD = 2;

/**
 * Minimum days a student must wait before rating the same lecture or doctor again.
 */
export const RATING_COOLDOWN_DAYS = 7;

/* ---------- Points ledger constants ---------- */

/** Points awarded for submitting an assignment before the deadline. */
export const POINTS_SUBMISSION_ON_TIME = 50;

/** Points awarded for completing any quiz (regardless of score). */
export const POINTS_QUIZ_COMPLETION = 30;

/** Points awarded for being marked "present" in an attendance session. */
export const POINTS_ATTENDANCE_PRESENT = 10;

/** Login page URL used for redirects on logout or unauthorized access. */
export const LOGIN_ROUTE = "/index.html";

/** Centralized brand configuration for logo presentation across the application shell. */
export const BRANDING = {
  logoPath: "/images/logo.png",
  logoHeight: 44,
  logoAlt: "A Plus",
  wordmark: "A Plus",
};

/** Where each role lands after a successful login. */
export const ROLE_ROUTES = {
  super_admin:      "/super-admin/overview.html",
  department_admin: "/department-admin/dashboard.html",
  doctor:           "/doctor/dashboard.html",
  student:          "/student/dashboard.html",
};

/** Navigation definitions mapped by role. */
export const ROLE_NAV = {
  student: STUDENT_NAV_ITEMS,
  doctor: DOCTOR_NAV_ITEMS,
  department_admin: ADMIN_NAV_ITEMS,
  super_admin: DEAN_NAV_ITEMS,
};

/** Keys used to store authentication tokens and user profiles in Web Storage. */
export const STORAGE_KEYS = {
  token: "aplus_token",
  user: "aplus_user",
  rememberedId: "aplus_remembered_identifier",
  rememberedPassword: "aplus_remembered_password",
};
