export interface PolicyEvaluationResult {
  action: "ALLOW" | "REQUIRE_APPROVAL" | "HARD_BLOCK";
  reason: string;
}

export class PolicyEngine {
  public static evaluate(sqlOrAction: string, isDestructive = false, riskScore = 0): PolicyEvaluationResult {
    const upper = sqlOrAction.toUpperCase();

    // 1. Hard Block catastrophic operations
    if (
      upper.includes("DROP DATABASE") ||
      upper.includes("DROP SCHEMA") ||
      (upper.includes("DELETE FROM") && !upper.includes("WHERE")) ||
      (upper.includes("UPDATE ") && !upper.includes("WHERE"))
    ) {
      return {
        action: "HARD_BLOCK",
        reason: "Critical safety violation: Unconstrained deletion or database destruction is unconditionally blocked by Policy-as-Code.",
      };
    }

    // 2. Safe non-blocking concurrent indexing
    if (upper.startsWith("CREATE INDEX CONCURRENTLY") && !upper.includes("ALTER TABLE") && !upper.includes("DROP")) {
      return {
        action: "ALLOW",
        reason: "Action is safe, non-blocking, and approved for autonomous execution.",
      };
    }

    // 3. Require human approval for state-modifying schema changes, rollbacks, and destructive actions
    if (
      isDestructive ||
      riskScore > 30 ||
      upper.includes("ROLLBACK") ||
      upper.includes("RESTART") ||
      upper.includes("ALTER TABLE") ||
      upper.includes("DROP TABLE") ||
      upper.includes("DROP CONSTRAINT") ||
      upper.includes("TRUNCATE")
    ) {
      return {
        action: "REQUIRE_APPROVAL",
        reason: "State-modifying production action requires human operator verification before execution.",
      };
    }

    return {
      action: "ALLOW",
      reason: "Action is safe and approved for autonomous execution.",
    };
  }
}
