/**
 * js/components/metric-card.js - Accessible count-up metric card.
 * Depends on existing tokens and the shared count-up initializer.
 */

/** Creates a metric card whose value is animated by initCountUp. */
export function createMetricCard(label, value, suffix = "") {
  const card = document.createElement("article");
  card.className = "card metric-card";
  const heading = document.createElement("h3");
  heading.textContent = label;
  const number = document.createElement("p");
  const numericValue = Number(value) || 0;
  const decimalPart = String(numericValue).split(".")[1];
  number.className = "metric-card__value tabular-nums";
  number.dataset.countUp = String(numericValue);
  number.dataset.countDecimals = decimalPart ? String(decimalPart.length) : "0";
  number.dataset.countSuffix = suffix;
  number.textContent = `0${suffix}`;
  card.append(heading, number);
  return card;
}
