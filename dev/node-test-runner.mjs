/**
 * dev/node-test-runner.mjs – Command-line runner for the A Plus mock scenarios.
 *
 * Run with:
 *   node dev/node-test-runner.mjs
 *
 * It reuses the same scenario definitions as the browser runner, but initializes the
 * minimal browser shims required by the mock database and storage listeners.
 */

import "./node-test-shim.js";
import { SCENARIOS } from "../js/dev/test-scenarios.js";

let passedCount = 0;
let failedCount = 0;

for (const scenario of SCENARIOS) {
  try {
    await scenario.run();
    passedCount += 1;
    console.log(`PASS  ${scenario.id}  ${scenario.title}`);
  } catch (error) {
    failedCount += 1;
    console.log(`FAIL  ${scenario.id}  ${scenario.title}`);
    console.log(`      ${error?.message || String(error)}`);
  }
}

console.log(`\nSUMMARY: ${passedCount} passed, ${failedCount} failed`);

if (failedCount > 0) {
  process.exitCode = 1;
}
