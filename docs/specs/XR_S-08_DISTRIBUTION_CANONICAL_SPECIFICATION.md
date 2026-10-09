# XR S-08 — DISTRIBUTION & PLATFORM — CANONICAL SPECIFICATION

**Series:** XR Canonical Specification Series · **Layer:** 8 of 8 — the **terminal** Tier-2 layer (S-01 → S-08), with S-00 realization at the foot
**Status:** Canonical candidate · supersedes and retires `XR_S-08_DISTRIBUTION_AND_PLATFORM_SPECIFICATION.md` (source text 1) and `xr-s-08-distribution-platform-specification.md` (source text 2), which are preserved in `/uploads/` as historical material only
**Depends on:** XR Canon (LAW 01–17 + Principles, per ADR-XR-002 — **Canon amendment admitting S-08 queued by ADR-XR-012, GAP-02**) · canonical S-01 · canonical S-02 · canonical S-03 · canonical S-04 · canonical S-05 · canonical S-06 · canonical S-07 · UPS-01 · USM-01 · ADR-XR-001…030 (esp. **012, 018, 020, 024, 027, 028, 029, 030**, 017/019/021/022/026) · MRCA (CON-03, D-13, D-17, D-33, R-11 resolved by ADR-XR-012; **GAP-21 merge rule applied below; UQ-20 structural discharge §10.7**)
**Authority notes (R-AUTH-3, R-AUTH-4):** The Constitution is pending ratification; it is named as authority source #1 per the user's directive, but no article numbers are cited as evidence anywhere in this document. As the terminal spec (R-AUTH-4), S-08 may never add a primitive, event family, state machine over substrate truth, or law.

---

## 0. Canonical Vocabulary for This Document

Terms not defined here come from canonical S-01…S-07 §0. New or sharpened here — each is a **definition nobody else may redefine**:

| Term | Definition (owner: S-08 unless stated) |
|---|---|
| **Distribution** | A packaging of the ONE architecture for an environment — a **value** from the kind registry (`desktop \| cli \| server \| cloud \| container \| portable \| embedded \| robot \| enterprise \| developer \| education \| research \| air-gapped \| offline \| self-hosted \| managed \| future.*`). **ONE PRODUCT. MANY DISTRIBUTIONS. NEVER MANY ARCHITECTURES.** |
| **Edition** | A licensing slant of the same Release: `Community \| Professional \| Enterprise \| Education \| Research \| OEM \| future.*`. Current repo reality: MIT only (audit-verified); other editions are forward-looking values with claims gated until shipped (ADR-XR-029) |
| **Release (delivery view)** | The **delivery binding** `{manifestHash → Artifacts[] → Channels[]}` of one release. **Release *identity* is S-01's `release.manifest.json`, consumed read-only** (ADR-XR-012, EX-04, LAW 10). S-08 never writes version truth |
| **Channel** | A promotion lane: `nightly → canary → beta → stable → lts` (+ `enterprise` alias of stable with an EnterpriseProfile overlay; + `offline` delivery form). **Promotion re-tags the same manifestHash; it never rebuilds** |
| **Artifact** | One deliverable `{id, kind: binary \| container \| portable \| robot-image \| airgap-tarball \| pack \| extension-bundle, sha, cosignSignature, slsaProvenance, manifestHash, channel}` — verified (SHA → cosign AuditProof → SLSA) **before bytes execute** |
| **Installer / Updater** | One object, two modes of the **same 11-step lifecycle** (§10.6): Updater is Installer for a different manifestHash |
| **Installation** | The live instance `{manifestHash × PlatformTarget × WorkspaceScope, state}` per the §12.1 machine |
| **PlatformTarget** | An enumerated host value (`windows \| linux \| macos \| android \| ios \| web \| docker \| oci \| k8s \| embedded \| jetson \| rpi \| industrialPC \| future.*`) with packaging + dependency + compatibility rows — value, never layer |
| **CompatibilityProfile** | `{arch, OS major, Workspace schema_version}` envelope; distributed drift fails the probe |
| **Host-Tooling Matrix** | The probe-generated per-OS support table for heavy optional host tools (whisper/piper/xdotool/Playwright browsers — GAP-25), consumed by S-01 `doctor` checks and S-07's honest-status renderers |
| **Publish lockstep** | The ADR-XR-028 law: **source = npm = tag = installers = website = manifest**, enforced publish-on-tag by CI; any mismatch is a release-blocking defect, never a marketing choice |
| **Declared channel pause** | The only legal way a channel may hold a stale version: a written ChannelPolicy entry `{reason, expiry, evidence}` — anything else is drift (structural discharge of UQ-20, §10.7) |
| **AirGapBundle / MarketplaceMirror** | Signed offline `Artifact[]` tarball, resp. tenant-bound allowlist mirror of the S-05 registry — **distribution views, never a second registry** (ADR-XR-020) |
| **EnterpriseProfile / SupportProfile / UpdatePolicy / TelemetryPolicy / PortableMode** | Typed distribution **policy objects** (§10.11): overlays and defaults, never silent authority |
| **License / Activation** | `{edition, scope, expiry, offlineValid, signature}` and its durable bonding `{licenseId → TrustDomain → WorkspaceScope, evidenceRef}`; offline/air-gapped activation is first-class |
| **Deployment / Topology** | `{installation, topology: singleUser \| team \| enterprise \| cloud \| hybrid \| edge \| robotFleet \| distributed(reserved) \| offline, policyOverlay}` — topology is a **value**; `distributed`/`cloud`/`hybrid` rows are **non-normative reservations** pending a LAW 05 amendment (ADR-XR-027) |
| **Durability ops** | Backup / Restore / Repair / Rollback / Migration / Disaster-Recovery of *installations* — process owned here; workspace *data* owned by S-01, memory *content* by S-04 |
| **Extension bundle** | The distributed form of an S-06-boundary extension (quarantined enterprise code, `@rrrtx/xr-business`) — packaged, gated, and graduated here (ADR-XR-018/019; graduation pipeline §10.13) |

---

## 1. Purpose

S-08 owns the answer to one question: **"How does the ONE architecture reach every environment — a developer's laptop, a factory cell, an air-gapped research station, a robot fleet, hardware not yet invented — truthfully, reproducibly, repairably, and reversibly?"**

It defines the distribution kind registry and editions, channels and deterministic promotion, artifacts and verified installation (the 11-step lifecycle), platform targets and probe-generated support matrices, configuration *distribution* (never content), licensing and offline activation, deployment topology values, the marketplace **delivery rail** (mirror/air-gap per the ADR-XR-020 tri-party seam), durability operations on installations, telemetry policy, the publish lockstep rail (ADR-XR-028), extension packaging and graduation (ADR-XR-018/019), and claim enforcement on every published surface (ADR-XR-029).

The fundamental law, carried verbatim from both sources: **XR is ONE product. Many distributions. Never many architectures.** The cardinal law: **XR has one architecture; distribution only determines how that architecture reaches the user.**

Kernel EXISTS. Execution DOES. Trust DECIDES. Memory REMEMBERS. Capabilities ACT. Processes THINK. Interface SHOWS. **Distribution DELIVERS.**

## 2. Scope

Owned here (exclusively): distribution kind registry + editions · channel definitions, promotion records, version pinning, declared pauses · artifact/package forms + the 11-step installation lifecycle (install/update/repair/rollback/remove) · PlatformTarget registry + RuntimeDependency hints + CompatibilityProfiles · **probe-generated matrices** (platform/compatibility/host-tooling CSVs — GAP-21 matrices folded in; GAP-25 owned here per MRCA; S3-UQ-03 mechanics) · configuration *distribution* hierarchy (overlays/precedence; content never interpreted) · licensing/activation incl. offline + air-gapped · deployment topology values · **delivery rail**: publish pipeline, **publish lockstep gate (ADR-XR-028)**, website/marketing surfaces as claim-bearing distribution artifacts (MRCA row 78) · marketplace **distribution/mirroring** of packs (ADR-XR-020; registry view S-05, signing S-03) · backup/restore/repair/rollback/migration/disaster-recovery **of installations** (process owner, MRCA row 76/79) · distribution-level observability (runId-correlated steps) + **TelemetryPolicy object** (defaults, redaction, offline-zero) · **extension packaging + graduation pipeline** (ADR-XR-018 enterprise quarantine packaging; ADR-XR-019 `@rrrtx/xr-business` packaging against S-06 §10.12; S6-UQ-05 discharged §10.13) · LTS/support windows.

Consumed (never owned): **S-01** release truth (`release.manifest.json`, read-only — ADR-XR-012), WorkspaceScope, single-writer + WAL discipline, Clock, Health shape, boot/repair primitives, config *semantics* · **S-02** runId/Evidence shapes for lifecycle-step audit · **S-03** AuditProof/cosign verification (C-T09 ArtifactVerifier), placement lattice probes, SecretBroker leases (C-T03), consent (C-T04 `device-telemetry`), data classification, marketplace trust-axis machine, signing/key custody · **S-04** tombstone/retention disciplines (migrations must preserve them), MemoryRecord shapes for backup content · **S-05** CapabilityDescriptor/pack/manifest shapes, certification ladder (channel predicates consume it), C-C02/C-C03 ranking explanation (Discovery reuses it), C-C08 registry view (mirrors render *its* state) · **S-06** §10.12 extension boundary contract, placement coordination, E2E artifact-outcome + crash-matrix reports (release-claim evidence, per S-06 review) · **S-07** shippable surface artifacts + module map, CLI exit-code surface inside release gates, a11y tri-state + SDK ship status (claim inputs), C-I14 authoring-scaffold publish handoff.

## 3. Non-goals

