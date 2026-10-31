/**
 * js/components/page-state.js – Loading, empty, error, and ready page states.
 * Depends on: shared state components.
 */

import { createSkeleton } from "./skeleton.js";
import { createEmptyState } from "./empty-state.js";
import { createErrorState } from "./error-state.js";

/** Replaces page content with a state component or ready content. */
export function renderPageState(root, state, options = {}) {
  root.replaceChildren();
  if (state === "loading") root.append(createSkeleton(options.skeleton));
  else if (state === "empty") root.append(createEmptyState(options.message, options.action));
  else if (state === "error") root.append(createErrorState(options.message, options.retry));
  else if (options.content) root.append(options.content);
}
