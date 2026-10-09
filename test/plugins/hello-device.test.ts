/**
 * XR hello-device pack — conformance suite (DF-05 first pack proposal).
 *
 * Verifies the actuation risk lattice v0, fail-closed behavior (LAW 16),
 * driver-adapter seam (LAW 17), journal integrity chain, audit emission, and
 * sandbox-load compatibility — matching the manifest against the strict
 * plugin validator and executing the pack both directly (unit) and inside
 * the hardened VM loader (integration).
 *
 * Authority note: these tests assert pack-level semantics. Approval-gating
 * of plugin tools at the envelope level is core behavior owned by
 * src/plugins/manager.ts (adaptTool) and covered there; here we assert the
 * pack's declared requiresApproval flags and its internal gates.
 */

import { describe, test, expect, beforeEach } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { validatePlugin } from "../../src/plugins/loader.ts";
import { loadPlugin } from "../../src/plugins/loader/sandbox.ts";
import { loadConfig } from "../../src/config/config.ts";
import { Store } from "../../src/state/workspace-store.ts";

import activateDefault, { activate, __xrDeviceInternals } from "../../plugins/hello-device/index.ts";
import type { JournalEntry } from "../../plugins/hello-device/index.ts";

type JournalBase = Omit<JournalEntry, "chain">;

const PACK_DIR = resolve(import.meta.dir, "../../plugins/hello-device");

// ── Runtime guard (mirrors loader.test.ts): bun ≥1.3 required for VM tests ──
const VM_RUNTIME_SAFE = (() => {
  const parts = (typeof Bun !== "undefined" && Bun.version ? Bun.version : "0.0.0")
    .split(".")
    .map((p) => Number.parseInt(p, 10) || 0);
  const [maj, min] = [parts[0] ?? 0, parts[1] ?? 0];
  return maj > 1 || (maj === 1 && min >= 3);
})();
const vmTest = (VM_RUNTIME_SAFE ? test : test.skip) as typeof test;

// ── Recording host (plugins receive ONLY the host) ──────────────────────────

interface AuditEvent { event: string; detail: Record<string, unknown> }

function recordingHost(): { host: any; audits: AuditEvent[]; logs: string[] } {
  const audits: AuditEvent[] = [];
  const logs: string[] = [];
  const host = {
    id: "hello-device",
    apiVersion: 1,
    coreVersion: "7.1.0",
    permissions: [] as const,
    can: () => false,
    log: (line: string) => logs.push(line),
    warn: (line: string) => logs.push(`warn: ${line}`),
    audit: (event: string, detail: Record<string, unknown> = {}) => audits.push({ event, detail }),
  };
  return { host, audits, logs };
}

function freshContributions() {
  const { host, audits, logs } = recordingHost();
  const contributions = activate(host);
  const tools = new Map((contributions.tools ?? []).map((t) => [t.name, t]));
  const commands = new Map((contributions.commands ?? []).map((c) => [c.name, c]));
  return { tools, commands, audits, logs, dispose: contributions.dispose };
}

// ── 1. Manifest conformance ──────────────────────────────────────────────────

describe("hello-device manifest", () => {
  test("validates under the strict plugin validator with ZERO permissions", () => {
    const v = validatePlugin(PACK_DIR);
    expect(v.ok).toBe(true);
    expect(v.manifest?.id).toBe("hello-device");
    expect(v.manifest?.permissions).toEqual([]);
    expect(v.manifest?.trustLevel).toBe("official");
    expect(v.manifest?.type).toBe("integration");
  });
});

// ── 2. Activation & board topology ──────────────────────────────────────────

describe("hello-device activation", () => {
  test("contributes 6 tools + 1 command with correct approval flags", () => {
    const { tools, commands } = freshContributions();
    expect([...tools.keys()].sort()).toEqual(
      ["blink", "journal", "read", "select_driver", "status", "write"].sort(),
    );
    expect([...commands.keys()]).toEqual(["probe"]);
    // Actuation risk lattice v0 → approval flags
    expect(tools.get("status")?.requiresApproval).toBe(false);
    expect(tools.get("read")?.requiresApproval).toBe(false);
    expect(tools.get("journal")?.requiresApproval).toBe(false);
    expect(tools.get("write")?.requiresApproval).toBe(true);
    expect(tools.get("blink")?.requiresApproval).toBe(true);
    expect(tools.get("select_driver")?.requiresApproval).toBe(true);
  });

  test("board exposes 8 pins across the risk lattice", () => {
    const { tools } = freshContributions();
    const res = tools.get("status")!.run({}) as any;
    expect(res.ok).toBe(true);
    expect(res.data.pins).toHaveLength(8);
    expect(res.data.driver).toBe("simulated");
    expect(res.data.probe.available).toBe(true);
    const byRisk: Record<string, number> = {};
    for (const p of res.data.pins) byRisk[p.risk] = (byRisk[p.risk] ?? 0) + 1;
    expect(byRisk.observe).toBe(3);
    expect(byRisk.reversible).toBe(3);
    expect(byRisk.irreversible).toBe(2);
  });
});

