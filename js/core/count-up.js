/**
 * js/core/count-up.js – Viewport-triggered numerical count-up animation.
 * Smoothly animates numbers from 0 to a target value using requestAnimationFrame and cubic ease-out.
 * Supports decimal precision, prefix/suffix formatting, and locale thousands separators via Intl.NumberFormat.
 * Respects prefers-reduced-motion by rendering the final value immediately.
 *
 * Depends on: Nothing (Native Web APIs: IntersectionObserver, requestAnimationFrame, Intl).
 */

const DURATION_MS = 800;

/**
 * Standard cubic ease-out easing function.
 * @param {number} t - Progress between 0 and 1.
 * @returns {number} Eased progress between 0 and 1.
 */
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Animates a single DOM element from 0 to its target numeric value.
 *
 * @param {HTMLElement} element - Target element with data-count-up attribute.
 */
function animateCount(element) {
  const rawTarget = element.getAttribute("data-count-up");
  if (rawTarget === null || rawTarget === "") return;

  const targetValue = parseFloat(rawTarget);
  if (isNaN(targetValue)) return;

  const decimals = parseInt(element.getAttribute("data-count-decimals") || "0", 10);
  const prefix = element.getAttribute("data-count-prefix") || "";
  const suffix = element.getAttribute("data-count-suffix") || "";

  // Locale formatter for thousands separators and decimal precision
  const formatter = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  // Render final value immediately if reduced motion is requested
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) {
    element.textContent = `${prefix}${formatter.format(targetValue)}${suffix}`;
    return;
  }

  let startTime = null;

  function step(currentTime) {
    if (!startTime) startTime = currentTime;
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / DURATION_MS, 1);
    const easedProgress = easeOutCubic(progress);
    const currentValue = targetValue * easedProgress;

    element.textContent = `${prefix}${formatter.format(currentValue)}${suffix}`;

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      element.textContent = `${prefix}${formatter.format(targetValue)}${suffix}`;
    }
  }

  requestAnimationFrame(step);
}

/**
 * Initializes count-up animations on all elements matching [data-count-up] within a root container.
 * Uses IntersectionObserver to trigger each animation strictly once when it enters the viewport.
 *
 * @param {HTMLElement|Document} [root=document] - Root container to search within.
 * @returns {IntersectionObserver|null} The observer instance, or null if observer is unsupported.
 */
export function initCountUp(root = document) {
  const elements = root.querySelectorAll("[data-count-up]");
  if (elements.length === 0) return null;

  // Fallback for environments lacking IntersectionObserver
  if (!("IntersectionObserver" in window)) {
    elements.forEach((el) => animateCount(el));
    return null;
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          obs.unobserve(el); // Run animation strictly once
          animateCount(el);
        }
      });
    },
    { threshold: 0.15 }
  );

  elements.forEach((el) => observer.observe(el));
  return observer;
}
