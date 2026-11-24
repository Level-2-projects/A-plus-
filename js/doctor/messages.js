/**
 * js/doctor/messages.js – Doctor message center: Compose, Sent outbox, and Received inbox.
 * Allows composing alerts to enrolled students, reviewing sent history, and viewing received
 * department administrative messages with unread indicators and read state updates.
 *
 * Depends on:
 *   - js/api/doctor-api.js
 *   - js/core/layout.js
 *   - js/config/strings.js
 *   - js/components/tabs.js
 *   - js/components/empty-state.js
 *   - js/components/error-state.js
 *   - js/components/form-field.js
 *   - js/components/skeleton.js
 *   - js/components/status-dot.js
 *   - js/components/date-format.js
 *   - js/components/toast.js
 */

import {
  getDoctorCourses,
  getDoctorMessages,
  getDoctorStudents,
  sendDoctorMessage,
  getDoctorInbox,
  markDoctorMessageRead,
} from "../api/doctor-api.js";
import { initDoctorPage, setPageTitle } from "../core/layout.js";
import { STRINGS } from "../config/strings.js";
import { createTabs } from "../components/tabs.js";
import { createEmptyState } from "../components/empty-state.js";
import { createErrorState } from "../components/error-state.js";
import { createFormField, showFieldErrors } from "../components/form-field.js";
import { createSkeleton } from "../components/skeleton.js";
import { createStatusDot } from "../components/status-dot.js";
import { formatDate } from "../components/date-format.js";
import { showToast } from "../components/toast.js";

const root = document.getElementById("page-content");
const requestedMessageId = new URLSearchParams(location.search).get("id");

let courses = [];
let sentMessages = [];
let receivedMessages = [];
let students = [];
let selectedCourseId = "";
let selectedReceivedId = null;
let activeTab = requestedMessageId ? "received" : "compose";

/** Mounts the doctor's message workspace and loads data. */
async function start() {
  initDoctorPage("messages");
  if (!root || !document.querySelector(".app-shell")) return;
  setPageTitle(STRINGS.messages.title);
  root.append(createSkeleton({ label: STRINGS.shared.loading }));
  await loadData();
}

/** Loads sent outbox, received inbox, and owned course options. */
async function loadData() {
  try {
    [courses, sentMessages, receivedMessages] = await Promise.all([
      getDoctorCourses(),
      getDoctorMessages(),
      getDoctorInbox(),
    ]);
    selectedCourseId ||= courses[0]?.id || "";
    if (selectedCourseId) {
      students = await getDoctorStudents(selectedCourseId);
    }
    renderView();

    if (requestedMessageId && !selectedReceivedId) {
      const target = receivedMessages.find((m) => m.id === requestedMessageId);
      if (target) {
        await openReceivedMessage(target);
      }
    }
  } catch (error) {
    root.replaceChildren(createErrorState(error.message || STRINGS.messages.loadError, loadData));
  }
}

/** Renders the top-level tabs and active pane (Compose, Sent, or Received). */
function renderView() {
  root.replaceChildren();
  setPageTitle(STRINGS.messages.title);

  const page = document.createElement("section");
  page.className = "page-stack";

  const title = document.createElement("h2");
  title.textContent = STRINGS.messages.title;

  const tabs = createTabs(
    [
      { value: "compose", label: STRINGS.messages.tabCompose },
      { value: "sent", label: STRINGS.messages.tabSent },
      { value: "received", label: STRINGS.messages.tabReceived },
    ],
    activeTab,
    (tab) => {
      activeTab = tab;
      renderView();
    },
    STRINGS.messages.title
  );

  page.append(title, tabs);

  if (activeTab === "compose") {
    page.append(createComposeForm());
  } else if (activeTab === "sent") {
    page.append(createSentView());
  } else {
    page.append(createReceivedView());
  }

  root.append(page);
}

/* ---------- 1. Compose Section ---------- */

/** Creates the validated composer form for whole-course or selected student alerts. */
function createComposeForm() {
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
      showToast(error.message || STRINGS.messages.loadError, { kind: "error" });
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
      activeTab = "sent";
      await loadData();
    } catch (requestError) {
      showFieldErrors(form, requestError, error);
      send.disabled = false;
    }
  });

  return form;
}

/** Updates the multi-select options with the currently selected course roster. */
function updateRecipientOptions(select) {
  select.replaceChildren();
  students.forEach((student) => {
    const option = document.createElement("option");
    option.value = student.student_id;
    option.textContent = student.name;
    select.append(option);
  });
}

/* ---------- 2. Sent Section ---------- */

/** Renders the list of sent broadcasts grouped by date and subject. */
function createSentView() {
  const container = document.createElement("div");
  container.className = "page-stack";

  const historyTitle = document.createElement("h3");
  historyTitle.textContent = STRINGS.messages.sentList;

  const list = document.createElement("div");
  list.className = "card-list";

  const grouped = groupMessages(sentMessages);
  if (!grouped.length) {
    list.append(createEmptyState(STRINGS.messages.noMessages));
  } else {
    grouped.forEach((message) => list.append(createSentMessageCard(message)));
  }

  container.append(historyTitle, list);
  return container;
}

