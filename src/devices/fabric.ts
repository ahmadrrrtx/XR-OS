/**
 * XR — the device fabric seam (PACK_PROPOSAL.md §4, MRCA GAP-15 / DF-05).
 *
 * This module is the physical-world entry point of the ONE architecture:
 * devices and robots appear here as FABRIC NODES that the plugin host exposes
 * to packs holding the `device` permission scope. Nothing about it forks the
 * architecture (LAW 17): backends are ADAPTER VALUES selected by name, and a
 * new board family arrives as a new value, never a new layer.
 *
 * Backends shipped:
 *   simulated    deterministic in-memory nodes (tests, demos, air-gapped dev)
 *   sysfs-gpio   Linux sysfs GPIO (/sys/class/gpio); probes the platform and
 *                FAILS CLOSED when absent — it never simulates-as-real (LAW 16)
 *
 * Trust posture v0 (S-03 row 33 anticipation): the fabric itself does NOT
 * risk-classify pins — classification stays with the pack that owns the board
 * map (hello-device: observe/reversible/irreversible). The fabric enforces
 * the substrate invariants only: unknown node denied, direction mismatch
 * denied, unavailable backend denied, every operation shaped for audit.
 */

import { existsSync, readFileSync, writeFileSync, readdirSync } from "node:fs";

export interface DeviceNode {
  readonly id: string;
  readonly kind: "gpio" | "analog";
  readonly direction: "input" | "output";
  readonly label: string;
}

export interface FabricProbe {
  readonly available: boolean;
  readonly backend: string;
  readonly detail: string;
}

export type FabricResult<T> =
  | ({ ok: true } & T)
  | { ok: false; reason: string };

export interface DeviceFabric {
  readonly backend: string;
  probe(): FabricProbe;
  list(): readonly DeviceNode[];
  read(id: string): FabricResult<{ value: number; nodeId: string }>;
  write(id: string, value: number): FabricResult<{ written: number; readback: number; nodeId: string }>;
}

export const FABRIC_BACKENDS = ["simulated", "sysfs-gpio"] as const;
export type FabricBackend = (typeof FABRIC_BACKENDS)[number];

export function isFabricBackend(v: string): v is FabricBackend {
  return (FABRIC_BACKENDS as readonly string[]).includes(v);
}

// ── Simulated fabric (deterministic; replayable) ─────────────────────────────

const SIM_NODES: readonly DeviceNode[] = [
  { id: "gpio2", kind: "gpio", direction: "output", label: "sim:led-green" },
  { id: "gpio3", kind: "gpio", direction: "output", label: "sim:led-red" },
  { id: "gpio17", kind: "gpio", direction: "output", label: "sim:pump" },
  { id: "adc0", kind: "analog", direction: "input", label: "sim:soil-moisture" },
  { id: "adc1", kind: "analog", direction: "input", label: "sim:air-temp" },
  { id: "gpio22", kind: "gpio", direction: "input", label: "sim:button" },
];

/**
 * Deterministic in-memory fabric. Inputs derive from a monotonically
 * increasing tick counter only — no wall-clock, no randomness — so any
 * interaction sequence replays identically in tests.
 */
export class SimulatedFabric implements DeviceFabric {
  readonly backend = "simulated";
  private readonly out = new Map<string, number>();
  private tick = 0;
  private button = 0;

  constructor(nodes: readonly DeviceNode[] = SIM_NODES) {
    this.nodes = nodes;
    for (const n of nodes) if (n.direction === "output") this.out.set(n.id, 0);
  }
  private readonly nodes: readonly DeviceNode[];

  probe(): FabricProbe {
    return { available: true, backend: this.backend, detail: `simulated fabric (${this.nodes.length} deterministic nodes)` };
  }

  list(): readonly DeviceNode[] {
    return this.nodes;
  }

  read(id: string): FabricResult<{ value: number; nodeId: string }> {
    const node = this.nodes.find((n) => n.id === id);
    if (!node) return { ok: false, reason: `unknown device node: ${id}` };
    this.tick += 1;
    if (node.direction === "output") {
      return { ok: true, value: this.out.get(id) ?? 0, nodeId: id };
    }
    if (node.kind === "analog") {
      const value = node.id === "adc0"
        ? Math.max(0, Math.min(100, 62 - (this.tick % 40) * 0.75))
        : Math.round((21 + 4 * Math.sin(this.tick / 8)) * 100) / 100;
      return { ok: true, value, nodeId: id };
    }
    this.button = this.button === 1 ? 0 : 1;
    return { ok: true, value: this.button, nodeId: id };
  }

