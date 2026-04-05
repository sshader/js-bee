#!/usr/bin/env node

/**
 * Seed script to import problems into the Convex database.
 *
 * Usage:
 *   npx convex run problems:importProblems "$(node seed-problems.mjs)"
 *
 * Or to preview:
 *   node seed-problems.mjs | jq .
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const problems = JSON.parse(
  readFileSync(join(__dirname, "seed-problems.json"), "utf-8")
);

// Output the argument format expected by importProblems mutation
console.log(JSON.stringify({ problems }));
