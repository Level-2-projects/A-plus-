/**
 * js/dev/mock-playground.js – Interactive API sandbox controller.
 * Enables live testing of student and doctor endpoints using the official API modules.
 *
 * Depends on:
 *  - js/mock/seed/users.js
 *  - js/mock/mock-db.js
 *  - js/api.js (saveSession, clearSession)
 *  - js/api/student-api.js
 *  - js/api/doctor-api.js
 */

import { SEED_USERS } from "../mock/seed/users.js";
import { mockDb } from "../mock/mock-db.js";
import { saveSession, clearSession } from "../api.js";
import * as studentApi from "../api/student-api.js";
import * as doctorApi from "../api/doctor-api.js";

/** DOM references */
const userSelect = document.getElementById("playground-user-select");
const endpointSelect = document.getElementById("playground-endpoint-select");
const bodyInput = document.getElementById("playground-body-input");
const runBtn = document.getElementById("playground-run-btn");
const resetDbBtn = document.getElementById("playground-reset-db-btn");
const responseOutput = document.getElementById("playground-response-output");
const dbSnapshotOutput = document.getElementById("playground-db-snapshot-output");
const userAccountsTable = document.getElementById("playground-users-table");

/** Pre-configured endpoint catalog */
const ENDPOINTS = [
  /* Student Endpoints */
  {
    label: "Student: Dashboard Summary",
    role: "student",
    method: "GET",
    call: () => studentApi.getDashboardSummary(),
    defaultBody: "",
  },
  {
    label: "Student: Get Courses",
    role: "student",
    method: "GET",
    call: () => studentApi.getCourses(),
    defaultBody: "",
  },
  {
    label: "Student: Get Assignments",
    role: "student",
    method: "GET",
    call: () => studentApi.getAssignments(),
    defaultBody: "",
  },
  {
    label: "Student: Submit Assignment (asg-a1)",
    role: "student",
    method: "POST",
    call: (body) => studentApi.submitAssignment("asg-a1", body),
    defaultBody: JSON.stringify({ content: "Sample architectural report on Gang of Four patterns." }, null, 2),
  },
  {
    label: "Student: Get Quizzes",
    role: "student",
    method: "GET",
    call: () => studentApi.getQuizzes(),
    defaultBody: "",
  },
  {
    label: "Student: Get Attendance",
    role: "student",
    method: "GET",
    call: () => studentApi.getAttendance(),
    defaultBody: "",
  },
  {
    label: "Student: Get Points & Top 3",
    role: "student",
    method: "GET",
    call: () => studentApi.getPoints(),
    defaultBody: "",
  },
  {
    label: "Student: Get Inbox Messages",
    role: "student",
    method: "GET",
    call: () => studentApi.getInbox(),
    defaultBody: "",
  },
  {
    label: "Student: Get Unread Count",
    role: "student",
    method: "GET",
    call: () => studentApi.getUnreadCount(),
    defaultBody: "",
  },
  {
    label: "Student: Get Todos",
    role: "student",
    method: "GET",
    call: () => studentApi.getTodos(),
    defaultBody: "",
  },
  {
    label: "Student: Create Todo",
    role: "student",
    method: "POST",
    call: (body) => studentApi.createTodo(body),
    defaultBody: JSON.stringify({ title: "Study Microservices Patterns", priority: "high", due_date: "2026-11-05" }, null, 2),
  },

  /* Doctor Endpoints */
  {
    label: "Doctor: Dashboard Summary",
    role: "doctor",
    method: "GET",
    call: () => doctorApi.getDoctorDashboardSummary(),
    defaultBody: "",
  },
  {
    label: "Doctor: Get Courses",
    role: "doctor",
    method: "GET",
    call: () => doctorApi.getDoctorCourses(),
    defaultBody: "",
  },
  {
    label: "Doctor: Get Assignments & AI Scores",
    role: "doctor",
    method: "GET",
    call: () => doctorApi.getDoctorAssignments(),
    defaultBody: "",
  },
  {
    label: "Doctor: Pending Submissions Count (Badge)",
    role: "doctor",
    method: "GET",
    call: () => doctorApi.getDoctorPendingSubmissionsCount(),
    defaultBody: "",
  },
  {
    label: "Doctor: Grade Submission (sub-2)",
    role: "doctor",
    method: "POST",
    call: (body) => doctorApi.gradeAssignmentSubmission("sub-2", body),
    defaultBody: JSON.stringify({ final_grade: 19, doctor_feedback: "Exemplary domain layer separation." }, null, 2),
  },
  {
    label: "Doctor: Get Students Roster",
    role: "doctor",
    method: "GET",
    call: () => doctorApi.getDoctorStudents(),
    defaultBody: "",
  },
  {
    label: "Doctor: Grant Bonus Points (usr-1)",
    role: "doctor",
    method: "POST",
    call: (body) => doctorApi.grantBonusPoints("usr-1", body),
    defaultBody: JSON.stringify({ points: 20, reason: "Excellent questions in Lecture 3" }, null, 2),
  },
  {
    label: "Doctor: Send Message to Enrolled",
    role: "doctor",
    method: "POST",
    call: (body) => doctorApi.sendDoctorMessage(body),
    defaultBody: JSON.stringify({
      course_id: "crs-a",
      type: "notice",
      subject: "Lab Session Tomorrow",
      body: "Please make sure Docker is installed before tomorrow's lab.",
    }, null, 2),
  },
  {
    label: "Doctor: Get Anonymous Ratings",
    role: "doctor",
    method: "GET",
    call: () => doctorApi.getDoctorRatings(),
    defaultBody: "",
  },
];

