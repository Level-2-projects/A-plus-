/**
 * js/mock/routes/auth-routes.js – Registers mock API routes for one application domain.
 * Exports its route definitions for the central request pipeline.
 */

import { ok, fail, err422 } from "../mock-response-helpers.js";

/** Authenticates a mock account through the router's public login endpoint. */
function handleMockLogin(db, body) {
  const identifier = body?.identifier?.trim().toLowerCase();
  const password = body?.password;
  if (!identifier || !password) return err422({ credentials: "Identifier and password are required." });
  const user = db.users.find((candidate) => ((candidate.email.toLowerCase() === identifier || candidate.university_id?.toLowerCase() === identifier) && candidate.password === password));
  if (!user) return fail(401, "Invalid credentials.");
  if (user.disabled) return fail(403, "Account disabled.");
  return ok({ access_token: `aplus-mock-${user.id}`, token_type: "bearer", user: { id: user.id, full_name: user.full_name, role: user.role, department: user.department_name } });
}

/** Returns this domain's method, path, handler, and allowed-role definitions. */
export function getRoutes() {
  return [
    ["POST", /^\/auth\/login$/, (db, _u, _p, body) => handleMockLogin(db, body), []],
  ];
}
