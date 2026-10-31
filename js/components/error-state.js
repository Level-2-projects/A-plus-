/**
 * js/components/error-state.js – Retryable error presentation.
 * Depends on: css/components.css, js/config/strings.js.
 */

import { STRINGS } from "../config/strings.js";

/** Creates an accessible error state and invokes retry on user request. */
export function createErrorState(message, retry) {
  const section = document.createElement("section");
  section.className = "error-state";
  section.setAttribute("role", "alert");
  const text = document.createElement("p");
  text.textContent = message || STRINGS.shared.loadError;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "btn btn-secondary";
  button.textContent = STRINGS.shared.retry;
  button.addEventListener("click", retry);
  section.append(text, button);
  return section;
}
