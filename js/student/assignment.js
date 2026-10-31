/**
 * js/student/assignment.js – Student assignment detail and one-time submission.
 * Never requests or renders doctor-only AI scores.
 * Depends on: student API, shared layout, and shared UI components.
 */

import { getAssignment, submitAssignment } from "../api/student-api.js";
import { initStudentPage, setPageTitle } from "../core/layout.js";
import { STRINGS } from "../config/strings.js";
import { confirmDialog } from "../components/dialog.js";
import { createFormField, showFieldErrors } from "../components/form-field.js";
import { createErrorState } from "../components/error-state.js";
import { createSkeleton } from "../components/skeleton.js";
import { createStatusDot } from "../components/status-dot.js";
import { formatDate } from "../components/date-format.js";
import { showToast } from "../components/toast.js";

const root = document.getElementById("page-content");
const assignmentId = new URLSearchParams(location.search).get("id");

/** Initializes the page and loads the selected student-safe assignment. */
async function start() {
  initStudentPage("assignments");
  if (!root || !document.querySelector(".app-shell")) return;
  if (!assignmentId) {
    root.append(createErrorState(STRINGS.assignments.loadAssignmentError, () => location.assign("assignments.html")));
    return;
  }
  root.append(createSkeleton({ label: STRINGS.shared.loading }));
  await loadAssignment();
}

/** Retrieves assignment state and renders an actionable retry when needed. */
async function loadAssignment() {
  try {
    const assignment = await getAssignment(assignmentId);
    renderAssignment(assignment);
  } catch (error) {
    root.replaceChildren(createErrorState(error.message || STRINGS.assignments.loadAssignmentError, loadAssignment));
  }
}

/** Renders details and either the submission form or feedback and grading results. */
function renderAssignment(assignment) {
  root.replaceChildren();
  setPageTitle(assignment.title);
  const page = document.createElement("section");
  page.className = "page-stack";
  const back = document.createElement("a");
  back.href = "assignments.html";
  back.textContent = STRINGS.assignments.backToAssignments;
  const details = document.createElement("article");
  details.className = "card page-stack";
  const title = document.createElement("h2");
  title.textContent = assignment.title;
  const course = document.createElement("p");
  course.className = "course-mark course-color-1";
  course.textContent = assignment.course_code;
  const deadline = document.createElement("p");
  const date = formatDate(assignment.due_date);
  deadline.textContent = `${STRINGS.assignments.deadline}: ${date.absolute} (${date.relative})`;
  const description = document.createElement("p");
  description.className = "assignment-description";
  description.textContent = assignment.description || STRINGS.shared.noItems;
  const status = createStatusDot(STRINGS.assignments.statusLabels[assignment.status] || assignment.status,
    assignment.status === "graded" ? "success" : assignment.status === "missed" ? "danger" : "info");
  details.append(title, course, deadline, status, description);
  page.append(back, details);
  if (assignment.status === "pending" || assignment.status === "missed") {
    page.append(createSubmissionForm(assignment));
  } else {
    page.append(createFeedbackCard(assignment));
  }
  root.append(page);
}

/** Creates a submission form guarded by a non-editable-after-submit confirmation. */
function createSubmissionForm(assignment) {
  const form = document.createElement("form");
  form.className = "card page-stack";
  const title = document.createElement("h3");
  title.textContent = STRINGS.assignments.submission;
  const field = createFormField({
    label: STRINGS.assignments.submission,
    name: "content",
    multiline: true,
    required: true,
  });
  field.querySelector("textarea").placeholder = STRINGS.assignments.submissionPlaceholder;
  const message = document.createElement("p");
  message.className = "form-message";
  message.hidden = true;
  const submit = document.createElement("button");
  submit.type = "submit";
  submit.className = "btn btn-primary";
  submit.textContent = STRINGS.assignments.submit;
  form.append(title, field, message, submit);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const confirmed = await confirmDialog({
      title: STRINGS.assignments.submitConfirmationTitle,
      message: STRINGS.assignments.submitConfirmation,
      confirmLabel: STRINGS.assignments.submit,
    });
    if (!confirmed) return;
    submit.disabled = true;
    try {
      await submitAssignment(assignment.id, { content: field.querySelector("textarea").value });
      showToast(STRINGS.assignments.submissionSuccess, { kind: "success" });
      await loadAssignment();
    } catch (error) {
      if (error.status === 409) {
        message.textContent = STRINGS.assignments.alreadySubmitted;
        message.hidden = false;
        showToast(STRINGS.assignments.alreadySubmitted, { kind: "error" });
      } else {
        showFieldErrors(form, error, message);
      }
      submit.disabled = false;
    }
  });
  return form;
}

/** Shows only student-authorized AI feedback and doctor-provided grade details. */
function createFeedbackCard(assignment) {
  const card = document.createElement("section");
  card.className = "card page-stack";
  const heading = document.createElement("h3");
  heading.textContent = STRINGS.assignments.submitted;
  const submittedDate = document.createElement("p");
  const date = formatDate(assignment.submitted_at);
  submittedDate.textContent = `${STRINGS.assignments.submittedAt}: ${date.absolute}`;
  const status = createStatusDot(assignment.is_late ? STRINGS.assignments.late : STRINGS.assignments.statusLabels.onTime, assignment.is_late ? "danger" : "success");
  card.append(heading, submittedDate, status);
  if (assignment.ai_feedback) {
    const feedbackTitle = document.createElement("h4");
    feedbackTitle.textContent = STRINGS.assignments.aiFeedback;
    const feedback = document.createElement("p");
    feedback.textContent = assignment.ai_feedback;
    card.append(feedbackTitle, feedback);
  }
  if (assignment.final_grade !== null) {
    const grade = document.createElement("p");
    grade.className = "grading-panel__score";
    grade.textContent = `${STRINGS.assignments.finalGrade}: ${assignment.final_grade} / ${assignment.max_grade}`;
    card.append(grade);
    if (assignment.doctor_feedback) {
      const label = document.createElement("h4");
      label.textContent = STRINGS.assignments.doctorFeedback;
      const comment = document.createElement("p");
      comment.textContent = assignment.doctor_feedback;
      card.append(label, comment);
    }
  }
  return card;
}

start();