// ── 3. Observe tier — reads never actuate ───────────────────────────────────

describe("observe tier", () => {
  test("sensor read returns a value with provenance", () => {
    const { tools } = freshContributions();
    const res = tools.get("read")!.run({ pin: "adc0" }) as any;
    expect(res.ok).toBe(true);
    expect(res.data.risk).toBe("observe");
    expect(typeof res.data.value).toBe("number");
    expect(res.data.value).toBeGreaterThanOrEqual(0);
    expect(res.data.value).toBeLessThanOrEqual(100);
  });

  test("sensor values are deterministic across a fresh activation", () => {
    const a = freshContributions().tools.get("read")!.run({ pin: "adc0" }) as any;
    const b = freshContributions().tools.get("read")!.run({ pin: "adc0" }) as any;
    expect(a.data.value).toBe(b.data.value); // replayable: no wall-clock, no randomness
  });

  test("reading an OUTPUT pin fails closed (reads must never actuate)", () => {
    const { tools } = freshContributions();
    const res = tools.get("read")!.run({ pin: "gpio2" }) as any;
    expect(res.ok).toBe(false);
    expect(res.data.failClosed).toBe(true);
    expect(res.output).toContain("observe tier only");
  });

  test("unknown pin fails closed", () => {
    const { tools } = freshContributions();
    const res = tools.get("read")!.run({ pin: "gpio99" }) as any;
    expect(res.ok).toBe(false);
    expect(res.output).toContain("unknown pin");
  });

  test("non-string / hostile pin input fails closed", () => {
    const { tools } = freshContributions();
    for (const pin of [undefined, null, 42, {}, "", "x".repeat(64)]) {
      const res = tools.get("read")!.run({ pin }) as any;
      expect(res.ok).toBe(false);
    }
  });
});

// ── 4. Reversible tier — approval-gated writes with evidence ────────────────

describe("reversible tier", () => {
  test("write LED: from/to/readback evidence + audit event + journal entry", () => {
    const { tools, audits } = freshContributions();
    const res = tools.get("write")!.run({ pin: "gpio2", value: 1 }) as any;
    expect(res.ok).toBe(true);
    expect(res.data.from).toBe(0);
    expect(res.data.to).toBe(1);
    expect(res.data.readback).toBe(1); // readback verification at the driver
    expect(res.data.risk).toBe("reversible");
    expect(res.data.evidence.verified).toBe(true);
    const audit = audits.find((a) => a.event === "device.write");
    expect(audit).toBeDefined();
    expect(audit!.detail.pin).toBe("gpio2");
    expect(audit!.detail.to).toBe(1);
    expect(audit!.detail.journalChain).toBe(res.data.evidence.journalChain);
    const journal = tools.get("journal")!.run({}) as any;
    expect(journal.data.count).toBe(1);
    expect(journal.data.verified).toBe(true);
  });

  test("write accepts 0|1|on|off vocabulary and rejects garbage", () => {
    const { tools } = freshContributions();
    expect((tools.get("write")!.run({ pin: "gpio2", value: "on" }) as any).data.to).toBe(1);
    expect((tools.get("write")!.run({ pin: "gpio2", value: "off" }) as any).data.to).toBe(0);
    const bad = tools.get("write")!.run({ pin: "gpio2", value: "maybe" }) as any;
    expect(bad.ok).toBe(false);
    expect(bad.data.failClosed).toBe(true);
  });

  test("writing an INPUT pin fails closed", () => {
    const { tools } = freshContributions();
    const res = tools.get("write")!.run({ pin: "adc0", value: 1 }) as any;
    expect(res.ok).toBe(false);
    expect(res.output).toContain("input");
  });

  test("blink toggles and restores, then records evidence", () => {
    const { tools, audits } = freshContributions();
    tools.get("write")!.run({ pin: "gpio2", value: 1 });
    const res = tools.get("blink")!.run({ pin: "gpio2", times: 3 }) as any;
    expect(res.ok).toBe(true);
    expect(res.data.from).toBe(1);
    expect(res.data.to).toBe(1); // 3 blinks = 6 toggles → restored
    expect(res.data.pacing).toBe("immediate-v1"); // honest: no timer source yet (GAP-19)
    expect(audits.find((a) => a.event === "device.blink")).toBeDefined();
  });

  test("blink bounds are enforced", () => {
    const { tools } = freshContributions();
    expect((tools.get("blink")!.run({ pin: "gpio2", times: 0 }) as any).ok).toBe(false);
    expect((tools.get("blink")!.run({ pin: "gpio2", times: 11 }) as any).ok).toBe(false);
    expect((tools.get("blink")!.run({ pin: "gpio2", times: Number.NaN }) as any).ok).toBe(false);
  });
});

