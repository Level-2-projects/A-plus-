/**
 * js/mock/routes/admin-routes.js – Registers mock API routes for one application domain.
 * Exports its route definitions for the central request pipeline.
 */

import * as accounts from "../handlers/admin-account-handlers.js";
import * as operations from "../handlers/admin-operations-handlers.js";
import { handleAdminProfile } from "../handlers/profile-handlers.js";

/** Returns this domain's method, path, handler, and allowed-role definitions. */
export function getRoutes() {
  return [
    ["GET", /^\/admin\/dashboard\/summary$/, (db,u) => accounts.handleAdminDashboard(db,u), ["department_admin"]],
    ["GET", /^\/admin\/students$/, (db,u,_p,_b,q) => accounts.handleAdminGetStudents(db,u,q), ["department_admin"]],
    ["POST", /^\/admin\/students$/, (db,u,_p,b) => accounts.handleAdminCreateStudent(db,u,b), ["department_admin"]],
    ["PATCH", /^\/admin\/students\/([^/]+)$/, (db,u,p,b) => accounts.handleAdminUpdateStudent(db,u,p[1],b), ["department_admin"]],
    ["POST", /^\/admin\/students\/([^/]+)\/deactivate$/, (db,u,p) => accounts.handleAdminDeactivateStudent(db,u,p[1]), ["department_admin"]],
    ["POST", /^\/admin\/students\/([^/]+)\/reactivate$/, (db,u,p) => accounts.handleAdminReactivateStudent(db,u,p[1]), ["department_admin"]],
    ["GET", /^\/admin\/doctors$/, (db,u) => accounts.handleAdminGetDoctors(db,u), ["department_admin"]],
    ["POST", /^\/admin\/doctors$/, (db,u,_p,b) => accounts.handleAdminCreateDoctor(db,u,b), ["department_admin"]],
    ["PATCH", /^\/admin\/doctors\/([^/]+)$/, (db,u,p,b) => accounts.handleAdminUpdateDoctor(db,u,p[1],b), ["department_admin"]],
    ["POST", /^\/admin\/doctors\/([^/]+)\/deactivate$/, (db,u,p) => accounts.handleAdminDeactivateDoctor(db,u,p[1]), ["department_admin"]],
    ["POST", /^\/admin\/doctors\/([^/]+)\/reactivate$/, (db,u,p) => accounts.handleAdminReactivateDoctor(db,u,p[1]), ["department_admin"]],
    ["GET", /^\/admin\/courses$/, (db,u) => operations.handleAdminGetCourses(db,u), ["department_admin"]],
    ["POST", /^\/admin\/courses$/, (db,u,_p,b) => operations.handleAdminCreateCourse(db,u,b), ["department_admin"]],
    ["PATCH", /^\/admin\/courses\/([^/]+)$/, (db,u,p,b) => operations.handleAdminUpdateCourse(db,u,p[1],b), ["department_admin"]],
    ["POST", /^\/admin\/courses\/([^/]+)\/enroll$/, (db,u,p,b) => operations.handleAdminEnrollStudent(db,u,p[1],b), ["department_admin"]],
    ["DELETE", /^\/admin\/courses\/([^/]+)\/enroll\/([^/]+)$/, (db,u,p) => operations.handleAdminUnenrollStudent(db,u,p[1],p[2]), ["department_admin"]],
    ["GET", /^\/admin\/attendance$/, (db,u) => operations.handleAdminAttendance(db,u), ["department_admin"]],
    ["GET", /^\/admin\/points$/, (db,u) => operations.handleAdminPoints(db,u), ["department_admin"]],
    ["GET", /^\/admin\/messages$/, (db,u) => operations.handleAdminMessages(db,u), ["department_admin"]],
    ["POST", /^\/admin\/messages$/, (db,u,_p,b) => operations.handleAdminSendMessage(db,u,b), ["department_admin"]],
    ["GET", /^\/admin\/settings$/, (db,u) => operations.handleAdminSettings(db,u), ["department_admin"]],
    ["GET", /^\/admin\/inbox\/unread-count$/, (db,u) => operations.handleAdminUnreadCount(db,u), ["department_admin"]],
    ["GET", /^\/admin\/inbox$/, (db,u) => operations.handleAdminInbox(db,u), ["department_admin"]],
    ["PUT", /^\/admin\/inbox\/([^/]+)\/read$/, (db,u,p) => operations.handleAdminMarkRead(db,u,p[1]), ["department_admin"]],
    ["GET", /^\/admin\/profile$/, (db,u) => handleAdminProfile(db,u), ["department_admin"]],
  ];
}
