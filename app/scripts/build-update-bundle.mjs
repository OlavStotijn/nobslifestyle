#!/usr/bin/env node
// Packages the already-built app/dist into a versioned zip + manifest.json
// for the native app's live-update check (see src/liveUpdate.ts) to find.
// Run after `npm run build`, then deploy from the repo root — wrangler.jsonc
// serves app/dist as static assets, so anything written under dist/updates/
// is reachable at https://nobslifestyle.com/updates/... once deployed.
//
// Deliberately NOT run as part of every `npm run build` — that would turn
// every local test build into "the latest live update" pushed to every
// installed app. Run this, then deploy, only when you actually mean to ship
// a live update.
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const distDir = path.join(appDir, "dist");
const updatesDir = path.join(distDir, "updates");

if (!existsSync(distDir)) {
  console.error("app/dist doesn't exist — run `npm run build` first.");
  process.exit(1);
}

const version = execSync("git rev-parse --short HEAD", { cwd: appDir }).toString().trim();
const zipName = `${version}.zip`;

// Clear any previous run's output before zipping dist's contents, so the
// zip never ends up containing a stale updates/ folder (or itself).
rmSync(updatesDir, { recursive: true, force: true });
mkdirSync(updatesDir, { recursive: true });

const entries = readdirSync(distDir).filter((e) => e !== "updates");
execSync(`zip -r -q "${path.join(updatesDir, zipName)}" ${entries.map((e) => `"${e}"`).join(" ")}`, {
  cwd: distDir,
});

writeFileSync(
  path.join(updatesDir, "manifest.json"),
  JSON.stringify({ version, url: `https://nobslifestyle.com/updates/${zipName}` }, null, 2)
);

console.log(`Live-update bundle ready: dist/updates/${zipName} (version ${version})`);
console.log("Next: deploy from the repo root (npm run deploy) to publish it.");