/** Groups sent messages into broadcast entries with recipient counts. */
function groupMessages(rows) {
  const grouped = new Map();
  rows.forEach((message) => {
    const key = `${message.created_at}|${message.subject}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.recipient_count += 1;
    } else {
      grouped.set(key, { ...message, recipient_count: 1 });
    }
  });
  return [...grouped.values()];
}

/** Builds a card representing a sent broadcast entry. */
function createSentMessageCard(message) {
  const card = document.createElement("article");
  card.className = "card sent-message-card";

  const heading = document.createElement("div");
  heading.className = "assignment-card__header";

  const subject = document.createElement("h3");
  subject.textContent = message.subject;

  const type = createStatusDot(
    STRINGS.inboxTypes[message.type] || message.type,
    message.type === "warning" ? "warning" : "info"
  );
  heading.append(subject, type);

  const body = document.createElement("p");
  body.textContent = message.body;

  const meta = document.createElement("p");
  meta.textContent = `${formatDate(message.created_at).absolute} · ${message.recipient_count} ${STRINGS.messages.recipients}`;

  card.append(heading, body, meta);
  return card;
}

/* ---------- 3. Received Inbox Section ---------- */

/** Renders the 2-pane received messages interface (list and message details). */
function createReceivedView() {
  const panes = document.createElement("div");
  panes.className = "inbox-panes";

  panes.append(
    createReceivedList(),
    createReceivedDetail(receivedMessages.find((m) => m.id === selectedReceivedId))
  );

  return panes;
}

/** Creates the scrollable list of received messages. */
function createReceivedList() {
  const list = document.createElement("div");
  list.className = "message-list";
  list.setAttribute("role", "list");
  list.setAttribute("aria-label", STRINGS.messages.tabReceived);

  if (!receivedMessages.length) {
    list.append(createEmptyState(STRINGS.messages.noReceivedMessages));
    return list;
  }

  receivedMessages.forEach((message) => {
    list.append(createReceivedButton(message));
  });

  return list;
}

/** Creates one received message list item button with unread dot, sender, date, and type. */
function createReceivedButton(message) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `message-list-button${message.is_read ? "" : " is-unread"}`;
  button.setAttribute("role", "listitem");
  button.setAttribute("aria-current", String(message.id === selectedReceivedId));

  const row = document.createElement("span");
  row.className = "message-list-row";

  const subject = document.createElement("strong");
  subject.className = "message-list-subject";
  subject.textContent = message.subject;
  row.append(subject);

  if (!message.is_read) {
    const unreadDot = document.createElement("span");
    unreadDot.className = "message-unread-dot";
    unreadDot.setAttribute("aria-label", STRINGS.inbox.unread);
    row.append(unreadDot);
  }

  const senderInfo = document.createElement("span");
  senderInfo.className = "message-list-sender";
  const roleLabel = message.sender_type ? ` (${message.sender_type})` : "";
  senderInfo.textContent = `${message.sender_name || "Admin"}${roleLabel}`;

  const date = document.createElement("time");
  date.dateTime = message.created_at;
  date.textContent = formatDate(message.created_at).absolute;

  const typeDot = createStatusDot(
    STRINGS.inboxTypes[message.type] || message.type,
    typeVariant(message.type)
  );

  button.append(row, senderInfo, date, typeDot);
  button.addEventListener("click", () => openReceivedMessage(message));

  return button;
}

/** Opens a received message, displays its body, and marks it as read through the API. */
async function openReceivedMessage(message) {
  selectedReceivedId = message.id;
  history.replaceState(null, "", `${location.pathname}?id=${encodeURIComponent(message.id)}`);

  if (!message.is_read) {
    try {
      await markDoctorMessageRead(message.id);
      message.is_read = true;
    } catch (err) {
      showToast(err.message || STRINGS.inbox.markReadError, { kind: "error" });
    }
  }

  renderView();
}

/** Creates the detail view for the currently selected received message. */
function createReceivedDetail(message) {
  const detail = document.createElement("article");
  detail.className = "card message-detail";

  if (!message) {
    detail.append(createEmptyState(STRINGS.messages.selectMessageToRead));
    return detail;
  }

  const title = document.createElement("h3");
  title.textContent = message.subject;

  const sender = document.createElement("p");
  const roleLabel = message.sender_type ? ` (${message.sender_type})` : "";
  sender.textContent = `${STRINGS.inbox.from}: ${message.sender_name || "Admin"}${roleLabel}`;

  const date = document.createElement("time");
  date.dateTime = message.created_at;
  date.textContent = formatDate(message.created_at).absolute;

  const typeDot = createStatusDot(
    STRINGS.inboxTypes[message.type] || message.type,
    typeVariant(message.type)
  );

  const body = document.createElement("p");
  body.className = "message-body";
  body.textContent = message.body;

  detail.append(title, sender, date, typeDot, body);
  return detail;
}

/** Maps a message type to its status variant color. */
function typeVariant(type) {
  if (type === "warning") return "warning";
  if (type === "notice" || type === "suggestion") return "info";
  return "neutral";
}

/** Creates a hidden container for form error alerts. */
function createFormMessage() {
  const message = document.createElement("p");
  message.className = "form-message";
  message.hidden = true;
  return message;
}

start();
