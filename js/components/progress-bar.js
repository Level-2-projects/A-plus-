/**
 * js/components/progress-bar.js - Accessible native progress bar styled with A Plus tokens.
 * Uses the browser's progress value instead of inline styles.
 */

/** Creates a determinate progress element with a descriptive accessible label. */
export function createProgressBar(value, label) {
  const progress = document.createElement("progress");
  progress.className = "progress-bar-native";
  progress.max = 100;
  progress.value = Math.max(0, Math.min(100, Number(value) || 0));
  progress.setAttribute("aria-label", label);
  return progress;
}
