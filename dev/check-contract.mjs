/**
 * dev/check-contract.mjs – Validates that docs/api-contract.md and the mock router routes stay in sync.
 *
 * Scans all router files under js/mock/routes/*.js and compares their registered
 * (METHOD, path) definitions with the documented endpoints in docs/api-contract.md.
 * Fails with a non-zero exit code if any route is missing in either.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const authRoutes = await import("../js/mock/routes/auth-routes.js");
const adminRoutes = await import("../js/mock/routes/admin-routes.js");
const deanRoutes = await import("../js/mock/routes/dean-routes.js");
const doctorRoutes = await import("../js/mock/routes/doctor-routes.js");
const studentRoutes = await import("../js/mock/routes/student-routes.js");

const allRouteDefs = [
  ...authRoutes.getRoutes(),
  ...adminRoutes.getRoutes(),
  ...deanRoutes.getRoutes(),
  ...doctorRoutes.getRoutes(),
  ...studentRoutes.getRoutes(),
];

/** Converts a registered route regular expression into its documented path form. */
function normalizeRegexToPath(regex) {
  let s = regex.source;
  s = s.replace(/^\^/, "").replace(/\$$/, "");
  s = s.replace(/\\\//g, "/");
  s = s.replace(/\(\[\^\/\]\+\)/g, "{id}");
  return s;
}

const routerRoutes = new Set(
  allRouteDefs.map(([method, pattern]) => `${method.toUpperCase()} ${normalizeRegexToPath(pattern)}`)
);

const contractFile = path.join(rootDir, "docs/api-contract.md");
const contractContent = fs.readFileSync(contractFile, "utf8");

// Matches:
// - **Method / Path:** `METHOD /path`
// or in markdown tables: | Role | METHOD | `/path` |
const patternMethodPath = /- \*\*Method \/ Path:\*\*\s*`([A-Z]+)\s+([^`]+)`/g;
const patternTable = /\|\s*(?:Public|Student|Doctor|Dept Admin|Dean)\s*\|\s*(GET|POST|PUT|PATCH|DELETE)\s*\|\s*`([^`]+)`/g;

function normalizeDocPath(p) {
  return p.replace(/\{[^}]+\}/g, "{id}").replace(/\?.*$/, "").trim();
}

const documentedInDetail = new Set(
  [...contractContent.matchAll(patternMethodPath)].map((m) => `${m[1].toUpperCase()} ${normalizeDocPath(m[2])}`)
);

const documentedInTable = new Set(
  [...contractContent.matchAll(patternTable)].map((m) => `${m[1].toUpperCase()} ${normalizeDocPath(m[2])}`)
);

console.log(`Router routes count:     ${routerRoutes.size}`);
console.log(`Contract detailed count:  ${documentedInDetail.size}`);
console.log(`Contract table count:     ${documentedInTable.size}`);

const missingDetail = [...routerRoutes].filter((r) => !documentedInDetail.has(r)).sort();
const missingTable = [...routerRoutes].filter((r) => !documentedInTable.has(r)).sort();
const extraDetail = [...documentedInDetail].filter((r) => !routerRoutes.has(r)).sort();
const extraTable = [...documentedInTable].filter((r) => !routerRoutes.has(r)).sort();

let failed = false;

if (missingDetail.length > 0) {
  console.error("\n[ERROR] Routes in router but missing detailed section in docs/api-contract.md:");
  missingDetail.forEach((r) => console.error(`  - ${r}`));
  failed = true;
}

if (missingTable.length > 0) {
  console.error("\n[ERROR] Routes in router but missing in summary table in docs/api-contract.md:");
  missingTable.forEach((r) => console.error(`  - ${r}`));
  failed = true;
}

if (extraDetail.length > 0) {
  console.error("\n[ERROR] Routes documented in detail but not found in router:");
  extraDetail.forEach((r) => console.error(`  - ${r}`));
  failed = true;
}

if (extraTable.length > 0) {
  console.error("\n[ERROR] Routes in summary table but not found in router:");
  extraTable.forEach((r) => console.error(`  - ${r}`));
  failed = true;
}

if (failed) {
  process.exit(1);
} else {
  console.log("\n[SUCCESS] All routes are completely and symmetrically documented in docs/api-contract.md!");
}
