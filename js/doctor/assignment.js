/**
 * js/doctor/assignment.js – Doctor review of submitted work and grading actions.
 * This doctor-only view may display AI scores and full student submissions.
 * Depends on: doctor API, shared layout, and shared UI components.
 */

import { getDoctorAssignments, gradeAssignmentSubmission } from "../api/doctor-api.js";
import { initDoctorPage, setPageTitle } from "../core/layout.js";
import { STRINGS } from "../config/strings.js";
import { createDataTable } from "../components/data-table.js";
import { createEmptyState } from "../components/empty-state.js";
import { createFormField, showFieldErrors } from "../components/form-field.js";
import { createErrorState } from "../components/error-state.js";
import { createSkeleton } from "../components/skeleton.js";
import { createStatusDot } from "../components/status-dot.js";
import { formatDate } from "../components/date-format.js";
import { showToast } from "../components/toast.js";

const root = document.getElementById("page-content");
const assignmentId = new URLSearchParams(location.search).get("id");
let activeAssignment = null;
let selectedSubmission = null;

/** Mounts the protected doctor shell and loads the requested assignment. */
async function start() {
  initDoctorPage("assignments");
  if (!root || !document.querySelector(".app-shell")) return;
  if (!assignmentId) {
    root.append(createErrorState(STRINGS.assignments.loadAssignmentError, () => location.assign("assignments.html")));
    return;
  }
  root.append(createSkeleton({ label: STRINGS.shared.loading }));
  await loadAssignment();
}

/** Fetches the assignment list, then selects the requested doctor-owned record. */
async function loadAssignment() {
  try {
    const assignments = await getDoctorAssignments();
    activeAssignment = assignments.find((item) => item.id === assignmentId);
    if (!activeAssignment) {
      root.replaceChildren(createErrorState(STRINGS.assignments.loadAssignmentError, loadAssignment));
      return;
    }
    selectedSubmission = selectedSubmission
      ? activeAssignment.submissions.find((item) => item.id === selectedSubmission.id) || null
      : activeAssignment.submissions.find((item) => item.doctor_final_grade === null) || activeAssignment.submissions[0] || null;
    renderAssignment();
  } catch (error) {
    root.replaceChildren(createErrorState(error.message || STRINGS.assignments.loadAssignmentError, loadAssignment));
  }
}

/** Renders assignment metadata, submissions, AI evaluations, and the grading form. */
function renderAssignment() {
  root.replaceChildren();
  setPageTitle(activeAssignment.title);
  const page = document.createElement("section");
  page.className = "page-stack";
  const back = document.createElement("a");
  back.href = "assignments.html";
  back.textContent = STRINGS.assignments.backToAssignments;
  const summary = document.createElement("article");
  summary.className = "card page-stack";
  const title = document.createElement("h2");
  title.textContent = activeAssignment.title;
  const course = document.createElement("p");
  course.className = "course-mark";
  course.textContent = activeAssignment.course_code;
  const due = document.createElement("p");
  due.textContent = `${STRINGS.assignments.due}: ${formatDate(activeAssignment.due_date).absolute}`;
  summary.append(title, course, due);
  const heading = document.createElement("h3");
  heading.textContent = STRINGS.assignments.submissionsTitle;
  const rows = activeAssignment.submissions;
  if (!rows.length) {
    page.append(back, summary, heading, createEmptyState(STRINGS.assignments.noStudentSubmissions));
    root.append(page);
    return;
  }
  const table = createDataTable({
    label: STRINGS.assignments.submissionsTitle,
    emptyMessage: STRINGS.assignments.noStudentSubmissions,
    rows,
    columns: [
      { key: "student_name", label: STRINGS.assignments.student },
      { key: "submitted_at", label: STRINGS.assignments.submittedAt, render: (row) => formatDate(row.submitted_at).absolute },
      { key: "is_late", label: STRINGS.assignments.late, render: (row) => createStatusDot(row.is_late ? STRINGS.assignments.late : STRINGS.assignments.statusLabels.onTime, row.is_late ? "danger" : "success") },
      { key: "ai_score", label: STRINGS.assignments.aiScore, render: (row) => `${row.ai_evaluation.score_out_of_10} / 10` },
      { key: "grade", label: STRINGS.assignments.grade, render: (row) => row.doctor_final_grade === null ? createStatusDot(STRINGS.assignments.gradingPending, "warning") : `${row.doctor_final_grade} / ${activeAssignment.max_grade}` },
      { key: "action", label: STRINGS.assignments.openSubmissions, render: (row) => createReviewButton(row) },
    ],
  });
  page.append(back, summary, heading, table);
  if (selectedSubmission) page.append(createGradingPanel(selectedSubmission));
  root.append(page);
}