| Non-goal | Owner | Note |
|---|---|---|
| Release **identity/truth** — version stamping, manifest authoring, drift semantics | **S-01** | ADR-XR-012: S-01 writes, S-08 reads (EX-04); a second manifest is the canonical S-08 heresy |
| Kernel, execution, memory, capability, process, interface **substance** | **S-01…S-07** | sealed-scope claim accepted verbatim (R-AUTH-4); distribution packages, never modifies |
| Signing/certificate **semantics**, trust-axis decisions, key custody | **S-03** | S-08 *invokes* verification (C-D02); it never defines trust |
| Registry, ranking rubric, pack **definition**, certification | **S-05** | mirrors are views; downloads execute through the same registry truth (ADR-XR-020) |
| Authoring tools/scaffolds, SDK | **S-07** | C-I14 hands finished candidates to the rail here |
| Configuration **content** and precedence semantics inside the kernel | **S-01** | S-08 distributes overlays; it never interprets them (A2 invariant carried) |
| Distributed/federated **execution**, multi-node scheduler, leader election | **(reserved)** | ADR-XR-027: non-normative placeholders only until a LAW 05 amendment ADR with evidence |
| DevOps runbooks, CI YAML, shell commands, registry URLs | **Implementation** | both sources verbatim: this is not installer documentation |
| Enterprise **code** | `extensions/enterprise` (quarantined) | ADR-XR-018: excluded from default builds; graduation §10.13 |
| Business/AI/provider logic of any kind | — | A2 ownership sentence carried verbatim |

## 4. Position in the Architecture

```
Constitution (pending) → Canon → UPS-01 → USM-01 → S-00 → S-01 KERNEL → S-02 EXECUTION → S-03 TRUST
  → S-04 MEMORY → S-05 CAPABILITY → S-06 PROCESS → S-07 INTERFACE → S-08 DISTRIBUTION (this) → Implementation
```

