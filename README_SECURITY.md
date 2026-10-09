# XR Security — Start Here

XR's security story in three documents, ordered by permanence:

1. **[`SECURITY.md`](SECURITY.md)** — the security architecture: plugin isolation,
   risk-tiered placement lattice, browser/computer-control gates, environment restriction.
2. **[`docs/security/POSTURE.md`](docs/security/POSTURE.md)** — the canonical posture
   sentences every surface must agree with (fail-closed trust, defense-in-depth sandboxing,
   explicit non-certification).
3. **[`SECURITY_IMPLEMENTATION.md`](SECURITY_IMPLEMENTATION.md)** — the audited
   implementation status: what is verified live, what degrades honestly, what is not claimed.

## Reporting a vulnerability

Report privately to the repository owner (`ahmadrrrtx1@gmail.com`) with a reproduction
path. Do not open public issues for unpatched exposure. XR's own audit chain (`xr verify-log`)
is the evidence substrate for any incident you report about a running install.

## The two laws that shape everything

- **LAW 16 — Trust Fails Closed:** unknown identity, scope, permission, transition, or
  verdict resolves to deny.
- **LAW 12/17 — Placement Follows Risk; Policy Is Not Confinement:** policy gates are
  guard rails; real isolation comes from the placement lattice, honestly degraded per OS.