/** Populate Users dropdown and accounts documentation table */
function initUsers() {
  userSelect.innerHTML = SEED_USERS.map(
    (u) => `<option value="${u.id}">${u.full_name} (${u.role}) – ${u.email}</option>`
  ).join("");

  userAccountsTable.innerHTML = SEED_USERS.map(
    (u) => `
    <tr>
      <td><code>${u.email}</code></td>
      <td><code>${u.password}</code></td>
      <td><strong>${u.role}</strong></td>
      <td>${u.full_name}</td>
      <td>${u.department_name || "All"}</td>
    </tr>
  `
  ).join("");

  // Select first student by default
  userSelect.value = "usr-1";
  switchActiveUser("usr-1");
}

/** Populate endpoints dropdown */
function initEndpoints() {
  endpointSelect.innerHTML = ENDPOINTS.map(
    (ep, idx) => `<option value="${idx}">[${ep.role.toUpperCase()}] ${ep.label}</option>`
  ).join("");

  endpointSelect.addEventListener("change", () => {
    const ep = ENDPOINTS[Number(endpointSelect.value)];
    bodyInput.value = ep.defaultBody || "";
    bodyInput.disabled = ep.method === "GET";
  });

  // Trigger initial selection
  const initialEp = ENDPOINTS[0];
  bodyInput.value = initialEp.defaultBody || "";
  bodyInput.disabled = initialEp.method === "GET";
}

/** Sets active session token in Web Storage */
function switchActiveUser(userId) {
  const user = SEED_USERS.find((u) => u.id === userId);
  if (!user) return;
  saveSession(
    {
      access_token: `aplus-mock-${user.id}`,
      user: {
        id: user.id,
        full_name: user.full_name,
        role: user.role,
        department: user.department_name,
      },
    },
    true
  );
}

/** Updates the JSON database snapshot view */
function refreshDbSnapshot() {
  const db = mockDb.load();
  dbSnapshotOutput.textContent = JSON.stringify(db, null, 2);
}

/** Executes the selected endpoint */
async function executeEndpoint() {
  const selectedEp = ENDPOINTS[Number(endpointSelect.value)];
  runBtn.disabled = true;
  runBtn.textContent = "Executing...";
  responseOutput.textContent = "Calling API...";

  try {
    let parsedBody = null;
    if (selectedEp.method !== "GET" && bodyInput.value.trim()) {
      try {
        parsedBody = JSON.parse(bodyInput.value);
      } catch (err) {
        throw new Error(`Invalid JSON in request body: ${err.message}`);
      }
    }

    const res = await selectedEp.call(parsedBody);
    responseOutput.textContent = JSON.stringify(res, null, 2);
    responseOutput.classList.remove("has-error");
  } catch (err) {
    responseOutput.textContent = JSON.stringify(
      {
        error: true,
        status: err?.status,
        message: err?.message,
      },
      null,
      2
    );
    responseOutput.classList.add("has-error");
  } finally {
    runBtn.disabled = false;
    runBtn.textContent = "Send Request";
    refreshDbSnapshot();
  }
}

// Attach event listeners
userSelect.addEventListener("change", () => {
  switchActiveUser(userSelect.value);
});

runBtn.addEventListener("click", executeEndpoint);

resetDbBtn.addEventListener("click", () => {
  mockDb.resetToSeed();
  refreshDbSnapshot();
  responseOutput.textContent = "Database restored to pristine seed state.";
  responseOutput.classList.remove("has-error");
});

// Initialize on page load
window.addEventListener("DOMContentLoaded", () => {
  initUsers();
  initEndpoints();
  refreshDbSnapshot();
});
