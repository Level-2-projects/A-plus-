/**
 * js/components/skeleton.js – Loading placeholders for page content.
 * Depends on: css/components.css.
 */

/** Creates an accessible skeleton block without hard-coding page layout. */
export function createSkeleton({ lines = 3, label = "Loading" } = {}) {
  const section = document.createElement("section");
  section.className = "skeleton-group";
  section.setAttribute("aria-label", label);
  section.setAttribute("aria-busy", "true");
  for (let index = 0; index < lines; index += 1) {
    const line = document.createElement("span");
    line.className = "skeleton skeleton-line";
    section.append(line);
  }
  return section;
}
