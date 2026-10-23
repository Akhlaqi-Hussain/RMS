#!/usr/bin/env node
// =====================================================================
// RMS — make the CLIENT PACKAGE (R8-PKG).
//
//   npm run package
//
// Builds RMS as a self-contained server (Next.js "standalone", in the folder
// .next-package — the normal .next build is not touched) and puts everything a
// client computer needs into   dist/RMS/app/   — and nothing else:
//   server.js + .next-package/  the built program (no source code)
//   node_modules/               only what the program needs at run time
//   public/                     fonts and icons (NOT the demo menu pictures)
//   scripts/ + lib/rmsPaths.mjs backup, restore, create-manager, setup-production-db
//   database/migrations/        to create an empty database (NO test data)
//   LICENSE, VERSION.txt
//
// Then it CHECKS the package and stops with an error if it finds anything that
// must never reach a client: settings files (.env*), Git data, tests, test data,
// source folders, source maps, key files, or any secret value from your own
// settings file. The result is written to dist/RMS/PACKAGE-REPORT.txt with a
// SHA-256 checksum of every file.
//
// Build the package that goes to clients ON WINDOWS (this PC), so that the
// Windows-specific parts are the right ones. Node.js itself and the MySQL
// server are added by the installer (a later round), not here.
// =====================================================================
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { configFile } from "../lib/rmsPaths.mjs";
import { readEnvFile } from "./backup-lib.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist", "RMS");
const OUT = join(DIST, "app");
const BUILD = join(ROOT, ".next-package");
const args = process.argv.slice(2);

const step = (msg) => console.log(`\n== ${msg}`);
const fail = (msg) => { console.error(`\nPACKAGE FAILED: ${msg}`); process.exit(1); };

function listFiles(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...listFiles(p));
    else if (e.isFile()) out.push(p);
  }
  return out;
}
const rel = (p) => relative(OUT, p).split(sep).join("/");
const sha256 = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");

// ---------- 1. build ----------
function build() {
  if (args.includes("--skip-build") && existsSync(join(BUILD, "standalone", "server.js"))) {
    step("Build: skipped (--skip-build), using the existing .next-package");
    return;
  }
  step("Build: next build (standalone) into .next-package — the normal .next is not touched");
  const nextBin = join(ROOT, "node_modules", "next", "dist", "bin", "next");
  const r = spawnSync(process.execPath, [nextBin, "build", "--turbopack"], {
    cwd: ROOT, stdio: "inherit", env: { ...process.env, RMS_PACKAGE: "1", NODE_ENV: "production" },
  });
  if (r.status !== 0) fail("the build did not finish (see the messages above).");
  if (!existsSync(join(BUILD, "standalone", "server.js"))) fail("no standalone server was produced.");
}

// ---------- 2. dependency closure (from package-lock.json) ----------
// The scripts need mysql2 and bcrypt; the built server has mysql2 bundled into
// its own code, so these packages are copied separately, at the locked versions.
function closure(roots) {
  const lock = JSON.parse(readFileSync(join(ROOT, "package-lock.json"), "utf8")).packages;
  const found = new Set();
  const visit = (name, fromPath) => {
    // Node's lookup: nested node_modules first, then upwards
    let base = fromPath;
    for (;;) {
      const key = `${base ? base + "/" : ""}node_modules/${name}`;
      if (lock[key]) {
        if (found.has(key)) return;
        found.add(key);
        for (const dep of Object.keys(lock[key].dependencies || {})) visit(dep, key);
        return;
      }
      if (!base) fail(`package "${name}" is not in package-lock.json`);
      const i = base.lastIndexOf("/node_modules/");
      base = i >= 0 ? base.slice(0, i) : "";
    }
  };
  for (const r of roots) visit(r, "");
  return [...found].sort();
}

// ---------- 3. assemble ----------
function assemble() {
  step(`Assemble: ${OUT}`);
  rmSync(DIST, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });

  // the standalone server (server.js, .next-package/, node_modules/, public/, package.json)
  cpSync(join(BUILD, "standalone"), OUT, { recursive: true });
  // browser files (JavaScript/CSS chunks) — Next.js leaves them out of standalone
  cpSync(join(BUILD, "static"), join(OUT, ".next-package", "static"), { recursive: true });
  // public/ again from the project, so nothing is missing; then remove the demo
  // and test pictures (an installed RMS keeps its own pictures in the data folder)
  cpSync(join(ROOT, "public"), join(OUT, "public"), { recursive: true });
  rmSync(join(OUT, "public", "uploads"), { recursive: true, force: true });

  // admin scripts + the shared path rules they import
  mkdirSync(join(OUT, "scripts"), { recursive: true });
  for (const f of ["backup-lib.mjs", "backup.mjs", "restore.mjs", "create-manager.mjs", "setup-production-db.mjs"]) {
    cpSync(join(ROOT, "scripts", f), join(OUT, "scripts", f));
  }
  mkdirSync(join(OUT, "lib"), { recursive: true });
  cpSync(join(ROOT, "lib", "rmsPaths.mjs"), join(OUT, "lib", "rmsPaths.mjs"));

  // packages the scripts need (locked versions, copied from node_modules — no download)
  const pkgs = closure(["mysql2", "bcrypt"]);
  for (const key of pkgs) {
    const src = join(ROOT, ...key.split("/"));
    const dst = join(OUT, ...key.split("/"));
    if (!existsSync(src)) fail(`${key} is missing in node_modules — run npm ci first.`);
    if (!existsSync(dst)) cpSync(src, dst, { recursive: true });
  }
  console.log(`   packages for the scripts: ${pkgs.map((k) => k.replace(/^.*node_modules\//, "")).join(", ")}`);

  // empty-database migrations only (never the test data in database/seeds)
  cpSync(join(ROOT, "database", "migrations"), join(OUT, "database", "migrations"), { recursive: true });
  cpSync(join(ROOT, "LICENSE"), join(OUT, "LICENSE"));

  // no source maps
  let maps = 0;
  for (const f of listFiles(OUT)) if (f.endsWith(".map")) { rmSync(f); maps++; }
  console.log(`   source maps removed: ${maps}`);

  // version information
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  const git = spawnSync("git", ["rev-parse", "--short", "HEAD"], { cwd: ROOT, encoding: "utf8" });
  const dirty = spawnSync("git", ["status", "--porcelain", "--untracked-files=no"], { cwd: ROOT, encoding: "utf8" });
  const commit = git.status === 0 ? git.stdout.trim() : "unknown";
  const changed = dirty.status === 0 && dirty.stdout.trim() ? " (with uncommitted changes)" : "";
  writeFileSync(join(OUT, "VERSION.txt"),
    `RMS ${pkg.version}\ncommit ${commit}${changed}\nbuilt ${new Date().toISOString()} on ${process.platform}-${process.arch} with Node.js ${process.version}\n`);
}

