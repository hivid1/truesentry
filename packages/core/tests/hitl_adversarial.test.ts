import { describe, it, expect } from "vitest";
import { HitlGateEngine, CryptographicIntegrityError } from "../src/hitl/gate.js";
import { EventBroadcaster } from "../src/events/emitter.js";

describe("🔐 Cryptographic HITL Gate Adversarial & Invariant Tests", () => {
  const broadcaster = new EventBroadcaster();

  it("P0 #11: Rejects mutations on EVERY signed field independently", async () => {
    const hitl = new HitlGateEngine(broadcaster);
    const validSql = "CREATE INDEX CONCURRENTLY idx_orders_user_id ON orders(user_id);";

    // 1. Request approval
    const approvalPromise = hitl.requestApproval("sess_alpha", "inc_999", {
      severity: "CRITICAL",
      target: { system: "postgres", resource: "checkout-db", actionType: "ROLLBACK_MIGRATION" },
      blastRadius: {
        riskScore: 2,
        estimatedDowntimeSeconds: 0,
        affectedServices: ["checkout-service"],
        dataLossRisk: false,
      },
      diff: {
        language: "sql",
        before: "ALTER TABLE orders ADD CONSTRAINT fk_user...",
        after: validSql,
      },
      sandboxProof: {
        sandboxId: "sbx_proof_123",
        testsRun: 48,
        testsPassed: 48,
        lockDurationMeasuredMs: 120,
      },
    });

    const pending = hitl.getPendingApproval(Array.from((hitl as any).pendingApprovals.keys())[0] as string);
    expect(pending).toBeDefined();

    const approvalRes = hitl.resolveApproval(pending!.approvalId, "APPROVE");
    expect(approvalRes.success).toBe(true);
    const token = approvalRes.token!;

    // Case A: Mutation of SQL
    expect(() => {
      hitl.verifyAndConsumeExecution(token, "DROP TABLE orders CASCADE;");
    }).toThrow(CryptographicIntegrityError);

    // Case B: Mutation of Session ID
    expect(() => {
      hitl.verifyAndConsumeExecution(token, validSql, { sessionId: "sess_TAMPERED" });
    }).toThrow(/Cross-session approval substitution detected/);

    // Case C: Mutation of Incident ID
    expect(() => {
      hitl.verifyAndConsumeExecution(token, validSql, { incidentId: "inc_TAMPERED" });
    }).toThrow(/Cross-incident approval substitution detected/);

    // Case D: Mutation of Action Type
    expect(() => {
      hitl.verifyAndConsumeExecution(token, validSql, { actionType: "DESTROY_DATABASE" });
    }).toThrow(/Action type mutation detected/);

    // Case E: Mutation of Target Resource
    expect(() => {
      hitl.verifyAndConsumeExecution(token, validSql, { target: "prod-users-db" });
    }).toThrow(/Target resource mutation detected/);

    // Case F: Mutation of Sandbox Proof
    expect(() => {
      hitl.verifyAndConsumeExecution(token, validSql, { sandboxId: "sbx_UNVERIFIED" });
    }).toThrow(/Sandbox proof mutation detected/);

    // Finally: Legitimate execution succeeds
    expect(() => {
      hitl.verifyAndConsumeExecution(token, validSql, {
        sessionId: "sess_alpha",
        incidentId: "inc_999",
        actionType: "ROLLBACK_MIGRATION",
        target: "checkout-db",
        sandboxId: "sbx_proof_123",
      });
    }).not.toThrow();
  });

  it("P0 #12 & #13: Rejects approval substitution across incidents and sessions", async () => {
    const hitl = new HitlGateEngine(broadcaster);
    const sql = "CREATE INDEX CONCURRENTLY idx_items_id ON items(id);";

    // Setup Incident Alpha
    const p1 = hitl.requestApproval("sess_1", "inc_1", {
      severity: "HIGH",
      target: { system: "postgres", resource: "items-db", actionType: "APPLY_INDEX" },
      blastRadius: { riskScore: 1, estimatedDowntimeSeconds: 0, affectedServices: [], dataLossRisk: false },
      diff: { language: "sql", before: "", after: sql },
      sandboxProof: { sandboxId: "sbx_1", testsRun: 48, testsPassed: 48, lockDurationMeasuredMs: 50 },
    });
    const id1 = Array.from((hitl as any).pendingApprovals.keys())[0] as string;
    const tokenAlpha = hitl.resolveApproval(id1, "APPROVE").token!;

    // Attempt to use Token Alpha on Incident Beta
    expect(() => {
      hitl.verifyAndConsumeExecution(tokenAlpha, sql, { incidentId: "inc_2" });
    }).toThrow(/Cross-incident approval substitution detected/);

    // Attempt to use Token Alpha on Session Beta
    expect(() => {
      hitl.verifyAndConsumeExecution(tokenAlpha, sql, { sessionId: "sess_2" });
    }).toThrow(/Cross-session approval substitution detected/);
  });

  it("P0 #14: Prevents concurrent replay race conditions atomically", async () => {
    const hitl = new HitlGateEngine(broadcaster);
    const sql = "CREATE INDEX CONCURRENTLY idx_test ON test(id);";

    const p = hitl.requestApproval("sess_race", "inc_race", {
      severity: "MEDIUM",
      target: { system: "postgres", resource: "test-db", actionType: "INDEX" },
      blastRadius: { riskScore: 1, estimatedDowntimeSeconds: 0, affectedServices: [], dataLossRisk: false },
      diff: { language: "sql", before: "", after: sql },
      sandboxProof: { sandboxId: "sbx_race", testsRun: 48, testsPassed: 48, lockDurationMeasuredMs: 50 },
    });
    const id = Array.from((hitl as any).pendingApprovals.keys())[0] as string;
    const token = hitl.resolveApproval(id, "APPROVE").token!;

    // First execution succeeds
    let successCount = 0;
    let failureCount = 0;

    // Simulate 5 simultaneous execution attempts
    for (let i = 0; i < 5; i++) {
      try {
        hitl.verifyAndConsumeExecution(token, sql);
        successCount++;
      } catch (err: any) {
        if (err.message.includes("Replay attack detected")) {
          failureCount++;
        }
      }
    }

    expect(successCount).toBe(1); // EXACTLY ONE succeeds
    expect(failureCount).toBe(4); // ALL OTHERS blocked as replay
  });

  it("P0 #15: Rejects expired tokens after 10m TTL", async () => {
    const hitl = new HitlGateEngine(broadcaster);
    const sql = "CREATE INDEX CONCURRENTLY idx_exp ON test(id);";

    const p = hitl.requestApproval("sess_exp", "inc_exp", {
      severity: "LOW",
      target: { system: "postgres", resource: "test-db", actionType: "INDEX" },
      blastRadius: { riskScore: 1, estimatedDowntimeSeconds: 0, affectedServices: [], dataLossRisk: false },
      diff: { language: "sql", before: "", after: sql },
      sandboxProof: { sandboxId: "sbx_exp", testsRun: 48, testsPassed: 48, lockDurationMeasuredMs: 50 },
    });
    const id = Array.from((hitl as any).pendingApprovals.keys())[0] as string;
    const token = hitl.resolveApproval(id, "APPROVE").token!;

    // Artificially expire the token
    const record = hitl.getTokenRecord(token)!;
    record.expiresAt = Date.now() - 1000; // 1s in the past

    expect(() => {
      hitl.verifyAndConsumeExecution(token, sql);
    }).toThrow(/Approval token '.*' expired/);
  });
});
