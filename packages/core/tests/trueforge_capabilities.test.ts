import { describe, it, expect, beforeEach } from "vitest";
import { TrueSentryCoordinator } from "../src/coordinator.js";
import { EventBroadcaster } from "../src/events/emitter.js";
import { HitlGateEngine } from "../src/hitl/gate.js";
import { SessionStore } from "../src/storage/db.js";
import { SCENARIO_1_DB_LOCK } from "@truesentry/scenarios";
import { TelemetryScoutSubagent } from "../src/subagents/scout.js";
import { BlastRadiusAuditorSubagent } from "../src/subagents/auditor.js";
import { PostMortemScribeSubagent } from "../src/subagents/scribe.js";

describe("TrueForge Core Harness Capabilities Matrix", () => {
  let broadcaster: EventBroadcaster;
  let hitlGate: HitlGateEngine;
  let sessionStore: SessionStore;
  let coordinator: TrueSentryCoordinator;

  beforeEach(() => {
    broadcaster = new EventBroadcaster();
    hitlGate = new HitlGateEngine(broadcaster);
    sessionStore = new SessionStore();
    coordinator = new TrueSentryCoordinator(broadcaster, hitlGate, sessionStore);
  });

  it("1. Subagents: Orchestrates specialized subagents across the incident lifecycle", async () => {
    const scout = new TelemetryScoutSubagent();
    const auditor = new BlastRadiusAuditorSubagent();
    const scribe = new PostMortemScribeSubagent();

    // Telemetry Scout investigation
    const scoutResult = await scout.investigate("checkout-service");
    expect(scoutResult.locks).toBeDefined();
    expect(scoutResult.locks.activeLocks.length).toBeGreaterThan(0);
    expect(scoutResult.rootCauseCategory).toBe("DATABASE_LOCK_CONTENTION");

    // Blast Radius Auditor
    const auditResult = auditor.auditRemediation(
      "ROLLBACK_SCHEMA_MIGRATION",
      ["checkout-service", "payment-service", "cart-service"],
      140,
      18
    );
    expect(auditResult.affectedServices).toContain("checkout-service");
    expect(auditResult.riskScore).toBeGreaterThan(0);
    expect(auditResult.policyDecision).toBeDefined();

    // Post-Mortem Scribe
    const postMortem = await scribe.generateAndPublish("INC-0824", 4, "AccessExclusiveLock contention", "CREATE INDEX CONCURRENTLY");
    expect(postMortem.postMortemMarkdown).toContain("INC-0824");
    expect(postMortem.postMortemMarkdown).toContain("CONCURRENTLY");
    expect(postMortem.synthesizedSkill).toContain("SKILL.md");
  });

  it("2. Persistent Sessions: Maintains session lifecycle, status updates and metadata", () => {
    const sessionId = "ses_tf_persisted_01";
    const session = sessionStore.createSession(sessionId, "scenario_1_db_lock", "gemini-2.5-pro");

    expect(session.id).toBe(sessionId);
    expect(session.status).toBe("INVESTIGATING");
    expect(session.model).toBe("gemini-2.5-pro");

    sessionStore.updateStatus(sessionId, "WAITING_APPROVAL");
    expect(sessionStore.getSession(sessionId)?.status).toBe("WAITING_APPROVAL");

    sessionStore.updateStatus(sessionId, "RESOLVED");
    expect(sessionStore.getSession(sessionId)?.status).toBe("RESOLVED");
  });

  it("3. Reconnects: EventBroadcaster replays historical events upon client reconnection", () => {
    const sessionId = "ses_tf_reconnect_02";

    // Broadcast 3 prior events while client is disconnected
    broadcaster.broadcast(sessionId, {
      eventId: "evt_1",
      sessionId,
      type: "THOUGHT",
      timestamp: Date.now(),
      subagent: "TelemetryScout",
      payload: { thought: "Querying Prometheus..." },
    });
    broadcaster.broadcast(sessionId, {
      eventId: "evt_2",
      sessionId,
      type: "TELEMETRY",
      timestamp: Date.now(),
      subagent: "TelemetryScout",
      payload: { errorRate: 0.384 },
    });
    broadcaster.broadcast(sessionId, {
      eventId: "evt_3",
      sessionId,
      type: "THOUGHT",
      timestamp: Date.now(),
      subagent: "SandboxBisector",
      payload: { thought: "Running git bisect..." },
    });

    // New client connects -> verifies all 3 events are immediately backfilled
    const replayedEvents: any[] = [];
    const unsubscribe = broadcaster.subscribe(sessionId, (evt) => {
      replayedEvents.push(evt);
    });

    expect(replayedEvents.length).toBe(3);
    expect(replayedEvents[0].eventId).toBe("evt_1");
    expect(replayedEvents[1].eventId).toBe("evt_2");
    expect(replayedEvents[2].eventId).toBe("evt_3");

    unsubscribe();
  });

  it("4. Model Provider Switching: Supports dynamic switching of model provider on active sessions", () => {
    const sessionId = "ses_tf_model_switch_03";
    sessionStore.createSession(sessionId, "scenario_1_db_lock", "gemini-2.5-pro");

    expect(sessionStore.getSession(sessionId)?.model).toBe("gemini-2.5-pro");

    sessionStore.setModel(sessionId, "claude-3-7-sonnet");
    expect(sessionStore.getSession(sessionId)?.model).toBe("claude-3-7-sonnet");

    sessionStore.setModel(sessionId, "gpt-4o");
    expect(sessionStore.getSession(sessionId)?.model).toBe("gpt-4o");

    sessionStore.setModel(sessionId, "local-ollama-llama3");
    expect(sessionStore.getSession(sessionId)?.model).toBe("local-ollama-llama3");
  });

  it("5. End-to-End TrueForge Session Workflow: Generates auditable Causal Evidence Graph", async () => {
    const sessionId = "ses_tf_e2e_graph_04";

    broadcaster.subscribe(sessionId, (evt) => {
      if (evt.type === "APPROVAL_REQUEST") {
        const approvalId = (evt.payload as any).approvalId;
        setTimeout(() => {
          hitlGate.resolveApproval(approvalId, "APPROVE");
        }, 50);
      }
    });

    await coordinator.runIncidentWorkflow(sessionId, SCENARIO_1_DB_LOCK);

    const graph = coordinator.getEvidenceGraph(sessionId);
    expect(graph).toBeDefined();
    expect(graph!.nodes.length).toBeGreaterThanOrEqual(6);
    expect(graph!.edges.length).toBeGreaterThanOrEqual(5);

    // Verify presence of root cause confirmed node
    const rootCauseNode = graph!.nodes.find((n) => n.type === "ROOT_CAUSE");
    expect(rootCauseNode).toBeDefined();
    expect(rootCauseNode?.status).toBe("VERIFIED");
    expect(rootCauseNode?.evidenceHash).toBeDefined();
    expect(rootCauseNode?.evidenceHash.length).toBe(64);
  }, 30000);
});
