/**
 * js/core/auth-guard.js – Route protection and role verification guard.
 * Verifies active session token and user role before page view renders.
 * Depends on: js/api.js, js/config.js
 */

import { getToken, getCurrentUser, clearSession } from "../api.js";
import { LOGIN_ROUTE, ROLE_ROUTES } from "../config.js";

/**
 * Validates the user's session and authorization level.
 * If no token exists or user is not logged in, clears the session and redirects to redirectUrl.
 * If the user is logged in but has the wrong role for this route, redirects to their own home route.
 *
 * @param {object} options
 * @param {string[]} [options.allowedRoles=['student']] - Authorized roles for this route.
 * @param {string} [options.redirectUrl=LOGIN_ROUTE] - Redirect destination if unauthorized.
 * @returns {{ id: string, full_name: string, role: string, department?: string }|null}
 */
export function requireAuth({ allowedRoles = ["student"], redirectUrl = LOGIN_ROUTE } = {}) {
  const token = getToken();
  const user = getCurrentUser();

  // If unauthenticated, clear any stale state and redirect immediately
  if (!token || !user) {
    clearSession();
    window.location.replace(redirectUrl);
    return null;
  }

  // If role is forbidden from this area, redirect to user's home route without clearing session
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    console.warn(`[AuthGuard] Access denied for role "${user.role}". Allowed roles:`, allowedRoles);
    const targetRoute = ROLE_ROUTES[user.role] || redirectUrl;
    window.location.replace(targetRoute);
    return null;
  }

  return user;
}
