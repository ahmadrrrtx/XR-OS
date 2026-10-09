/**
 * S-08 admission rail orchestrator — conformance (SPEC-S-08 §27.3, A-6).
 *
 * The admission standard must be runnable and NAMED. These tests exercise the
 * real orchestrator against the live repo: the fast rails must pass end-to-end,
 * rail selection must work, unknown rails must fail closed, and a broken rail
 * must break the whole chain.
 */

import { describe, test, expect } from "bun:test";
import { resolve } from "node:path";

const SCRIPT = resolve(import.meta.dir, "../../scripts/s08-rail.ts");
const ROOT = resolve(import.meta.dir, "../..");

async function runRail(extra: string[]): Promise<{ code: number; out: string }> {
  const proc = Bun.spawn(["bun", "run", SCRIPT, ...extra], {
    cwd: ROOT,
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env },
  });
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { code, out: stdout + stderr };
}

describe("s08-rail orchestrator", () => {
  test("fast rails pass end-to-end and each is named", async () => {
    // hermetic lockstep via --published-version; skips the slow docs/typecheck rails
    const { code, out } = await runRail([
      "--only",
      "release,claims,lockstep,channels",
      "--published-version",
      "7.1.0",
    ]);
    expect(code).toBe(0);
    for (const gate of ["XRINV-S08-015", "XRINV-S08-020", "XRINV-S08-017", "XRINV-S08-011"]) {
      expect(out).toContain(gate);
    }
    expect(out).toContain("S-08 evidence chain complete");
    expect(out).toContain("4 rail(s) green");
  }, 120_000);

  test("lockstep passthrough: a newer registry breaks the chain", async () => {
    const { code, out } = await runRail([
      "--only",
      "lockstep",
      "--check-npm",
      "--published-version",
      "9.9.9",
    ]);
    expect(code).toBe(1);
    expect(out).toContain("admission evidence chain BROKEN");
  }, 60_000);

  test("tag passthrough reaches the lockstep rail", async () => {
    const { code, out } = await runRail(["--only", "lockstep", "--tag", "v9.9.9", "--published-version", "7.1.0"]);
    expect(code).toBe(1);
    expect(out).toContain("DRIFT tag v9.9.9");
  }, 60_000);

  test("unknown rail names fail closed", async () => {
    const { code, out } = await runRail(["--only", "bogus"]);
    expect(code).toBe(1);
    expect(out).toContain("unknown rail(s): bogus");
  }, 30_000);
});
