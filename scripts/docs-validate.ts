#!/usr/bin/env bun
/**
 * XR — docs-set validator (canonical S-08 §26/§28 evidence rail; A-6).
 *
 * The public snapshot once shipped with docs/ missing entirely, which broke
 * five test suites and left the canonical set unverifiable. This gate makes
 * the docs set MECHANICALLY CHECKED, not remembered:
 *
 *   1. every required canonical/evidence doc exists and is non-trivial
 *   2. each markdown doc opens with a real title heading
 *   3. the S-08 spec carries its normative gate sections (§26/§27/§28)
 *   4. the ADR-XR-012 amendment record names the admission it documents
 *   5. docs/api/openapi.json parses and still carries its operation floor
 *
 * Fail-closed (LAW 16): any missing or degraded doc fails the rail.
 */

import { readFileSync, existsSync, statSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");

interface Check {
  file: string;
  ok: boolean;
  detail: string;
}

const checks: Check[] = [];

function read(rel: string): string | null {
  const abs = resolve(ROOT, rel);
  if (!existsSync(abs)) return null;
  return readFileSync(abs, "utf8");
}

function requireMarkdown(rel: string, opts: { containsAll?: string[]; minBytes?: number } = {}): void {
  const text = read(rel);
  if (text === null) {
    checks.push({ file: rel, ok: false, detail: "MISSING" });
    return;
  }
  const bytes = Buffer.byteLength(text, "utf8");
  const problems: string[] = [];
  if (!/^#\s+\S/m.test(text)) problems.push("no title heading");
  if (opts.minBytes !== undefined && bytes < opts.minBytes) problems.push(`truncated (${bytes}B < ${opts.minBytes}B)`);
  for (const needle of opts.containsAll ?? []) {
    if (!text.includes(needle)) problems.push(`lacks "${needle}"`);
  }
  checks.push({
    file: rel,
    ok: problems.length === 0,
    detail: problems.length === 0 ? `ok (${bytes}B)` : problems.join("; "),
  });
}

function requireOpenApi(rel: string, operationFloor: number): void {
  const text = read(rel);
  if (text === null) {
    checks.push({ file: rel, ok: false, detail: "MISSING" });
    return;
  }
  try {
    const doc = JSON.parse(text) as { paths?: Record<string, Record<string, unknown>> };
    const paths = doc.paths ?? {};
    let ops = 0;
    for (const methods of Object.values(paths)) {
      ops += Object.keys(methods ?? {}).filter((m) => m !== "parameters").length;
    }
    checks.push({
      file: rel,
      ok: ops >= operationFloor,
      detail: ops >= operationFloor ? `ok (${ops} operations)` : `degraded (${ops} operations < floor ${operationFloor})`,
    });
  } catch (e) {
    checks.push({ file: rel, ok: false, detail: `unparsable JSON: ${e instanceof Error ? e.message : String(e)}` });
  }
}

// ── Required docs set (canonical + evidence) ─────────────────────────────────
requireMarkdown("docs/specs/XR_S-08_DISTRIBUTION_CANONICAL_SPECIFICATION.md", {
  containsAll: ["## 26. Testing", "## 27. CI Gates", "## 28. Acceptance Criteria", "XRINV-S08-017"],
  minBytes: 60_000,
});
requireMarkdown("docs/canon/AMENDMENT_ADR-XR-012_S08_ADMISSION.md", {
  containsAll: ["ADR-XR-012", "S-08", "LAW 10"],
});
requireMarkdown("docs/security/POSTURE.md", { minBytes: 500 });
requireMarkdown("docs/phase12/INCIDENT_RESPONSE.md", { minBytes: 1_000 });
requireMarkdown("README_SECURITY.md", { minBytes: 300 });
requireMarkdown("SECURITY_IMPLEMENTATION.md", { minBytes: 300 });
requireMarkdown("plugins/hello-device/PACK_PROPOSAL.md", { containsAll: ["device", "permission scope"] });
requireOpenApi("docs/api/openapi.json", 90);

// ── Verdict ────────────────────────────────────────────────────────────────────
let bad = 0;
for (const c of checks) {
  console.log(`[docs-validate] ${c.ok ? "ok   " : "DRIFT"} ${c.file} — ${c.detail}`);
  if (!c.ok) bad++;
}
if (bad > 0) {
  console.error(`[docs-validate] ${bad} doc(s) missing or degraded — docs rail BROKEN (LAW 16)`);
  process.exit(1);
}
console.log(`[docs-validate] ✓ docs set complete and consistent — ${checks.length} artifacts verified`);
