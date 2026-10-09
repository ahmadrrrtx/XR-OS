# CANON AMENDMENT — ADR-XR-012: ADMISSION OF S-08 + LAW 10 SCOPE NOTE

**Status:** RATIFIED by the reconciliation series (2026-08-08); recorded in-repo 2026-10-09
**Ratification item:** `XR_RATIFICATION_CHECKLIST.md` §A-1 (Ω-0, P0)
**Companion decisions:** ADR-XR-012 (identity/delivery split), MRCA CON-03, GAP-02, R-AUTH-4

---

## Why this amendment exists

Agent 1's Canon is a sealed world that cites only S-00…S-07 (grep-verified), yet S-08
(Distribution & Platform) was later appended by both agents as the terminal Tier-2 spec.
GAP-02 requires the Canon to be *amended* — not reinterpreted — to admit it. This document
carries the exact amendment text, ready to merge into the Canon document of record.

## Amendment §1 — Spec-family admission (merge into Canon, scope section)

> The specification family admitted by this Canon comprises S-00 through S-08; S-08
> (Distribution & Platform) is the terminal Tier-2 specification, admitted per ADR-XR-012.

## Amendment §2 — LAW 10 scope note (merge under LAW 10, One Release Manifest)

> `release.manifest.json` has exactly one writer — the S-01 Kernel; S-08 and every
> downstream surface consume it read-only.

## Amendment §3 — Supersession footnote (attach to A1-MP §2.4)

> **Superseded in place.** The clause "a separate Distribution spec is rejected; delivery
> merges into S-01" is superseded by ADR-XR-012: release *identity/truth* remains the S-01
> Kernel's (one writer, LAW 10), while release *delivery* — packaging, channels, install,
> update, rollback, air-gap, mirrors, backup — is owned by S-08, the terminal Tier-2 spec.
> See `XR_MASTER_DECISION_REGISTER.md` ADR-XR-012 and MRCA §4.1#10 / §4.8.

## Boundary rules this amendment locks (from MRCA, unchanged)

- **R-AUTH-4:** S-08's sealed-scope claim is accepted; it is the terminal spec and may
  never add a primitive, event, machine, or law.
- **EX-04:** S-08 consumes the S-01 release manifest read-only; the single writer stays S-01.
- No new primitive, event, or machine is created by this amendment (USM inventory intact:
  42 events, 11 machines).

## Closure evidence

- Amendment text merged into the canonical series: S-08 canonical spec + review carry the
  terminal-spec status; `XR_S-08_CANONICAL_REVIEW.md` logged the GAP-21 merge (A1 skeleton
  + A2 matrices) — UQ-03 CLOSED.
- This file is the in-repo record so CI-side gates (S-08 §27 rail, claim-lint, release-drift
  gates) can cite a resolvable authority path.
