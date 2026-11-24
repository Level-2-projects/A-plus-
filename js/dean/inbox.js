/**
 * js/dean/inbox.js – Dean Inbox page.
 * Two-pane layout (list + detail) mirroring the student inbox pattern.
 * Unread messages shown with a solid gold dot; opening marks as read via API.
 * Filter tabs: All and Unread.
 *
 * Depends on: js/core/layout.js, js/api/dean-api.js, shared components.
 */

import { getDeanInbox, markDeanMessageRead } from "../api/dean-api.js";
import { createEmptyState } from "../components/empty-state.js";
import { createErrorState } from "../components/error-state.js";
import { createSkeleton } from "../components/skeleton.js";
import { createStatusDot } from "../components/status-dot.js";
import { createTabs } from "../components/tabs.js";
import { showToast } from "../components/toast.js";
import { STRINGS } from "../config/strings.js";
import { initDeanPage, setPageTitle } from "../core/layout.js";

initDeanPage("inbox");
setPageTitle(STRINGS.pages.deanInbox);

const S = STRINGS.deanInbox;
const content = document.getElementById("page-content");

// ─── State ────────────────────────────────────────────────────────────────────

let messages = [];
let selectedId = null;
let activeFilter = "all";

// ─── Type → dot variant mapping ───────────────────────────────────────────────

function typeVariant(type) {
  if (type === "warning") return "warning";
  if (type === "notice" || type === "suggestion") return "info";
  return "neutral";
}

/** Formats an ISO date string as a locale date string. */
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

// ─── Render helpers ───────────────────────────────────────────────────────────

/** Creates the scrollable message list filtered by activeFilter. */
function createMessageList() {
  const list = document.createElement("div");
  list.className = "message-list";
  list.setAttribute("role", "list");
  list.setAttribute("aria-label", S.title);

  const visible = messages.filter((m) => {
    if (activeFilter === "unread") return !m.is_read;
    return true;
  });

  if (!visible.length) {
    list.append(createEmptyState(S.noMessages));
    return list;
  }

  visible.forEach((msg) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `message-list-button${msg.is_read ? "" : " is-unread"}`;
    btn.setAttribute("role", "listitem");
    btn.setAttribute("aria-current", String(msg.id === selectedId));

    const row = document.createElement("span");
    row.className = "message-list-row";

    const subject = document.createElement("strong");
    subject.className = "message-list-subject";
    subject.textContent = msg.subject;
    row.append(subject);

    if (!msg.is_read) {
      const dot = document.createElement("span");
      dot.className = "message-unread-dot";
      dot.setAttribute("aria-label", S.unread);
      row.append(dot);
    }

    const sender = document.createElement("span");
    sender.className = "message-list-sender";
    sender.textContent = msg.sender_name || "";

    const date = document.createElement("time");
    date.dateTime = msg.created_at;
    date.textContent = fmtDate(msg.created_at);

    const typeDot = createStatusDot(
      STRINGS.inboxTypes?.[msg.type] || msg.type || "",
      typeVariant(msg.type)
    );

    btn.append(row, sender, date, typeDot);
    btn.addEventListener("click", () => openMessage(msg));
    list.append(btn);
  });

  return list;
}

/** Creates the message detail pane for the currently selected message. */
function createMessageDetail(msg) {
  const detail = document.createElement("article");
  detail.className = "card message-detail";

  if (!msg) {
    detail.append(createEmptyState(S.chooseMessage));
    return detail;
  }

  const title = document.createElement("h3");
  title.textContent = msg.subject;

  const from = document.createElement("p");
  from.textContent = `${S.from}: ${msg.sender_name || ""}`;

  const date = document.createElement("time");
  date.dateTime = msg.created_at;
  date.textContent = fmtDate(msg.created_at);

  const typeDot = createStatusDot(
    STRINGS.inboxTypes?.[msg.type] || msg.type || "",
    typeVariant(msg.type)
  );

  const body = document.createElement("p");
  body.className = "message-body";
  body.textContent = msg.body;

  detail.append(title, from, date, typeDot, body);
  return detail;
}

// ─── Render page ──────────────────────────────────────────────────────────────

function renderInbox() {
  content.replaceChildren();

  const page = document.createElement("section");
  page.className = "page-stack";

  const h1 = document.createElement("h1");
  h1.textContent = S.title;

  const tabs = createTabs(
    [
      { value: "all",    label: S.all    },
      { value: "unread", label: S.unread },
    ],
    activeFilter,
    (filter) => {
      activeFilter = filter;
      renderInbox();
    },
    S.title
  );

  const panes = document.createElement("div");
  panes.className = "inbox-panes";
  panes.append(
    createMessageList(),
    createMessageDetail(messages.find((m) => m.id === selectedId))
  );

  page.append(h1, tabs, panes);
  content.append(page);
}

// ─── Open & mark read ─────────────────────────────────────────────────────────

async function openMessage(msg) {
  selectedId = msg.id;
  if (!msg.is_read) {
    try {
      await markDeanMessageRead(msg.id);
      msg.is_read = true;
      // Notify other tabs via storage event so the badge updates
      localStorage.setItem("aplus_dean_inbox_read", Date.now());
    } catch {
      showToast(S.markReadError, { kind: "error" });
    }
  }
  renderInbox();
}

// ─── Load ─────────────────────────────────────────────────────────────────────

async function loadInbox() {
  content.innerHTML = "";
  content.append(createSkeleton({ lines: 4, label: STRINGS.shared.loading }));

  try {
    messages = await getDeanInbox();
    renderInbox();
  } catch {
    content.innerHTML = "";
    content.append(createErrorState(S.loadError, loadInbox));
  }
}

loadInbox();