S-08 is the **projection of the whole stack onto the outside world** — the only spec every deployment touches and the spec that touches no substrate truth. Its own sealed-scope claim ("subordinate to S-01…S-07; superior to every implementation") is accepted (R-AUTH-4). Its existence required superseding A1-MP §2.4's "no distribution spec ever" clause (ADR-XR-012: both agents independently walked that clause back by writing S-08) and queuing a one-sentence Canon amendment (GAP-02: LAW 10 scope note — writer/reader topology). Until that amendment lands, this spec's own authority is cited **through ADR-XR-012**, honestly, rather than pretending the circularity never existed. Distribution projects all of S-01…S-07; it owns none of them (both sources' hierarchy blocks, verbatim agreement).

## 5. Authority

Tier 2, subordinate to Constitution (pending, R-AUTH-3), Canon, UPS-01, USM-01, S-00, and canonical S-01…S-07; superior to every implementation, package, installer, image, deployment, and published surface. **This is the only normative definition of distribution in XR** — no future channel, image, installer, or store may define another distribution model (both sources, verbatim agreement). Precedence rule: if any `Dockerfile`, `package.json`, installer, or CI script contradicts this spec on packaging, channels, or workspace preservation, the implementation is wrong; if this spec contradicts Canon/UPS-01/USM-01/S-00/S-01…S-07, *this spec* is wrong and the conflict is recorded. Release veto (A1, adopted): the Distribution steward holds veto over any release introducing (a) a second distribution authority (second manifest, second channel model, second workspace layout), (b) bytes executing before verification, (c) a lockstep-violating publish (source ≠ npm ≠ tag ≠ installers ≠ site ≠ manifest), or (d) a published claim without its upstream evidence (ADR-XR-029/030).

## 6. Ownership Boundary

| Aspect | OWNER | CONSUMERS | NON-OWNERS (forbidden) |
|---|---|---|---|
| Distribution kinds, editions, channels, artifacts, installers, lifecycle, platform matrix, licensing, deployment values, mirrors, durability ops, telemetry policy, publish rail, extension bundles | **S-08** | every user/operator; S-05 publishers; S-07 (ships its artifacts; renders install/update surfaces); extensions | any implementation defining its own packaging/channel model |
| Release **identity** (`release.manifest.json`) | **S-01** (single writer, LAW 10) | S-08 read-only (C-D01); all stamps/badges | S-08 never writes versions; hand-edited `version.ts`/`package.json` drift is the shipped bug (v7.0.0 era: 7.0.0 vs 3.1.6 vs 3.1.5, A1 P-D09; v7.1.0: npm drift, §25) |
| Artifact verification semantics (SHA/cosign/SLSA meaning, trust axis, signing keys) | **S-03** (C-T09) | S-08 invokes before execute | S-08 never decides trust; unverifiable ⇒ quarantined, never "probably fine" |
| Registry truth, ranking rubric, certification ladder | **S-05** | S-08 mirrors/delivers (C-D09) | second registry, second marketplace service (R-20 rejected, ADR-XR-020) |
| Authoring/publishing **UX** | **S-07** (C-I14) | S-08 receives candidates | S-08 never authors; S-07 never self-publishes |
| Workspace/memory **content** in backups/migrations | **S-01/S-04** | S-08 moves them tombstone-preservingly (C-D10) | S-08 never rewrites `schema_version` outside S-01's single-writer discipline |
| Extension **boundary** (what an extension may do) | **S-06 §10.12** | S-08 packages/graduates the artifact | graduation ≠ boundary change; packaging never widens the contract |
| Telemetry **classification/consent** | **S-03** (C-T04, classes) | S-08 sets distribution defaults (C-D11) | S-08 never classifies; classification never ships bytes |

## 7. Dependencies

| Dependency | What S-08 consumes | Contract pin |
|---|---|---|
| Canon ADR-XR-002 | LAW 01/10 (one manifest), LAW 14 (observability without exposure), P-01 (local-first), P-13 (truth in claims) | — |
| **S-01** | `release.manifest.json` read-only (identity, version, compat rows), WorkspaceScope handles, single-writer discipline for store migrations, Clock (LTS windows), Health probe shape (diagnostics aggregation) | C-D01 |
| **S-02** | runId correlation for every lifecycle step; Evidence chain shape for install/update/rollback records | C-D05/C-D10 shapes |
| **S-03** | C-T09 ArtifactVerifier (SHA→cosign→SLSA before execute), placement lattice + probes (platform support honesty, matrix generation), C-T03 SecretBroker (secrets never in config/artifacts), C-T04 consent (`device-telemetry`), marketplace trust-axis machine (quarantined packs never ≥ stable), signing/key custody | C-D02, C-D09, C-D11 |
| **S-04** | Tombstone-preservation requirements for migrations; backup content shapes; `forget → warm → restart → recall = 0` survival assertion across migration/DR | C-D10 |
| **S-05** | Pack/manifest/descriptor schemas (bundle construction), certification ladder (channel predicates), C-C08 payloads (mirror rendering), dry-run discipline for pack previews | C-D09 |
| **S-06** | §10.12 extension boundary (packaging conformance), placement coordination hooks, **E2E artifact-outcome + crash-matrix reports consumed as release-claim evidence** (S-06 review duty) | C-D13, ADR-XR-028 claim inputs |
| **S-07** | Shippable surface artifacts + module map, CLI exit-code surface (release gates), a11y tri-state + SDK ship status (**claim-state inputs**), C-I14 publish handoff, C-I11 OpenAPI version pinning | C-D04, C-D09 |
| USM-01 / UPS-01 | Distribution-as-value (not layer); capability-flow stages Discovery→Health reused for install discovery ranking | — |

## 8. Dependents

| Dependent | What it needs from S-08 | Form |
|---|---|---|
| **Users / operators** | truthful installs, atomic updates, repair-not-reinstall, verified offline bundles, honest platform support | artifacts + matrices |
| **S-05 publishers** | the rail: signed pack delivery, mirror/air-gap distribution, channel promotion | C-D09 |
| **S-07** | its surface artifacts stamped/shipped; claim-state inputs consumed (a11y/SDK honesty) before any claim is published | C-D04 inputs |
| **S-06 extensions** | quarantine packaging, graduation pipeline, boundary-conformance gating | C-D13 |
| **Ω roadmap (ADR-XR-024)** | Ω-0's distribution P0 (publish lockstep + one signed release); Ω-6 ecosystem rail (SDK/packs); Ω-7 demand-gated enterprise values | gates + policy |
| **Future distributions** | the value-extension mechanism (§23): `future.*` kinds/targets without architecture change | registry ADRs |
| **Claims surfaces (README/site/npm/docs)** | the only legal statement of what XR is and where to get it | claim-linted artifacts (ADR-XR-029) |

Nothing above S-08 exists (terminal layer, R-AUTH-4); nothing inside S-01…S-07 may depend on S-08 for correctness.

## 9. Fundamental Laws for Distribution (P-D01…P-D11, canonical)

A1's ten principles merged with A2's eight (A2's telemetry/privacy point promoted to law); each binding, each gated in §27:

| Law | Statement | Gate |
|---|---|---|
| **P-D01 One Product, Many Packages** | One Release identity shipped as many Artifacts; a Distribution that forks the architecture is not a distribution, it is a fork (and forks fail the no-fork gate) | XRINV-S08-001/018 |
| **P-D02 Reproducibility** | Same manifest + same inputs ⇒ byte-identical artifact hash; build is `SHA(inputs)`, never timestamps | XRINV-S08-002 |
| **P-D03 Deterministic Promotion** | Channels promote **the same manifestHash** — Stable is a promoted, never rebuilt, Nightly | XRINV-S08-011 |
| **P-D04 Offline-First** | Every Distribution installs/repairs from a signed AirGapBundle without network; offline is *tested*, never degraded (no \"Lite\" editions) | XRINV-S08-005 |
| **P-D05 Enterprise-First, Never Silent** | EnterpriseProfile/mirrors/support are first-class values; enterprise policy may constrain but **never silently overrides** a local PolicyDecision (S-03 audit) | XRINV-S08-016/019 |
| **P-D06 Repairable** | Any Installation can verify hashes and fix drift without re-download | XRINV-S08-013 |
| **P-D07 Rollback-Safe** | Update = install new → verify workspace migration → commit; failure ⇒ automatic rollback to last-known-good manifestHash with Evidence; nothing degrades silently on the new version | XRINV-S08-004 |
| **P-D08 Long-Term Maintainability** | LTS probes health for 5 years after the next major; no channel dies without a deprecated window with notice | XRINV-S08-011/021 |
| **P-D09 One Manifest** | `release.manifest.json` is the only version truth — **S-01 writes, everything else reads**; npm, tags, installers, site, badges derive or fail | XRINV-S08-015/017 |
| **P-D10 Evidence Before Download** | SHA + cosign AuditProof + SLSA provenance verified *before bytes execute*; downloads without an auditRef count as zero | XRINV-S08-003/022 |
| **P-D11 Telemetry Never Without Consent** | Defaults are opt-in (= off until C-T04 `device-telemetry` consent); air-gapped installs export exactly zero; exports are redacted, never raw | XRINV-S08-016 |

## 10. Canonical Object Model

A1's registry (33 objects) and A2's groups (11) consolidate to **18 canonical objects**; every source row maps below or is named in the review as folded. Format per object: purpose · **OWNER / CONSUMERS / NON-OWNERS** · truth note.

### 10.1 Registry overview

| # | Object | OWNER | Truth source (if consumed) |
|---|---|---|---|
| D-01 | Distribution (kind registry) | **S-08** | — |
| D-02 | Edition | S-08 | License terms (S-03 signature) |
| D-03 | ReleaseBinding (delivery view) | S-08 | **identity: S-01 manifest, read-only** |
| D-04 | Channel (+promotion records) | S-08 | ladder/consent states from S-05/S-03 |
| D-05 | Artifact | S-08 | verification verdicts: S-03 C-T09 |
| D-06 | Package (content-addressed + SBOM view) | S-08 | — |
| D-07 | Installer / Updater (one object, two modes) | S-08 | lifecycle audit via S-02 runIds |
| D-08 | Installation | S-08 | WorkspaceScope from S-01 |
| D-09 | DeploymentHandle (workspace as scoped handle) | S-08 | **S-01 owns the boundary; nothing redefined here** |
| D-10 | ConfigurationOverlay | S-08 (distribution) | content semantics: S-01 |
| D-11 | License / Activation | S-08 | signature/verification: S-03 |
| D-12 | Deployment (+ topology registry) | S-08 | TrustDomain from S-03; placement coordination S-06 |
| D-13 | DurabilityOp (Backup/Restore/Repair/Rollback/Migration/DR) | S-08 (process) | content: S-01/S-04 |
| D-14 | PortableMode / AirGapBundle | S-08 | bundle contents are D-05 Artifacts |
| D-15 | EnterpriseProfile / MarketplaceMirror | S-08 | registry state: S-05 view; trust axis: S-03 |
| D-16 | Policy objects (UpdatePolicy/TelemetryPolicy/SupportProfile) | S-08 (defaults) | consent/classification: S-03 |
| D-17 | PlatformTarget / RuntimeDependency / CompatibilityProfile | S-08 | probe results (S-03 lattice probes, S-01 doctor) |
| D-18 | PackBundle / ExtensionBundle | S-08 | pack definition: S-05; extension boundary: S-06 §10.12 |

**Consolidation note:** A1's `FutureDistribution` folds into D-01 values; `PluginBundle/CapabilityPackBundle/ExtensionBundle` unify in D-18; `Repair/Rollback/Migration/Backup/Restore` unify in D-13's op-typed object; A2's `Workspace` row folds into D-09 (handle, never boundary). Nothing dropped silently — see review §3/§4.

### 10.2 Object definitions (selected rows in full; remainder per table + machines §12)

**D-01 Distribution** — the kind value registry `desktop | cli | server | cloud | container | portable | embedded | robot | enterprise | developer | education | research | air-gapped | offline | self-hosted | managed | future.*`. **OWNER:** S-08. **CONSUMERS:** ReleaseBinding, matrices, claims. **NON-OWNERS:** everything else — no Distribution may change any substrate behavior (no-fork gate). Lifecycle §11; value-addition §23.

**D-03 ReleaseBinding** — `{manifestHash, artifacts: Artifact[], channels: Channel[], compat: CompatibilityProfile}`; the *only* legal place where artifacts meet identity. **OWNER:** S-08 binding; **identity** read-only from S-01 (ADR-XR-012). **NON-OWNERS:** hand-maintained version strings anywhere in the tree (drift gate, XRINV-S08-015).

**D-04 Channel** — promotion lane + policy entries `{lane, predicates, declaredPauses[]}`. Predicates may consume the S-05 ladder (e.g., stable requires bench-verified packs in its default bundle) and S-03 consent states — they never *compute* them. **Quarantined artifacts may exist on `nightly`/`canary` only** (A1 law, sharpened at beta per "feature-verified" reading — promotion to `beta` requires zero quarantined artifacts in the binding).

**D-05 Artifact** — `{id, kind, sha, cosignSignature, slsaProvenance, manifestHash, channel}`. Verification pipeline is strictly `SHA → cosign AuditProof → SLSA provenance` via C-D02 *before* any byte executes (P-D10). Cosign expiry ⇒ `quarantined`, never silent (A1 timeout law carried).

**D-07 Installer/Updater** — one object executing the 11-step lifecycle (§10.6); Updater adds A2's post-apply posture `verified-after` before `committed` (§12.2). **NON-OWNERS:** per-target hand-rolled install scripts with private logic (they become Installer *targets*, not new installers).

**D-09 DeploymentHandle** — S-08's view of a Workspace: `{scope: WorkspaceScope, portableMode?: bool}`. It never redefines the boundary (A1 note carried); A2's \"matches S-01\" machine claim is superseded by canonical S-01's machine (§12.7 note).

**D-11 License/Activation** — licensing gates *edition slants only, never architecture* (A2 invariant carried): an unlicensed install degrades features, never truth. Offline-valid licenses still verify `signature + manifestHash` before enablement.

**D-13 DurabilityOp** — one typed op object `{kind: backup|restore|repair|rollback|migration|disaster-recovery, manifestHashFrom?, manifestHashTo?, evidenceRef}`; every execution is an S-02 runId-correlated record (§17). Tombstone-preservation is asserted, not assumed (C-D10).

**D-16 Policy objects** — `UpdatePolicy {pin | auto | enterprise-gated} per WorkspaceScope`; `TelemetryPolicy {kind, default: opt-in, export: redacted-only, airGap: disabled}`; `SupportProfile {window, probeCadence}` (LTS: 5 years after next major — S8-UQ-01 numerics logged). All declared, all auditable, none silent.

**D-18 PackBundle/ExtensionBundle** — the distributed form of (a) S-05 packs (bundle = descriptor set + artifacts, manifest-shaped) and (b) S-06-boundary **extensions** (quarantined enterprise code, `@rrrtx/xr-business`). Extension bundles carry the §10.12 boundary attestation; default builds exclude them until the §10.13 graduation pipeline completes.

### 10.3 The identity/delivery split (ADR-XR-012, binding)

Release **identity** (version, stamping, drift semantics) is kernel-grade truth owned by S-01 (LAW 10, one writer). Release **delivery** (packaging, channels, promotion, install, update, rollback, licensing, deployment, air-gap, mirrors, backup) is owned here. Consequences: (a) every seal in this spec *reads* the manifest and references its `manifestHash`, never writes one; (b) A1-MP §2.4 is superseded (recorded, not hidden) and the Canon amendment admitting S-08's existence is queued (GAP-02); (c) GEN-1's broader \"S8 owns release\" tilt is retired — identity stays kernel-grade. EX-04 discipline: read-only consumption, enforced by the shared drift gate (XRINV-S08-015 is the *delivery-side* twin of S-01's writer-side invariant; both must read 0).

### 10.4 Distribution types (one architecture, many values)

| Value | What changes (packaging) | What never changes (architecture) |
|---|---|---|
| `desktop` | OS installer artifact (binary + launcher) | same ExecutionRecord, same envelope |
| `cli` | binary artifact | same |
| `server` / `cloud` / `container` | container / OCI bundle | same |
| `portable` | unprivileged zip (PortableMode) | same |
| `embedded` / `robot` | robot-image artifact (robot *capabilities* remain S-05 packs) | same |
| `enterprise` | EnterpriseProfile + MarketplaceMirror allowlist overlay | same |
| `developer` | S-07 developer surfaces enabled | same |
| `education` / `research` | edition license slant | same |
| `air-gapped` / `offline` | signed AirGapBundle | same |
| `self-hosted` / `managed` | Deployment topology value | same |
| `future.*` (e.g., `space.station`) | new values + adapters | same 11-step lifecycle |

Both sources' row content preserved (A1 §4 verbatim table, A2 Part-4 law); A2's extra named values (`military|medical|industrial`) fold into `future.*`/edition values pending demand (claims discipline — they are packaging intents, not shipped products).

### 10.5 Platform support and the probe-generated matrices (GAP-21/25, S3-UQ-03 discharged)

PlatformTargets: `windows | linux | macos | android | ios | web | docker | oci | k8s | embedded | jetson | rpi | industrialPC | future.*` (A1 §5 + A2 Part-5 union). **Three matrices, all probe-generated, never prose** (A1 Appendix C/D discipline extended):

| Matrix | Content | Generated by | Consumed by |
|---|---|---|---|
| `platform-matrix.csv` | per-target `healthAvailability` + artifact support + runtime-vary notes | install/probe CI per ReleaseBinding | gates (XRINV-S08-007), S-07 status renderers, site support page (claim-linted) |
| `compat-matrix.csv` | Architecture/Package/Version/Capability/Workspace rows per target | compatibility probes | C-D13/C-D14 fixtures |
| `host-tooling-matrix.csv` **(GAP-25)** | per-OS installation/support status of heavy optional host tools (whisper, piper, xdotool, Playwright browsers) — real-but-heavy paths gated per-OS | doctor probes (S-01) + packaging CI | S-07 honest-status rendering (voice/control surfaces), `doctor` output, site docs |

Matrices are versioned per ReleaseBinding, shipped as release artifacts, and any prose claiming support that a matrix does not confirm fails claim-lint (S3-UQ-03's \"publication mechanics\" = this table; voice-surface graduation (S7-UQ-02) reads `host-tooling-matrix.csv` rows as its evidence).

### 10.6 The 11-step installation lifecycle (one model, every Distribution)

A1 §6 adopted verbatim as canonical (A2 Part-6 maps 1:1):

```
Discovery (policy-aware ranking of Release→Artifact for the target — reuses S-05's provenance×health×trust rubric, never recomputed)
 → Verification (SHA + cosign AuditProof + SLSA — before bytes execute)
 → Installation (unpack → WorkspaceScope provisioned via S-01)
 → Initialization (health probes, workspace partition)
 → Activation (License → TrustDomain → WorkspaceScope, evidence-linked)
 → Repair (hash verify → fix drift, no re-download) — on demand, always available
 → Migration (manifestHashFrom → manifestHashTo, translator, dual-read one minor)
 → Upgrade (install new → verify workspace migration → commit)
 → Downgrade (verified rollback to last-known-good with Evidence — never silent version decrement)
 → Removal (uninstall; workspace archived per policy, content per S-01/S-04)
 → Recovery (failed installation → rollback path, §19)
```

`partiallyInstalled` resolves to **Repair**, never reinstall-from-scratch. Every step carries an S-02 runId and appends Evidence — installability is auditable like execution (A1 §13 row carried).

### 10.7 Channels, promotion, pinning, declared pauses (UQ-20 discharged), offline updates

```
nightly (daily; quarantined artifacts may exist) → canary (initial cohort value 1% — S8-UQ-04)
  → beta (feature-verified; zero quarantined artifacts in binding) → stable (evidence-verified)
  → lts (5-year support window after next major; health-probed)
enterprise = stable + EnterpriseProfile overlay (alias, never a second stable); offline = AirGapBundle delivery form of any lane
```

- **Promotion is re-tagging, never rebuilding** (P-D03): the channel record carries `manifestHash`, promotion predicate evidence, timestamp, actor principal.
- **Version pinning:** `UpdatePolicy.pin` per WorkspaceScope; a pinned installation shows a declared banner and never auto-upgrades (A1 law).
- **Declared channel pause (structural discharge of UQ-20):** the only legal way a channel may hold a stale version is a written `ChannelPolicy` entry `{reason, expiry, evidence}`; the audit verdict on the 3.1.5-vs-7.1.0 drift was **process failure** (ADR-XR-028 evidence), so lockstep (C-D04) is restored and any *future* pause must be declared in advance — undeclared staleness is a release-blocking defect, not a strategy.
- **Offline updates:** AirGapBundles carry channel-promotion Evidence offline through the same verification flow (P-D04).

### 10.8 Configuration distribution (overlays, never content)

Canonical precedence law (NCD-01 — the two sources' hierarchies conflict; resolution committed): (1) **preferences resolve most-specific-wins:** `defaults/environment < global < portable < workspace`; (2) **Enterprise Policy is an enforcement overlay**, not a preference: it *constrains* the resolved preference set — declared, S-03-gated, and never silent (P-D05); (3) **secrets never live in configuration** — only S-03 lease handles (C-T03); (4) distribution never interprets content (A2 invariant): overlays are delivered, validated for shape, and logged — semantics belong to S-01. This satisfies both sources' invariants (\"deterministic hierarchy\", \"no configuration loss\", \"never silently overrides\") and S-01's `env → file → defaults` reading.

### 10.9 Licensing

A1 §9 table adopted verbatim as canonical (editions × scope × offline-valid × signature), with the A2 invariants folded in: licensing never affects the architecture (edition/feature gating only); offline/air-gapped activation is first-class and tested; no edition is \"Lite\". **Claims discipline:** current repo licensing is MIT (audit-verified, MRCA row 74); Professional/Enterprise/Education/Research/OEM values are forward-looking — any published license offering before its infrastructure ships fails claim-lint (ADR-XR-029; activation claims require the C-D08 suite green).

### 10.10 Deployment models (values — with two honest reservations)

A1 §10 topology table adopted (`singleUser | team | enterprise | cloud | hybrid | edge | robotFleet | distributed | offline` × TrustDomain × WorkspaceScopes × update profile). **Guard clause (ADR-XR-027, binding):** `cloud`, `hybrid`, and `distributed` rows are **non-normative reservations**: the repo has no multi-node execution, LAW 05 is single-scheduler, and no distributed design-with-evidence exists. They exist here so future values have a *place*; any shipped artifact/docs claiming them before the LAW 05 amendment ADR fails the claim gate. `remote-worker` placement naming remains an S-03 reserved value (ADR-XR-017 lineage). `robotFleet` is normative — it is many single-node installations, one per robot WorkspaceScope, not a federation.

### 10.11 Policy objects (declared or it didn't happen)

`PortableMode` (unprivileged install; config beside the artifact; no OS-global writes) · `UpdatePolicy {pin | auto | enterprise-gated} per WorkspaceScope` · `TelemetryPolicy` (P-D11; kinds `health|update|anonymous-usage`; offline default `disabled`) · `SupportProfile` (LTS window + probe cadence; channel retirement requires a deprecated window with notice — P-D08). Policy objects are data, are audited, and appear in install diagnostics.

### 10.12 Marketplace rail (ADR-XR-020 tri-party, binding)

Functionality decomposes and stays decomposed: **S-05** owns the registry view + ranking rubric; **S-03** owns certificates/signature verification + the trust axis; **S-08 owns distribution**: `MarketplaceMirror {source, allowlist: descriptorIds, offline?: AirGapBundle}`, pack updates delivered as new descriptor versions (dual-read one minor, downgrade fixture per migration), enterprise mirrors (tenant-bound allowlists), offline mirrors (hash-verified default-deny). Rail laws: (a) **downloads/updates execute through the same registry truth** — a mirror never reshapes ranking; (b) **auto-install requires signature** (repo ADR-0038 direction, confirmed); (c) **displayed counts without an auditRef render as zero/absent** (P-D10 applied to metrics — A1's law, the illustrative number dropped); (d) publisher-claim evidence rides the ADR-028 lockstep. There is **no marketplace service object** anywhere in the architecture (R-20 rejected).

### 10.13 Extension packaging and the graduation pipeline (S6-UQ-05 discharged; ADR-XR-018/019)

Extensions are not packs: they bind behind the S-06 §10.12 thin contract and ship as **ExtensionBundles** (D-18). Canonical graduation pipeline (state machine, gates in §27):

```
quarantined (excluded from default builds; loads only behind S-03 gates)
 → boundary-conformant (extension-boundary arch-test green against S-06 §10.12)
 → parity-evidenced (test parity budget met — the ADR-XR-018 enterprise criterion; budget tracked under S-00)
 → bundle-formed (D-18 artifact + attestation + descriptor set)
 → channel-promoted (per C-D03 predicates)
 → graduated (core-eligible per ADR-018 *or* remain a supported extension per ADR-019)
```

- `extensions/enterprise` (~22k LOC, thinnest-tested, audit's #1 architectural weakness — v7.1.0): quarantine-first per ADR-018; decomposition *deferred to after parity* (DF-06 — \"you cannot safely cut boundaries through code you cannot test\"); A2's direct-merge migration rows are honored *sequentially* through this pipeline (§25).
- `@rrrtx/xr-business` (~11.3k LOC, default-excluded per AUD §2.3): packages as an ExtensionBundle against S-06 §10.12; its Business-OS claims stay gated on the same evidence rules (ADR-XR-019/029).
- Graduation is evidence, not enthusiasm: every pipeline transition emits `ExtensionGraduated` with its evidence refs; claims unlock only at the corresponding rung (XRINV-S08-019).

### 10.14 Durability flows (backup, restore, repair, migration, disaster recovery)

One typed flow per op kind (A1 §12 adopted): **Backup** = content-addressed WorkspaceScope snapshot (artifact hashes + Evidence chain); **Restore** = hash-verified, `AuditChainVerified` *before write*; **Repair** = hash-verify → patch drift without re-download; **Migration** = translator + dual-read one minor, tombstone-preserving — the memory law `forget → warm → restart → recall = 0` must survive migration (asserted in fixtures, S-04 coop); **Cross-device migration** = re-bond Activation to the new PlatformTarget's TrustDomain via re-verified License; **Disaster recovery** = restore onto a new PlatformTarget + re-probe the S-03 lattice before activation. Workspace `schema_version` rewrites happen only through S-01's single-writer discipline (BEGIN IMMEDIATE + WAL — A1 data-preservation note carried).

### 10.15 Telemetry and crash reporting (distribution-level)

`TelemetryPolicy` (P-D11) governs: defaults opt-in (= off until C-T04 consent), export redacted-only (OTLP-class pipelines), **air-gapped installs export exactly zero** (A1 law verbatim). Crash reporting links S-01 crash records + S-03 AuditProof — **never raw workspace content** (LAW 14; `redacted` class never appears in health spans). Telemetry/diagnostic surfaces render through S-07 like everything else; distribution observes *its own* health, never the user's data (A2 Part-13 carried verbatim).

### 10.16 Compatibility (drift fails — five kinds)

A1 §14 table adopted verbatim: **Architecture** (artifact manifestHash vs ReleaseBinding manifestHash → one-product gate) · **Package** (SHA vs expected) · **Version** (workspace schema_version vs CompatibilityProfile; downgrade fixture must pass) · **Capability** (descriptor kind/versionRange vs installed packs and workspace allow rules) · **Workspace** (backup restore hash chain verified before write; `AuditChainVerified(valid=false)` ⇒ `failed(WorkspaceCorruption)` posture).

### 10.17 The publish pipeline and the lockstep (ADR-XR-028, P0)

One publish path: **publish-on-tag only**; CI enforces `source = npm = GitHub tag = installers = website = release.manifest.json` or the publish fails. Signing is part of the path (cosign + SBOM + SLSA per artifact; repo wiring exists — v7.1.0 audit claim #18 PARTIAL: \"wiring exists, no signed release ever cut\"). **The rail's first duty is cutting one real signed release**, closing the 3.1.5-vs-7.1.0 drift and the missing v7.1.0 tag (audit claims #18/19; ADR-XR-028 REQUIRED-P0). Nightly channel-install evidence is a standing release requirement (repo ADR-0039/0040 direction confirmed). Website/README/npm/listing text is a **distribution artifact**: it ships through the same lockstep and passes claim-lint with the same inputs (S-07's a11y tri-state and SDK ship status; S-06's E2E and crash-matrix reports; matrices from §10.5) — ADR-XR-029 binding on every published surface, per the S-06/S-07 reviews' forwarded duties.

## 11. Lifecycle (every object, owner-visible)

| Object | Lifecycle (summary) | Terminal |
|---|---|---|
| D-01 Distribution | `defined → channel-assigned → released → deprecated (≥1 major notice) → removed` | removed (values only) |
| D-02 Edition | `defined → released → supported → deprecated → end-of-life` (A2 merged) | end-of-life |
| D-03 ReleaseBinding | `cut → signed → nightly → canary → beta → stable → lts → deprecated → eol` | eol |
| D-04 Channel | persistent lanes; policies versioned; pause entries expire or convert to drift | — |
| D-05 Artifact | `built → verified → installed → updated → rolled-back → removed` (A2 merged) | removed |
| D-07 Installer/Updater | per execution: the §10.6 state walk (§12.1/§12.2) | committed/rolled-back |
| D-08 Installation | §12.1 machine | removed |
| D-09 DeploymentHandle | follows the workspace lifecycle (S-01-owned); handle itself `bound → re-bound → released` | released |
| D-10 ConfigurationOverlay | `declared → validated → applied → superseded` | superseded |
| D-11 License / Activation | `issued → active ⇄ suspended → revoked(tombstoned) | expired` (§12.5) | revoked/expired |
| D-12 Deployment | `planned → provisioned → operational ⇄ degraded → retired → archived → (recovered)` (§12.6) | archived |
| D-13 DurabilityOp | per execution: `requested → verified-input → executed → verified-output → evidenced` | evidenced |
| D-14 PortableMode / AirGapBundle | bundle: `assembled → signed → published → refreshed → expired` | expired |
| D-15 EnterpriseProfile / Mirror | mirror: `declared → synced → serving → stale-marked → re-synced → retired` | retired |
| D-16 Policy objects | `declared → validated → enforced → superseded` (A2 row verbatim) | superseded |
| D-17 PlatformTarget/Compat | matrices regenerated per ReleaseBinding; target `defined → supported → deprecated → retired` | retired |
| D-18 Pack/ExtensionBundle | `assembled → verified → mirrored → promoted → deprecated → removed`; extension: §10.13 pipeline | removed / graduated |

## 12. State Machines (normative)

A1's installer machine is the canonical skeleton (GAP-21 merge rule); A2's machines fold in — every A2 state maps, **nothing dropped** (review §3). Human-readable here; machine-readable CSVs ship as `docs/specs/S-08.state-machines/*.csv`, exhaustive-checked in CI (A1 discipline carried).

### 12.1 Installation (Installer)

```
discovered → discovered-verified (SHA+cosign+SLSA via C-D02) → installed → initialized
  → activated (license validated) → healthy ⇄ degraded
  degraded → repair (hash verify → drift fixed) → healthy | re-verification → quarantined
  partiallyInstalled → repair (never reinstall-from-scratch)
  healthy → deprecated (≥1 major notice) → archived → removed
A2 map: VERIFIED ≡ discovered-verified; (REPAIRED) ≡ repair cycle.
Forbidden: installed → healthy without verified · degraded → installed without re-verification ·
  activated without license · any execute-before-verify path.
Timeout: verification TTL per artifact (cosign expiry → quarantined, not silent).
```

### 12.2 Updater (Updater = Installer for a new manifestHash; A2's post-apply posture adopted)

```
checked → downloaded → verified (C-D02) → applied (atomic) → verified-after → committed | rollback
Rollback: install new → verify workspace migration → commit; any failure ⇒ automatic rollback to
  last-known-good manifestHash with Evidence; nothing remains silently degraded on the new version (P-D07).
Forbidden: applied without verified-after · auto-upgrade over UpdatePolicy.pin · unpinned downgrade
  without verified rollback evidence (downgrade is a verified op, §10.6 step 9).
```

### 12.3 Repair

```
detected (drift/probe) → integrity-check (hashes vs manifest) → restored (drift patched, no re-download)
  → verified → operational
A2 map: DETECTED→INTEGRITY_CHECK→RESTORED→VERIFIED→OPERATIONAL ≡ this row verbatim.
Unrepairable drift → quarantined installation posture + operator Repair evidence, never silent reinstall.
```

### 12.4 Migration

```
selected (manifestHashFrom declared — undeclared `from` ⇒ denied) → copied (translator applied)
  → switched (atomic) → verified (dual-read window opens; tombstone assertion §10.14) → (committed) | rollback
Translator retained ≥ one minor; old surface closes next minor; dual-read prefers new.
```

### 12.5 License

```
issued → active ⇄ suspended → revoked(tombstoned) | expired
Revocation ⇒ instant quarantined posture for dependent activations (A1 law).
Forbidden: revoked → active (A2 law); activation without evidence link.
```

### 12.6 Deployment

```
planned → provisioned → operational ⇄ degraded → retired → archived → (recovered via D-13 DR flow)
Single TrustDomain per Deployment (A1 law); topology is a value (§10.10 reservations apply).
A2 map: PLANNED→PROVISIONED→OPERATIONAL→RETIRED→(RECOVERED) ≡ this row.
```

### 12.7 Workspace handle (delivery-side view only)

S-08 sees `bound ↔ portable → archived-handle → released`. **The definitional workspace machine lives in canonical S-01**; A2's inline machine (\"matches S-01\") is superseded by it (NCD-04), and the A1 \"scoped handle, not second WorkspaceStore\" note is the law here.

### 12.8 Promotion record (delivery-side law)

```
cut → signed → nightly → canary → beta → stable → lts → deprecated → eol
Guards: re-tag only, never rebuild (P-D03); beta+ requires zero quarantined artifacts in the binding (D-04);
stable/lts never carry quarantined artifacts (A1 law); every transition carries predicate evidence;
declared-pause entries must carry {reason, expiry, evidence} or lockstep treats staleness as defect (§10.7).
```

## 20. Replay

- **Build replay (the reproducibility gate):** rebuild any artifact from `{manifest, inputs}` ⇒ byte-identical SHA — CI runs double-build diffing per release (P-D02); drift ⇒ release block.
- **Install replay:** nightly channel-install E2E replays install/upgrade paths in fixture environments per PlatformTarget (repo ADR-0039/0040 direction; standing release requirement of C-D04).
- **Migration replay:** translator re-execution over recorded fixtures yields the same workspace dual-read result; tombstone-preservation assertion re-runs per replay (C-D10).
- **Rollback replay:** `upgrade → induced failure → automatic rollback` fixtures assert P-D07 machine behavior (§12.2) — rolled-back installations are byte-consistent with their pre-upgrade evidence.
- **Publish dry-runs** are internal CI simulations; they produce no user-consumable artifacts, and anything user-visible derived from them carries simulated marking per S-02 INV-S02-021 discipline (carried transitively).

## 21. Security / Trust Interaction (self-audit of S-08)

- **Supply-chain posture:** verification semantics, signing keys, and certificate custody live in S-03 (C-T09); this spec *invokes and enforces* them (C-D02) — no distribution code ever evaluates trust itself. Signing-wiring-that-never-signed is called out honestly (v7.1.0 audit claim #18 PARTIAL); the lockstep's first run exercises it (C-D04).
- **Trust-axis consumption:** quarantined/verified/monitored pack states from S-03's marketplace machine gate channel predicates; a pack S-03 quarantines cannot ride `beta+` lanes (D-04).
- **Enterprise non-override:** overlays constrain preferences declaratively and auditably; they never mutate a PolicyDecision outcome (P-D05) — conflicts surface to S-03 audit, not to silent precedence.
- **Secrets:** license keys, activation proofs, publish credentials, and mirror credentials exist only as C-T03 lease handles — distribution state stores references, never raw material (§15).
- **SBOM / license scans** remain standing CI (audit CI inventory, v7.1.0: SBOM + license scans verified) and feed each artifact's provenance bundle.
- **Claims security:** every public surface (site, README, npm page, listings) is a distribution artifact under claim-lint with upstream evidence attached (ADR-029/030); the \"signed releases ≥7.1.0\" class of aspirational claim is structurally impossible to publish before it is true.
- **Vulnerability response:** security fixes ride the same 11-step lifecycle fast-tracked through channels with declared evidence; there is no out-of-band patch path.

## 22. Cross-Spec Relationships

| Spec | Consumes from it | Provides back | Seam rule |
|---|---|---|---|
| UPS-01 / USM-01 | distribution-as-value discipline; capability-flow stages for Discovery | the terminal layer's existence (both agents appended it; ADR-XR-012) | never a layer; never a second capability flow |
| Canon / MP | LAW 10 topology; P-01/P-13 | GAP-02 amendment is queued honestly (one sentence + LAW 10 scope note) | writer/reader topology explicit |
| **S-01** | release truth (C-D01 read-only), WorkspaceScope, single-writer store discipline, Clock, Health shape, boot/repair primitives, `doctor` probes | stamped badges, platform/health matrices consumed by doctor, migration executors honoring its WAL law | identity ≠ delivery (ADR-XR-012) |
| **S-02** | runId/Evidence shapes; revival law for interrupted installs (resume from cursor else failed(interrupted)) | lifecycle Evidence per step; install/upgrade audit chain | distribution audit rides the same chain, never a second one |
| **S-03** | C-T09 verification verdicts, signing custody, lattice probes, C-T03, C-T04, trust-axis machine, classification | verification *invocation* records; telemetry policy objects; matrix probe consumption; quarantine postures | S-03 decides trust; S-08 enforces delivery-side |
| **S-04** | tombstone/retention disciplines; backup content shapes | tombstone-preserving migration/DR machinery (C-D10) with asserted fixtures | process here, content there |
| **S-05** | pack/descriptor/manifest shapes, ladder, ranking rubric, registry view | the delivery rail (C-D09): bundles, mirrors, air-gap, channel promotion of packs | mirror ≡ registry truth; no second registry (ADR-XR-020) |
| **S-06** | §10.12 extension boundary; placement coordination; **E2E artifact-outcome + crash-matrix reports** | extension packaging + graduation (C-D13); release-claim evidence *consumer* (C-D04) | graduation ≠ boundary change |
| **S-07** | shippable surface artifacts; CLI exit-code surface; **a11y tri-state + SDK ship status** (claim inputs); C-I14 handoff | shipped/stamped artifacts; install/update/repair *records* for surfaces to render; doctor/status data | S-07 renders; S-08 records; claims require both honest |
| **S-00** | layer map, CI job graph, quarantine plan (ADR-018), Step-0 rail-first directive | the gate definitions §27 land in S-00's job graph; the rail is stabilized **first** so all downstream ships truthfully (A2 baseline note) | gates defined here, wired there |
| **Ω roadmap (ADR-XR-024)** | Ω-0 P0 contents (publish lockstep), Ω-6 ecosystem rail, Ω-7 demand gate | channel/edition policy that makes Ω-7 claims impossible until demand opens the gate | roadmap gates are conditions, never promises |

S-08 is terminal: nothing above it; nothing beneath it depends on it for correctness — only for arrival.

## 23. Extensibility

| Extension need | Mechanism | Never |
|---|---|---|
| New distribution (space station, research buoy, factory appliance) | new **Distribution value** + artifact kind if needed (same lifecycle) | a new architecture or a new top-level \"kind\" requiring machinery |
| New platform/host | new **PlatformTarget value** + matrix rows + adapters (e.g., `future.photonic`, `future.edgeNpu`) | platform forks of the runtime |
| New edition | new **Edition value** (demand-gated per Ω-7) | feature claims before infrastructure ships |
| New host tool | host-tooling matrix rows + doctor checks (GAP-25 pattern) | ungated install paths (the GAP-25 defect) |
| New channel need | **ADR** — lanes are the fixed five + aliases | ad-hoc channels (a second channel model is vetoable) |
| New mirror kind | MarketplaceMirror variant under C-D09 | a second registry |
| New artifact content kind | artifact `kind` value (e.g., a quantum-runtime image class distributed via S-05 packs) | architecture changes to carry it |
| Federation/distributed delivery of *execution* | **reserved** — LAW 05 amendment ADR first (ADR-XR-027) | demand-free distribution claims |

**Stability budget (both sources, verbatim agreement):** values, targets, adapters, packs — never layers. A new layer is a Canon amendment, not a patch.

## 24. Versioning

- **ReleaseBindings, channel schemas, matrix schemas, license schemas:** semver, additive within major; `docs/specs/S-08.*.schema.json` are the machine truth.
- **Compatibility windows:** migrations dual-read one minor; translators retained ≥ one minor after their surface closes; downgrade is a verified op with fixtures, not a best-effort path.
- **LTS:** 5-year support window after the next major (policy value; numerics logged S8-UQ-01); channel retirement requires a deprecated window with notice (P-D08).
- **Edition deprecation:** ≥ one major notice before end-of-life; activations grandfather through the window with evidence.
- **Matrices:** versioned per ReleaseBinding; old matrices remain readable for regression archaeology (ADR-XR-030 vintage discipline applies to support claims too).
- **Spec itself:** changes by ADR only; the model is 20-year-frozen — values and targets evolve, the lifecycle, lockstep, and identity/delivery split do not.

## 25. Migration (from mythry v7.1.0-repo reality → this spec; behavior-preserving reconstruction)

**No implementation changes during specification reconstruction.** Actions per the canonical vocabulary (KEEP / MOVE / MERGE / REWRITE / DELETE / ADAPTER / DEPRECATE). Vintage per ADR-XR-030. **Sequence law (both sources' baseline notes):** the distribution rail is stabilized **first** (S-00 Step 0; Ω-0) so every downstream step ships truthfully; the 2,750-test baseline (v7.1.0) stays green throughout.

| Current (audit v7.1.0, plus A1/A2 vintages) | Action | Target | Behavior preserved |
|---|---|---|---|
| `packaging/` (deb/Homebrew/WinGet/Scoop/dpkg machinery; dpkg PR test verified) | KEEP | `src/distribution/packaging/` — targets as Package views (D-06) | per-target packages unchanged |
| Install scripts (`install.sh`/`install.ps1`) [A2-claimed] | KEEP | Installer **targets** executing §10.6 (no private logic) | same install UX, now verified flow |
| `release.manifest.json` + `scripts/release-manifest.ts` (drift gate verified) | KEEP | file + stamping stay **S-01-owned** (ADR-XR-012); pipeline scripts here read via C-D01 | drift gate green; zero ownership change on identity |
| `scripts/channel-manifest.ts` [A2] | KEEP | `channels/` (C-D03 records) | channel data model |
| `src/update/` (atomic-updater layout; rollback machinery verified) | KEEP | D-07 Updater; **adds** `verified-after` posture (§12.2) — addition, not removal | atomic apply; rollback binaries |
| `Dockerfile` / `docker-compose.yml` | MERGE | container/OCI artifact kinds (D-05) + targets `docker\|oci\|k8s` | images build identically |
| npm publish path (`@rrrtx/xr` = 3.1.5 vs source 7.1.0; claims #18/19 FALSE/PARTIAL) | REWRITE (P0) | publish-on-tag lockstep pipeline (C-D04); **cut one real signed release** closing the drift + the missing v7.1.0 tag | documented install path (`bun add -g @rrrtx/xr`) starts installing truth |
| `src/enterprise/*` (~22k LOC; deployment, release, incidents, operations, recovery, supplychain) | MOVE → **then sequence** | **First** `extensions/enterprise` quarantine (ADR-018; S-00/S-03 gates); A2's merge/move targets remain the **post-parity** map: deployment+release → here; incidents/operations/recovery → here/S-03; supplychain → S-03 (DF-06 order) | no behavioral change for default users during quarantine |
| `package.json` / npm metadata [A1 row] | MOVE | Package view + SBOM; never a second manifest | manifest-derived metadata |
| Release assets (per-platform zips) [A1 row] | MOVE | ReleaseBinding.artifacts[] (shared manifestHash) | assets re-verified, re-signed |
| Portable builds (zip) [A1 row] | KEEP | PortableMode (D-14) | unprivileged install unchanged |
| Desktop launcher (electron-like) [A1 row, v7.0.0 vintage] | SPLIT (completed across S-07/S-08) | desktop Distribution artifact + S-07 interface views | same UX, typed views |
| Enterprise builds (fleet) [A1 row] | MOVE | sequenced with the enterprise row above (§10.13) | fleets pin the extension during the gap (ADR-018 consequence) |
| Cloud deployment (`remote-worker`) [A1 row] | MERGE | topology values with ADR-027 **reservation guard** | no claims until LAW 05 amendment |
| Package managers (brew/apt channels) [A1 row] | MOVE | Package views of the Release; promotion = manifest promotion | managers never rebuild stable |
| Tool system as side distribution [A1 row] | DELETE | packs delivered as Artifact `kind: pack` via C-D09 (ADR-XR-020) | uniqueness counted by manifests |
| Website (Next.js, live HTTP 200) [MRCA row 78] | KEEP | claim-bearing distribution artifact; claim-lint wired (ADR-029) | site stays live; claims become true-by-construction |
| CI signing wiring (cosign/SBOM/SLSA present, never exercised end-to-end) | ADAPTER | exercised by C-D04 on the first signed release | existing wiring reused, not replaced |

**Data preservation:** old `src/distribution/` aliases dual-read (prefer new) for one minor then retire (A1 note); backup vaults and update/rollback binaries carry forward byte-identically; nothing user-owned is rewritten — migration machinery moves *installations*, workspace content migrates only through C-D10.

## 26. Testing

| Suite | Content |
|---|---|
| **Reproducible-build CI** | double-build byte-diff per artifact per ReleaseBinding (XRINV-S08-002) |
| **Install matrix** | fresh install per PlatformTarget in fixture environments; doctor + health probes green; matrix rows generated *from results* |
| **Offline/air-gap fixtures** | AirGapBundle install + repair + license activation with zero network (XRINV-S08-005/014) |
| **Update/rollback fixtures** | atomic apply; `verified-after` gates; induced-failure ⇒ automatic rollback; 0 silently-degraded-on-new |
| **Migration fixtures** | translator runs; dual-read windows; **tombstone-preservation assertion** (S-04 coop: forget→warm→restart→recall=0 survives); downgrade fixture (A1's `repair --downgrade` carried) |
| **Lockstep simulation** | deliberate source/npm/tag/installer/site mismatches ⇒ publish blocked each time (C-D04) |
| **License suite** | invalid/expired/revoked ⇒ denied (incl. offline `offlineValid` still verified); revoked↛active |
| **Quarantine checks** | default builds contain zero extension bytes; graduation pipeline transitions require evidence files (C-D13) |
| **Matrix probes** | probe generators executed (not mocked); `matrix-honesty` diffs prose/site against matrix rows |
| **Channel-install E2E** | nightly: install from each lane in fixtures (ADR-0039/0040 direction) |
| **Telemetry scanner** | export payloads scanned for raw-content patterns; consent-state matrix (granted/denied/air-gap) |
| **Marketplace rail fixtures** | mirror-ranking diff vs registry; unsigned auto-install attempt ⇒ blocked; count-without-auditRef ⇒ absent |
| **Claim-sync** | README/site/npm text vs claim-lint + evidence attachments (S-06/S-07 inputs present) |

## 27. CI Gates (hard)

ID form: `XRINV-S08-nnn` (body shorthand `INV-S08-nnn`). Any red blocks release.

| Gate | Invariant | Threshold |
|---|---|---|
| `one-product` | XRINV-S08-001 artifact manifestHash drift from ReleaseBinding | 0 |
| `reproducible-build` | XRINV-S08-002 double-build byte identity | 100% |
| `verified-artifacts` | XRINV-S08-003 installs/updates without full verification chain | 0 |
| `rollback-integrity` | XRINV-S08-004 silently-degraded-on-new after failed upgrade | 0 |
| `offline-install` | XRINV-S08-005 air-gap fixture pass rate | 100% |
| `deterministic-upgrade` | XRINV-S08-006 same from→to ⇒ identical workspace migration result | 100% |
| `platform-conformance` | XRINV-S08-007 per-target probes active per matrix | 100% of claimed targets |
| `workspace-preservation` | XRINV-S08-008 loss across update/migration/restore (incl. tombstones) | 0 |
| `no-config-loss` | XRINV-S08-009 overlay loss across upgrade | 0 |
| `signed-packages` | XRINV-S08-010 artifacts with cosign+SBOM+SLSA | 100% |
| `channel-correctness` | XRINV-S08-011 stable/LTS quarantined artifacts; no-rebuild promotion; undeclared staleness | 0 / proven / 0 |
| `migration-validation` | XRINV-S08-012 downgrade fixture + translator retention | pass |
| `repair-correctness` | XRINV-S08-013 drift fixed without re-download | 100% |
| `license-validation` | XRINV-S08-014 invalid/expired/revoked denied (incl. offline) | 100% |
| `release-read-only-drift` | XRINV-S08-015 delivery-side manifest drift (shared with S-01 writer-side gate) | 0 |
| `telemetry-policy` | XRINV-S08-016 defaults + redaction + air-gap-zero; raw export blocked | 0 violations |
| `publish-lockstep` | XRINV-S08-017 source=npm=tag=installers=site=manifest; publish-on-tag only | 0 mismatch |
| `no-architecture-fork` | XRINV-S08-018 per-Distribution core hash-set identity (A2 D-16 adopted) | identical |
| `extension-quarantine` | XRINV-S08-019 quarantined-extension bytes in default builds; graduation w/o evidence | 0 / 0 |
| `claims-lockstep` | XRINV-S08-020 published surfaces pass claim-lint with evidence attachments present | 0 violations |
| `matrix-honesty` | XRINV-S08-021 prose/site/gates vs probe-generated matrix rows | 0 drift |
| `marketplace-rail` | XRINV-S08-022 downloads w/o auditRef; unsigned auto-install; mirror-ranking diff | 0 / 0 / 0 |
| **Counted events** | `PublishLockstepFailed`=0 on green releases · `UnverifiedInstallAttempt`=0 · `QuarantinedPackPromoted`=0 · `UndeclaredStalenessDetected`=0 · `RawTelemetryBlocked` reported | release-visible |

## 28. Acceptance Criteria

S-08 is accepted when all §27 gates are green and:

| # | Criterion | Evidence |
|---|---|---|
| AC-D01 | Every artifact of a release shares one manifestHash | `one-product` gate log |
| AC-D02 | Rebuilds are byte-identical | double-build CI report |
| AC-D03 | Nothing executes unverified anywhere (incl. air-gap) | `verified-artifacts` + counters |
| AC-D04 | Failed upgrades roll back automatically, evidenced | rollback fixtures |
| AC-D05 | Full offline lifecycle passes without network | air-gap fixture suite |
| AC-D06 | Upgrades are deterministic and reversible | `deterministic-upgrade` + fixtures |
| AC-D07 | Claimed platform support equals probed support | platform matrix + `matrix-honesty` |
| AC-D08 | Workspaces and tombstones survive all durability ops | `workspace-preservation` + S-04-coop fixture |
| AC-D09 | Configuration overlays survive upgrades | `no-config-loss` |
| AC-D10 | Every artifact is signed with provenance | `signed-packages` |
| AC-D11 | Channels promote honestly; pauses are declared | channel records audit |
| AC-D12 | Downgrades are verified ops, never silent decrements | `migration-validation` |
| AC-D13 | Installations repair without re-download | `repair-correctness` |
| AC-D14 | Licenses gate editions only, offline-capably, never architecture | `license-validation` + arch-test |
| AC-D15 | S-01 remains the only manifest writer | `release-read-only-drift` + code census |
| AC-D16 | Telemetry respects consent/classification; air-gap exports zero | `telemetry-policy` + scanner log |
| AC-D17 | Publish lockstep enforced; **one real signed release cut** (ADR-028 discharged) | `publish-lockstep` + release evidence |
| AC-D18 | No Distribution forks the architecture | `no-architecture-fork` |
| AC-D19 | Extensions stay quarantined until parity; graduation is evidenced | `extension-quarantine` + pipeline records |
| AC-D20 | Every public claim carries its evidence (S-06/S-07 inputs attached) | `claims-lockstep` log |
| AC-D21 | Matrices are probe-generated and govern prose | `matrix-honesty` |
| AC-D22 | Marketplace rail never duplicates registry truth; counts are auditRef-backed | `marketplace-rail` |

## 29. Future Evolution (non-normative horizons)

A1 §15 table adopted (union with A2 Part-15):

| Frontier | Path (values/adapters/packs) | What never changes |
|---|---|---|
| Quantum | `cap.future.quantum.*` kind values via S-05 packs; new artifact content kinds | same ControlContract, same 11-step lifecycle |
| AGI | descriptor kind values (propose-only); no AGI-as-principal → no PolicyDecision bypass (S-03) | authority topology |
| Edge AI / NPU mesh | `future.edgeNpu` PlatformTarget + lattice value (S-03 probe) | envelope + single scheduler |
| BCI | interaction-side values (S-07); nothing distribution-specific | same artifacts |
| Space systems | `space.station` target + AirGapBundle with extended LTS window | same channels, same verification |
| Unknown hardware (photonic) | target value + driver RuntimeDependency hints | the model |
| Distributed/federated execution | **reserved** — LAW 05 amendment ADR with evidence, at Ω-5 review (ADR-XR-027) | LAW 05 until then |

## 30. Anti-Patterns (hard-banned, lint/arch enforced)

| Anti-pattern | Why | Enforcement |
|---|---|---|
| Rebuilding Stable (or any \"promotion\" with a new build id) | untracked drift (P-D03) | `channel-correctness` no-rebuild proof |
| Hand-edited version surfaces (`version.ts`, `package.json` ≠ manifest) | the shipped drift bug (P-D09) | `release-read-only-drift` |
| Publishing any surface out-of-lockstep (npm without tag, site without manifest) | installs lies (ADR-028) | `publish-lockstep` |
| Install-before-verify / verify-later | supply-chain attack vector (P-D10) | `verified-artifacts` + counters |
| A second marketplace/registry/service in distribution | LAW 01/02; R-20 rejected | C-D09 arch-test |
| Enterprise overlay silently overriding local decisions | hidden authority (LAW 16) | P-D05 audit + conflict surfaces |
| Telemetry default-on / raw export / air-gap export | consent + classification laws | `telemetry-policy` scanner |
| \"Lite\"/degraded offline editions | P-D04 | edition schema lint |
| Distributed/hybrid/cloud execution claims pre-LAW-05-amendment | demand-free invention (ADR-XR-027) | claim gate + reservation marks |
| Quarantined extension bytes in default builds; graduation by declaration | ADR-018/019 violated | `extension-quarantine` |
| Release assets outside the manifest binding | invisible artifacts (P-D01) | `one-product` |
| `installer = product` prose; channel-model forks in docs/CI | second distribution authority | veto + `terminology-lint` |
| Backup/restore skipping chain verification | corruption becomes portable | C-D10 fixture |
| Silent channel staleness (pause-by-accident) | UQ-20 class defect | `UndeclaredStalenessDetected` counter |
| Migration dropping tombstones | memory law broken by packaging | S-04-coop fixture |
| Support claims from prose instead of probe results | GAP-21/25 honesty | `matrix-honesty` |

## 31. Implementation Mapping

```
src/distribution/            (deferred tree per S-00; lands with the stabilized rail)
  release/                   C-D01 read port · C-D04 lockstep gate · publish-on-tag pipeline
  channels/                  C-D03 records · declared-pause policies
  artifacts/                 D-05/D-06 build+sign (cosign/SBOM/SLSA wiring — ADAPTER row §25)
  installers/                D-07 11-step engine + per-target adapters (install.sh/install.ps1 → targets)
  update/                    ← KEEP src/update/ (atomic; verified-after posture added)
  platforms/                 D-17 targets · matrix probe generators (§10.5)
  marketplace/               C-D09 mirrors · AirGapBundles (D-14)
  licensing/                 D-11 + C-D08
  deployment/                D-12 topology values (+ ADR-027-reserved rows, gate-marked)
  durability/                C-D10 ops (backup/restore/repair/rollback/migration/DR)
  telemetry/                 C-D11 policy + redacted export pipelines
  extensions/                C-D13 packaging + graduation evidence store (extensions/enterprise,
                             @rrrtx/xr-business — quarantine lives at extensions/, default-excluded)
  publish/                   the REWRITE target of the npm path (P0, ADR-XR-028)
docs/specs/                  S-08.registry.schema.json · S-08.binding.schema.json · S-08.channel.schema.json ·
                             S-08.license.schema.json · S-08.state-machines/*.csv
docs/arch/S-08/              platform-matrix.csv · compat-matrix.csv · host-tooling-matrix.csv ·
                             update.mmd · enterprise.mmd · platform.mmd · distribution-hierarchy.mmd · recovery.mmd
test/distribution/           reproducible-build · install-matrix · offline · rollback · migration ·
                             lockstep-sim · license · quarantine · matrices · channel-install E2E ·
                             telemetry-scanner · marketplace-rail · claim-sync
```

Object → module mapping is 1:1 with §10.1 (D-01…D-18); contract → module mapping: C-D01/C-D04 `release/`, C-D02 `artifacts/`, C-D03 `channels/`, C-D05/C-D06 `installers/`+`update/`, C-D07 `installers/` overlays, C-D08 `licensing/`, C-D09 `marketplace/`, C-D10 `durability/`, C-D11 `telemetry/`, C-D12 `platforms/`, C-D13 `extensions/`.

---

*This terminal spec stands on the sentence both source texts sealed independently: XR is ONE product; many distributions; never many architectures. Distribution owns nothing the architecture made — it only carries it, verified before it runs, repairable when it drifts, reversible when it breaks, honest about where it runs, and truthful in every word it publishes. With S-08, the canonical series closes: the kernel exists, execution does, trust decides, memory remembers, capabilities act, processes think, the interface shows — and distribution delivers all of it, as one architecture, everywhere, for the next twenty years. This spec is complete when its review is written — and with it, the eight-spec canonical core stands whole.*
## 13. Contracts

Pinned seams; each with OWNER / CONSUMERS / NON-OWNERS.

### C-D01 — ReleaseTruthPort (read-only)
Typed read access to S-01's `release.manifest.json` (version, manifestHash, compat rows) + participation in the shared drift gate. **OWNER:** S-01 (writer), S-08 (reader). **NON-OWNERS:** any other writer or copy (EX-04; XRINV-S08-015). Guards: every artifact/binding stamps `manifestHash`; drift ⇒ release block.

### C-D02 — ArtifactVerificationGate
`SHA → cosign AuditProof → SLSA provenance`, invoked before any byte executes; verdicts and key custody from S-03's C-T09 ArtifactVerifier. Guards: 0 unverified installs (XRINV-S08-003); cosign expiry ⇒ quarantined; verification TTL enforced; air-gap verification uses bundle-carried proofs (P-D04).

### C-D03 — ChannelPromotionContract
Promotion = manifestHash re-tag with predicate evidence; channel policy entries incl. declared pauses; ladder/consent states consumed, never computed. Guards: no-rebuild proof (build-id stable across promotion); beta+ zero-quarantined; every record auditable.

### C-D04 — PublishLockstepGate (ADR-XR-028)
`publish-on-tag only` + `source = npm = tag = installers = website = manifest` + signed artifacts (cosign/SBOM/SLSA) + nightly channel-install evidence as standing requirement. Guards: any mismatch fails the publish; **first exercise of this gate must cut the real signed release** that closes the v7.1.0 drift (audit #18/19; P0 per R-C-21); release claims must attach upstream evidence (S-06 E2E + crash-matrix reports; S-07 a11y/SDK states; §10.5 matrices).

### C-D05 — InstallationLifecycleContract
The 11-step lifecycle (§10.6) as a typed API: every step runId-correlated, reversible-or-repairable, evidence-appending. Guards: no step skips Verification; `partiallyInstalled` ⇒ Repair path only; Removal honors workspace policy (archive/export per S-01/S-04).

### C-D06 — UpdatePolicyContract
`{pin | auto | enterprise-gated}` per WorkspaceScope; atomic apply; verified-after; automatic rollback. Guards: pin honored absolutely; enterprise-gated requires the EnterpriseProfile overlay in scope.

### C-D07 — ConfigurationOverlayContract
Delivery + shape-validation of overlays per §10.8 precedence law. Guards: precedence resolution is deterministic and logged; secrets appear only as C-T03 lease handles; content never interpreted (schema-lint proof).

### C-D08 — LicenseContract
License/Activation issuance, verification (incl. offline `signature + manifestHash`), revocation → instant quarantine. Guards: invalid/expired ⇒ install/activate denied (XRINV-S08-014); licensing gates editions only, never architecture (arch-test).

### C-D09 — MarketplaceRail (ADR-XR-020)
Mirror publication/sync, allowlist binding, pack update delivery (dual-read one minor), air-gap bundle assembly — all rendering S-05 registry truth, all signed S-03-side. Guards: mirror ranking ≡ registry ranking (diff test); auto-install ⇒ signature verified; counts without auditRef render as absent; no second-registry objects exist (arch-test).

### C-D10 — DurabilityContract
Backup/Restore/Repair/Rollback/Migration/DR ops (D-13) with tombstone-preservation assertion and `AuditChainVerified`-before-write. Guards: `forget → warm → restart → recall = 0` fixture survives migration/DR (S-04 coop); workspace rewrites only via S-01 single-writer discipline; every op evidenced.

### C-D11 — TelemetryPolicyContract
Distribution defaults + export pipeline rules (P-D11): opt-in defaults, redacted-only export, air-gap zero. Guards: raw-content patterns never appear in export payloads (scanner); `TelemetryExported` counted events carry classification labels; consent state from C-T04 read before any export.

### C-D12 — PlatformMatrixContract
Probe-generated matrices (§10.5) as versioned release artifacts + their regeneration pipeline. Guards: matrices regen per ReleaseBinding; gate results and site/docs support claims must match matrix rows (`matrix-honesty`, XRINV-S08-021); host-tooling rows feed S-01 `doctor` and S-07 renderers.

### C-D13 — ExtensionPackagingGate
ExtensionBundle assembly, quarantine packaging (default-build exclusion), and the §10.13 graduation pipeline evidence requirements (boundary arch-test, parity budget, attestation, channel promotion). Guards: default builds contain zero quarantined-extension bytes (XRINV-S08-019); graduation transitions emit evidence-linked events; claims unlock per rung only.

## 14. Inputs / Outputs

**Inputs:** (a) release truth (C-D01, read-only); (b) verification verdicts + signing material handles (S-03); (c) pack/extension candidates (S-05 shapes; S-07 C-I14 handoff); (d) platform probe results (S-03 lattice, S-01 doctor); (e) upstream claim-state inputs (S-06 E2E/crash reports; S-07 a11y/SDK states); (f) operator intents (install/update/pin/repair/rollback) via S-07 surfaces → S-02 envelopes.
**Outputs:** (a) signed artifacts + bundles (binaries, containers, portable, robot-images, air-gap tarballs, packs, extension bundles); (b) channel/promotion records + declared-pause policy entries; (c) installations + lifecycle Evidence (runId-correlated); (d) matrices (platform/compat/host-tooling CSVs); (e) published surfaces (website/README/npm/listings) — claim-linted (ADR-XR-029); (f) licenses/activations with evidence links; (g) licenses of confidence to users: SBOMs, signatures, auditRefs, doctor outputs; (h) counted events (§16).

## 15. Persistence

S-08 persists **distribution records only**: ReleaseBindings, channel/promotion records, installation registries (manifestHash × target × scope, state), license/activation records (evidence-linked), durability-op records, backup vaults (content-addressed), mirror caches (hash-verified, always rebuildable from source-of-truth registries), matrices (versioned). **Explicit bans** (both sources' ownership sentences): no release-identity copies (C-D01 reads, never writes); no workspace/memory *content* stored as distribution state (content lives under S-01/S-04 ownership — S-08 records *references + hashes*); no raw secrets anywhere in distribution state (C-T03 handles only); no second registry of packs (mirrors are caches with the source pointer); no telemetry payload archives (redacted export pipelines, no raw retention). Backup vault retention follows workspace policy; quarantined artifacts are retained evidence, not deleted silently.

## 16. Events (USM-01 registrations — `Distribution*` family only, ADR-XR-015)

Registered (emitted by S-08): `ArtifactVerified`, `InstallCompleted`, `UpdateApplied`, `RollbackCompleted`, `RepairCompleted`, `MigrationCompleted{from,to}`, `ChannelPromoted{lane,manifestHash}`, `MirrorSynced`, `LicenseActivated`, `LicenseRevoked`, `ExtensionGraduated{rung,evidenceRef}`, `BackupCompleted`, `RestoreCompleted`, `TelemetryExported{classification}`.
Counted (CI-visible, §27): `PublishLockstepFailed` (must be 0 on a passing release), `UnverifiedInstallAttempt` (0), `QuarantinedPackPromoted` (0), `RawTelemetryBlocked` (reported), `UndeclaredStalenessDetected` (0).
Consumed (subscribe-only): S-01 lifecycle/health, S-03 revocation/lattice changes (mirror revalidation), S-05 registry updates (mirror sync), S-06 extension-boundary test outcomes — never re-minted under a Distribution alias.

## 17. Observability

Distribution operations are auditable like execution: **every lifecycle step carries an S-02 runId and appends Evidence** (install, update, repair, rollback, migration, publish — one chain shape). Diagnostics aggregate in the S-01 Health shape (`ready | setup-required | degraded` + one repair command — A1 §13 row). Crash reporting links crash records + AuditProof, redacted classes only (§10.15). The matrices (§10.5) are published observability — per-target truth operators can check. All of it renders through S-07 surfaces (install/update dialogs, doctor output, support pages) — S-08 produces records, never pixels. Telemetry policy, classification, and consent state are visible in install diagnostics (\"what would this install send?\" answerable offline).

## 18. Failure Handling

| Failure | Behavior | Rule |
|---|---|---|
| Artifact verification fails (SHA/cosign/SLSA/expiry) | quarantined; install/update denied; evidence recorded | XRINV-S08-003; silent use banned |
| Partial installation | Repair path (hash verify → patch drift); reinstall only after quarantine decision | §12.1 |
| Upgrade/migration verification fails | automatic rollback to last-known-good + Evidence; nothing remains silently degraded on new | P-D07, XRINV-S08-004 |
| License invalid/expired/revoked | install/activate denied; revocation ⇒ instant quarantine of activations | C-D08 |
| Lockstep mismatch at publish | publish blocked; `PublishLockstepFailed` counted; release notes may not claim the version | C-D04, XRINV-S08-017 |
| Mirror sync failure | stale-marked mirror; new installs default-deny via mirror until re-synced; truth remains the registry | C-D09 |
| Cosign expiry on installed artifact | quarantined posture (A1 timeout law), operator-visible, Repair offers re-verification path | §12.1 |
| Telemetry export failure | drop; **never buffer raw** pending retry (privacy > delivery) | C-D11, XRINV-S08-016 |
| Workspace restore chain invalid | `failed(WorkspaceCorruption)` posture; no write occurs; repair consults S-01/S-04 | §10.16, C-D10 |
| Matrix probe failure on a target | target's row shows `unprobed`, claims adjust to matrix truth — support is never asserted from prose | C-D12, XRINV-S08-021 |
| Enterprise overlay conflicts with local PolicyDecision | declared conflict surfaces via S-03 audit; local decision stands unless S-03 rules otherwise | P-D05 |

## 19. Recovery

Rollback is a first-class verified op: last-known-good manifestHash + Evidence-verified workspace migration (never a silent version decrement — A1 law). Repair restores integrity from hashes without re-download; unrepairable drift goes quarantined-with-evidence (operator decision), never silent reinstall. Cross-device recovery re-bonds Activation to the new target's TrustDomain via re-verified License (§10.14). Disaster recovery = signed artifacts + workspace backup + hash chain + **re-probe the S-03 placement lattice before activation**. Publish incidents recover by *forward* fix through the lockstep (never by editing a published surface out-of-band — the manifest remains the only truth, P-D09). Mirrors self-heal by re-syncing from the registry; a mirror is never the recovery source of registry truth (ADR-XR-020).
