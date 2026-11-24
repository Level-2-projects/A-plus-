/**
 * js/dean/announcements.js – Dean Broadcast Announcements page.
 * Two-tab layout: Compose (send to audience) and Sent (broadcast history).
 *
 * Compose: audience select (college, all_students, all_doctors, department,
 *   dept_students, dept_doctors, course), conditional department / course
 *   selects, subject, body, type. Field errors from API (422), success toast
 *   with recipient count, then switches to Sent tab.
 *
 * Sent: table of past broadcasts (audience, subject, recipients, date).
 *
 * Depends on: js/core/layout.js, js/api/dean-api.js, shared components.
 */

import { getDeanDepartments, getDeanMessages, sendDeanMessage } from "../api/dean-api.js";
import { createEmptyState } from "../components/empty-state.js";
import { createErrorState } from "../components/error-state.js";
import { createFormField, showFieldErrors } from "../components/form-field.js";
import { createSkeleton } from "../components/skeleton.js";
import { createTabs } from "../components/tabs.js";
import { showToast } from "../components/toast.js";
import { STRINGS } from "../config/strings.js";
import { initDeanPage, setPageTitle } from "../core/layout.js";

initDeanPage("announcements");
setPageTitle(STRINGS.pages.deanAnnouncements);

const S = STRINGS.deanAnnouncements;
const content = document.getElementById("page-content");

// ─── State ────────────────────────────────────────────────────────────────────

let activeTab = "compose";
let departments = [];
let sentList = [];

// ─── Audience options ─────────────────────────────────────────────────────────

/** Audiences that require a department_id. */
const DEPT_AUDIENCES = new Set(["department", "dept_students", "dept_doctors"]);
/** Audiences that require a course_id. */
const COURSE_AUDIENCES = new Set(["course"]);

const AUDIENCE_OPTIONS = [
  { value: "college",      text: S.audienceCollege      },
  { value: "all_students", text: S.audienceAllStudents  },
  { value: "all_doctors",  text: S.audienceAllDoctors   },
  { value: "department",   text: S.audienceDepartment   },
  { value: "dept_students",text: S.audienceDeptStudents },
  { value: "dept_doctors", text: S.audienceDeptDoctors  },
  { value: "course",       text: S.audienceCourse       },
];

