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
    ["GET", /^\/dean\/analytics$/, (db,u,_p,_b,q) => dean.handleDeanAnalytics(db,u,q), ["super_admin"]],
    ["GET", /^\/dean\/reports$/, (db,u,_p,_b,q) => dean.handleDeanReports(db,u,q), ["super_admin"]],
    ["GET", /^\/dean\/settings$/, (db,u) => dean.handleDeanSettings(db,u), ["super_admin"]],
    ["PATCH", /^\/dean\/settings$/, (db,u,_p,b) => dean.handleDeanUpdateSettings(db,u,b), ["super_admin"]],
    ["GET", /^\/dean\/messages$/, (db,u) => dean.handleDeanMessages(db,u), ["super_admin"]],
    ["POST", /^\/dean\/messages$/, (db,u,_p,b) => dean.handleDeanSendMessage(db,u,b), ["super_admin"]],
    ["GET", /^\/dean\/inbox$/, (db,u) => dean.handleDeanInbox(db,u), ["super_admin"]],
    ["GET", /^\/dean\/inbox\/unread-count$/, (db,u) => dean.handleDeanUnreadCount(db,u), ["super_admin"]],
    ["PUT", /^\/dean\/inbox\/([^/]+)\/read$/, (db,u,p) => dean.handleDeanMarkRead(db,u,p[1]), ["super_admin"]],
    ["GET", /^\/dean\/profile$/, (db,u) => handleDeanProfile(db,u), ["super_admin"]],
  ];
}
