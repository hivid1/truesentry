import { describe, it, expect } from "vitest";
import { TrueSentryCoordinator } from "../src/coordinator.js";
import { EventBroadcaster } from "../src/events/emitter.js";
import { HitlGateEngine, CryptographicIntegrityError } from "../src/hitl/gate.js";
import { SessionStore } from "../src/storage/db.js";
import { SCENARIO_1_DB_LOCK, SCENARIO_2_MEMORY_LEAK } from "@truesentry/scenarios";

describe("TrueSentry Adversarial & Chaos Test Matrix", () => {
  it("Scenario A: Golden Path - Ingests alert, runs real bisect, passes sandbox tests, obtains HITL approval, and resolves", async () => {
    const broadcaster = new EventBroadcaster();
    const gate = new HitlGateEngine(broadcaster);
    const sessionStore = new SessionStore();
    const coordinator = new TrueSentryCoordinator(broadcaster, gate, sessionStore);

    const capturedEvents: string[] = [];
    let approvalId = "";

    broadcaster.subscribe("adv_session_a", (evt) => {
      capturedEvents.push(evt.type);
      if (evt.type === "APPROVAL_REQUEST") {
        approvalId = (evt.payload as any).approvalId;
        setTimeout(() => gate.resolveApproval(approvalId, "APPROVE"), 20);
      }
    });

    await coordinator.runIncidentWorkflow("adv_session_a", SCENARIO_1_DB_LOCK);

    expect(capturedEvents).toContain("THOUGHT");
    expect(capturedEvents).toContain("TELEMETRY");
    expect(capturedEvents).toContain("TOOL_RESULT");
    expect(capturedEvents).toContain("SANDBOX_LOG");
    expect(capturedEvents).toContain("APPROVAL_REQUEST");
    expect(capturedEvents).toContain("INCIDENT_RESOLVED");

    const session = sessionStore.getSession("adv_session_a");
    expect(session?.status).toBe("RESOLVED");
  }, 20000);

  it("Scenario B: Non-DB Incident - Correctly adapts telemetry & reasoning for API Gateway Memory Leak", async () => {
    const broadcaster = new EventBroadcaster();
    const gate = new HitlGateEngine(broadcaster);
    const sessionStore = new SessionStore();
    const coordinator = new TrueSentryCoordinator(broadcaster, gate, sessionStore);

    const capturedThoughts: string[] = [];

    broadcaster.subscribe("adv_session_b", (evt) => {
      if (evt.type === "THOUGHT") {
        capturedThoughts.push((evt.payload as any).thought);
      }
      if (evt.type === "APPROVAL_REQUEST") {
        const approvalId = (evt.payload as any).approvalId;
        setTimeout(() => gate.resolveApproval(approvalId, "APPROVE"), 20);
      }
    });

    await coordinator.runIncidentWorkflow("adv_session_b", SCENARIO_2_MEMORY_LEAK);

    const scoutThought = capturedThoughts.find((t) => t.includes("zero DB locks") || t.includes("memory usage"));
    expect(scoutThought).toBeDefined();

    const session = sessionStore.getSession("adv_session_b");
    expect(session?.status).toBe("RESOLVED");
  }, 20000);

  it("Scenario D: Sandbox Test Failure - Aborts immediately and never requests HITL approval for unverified code", async () => {
    const broadcaster = new EventBroadcaster();
    const gate = new HitlGateEngine(broadcaster);
    const sessionStore = new SessionStore();
    const coordinator = new TrueSentryCoordinator(broadcaster, gate, sessionStore);

    let approvalRequested = false;

    broadcaster.subscribe("adv_session_d", (evt) => {
      if (evt.type === "APPROVAL_REQUEST") {
        approvalRequested = true;
      }
    });

    // Force sandbox failure to simulate a patch that fails concurrency/regression tests
    await coordinator.runIncidentWorkflow("adv_session_d", SCENARIO_1_DB_LOCK, {
      forceSandboxFailure: true,
    });

    // The agent MUST NOT proceed to HITL approval when sandbox verification fails
    expect(approvalRequested).toBe(false);

    const session = sessionStore.getSession("adv_session_d");
    expect(session?.status).toBe("FAILED");
  }, 20000);

  it("Scenario E: SQL Tampering Defense - Halts execution when executed SQL differs from approved payload hash", async () => {
    const broadcaster = new EventBroadcaster();
    const gate = new HitlGateEngine(broadcaster);
    const sessionStore = new SessionStore();
    const coordinator = new TrueSentryCoordinator(broadcaster, gate, sessionStore);

    broadcaster.subscribe("adv_session_e", (evt) => {
      if (evt.type === "APPROVAL_REQUEST") {
        const approvalId = (evt.payload as any).approvalId;
        setTimeout(() => gate.resolveApproval(approvalId, "APPROVE"), 20);
      }
    });

    // Attempt to execute malicious DROP TABLE despite having approved index patch
    await expect(
      coordinator.runIncidentWorkflow("adv_session_e", SCENARIO_1_DB_LOCK, {
        simulatedTamperedSql: "DROP TABLE orders CASCADE;",
      })
    ).rejects.toThrow(CryptographicIntegrityError);
  }, 20000);

  it("Scenario G: Human Operator Rejection - Aborts cleanly and preserves production state untouched", async () => {
    const broadcaster = new EventBroadcaster();
    const gate = new HitlGateEngine(broadcaster);
    const sessionStore = new SessionStore();
    const coordinator = new TrueSentryCoordinator(broadcaster, gate, sessionStore);

    broadcaster.subscribe("adv_session_g", (evt) => {
      if (evt.type === "APPROVAL_REQUEST") {
        const approvalId = (evt.payload as any).approvalId;
        setTimeout(() => gate.resolveApproval(approvalId, "REJECT"), 20);
      }
    });

    await coordinator.runIncidentWorkflow("adv_session_g", SCENARIO_1_DB_LOCK);

    const session = sessionStore.getSession("adv_session_g");
    expect(session?.status).toBe("FAILED");
  }, 20000);
});
