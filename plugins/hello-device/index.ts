/**
 * XR hello-device — the first physical-world capability pack.
 *
 * ── What this pack is ───────────────────────────────────────────────────────
 * A DF-05 pack proposal (see PACK_PROPOSAL.md): it activates the reserved
 * device/robotics seams of the canonical architecture WITHOUT amending any
 * spec and WITHOUT touching the kernel:
 *
 *   · S-05 row 51  — devices as composed capabilities ("Nothing Is Special":
 *                    a GPIO pin is a CapabilityDescriptor like any LLM or API)
 *   · S-03 row 33  — robotics/actuation trust posture, v0 form: a risk
 *                    lattice (observe / reversible / irreversible) where every
 *                    actuation passes XR's approval gate and lands in the
 *                    tamper-evident audit chain via host.audit()
 *   · LAW 17       — drivers are ADAPTER VALUES (`simulated`, `rpi-sysfs`),
 *                    selected at runtime; a new board adds a value, never a
 *                    layer
 *   · LAW 16       — trust FAILS CLOSED: unknown pin, wrong direction,
 *                    unavailable driver, or missing confirm on an irreversible
 *                    class all resolve to deny
 *
 * ── Honesty (P-13) ──────────────────────────────────────────────────────────
 * The default driver is SIMULATED: deterministic in-memory pins, testable
 * anywhere, offline. The `rpi-sysfs` driver binds through the host's device
 * fabric (the PACK_PROPOSAL.md §4 seam, granted as the `device` permission
 * scope): it reports available ONLY when the fabric probes a real `sysfs-gpio`
 * backend — a simulated fabric never satisfies it, and every unavailable path
 * fails closed. This pack never simulates-as-real and never claims hardware
 * it cannot reach.
 *
 * The pack requests ONE permission — `device` — granted at install like any
 * scope, with every fabric read/write audited by the host. The device journal
 * is in-memory for v1 (persistence is a future seam); the authoritative
 * tamper-evident record of every actuation is XR's own audit chain
 * (host.audit → `plugin.device.*`), verifiable via `xr verify-log`.
 *
 * NOTE: plugins receive ONLY the host. No node:fs, no process, no fetch.
 */
import type { PluginHost, PluginContributions } from "../../src/plugins/types.ts";

// ── Actuation risk lattice v0 ────────────────────────────────────────────────
// observe      read sensors/inputs; no actuation; no approval
// reversible   digital output undoable by a later write (LED, buzzer);
//              approval-gated by XR's plugin tool gate
// irreversible starts a physical process a later write cannot undo
//              (fluid moved, flow changed); approval gate PLUS an explicit
//              confirm token in the call arguments
export type RiskClass = "observe" | "reversible" | "irreversible";

export interface PinSpec {
  pin: string;
  name: string;
  direction: "input" | "output";
  risk: RiskClass;
  kind: "digital" | "analog";
  unit?: string;
}

/** Reference board "XR-DEV-KIT v0": 5 outputs + 3 inputs. */
const BOARD: readonly PinSpec[] = [
  { pin: "gpio2",  name: "led-green",    direction: "output", risk: "reversible",   kind: "digital" },
  { pin: "gpio3",  name: "led-red",      direction: "output", risk: "reversible",   kind: "digital" },
  { pin: "gpio4",  name: "buzzer",       direction: "output", risk: "reversible",   kind: "digital" },
  { pin: "gpio17", name: "water-pump",   direction: "output", risk: "irreversible", kind: "digital" },
  { pin: "gpio27", name: "solenoid-valve", direction: "output", risk: "irreversible", kind: "digital" },
  { pin: "adc0",   name: "soil-moisture", direction: "input", risk: "observe", kind: "analog", unit: "%" },
  { pin: "adc1",   name: "air-temp",      direction: "input", risk: "observe", kind: "analog", unit: "C" },
  { pin: "gpio22", name: "button",        direction: "input", risk: "observe", kind: "digital" },
];

// ── Driver seam (LAW 17: adapters are values) ────────────────────────────────

