/**
 * js/components/status-dot.js – Solid-dot text status indicator.
 * Depends on: css/components.css.
 */

/** Creates the shared dot-and-label status component. */
export function createStatusDot(label, variant = "neutral") {
  const status = document.createElement("span");
  status.className = `status status-${variant}`;
  status.textContent = label;
  return status;
}
