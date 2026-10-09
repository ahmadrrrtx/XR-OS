#!/usr/bin/env bun
/**
 * XR — publish lockstep gate (ADR-XR-028 / ratification checklist A-2, C-D04).
 *
 * THE failure class this gate exists to kill: npm published `@rrrtx/xr@3.1.5`
 * while source, tag, installers and site moved to 7.1.0 — drift by accident.
 * Law: publishing is lockstep or it does not happen. Every surface must carry
 * the ONE manifest version; a tag must equal it; the npm registry is checked
 * at release time and VERIFIED after publish.
 *
 * Authority note (LAW 01): this script does NOT re-own stamp-drift detection —
 * `release:check` (release-manifest.ts) and `channel:check` remain the
 * authorities for stamped-surface and channel-template drift, invoked here as
 * sub-gates via --with-subgates. What this script owns and nothing else does:
 *
 *   1. the canonical version triple (manifest ↔ package.json ↔ version.ts ↔
 *      install.sh ↔ install.ps1 ↔ website) as a fast, fixture-testable check
 *   2. tag ↔ manifest agreement (--tag vX.Y.Z)
 *   3. npm registry agreement (--check-npm pre-publish; --post-publish after)
 *
 * Modes:
 *   (default)        canonical surfaces + optional --tag agreement
 *   --with-subgates  also run release:check, channel:check, claim-lint
 *   --check-npm      query the npm registry; FAIL if published latest is
 *                    NEWER than the manifest (drift direction that can never
 *                    be legitimate), otherwise report and pass
 *   --post-publish   npm latest MUST equal the manifest version, exactly
 *   --published-version <v>   hermetic override of the registry (tests only)
 *   --root <dir>     repo root to operate on (default: cwd)
 *
 * Fail-closed everywhere (LAW 16): unreadable surface, unreachable registry,
 * unparsable JSON — all resolve to DRIFT/FAIL with a reason, never to pass.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

interface Args {
  root: string;
  tag?: string;
  withSubgates: boolean;
  checkNpm: boolean;
  postPublish: boolean;
  publishedVersion?: string;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { root: process.cwd(), withSubgates: false, checkNpm: false, postPublish: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--root") args.root = argv[++i] ?? "";
    else if (a === "--tag") args.tag = argv[++i] ?? "";
    else if (a === "--with-subgates") args.withSubgates = true;
    else if (a === "--check-npm") args.checkNpm = true;
    else if (a === "--post-publish") args.postPublish = true;
    else if (a === "--published-version") args.publishedVersion = argv[++i] ?? "";
  }
  return args;
}

interface Check { surface: string; expected: string; found: string; ok: boolean; note?: string }
const checks: Check[] = [];

function fail(msg: string): never {
  console.error(`[publish-lockstep] FAIL-CLOSED: ${msg}`);
  process.exit(1);
}

function readJson(abs: string, surface: string): Record<string, unknown> {
  if (!existsSync(abs)) fail(`surface missing: ${surface} (${abs})`);
  try {
    return JSON.parse(readFileSync(abs, "utf8")) as Record<string, unknown>;
  } catch (e) {
    fail(`surface unparsable: ${surface} — ${e instanceof Error ? e.message : String(e)}`);
  }
}

function compareVersion(surface: string, found: string | undefined, expected: string): void {
  checks.push({ surface, expected, found: found ?? "(absent)", ok: found === expected });
}

function firstMatch(text: string, re: RegExp): string | undefined {
  const m = text.match(re);
  return m?.[1];
}

function readText(abs: string, surface: string): string {
  if (!existsSync(abs)) fail(`surface missing: ${surface} (${abs})`);
  return readFileSync(abs, "utf8");
}

async function npmLatestVersion(pkg: string): Promise<string> {
  const url = `https://registry.npmjs.org/${encodeURIComponent(pkg).replace("%40", "@")}`;
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) fail(`npm registry returned HTTP ${res.status} for ${pkg}`);
  const body = (await res.json()) as { "dist-tags"?: Record<string, string> };
  const latest = body["dist-tags"]?.latest;
  if (!latest) fail(`npm registry response for ${pkg} has no dist-tags.latest`);
  return latest;
}

function semverNewer(a: string, b: string): boolean {
  const pa = a.split(/[.-]/).map((x) => Number.parseInt(x, 10));
  const pb = b.split(/[.-]/).map((x) => Number.parseInt(x, 10));
  for (let i = 0; i < 3; i++) {
    const x = Number.isFinite(pa[i]) ? pa[i]! : 0;
    const y = Number.isFinite(pb[i]) ? pb[i]! : 0;
    if (x !== y) return x > y;
  }
  return false;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const root = args.root;

  // ── 1. Canonical version surfaces ─────────────────────────────────────────
  const manifest = readJson(join(root, "release.manifest.json"), "release.manifest.json");
  const identity = manifest.identity as Record<string, unknown> | undefined;
  const expected = typeof identity?.version === "string" ? identity.version : undefined;
  const expectedName = typeof identity?.name === "string" ? identity.name : undefined;
  if (!expected || !expectedName) fail("release.manifest.json lacks identity.name/version");

  const pkg = readJson(join(root, "package.json"), "package.json");
  compareVersion("package.json", typeof pkg.version === "string" ? pkg.version : undefined, expected);
  if (pkg.name !== expectedName) {
    checks.push({ surface: "package.json#name", expected: expectedName, found: String(pkg.name), ok: false });
  }

  const versionTs = readText(join(root, "src/core/version.ts"), "src/core/version.ts");
  compareVersion("src/core/version.ts", firstMatch(versionTs, /version:\s*"([^"]+)"/), expected);

  const installSh = readText(join(root, "install.sh"), "install.sh");
  compareVersion("install.sh", firstMatch(installSh, /^VERSION="([^"]+)"/m), expected);

  const installPs1 = readText(join(root, "install.ps1"), "install.ps1");
  compareVersion("install.ps1", firstMatch(installPs1, /\$Version\s*=\s*['"]([^'"]+)['"]/), expected);

  const site = readText(join(root, "website/src/lib/site.ts"), "website/src/lib/site.ts");
  compareVersion("website site.ts", firstMatch(site, /version:\s*"([^"]+)"/), expected);

  // ── 2. Tag agreement ──────────────────────────────────────────────────────
  if (args.tag !== undefined) {
    const tagVersion = args.tag.replace(/^v/, "");
    compareVersion(`tag ${args.tag}`, tagVersion, expected);
  }

  // ── 3. npm registry agreement ─────────────────────────────────────────────
  if (args.checkNpm || args.postPublish) {
    let published: string;
    if (args.publishedVersion) {
      published = args.publishedVersion; // hermetic test override
    } else {
      try {
        published = await npmLatestVersion(expectedName);
      } catch (e) {
        fail(`npm registry unreachable for ${expectedName}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    if (args.postPublish) {
      checks.push({
        surface: "npm dist-tags.latest (post-publish)",
        expected,
        found: published,
        ok: published === expected,
        note: "after publish, the registry MUST equal the manifest — no lag, no drift",
      });
    } else {
      const newer = semverNewer(published, expected);
      checks.push({
        surface: "npm dist-tags.latest (pre-publish)",
        expected: `≤ ${expected}`,
        found: published,
        ok: !newer,
        note: newer
          ? "registry is NEWER than source — the illegitimate drift direction"
          : published === expected
            ? "already in lockstep"
            : "source leads registry; this pipeline publishes and then verifies (--post-publish)",
      });
    }
  }

  // ── 4. Sub-gates (release:check / channel:check / claim-lint) ─────────────
  if (args.withSubgates) {
    for (const cmd of ["release:check", "channel:check", "claim-lint"]) {
      const proc = Bun.spawn(["bun", "run", cmd], { cwd: root, stdout: "inherit", stderr: "inherit" });
      const code = await proc.exited;
      if (code !== 0) {
        console.error(`[publish-lockstep] sub-gate failed: bun run ${cmd} (exit ${code})`);
        process.exit(1);
      }
    }
  }

  // ── Verdict ────────────────────────────────────────────────────────────────
  let drift = 0;
  for (const c of checks) {
    const mark = c.ok ? "ok   " : "DRIFT";
    if (!c.ok) drift++;
    console.log(
      `[publish-lockstep] ${mark} ${c.surface}: found ${c.found} (expected ${c.expected})${c.note ? ` — ${c.note}` : ""}`,
    );
  }
  if (drift > 0) {
    console.error(`[publish-lockstep] ${drift} surface(s) out of lockstep — publish is BLOCKED (ADR-XR-028).`);
    process.exit(1);
  }
  console.log(`[publish-lockstep] ✓ all ${checks.length} lockstep surfaces agree at ${expected} (${expectedName})`);
}

await main();
