/**
 * js/mock/routes/student-routes.js – Registers mock API routes for one application domain.
 * Exports its route definitions for the central request pipeline.
 */

import {
  handleStudentDashboard, handleStudentCourses, handleStudentCourse, handleStudentAssignments, handleStudentAssignment, handleStudentSubmitAssignment, handleStudentQuizzes, handleStudentQuiz, handleStudentAttemptQuiz,
} from "../handlers/student-academic-handlers.js";
import {
  handleStudentAttendance, handleStudentTodos, handleCreateTodo, handleUpdateTodo, handleDeleteTodo, handleStudentPoints, handleStudentRoadmaps, handleStudentInbox, handleMarkMessageRead, handleStudentUnreadCount, handleStudentProfile, handleStudentRating,
} from "../handlers/student-engagement-handlers.js";

/** Returns this domain's method, path, handler, and allowed-role definitions. */
export function getRoutes() {
  return [
    ["GET", /^\/student\/dashboard\/summary$/, (db, u) => handleStudentDashboard(db, u), ["student"]],
    ["GET", /^\/student\/courses$/, (db, u) => handleStudentCourses(db, u), ["student"]],
    ["GET", /^\/student\/courses\/([^/]+)$/, (db, u, p) => handleStudentCourse(db, u, p[1]), ["student"]],
    ["GET", /^\/student\/assignments$/, (db, u) => handleStudentAssignments(db, u), ["student"]],
    ["GET", /^\/student\/assignments\/([^/]+)$/, (db, u, p) => handleStudentAssignment(db, u, p[1]), ["student"]],
    ["POST", /^\/student\/assignments\/([^/]+)\/submit$/, (db, u, p, b) => handleStudentSubmitAssignment(db, u, p[1], b), ["student"]],
    ["GET", /^\/student\/quizzes$/, (db, u) => handleStudentQuizzes(db, u), ["student"]],
    ["GET", /^\/student\/quizzes\/([^/]+)$/, (db, u, p) => handleStudentQuiz(db, u, p[1]), ["student"]],
    ["POST", /^\/student\/quizzes\/([^/]+)\/attempt$/, (db, u, p, b) => handleStudentAttemptQuiz(db, u, p[1], b), ["student"]],
    ["GET", /^\/student\/attendance$/, (db, u) => handleStudentAttendance(db, u), ["student"]],
    ["GET", /^\/student\/todos$/, (db, u) => handleStudentTodos(db, u), ["student"]],
    ["POST", /^\/student\/todos$/, (db, u, _p, b) => handleCreateTodo(db, u, b), ["student"]],
    ["PATCH", /^\/student\/todos\/([^/]+)$/, (db, u, p, b) => handleUpdateTodo(db, u, p[1], b), ["student"]],
    ["DELETE", /^\/student\/todos\/([^/]+)$/, (db, u, p) => handleDeleteTodo(db, u, p[1]), ["student"]],
    ["GET", /^\/student\/points$/, (db, u) => handleStudentPoints(db, u), ["student"]],
    ["GET", /^\/student\/roadmaps$/, () => handleStudentRoadmaps(), ["student"]],
    ["GET", /^\/student\/inbox\/unread-count$/, (db, u) => handleStudentUnreadCount(db, u), ["student"]],
    ["GET", /^\/student\/inbox$/, (db, u) => handleStudentInbox(db, u), ["student"]],
    ["PUT", /^\/student\/inbox\/([^/]+)\/read$/, (db, u, p) => handleMarkMessageRead(db, u, p[1]), ["student"]],
    ["GET", /^\/student\/profile$/, (db, u) => handleStudentProfile(db, u), ["student"]],
    ["POST", /^\/student\/ratings$/, (db, u, _p, b) => handleStudentRating(db, u, b), ["student"]],
  ];
}
