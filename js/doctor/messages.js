/**
 * js/doctor/messages.js – Doctor message composer and sent-message history.
 * Depends on: doctor API, shared layout, and shared UI components.
 */

import { getDoctorCourses, getDoctorMessages, getDoctorStudents, sendDoctorMessage } from "../api/doctor-api.js";
import { initDoctorPage } from "../core/layout.js";
import { STRINGS } from "../config/strings.js";
import { createEmptyState } from "../components/empty-state.js";
import { createErrorState } from "../components/error-state.js";
import { createFormField, showFieldErrors } from "../components/form-field.js";
import { createSkeleton } from "../components/skeleton.js";
import { createStatusDot } from "../components/status-dot.js";
import { formatDate } from "../components/date-format.js";
import { showToast } from "../components/toast.js";

const root = document.getElementById("page-content");
let courses = [];
let messages = [];
let students = [];
let selectedCourseId = "";

/** Mounts the doctor's message center and loads owned courses and sent items. */
async function start() {
  initDoctorPage("messages");
  if (!root || !document.querySelector(".app-shell")) return;
  root.append(createSkeleton({ label: STRINGS.shared.loading }));
  await loadMessages();
}

/** Loads message history and course choices with a retryable failure state. */
async function loadMessages() {
  try {
    [courses, messages] = await Promise.all([getDoctorCourses(), getDoctorMessages()]);
    selectedCourseId ||= courses[0]?.id || "";
    if (selectedCourseId) students = await getDoctorStudents(selectedCourseId);
    renderMessages();
  } catch (error) {
    root.replaceChildren(createErrorState(error.message || STRINGS.shared.loadError, loadMessages));
  }
}

/** Renders the composer and grouped sent-message history. */
function renderMessages() {
  root.replaceChildren();
  const page = document.createElement("section");
  page.className = "page-stack";
  const title = document.createElement("h2");
  title.textContent = STRINGS.messages.title;
  page.append(title, createMessageForm());
  const historyTitle = document.createElement("h3");
  historyTitle.textContent = STRINGS.messages.sentList;
  const list = document.createElement("div");
  list.className = "card-list";
  const grouped = groupMessages(messages);
  if (!grouped.length) list.append(createEmptyState(STRINGS.messages.noMessages));
  grouped.forEach((message) => list.append(createSentMessageCard(message)));
  page.append(historyTitle, list);
  root.append(page);
}

/** Creates the validated composer with whole-course or selected recipients. */
function createMessageForm() {
  const form = document.createElement("form");
  form.className = "card page-stack";
  const title = document.createElement("h3");
  title.textContent = STRINGS.messages.compose;
  const courseField = createFormField({
    label: STRINGS.messages.course,
    name: "course_id",
    required: true,
    options: [
      { value: "", text: STRINGS.messages.chooseCourse },
      ...courses.map((course) => ({ value: course.id, text: `${course.code} — ${course.title}` })),
    ],
  });
  const courseSelect = courseField.querySelector("select");
  courseSelect.value = selectedCourseId;
  courseSelect.addEventListener("change", async () => {
    selectedCourseId = courseSelect.value;
    try {
      students = selectedCourseId ? await getDoctorStudents(selectedCourseId) : [];
      updateRecipientOptions(recipientSelect);
    } catch (error) {
      showToast(error.message || STRINGS.shared.loadError, { kind: "error" });
    }
  });
  const allStudents = document.createElement("input");
  allStudents.type = "checkbox";
  allStudents.name = "all_students";
  allStudents.checked = true;
  const recipientLabel = document.createElement("label");
  recipientLabel.className = "checkbox-label";
  recipientLabel.append(allStudents, document.createTextNode(STRINGS.messages.allStudents));
  const recipientField = createFormField({
    label: STRINGS.messages.selectedStudents,
    name: "recipient_ids",
    options: [{ value: "", text: STRINGS.messages.selectStudents }],
  });
  const recipientSelect = recipientField.querySelector("select");
  recipientSelect.multiple = true;
  recipientSelect.disabled = true;
  recipientSelect.setAttribute("aria-label", STRINGS.messages.selectedStudents);
  updateRecipientOptions(recipientSelect);
  allStudents.addEventListener("change", () => {
    recipientSelect.disabled = allStudents.checked;
  });
  const typeField = createFormField({
    label: STRINGS.messages.type,
    name: "type",
    required: true,
    options: [
      { value: "notice", text: STRINGS.inboxTypes.notice },
      { value: "warning", text: STRINGS.inboxTypes.warning },
      { value: "suggestion", text: STRINGS.inboxTypes.suggestion },
    ],
  });
  const subjectField = createFormField({ label: STRINGS.messages.subject, name: "subject", required: true });
  const bodyField = createFormField({ label: STRINGS.messages.body, name: "body", multiline: true, required: true });
  bodyField.querySelector("textarea").placeholder = STRINGS.messages.bodyPlaceholder;
  const error = createFormMessage();
  const send = document.createElement("button");
  send.type = "submit";
  send.className = "btn btn-primary";
  send.textContent = STRINGS.messages.send;
  form.append(title, courseField, recipientLabel, recipientField, typeField, subjectField, bodyField, error, send);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const recipientIds = allStudents.checked ? [] : data.getAll("recipient_ids").map(String).filter(Boolean);
    if (!allStudents.checked && !recipientIds.length) {
      error.textContent = STRINGS.messages.selectStudents;
      error.hidden = false;
      recipientSelect.focus();
      return;
    }
    send.disabled = true;
    try {
      await sendDoctorMessage({
        course_id: String(data.get("course_id")),
        recipient_ids: recipientIds,
        type: String(data.get("type")),
        subject: String(data.get("subject")),
        body: String(data.get("body")),
      });
      showToast(STRINGS.messages.sent, { kind: "success" });
      await loadMessages();
    } catch (requestError) {
      showFieldErrors(form, requestError, error);
      send.disabled = false;
    }
  });
  return form;
}

/** Updates the multi-select with the currently selected course roster. */
function updateRecipientOptions(select) {
  select.replaceChildren();
  students.forEach((student) => {
    const option = document.createElement("option");
    option.value = student.student_id;
    option.textContent = student.name;
    select.append(option);
  });
}

/** Groups per-recipient messages into sent-message rows with recipient totals. */
function groupMessages(rows) {
  const grouped = new Map();
  rows.forEach((message) => {
    const key = `${message.created_at}|${message.subject}`;
    const existing = grouped.get(key);
    if (existing) existing.recipient_count += 1;
    else grouped.set(key, { ...message, recipient_count: 1 });
  });
  return [...grouped.values()];
}

/** Builds one outbox card without exposing any student-specific details. */
function createSentMessageCard(message) {
  const card = document.createElement("article");
  card.className = "card sent-message-card";
  const heading = document.createElement("div");
  heading.className = "assignment-card__header";
  const subject = document.createElement("h3");
  subject.textContent = message.subject;
  const type = createStatusDot(STRINGS.inboxTypes[message.type] || message.type, message.type === "warning" ? "warning" : "info");
  heading.append(subject, type);
  const body = document.createElement("p");
  body.textContent = message.body;
  const meta = document.createElement("p");
  meta.textContent = `${formatDate(message.created_at).absolute} · ${message.recipient_count} ${STRINGS.messages.recipients}`;
  card.append(heading, body, meta);
  return card;
}

/** Creates a hidden form-level error message for unmapped request errors. */
function createFormMessage() {
  const message = document.createElement("p");
  message.className = "form-message";
  message.hidden = true;
  return message;
}

start();
