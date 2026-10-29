/**
 * js/components/progress-ring.js – Accessible animated circular SVG progress ring.
 * Generates an SVG ring with customizable size, stroke width, accessible ARIA label,
 * and smooth dashoffset transition from 0 to target percentage.
 *
 * Depends on: css/components.css (for progress-ring styling).
 */

/**
 * Creates and returns an accessible SVG progress ring DOM element.
 *
 * @param {object} options
 * @param {number} options.value - Progress percentage (0 to 100).
 * @param {number} [options.size=64] - Diameter of the progress ring in pixels.
 * @param {number} [options.strokeWidth=6] - Stroke thickness in pixels.
 * @param {string} [options.label=""] - Accessible text description for screen readers.
 * @param {'aqua'|'primary'|'success'|'warning'} [options.variant='aqua'] - Color theme variant.
 * @returns {HTMLDivElement} Container element enclosing the accessible SVG progress ring.
 */
export function createProgressRing({
  value = 0,
  size = 64,
  strokeWidth = 6,
  label = "",
  variant = "aqua",
} = {}) {
  const clampedValue = Math.max(0, Math.min(100, Number(value) || 0));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const targetOffset = circumference - (clampedValue / 100) * circumference;
  const accessibleLabel = label || `Progress: ${clampedValue}%`;

  // Create wrapper container
  const wrapper = document.createElement("div");
  wrapper.className = "progress-ring-container";

  // Check motion preference: start from 0 and animate if motion is allowed
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const initialOffset = prefersReducedMotion ? targetOffset : circumference;

  wrapper.innerHTML = `
    <svg class="progress-ring progress-ring--${variant}" 
         width="${size}" 
         height="${size}" 
         viewBox="0 0 ${size} ${size}" 
         role="img" 
         aria-label="${accessibleLabel}">
      <!-- Track circle -->
      <circle class="progress-ring-track" 
              cx="${size / 2}" 
              cy="${size / 2}" 
              r="${radius}" 
              stroke-width="${strokeWidth}" />
      <!-- Animated progress circle -->
      <circle class="progress-ring-fill" 
              cx="${size / 2}" 
              cy="${size / 2}" 
              r="${radius}" 
              stroke-width="${strokeWidth}" 
              stroke-dasharray="${circumference}" 
              stroke-dashoffset="${initialOffset}" />
    </svg>
    <div class="progress-ring-label tabular-nums" aria-hidden="true">${Math.round(clampedValue)}%</div>
  `;

  // Trigger dashoffset animation on next animation frame if motion allowed
  if (!prefersReducedMotion) {
    requestAnimationFrame(() => {
      const fillCircle = wrapper.querySelector(".progress-ring-fill");
      if (fillCircle) {
        fillCircle.setAttribute("stroke-dashoffset", String(targetOffset));
      }
    });
  }

  return wrapper;
}
