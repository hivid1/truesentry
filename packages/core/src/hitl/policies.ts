export interface PolicyEvaluationResult {
  action: "ALLOW" | "REQUIRE_APPROVAL" | "HARD_BLOCK";
  reason: string;
}

export interface SqlPolicyEvaluation {
  allowed: boolean;
  policyAction: "ALLOW" | "REQUIRE_APPROVAL" | "BLOCK";
  reasons: string[];
}

export class PolicyEngine {
  /**
   * Strip single-line and multi-line SQL comments to prevent comment injection bypasses.
   */
  public static stripSqlComments(sql: string): string {
    return sql
      .replace(/--.*$/gm, "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .trim();
  }

  public static evaluateSql(sql: string, isDestructive = false, riskScore = 0): SqlPolicyEvaluation {
    const cleanSql = this.stripSqlComments(sql);
    const upper = cleanSql.toUpperCase();
    const reasons: string[] = [];

    // 1. Hard Block catastrophic operations
    if (
      upper.includes("DROP DATABASE") ||
      upper.includes("DROP SCHEMA") ||
      upper.includes("TRUNCATE") ||
      upper.includes("DROP TABLE")
    ) {
      return {
        allowed: false,
        policyAction: "BLOCK",
        reasons: ["Dangerous DDL: Dropping databases or entire tables is strictly forbidden"],
      };
    }

    if (
      (upper.includes("DELETE FROM") && !upper.includes("WHERE")) ||
      (upper.includes("UPDATE ") && !upper.includes("WHERE"))
    ) {
      return {
        allowed: false,
        policyAction: "BLOCK",
        reasons: ["Unbounded DML: DELETE without WHERE clause is forbidden"],
      };
    }

    // 2. Safe non-blocking concurrent indexing
    if (upper.startsWith("CREATE INDEX CONCURRENTLY") && !upper.includes("ALTER TABLE")) {
      return {
        allowed: true,
        policyAction: "ALLOW",
        reasons: ["Action is safe, non-blocking, and approved for autonomous execution."],
      };
    }

    // 3. Require human approval for state-modifying schema changes, rollbacks, and destructive actions
    if (
      isDestructive ||
      riskScore > 30 ||
      upper.includes("ROLLBACK") ||
      upper.includes("RESTART") ||
      upper.includes("ALTER TABLE") ||
      upper.includes("DROP CONSTRAINT")
    ) {
      return {
        allowed: true,
        policyAction: "REQUIRE_APPROVAL",
        reasons: ["State-modifying production action requires human operator verification before execution."],
      };
    }

    return {
      allowed: true,
      policyAction: "ALLOW",
      reasons: ["Action is safe and approved for autonomous execution."],
    };
  }

  public static evaluate(sqlOrAction: string, isDestructive = false, riskScore = 0): PolicyEvaluationResult {
    const res = this.evaluateSql(sqlOrAction, isDestructive, riskScore);
    if (res.policyAction === "BLOCK") {
      return {
        action: "HARD_BLOCK",
        reason: res.reasons[0] || "Critical safety violation: Unconstrained deletion or database destruction is unconditionally blocked by Policy-as-Code.",
      };
    }
    if (res.policyAction === "REQUIRE_APPROVAL") {
      return {
        action: "REQUIRE_APPROVAL",
        reason: res.reasons[0] || "State-modifying production action requires human operator verification before execution.",
      };
    }
    return {
      action: "ALLOW",
      reason: res.reasons[0] || "Action is safe and approved for autonomous execution.",
    };
  }
}