interface DriverProbe { available: boolean; detail: string }
interface DeviceDriver {
  readonly name: string;
  probe(): DriverProbe;
  read(spec: PinSpec, tick: number): { value: number };
  write(spec: PinSpec, value: number): { written: number; readback: number };
}

/** Deterministic in-memory board. Sensors drift from a tick counter only —
 *  no wall-clock, no randomness — so behavior is replayable in tests. */
class SimulatedBoardDriver implements DeviceDriver {
  readonly name = "simulated";
  private readonly out = new Map<string, number>();
  private button = 0;
  constructor() {
    for (const p of BOARD) if (p.direction === "output") this.out.set(p.pin, 0);
  }
  probe(): DriverProbe {
    return { available: true, detail: "simulated XR-DEV-KIT v0 (in-memory; deterministic)" };
  }
  read(spec: PinSpec, tick: number): { value: number } {
    if (spec.direction === "output") return { value: this.out.get(spec.pin) ?? 0 };
    if (spec.pin === "adc0") return { value: clamp(62 - (tick % 40) * 0.75, 0, 100) };   // soil drying cycle
    if (spec.pin === "adc1") return { value: round2(21 + 4 * Math.sin(tick / 8)) };       // air temp wave
    this.button = this.button === 1 ? 0 : 1;                                              // button toggles
    return { value: this.button };
  }
  write(spec: PinSpec, value: number): { written: number; readback: number } {
    this.out.set(spec.pin, value);
    return { written: value, readback: this.out.get(spec.pin) ?? 0 };
  }
}

/**
 * Raspberry Pi sysfs driver — binds through the host's device fabric seam
 * (PACK_PROPOSAL.md §4, now granted as the `device` permission scope).
 *
 * Honesty contract (LAW 16 / P-13):
 *  - available ONLY when the fabric reports available AND its backend is
 *    `sysfs-gpio`; a simulated fabric NEVER satisfies this driver — refusing
 *    to simulate-as-real is the whole point of the adapter.
 *  - if the `device` scope was not granted (host.device undefined) or the
 *    fabric is unavailable, probe reports honestly and read/write fail closed.
 * No kernel change, per LAW 17: this is an adapter VALUE over the fabric.
 */
class RpiSysfsDriver implements DeviceDriver {
  readonly name = "rpi-sysfs";
  constructor(private readonly host: PluginHost) {}

  probe(): DriverProbe {
    const fabric = this.host.device;
    if (!fabric) {
      return {
        available: false,
        detail:
          "`device` permission scope not granted — no device fabric exposed. " +
          "Fail-closed per LAW 16: refusing to simulate-as-real.",
      };
    }
    const p = fabric.probe();
    if (!p.available) {
      return { available: false, detail: `fabric probe unavailable: ${p.detail}. Fail-closed per LAW 16.` };
    }
    if (p.backend !== "sysfs-gpio") {
      return {
        available: false,
        detail:
          `fabric backend is "${p.backend}", not "sysfs-gpio". ` +
          "Fail-closed per LAW 16: refusing to simulate-as-real.",
      };
    }
    return { available: true, detail: `bound to device fabric (${p.backend}): ${p.detail}` };
  }

  read(spec: PinSpec): { value: number } {
    const probe = this.probe();
    if (!probe.available) throw new Error(`fail-closed: rpi-sysfs unavailable — ${probe.detail}`);
    const r = this.host.device!.read(spec.pin);
    if (!r.ok) throw new Error(`fail-closed: fabric read ${spec.pin} denied — ${r.reason}`);
    return { value: r.value };
  }

  write(spec: PinSpec, value: number): { written: number; readback: number } {
    const probe = this.probe();
    if (!probe.available) throw new Error(`fail-closed: rpi-sysfs unavailable — ${probe.detail}`);
    const w = this.host.device!.write(spec.pin, value);
    if (!w.ok) throw new Error(`fail-closed: fabric write ${spec.pin} denied — ${w.reason}`);
    return { written: w.written, readback: w.readback };
  }
}

