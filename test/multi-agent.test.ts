import { beforeEach, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { listAgents, getAgentDefinition } from "../src/agents/registry.ts";
import { compileWorkflowPlan } from "../src/agents/planner.ts";
// 0.2 Storage Unification: repos are views over the single WorkspaceStore.
import { WorkspaceStore } from "../src/state/workspace-store.ts";
import { WorkflowRepo } from "../src/state/repos/workflow-repo.ts";
import { AuditRepo } from "../src/state/repos/audit-repo.ts";
// 0.6 Runtime/DI cleanup: typed ServiceRegistry replaces the legacy Container.
import { ServiceRegistry } from "../src/core/service-registry.ts";
import { Tokens } from "../src/core/tokens.ts";
import { EventBus } from "../src/core/event-bus.ts";
import { MultiAgentService } from "../src/services/multi-agent-service.ts";

let HOME: string;

beforeEach(() => {
  HOME = mkdtempSync(join(tmpdir(), "xr-ma-"));
});

test("multi-agent registry exposes the required core roles", () => {
  const agents = listAgents({ includeDisabled: true });
  const ids = new Set(agents.map((a) => a.id));
  for (const id of [
    "supervisor",
    "planner",
    "researcher",
    "builder",
    "reviewer",
    "executor",
    "synthesizer",
    "memory-manager",
    "router",
    "model-selector",
    "security-checker",
  ]) {
    expect(ids.has(id)).toBe(true);
  }
  expect(getAgentDefinition("builder")?.toolScope.tools).toContain("write_file");
  expect(getAgentDefinition("reviewer")?.toolScope.tools).not.toContain("write_file");
});

test("workflow compiler creates explicit review + synthesis stages for build work", () => {
  const plan = compileWorkflowPlan({
    goal: "Implement a new TypeScript feature in this repository",
    cwd: process.cwd(),
  });
  expect(plan.kind).toBe("build");
  expect(plan.tasks.some((t) => t.role === "builder")).toBe(true);
  expect(plan.tasks.some((t) => t.role === "reviewer")).toBe(true);
  expect(plan.tasks.some((t) => t.role === "security_checker")).toBe(true);
  expect(plan.tasks.some((t) => t.role === "synthesizer")).toBe(true);

  const parallel = plan.tasks.filter((t) => t.parallelKey === "analysis");
  expect(parallel.length).toBe(2);

  const synth = plan.tasks.find((t) => t.role === "synthesizer");
  expect(synth).toBeDefined();
  expect(synth!.dependencies.length).toBeGreaterThan(0);
});

test("workflow store persists and reloads task graphs", () => {
  const store = new WorkspaceStore(join(HOME, "workflows.db"));
  const workflows = new WorkflowRepo(store);
  try {
    const plan = compileWorkflowPlan({
      goal: "Research package choices for this repo",
      cwd: process.cwd(),
    });
    workflows.saveWorkflow(plan);
    const loaded = workflows.getWorkflow(plan.workflowId);
    expect(loaded).not.toBeNull();
    expect(loaded!.workflowId).toBe(plan.workflowId);
    expect(loaded!.tasks.length).toBe(plan.tasks.length);

    const rows = workflows.listWorkflowSummaries(10);
    expect(rows.some((r) => r.workflowId === plan.workflowId)).toBe(true);
  } finally {
    store.close();
  }
});

test("multi-agent service can plan and request cancellation without execution", () => {
  const registry = new ServiceRegistry();
  // One unified store; the repos and services are views over it.
  const store = new WorkspaceStore(join(HOME, "service.db"));
  const workflowStore = new WorkflowRepo(store);
  const auditStore = new AuditRepo(store);
  const events = new EventBus();
  registry.registerValue(Tokens.Store, store);
  registry.registerValue(Tokens.WorkflowStore, workflowStore);
  registry.registerValue(Tokens.AuditStore, auditStore);
  registry.registerValue(Tokens.Events, events);

  try {
    const svc = new MultiAgentService(registry);
    const record = svc.planWorkflow({ goal: "Refactor the repo safely", cwd: process.cwd() });
    expect(record.status).toBe("planned");
    const stopped = svc.stopWorkflow(record.workflowId);
    expect(stopped.cancellationState).toBe("requested");
  } finally {
    store.close();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// E2E gate (ADR-XR-025 / ADR-0034, audit A-20): the multi-agent workflow must
// execute END-TO-END and its OUTCOMES are asserted — not just its plan.
//
// The regression this locks out: the deterministic security_checker emits a
// prose summary; the strict-JSON review gate used to parse that prose,
// fail-closed to `changes_requested`, and every build workflow deadlocked.
// The gate now consumes the checker's STRUCTURED verdict (authoritative
// evidence), retries an unverifiable model reviewer once, and fails TERMINALLY
// — never silently parks — when a verdict cannot be verified.
// ─────────────────────────────────────────────────────────────────────────────

interface StubCall { systemPrompt: string; task: string }

function scriptedAgentService(responses: { reviewer?: (call: StubCall) => string; builderNote?: string }): {
  calls: StubCall[];
  runScopedTask: (task: string, mode: string, overrides?: Record<string, unknown>) => Promise<Record<string, unknown>>;
} {
  const calls: StubCall[] = [];
  return {
    calls,
    async runScopedTask(task: string, _mode: string, overrides: Record<string, unknown> = {}) {
      const systemPrompt = String(overrides.systemPrompt ?? "");
      calls.push({ systemPrompt, task });
      let finalMessage: string;
      if (systemPrompt.includes("Reviewer agent")) {
        finalMessage = responses.reviewer
          ? responses.reviewer({ systemPrompt, task })
          : 'Summary: The builder delivered the feature as scoped.\nFindings: none.\n{"decision":"approved","reason":"scope honored; tests named"}';
      } else if (systemPrompt.includes("Builder agent")) {
        finalMessage =
          responses.builderNote ??
          "Summary: Implemented the feature.\nChanged Files: src/feature.ts\nValidation: bun test green\nRisks: none";
      } else if (systemPrompt.includes("Synthesizer agent")) {
        finalMessage = "Summary: Delivered.\nDelivered Result: feature implemented, reviewed, and security-checked.\nRisks: none.\nNext Steps: ship.";
      } else if (systemPrompt.includes("Researcher agent")) {
        finalMessage = "Summary: Context gathered.\nEvidence: repo inspected.\nGaps: none.\nRecommendations: proceed.";
      } else {
        finalMessage = "Memo: completed as scoped.";
      }
      return { finalMessage, sessionId: "stub-session", stopped: false, steps: [], meter: {} };
    },
  };
}

function buildService(dbName: string, stub: ReturnType<typeof scriptedAgentService>) {
  const registry = new ServiceRegistry();
  const store = new WorkspaceStore(join(HOME, dbName));
  const workflowStore = new WorkflowRepo(store);
  const auditStore = new AuditRepo(store);
  const events = new EventBus();
  registry.registerValue(Tokens.Store, store);
  registry.registerValue(Tokens.WorkflowStore, workflowStore);
  registry.registerValue(Tokens.AuditStore, auditStore);
  registry.registerValue(Tokens.Events, events);
  registry.registerValue(Tokens.Agent, stub as never);
  return { svc: new MultiAgentService(registry), store };
}

test("E2E: build workflow runs to COMPLETED with the deterministic security checker in the graph (deadlock regression)", async () => {
  const stub = scriptedAgentService({});
  const { svc, store } = buildService("e2e-green.db", stub);
  try {
    const record = await svc.runWorkflow({
      goal: "Implement a new TypeScript feature in this repository",
      cwd: process.cwd(),
      maxSteps: 2,
    });

    // Outcomes, not plan: the run terminated and delivered a final artifact.
    expect(record.status).toBe("completed");
    expect(record.finalOutput?.summary).toContain("Delivered Result");

    // The deterministic security_checker ran FOR REAL (its prose output is the
    // historical deadlock trigger) and its structured verdict was honored.
    const sec = record.tasks.find((t) => t.role === "security_checker")!;
    expect(sec).toBeDefined();
    expect(sec.status).toBe("completed");
    expect(sec.reviewState).toBe("approved");
    const secVerdict = sec.auditTrail.find((e) => e.kind === "review.verdict");
    expect(secVerdict).toBeDefined();
    expect((secVerdict!.detail as Record<string, unknown>).source).toBe("structured");

    // Builder outcome asserted: ran, produced the changed-files evidence, and
    // passed review explicitly (approval is never a side effect of completion).
    const builder = record.tasks.find((t) => t.role === "builder")!;
    expect(builder.status).toBe("completed");
    expect(builder.outputs?.summary).toContain("Changed Files");
    expect(builder.reviewState).not.toBe("pending");

    const reviewer = record.tasks.find((t) => t.role === "reviewer")!;
    expect(reviewer.reviewState).toBe("approved");
    expect(reviewer.auditTrail.some((e) => e.kind === "review.verdict")).toBe(true);

    expect(record.reviewState).toBe("approved");
    expect(record.tasks.some((t) => t.status === "blocked")).toBe(false);
  } finally {
    store.close();
  }
});

test("E2E: a genuinely rejected review parks the workflow as BLOCKED (fail-closed, not failed)", async () => {
  const stub = scriptedAgentService({
    reviewer: () => 'Summary: Not acceptable.\nFindings: missing validation.\n{"decision":"rejected","reason":"builder skipped the validation step"}',
  });
  const { svc, store } = buildService("e2e-reject.db", stub);
  try {
    const record = await svc.runWorkflow({
      goal: "Implement a new TypeScript feature in this repository",
      cwd: process.cwd(),
      maxSteps: 2,
    });
    expect(record.status).toBe("blocked");
    expect(record.reviewState).toBe("rejected");
    const blocked = record.tasks.filter((t) => t.status === "blocked");
    expect(blocked.length).toBeGreaterThan(0);
    expect(blocked[0].blockedReason).toContain("rejected");
  } finally {
    store.close();
  }
});

test("E2E: an unverifiable reviewer fails TERMINALLY with review_gate_unresolved — never a silent deadlock", async () => {
  const stub = scriptedAgentService({
    reviewer: () => "I could not finish reviewing because the context window drifted and then the socket closed.",
  });
  const { svc, store } = buildService("e2e-gatefail.db", stub);
  try {
    const record = await svc.runWorkflow({
      goal: "Implement a new TypeScript feature in this repository",
      cwd: process.cwd(),
      maxSteps: 2,
    });
    const reviewer = record.tasks.find((t) => t.role === "reviewer")!;
    // Exactly one escalated retry happened before failing closed.
    expect(reviewer.retryCount).toBe(1);
    expect(reviewer.auditTrail.some((e) => e.kind === "review.retry")).toBe(true);
    expect(reviewer.status).toBe("failed");
    expect(reviewer.errors.join(" ")).toContain("review_gate_unresolved");
    expect(reviewer.reviewState).toBe("changes_requested"); // fail-closed verdict stands for consumers
    // The WORKFLOW terminates failed — it does not park forever in "blocked".
    expect(record.status).toBe("failed");
    expect(record.status).not.toBe("blocked");
    expect(record.finalOutput).toBeUndefined();
    // Escalation was actually delivered to the reviewer on the final attempt.
    expect(stub.calls.filter((c) => c.systemPrompt.includes("Reviewer agent")).length).toBe(2);
    const retryPacket = stub.calls.filter((c) => c.task.includes("ESCALATION"));
    expect(retryPacket.length).toBe(1);
  } finally {
    store.close();
  }
});
