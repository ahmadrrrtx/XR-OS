# PACK PROPOSAL — `hello-device` (DF-05: first real pack with hardware discipline)

**Status:** PROPOSED (pack ships simulated; hardware binding awaits the seam in §4)
**Canonical basis:** MRCA GAP-15 (reserved robotics seams), DF-05 (re-entry condition: "first real pack proposal with hardware evidence"), S-05 ownership row 51 (devices as composed capabilities), S-03 ownership row 33 (robotics/actuation trust gates), S6-UQ-03 (robot L-levels), LAW 16 (fail closed), LAW 17 (adapters, not architecture edits), P-13 (truth over marketing).

---

## 1. What this pack activates

The canonical architecture reserved the physical world from day one. This pack is the
first activation of those reserved seams — **without amending any spec and without
touching the kernel**:

| Reserved seam | Activation in this pack |
|---|---|
| S-05 row 51 — devices as composed capabilities | Board pins are exposed as ordinary plugin tools: one descriptor shape for an LED, a pump, a soil sensor — "Nothing Is Special", embodied |
| S-03 row 33 — actuation trust gates | Actuation risk lattice v0: `observe` (no approval) / `reversible` (XR approval gate) / `irreversible` (approval **plus** explicit `confirm:true`) |
| LAW 16 — trust fails closed | Unknown pin, wrong direction, unavailable driver, missing confirm → deny. No fail-open path exists in the code |
| LAW 17 — adapters as values | Drivers are runtime values (`simulated`, `rpi-sysfs`) switched via the approval-gated `select_driver` tool; a new board adds a value, never a layer |
| S-02 Evidence stage | Every actuation returns structured evidence (`from`/`to`/`readback`/`risk`/journal chain ref) that the envelope seals into the ExecutionRecord |
| S-03 audit chain | Every actuation emits `plugin.device.write` / `plugin.device.blink` / `plugin.device.driver.select` into XR's tamper-evident chain — verifiable via `xr verify-log`. This is the flight recorder |

## 2. Honesty register (P-13)

Claims this pack makes, each with its evidence:

- **"Simulated by default"** — TRUE: the `simulated` driver is a deterministic in-memory
  board; conformance tests in `test/plugins/hello-device.test.ts` execute against it.
- **"Hardware-unverified"** — TRUE and stated: the `rpi-sysfs` adapter probes and reports
  itself unavailable; it never simulates-as-real. No physical board has executed this pack.
- **"Integrity-chained journal"** — the journal chain is a NON-cryptographic FNV-1a
  checksum labeled as such; the authoritative tamper-evident record is XR's audit chain.
- **"Immediate pacing"** — `blink` toggles without delays; paced timing requires the S-02
  scheduler timer source (GAP-19). Stated in every blink result.

Claims this pack does **not** make: real-time control, safety certification, robot
autonomy levels beyond the v0 lattice, multi-node/fleet behavior.

## 3. What it demonstrates (the physical-world thesis)

One intent can now traverse, in one process: **model decision → risk classification →
human approval gate → device action → readback verification → sealed evidence → hash-
chained audit entry.** That pipeline, running identically for a simulated LED today and a
real valve tomorrow, is the argument that XR's kernel governs physical action without
architectural change. The demo is the thesis.

## 4. The seam request (what must change — outside this pack)

This pack deliberately stops at the sandbox boundary. To bind real hardware, XR core
needs exactly one addition, proposed here for the Ω-next window:

1. **A `device` permission scope** (S-05/S-03 amendment candidate): plugin-declared device
   access, granted at install like other scopes, with S-03 owning the posture (which
   device classes may bind under which risk lattice).
2. **A host device-fabric capability** (S-07/S-01 surface): `host.device` exposing
   enumerated device classes (gpio/i2c/serial/ble) with per-handle risk attestation —
   the plugin-visible membrane for `/sys/class/gpio`, chardev, or an MCU bridge.
3. **S-02 timer source for paced actuation** (GAP-19, already scheduled): enables
   time-based blink/PWM without busy-waiting inside sandboxes.

**Status (implemented):** seams 1 and 2 shipped — the `device` permission scope
(src/plugins/types.ts) and the host device-fabric capability `host.device`
(src/devices/fabric.ts: `simulated` + `sysfs-gpio` adapter values, fail-closed
probes, audited reads/writes). This pack's `rpi-sysfs` driver now binds through
that fabric: it reports available ONLY on a probed `sysfs-gpio` backend and
never simulates-as-real. Seam 3 (S-02 timer source, GAP-19) remains pending;
blink pacing is immediate-v1 until it ships. The pack remains a fully-tested
simulated reference everywhere else — the canon-correct state (GAP-15: "no
behavior until packs exist"; DF-05: this proposal is the re-entry artifact).

## 5. Verification

- Manifest + sandbox-load conformance: `bun test test/plugins/hello-device.test.ts`
- Actuation lattice behavior: same suite (fail-closed denies are asserted, not assumed)
- Audit emission: asserted against a recording host; core chain semantics owned and
  tested by S-03 core tests (this pack only appends events)

*Pack author: rrrtx · Companion: `xr-plugin.json`, `index.ts`, `test/plugins/hello-device.test.ts`*