// ── Device action journal (evidence artifact; integrity-chained) ─────────────
// The journal is EVIDENCE DATA, not authority: the authoritative tamper-
// evident record is XR's audit chain (host.audit). The chain below is a
// NON-cryptographic FNV-1a integrity checksum (plugins hold no crypto fabric
// in v1); it exists so `journal.verify` can detect accidental corruption.

export interface JournalEntry {
  seq: number;
  ts: number;
  op: string;
  pin: string;
  from: number | null;
  to: number | null;
  risk: RiskClass | null;
  driver: string;
  chain: string;
}

function fnv1a(str: string): string {
  let h1 = 0x811c9dc5 | 0;
  let h2 = 0x01000193 | 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619) | 0;
    h2 = Math.imul(h2 ^ ((c + i) & 0xffff), 16777619) | 0;
  }
  return (h1 >>> 0).toString(16).padStart(8, "0") + (h2 >>> 0).toString(16).padStart(8, "0");
}

const GENESIS = "0000000000000000";
const JOURNAL_CAP = 200;

function chainEntry(prev: string, e: Omit<JournalEntry, "chain">): string {
  const body = [prev, e.seq, e.ts, e.op, e.pin, e.from, e.to, e.risk, e.driver].join("|");
  return fnv1a(body);
}

