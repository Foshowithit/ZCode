#!/usr/bin/env node

import fs from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const REQUIRED_SCRIPTS = ["bootstrap", "build:bootstrap", "bundle:desktop"];
const REQUIRED_RCOS_FILES = [
  "core",
  "docs/migration/kernel-import-files.json",
  "docs/migration/kernel-packaging-adjustments.json",
];

function parseMajor(version) {
  const match = String(version).match(/^(?:v)?(\d+)/);
  return match ? Number(match[1]) : NaN;
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

export function inspectIntegration({
  desktopRoot,
  rcosRoot,
  nodeVersion = process.versions.node,
  pnpmVersion = null,
} = {}) {
  const issues = [];
  const desktopPackage = readJson(path.join(desktopRoot ?? "", "package.json"));
  if (!desktopPackage) {
    issues.push("desktop package metadata not found: expected package.json at the repository root");
  } else {
    const scripts = desktopPackage.scripts ?? {};
    for (const script of REQUIRED_SCRIPTS) {
      if (!scripts[script]) issues.push(`desktop package script missing: ${script}`);
    }
    if (parseMajor(nodeVersion) < 24) issues.push(`Node.js 24+ is required (found ${nodeVersion})`);
    if (pnpmVersion !== null && pnpmVersion !== "10.33.2") {
      issues.push(`pnpm 10.33.2 is required (found ${pnpmVersion})`);
    }
  }

  if (!rcosRoot || !fs.existsSync(rcosRoot)) {
    issues.push(`RCOS checkout not found: ${rcosRoot || "<set RCOS_CHECKOUT or pass --rcos>"}`);
  } else {
    for (const relative of REQUIRED_RCOS_FILES) {
      if (!fs.existsSync(path.join(rcosRoot, relative))) {
        issues.push(`RCOS checkout missing required path: ${relative}`);
      }
    }
  }

  return { ok: issues.length === 0, issues };
}

function printUsage() {
  console.log("Usage: node scripts/doctor-rcos-integration.mjs --rcos <path>");
  console.log("Checks desktop metadata and the separate RCOS checkout without network access.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    printUsage();
    process.exit(0);
  }
  const index = process.argv.indexOf("--rcos");
  const rcosRoot = index >= 0 ? process.argv[index + 1] : process.env.RCOS_CHECKOUT;
  let pnpmVersion = null;
  try {
    pnpmVersion = execFileSync("pnpm", ["--version"], { encoding: "utf8" }).trim();
  } catch {
    pnpmVersion = "not installed";
  }
  const result = inspectIntegration({ desktopRoot: process.cwd(), rcosRoot, pnpmVersion });
  if (!result.ok) {
    console.error("[rcos-integration-doctor] failed");
    for (const issue of result.issues) console.error(`- ${issue}`);
    process.exit(1);
  }
  console.log("[rcos-integration-doctor] OK");
}