// ── 5. Irreversible tier — double gate ──────────────────────────────────────

describe("irreversible tier (physical-process class)", () => {
  test("pump write WITHOUT confirm fails closed — no audit, no journal", () => {
    const { tools, audits } = freshContributions();
    const res = tools.get("write")!.run({ pin: "gpio17", value: 1 }) as any;
    expect(res.ok).toBe(false);
    expect(res.data.risk).toBe("irreversible");
    expect(res.output).toContain("confirm:true");
    expect(audits.find((a) => a.event === "device.write")).toBeUndefined();
    const journal = tools.get("journal")!.run({}) as any;
    expect(journal.data.count).toBe(0); // deny happens BEFORE any side effect
  });

  test("pump write WITH confirm actuates and is fully evidenced", () => {
    const { tools, audits } = freshContributions();
    const res = tools.get("write")!.run({ pin: "gpio17", value: 1, confirm: true }) as any;
    expect(res.ok).toBe(true);
    expect(res.data.risk).toBe("irreversible");
    expect(res.data.to).toBe(1);
    const audit = audits.find((a) => a.event === "device.write");
    expect(audit!.detail.risk).toBe("irreversible");
    expect(audit!.detail.name).toBe("water-pump");
  });

  test("blink refuses irreversible pins outright", () => {
    const { tools } = freshContributions();
    const res = tools.get("blink")!.run({ pin: "gpio17", times: 2 }) as any;
    expect(res.ok).toBe(false);
    expect(res.output).toContain("reversible-tier only");
  });

  test("confirm must be exactly boolean true (no truthy smuggling)", () => {
    const { tools } = freshContributions();
    for (const confirm of ["true", 1, "yes", {}]) {
      const res = tools.get("write")!.run({ pin: "gpio27", value: 1, confirm }) as any;
      expect(res.ok).toBe(false);
    }
  });
});

// ── 6. Driver adapter seam (LAW 17) ─────────────────────────────────────────

describe("driver adapter seam", () => {
  test("selecting rpi-sysfs probes honestly: unavailable, never simulate-as-real", () => {
    const { tools, audits } = freshContributions();
    const sel = tools.get("select_driver")!.run({ driver: "rpi-sysfs" }) as any;
    expect(sel.ok).toBe(true);
    expect(sel.data.probe.available).toBe(false);
    expect(sel.data.probe.detail).toContain("Fail-closed");
    expect(audits.find((a) => a.event === "device.driver.select")?.detail.available).toBe(false);
  });

  test("with rpi-sysfs active, ALL actuation and observation fail closed", () => {
    const { tools } = freshContributions();
    tools.get("select_driver")!.run({ driver: "rpi-sysfs" });
    expect((tools.get("write")!.run({ pin: "gpio2", value: 1 }) as any).ok).toBe(false);
    expect((tools.get("read")!.run({ pin: "adc0" }) as any).ok).toBe(false);
    expect((tools.get("blink")!.run({ pin: "gpio2", times: 1 }) as any).ok).toBe(false);
  });

  test("switching back to simulated restores the board", () => {
    const { tools } = freshContributions();
    tools.get("select_driver")!.run({ driver: "rpi-sysfs" });
    const back = tools.get("select_driver")!.run({ driver: "simulated" }) as any;
    expect(back.data.probe.available).toBe(true);
    expect((tools.get("write")!.run({ pin: "gpio2", value: 1 }) as any).ok).toBe(true);
  });

  test("unknown driver value fails closed", () => {
    const { tools } = freshContributions();
    const res = tools.get("select_driver")!.run({ driver: "quantum-bus" }) as any;
    expect(res.ok).toBe(false);
    expect(res.output).toContain("unknown driver");
  });
});

