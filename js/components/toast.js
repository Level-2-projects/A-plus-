/**
 * js/components/toast.js – Accessible, auto-dismissing feedback messages.
 * Depends on: css/components.css, js/config/strings.js.
 */

import { STRINGS } from "../config/strings.js";

/** Shows a live-region toast for a completed or failed action. */
export function showToast(message, { kind = "info", duration = 4000 } = {}) {
  const region = document.getElementById("toast-region") || createToastRegion();
  const toast = document.createElement("div");
  toast.className = `toast toast--${kind}`;
  toast.setAttribute("role", kind === "error" ? "alert" : "status");
  toast.textContent = message;
  region.append(toast);
  window.setTimeout(() => toast.remove(), duration);
}

/** Creates the shared polite live region when the first toast is requested. */
function createToastRegion() {
  const region = document.createElement("div");
  region.id = "toast-region";
  region.className = "toast-region";
  region.setAttribute("aria-label", STRINGS.shared.feedback);
  region.setAttribute("aria-live", "polite");
  document.body.append(region);
  return region;
}
