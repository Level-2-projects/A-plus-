/**
 * js/student/inbox.js – Student inbox filters, message reader, and read state.
 * Depends on: student API, shared layout, and shared UI components.
 */

import { getInbox, markMessageRead } from "../api/student-api.js";
import { initStudentPage } from "../core/layout.js";
import { STRINGS } from "../config/strings.js";
import { createTabs } from "../components/tabs.js";
import { createEmptyState } from "../components/empty-state.js";
import { createErrorState } from "../components/error-state.js";
import { createSkeleton } from "../components/skeleton.js";
import { createStatusDot } from "../components/status-dot.js";
import { formatDate } from "../components/date-format.js";
import { showToast } from "../components/toast.js";

const root = document.getElementById("page-content");
const requestedMessageId = new URLSearchParams(location.search).get("id");
let messages = [];
let selectedMessageId = null;
let activeFilter = "all";

/** Mounts the inbox and loads the current student's message list. */
async function start() {
  initStudentPage("inbox");
  if (!root || !document.querySelector(".app-shell")) return;
  root.append(createSkeleton({ label: STRINGS.shared.loading }));
  await loadMessages();
}

/** Loads inbox rows and opens an explicitly requested notification message. */
async function loadMessages() {
  try {
    messages = await getInbox();
    renderInbox();
    const requested = messages.find((message) => message.id === requestedMessageId);
    if (requested && !selectedMessageId) await openMessage(requested);
  } catch (error) {
    root.replaceChildren(createErrorState(error.message || STRINGS.inbox.loadError, loadMessages));
  }
}

/** Renders the filter tabs and responsive message-list/detail panes. */
function renderInbox() {
  root.replaceChildren();
  const page = document.createElement("section");
  page.className = "page-stack";
  const title = document.createElement("h2");
  title.textContent = STRINGS.inbox.title;
  const tabs = createTabs([
    { value: "all", label: STRINGS.inbox.all },
    { value: "unread", label: STRINGS.inbox.unread },
    { value: "warning", label: STRINGS.inbox.warning },
    { value: "notice", label: STRINGS.inbox.notice },
    { value: "suggestion", label: STRINGS.inbox.suggestion },
    { value: "system", label: STRINGS.inbox.system },
  ], activeFilter, (filter) => {
    activeFilter = filter;
    renderInbox();
  }, STRINGS.inbox.title);
  const panes = document.createElement("div");
  panes.className = "inbox-panes";
  panes.append(
    createMessageList(),
    createMessageDetail(messages.find((message) => message.id === selectedMessageId))
  );
  page.append(title, tabs, panes);
  root.append(page);
}

/** Creates the scrollable message list filtered by the current tab. */
function createMessageList() {
  const list = document.createElement("div");
  list.className = "message-list";
  list.setAttribute("role", "list");
  list.setAttribute("aria-label", STRINGS.inbox.title);
  const visible = messages.filter((message) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "unread") return !message.is_read;
    return message.type === activeFilter;
  });
  if (!visible.length) {
    list.append(createEmptyState(STRINGS.inbox.noMessages));
    return list;
  }
  visible.forEach((message) => list.append(createMessageButton(message)));
  return list;
}

/** Creates a keyboard-accessible message selector with unread emphasis. */
function createMessageButton(message) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `message-list-button${message.is_read ? "" : " is-unread"}`;
  button.setAttribute("role", "listitem");
  button.setAttribute("aria-current", String(message.id === selectedMessageId));
  const row = document.createElement("span");
  row.className = "message-list-row";
  const subject = document.createElement("strong");
  subject.className = "message-list-subject";
  subject.textContent = message.subject;
  row.append(subject);
  if (!message.is_read) {
    const unread = document.createElement("span");
    unread.className = "message-unread-dot";
    unread.setAttribute("aria-label", STRINGS.inbox.unread);
    row.append(unread);
  }
  const sender = document.createElement("span");
  sender.className = "message-list-sender";
  sender.textContent = message.sender_name;
  const date = document.createElement("time");
  date.dateTime = message.created_at;
  date.textContent = formatDate(message.created_at).absolute;
  const type = createStatusDot(STRINGS.inboxTypes[message.type] || message.type, typeVariant(message.type));
  button.append(row, sender, date, type);
  button.addEventListener("click", () => openMessage(message));
  return button;
}

/** Opens a message, updates the URL, and persists unread-to-read state. */
async function openMessage(message) {
  selectedMessageId = message.id;
  history.replaceState(null, "", `${location.pathname}?id=${encodeURIComponent(message.id)}`);
  if (!message.is_read) {
    try {
      await markMessageRead(message.id);
      message.is_read = true;
    } catch (error) {
      showToast(error.message || STRINGS.inbox.markReadError, { kind: "error" });
    }
  }
  renderInbox();
}

/** Creates a selected message's full content or a neutral selection prompt. */
function createMessageDetail(message) {
  const detail = document.createElement("article");
  detail.className = "card message-detail";
  if (!message) {
    detail.append(createEmptyState(STRINGS.inbox.chooseMessage));
    return detail;
  }
  const title = document.createElement("h3");
  title.textContent = message.subject;
  const sender = document.createElement("p");
  sender.textContent = `${STRINGS.inbox.from}: ${message.sender_name}`;
  const date = document.createElement("time");
  date.dateTime = message.created_at;
  date.textContent = formatDate(message.created_at).absolute;
  const type = createStatusDot(STRINGS.inboxTypes[message.type] || message.type, typeVariant(message.type));
  const body = document.createElement("p");
  body.className = "message-body";
  body.textContent = message.body;
  detail.append(title, sender, date, type, body);
  return detail;
}

/** Maps message types to the established dot palette without colored boxes. */
function typeVariant(type) {
  if (type === "warning") return "warning";
  if (type === "notice" || type === "suggestion") return "info";
  return "neutral";
}

start();