// ── 7. Journal integrity chain (evidence artifact) ──────────────────────────

describe("device journal integrity", () => {
  test("chain verifies across mixed operations", () => {
    const { tools } = freshContributions();
    tools.get("write")!.run({ pin: "gpio2", value: 1 });
    tools.get("write")!.run({ pin: "gpio17", value: 1, confirm: true });
    tools.get("blink")!.run({ pin: "gpio3", times: 2 });
    tools.get("select_driver")!.run({ driver: "simulated" });
    const res = tools.get("journal")!.run({}) as any;
    expect(res.data.count).toBe(4);
    expect(res.data.verified).toBe(true);
    expect(res.data.entries[0].chain).not.toBe(__xrDeviceInternals.GENESIS);
    for (let i = 1; i < res.data.entries.length; i++) {
      expect(res.data.entries[i].seq).toBe(res.data.entries[i - 1].seq + 1);
    }
  });

  test("pure verifyChain detects tampering", () => {
    const { chainEntry, verifyChain, GENESIS } = __xrDeviceInternals;
    const e1base: JournalBase = { seq: 1, ts: 1000, op: "write", pin: "gpio2", from: 0, to: 1, risk: "reversible", driver: "simulated" };
    const e1: JournalEntry = { ...e1base, chain: chainEntry(GENESIS, e1base) };
    const e2base: JournalBase = { seq: 2, ts: 2000, op: "write", pin: "gpio17", from: 0, to: 1, risk: "irreversible", driver: "simulated" };
    const e2: JournalEntry = { ...e2base, chain: chainEntry(e1.chain, e2base) };
    expect(verifyChain([e1, e2])).toBe(true);
    // Tamper: rewrite history (attacker flips a pump actuation to "off")
    const forged: JournalEntry = { ...e2, to: 0 };
    expect(verifyChain([e1, forged])).toBe(false);
    // Tamper: splice out the middle of a longer chain
    const e3base: JournalBase = { seq: 3, ts: 3000, op: "blink", pin: "gpio3", from: 0, to: 0, risk: "reversible", driver: "simulated" };
    const e3: JournalEntry = { ...e3base, chain: chainEntry(e2.chain, e3base) };
    expect(verifyChain([e1, e3])).toBe(false);
  });
});

// ── 8. Hardened VM sandbox compatibility (integration) ──────────────────────

const VM_TMP = mkdtempSync(join(tmpdir(), "xr-hello-device-vm-"));
process.env.XR_HOME = process.env.XR_HOME ?? join(VM_TMP, "home");
mkdirSync(process.env.XR_HOME, { recursive: true });

describe("hello-device in the hardened VM loader", () => {
  vmTest("loads through the isolated VM and activates with all contributions", async () => {
    const result = await loadPlugin(PACK_DIR, {
      store: new Store(join(VM_TMP, "db-hello-device.db")),
      config: loadConfig().config,
      cwd: PACK_DIR,
      granted: [],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.manifest.id).toBe("hello-device");
      expect(result.granted).toEqual([]); // zero-permission shape preserved
      const names = (result.contributions.tools ?? []).map((t) => t.name).sort();
      expect(names).toEqual(["blink", "journal", "read", "select_driver", "status", "write"]);
      // Execute one observe-tier call INSIDE the sandbox
      const status = result.contributions.tools!.find((t) => t.name === "status")!;
      const res = (await status.run({})) as any;
      expect(res.ok).toBe(true);
      expect(res.data.pins).toHaveLength(8);
      // Actuate inside the sandbox: audit lands in the real Store chain
      const write = result.contributions.tools!.find((t) => t.name === "write")!;
      const wres = (await write.run({ pin: "gpio2", value: 1 })) as any;
      expect(wres.ok).toBe(true);
      expect(wres.data.evidence.verified).toBe(true);
    }
    rmSync(join(VM_TMP, "db-hello-device.db"), { force: true });
  });
});

// Default export contract (loader resolves activate or default)
test("default export is the activate function", () => {
  expect(typeof activateDefault).toBe("function");
});
