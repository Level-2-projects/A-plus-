/**
 * js/dean/settings.js – Dean College Settings page.
 * Renders a form for the five institutional thresholds and point values.
 * On save: PATCH /dean/settings, show success toast and last-updated info.
 * "Reset to defaults" shows a confirmation dialog then POSTs the defaults.
 * API validation messages (422) are mapped to inline field errors.
 *
 * Default values match the seed constants in mock-runtime.js:
 *   absence_warning_threshold: 3, rating_cooldown_days: 30,
 *   points_submission_on_time: 10, points_quiz_completion: 5,
 *   points_attendance_present: 2.
 *
 * Depends on: js/core/layout.js, js/api/dean-api.js, shared components.
 */

import { getDeanSettings, updateDeanSettings } from "../api/dean-api.js";
import { confirmDialog } from "../components/dialog.js";
import { createErrorState } from "../components/error-state.js";
import { createFormField, showFieldErrors } from "../components/form-field.js";
import { createSkeleton } from "../components/skeleton.js";
import { showToast } from "../components/toast.js";
import { STRINGS } from "../config/strings.js";
import { initDeanPage, setPageTitle } from "../core/layout.js";

initDeanPage("settings");
setPageTitle(STRINGS.pages.deanSettings);

const S = STRINGS.deanSettings;
const content = document.getElementById("page-content");

// ─── Default values ───────────────────────────────────────────────────────────

const DEFAULTS = {
  absence_warning_threshold:  3,
  rating_cooldown_days:       30,
  points_submission_on_time:  10,
  points_quiz_completion:     5,
  points_attendance_present:  2,
};

// ─── Field definitions ────────────────────────────────────────────────────────

const FIELD_DEFS = [
  { name: "absence_warning_threshold",  label: S.absenceThreshold,  hint: S.absenceThresholdHint  },
  { name: "rating_cooldown_days",       label: S.ratingCooldown,    hint: S.ratingCooldownHint    },
  { name: "points_submission_on_time",  label: S.pointsSubmission,  hint: S.pointsSubmissionHint  },
  { name: "points_quiz_completion",     label: S.pointsQuiz,        hint: S.pointsQuizHint        },
  { name: "points_attendance_present",  label: S.pointsAttendance,  hint: S.pointsAttendanceHint  },
];

// ─── Date formatter ───────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── Render ───────────────────────────────────────────────────────────────────

function renderSettings(settings) {
  content.innerHTML = "";

  const h1 = document.createElement("h1");
  h1.textContent = S.title;
  content.append(h1);

  // Last-updated line
  if (settings.updated_at) {
    const meta = document.createElement("p");
    meta.className = "settings-meta";
    meta.textContent = S.lastUpdated(fmtDate(settings.updated_at));
    content.append(meta);
  }

  const form = document.createElement("form");
  form.className = "settings-form";
  form.noValidate = true;

  // Render each field with a hint paragraph beneath it
  FIELD_DEFS.forEach(({ name, label, hint }) => {
    const field = createFormField({ label, name, type: "number", required: true });
    // Set current value
    const input = field.querySelector("input");
    if (input) input.value = settings[name] ?? DEFAULTS[name] ?? "";
    // Hint text
    const hintEl = document.createElement("p");
    hintEl.className = "field-hint";
    hintEl.textContent = hint;
    field.append(hintEl);
    form.append(field);
  });

  // Form-level error area
  const message = document.createElement("p");
  message.className = "form-message";
  form.append(message);

  // Action buttons
  const actions = document.createElement("div");
  actions.className = "confirm-dialog__actions";

  const resetBtn = document.createElement("button");
  resetBtn.type = "button";
  resetBtn.className = "btn btn-secondary";
  resetBtn.textContent = S.resetBtn;

  const saveBtn = document.createElement("button");
  saveBtn.type = "submit";
  saveBtn.className = "btn btn-primary";
  saveBtn.textContent = S.save;

  actions.append(resetBtn, saveBtn);
  form.append(actions);
  content.append(form);

  // ── Save handler ──
  form.addEventListener("submit", async (evt) => {
    evt.preventDefault();
    saveBtn.disabled = true;
    message.textContent = "";

    const data = Object.fromEntries(new FormData(form));
    // Convert numeric strings to numbers
    const payload = {};
    FIELD_DEFS.forEach(({ name }) => {
      if (data[name] !== "") payload[name] = Number(data[name]);
    });

    try {
      const updated = await updateDeanSettings(payload);
      showToast(S.saved, { kind: "success" });
      renderSettings(updated);
    } catch (error) {
      showFieldErrors(form, error, message);
      saveBtn.disabled = false;
    }
  });

  // ── Reset handler ──
  resetBtn.addEventListener("click", async () => {
    const confirmed = await confirmDialog({
      title: S.resetConfirmTitle,
      message: S.resetConfirmMsg,
      confirmLabel: S.resetBtn,
    });
    if (!confirmed) return;

    resetBtn.disabled = true;
    try {
      const updated = await updateDeanSettings(DEFAULTS);
      showToast(S.saved, { kind: "success" });
      renderSettings(updated);
    } catch (error) {
      showToast(error?.message || S.saveError, { kind: "error" });
      resetBtn.disabled = false;
    }
  });
}

// ─── Load ─────────────────────────────────────────────────────────────────────

async function loadSettings() {
  content.innerHTML = "";
  content.append(createSkeleton({ lines: 5, label: STRINGS.shared.loading }));

  try {
    const settings = await getDeanSettings();
    renderSettings(settings);
  } catch {
    content.innerHTML = "";
    content.append(createErrorState(S.loadError, loadSettings));
  }
}

loadSettings();