function verifyChain(entries: readonly JournalEntry[]): boolean {
  let prev = GENESIS;
  for (const e of entries) {
    const { chain, ...rest } = e;
    if (chainEntry(prev, rest) !== chain) return false;
    prev = chain;
  }
  return true;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
function findPin(pin: unknown): PinSpec | undefined {
  if (typeof pin !== "string" || pin.length === 0 || pin.length > 32) return undefined;
  return BOARD.find((p) => p.pin === pin || p.name === pin);
}
function toDigital(value: unknown): number | undefined {
  if (value === 0 || value === false || value === "0" || value === "off" || value === "low") return 0;
  if (value === 1 || value === true || value === "1" || value === "on" || value === "high") return 1;
  return undefined;
}

// ── activation ───────────────────────────────────────────────────────────────

export function activate(host: PluginHost): PluginContributions {
  const drivers: Record<string, DeviceDriver> = {
    simulated: new SimulatedBoardDriver(),
    "rpi-sysfs": new RpiSysfsDriver(host),
  };
  let driverName = "simulated";
  let tick = 0;
  const journal: JournalEntry[] = [];

  const driver = (): DeviceDriver => drivers[driverName];

  function appendJournal(op: string, pin: string, from: number | null, to: number | null, risk: RiskClass | null): JournalEntry {
    const prev = journal.length > 0 ? journal[journal.length - 1].chain : GENESIS;
    const base: Omit<JournalEntry, "chain"> = { seq: journal.length + 1, ts: Date.now(), op, pin, from, to, risk, driver: driverName };
    const entry: JournalEntry = { ...base, chain: chainEntry(prev, base) };
    journal.push(entry);
    if (journal.length > JOURNAL_CAP) journal.shift();
    return entry;
  }

  function fail(reason: string, data?: Record<string, unknown>): { ok: false; output: string; data?: unknown } {
    return { ok: false, output: `denied: ${reason}`, data: { failClosed: true, reason, ...data } };
  }

  function snapshot(): Record<string, unknown> {
    const probe = driver().probe();
    return {
      driver: driverName,
      drivers: Object.keys(drivers),
      probe,
      pins: BOARD.map((p) => ({ pin: p.pin, name: p.name, direction: p.direction, risk: p.risk, kind: p.kind, unit: p.unit ?? null })),
      journalEntries: journal.length,
      journalHead: journal.length > 0 ? journal[0].chain : GENESIS,
      journalTail: journal.length > 0 ? journal[journal.length - 1].chain : GENESIS,
    };
  }

  host.log(`activated (board XR-DEV-KIT v0, driver=${driverName}, actuation lattice v0)`);

  return {
    commands: [
      {
        name: "probe",
        description: "Probe the active device driver and print the pin map.",
        run() {
          const s = snapshot();
          host.log(`driver=${s.driver} available=${(s.probe as DriverProbe).available} — ${(s.probe as DriverProbe).detail}`);
          for (const p of BOARD) host.log(`  ${p.pin.padEnd(7)} ${p.name.padEnd(15)} ${p.direction.padEnd(6)} risk=${p.risk}`);
        },
      },
    ],
    tools: [
      {
        name: "status",
        description: "Driver probe result, board pin map, and device-journal summary. Observe tier.",
        parameters: {},
        requiresApproval: false,
        run() {
          const s = snapshot();
          return { ok: true, output: `driver=${s.driver} available=${(s.probe as DriverProbe).available} pins=${BOARD.length} journal=${s.journalEntries}`, data: s };
        },
      },
      {
        name: "read",
        description: "Read an input/sensor pin. Observe tier: never actuates, no approval. Fails closed on output pins, unknown pins, or unavailable driver.",
        parameters: { pin: "string (gpio id or name)" },
        requiresApproval: false,
        run(args) {
          const spec = findPin(args.pin);
          if (!spec) return fail(`unknown pin: ${String(args.pin)}`);
          if (spec.direction !== "input") return fail(`pin ${spec.pin} is an output; reads must never actuate (observe tier only)`);
          const probe = driver().probe();
          if (!probe.available) return fail(`driver "${driverName}" unavailable: ${probe.detail}`);
          tick += 1;
          try {
            const r = driver().read(spec, tick);
            return {
              ok: true,
              output: `${spec.name} (${spec.pin}) = ${r.value}${spec.unit ? " " + spec.unit : ""}`,
              data: { pin: spec.pin, name: spec.name, value: r.value, unit: spec.unit ?? null, risk: "observe", driver: driverName },
            };
          } catch (e) {
            return fail(`read error on ${spec.pin}: ${(e as Error).message}`);
          }
        },
      },
      {
        name: "write",
        description:
          "Write an output pin. Approval-gated. Risk classes: reversible (LED/buzzer) needs the XR approval gate; irreversible (pump/valve) needs approval AND {confirm:true}. Fails closed on unknown pins, inputs, or unavailable driver.",
        parameters: { pin: "string", value: "0|1|on|off", confirm: "boolean (required true for irreversible class)" },
        requiresApproval: true,
        run(args) {
          const spec = findPin(args.pin);
          if (!spec) return fail(`unknown pin: ${String(args.pin)}`);
          if (spec.direction !== "output") return fail(`pin ${spec.pin} is an input; writes target outputs only`);
          const value = toDigital(args.value);
          if (value === undefined) return fail(`value must be 0|1|on|off|true|false (got ${String(args.value)})`);
          if (spec.risk === "irreversible" && args.confirm !== true) {
            return fail(
              `pin ${spec.pin} (${spec.name}) is IRREVERSIBLE-class physical actuation; pass confirm:true after human review`,
              { pin: spec.pin, risk: spec.risk },
            );
          }
          const probe = driver().probe();
          if (!probe.available) return fail(`driver "${driverName}" unavailable: ${probe.detail}`);
          try {
            const from = driver().read(spec, tick).value;
            const w = driver().write(spec, value);
            const entry = appendJournal("write", spec.pin, from, w.written, spec.risk);
            host.audit("device.write", {
              pin: spec.pin,
              name: spec.name,
              from,
              to: w.written,
              readback: w.readback,
              risk: spec.risk,
              driver: driverName,
              journalSeq: entry.seq,
              journalChain: entry.chain,
            });
            return {
              ok: true,
              output: `${spec.name} (${spec.pin}): ${from} → ${w.written} [readback=${w.readback}, class=${spec.risk}, driver=${driverName}]`,
              data: {
                pin: spec.pin,
                name: spec.name,
                from,
                to: w.written,
                readback: w.readback,
                risk: spec.risk,
                driver: driverName,
                evidence: { journalSeq: entry.seq, journalChain: entry.chain, verified: verifyChain(journal) },
              },
            };
          } catch (e) {
            return fail(`write error on ${spec.pin}: ${(e as Error).message}`);
          }
        },
      },
      {
        name: "blink",
        description:
          "Blink a reversible output pin N times (toggle, then restore). Approval-gated. Irreversible pins are refused. Timing is immediate in v1: paced blinking needs the S-02 scheduler timer source (GAP-19).",
        parameters: { pin: "string", times: "number 1..10 (default 3)" },
        requiresApproval: true,
        run(args) {
          const spec = findPin(args.pin);
          if (!spec) return fail(`unknown pin: ${String(args.pin)}`);
          if (spec.direction !== "output" || spec.kind !== "digital") return fail(`pin ${spec.pin} is not a digital output`);
          if (spec.risk !== "reversible") return fail(`pin ${spec.pin} is ${spec.risk}-class; blink is reversible-tier only`);
          const probe = driver().probe();
          if (!probe.available) return fail(`driver "${driverName}" unavailable: ${probe.detail}`);
          let times = typeof args.times === "number" ? Math.floor(args.times) : 3;
          if (!Number.isFinite(times) || times < 1 || times > 10) return fail(`times must be an integer 1..10 (got ${String(args.times)})`);
          try {
            const start = driver().read(spec, tick).value;
            let cur = start;
            for (let i = 0; i < times * 2; i++) {
              cur = cur === 1 ? 0 : 1;
              driver().write(spec, cur);
            }
            const end = driver().read(spec, tick).value;
            const entry = appendJournal("blink", spec.pin, start, end, spec.risk);
            host.audit("device.blink", { pin: spec.pin, times, from: start, to: end, driver: driverName, journalSeq: entry.seq });
            return {
              ok: true,
              output: `${spec.name} blinked ${times}x (${start} → … → ${end}) [immediate pacing; timer source pending GAP-19]`,
              data: { pin: spec.pin, times, from: start, to: end, risk: spec.risk, driver: driverName, pacing: "immediate-v1" },
            };
          } catch (e) {
            return fail(`blink error on ${spec.pin}: ${(e as Error).message}`);
          }
        },
      },
      {
        name: "select_driver",
        description:
          "Switch the device driver adapter value ('simulated' | 'rpi-sysfs'). Approval-gated configuration change. LAW 17: a new board arrives as a value here, never as an architecture change.",
        parameters: { driver: "'simulated' | 'rpi-sysfs'" },
        requiresApproval: true,
        run(args) {
          const name = String(args.driver ?? "");
          const next = drivers[name];
          if (!next) return fail(`unknown driver "${name}" (known: ${Object.keys(drivers).join(", ")})`);
          const prev = driverName;
          driverName = name;
          const probe = next.probe();
          appendJournal("select_driver", `adapter:${name}`, null, null, null);
          host.audit("device.driver.select", { from: prev, to: name, available: probe.available, detail: probe.detail });
          return {
            ok: true,
            output: `driver ${prev} → ${name}; available=${probe.available} (${probe.detail})`,
            data: { from: prev, to: name, probe },
          };
        },
      },
      {
        name: "journal",
        description:
          "Read the device action journal (evidence artifact). Returns entries plus an integrity-chain verification. Read-only; the authoritative record is XR's audit chain (xr verify-log).",
        parameters: { limit: "number 1..200 (default 20, newest last)" },
        requiresApproval: false,
        run(args) {
          let limit = typeof args.limit === "number" ? Math.floor(args.limit) : 20;
          if (!Number.isFinite(limit) || limit < 1) limit = 20;
          limit = Math.min(limit, JOURNAL_CAP);
          const entries = journal.slice(-limit);
          const verified = verifyChain(journal);
          return {
            ok: true,
            output: `${journal.length} device action(s); integrity ${verified ? "VERIFIED" : "BROKEN"}; authority = XR audit chain`,
            data: { count: journal.length, verified, genesis: GENESIS, entries },
          };
        },
      },
    ],
    dispose() {
      journal.length = 0;
      host.log("disposed");
    },
  };
}

export default activate;

/**
 * Test/inspection hooks ONLY. Exported so the conformance suite can exercise
 * pure functions and simulate journal tampering; never required at runtime.
 */
export const __xrDeviceInternals = {
  BOARD,
  fnv1a,
  chainEntry,
  verifyChain,
  GENESIS,
  SimulatedBoardDriver,
  RpiSysfsDriver,
};
