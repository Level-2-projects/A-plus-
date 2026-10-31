/**
 * js/dev/test-runner.js – Core runner engine for dev/test-runner.html.
 * Executes test suites against the in-browser mock database, collects pass/fail metrics,
 * and renders clean, accessible visual reports with stack traces.
 *
 * Depends on: js/dev/test-scenarios.js
 */

import { SCENARIOS } from "./test-scenarios.js";

/** DOM Element references */
const runAllBtn = document.getElementById("run-all-btn");
const testResultsList = document.getElementById("test-results-list");
const summaryPassed = document.getElementById("summary-passed");
const summaryFailed = document.getElementById("summary-failed");
const summaryTotal = document.getElementById("summary-total");
const summaryDuration = document.getElementById("summary-duration");

/**
 * Executes a single scenario and records its runtime and error if any.
 *
 * @param {object} scenario
 * @returns {Promise<{ id: string, title: string, category: string, passed: boolean, error?: string, durationMs: number }>}
 */
async function runScenario(scenario) {
  const startTime = performance.now();
  try {
    await scenario.run();
    const durationMs = Math.round(performance.now() - startTime);
    return {
      id: scenario.id,
      title: scenario.title,
      category: scenario.category,
      passed: true,
      durationMs,
    };
  } catch (err) {
    const durationMs = Math.round(performance.now() - startTime);
    return {
      id: scenario.id,
      title: scenario.title,
      category: scenario.category,
      passed: false,
      error: err?.message || String(err),
      durationMs,
    };
  }
}

/**
 * Renders test results to the DOM.
 *
 * @param {Array<object>} results
 * @param {number} totalDurationMs
 */
function renderResults(results, totalDurationMs) {
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  summaryPassed.textContent = String(passedCount);
  summaryFailed.textContent = String(failedCount);
  summaryTotal.textContent = String(results.length);
  summaryDuration.textContent = `${totalDurationMs}ms`;

  testResultsList.innerHTML = results
    .map((res) => {
      const statusClass = res.passed ? "test-pass" : "test-fail";
      const statusLabel = res.passed ? "PASS" : "FAIL";
      const errorBlock = res.error
        ? `<pre class="test-error-log">${escapeHtml(res.error)}</pre>`
        : "";

      return `
        <li class="test-item ${statusClass}">
          <div class="test-header">
            <span class="test-badge">${statusLabel}</span>
            <div class="test-meta">
              <span class="test-category">${escapeHtml(res.category)}</span>
              <h3 class="test-title">${escapeHtml(res.title)}</h3>
            </div>
            <time class="test-duration">${res.durationMs}ms</time>
          </div>
          ${errorBlock}
        </li>
      `;
    })
    .join("");
}

/** Escapes HTML characters for safe rendering */
function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/** Runs all registered scenarios sequentially */
export async function runAllTests() {
  runAllBtn.disabled = true;
  runAllBtn.textContent = "Running Tests...";
  testResultsList.innerHTML = `<li class="test-running-state">Executing test scenarios against mock database...</li>`;

  const results = [];
  const overallStart = performance.now();

  for (const scenario of SCENARIOS) {
    const res = await runScenario(scenario);
    results.push(res);
  }

  const overallDuration = Math.round(performance.now() - overallStart);
  renderResults(results, overallDuration);

  runAllBtn.disabled = false;
  runAllBtn.textContent = "Run All Scenarios";
}

// Attach event listeners
runAllBtn?.addEventListener("click", runAllTests);

// Auto-run on load
window.addEventListener("DOMContentLoaded", () => {
  runAllTests();
});
