#!/usr/bin/env bun
/**
 * XR — S-08 admission rails, named and orchestrated (canonical S-08 §27).
 *
 * The admission standard requires its evidence chain to be RUNNABLE AND NAMED.
 * This script is the single named entry point for the §27 gates that run as a
 * static pre-release chain; CI invokes it as the "S-08 admission rails" step so
 * the admission evidence is visible in the job graph itself, not buried in
 * inline commands. Spec: docs/specs/XR_S-08_DISTRIBUTION_CANONICAL_SPECIFICATION.md
 *
 * Rails, run in dependency order, fail-closed:
 *
 *   rail-1  typecheck                    tsc --noEmit (chain precondition)
 *   rail-2  docs                         bun run docs:validate
 *                                        (§26/§28 docs set complete + consistent)
 *   rail-3  release-read-only-drift      bun run release:check        (XRINV-S08-015)
 *   rail-4  claims-lockstep              bun run claim-lint           (XRINV-S08-020)
 *   rail-5  publish-lockstep             scripts/publish-lockstep.ts  (XRINV-S08-017)
 *                                        [+ --tag / --check-npm passthrough]
 *   rail-6  channel-correctness          bun run channel:check        (XRINV-S08-011)
 *
 * The remaining §27 gates (reproducible-build, signed-packages,
 * verified-artifacts, offline-install, workspace-preservation, …) run inside
 * the release.yml pipeline jobs themselves (build matrix → sign → assemble →
 * provenance → publish). This rail is the identity/static chain that must be
 * green BEFORE any of those jobs may run.
 *
 * LAW 16 applies: any rail failing fails the admission evidence chain.
 */

import { resolve } from "node:path";

interface Rail {
  name: string;
  gate: string; // §27 gate id (XRINV-S08-nnn) or chain precondition
  cmd: string[];
}

const ROOT = resolve(import.meta.dir, "..");

const RAILS: Rail[] = [
  { name: "typecheck", gate: "chain-precondition", cmd: ["bun", "run", "typecheck"] },
  { name: "docs", gate: "§26/§28 evidence", cmd: ["bun", "run", "docs:validate"] },
  { name: "release", gate: "XRINV-S08-015 release-read-only-drift", cmd: ["bun", "run", "release:check"] },
  { name: "claims", gate: "XRINV-S08-020 claims-lockstep", cmd: ["bun", "run", "claim-lint"] },
  { name: "lockstep", gate: "XRINV-S08-017 publish-lockstep", cmd: ["bun", "run", "scripts/publish-lockstep.ts"] },
  { name: "channels", gate: "XRINV-S08-011 channel-correctness", cmd: ["bun", "run", "channel:check"] },
];

interface Args {
  only?: string[];
  passthrough: string[];
}

function parseArgs(argv: string[]): Args {
  const args: Args = { passthrough: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--only") {
      args.only = (argv[++i] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    } else if (a === "--tag" || a === "--published-version") {
      args.passthrough.push(a, argv[++i] ?? "");
    } else if (a === "--check-npm") {
      args.passthrough.push(a);
    }
  }
  return args;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  let rails = RAILS;
  if (args.only) {
    const known = new Set(RAILS.map((r) => r.name));
    const unknown = args.only.filter((n) => !known.has(n));
    if (unknown.length > 0) {
      console.error(`[s08-rail] unknown rail(s): ${unknown.join(", ")} — known: ${[...known].join(", ")}`);
      process.exit(1);
    }
    rails = RAILS.filter((r) => args.only!.includes(r.name));
  }

  const results: { rail: Rail; code: number; ms: number }[] = [];
  for (const rail of rails) {
    const cmd = rail.name === "lockstep" ? [...rail.cmd, ...args.passthrough] : rail.cmd;
    console.log(`[s08-rail] rail '${rail.name}' (${rail.gate}): ${cmd.join(" ")}`);
    const t0 = Date.now();
    const proc = Bun.spawn(cmd, { cwd: ROOT, stdout: "inherit", stderr: "inherit" });
    const code = await proc.exited;
    results.push({ rail, code, ms: Date.now() - t0 });
    if (code !== 0) {
      console.error(`[s08-rail] ✗ rail '${rail.name}' failed (exit ${code}) — admission evidence chain BROKEN`);
      process.exit(1);
    }
  }

  console.log("[s08-rail] ──────────────────────────────────────────────");
  for (const r of results) {
    console.log(`[s08-rail] ✓ ${r.rail.name.padEnd(10)} ${r.rail.gate.padEnd(42)} ${(r.ms / 1000).toFixed(1)}s`);
  }
  console.log(`[s08-rail] ✓ S-08 evidence chain complete — ${results.length} rail(s) green (canonical S-08 §27)`);
}

await main();
