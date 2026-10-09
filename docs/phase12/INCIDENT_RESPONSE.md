# Phase 12 — Incident Response (Control IR-04)

> **Provenance note (2026-10-09):** the original document of this title was not carried in
> the public repository snapshot. This text was **reconstructed from executed evidence** —
> `src/enterprise/types.ts` (states/kinds/transition table), `src/enterprise/incidents/workflow.ts`
> (machinery), and `test/enterprise/incidents.test.ts` (the executable harness) — so that the
> control catalog's reference resolves to what the code actually implements. No content here
> claims more than the code demonstrates.

## 1. Purpose and scope

Documented tabletop and technical exercises for each incident kind, as declared by control
**IR-04** in the Phase 12 control catalog (`src/enterprise/certification/evidence.ts`).

Assurance kind: **operational.** Known limitation (from the catalog, carried verbatim):
*"Exercise cadence and participation are organizational responsibilities."*

## 2. The incident model the exercises run against

**Seven states** (enforced transition table; illegal transitions are refused; `postmortem` is terminal):

```
detected → triaged → contained → quarantined → remediating → resolved → postmortem
```

Fast-path containment straight from `detected` is permitted (tested). Same-state transitions
are no-op successes. Unknown incident ids fail cleanly. `responseTimeMs` measures detection → containment.

**Four severities:** `low | medium | high | critical`.

**Eight incident kinds:**

| Kind | One-line definition |
|---|---|
| `capability_abuse` | A capability used outside its granted contract or risk tier |
| `credential_exposure` | Secret material observed outside the keychain/lease boundary |
| `isolation_failure` | An execution escaped its placement guarantee |
| `tenant_data_leakage` | Workspace-scoped data crossed its scope boundary |
| `provider_compromise` | Upstream model/service endpoint suspected hostile or hijacked |
| `malicious_package` | Installed pack failed hash/signature or behavioral screening |
| `audit_failure` | Audit-chain verification failed (fail-closed halt per LAW 16) |
| `worker_compromise` | A worker/agent process suspected acting outside policy |

**User-visibility rule (implemented + tested):** `tenant_data_leakage` always implies
user-visible impact; `critical` and `high` severity always do; user-visible incidents
trigger notification and appear in `userVisibleIncidents` (open incidents only).

**Evidence preservation:** incident evidence items are appended with kind + detail, bounded
by `ENTERPRISE_BOUNDS.MAX_INCIDENT_EVIDENCE_ITEMS`; every state change writes a timeline
entry. Evidence is append-only — consistent with the hash-chained audit discipline (S-03).

## 3. Tabletop exercises (one per kind)

Each exercise states: trigger scenario → expected detection path → expected containment
action → evidence to preserve → postmortem question set.

| # | Kind | Tabletop scenario | Expected machine path |
|---|---|---|---|
| T1 | `capability_abuse` | A plugin tool repeatedly probes paths outside its grant | detected (risk classifier) → triaged → contained (capability suspended) → postmortem: was the grant too broad? |
| T2 | `credential_exposure` | A log line would carry a bearer token | detected (redaction/alert) → contained (rotation lease revoked, zeroized) → postmortem: which surface leaked? |
| T3 | `isolation_failure` | Worker attempts host process access | detected → contained → quarantined → postmortem: placement guarantee vs guarantee matrix |
| T4 | `tenant_data_leakage` | Memory recall across workspace scopes | detected → triaged → contained → **user notification mandatory** → postmortem: consent record review |
| T5 | `provider_compromise` | Adapter responses drift from fixture canaries | detected (canary mismatch) → contained (routing fenced) → postmortem: preset vs native adapter blast radius |
| T6 | `malicious_package` | Installed pack tree-hash mismatch on update | detected (hash gate) → quarantined → revoked → postmortem: registry/mirror hygiene |
| T7 | `audit_failure` | `verify-log` reports chain break | detected → contained (halt-and-alert, fail-closed) → remediated via `audit.repair` with recorded actor → postmortem: what wrote off-chain? |
| T8 | `worker_compromise` | Agent process emits off-policy actions | detected → contained (cancel-forced) → quarantined → postmortem: supervision gap in graph |

## 4. Technical exercises (executable)

The standing technical exercise is the conformance harness itself:

```
bun test test/enterprise/incidents.test.ts
```

It executes: all seven states defined; all eight kinds supported; legal transitions enforced;
illegal transitions rejected; postmortem terminal; detection timeline; visibility rules;
fast-path containment; response-time measurement; evidence preservation bounds.

**Re-entry condition for stronger claims:** an organization adopting XR declares an exercise
cadence and records participation; XR's software provides the machine and the evidence, not
the organizational process (IR-04 limitation, stated plainly).

## 5. Honesty boundaries (P-13)

- No external incident-response certification is claimed; none exists (see SECURITY.md).
- These exercises are **documented and executable-in-harness**; live-drill execution is an
  operator activity, and this document does not assert it has been performed at any cadence.
