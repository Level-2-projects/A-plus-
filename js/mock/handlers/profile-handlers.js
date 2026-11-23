/**
 * js/mock/handlers/profile-handlers.js – Shapes authenticated administrator and dean profile responses.
 * Exports read-only profile handlers.
 */

import { ok } from "../mock-response-helpers.js";

/** Returns the authenticated department administrator's profile. */
export function handleAdminProfile(_db, user) {
  return ok({ id: user.id, full_name: user.full_name, email: user.email, university_id: user.university_id, department: user.department_name, role: user.role });
}
/** Returns the authenticated dean's profile. */
export function handleDeanProfile(_db, user) {
  return ok({ id: user.id, full_name: user.full_name, email: user.email, university_id: user.university_id, department: user.department_name, role: user.role });
}
