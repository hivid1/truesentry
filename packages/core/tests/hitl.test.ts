import { describe, it, expect } from "vitest";
import { HitlGateEngine, CryptographicIntegrityError } from "../src/hitl/gate.js";
import { PolicyEngine } from "../src/hitl/policies.js";
import { EventBroadcaster } from "../src/events/emitter.js";
import { PostgresMcpServer } from "@truesentry/mcp-servers";

describe("TrueForge Cryptographic HITL Safety Gate Tests", () => {
  it("generates approval request and issues cryptographic token upon human sign-off", async () => {
    const broadcaster = new EventBroadcaster();
    const gate = new HitlGateEngine(broadcaster);

    const promise = gate.requestApproval("ses_test_1", "scenario_1", {
      severity: "CRITICAL",
      target: {
        system: "PostgreSQL",
        resource: "orders_db.public.orders",
        actionType: "ROLLBACK_MIGRATION",
      },
      blastRadius: {
        score: 74,
        category: "HIGH",
        affectedServices: ["checkout-service", "orders-db"],
        estimatedRecoveryMinutes: 2.5,
        riskFactors: ["Schema alteration", "Lock contention"],
        isDestructive: false,
        isIrreversible: true,
      },
      diff: {
        before: "ALTER TABLE orders ADD CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id);",
        after: "ALTER TABLE orders DROP CONSTRAINT IF EXISTS fk_orders_user;\nCREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_user_id ON orders(user_id);",
      },
      sandboxProof: {
        sandboxId: "sbx_test_1",
        testsRun: 12,
        testsPassed: 12,
        lockDurationMeasuredMs: 0.14,
      },
    });

    const pending = [...(gate as any).pendingApprovals.keys()][0];
    expect(pending).toBeDefined();

    const resolveRes = gate.resolveApproval(pending, "APPROVE");
    expect(resolveRes.success).toBe(true);
    expect(resolveRes.token).toBeDefined();

    const approved = await promise;
    expect(approved).toBe(true);
  });

  it("aborts execution cleanly when human operator rejects", async () => {
    const broadcaster = new EventBroadcaster();
    const gate = new HitlGateEngine(broadcaster);

    const promise = gate.requestApproval("ses_test_2", "scenario_1", {
      severity: "CRITICAL",
      target: { system: "PostgreSQL", resource: "orders_db", actionType: "ROLLBACK_MIGRATION" },
      blastRadius: { score: 74, category: "HIGH", affectedServices: [], estimatedRecoveryMinutes: 2, riskFactors: [], isDestructive: false, isIrreversible: true },
      diff: { before: "a", after: "b" },
      sandboxProof: { sandboxId: "s", testsRun: 10, testsPassed: 10, lockDurationMeasuredMs: 1 },
    });

    const pending = [...(gate as any).pendingApprovals.keys()][0];
    gate.resolveApproval(pending, "REJECT");

    const approved = await promise;
    expect(approved).toBe(false);
  });

  it("CRITICAL: Detects tampered SQL payload and halts execution with CryptographicIntegrityError", async () => {
    const broadcaster = new EventBroadcaster();
    const gate = new HitlGateEngine(broadcaster);
    const postgres = new PostgresMcpServer((token, sql) => gate.verifyAndConsumeExecution(token, sql));

    const authorizedSql = "ALTER TABLE orders DROP CONSTRAINT fk_orders_user;\nCREATE INDEX CONCURRENTLY idx_user ON orders(user_id);";

    gate.requestApproval("ses_test_3", "scenario_1", {
      severity: "CRITICAL",
      target: { system: "PostgreSQL", resource: "orders", actionType: "ROLLBACK" },
      blastRadius: { score: 50, category: "MEDIUM", affectedServices: [], estimatedRecoveryMinutes: 1, riskFactors: [], isDestructive: false, isIrreversible: true },
      diff: { before: "x", after: authorizedSql },
      sandboxProof: { sandboxId: "s", testsRun: 12, testsPassed: 12, lockDurationMeasuredMs: 0.1 },
    });

    const pendingId = [...(gate as any).pendingApprovals.keys()][0];
    const { token } = gate.resolveApproval(pendingId, "APPROVE");

    // Attempt 1: Tampered SQL with malicious DROP TABLE
    const maliciousSql = "DROP TABLE orders CASCADE;";
    await expect(
      postgres.callTool("execute_remediation_sql", {
        sql: maliciousSql,
        approvalNonce: token!,
      })
    ).rejects.toThrow(CryptographicIntegrityError);

    // Attempt 2: Exact authorized SQL succeeds
    const successRes = await postgres.callTool("execute_remediation_sql", {
      sql: authorizedSql,
      approvalNonce: token!,
    });
    expect(successRes.content[0].text).toContain("SUCCESS");

    // Attempt 3: Replay attack with already-consumed token is rejected
    await expect(
      postgres.callTool("execute_remediation_sql", {
        sql: authorizedSql,
        approvalNonce: token!,
      })
    ).rejects.toThrow(/Replay attack detected/);
  });

  it("evaluates Policy Engine rules to hard-block dangerous DDL and require approvals for schema changes", () => {
    const blocked1 = PolicyEngine.evaluate("DROP DATABASE production_db;");
    expect(blocked1.action).toBe("HARD_BLOCK");

    const blocked2 = PolicyEngine.evaluate("DELETE FROM customers;");
    expect(blocked2.action).toBe("HARD_BLOCK");

    const gated = PolicyEngine.evaluate("ALTER TABLE orders ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id);");
    expect(gated.action).toBe("REQUIRE_APPROVAL");

    const safe = PolicyEngine.evaluate("CREATE INDEX CONCURRENTLY idx_orders_user ON orders(user_id);");
    expect(safe.action).toBe("ALLOW");
  });
});
