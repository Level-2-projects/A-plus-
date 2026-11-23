/**
 * js/mock/routes/dean-routes.js – Registers mock API routes for one application domain.
 * Exports its route definitions for the central request pipeline.
 */

import * as dean from "../handlers/dean-handlers.js";
import { handleDeanProfile } from "../handlers/profile-handlers.js";

/** Returns this domain's method, path, handler, and allowed-role definitions. */
export function getRoutes() {
  return [
    ["GET", /^\/dean\/overview\/summary$/, (db,u) => dean.handleDeanOverview(db,u), ["super_admin"]],
    ["GET", /^\/dean\/departments$/, (db,u) => dean.handleDeanDepartments(db,u), ["super_admin"]],
    ["POST", /^\/dean\/departments$/, (db,u,_p,b) => dean.handleDeanCreateDepartment(db,u,b), ["super_admin"]],
    ["GET", /^\/dean\/departments\/([^/]+)$/, (db,u,p) => dean.handleDeanDepartmentDetail(db,u,p[1]), ["super_admin"]],
    ["GET", /^\/dean\/settings$/, (db,u) => dean.handleDeanSettings(db,u), ["super_admin"]],
    ["PATCH", /^\/dean\/settings$/, (db,u,_p,b) => dean.handleDeanUpdateSettings(db,u,b), ["super_admin"]],
    ["GET", /^\/dean\/profile$/, (db,u) => handleDeanProfile(db,u), ["super_admin"]],
  ];
}
