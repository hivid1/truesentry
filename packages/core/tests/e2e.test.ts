import { describe, it, expect } from "vitest";
import { TrueSentryCoordinator } from "../src/coordinator.js";
import { EventBroadcaster } from "../src/events/emitter.js";
import { HitlGateEngine } from "../src/hitl/gate.js";
import { SessionStore } from "../src/storage/db.js";
import { MultiModelRouter } from "../src/llm/router.js";
import { SCENARIO_1_DB_LOCK, ChaosFaultInjector } from "@truesentry/scenarios";

describe("TrueSentry Full End-to-End System Integration", () => {
  it("routes models appropriately across reasoning tasks", async () => {
    const flashRes = await MultiModelRouter.execute({
      prompt: "Parse prometheus error rate 0.48",
      taskType: "FAST_TRIAGE",
    });
    expect(flashRes.modelUsed).toBe("gemini-2.0-flash");
    expect(flashRes.tokensUsed.total).toBeGreaterThan(0);

    const proRes = await MultiModelRouter.execute({
      prompt: "Perform git bisect analysis on migration locks",
      taskType: "DEEP_REASONING",
    });
    expect(proRes.modelUsed).toBe("gemini-2.5-pro");
  });

  it("injects and heals chaos engineering faults", () => {
    const injector = new ChaosFaultInjector();
    const fault = injector.injectFault("DEADLOCK");
    expect(fault.status).toBe("ACTIVE");
    expect(fault.targetComponent).toBe("POSTGRES");

    const healed = injector.healFault(fault.id);
    expect(healed).toBe(true);
    expect(injector.getActiveFaults().length).toBe(0);
  });

  it("executes complete 7-step autonomous incident lifecycle with HITL sign-off", async () => {
    const broadcaster = new EventBroadcaster();
    const gate = new HitlGateEngine(broadcaster);
    const sessionStore = new SessionStore();
    const coordinator = new TrueSentryCoordinator(broadcaster, gate, sessionStore);

    const capturedEvents: string[] = [];
    let approvalId = "";

    broadcaster.subscribe("e2e_session_1", (evt) => {
      capturedEvents.push(evt.type);
      if (evt.type === "APPROVAL_REQUEST") {
        approvalId = (evt.payload as any).approvalId;
        // Auto-approve after 30ms simulation tick
        setTimeout(() => {
          gate.resolveApproval(approvalId, "APPROVE");
        }, 30);
      }
    });

    await coordinator.runIncidentWorkflow("e2e_session_1", SCENARIO_1_DB_LOCK);

    expect(capturedEvents).toContain("THOUGHT");
    expect(capturedEvents).toContain("TELEMETRY");
    expect(capturedEvents).toContain("TOOL_RESULT");
    expect(capturedEvents).toContain("SANDBOX_LOG");
    expect(capturedEvents).toContain("APPROVAL_REQUEST");
    expect(capturedEvents).toContain("INCIDENT_RESOLVED");

    const session = sessionStore.getSession("e2e_session_1");
    expect(session?.status).toBe("RESOLVED");
  });
});
