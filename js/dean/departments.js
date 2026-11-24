/**
 * js/dean/departments.js – Dean Academic Departments page.
 * Lists all departments in a data table; provides a "Create Department" dialog
 * that provisions the department and its admin account with a one-time
 * temporary password display.
 *
 * Depends on: js/core/layout.js, js/api/dean-api.js, shared components.
 */

import { createDeanDepartment, getDeanDepartments } from "../api/dean-api.js";
import { createDataTable } from "../components/data-table.js";
import { createEmptyState } from "../components/empty-state.js";
import { createErrorState } from "../components/error-state.js";
import { createFormField, showFieldErrors } from "../components/form-field.js";
import { createSkeleton } from "../components/skeleton.js";
import { showToast } from "../components/toast.js";
import { STRINGS } from "../config/strings.js";
import { initDeanPage, setPageTitle } from "../core/layout.js";

const S = STRINGS.deanDepartments;

initDeanPage("departments");
setPageTitle(STRINGS.pages.deanDepartments);

const content = document.getElementById("page-content");

// ─── helpers ────────────────────────────────────────────────────────────────

function createButton(label, className, onClick) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = className;
  btn.textContent = label;
  btn.addEventListener("click", onClick);
  return btn;
}

/** Shows a one-time temporary password modal that is removed when closed. */
function showTemporaryPassword(password) {
  const dialog = document.createElement("dialog");
  dialog.className = "confirm-dialog";
  const form = document.createElement("form");
  form.method = "dialog";
  form.className = "confirm-dialog__form";

  const title = document.createElement("h2");
  title.textContent = STRINGS.adminStudents.passwordTitle;
  const note = document.createElement("p");
  note.textContent = STRINGS.adminStudents.passwordNotice;
  const value = document.createElement("code");
  value.textContent = password;
  const copy = createButton(STRINGS.adminStudents.copy, "btn btn-secondary", async () => {
    await navigator.clipboard?.writeText(password);
    showToast(STRINGS.adminStudents.copied, { kind: "success" });
  });
  const close = document.createElement("button");
  close.className = "btn btn-primary";
  close.value = "close";
  close.textContent = STRINGS.shared.close;

  form.append(title, note, value, copy, close);
  dialog.append(form);
  document.body.append(dialog);
  dialog.showModal();
  dialog.addEventListener("close", () => dialog.remove(), { once: true });
}

// ─── create dialog ───────────────────────────────────────────────────────────

function openCreateDialog(onSuccess) {
  const dialog = document.createElement("dialog");
  dialog.className = "confirm-dialog";

  const form = document.createElement("form");
  form.method = "dialog";
  form.className = "confirm-dialog__form";
  form.noValidate = true;

  const title = document.createElement("h2");
  title.textContent = S.createDialogTitle;

  const nameField    = createFormField({ label: S.name,            name: "name",               required: true });
  const codeField    = createFormField({ label: S.code,            name: "code",               required: true });
  const adminName    = createFormField({ label: S.adminFullName,   name: "admin_full_name",    required: true });
  const adminEmail   = createFormField({ label: S.adminEmail,      name: "admin_email",        type: "email", required: true });
  const adminUniId   = createFormField({ label: S.adminUniversityId, name: "admin_university_id", required: true });

  const message = document.createElement("p");
  message.className = "form-message";

  const actions = document.createElement("div");
  actions.className = "confirm-dialog__actions";
  const cancel = createButton(STRINGS.shared.cancel, "btn btn-secondary", () => dialog.close());
  const save   = document.createElement("button");
  save.type    = "submit";
  save.className = "btn btn-primary";
  save.textContent = S.save;
  actions.append(cancel, save);

  form.append(title, nameField, codeField, adminName, adminEmail, adminUniId, message, actions);
  dialog.append(form);
  document.body.append(dialog);
  dialog.showModal();
  dialog.addEventListener("close", () => dialog.remove(), { once: true });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    save.disabled = true;
    message.textContent = "";

    const data = Object.fromEntries(new FormData(form));
    try {
      const result = await createDeanDepartment(data);
      dialog.close();
      showToast(S.created, { kind: "success" });
      showTemporaryPassword(result.temp_password);
      await onSuccess();
    } catch (error) {
      if (error?.status === 409) {
        showToast(error.message || "Conflict.", { kind: "error" });
      } else {
        showFieldErrors(form, error, message);
      }
      save.disabled = false;
    }
  });
}

// ─── table ───────────────────────────────────────────────────────────────────

function renderTable(departments) {
  const columns = [
    { key: "name",          label: "Name" },
    { key: "code",          label: "Code" },
    { key: "admin",         label: S.admin },
    { key: "student_count", label: S.students },
    { key: "doctor_count",  label: S.doctors },
    { key: "course_count",  label: S.courses },
    {
      key: "actions",
      label: S.actions,
      render: (row) => {
        const link = document.createElement("a");
        link.href = `department.html?id=${encodeURIComponent(row.id)}`;
        link.className = "btn btn-secondary btn--sm";
        link.textContent = S.viewDetails;
        return link;
      },
    },
  ];

  return createDataTable({
    columns,
    rows: departments,
    label: S.title,
    emptyMessage: S.noDepartments,
  });
}

// ─── main ────────────────────────────────────────────────────────────────────

async function loadDepartments() {
  content.innerHTML = "";

  // Page heading row
  const heading = document.createElement("div");
  heading.className = "page-heading-row";
  const h1 = document.createElement("h1");
  h1.textContent = S.title;
  const addBtn = createButton(S.create, "btn btn-primary", () =>
    openCreateDialog(loadDepartments)
  );
  heading.append(h1, addBtn);
  content.append(heading);

  // Data area
  const dataArea = document.createElement("div");
  dataArea.append(createSkeleton({ lines: 4, label: STRINGS.shared.loading }));
  content.append(dataArea);

  try {
    const departments = await getDeanDepartments();
    dataArea.innerHTML = "";
    dataArea.append(renderTable(departments));
  } catch {
    dataArea.innerHTML = "";
    dataArea.append(createErrorState(S.loadError, loadDepartments));
  }
}

loadDepartments();