/** Creates an action that selects the matching submission for review. */
function createReviewButton(submission) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "btn btn-secondary";
  button.textContent = submission.doctor_final_grade === null ? STRINGS.assignments.gradeAction : STRINGS.assignments.gradeAlreadySaved;
  button.addEventListener("click", () => {
    selectedSubmission = submission;
    renderAssignment();
  });
  return button;
}

/** Builds the grading form with student work, doctor-only AI evaluation, and feedback. */
function createGradingPanel(submission) {
  const panel = document.createElement("section");
  panel.className = "card grading-panel";
  const heading = document.createElement("h3");
  heading.textContent = `${STRINGS.assignments.gradeFormTitle}: ${submission.student_name}`;
  const workTitle = document.createElement("h4");
  workTitle.textContent = STRINGS.assignments.studentContent;
  const work = document.createElement("p");
  work.className = "student-submission";
  work.textContent = submission.content;
  const score = document.createElement("p");
  score.className = "grading-panel__score";
  score.textContent = `${STRINGS.assignments.aiScore}: ${submission.ai_evaluation.score_out_of_10} / 10`;
  const feedbackTitle = document.createElement("h4");
  feedbackTitle.textContent = STRINGS.assignments.aiFeedback;
  const feedback = document.createElement("p");
  feedback.textContent = submission.ai_evaluation.feedback_summary;
  panel.append(heading, workTitle, work, score, feedbackTitle, feedback);
  panel.append(createGradeForm(submission));
  return panel;
}

/** Creates and submits a bounded final-grade form for one student submission. */
function createGradeForm(submission) {
  const form = document.createElement("form");
  form.className = "page-stack";
  const gradeField = createFormField({ label: STRINGS.assignments.gradeValue, name: "final_grade", type: "number", required: true });
  const gradeInput = gradeField.querySelector("input");
  gradeInput.min = "0";
  gradeInput.max = String(activeAssignment.max_grade);
  gradeInput.step = "1";
  if (submission.doctor_final_grade !== null) gradeInput.value = String(submission.doctor_final_grade);
  const commentField = createFormField({ label: STRINGS.assignments.doctorComment, name: "doctor_feedback", multiline: true });
  commentField.querySelector("textarea").placeholder = STRINGS.assignments.feedbackPlaceholder;
  commentField.querySelector("textarea").value = submission.doctor_feedback || "";
  const error = document.createElement("p");
  error.className = "form-message";
  error.hidden = true;
  const save = document.createElement("button");
  save.type = "submit";
  save.className = "btn btn-primary";
  save.textContent = STRINGS.assignments.saveGrade;
  form.append(gradeField, commentField, error, save);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    save.disabled = true;
    try {
      await gradeAssignmentSubmission(submission.id, {
        final_grade: Number(data.get("final_grade")),
        doctor_feedback: String(data.get("doctor_feedback")),
      });
      showToast(STRINGS.assignments.gradeSaved, { kind: "success" });
      await loadAssignment();
    } catch (requestError) {
      showFieldErrors(form, requestError, error);
      save.disabled = false;
    }
  });
  return form;
}

start();