  write(id: string, value: number): FabricResult<{ written: number; readback: number; nodeId: string }> {
    const node = this.nodes.find((n) => n.id === id);
    if (!node) return { ok: false, reason: `unknown device node: ${id}` };
    if (node.direction !== "output") return { ok: false, reason: `node ${id} is an input; writes target outputs only` };
    if (typeof value !== "number" || !Number.isFinite(value)) return { ok: false, reason: "value must be a finite number" };
    const written = node.kind === "gpio" ? (value === 0 ? 0 : 1) : value;
    this.out.set(id, written);
    return { ok: true, written, readback: this.out.get(id) ?? 0, nodeId: id };
  }
}

// ── sysfs GPIO fabric (real hardware; probes then fails closed) ──────────────

const SYSFS_ROOT = "/sys/class/gpio";

/**
 * Linux sysfs GPIO backend. Platform detection is HONEST (LAW 16): the probe
 * checks for the sysfs GPIO interface and reports unavailable otherwise — in
 * containers, on non-Linux hosts, or on boards using the gpiochip chardev
 * interface. Reads/writes on an unavailable fabric deny with a reason; they
 * never throw into plugin code and never simulate-as-real.
 */
export class SysfsGpioFabric implements DeviceFabric {
  readonly backend = "sysfs-gpio";

  constructor(private readonly root: string = SYSFS_ROOT) {}

  probe(): FabricProbe {
    const ok = process.platform === "linux" && existsSync(`${this.root}/export`) && existsSync(`${this.root}/unexport`);
    return ok
      ? { available: true, backend: this.backend, detail: `sysfs GPIO at ${this.root}` }
      : {
          available: false,
          backend: this.backend,
          detail:
            process.platform !== "linux"
              ? `sysfs GPIO requires Linux (host: ${process.platform}); fail-closed per LAW 16`
              : `no sysfs GPIO interface at ${this.root}; fail-closed per LAW 16`,
        };
  }

  list(): readonly DeviceNode[] {
    // Enumerating exported GPIOs is only meaningful on a probed platform;
    // return an empty set elsewhere rather than inventing nodes.
    if (!this.probe().available) return [];
    try {
      return readdirSync(this.root)
        .filter((n) => /^gpio\d+$/.test(n))
        .map((n) => {
          const id = n;
          let direction: "input" | "output" = "input";
          try {
            direction = readFileSync(`${this.root}/${n}/direction`, "utf8").trim() === "out" ? "output" : "input";
          } catch {}
          return { id, kind: "gpio", direction, label: `sysfs:${id}` } as DeviceNode;
        });
    } catch {
      return [];
    }
  }

  read(id: string): FabricResult<{ value: number; nodeId: string }> {
    const probe = this.probe();
    if (!probe.available) return { ok: false, reason: probe.detail };
    if (!/^gpio\d+$/.test(id)) return { ok: false, reason: `invalid sysfs gpio id: ${id}` };
    try {
      const raw = readFileSync(`${this.root}/${id}/value`, "utf8").trim();
      const value = Number(raw);
      if (!Number.isFinite(value)) return { ok: false, reason: `unreadable value on ${id}: ${raw.slice(0, 40)}` };
      return { ok: true, value, nodeId: id };
    } catch (e) {
      return { ok: false, reason: `read failed on ${id}: ${(e as Error).message}` };
    }
  }

  write(id: string, value: number): FabricResult<{ written: number; readback: number; nodeId: string }> {
    const probe = this.probe();
    if (!probe.available) return { ok: false, reason: probe.detail };
    if (!/^gpio\d+$/.test(id)) return { ok: false, reason: `invalid sysfs gpio id: ${id}` };
    const written = value === 0 ? 0 : 1;
    try {
      writeFileSync(`${this.root}/${id}/value`, String(written));
      const back = this.read(id);
      if (!back.ok) return { ok: false, reason: `write readback failed on ${id}: ${back.reason}` };
      return { ok: true, written, readback: back.value, nodeId: id };
    } catch (e) {
      return { ok: false, reason: `write failed on ${id}: ${(e as Error).message}` };
    }
  }
}

// ── Factory (LAW 17: backends are values) ────────────────────────────────────

export function createFabric(backend: FabricBackend = "simulated"): DeviceFabric {
  switch (backend) {
    case "simulated":
      return new SimulatedFabric();
    case "sysfs-gpio":
      return new SysfsGpioFabric();
    default: {
      // Fail closed on unknown adapter values — never fall back silently.
      const never: never = backend;
      throw new Error(`unknown device fabric backend: ${String(never)}`);
    }
  }
}
