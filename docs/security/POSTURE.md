# XR Security Posture — canonical statements

Single source for the security posture sentences that source and docs must agree on
(policed by `test/security/nodevm-wording.test.ts` and the claim-lint machinery).

## 1. The plugin sandbox posture (Phase 4 · T8)

The in-process `node:vm` realm is **defense-in-depth, not a security boundary**: it shares
the host process and cannot be treated as confinement. Real confinement in XR comes from the
risk-tiered placement lattice (S-03): in-process → worker → container-vm, with an honest
per-OS guarantee matrix that degrades explicitly where a tier is unavailable. Static
scanning of pack sources is likewise defense-in-depth — it catches obvious issues early and
never substitutes for policy gates or placement.

## 2. Fail-closed discipline (LAW 16)

Unknown identity, scope, permission, transition, or verdict resolves to **deny**. Egress is
allow-list with private-IP blocking; the dashboard binds loopback-only with bearer token;
the audit chain halts-and-alerts on verification failure.

## 3. What XR is not (verbatim posture)

- XR is **not certified** against SOC 2, ISO 27001, HIPAA, PCI-DSS or FedRAMP; no external
  audit exists.
- XR is **not a sandbox** in the kernel/VM sense: it enforces in-process policy — a strong
  guard rail, not a confinement boundary.
- XR makes **no provable-security claim**: the shipped mechanism is deterministic input
  screening plus a fail-closed policy gate.

## 4. Where each property lives

| Property | Home | Evidence |
|---|---|---|
| Placement lattice + guarantees | S-03 (`src/security`, `src/platform/environment`) | audit §5, live probe matrix |
| Tamper-evident audit chain | S-03 (`src/state` single-writer) | `xr verify-log` |
| Consent-gated memory | S-04 via S-03 consent records | memory consent tests |
| Release truth + claim-lint | S-01 / S-00 tooling | CI drift gates |
