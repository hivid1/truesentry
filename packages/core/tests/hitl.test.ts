import { describe, it, expect } from "vitest";
import { BlastRadiusCalculator } from "../src/hitl/blastRadius.js";
import { PolicyEngine } from "../src/hitl/policies.js";
import { HitlGateEngine } from "../src/hitl/gate.js";
import { EventBroadcaster } from "../src/events/emitter.js";
import { IncidentMerkleTree } from "../src/storage/merkle.js";

describe("Core TrueForge Harness & HITL Tests", () => {
  it("calculates blast radius risk scores deterministically", () => {
    const score = BlastRadiusCalculator.calculate({
      affectedServicesCount: 4,
      lockDurationMs: 3200,
      isDestructive: false,
    });
    expect(score).toBeGreaterThan(50);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("evaluates policy-as-code decisions", () => {
    expect(PolicyEngine.evaluate("DROP DATABASE prod", true, 90)).toBe("HARD_BLOCK");
    expect(PolicyEngine.evaluate("ROLLBACK_MIGRATION", true, 74)).toBe("REQUIRE_APPROVAL");
    expect(PolicyEngine.evaluate("GET_TELEMETRY", false, 5)).toBe("ALLOW_AUTONOMOUS");
  });

  it("gating engine resolves cryptographic approvals", async () => {
    const broadcaster = new EventBroadcaster();
    const gate = new HitlGateEngine(broadcaster);

    const approvalPromise = gate.requestApproval("ses_123", "inc_001", {
      severity: "CRITICAL",
      target: { system: "Postgres", resource: "orders", actionType: "ROLLBACK" },
      blastRadius: { riskScore: 74, estimatedDowntimeSeconds: 3, affectedServices: ["checkout"], dataLossRisk: false },
      diff: { language: "sql", before: "A", after: "B" },
      sandboxProof: { sandboxId: "sbx_1", testsRun: 48, testsPassed: 48, lockDurationMeasuredMs: 14 },
    });

    // Simulate event listener catching approvalId
    let capturedId = "";
    broadcaster.subscribe("ses_123", (evt) => {
      if (evt.type === "APPROVAL_REQUEST") {
        capturedId = (evt.payload as any).approvalId;
      }
    });

    // Wait a tick and resolve
    await new Promise((r) => setTimeout(r, 50));
    const result = gate.resolveApproval(capturedId, "APPROVE");
    expect(result.success).toBe(true);

    const approved = await approvalPromise;
    expect(approved).toBe(true);
  });

  it("computes tamper-evident Merkle root for incident ledger", () => {
    const root = IncidentMerkleTree.computeRoot([
      { eventId: "e1", type: "ALERT", timestamp: 100 },
      { eventId: "e2", type: "BISECT", timestamp: 200 },
      { eventId: "e3", type: "APPROVAL", timestamp: 300 },
    ]);
    expect(root).toBeDefined();
    expect(typeof root).toBe("string");
    expect(root.length).toBe(64); // SHA-256 hex string
  });
});
