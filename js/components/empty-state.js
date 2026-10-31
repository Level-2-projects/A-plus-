/**
 * js/components/empty-state.js – Consistent empty content presentation.
 * Depends on: css/components.css.
 */

/** Creates a semantic empty-state section with optional action. */
export function createEmptyState(message, action = null) {
  const section = document.createElement("section");
  section.className = "empty-state";
  section.setAttribute("aria-live", "polite");
  const text = document.createElement("p");
  text.textContent = message;
  section.append(text);
  if (action) section.append(action);
  return section;
}
