/**
 * js/mock/routes/doctor-routes.js – Registers mock API routes for one application domain.
 * Exports its route definitions for the central request pipeline.
 */

import * as academic from "../handlers/doctor-academic-handlers.js";
import * as engagement from "../handlers/doctor-engagement-handlers.js";

/** Returns this domain's method, path, handler, and allowed-role definitions. */
export function getRoutes() {
  return [
    ["GET", /^\/doctor\/dashboard\/summary$/, (db,u) => academic.handleDoctorDashboard(db,u), ["doctor"]],
    ["GET", /^\/doctor\/courses$/, (db,u) => academic.handleDoctorCourses(db,u), ["doctor"]],
    ["GET", /^\/doctor\/courses\/([^/]+)$/, (db,u,p) => academic.handleDoctorCourse(db,u,p[1]), ["doctor"]],
    ["GET", /^\/doctor\/assignments\/pending-count$/, (db,u) => academic.handleDoctorPendingCount(db,u), ["doctor"]],
    ["GET", /^\/doctor\/assignments$/, (db,u) => academic.handleDoctorAssignments(db,u), ["doctor"]],
    ["POST", /^\/doctor\/assignments$/, (db,u,_p,b) => academic.handleDoctorCreateAssignment(db,u,b), ["doctor"]],
    ["PATCH", /^\/doctor\/assignments\/([^/]+)$/, (db,u,p,b) => academic.handleDoctorUpdateAssignment(db,u,p[1],b), ["doctor"]],
    ["POST", /^\/doctor\/lectures$/, (db,u,_p,b) => academic.handleDoctorCreateLecture(db,u,b), ["doctor"]],
    ["PATCH", /^\/doctor\/lectures\/([^/]+)$/, (db,u,p,b) => academic.handleDoctorUpdateLecture(db,u,p[1],b), ["doctor"]],
    ["POST", /^\/doctor\/submissions\/([^/]+)\/grade$/, (db,u,p,b) => academic.handleDoctorGradeSubmission(db,u,p[1],b), ["doctor"]],
    ["GET", /^\/doctor\/quizzes\/([^/]+)\/results$/, (db,u,p) => academic.handleDoctorQuizResults(db,u,p[1]), ["doctor"]],
    ["GET", /^\/doctor\/quizzes$/, (db,u) => academic.handleDoctorQuizzes(db,u), ["doctor"]],
    ["POST", /^\/doctor\/quizzes$/, (db,u,_p,b) => academic.handleDoctorCreateQuiz(db,u,b), ["doctor"]],
    ["PATCH", /^\/doctor\/quizzes\/([^/]+)$/, (db,u,p,b) => academic.handleDoctorUpdateQuiz(db,u,p[1],b), ["doctor"]],
    ["GET", /^\/doctor\/attendance$/, (db,u) => engagement.handleDoctorAttendance(db,u), ["doctor"]],
    ["POST", /^\/doctor\/attendance$/, (db,u,_p,b) => engagement.handleDoctorRecordAttendance(db,u,b), ["doctor"]],
    ["GET", /^\/doctor\/students$/, (db,u,_p,_b,q) => engagement.handleDoctorStudents(db,u,q), ["doctor"]],
    ["POST", /^\/doctor\/students\/([^/]+)\/bonus$/, (db,u,p,b) => engagement.handleDoctorGrantBonus(db,u,p[1],b), ["doctor"]],
    ["GET", /^\/doctor\/messages$/, (db,u) => engagement.handleDoctorMessages(db,u), ["doctor"]],
    ["POST", /^\/doctor\/messages$/, (db,u,_p,b) => engagement.handleDoctorSendMessage(db,u,b), ["doctor"]],
    ["GET", /^\/doctor\/ratings$/, (db,u) => engagement.handleDoctorRatings(db,u), ["doctor"]],
    ["GET", /^\/doctor\/profile$/, (db,u) => engagement.handleDoctorProfile(db,u), ["doctor"]],
  ];
}
