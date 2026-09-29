import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { inspectIntegration } from "./doctor-rcos-integration.mjs";

async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "zcode-rcos-doctor-"));
  const rcos = path.join(root, "rcos");
  await fs.mkdir(path.join(rcos, "core"), { recursive: true });
  await fs.mkdir(path.join(rcos, "docs", "migration"), { recursive: true });
  await fs.writeFile(path.join(rcos, "README.md"), "# RCOS\n");
  await fs.writeFile(path.join(rcos, "docs", "migration", "kernel-import-files.json"), "{}\n");
  await fs.writeFile(
    path.join(rcos, "docs", "migration", "kernel-packaging-adjustments.json"),
    "{}\n",
  );
  return { root, rcos };
}

test("accepts a valid desktop and RCOS integration checkout", async () => {
  const { root, rcos } = await fixture();
  const result = inspectIntegration({
    desktopRoot: process.cwd(),
    rcosRoot: rcos,
    nodeVersion: "24.15.0",
    pnpmVersion: "10.33.2",
  });
  assert.deepEqual(result.issues, []);
  await fs.rm(root, { recursive: true, force: true });
});

test("reports a missing RCOS checkout with an actionable message", async () => {
  const result = inspectIntegration({
    desktopRoot: process.cwd(),
    rcosRoot: "/tmp/does-not-exist",
    nodeVersion: "24.15.0",
    pnpmVersion: "10.33.2",
  });
  assert.match(result.issues.join("\n"), /RCOS checkout not found/);
});

test("rejects an unsupported Node major", async () => {
  const { root, rcos } = await fixture();
  const result = inspectIntegration({
    desktopRoot: process.cwd(),
    rcosRoot: rcos,
    nodeVersion: "22.20.0",
    pnpmVersion: "10.33.2",
  });
  assert.match(result.issues.join("\n"), /Node\.js 24\+/);
  await fs.rm(root, { recursive: true, force: true });
});

test("reports missing desktop build entry points", async () => {
  const { root, rcos } = await fixture();
  const result = inspectIntegration({
    desktopRoot: path.join(root, "empty-desktop"),
    rcosRoot: rcos,
    nodeVersion: "24.15.0",
    pnpmVersion: "10.33.2",
  });
  assert.match(result.issues.join("\n"), /desktop package metadata not found/);
  await fs.rm(root, { recursive: true, force: true });
});
