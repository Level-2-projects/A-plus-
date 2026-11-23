/**
 * js/mock/mock-server.js – Central in-browser mock request pipeline.
 * Resolves tokens, dispatches registered routes, checks roles, and shapes pipeline failures.
 *
 * Depends on: js/mock/mock-db.js, js/mock/mock-response-helpers.js, js/mock/routes/*.js
 */

import { mockDb } from "./mock-db.js";
import { err401, err403, fail } from "./mock-response-helpers.js";
import { getRoutes as getAuthRoutes } from "./routes/auth-routes.js";
import { getRoutes as getStudentRoutes } from "./routes/student-routes.js";
import { getRoutes as getDoctorRoutes } from "./routes/doctor-routes.js";
import { getRoutes as getAdminRoutes } from "./routes/admin-routes.js";
import { getRoutes as getDeanRoutes } from "./routes/dean-routes.js";

const ROUTES = [
  ...getAuthRoutes(),
  ...getStudentRoutes(),
  ...getDoctorRoutes(),
  ...getAdminRoutes(),
  ...getDeanRoutes(),
];

/** Resolves a bearer token to an enabled mock user record. */
function resolveToken(token) {
  if (!token) return null;
  const match = /^aplus-mock-(.+)$/.exec(token);
  if (!match) return null;
  const db = mockDb.load();
  return db.users.find((user) => user.id === match[1] && !user.disabled) || null;
}

/** Dispatches a mock API request through authentication, role checks, and route handling. */
export function handle(method, rawPath, body, token) {
  const queryIndex = rawPath.indexOf("?");
  const pathname = queryIndex >= 0 ? rawPath.slice(0, queryIndex) : rawPath;
  const searchParams = new URLSearchParams(queryIndex >= 0 ? rawPath.slice(queryIndex + 1) : "");
  const publicRoute = ROUTES.find(([routeMethod, pattern, _handler, roles]) => routeMethod === method && pattern.test(pathname) && roles.length === 0);
  if (publicRoute) return publicRoute[2](mockDb.load(), null, publicRoute[1].exec(pathname), body, searchParams);
  const user = resolveToken(token);
  if (!user) return err401();
  for (const [routeMethod, pattern, handler, allowedRoles] of ROUTES) {
    if (routeMethod !== method) continue;
    const match = pattern.exec(pathname);
    if (!match) continue;
    if (allowedRoles.length && !allowedRoles.includes(user.role)) return err403();
    const db = mockDb.load();
    try { return handler(db, user, match, body, searchParams); }
    catch (error) { console.error("[MockServer] Unhandled handler error:", error); return fail(500, "Internal mock server error."); }
  }
  return fail(404, `No mock route found for ${method} ${pathname}`);
}
