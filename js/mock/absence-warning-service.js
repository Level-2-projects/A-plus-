/**
 * js/mock/absence-warning-service.js – Creates a single absence warning at the configured threshold.
 * Exports the attendance side effect shared by doctor attendance routes.
 */

import { generateId } from "./mock-db.js";
import { getNow } from "../core/clock.js";
import { ABSENCE_WARNING_THRESHOLD } from "../config.js";

/** Checks a student's absence threshold and creates one warning when first crossed. */
export function checkAbsenceWarning(db, studentId, courseId) {
  const threshold = db.settings?.absence_warning_threshold ?? ABSENCE_WARNING_THRESHOLD;
  const courseSessionIds = db.attendance_sessions.filter((s) => s.course_id === courseId).map((s) => s.id);
  const absenceCount = db.attendance_records.filter((r) => courseSessionIds.includes(r.session_id) && r.student_id === studentId && r.status === "absent").length;
  if (absenceCount < threshold) return;
  const alreadyWarned = db.messages.some((m) => m.recipient_id === studentId && m.course_id === courseId && m.sender_type === "system" && m.type === "warning" && m.subject.startsWith("Absence Warning:"));
  if (alreadyWarned) return;
  const course = db.courses.find((c) => c.id === courseId);
  db.messages.push({ id: generateId("msg"), sender_id: null, sender_type: "system", sender_name: "A Plus System", recipient_id: studentId, course_id: courseId, type: "warning", subject: `Absence Warning: ${course?.code ?? courseId} – Penalty Threshold Reached`, body: `You have reached ${threshold} absences in ${course?.title ?? courseId}. ` + `Further absences may incur a grade penalty per university policy.`, created_at: getNow().toISOString(), is_read: false });
}
