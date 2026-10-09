/**
 * XR — device fabric seam conformance (PACK_PROPOSAL.md §4).
 *
 * The physical-world entry point must honor the substrate invariants:
 *  - simulated fabric is deterministic and replayable (no clock, no RNG)
 *  - unknown node / direction mismatch / invalid value all FAIL CLOSED
 *  - the sysfs backend probes honestly and refuses to simulate-as-real
 *    when the platform lacks the sysfs GPIO interface (LAW 16)
 *  - host.device exists IFF the `device` scope is granted, every call audits,
 *    and a fabric denial surfaces as { ok:false } — never a fake value
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { SimulatedFabric, SysfsGpioFabric, createFabric, isFabricBackend } from "../../src/devices/fabric.ts";
import { buildHost, type HostDeps } from "../../src/plugins/host.ts";
import { WorkspaceStore } from "../../src/state/workspace-store.ts";
import type { XRConfig } from "../../src/config/config.ts";

// ── Simulated fabric ─────────────────────────────────────────────────────────

describe("SimulatedFabric — deterministic physical-world substrate", () => {
  test("probe is available and lists the reference node set", () => {
    const f = new SimulatedFabric();
    const p = f.probe();
    expect(p.available).toBe(true);
    expect(p.backend).toBe("simulated");
    const ids = f.list().map((n) => n.id);
    expect(ids).toContain("gpio2");
    expect(ids).toContain("adc0");
    expect(f.list().every((n) => n.direction === "input" || n.direction === "output")).toBe(true);
  });

  test("write → readback roundtrip on an output node", () => {
    const f = new SimulatedFabric();
    const w = f.write("gpio2", 1);
    expect(w.ok).toBe(true);
    if (w.ok) expect(w.written).toBe(1);
    const r = f.read("gpio2");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe(1);
  });

  test("analog inputs are tick-deterministic: same sequence replays identically", () => {
    const a = new SimulatedFabric();
    const b = new SimulatedFabric();
    for (let i = 0; i < 12; i++) {
      const ra = a.read("adc0");
      const rb = b.read("adc0");
      expect(ra.ok && rb.ok && ra.value === rb.value).toBe(true);
    }
  });

  test("unknown node fails closed (LAW 16)", () => {
    const f = new SimulatedFabric();
    const r = f.read("gpio999");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("unknown device node");
    const w = f.write("gpio999", 1);
    expect(w.ok).toBe(false);
  });

  test("writing an input node is denied (direction mismatch)", () => {
    const f = new SimulatedFabric();
    const w = f.write("adc0", 1);
    expect(w.ok).toBe(false);
    if (!w.ok) expect(w.reason).toContain("input");
  });

  test("non-finite values are rejected", () => {
    const f = new SimulatedFabric();
    const w = f.write("gpio2", Number.NaN);
    expect(w.ok).toBe(false);
  });
});

// ── sysfs backend honesty ────────────────────────────────────────────────────

describe("SysfsGpioFabric — probes honestly, never simulates-as-real", () => {
  test("probe against a nonexistent sysfs root is unavailable with a fail-closed detail", () => {
    const f = new SysfsGpioFabric("/nonexistent/sysfs-gpio-root");
    const p = f.probe();
    expect(p.available).toBe(false);
    expect(p.detail).toContain("LAW 16");
  });

  test("read/write on an unavailable fabric deny with reasons (no throws, no fake values)", () => {
    const f = new SysfsGpioFabric("/nonexistent/sysfs-gpio-root");
    const r = f.read("gpio2");
    expect(r.ok).toBe(false);
    const w = f.write("gpio2", 1);
    expect(w.ok).toBe(false);
    expect(f.list()).toEqual([]);
  });

  test("malformed gpio ids are rejected even before filesystem access", () => {
    const f = new SysfsGpioFabric("/nonexistent/sysfs-gpio-root");
    const r = f.read("../../etc/passwd");
    expect(r.ok).toBe(false);
  });
});

// ── Factory (LAW 17: backends are values) ────────────────────────────────────

describe("createFabric — adapter values, fail-closed on unknown", () => {
  test("known backends construct", () => {
    expect(createFabric("simulated").backend).toBe("simulated");
    expect(createFabric("sysfs-gpio").backend).toBe("sysfs-gpio");
    expect(isFabricBackend("simulated")).toBe(true);
    expect(isFabricBackend("quantum-bus")).toBe(false);
  });

  test("unknown backend throws (never silently falls back)", () => {
    expect(() => createFabric("quantum-bus" as never)).toThrow();
  });
});

// ── Host capability gating ───────────────────────────────────────────────────

describe("host.device capability — permission-gated, audited, fail-closed", () => {
  let tmp: string;
  let store: WorkspaceStore;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "xr-fabric-"));
    store = new WorkspaceStore("fabric-test", join(tmp, "xr.db"));
    mkdirSync(join(tmp, "plugin"), { recursive: true });
  });

  afterEach(() => {
    try {
      store.close();
    } catch {}
    rmSync(tmp, { recursive: true, force: true });
  });

  function deps(extra: Partial<HostDeps> = {}): HostDeps {
    return {
      store,
      config: { security: {}, defaults: {} } as unknown as XRConfig,
      cwd: tmp,
      pluginDir: join(tmp, "plugin"),
      pluginId: "fabric-pack",
      ...extra,
    };
  }

  test("no `device` scope → no host.device capability", () => {
    const host = buildHost([], deps());
    expect(host.device).toBeUndefined();
  });

  test("`device` scope grants a working simulated fabric by default", () => {
    const host = buildHost(["device"], deps());
    expect(host.device).toBeDefined();
    const probe = host.device!.probe();
    expect(probe.available).toBe(true);
    expect(probe.backend).toBe("simulated");
    const nodes = host.device!.list();
    expect(nodes.length).toBeGreaterThan(0);
    const w = host.device!.write("gpio2", 1);
    expect(w.ok).toBe(true);
    const r = host.device!.read("gpio2");
    expect(r.ok).toBe(true);
  });

  test("an injected unavailable fabric surfaces fail-closed through the host", () => {
    const fabric = new SysfsGpioFabric("/nonexistent/root");
    const host = buildHost(["device"], deps({ deviceFabric: fabric }));
    expect(host.device!.probe().available).toBe(false);
    const r = host.device!.read("gpio2");
    expect(r.ok).toBe(false);
  });

  test("every fabric call lands in the tamper-evident audit chain", () => {
    const host = buildHost(["device"], deps());
    host.device!.list();
    host.device!.read("adc0");
    host.device!.write("gpio2", 1);
    host.device!.read("gpio999"); // denied path must also audit
    const rows = store
      .prepare(`SELECT event, detail FROM audit_log`)
      .all() as Array<{ event: string; detail: string }>;
    const events = rows.map((r) => r.event);
    expect(events).toContain("plugin.device.list");
    expect(events).toContain("plugin.device.read");
    expect(events).toContain("plugin.device.write");
    const denied = rows.find((r) => r.event === "plugin.device.read" && JSON.parse(r.detail).id === "gpio999");
    expect(denied).toBeDefined();
    expect(JSON.parse(denied!.detail).ok).toBe(false);
    // the chain itself must still verify after fabric auditing
    expect(store.verifyChain().valid).toBe(true);
  });
});
