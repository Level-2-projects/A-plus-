/**
 * check-assets.mjs
 *
 * Verifies that all static assets referenced in HTML, CSS, and JS files exist on disk:
 * 1. HTML <link href="...">, <script src="...">, <img src="...">
 * 2. CSS url("...") and @import "..."
 * 3. JS static file references (e.g., BRANDING.logoPath)
 *
 * Usage: node dev/check-assets.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

let totalChecked = 0;
let errors = [];

/** Resolves and verifies one local asset reference. */
function checkFileExists(referrerPath, refTarget) {
  // Ignore external URLs, data URLs, anchors, mailto, etc.
  if (/^(https?:|\/\/|data:|blob:|mailto:|#)/i.test(refTarget)) {
    return;
  }

  // Strip query string and hash
  const cleanRef = refTarget.split("?")[0].split("#")[0].trim();
  if (!cleanRef) return;

  totalChecked++;

  let targetPath;
  if (cleanRef.startsWith("/")) {
    // Relative to repo root
    targetPath = path.join(rootDir, cleanRef.slice(1));
  } else {
    // Relative to referrer file directory
    targetPath = path.resolve(path.dirname(referrerPath), cleanRef);
  }

  if (!fs.existsSync(targetPath)) {
    errors.push({
      referrer: path.relative(rootDir, referrerPath),
      ref: refTarget,
      resolved: path.relative(rootDir, targetPath)
    });
  }
}

/** Extracts static file references from one supported source file. */
function scanFile(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".html") {
    // Match href, src
    const attrRegex = /\b(?:href|src)=["']([^"']+)["']/gi;
    let match;
    while ((match = attrRegex.exec(content)) !== null) {
      checkFileExists(filePath, match[1]);
    }
  } else if (ext === ".css") {
    // Match url(...)
    const urlRegex = /url\(\s*["']?([^"')]+)["']?\s*\)/gi;
    let match;
    while ((match = urlRegex.exec(content)) !== null) {
      checkFileExists(filePath, match[1]);
    }
    // Match @import "..."
    const importRegex = /@import\s+["']([^"']+)["']/gi;
    while ((match = importRegex.exec(content)) !== null) {
      checkFileExists(filePath, match[1]);
    }
  } else if (ext === ".js" || ext === ".mjs") {
    // Check BRANDING.logoPath in config.js or similar
    const logoRegex = /logoPath:\s*["']([^"']+)["']/g;
    let match;
    while ((match = logoRegex.exec(content)) !== null) {
      checkFileExists(filePath, match[1]);
    }
  }
}

/** Recursively scans project sources while skipping generated and hidden folders. */
function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === "Desktop") {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath);
    } else if (/\.(html|css|js|mjs)$/i.test(entry.name)) {
      scanFile(fullPath);
    }
  }
}

console.log("Starting static asset integrity check across repository...");
walkDir(rootDir);

console.log(`Checked ${totalChecked} asset references.`);

if (errors.length > 0) {
  console.error(`FAILED: ${errors.length} broken reference(s) found:`);
  for (const err of errors) {
    console.error(`  - ${err.referrer}: "${err.ref}" -> resolved to missing: ${err.resolved}`);
  }
  process.exit(1);
} else {
  console.log("PASS: All referenced static assets exist on disk.");
  process.exit(0);
}
