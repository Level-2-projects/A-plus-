/**
 * js/api.js – Core authentication and session storage management.
 * The ONLY file permitted to directly access localStorage / sessionStorage.
 * Depends on: js/config.js
 *
 * API CONTRACT:
 *   POST {API_BASE_URL}/auth/login
 *   Body:    { "identifier": "...", "password": "..." }
 *   200 OK:  { "access_token": "...", "token_type": "bearer", "user": { ... } }
 *   401:     Invalid credentials
 *   403:     Account disabled
 */

import { USE_MOCK, API_BASE_URL, STORAGE_KEYS, LOGIN_ROUTE } from "./config.js";

/**
 * Standardized API Error carrying HTTP status codes and actionable messages.
 */
export class ApiError extends Error {
  /**
   * @param {number} status - HTTP status code (0 for network drop).
   * @param {string} message - Error description.
   */
  constructor(status, message) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/* ---------- Public: Login ---------- */

/**
 * Authenticates user credentials via mock or real backend.
 * @param {string} identifier - Email or University ID.
 * @param {string} password - User password.
 * @returns {Promise<{ access_token: string, token_type: string, user: { id: number, full_name: string, role: string } }>}
 */
export async function login(identifier, password) {
  return USE_MOCK ? mockLogin(identifier, password) : realLogin(identifier, password);
}

/* ---------- Real Backend HTTP Login ---------- */

async function realLogin(identifier, password) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });
  } catch {
    throw new ApiError(0, "Network error");
  }

  if (!response.ok) {
    let message = "Request failed";
    try {
      const data = await response.json();
      message = data.detail || data.message || message;
    } catch {
      // Use fallback message if JSON parse fails
    }
    throw new ApiError(response.status, message);
  }

  return response.json();
}

/* ---------- Mock Authentication Simulation ---------- */

const MOCK_USERS = [
  { identifier: "student@aplus.edu",  password: "Student123", user: { id: 1, full_name: "Test Student",    role: "student", department: "Software Engineering" } },
  { identifier: "doctor@aplus.edu",   password: "Doctor123",  user: { id: 2, full_name: "Test Doctor",     role: "doctor", department: "Software Engineering" } },
  { identifier: "dept@aplus.edu",     password: "Dept123",    user: { id: 3, full_name: "Test Dept Admin", role: "department_admin", department: "Software Engineering" } },
  { identifier: "dean@aplus.edu",     password: "Dean123",    user: { id: 4, full_name: "Test Dean",       role: "super_admin", department: "College of Computing" } },
  { identifier: "disabled@aplus.edu", password: "Disabled123", disabled: true, user: { id: 5, full_name: "Disabled User", role: "student" } },
];

async function mockLogin(identifier, password) {
  await new Promise((resolve) => setTimeout(resolve, 500));
  const found = MOCK_USERS.find(
    (u) => u.identifier.toLowerCase() === identifier.trim().toLowerCase() && u.password === password
  );
  if (!found) throw new ApiError(401, "Invalid credentials");
  if (found.disabled) throw new ApiError(403, "Account disabled");
  return {
    access_token: `mock-token-${found.user.id}-${Date.now()}`,
    token_type: "bearer",
    user: found.user,
  };
}

/* ---------- Session Storage Management ---------- */

/**
 * Persists session tokens and user data.
 * @param {{ access_token: string, user: object }} session - Authentication payload.
 * @param {boolean} remember - If true, stores in localStorage; otherwise sessionStorage.
 */
export function saveSession({ access_token, user }, remember) {
  const store = remember ? localStorage : sessionStorage;
  clearSession();
  store.setItem(STORAGE_KEYS.token, access_token);
  store.setItem(STORAGE_KEYS.user, JSON.stringify(user));
}

/**
 * Removes session keys from both local and session storage.
 */
export function clearSession() {
  for (const store of [localStorage, sessionStorage]) {
    store.removeItem(STORAGE_KEYS.token);
    store.removeItem(STORAGE_KEYS.user);
  }
}

/**
 * Retrieves the currently active access token, if any.
 * @returns {string|null}
 */
export function getToken() {
  return localStorage.getItem(STORAGE_KEYS.token) || sessionStorage.getItem(STORAGE_KEYS.token) || null;
}

/**
 * Retrieves the stored user profile, or null if none exists.
 * @returns {{ id: number, full_name: string, role: string, department?: string }|null}
 */
export function getCurrentUser() {
  const raw = localStorage.getItem(STORAGE_KEYS.user) || sessionStorage.getItem(STORAGE_KEYS.user);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    clearSession();
    return null;
  }
}

/**
 * Checks whether an active and valid user session is present.
 * @returns {boolean}
 */
export function isAuthenticated() {
  return Boolean(getToken() && getCurrentUser());
}

/**
 * Clears current session and redirects the browser to the login screen.
 * @param {string} [redirectUrl] - Optional target URL (defaults to LOGIN_ROUTE).
 */
export function logout(redirectUrl = LOGIN_ROUTE) {
  clearSession();
  window.location.assign(redirectUrl);
}