// ---------- 4. check ----------
function check() {
  step("Check: nothing that must not reach a client");
  const files = listFiles(OUT);
  const problems = [];
  const top = readdirSync(OUT);

  for (const f of files) {
    const r = rel(f);
    const name = r.split("/").pop();
    if (/^\.env/i.test(name) || name === "rms.env" || name === "admin.env") problems.push(`settings file: ${r}`);
    if (r.split("/").includes(".git")) problems.push(`Git data: ${r}`);
    if (/\.(pem|key|p12|pfx)$/i.test(name) || /private.*key|owner-key/i.test(name)) problems.push(`key file: ${r}`);
    if (name.endsWith(".map")) problems.push(`source map: ${r}`);
    if (/seed/i.test(r) && r.startsWith("database/")) problems.push(`test data: ${r}`);
  }
  for (const d of ["app", "components", "context", "utils", "schemas", "tests", "locales", "docs", ".next", "src"]) {
    if (top.includes(d)) problems.push(`source/development folder: ${d}/`);
  }
  if (existsSync(join(OUT, "public", "uploads"))) problems.push("demo/test pictures: public/uploads/");

  // secrets from your own settings must not appear in any file
  const env = readEnvFile();
  const secrets = ["JWT_SECRET", "DB_PASSWORD", "MYSQL_ROOT_PASSWORD", "BACKUP_DB_PASSWORD"]
    .map((k) => [k, env[k]]).filter(([, v]) => v && v.length >= 8);
  for (const f of files) {
    if (statSync(f).size > 20 * 1024 * 1024) continue;
    const text = readFileSync(f).toString("latin1");
    for (const [k, v] of secrets) if (text.includes(v)) problems.push(`the value of ${k} (from ${configFile(ROOT)}) appears in ${rel(f)}`);
  }
  console.log(`   secret values checked: ${secrets.length ? secrets.map(([k]) => k).join(", ") : "none set in the settings file"}`);

  // must be there
  for (const need of ["server.js", ".next-package/BUILD_ID", "scripts/backup.mjs", "scripts/restore.mjs",
    "lib/rmsPaths.mjs", "node_modules/mysql2/package.json", "node_modules/bcrypt/package.json",
    "database/migrations/001_create_tables.sql", "database/migrations/002_create_procedures.sql"]) {
    if (!existsSync(join(OUT, ...need.split("/")))) problems.push(`missing: ${need}`);
  }
  const winBcrypt = join(OUT, "node_modules", "bcrypt", "prebuilds", "win32-x64");
  if (!existsSync(winBcrypt) || !readdirSync(winBcrypt).length) problems.push("missing: the Windows (win32-x64) bcrypt binary");

  // the packages the scripts need can be loaded from the package itself
  const load = spawnSync(process.execPath, ["-e", "require('mysql2/promise'); require('bcrypt'); console.log('ok')"], { cwd: OUT, encoding: "utf8" });
  if (load.status !== 0 || !load.stdout.includes("ok")) problems.push(`mysql2/bcrypt cannot be loaded from the package: ${(load.stderr || "").split("\n")[0]}`);

  return { files, problems };
}

// ---------- 5. report ----------
function report({ files, problems }) {
  const total = files.reduce((n, f) => n + statSync(f).size, 0);
  const lines = [
    "RMS client package — report",
    readFileSync(join(OUT, "VERSION.txt"), "utf8").trim(),
    `files: ${files.length}, size: ${(total / 1024 / 1024).toFixed(1)} MB`,
    problems.length ? `CHECK: FAILED\n${problems.map((p) => `  - ${p}`).join("\n")}` : "CHECK: OK — no settings, secrets, Git data, tests, test data, source code, source maps or key files",
    "",
    "SHA-256  file",
    ...files.map((f) => `${sha256(f)}  ${rel(f)}`).sort((a, b) => a.slice(66).localeCompare(b.slice(66))),
  ];
  writeFileSync(join(DIST, "PACKAGE-REPORT.txt"), lines.join("\n") + "\n");
  step("Result");
  console.log(`   ${files.length} files, ${(total / 1024 / 1024).toFixed(1)} MB in ${OUT}`);
  console.log(`   report: ${join(DIST, "PACKAGE-REPORT.txt")}`);
  if (problems.length) fail(`the package check found ${problems.length} problem(s):\n${problems.map((p) => `  - ${p}`).join("\n")}`);
  console.log("\nOK  Package ready and checked.");
}

build();
assemble();
report(check());
