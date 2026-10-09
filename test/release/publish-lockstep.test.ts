/**
 * Publish-lockstep gate — dry-run conformance (ADR-XR-028, checklist A-2).
 *
 * The whole point of this gate is the 3.1.5-vs-7.1.0 incident class: source
 * moved, npm didn't, nothing noticed. These tests run the real script against
 * fixture roots — one matching set, then deliberately BROKEN sets — and assert
 * the gate fails closed with the offending surface named. Hermetic npm checks
 * use --published-version (documented test-only override).
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const SCRIPT = resolve(import.meta.dir, "../../scripts/publish-lockstep.ts");
const VERSION = "7.1.0";

let ROOT: string;

function fixtureRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "xr-lockstep-"));
  mkdirSync(join(root, "src/core"), { recursive: true });
  mkdirSync(join(root, "website/src/lib"), { recursive: true });
  writeFileSync(
    join(root, "release.manifest.json"),
    JSON.stringify({ manifestVersion: 2, identity: { name: "@rrrtx/xr", version: VERSION } }),
  );
  writeFileSync(join(root, "package.json"), JSON.stringify({ name: "@rrrtx/xr", version: VERSION }));
  writeFileSync(join(root, "src/core/version.ts"), `export const PKG = {\n  name: "@rrrtx/xr",\n  version: "${VERSION}",\n};\n`);
  writeFileSync(join(root, "install.sh"), `#!/usr/bin/env bash\nVERSION="${VERSION}"\n`);
  writeFileSync(join(root, "install.ps1"), `$Version = '${VERSION}'\n`);
  writeFileSync(join(root, "website/src/lib/site.ts"), `export const site = {\n  version: "${VERSION}",\n};\n`);
  return root;
}

async function runLockstep(extra: string[], root: string): Promise<{ code: number; out: string }> {
  const proc = Bun.spawn(["bun", "run", SCRIPT, "--root", root, ...extra], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { code, out: stdout + stderr };
}

beforeEach(() => {
  ROOT = fixtureRoot();
});

afterEach(() => {
  rmSync(ROOT, { recursive: true, force: true });
});

describe("publish lockstep — matching surfaces", () => {
  test("all six surfaces in sync pass", async () => {
    const { code, out } = await runLockstep([], ROOT);
    expect(code).toBe(0);
    expect(out).toContain(`all 5 lockstep surfaces agree at ${VERSION}`);
  });

  test("a matching tag passes", async () => {
    const { code } = await runLockstep(["--tag", `v${VERSION}`], ROOT);
    expect(code).toBe(0);
  });
});

describe("publish lockstep — drift fails closed and names the surface", () => {
  test("package.json drift blocks publish", async () => {
    writeFileSync(join(ROOT, "package.json"), JSON.stringify({ name: "@rrrtx/xr", version: "3.1.5" }));
    const { code, out } = await runLockstep([], ROOT);
    expect(code).toBe(1);
    expect(out).toContain("DRIFT package.json");
    expect(out).toContain("3.1.5");
    expect(out).toContain("publish is BLOCKED");
  });

  test("version.ts drift blocks publish", async () => {
    writeFileSync(join(ROOT, "src/core/version.ts"), `export const PKG = { version: "7.0.9" };\n`);
    const { code, out } = await runLockstep([], ROOT);
    expect(code).toBe(1);
    expect(out).toContain("DRIFT src/core/version.ts");
  });

  test("installer drift blocks publish", async () => {
    writeFileSync(join(ROOT, "install.sh"), `VERSION="7.0.0"\n`);
    const { code, out } = await runLockstep([], ROOT);
    expect(code).toBe(1);
    expect(out).toContain("DRIFT install.sh");
  });

  test("website drift blocks publish", async () => {
    writeFileSync(join(ROOT, "website/src/lib/site.ts"), `export const site = { version: "6.0.0" };\n`);
    const { code, out } = await runLockstep([], ROOT);
    expect(code).toBe(1);
    expect(out).toContain("DRIFT website site.ts");
  });

  test("a mismatched tag blocks publish", async () => {
    const { code, out } = await runLockstep(["--tag", "v9.9.9"], ROOT);
    expect(code).toBe(1);
    expect(out).toContain("DRIFT tag v9.9.9");
  });

  test("a missing surface fails closed (never passes)", async () => {
    rmSync(join(ROOT, "install.ps1"));
    const { code, out } = await runLockstep([], ROOT);
    expect(code).toBe(1);
    expect(out).toContain("FAIL-CLOSED");
  });
});

describe("publish lockstep — npm registry agreement (hermetic)", () => {
  test("pre-publish: registry equal to source is lockstep", async () => {
    const { code, out } = await runLockstep(["--check-npm", "--published-version", VERSION], ROOT);
    expect(code).toBe(0);
    expect(out).toContain("already in lockstep");
  });

  test("pre-publish: source legitimately leading passes with a publish note", async () => {
    const { code, out } = await runLockstep(["--check-npm", "--published-version", "3.1.5"], ROOT);
    expect(code).toBe(0);
    expect(out).toContain("source leads registry");
  });

  test("pre-publish: registry NEWER than source is the illegitimate drift direction", async () => {
    const { code, out } = await runLockstep(["--check-npm", "--published-version", "9.9.9"], ROOT);
    expect(code).toBe(1);
    expect(out).toContain("illegitimate drift direction");
  });

  test("post-publish: exact agreement required — this closes the loop the 3.1.5 incident slipped through", async () => {
    const ok = await runLockstep(["--post-publish", "--published-version", VERSION], ROOT);
    expect(ok.code).toBe(0);
    const bad = await runLockstep(["--post-publish", "--published-version", "3.1.5"], ROOT);
    expect(bad.code).toBe(1);
    expect(bad.out).toContain("npm dist-tags.latest (post-publish)");
  });
});