const TYPE_OPTIONS = [
  { value: "notice",     text: S.typeNotice     },
  { value: "warning",    text: S.typeWarning    },
  { value: "suggestion", text: S.typeSuggestion },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns a human-readable audience label for the sent list. */
function audienceLabel(broadcast) {
  const base = AUDIENCE_OPTIONS.find((o) => o.value === broadcast.audience)?.text || broadcast.audience;
  if (broadcast.audience === "course" && broadcast.course_id) {
    return `${base}`;
  }
  return base;
}

/** Formats an ISO date string as a locale date string. */
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

// ─── Compose tab ──────────────────────────────────────────────────────────────

function renderComposeTab() {
  const wrap = document.createElement("div");
  wrap.className = "dashboard-section";

  const form = document.createElement("form");
  form.className = "settings-form";
  form.noValidate = true;

  // Audience select (using createFormField with options)
  const audienceField = createFormField({
    label: S.audience,
    name: "audience",
    required: true,
    options: AUDIENCE_OPTIONS,
  });
  form.append(audienceField);

  // Department select — shown only for dept-scoped audiences
  const deptOptions = [{ value: "", text: `— ${S.departmentLabel} —` }].concat(
    departments.map((d) => ({ value: d.id, text: d.name }))
  );
  const deptField = createFormField({
    label: S.departmentLabel,
    name: "department_id",
    options: deptOptions,
  });
  deptField.hidden = true;
  form.append(deptField);

  // Course select — shown only for "course" audience
  // We build courses from dept selection; start empty
  const courseField = createFormField({
    label: S.courseLabel,
    name: "course_id",
    options: [{ value: "", text: `— ${S.courseLabel} —` }],
  });
  courseField.hidden = true;
  form.append(courseField);

  // Subject, body, type
  const subjectField = createFormField({ label: S.subject, name: "subject", required: true });
  const bodyField    = createFormField({ label: S.body,    name: "body",    required: true, multiline: true });
  const typeField    = createFormField({ label: S.type,    name: "type",    options: TYPE_OPTIONS });
  form.append(subjectField, bodyField, typeField);

  // Form-level error paragraph
  const message = document.createElement("p");
  message.className = "form-message";
  form.append(message);

  // Submit button
  const send = document.createElement("button");
  send.type = "submit";
  send.className = "btn btn-primary";
  send.textContent = S.send;
  form.append(send);

  // Show/hide dept & course fields based on audience
  const audienceSelect = audienceField.querySelector("select");
  audienceSelect.addEventListener("change", () => {
    const val = audienceSelect.value;
    deptField.hidden = !DEPT_AUDIENCES.has(val) && !COURSE_AUDIENCES.has(val);
    courseField.hidden = !COURSE_AUDIENCES.has(val);
  });

  form.addEventListener("submit", async (evt) => {
    evt.preventDefault();
    send.disabled = true;
    message.textContent = "";

    const data = Object.fromEntries(new FormData(form));
    // Remove empty optional keys so API doesn't get confused
    if (!data.department_id) delete data.department_id;
    if (!data.course_id)     delete data.course_id;

    try {
      const result = await sendDeanMessage(data);
      showToast(S.sentSuccess(result.sent_count), { kind: "success" });
      // Reload sent list and switch to Sent tab
      await reloadSent();
      activeTab = "sent";
      renderPage();
    } catch (error) {
      if (error?.status === 422) {
        showFieldErrors(form, error, message);
      } else {
        showToast(error?.message || S.sendError, { kind: "error" });
      }
      send.disabled = false;
    }
  });

  wrap.append(form);
  return wrap;
}

// ─── Sent tab ─────────────────────────────────────────────────────────────────

function renderSentTab() {
  const wrap = document.createElement("div");
  wrap.className = "dashboard-section";

  if (!sentList.length) {
    wrap.append(createEmptyState(S.sentListEmpty));
    return wrap;
  }

  const table = document.createElement("table");
  table.className = "data-table";

  const thead = table.createTHead().insertRow();
  [S.audience, S.subject, S.recipients, S.sentAt].forEach((label) => {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = label;
    thead.append(th);
  });

  const tbody = table.createTBody();
  sentList.forEach((broadcast) => {
    const tr = tbody.insertRow();
    [
      audienceLabel(broadcast),
      broadcast.subject,
      String(broadcast.recipient_count ?? "—"),
      fmtDate(broadcast.created_at),
    ].forEach((text) => {
      const td = tr.insertCell();
      td.textContent = text;
    });
  });

  const scroll = document.createElement("div");
  scroll.className = "table-scroll";
  scroll.setAttribute("role", "region");
  scroll.setAttribute("aria-label", S.sent);
  scroll.tabIndex = 0;
  scroll.append(table);
  wrap.append(scroll);
  return wrap;
}

// ─── Load & render ────────────────────────────────────────────────────────────

async function reloadSent() {
  sentList = await getDeanMessages();
}

function renderPage() {
  content.innerHTML = "";

  const h1 = document.createElement("h1");
  h1.textContent = S.title;
  content.append(h1);

  const tabsEl = createTabs(
    [
      { value: "compose", label: S.compose },
      { value: "sent",    label: S.sent    },
    ],
    activeTab,
    (tab) => {
      activeTab = tab;
      renderPage();
    },
    S.title
  );
  content.append(tabsEl);

  if (activeTab === "compose") {
    content.append(renderComposeTab());
  } else {
    content.append(renderSentTab());
  }
}

async function loadPage() {
  content.innerHTML = "";
  content.append(createSkeleton({ lines: 3, label: STRINGS.shared.loading }));

  try {
    [departments, sentList] = await Promise.all([getDeanDepartments(), getDeanMessages()]);
  } catch {
    content.innerHTML = "";
    content.append(createErrorState(S.loadError, loadPage));
    return;
  }

  renderPage();
}

loadPage();
